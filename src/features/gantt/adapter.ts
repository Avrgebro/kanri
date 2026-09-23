import type { Epic, Task, TaskDependency } from '@/types/domain'

/**
 * Adapter boundary: SVAR's shapes stop here. The database stores domain link
 * types; the vendor's abbreviations exist only in this file.
 */
const SVAR_LINK_TYPE: Record<TaskDependency['type'], string> = {
  finish_to_start: 'e2s',
  start_to_start: 's2s',
  finish_to_finish: 'e2e',
  start_to_finish: 's2e',
}

/**
 * Epics render as summary bars spanning their children; tasks as normal bars.
 *
 * `loggedHours` maps task id to hours logged. It is passed in rather than read
 * off the task because hours live in `time_entries` — the task row has no
 * cached total to go stale.
 */
export function toGanttTasks(
  tasks: Task[],
  epics: Epic[],
  loggedHours: Record<string, number> = {},
) {
  const epicRows = epics.map((e) => ({
    id: e.id,
    text: e.name,
    type: 'summary' as const,
    open: true,
  }))

  const taskRows = tasks.map((t) => ({
    id: t.id,
    text: t.title,
    parent: t.parent_id ?? t.epic_id ?? 0,
    start: t.start_date ? new Date(t.start_date) : undefined,
    end: t.due_date ? new Date(t.due_date) : undefined,
    duration: t.start_date && t.due_date ? undefined : 1,
    progress:
      t.status === 'done'
        ? 100
        : t.estimate_hours
          ? Math.min(
              100,
              Math.round(((loggedHours[t.id] ?? 0) / Number(t.estimate_hours)) * 100),
            )
          : 0,
    type: 'task' as const,
  }))

  return [...epicRows, ...taskRows]
}

export function toGanttLinks(deps: TaskDependency[]) {
  return deps.map((d) => ({
    id: d.id,
    source: d.depends_on,
    target: d.task_id,
    type: SVAR_LINK_TYPE[d.type],
  }))
}
