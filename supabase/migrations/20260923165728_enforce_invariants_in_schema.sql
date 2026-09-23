-- Move invariants the README states in prose into the database, while the
-- tables are still empty and the features that would violate them are unwritten.

-- ---------------------------------------------------------------- 1. link types

-- 'e2s' was SVAR's Gantt vocabulary sitting in the persisted schema, three
-- layers below the adapter that is supposed to contain vendor shapes.
create type dependency_type as enum (
  'finish_to_start',
  'start_to_start',
  'finish_to_finish',
  'start_to_finish'
);

alter table task_dependencies
  alter column type drop default,
  alter column type type dependency_type using 'finish_to_start'::dependency_type,
  alter column type set default 'finish_to_start';

-- ---------------------------------------------------------------- 2. subtask depth

-- "Epic → Task → Subtask is the only nesting" was a comment on a plain
-- self-FK; nothing stopped a three-deep tree, and the board adapter silently
-- drops grandchildren while the Gantt still shows them.
create or replace function enforce_task_depth() returns trigger
language plpgsql as $$
declare parent_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent_id into parent_parent from tasks where id = new.parent_id;

  if parent_parent is not null then
    raise exception 'tasks nest one level only: % already has a parent', new.parent_id
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger tasks_enforce_depth
  before insert or update of parent_id on tasks
  for each row execute function enforce_task_depth();

-- ---------------------------------------------------------------- 3. line edits

-- The one table where an edit timestamp matters most: without it, "was this
-- line changed after the estimate was sent?" is unanswerable.
alter table estimate_lines
  add column updated_at timestamptz not null default now();

create trigger estimate_lines_touch
  before update on estimate_lines
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------- 4. storage owner

-- storage.objects.owner is deprecated in favour of owner_id.
drop policy if exists "docs owner select" on storage.objects;
drop policy if exists "docs owner insert" on storage.objects;
drop policy if exists "docs owner update" on storage.objects;
drop policy if exists "docs owner delete" on storage.objects;

create policy "docs owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'docs' and owner_id = auth.uid()::text);

create policy "docs owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'docs' and owner_id = auth.uid()::text);

create policy "docs owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'docs' and owner_id = auth.uid()::text)
  with check (bucket_id = 'docs' and owner_id = auth.uid()::text);

create policy "docs owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and owner_id = auth.uid()::text);
