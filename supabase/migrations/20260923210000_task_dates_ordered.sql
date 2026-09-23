-- A task cannot be due before it starts. The Gantt can only produce ordered
-- dates, but the task sheet edits start and due independently, so the rule
-- belongs to the table rather than to whichever screen happens to write.
--
-- The trigger raises a message written for the user; the constraint states the
-- same rule declaratively and stays as the backstop.
alter table tasks
  add constraint tasks_dates_ordered
  check (start_date is null or due_date is null or start_date <= due_date);

create or replace function enforce_task_dates() returns trigger
language plpgsql as $$
begin
  if new.start_date > new.due_date then
    raise exception 'The due date can''t be before the start date.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger tasks_dates
  before insert or update of start_date, due_date on tasks
  for each row execute function enforce_task_dates();
