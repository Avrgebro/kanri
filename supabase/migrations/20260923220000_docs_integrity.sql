-- Rules the docs tree needs, so a folder tree in the database is always one the
-- file manager can show. It addresses entries by path ("/Contracts/sow.pdf"),
-- so a path must name exactly one thing.

-- ---------------------------------------------------------------- names

-- A name is one path segment, unique among everything in its folder: the
-- file manager would give a folder and a file with the same name one path.
--
-- The trigger checks every rule and raises a message written for the user.
-- The constraints below state the same rules declaratively and stay as the
-- backstop — against a concurrent insert the trigger cannot see, or a write
-- that skips it — so their raw messages should never reach anyone.
alter table doc_folders
  add constraint doc_folders_name_segment check (btrim(name) <> '' and name !~ '/');
alter table doc_files
  add constraint doc_files_name_segment check (btrim(name) <> '' and name !~ '/');

-- `nulls not distinct` so the project root, where the parent is null, counts
-- as one parent too.
alter table doc_folders
  add constraint doc_folders_name_unique unique nulls not distinct (project_id, parent_id, name);
alter table doc_files
  add constraint doc_files_name_unique unique nulls not distinct (project_id, folder_id, name);

create or replace function enforce_doc_name() returns trigger
language plpgsql as $$
declare parent uuid;
begin
  if btrim(new.name) = '' or new.name ~ '/' then
    raise exception 'Names can''t be blank or contain a slash.'
      using errcode = 'check_violation';
  end if;

  -- Each table names its parent differently. Separate branches, because
  -- PL/pgSQL resolves every field reference in an expression against the row.
  if tg_table_name = 'doc_folders' then
    parent := new.parent_id;
  else
    parent := new.folder_id;
  end if;

  if exists (
    select 1 from doc_folders
     where project_id = new.project_id and parent_id is not distinct from parent
       and name = new.name and id <> new.id
    union all
    select 1 from doc_files
     where project_id = new.project_id and folder_id is not distinct from parent
       and name = new.name and id <> new.id
  ) then
    raise exception 'Something named "%" is already here.', new.name
      using errcode = 'unique_violation';
  end if;

  return new;
end $$;

create trigger doc_folders_name
  before insert or update of name, parent_id on doc_folders
  for each row execute function enforce_doc_name();

create trigger doc_files_name
  before insert or update of name, folder_id on doc_files
  for each row execute function enforce_doc_name();

-- ---------------------------------------------------------------- tree

-- A folder can't be moved into itself or anything inside it, and stays in its
-- own project.
create or replace function enforce_doc_folder_tree() returns trigger
language plpgsql as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if not exists (
    select 1 from doc_folders where id = new.parent_id and project_id = new.project_id
  ) then
    raise exception 'parent folder % is not in this project', new.parent_id
      using errcode = 'foreign_key_violation';
  end if;

  if exists (
    with recursive up as (
      select id, parent_id from doc_folders where id = new.parent_id
      union all
      select f.id, f.parent_id from doc_folders f join up on f.id = up.parent_id
    )
    select 1 from up where id = new.id
  ) then
    raise exception 'A folder can''t be moved into itself.'
      using errcode = 'invalid_parameter_value';
  end if;

  return new;
end $$;

create trigger doc_folders_tree
  before insert or update of parent_id on doc_folders
  for each row execute function enforce_doc_folder_tree();

-- Files stay in their own project's folders.
create or replace function enforce_doc_file_folder() returns trigger
language plpgsql as $$
begin
  if new.folder_id is not null and not exists (
    select 1 from doc_folders where id = new.folder_id and project_id = new.project_id
  ) then
    raise exception 'folder % is not in this project', new.folder_id
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;

create trigger doc_files_folder
  before insert or update of folder_id on doc_files
  for each row execute function enforce_doc_file_folder();

-- ---------------------------------------------------------------- delete

-- Delete folders and files in one transaction and return the storage paths of
-- every file that went, including those inside deleted folders (removed by
-- cascade), so the caller can remove the stored objects.
--
-- Rows go first, objects after: if removing objects fails, the cost is an
-- orphaned blob nobody can see, never a listed file whose content is gone.
create or replace function delete_docs(p_folders uuid[], p_files uuid[])
returns setof text
language sql
security invoker
as $$
  with recursive doomed as (
    select id from doc_folders where id = any(p_folders)
    union
    select f.id from doc_folders f join doomed d on f.parent_id = d.id
  ),
  gone_files as (
    delete from doc_files
     where id = any(p_files) or folder_id in (select id from doomed)
    returning storage_path
  ),
  gone_folders as (
    delete from doc_folders where id in (select id from doomed)
  )
  select storage_path from gone_files;
$$;

-- ---------------------------------------------------------------- move

-- Move folders and files into one target folder (null: the project root) in
-- one transaction, so a mixed selection never ends up half moved. The triggers
-- above still check every row: a name clash or a move into itself fails it all.
create or replace function move_docs(p_folders uuid[], p_files uuid[], p_target uuid default null)
returns void
language sql
security invoker
as $$
  update doc_folders set parent_id = p_target where id = any(p_folders);
  update doc_files set folder_id = p_target where id = any(p_files);
$$;
