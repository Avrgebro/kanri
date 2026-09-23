import { daysBetween, parseDay } from "@/lib/dates"
import { rankBetween } from "@/lib/rank"
import type { DependencyType, Task, TaskStatus } from "@/types/domain"

type Dependency = { task_id: string; depends_on: string; type: DependencyType }

/** Workflow order, which is also the board's columns, left to right. */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
}

export const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]

/**
 * Dependency types as the sheet names them. Finish-to-start is the default
 * and goes unlabelled on a row; the others show the short form.
 */
export const DEPENDENCY_LABELS: Record<DependencyType, { short: string; name: string; hint: string }> = {
  finish_to_start: { short: "F→S", name: "Finish-to-start", hint: "Can't start until the other finishes" },
  start_to_start: { short: "S→S", name: "Start-to-start", hint: "Can't start until the other starts" },
  finish_to_finish: { short: "F→F", name: "Finish-to-finish", hint: "Can't finish until the other finishes" },
  start_to_finish: { short: "S→F", name: "Start-to-finish", hint: "Can't finish until the other starts" },
}

export const DEPENDENCY_TYPES = Object.keys(DEPENDENCY_LABELS) as DependencyType[]

/**
 * Tasks each task is waiting on: unfinished predecessors of a finish-to-start
 * dependency. Only that type gates starting — start-to-start, finish-to-finish
 * and start-to-finish constrain the schedule, which is the Gantt's business,
 * not whether a card can move. A done task waits on nothing.
 *
 * This is derived from dependencies. The "Blocked" status is separate: it is
 * set by hand, for blockers outside the project such as waiting on a client.
 */
export function waitingOn(tasks: Task[], deps: Dependency[]): Map<string, Task[]> {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const waiting = new Map<string, Task[]>()
  for (const d of deps) {
    if (d.type !== "finish_to_start") continue
    const task = byId.get(d.task_id)
    const pred = byId.get(d.depends_on)
    if (!task || !pred || task.status === "done" || pred.status === "done") continue
    waiting.set(task.id, [...(waiting.get(task.id) ?? []), pred])
  }
  return waiting
}

/**
 * Every task that depends on `taskId`, directly or through others. Making
 * `taskId` depend on any of them would close a cycle.
 */
export function dependents(taskId: string, deps: Dependency[]): Set<string> {
  const found = new Set<string>()
  const queue = [taskId]
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const d of deps) {
      if (d.depends_on === id && !found.has(d.task_id)) {
        found.add(d.task_id)
        queue.push(d.task_id)
      }
    }
  }
  return found
}

/** A position after every one of `siblings`. */
const after = (siblings: Task[]) => {
  const last = Math.max(...siblings.map((t) => t.position))
  return rankBetween(Number.isFinite(last) ? last : null, null)
}

/**
 * Where a top-level task goes when its status or epic changes anywhere but a
 * board drop: the end of its new (status, epic) group, which is a board cell.
 * Subtasks keep their position; it orders them within their parent only.
 */
export const endOfGroup = (tasks: Task[], task: Task, status: TaskStatus, epic_id: string | null) =>
  after(
    tasks.filter(
      (t) => t.id !== task.id && !t.parent_id && t.status === status && t.epic_id === epic_id,
    ),
  )

/** Where a new subtask goes: after its parent's existing subtasks. */
export const nextSubtaskPosition = (tasks: Task[], parentId: string) =>
  after(tasks.filter((t) => t.parent_id === parentId))

/** How close a task is to its due date, within the week; done tasks never warn. */
export type DueState = { kind: "overdue"; days: number } | { kind: "soon"; days: number }

export const SOON_DAYS = 7

export function dueState(task: Task, today: Date): DueState | null {
  if (!task.due_date || task.status === "done") return null
  const days = daysBetween(today, parseDay(task.due_date))
  if (days < 0) return { kind: "overdue", days: -days }
  if (days <= SOON_DAYS) return { kind: "soon", days }
  return null
}

/** "3 days overdue", "today", "in 2 days". */
export function describeDue(due: DueState): string {
  const n = (k: number) => `${k} day${k === 1 ? "" : "s"}`
  if (due.kind === "overdue") return `${n(due.days)} overdue`
  return due.days === 0 ? "today" : `in ${n(due.days)}`
}
