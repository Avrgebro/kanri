import type { Epic, Task, TaskDependency } from '@/types/domain'

/** Epics render as summary bars spanning their children; tasks as normal bars. */
export function toGanttTasks(tasks: Task[], epics: Epic[]) {
  const byEpic = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.epic_id) continue
    const list = byEpic.get(t.epic_id) ?? []
    list.push(t)
    byEpic.set(t.epic_id, list)
  }

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
      t.status === 'done' ? 100 : t.estimate_hours
        ? Math.min(100, Math.round((Number(t.actual_hours) / Number(t.estimate_hours)) * 100))
        : 0,
    type: t.parent_id ? ('task' as const) : ('task' as const),
  }))

  return [...epicRows, ...taskRows]
}

export function toGanttLinks(deps: TaskDependency[]) {
  return deps.map((d) => ({
    id: d.id,
    source: d.depends_on,
    target: d.task_id,
    type: d.type,
  }))
}
