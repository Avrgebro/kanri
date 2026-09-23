-- Moving a card on the board is one atomic call.
--
-- A drop changes the moved task's status and epic, and writes one or more
-- positions: normally just its own, but every card in the cell when the cell is
-- renumbered. Done as separate requests from the browser, a failure partway left
-- the cell half-renumbered. Here it is one statement in one transaction.
--
-- security invoker, so RLS applies exactly as it would to the caller.
-- p_epic is last and defaults to null because null is a real value here: the
-- "No epic" lane. The default is what makes the generated client type say so.
create or replace function move_task(
  p_task      uuid,
  p_status    task_status,
  p_ids       uuid[],
  p_positions numeric[],
  p_epic      uuid default null
)
returns void
language plpgsql
security invoker
as $$
begin
  if coalesce(array_length(p_ids, 1), 0) <> coalesce(array_length(p_positions, 1), 0) then
    raise exception 'move_task: % ids but % positions',
      coalesce(array_length(p_ids, 1), 0), coalesce(array_length(p_positions, 1), 0)
      using errcode = 'invalid_parameter_value';
  end if;

  update tasks
     set status = p_status,
         epic_id = p_epic,
         completed_at = case
           when p_status = 'done' then coalesce(completed_at, now())
           else null
         end
   where id = p_task;

  if not found then
    raise exception 'move_task: task % not found', p_task
      using errcode = 'no_data_found';
  end if;

  update tasks t
     set position = w.position
    from unnest(p_ids, p_positions) as w(id, position)
   where t.id = w.id;
end $$;
