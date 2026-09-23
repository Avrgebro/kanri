-- Three decisions taken while the tables are empty:
--   1. a sent estimate's lines are immutable
--   2. acceptance is one atomic SQL call, not a client-side sequence
--   3. tasks.actual_hours is computed from time_entries, not stored

-- ---------------------------------------------------------------- 1. freeze

-- Totals were already snapshotted at send, but the PDF re-rendered from the
-- live lines, so an edit changed a document the client had already received.
create or replace function reject_edit_of_sent_estimate() returns trigger
language plpgsql as $$
declare
  parent_status estimate_status;
begin
  select status into parent_status
    from estimates
   where id = coalesce(new.estimate_id, old.estimate_id);

  if parent_status is distinct from 'draft' then
    raise exception 'estimate is % - clone it to a new draft to revise', parent_status
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end $$;

create trigger estimate_lines_frozen_when_sent
  before insert or update or delete on estimate_lines
  for each row execute function reject_edit_of_sent_estimate();

-- A sent estimate must carry its own frozen totals and document config.
alter table estimates
  add constraint sent_estimates_are_snapshotted
  check (
    status = 'draft'
    or (total_cents is not null and doc_config is not null)
  );

-- ---------------------------------------------------------------- 2. acceptance

-- One row per sold line, so accepting twice fails loudly instead of silently
-- doubling the plan.
create unique index epics_one_per_source_line
  on epics (source_line_id) where source_line_id is not null;

create unique index tasks_one_per_source_line
  on tasks (source_line_id) where source_line_id is not null;

-- Accept an estimate: mark it accepted, create its project, and seed the plan
-- from its lines - sections become epics, items become tasks carrying their
-- sold hours into estimate_hours.
--
-- security invoker, so RLS applies exactly as it would to the caller.
create or replace function accept_estimate(
  p_estimate uuid,
  p_project_name text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_estimate estimates;
  v_project  uuid;
  v_epic     uuid;
  v_line     estimate_lines;
  v_pos      numeric := 0;
begin
  select * into v_estimate from estimates where id = p_estimate for update;

  if v_estimate.id is null then
    raise exception 'estimate not found';
  end if;

  if v_estimate.status <> 'sent' then
    raise exception 'only a sent estimate can be accepted (this one is %)',
      v_estimate.status;
  end if;

  insert into projects (owner_id, client_id, name, status)
  values (
    v_estimate.owner_id,
    v_estimate.client_id,
    coalesce(p_project_name, v_estimate.title, v_estimate.number),
    'active'
  )
  returning id into v_project;

  -- Lines are ordered, so each item belongs to the section above it.
  for v_line in
    select * from estimate_lines where estimate_id = p_estimate order by position
  loop
    if v_line.kind = 'section' then
      v_pos := v_pos + 1024;
      insert into epics (owner_id, project_id, name, description, position,
                         source_line_id)
      values (v_estimate.owner_id, v_project, v_line.description, v_line.detail,
              v_pos, v_line.id)
      returning id into v_epic;
    else
      insert into tasks (owner_id, project_id, epic_id, title, description,
                         estimate_hours, position, source_line_id)
      values (v_estimate.owner_id, v_project, v_epic, v_line.description,
              v_line.detail, v_line.hours, v_line.position, v_line.id);
    end if;
  end loop;

  update estimates
     set status = 'accepted', accepted_at = now(), project_id = v_project
   where id = p_estimate;

  return v_project;
end $$;

-- ---------------------------------------------------------------- 3. actual_hours

-- Stored derived data with no keeper: nothing wrote it, and the Gantt read it
-- directly, so a missed update showed a wrong bar rather than a missing one.
alter table tasks drop column actual_hours;

-- Hours logged against a task. Cheap at this scale; cannot go stale.
create or replace function task_actual_hours(t tasks) returns numeric
language sql stable
as $$
  select coalesce(sum(hours), 0) from time_entries where task_id = t.id;
$$;
