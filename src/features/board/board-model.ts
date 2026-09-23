import type { PositionWrite } from "@/features/tasks/queries"
import { STATUSES } from "@/features/tasks/task-model"
import { needsRebalance, rankBetween } from "@/lib/rank"
import type { Epic, Task, TaskStatus } from "@/types/domain"

/** Tasks without an epic get their own lane rather than being forced into one. */
export const NO_EPIC = "none"

export type LaneId = string // an epic id, or NO_EPIC

/** A cell is one (lane, status) intersection — the unit cards are ordered in. */
export type CellId = `${LaneId}:${TaskStatus}`

export const cellId = (lane: LaneId, status: TaskStatus): CellId =>
  `${lane}:${status}`

export function parseCellId(id: CellId): { lane: LaneId; status: TaskStatus } {
  const i = id.lastIndexOf(":")
  return { lane: id.slice(0, i), status: id.slice(i + 1) as TaskStatus }
}

export const laneOf = (task: Task): LaneId => task.epic_id ?? NO_EPIC

export interface Lane {
  id: LaneId
  name: string
  color: string | null
}

/** Epic lanes in their own order, then the no-epic lane last. */
export function buildLanes(epics: Epic[]): Lane[] {
  return [
    ...[...epics]
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ id: e.id, name: e.name, color: e.color })),
    { id: NO_EPIC, name: "No epic", color: null },
  ]
}

/** Card order per cell. Subtasks never get cards — they show on the parent. */
export type Layout = Record<CellId, string[]>

export function buildLayout(tasks: Task[], lanes: Lane[]): Layout {
  const layout = {} as Layout
  for (const lane of lanes) {
    for (const status of STATUSES) layout[cellId(lane.id, status)] = []
  }

  const roots = tasks
    .filter((t) => !t.parent_id)
    .sort((a, b) => a.position - b.position)

  for (const t of roots) {
    // A task whose epic was deleted falls through to the no-epic lane.
    const cell = layout[cellId(laneOf(t), t.status)] ?? layout[cellId(NO_EPIC, t.status)]
    cell.push(t.id)
  }
  return layout
}

/** Subtask progress for a parent card, e.g. 2 of 5 done. */
export function subtaskCounts(tasks: Task[]) {
  const counts = new Map<string, { done: number; total: number }>()
  for (const t of tasks) {
    if (!t.parent_id) continue
    const c = counts.get(t.parent_id) ?? { done: 0, total: 0 }
    c.total += 1
    if (t.status === "done") c.done += 1
    counts.set(t.parent_id, c)
  }
  return counts
}

/**
 * Where a card lands after a drop: its new status, lane, and the position
 * writes needed to keep the cell ordered.
 *
 * Normally that is one write — the moved card gets a rank between its new
 * neighbours. When repeated inserts into the same gap have squeezed positions
 * too close for float precision, the whole cell is renumbered instead, so
 * ordering can never silently collapse into duplicate positions.
 */
export function planMove(
  taskId: string,
  target: CellId,
  orderedIds: string[],
  positions: Map<string, number>,
): { status: TaskStatus; epic_id: string | null; writes: PositionWrite[] } {
  const { lane, status } = parseCellId(target)
  const epic_id = lane === NO_EPIC ? null : lane

  const index = orderedIds.indexOf(taskId)
  const before = index > 0 ? positions.get(orderedIds[index - 1]) : undefined
  const after =
    index < orderedIds.length - 1 ? positions.get(orderedIds[index + 1]) : undefined

  const position = rankBetween(before, after)

  const cellPositions = orderedIds.map((id) =>
    id === taskId ? position : (positions.get(id) ?? 0),
  )

  const writes: PositionWrite[] = needsRebalance(cellPositions)
    ? orderedIds.map((id, i) => ({ id, position: (i + 1) * 1024 }))
    : [{ id: taskId, position }]

  return { status, epic_id, writes }
}
