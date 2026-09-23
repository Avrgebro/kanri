-- A subtask's epic is its parent's.
--
-- Subtasks have no card of their own; they belong to their parent's epic.
-- Until now nothing held them to it: moving a parent to another epic lane left
-- its subtasks in the old one, which the Gantt then counted towards the old
-- epic's bar. Here the rule is the schema's, in both directions.

-- A subtask takes its parent's epic whenever it is written, whatever it asks for.
create or replace function subtask_takes_parent_epic() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null then
    select epic_id into new.epic_id from tasks where id = new.parent_id;
  end if;
  return new;
end $$;

create trigger tasks_subtask_epic
  before insert or update of parent_id, epic_id on tasks
  for each row execute function subtask_takes_parent_epic();

-- A parent changing epic takes its subtasks with it. Each subtask update goes
-- through the trigger above, which reads the parent's new epic.
create or replace function parent_epic_to_subtasks() returns trigger
language plpgsql as $$
begin
  update tasks set epic_id = new.epic_id where parent_id = new.id;
  return null;
end $$;

create trigger tasks_parent_epic
  after update of epic_id on tasks
  for each row
  when (new.parent_id is null and old.epic_id is distinct from new.epic_id)
  execute function parent_epic_to_subtasks();

-- Bring existing rows in line.
update tasks s set epic_id = p.epic_id
  from tasks p
 where s.parent_id = p.id and s.epic_id is distinct from p.epic_id;
