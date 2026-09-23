import type { ILink, ITask } from "@svar-ui/react-gantt"

import { addDays, formatDay, parseDay, shortDate } from "@/lib/dates"
import type { DependencyType, Epic, Task } from "@/types/domain"

/**
 * Adapter boundary: SVAR's shapes stop here. The database stores domain link
 * types and inclusive calendar dates; this file is the only place that knows
 * SVAR wants abbreviations and exclusive end timestamps.
 */

// ---------------------------------------------------------------- link types

/** Not exported by name, so derive it from the public link shape. */
type TLinkType = ILink["type"]

const TO_SVAR: Record<DependencyType, TLinkType> = {
  finish_to_start: "e2s",
  start_to_start: "s2s",
  finish_to_finish: "e2e",
  start_to_finish: "s2e",
}

const FROM_SVAR = Object.fromEntries(
  Object.entries(TO_SVAR).map(([domain, svar]) => [svar, domain]),
) as Record<TLinkType, DependencyType>

export const toDependencyType = (t: TLinkType) => FROM_SVAR[t]

// ---------------------------------------------------------------- dates

/**
 * Our `due_date` is the last day of the task (inclusive); SVAR's `end` is the
 * moment it ends (exclusive). A task due on the 5th therefore ends on the 6th.
 * A task with only one of the two dates shows as a one-day bar on that day.
 */
function taskRange(t: Task): { start: Date; end: Date } | null {
  const first = t.start_date ?? t.due_date
  const last = t.due_date ?? t.start_date
  if (!first || !last) return null
  return { start: parseDay(first), end: addDays(parseDay(last), 1) }
}

/** Grid cell text for a start date. */
export const formatStart = (start?: Date) => (start ? shortDate(start) : "")

/** Inverse of `taskRange`: what to write back after a drag or resize. */
export function toTaskDates(start: Date, end: Date) {
  return { start_date: formatDay(start), due_date: formatDay(addDays(end, -1)) }
}

// ---------------------------------------------------------------- rows

type Range = { start: Date; end: Date }

const span = (ranges: Range[]): Range => ({
  start: new Date(Math.min(...ranges.map((r) => r.start.getTime()))),
  end: new Date(Math.max(...ranges.map((r) => r.end.getTime()))),
})

export interface GanttData {
  tasks: ITask[]
  links: ILink[]
  /**
   * Rows whose bar is derived from their children — epics, and undated parents
   * drawn from their subtasks. Never dragged, and never an end of a link.
   */
  derivedIds: Set<string>
  /** Undated tasks left off the chart — shown to the user as a count. */
  hidden: number
}

/**
 * Epics are summary rows spanning their dated tasks; tasks nest under their
 * epic, subtasks under their parent.
 *
 * Undated tasks are left off the chart. SVAR's free build resets its
 * `unscheduledTasks` option on load, so an undated row would be drawn as a
 * bar at the left edge — inventing a date. A parent with no dates of its own
 * but dated subtasks still appears, as a summary spanning them, and epics or
 * links that would point at nothing are dropped with them.
 */
export function toGanttData(
  tasks: Task[],
  epics: Epic[],
  deps: { id: string; task_id: string; depends_on: string; type: DependencyType }[],
): GanttData {
  const own = new Map(tasks.map((t) => [t.id, taskRange(t)]))

  const children = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.parent_id) continue
    const list = children.get(t.parent_id) ?? []
    list.push(t)
    children.set(t.parent_id, list)
  }

  // A task's range is its own dates, or else the span of its dated subtasks.
  const rangeOf = (t: Task): Range | null => {
    const r = own.get(t.id)
    if (r) return r
    const kids = (children.get(t.id) ?? [])
      .map((k) => own.get(k.id))
      .filter((x): x is Range => x != null)
    return kids.length ? span(kids) : null
  }

  // No hours are tracked, so progress is status: done is complete, and a
  // parent shows the share of its subtasks that are done.
  const progress = (t: Task) => {
    if (t.status === "done") return 100
    const kids = children.get(t.id)
    if (!kids?.length) return 0
    return Math.round((kids.filter((k) => k.status === "done").length / kids.length) * 100)
  }

  const dated = new Map(
    tasks.flatMap((t) => {
      const range = rangeOf(t)
      return range ? [[t.id, range] as const] : []
    }),
  )
  // A dated subtask under a parent that is itself hidden has nothing to nest in.
  const shown = [...tasks]
    .sort((a, b) => a.position - b.position)
    .flatMap((t) => {
      const range = dated.get(t.id)
      return range && (!t.parent_id || dated.has(t.parent_id)) ? [{ t, range }] : []
    })
  const shownIds = new Set(shown.map(({ t }) => t.id))

  const epicRows: ITask[] = [...epics]
    .sort((a, b) => a.position - b.position)
    .flatMap((e) => {
      const ranges = shown.filter(({ t }) => t.epic_id === e.id).map(({ range }) => range)
      if (!ranges.length) return []
      return [{ id: e.id, text: e.name, type: "summary", parent: 0, ...span(ranges) }]
    })
  const epicIds = new Set(epicRows.map((e) => String(e.id)))

  const taskRows: ITask[] = shown.map(({ t, range }) => ({
    id: t.id,
    text: t.title,
    // An undated parent is drawn as a summary of its dated subtasks.
    type: own.get(t.id) ? "task" : "summary",
    parent: t.parent_id ?? (t.epic_id && epicIds.has(t.epic_id) ? t.epic_id : 0),
    progress: progress(t),
    ...range,
  }))

  const rows = [...epicRows, ...taskRows]

  // `open` only on rows that really have children: SVAR's tree walk follows
  // `open === true` straight into `data`, which is null on a leaf, and throws.
  const parents = new Set(rows.map((r) => String(r.parent)))
  for (const r of rows) if (parents.has(String(r.id))) r.open = true

  const links: ILink[] = deps
    .filter((d) => shownIds.has(d.task_id) && shownIds.has(d.depends_on))
    .map((d) => ({
      id: d.id,
      source: d.depends_on,
      target: d.task_id,
      type: TO_SVAR[d.type],
    }))

  return {
    tasks: rows,
    links,
    derivedIds: new Set(rows.filter((r) => r.type === "summary").map((r) => String(r.id))),
    hidden: tasks.length - shownIds.size,
  }
}
