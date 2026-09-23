-- A task cannot be due before it starts. The Gantt can only produce ordered
-- dates, but the task sheet edits start and due independently, so the rule
-- belongs to the table rather than to whichever screen happens to write.
alter table tasks
  add constraint tasks_dates_ordered
  check (start_date is null or due_date is null or start_date <= due_date);
