import type { Epic, Task, TaskStatus } from '@/types/domain'

/**
 * Adapter boundary: SVAR's data shapes stop here. The rest of the app only
 * ever sees domain types, so swapping the Kanban out is a local change.
 */

export const BOARD_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

export function toKanbanCards(tasks: Task[], epics: Epic[]) {
  const epicById = new Map(epics.map((e) => [e.id, e]))
  // Subtasks render as progress on the parent card, not as cards of their own.
  const roots = tasks.filter((t) => !t.parent_id)
  const childrenOf = (id: string) => tasks.filter((t) => t.parent_id === id)

  return roots
    .sort((a, b) => a.position - b.position)
    .map((t) => {
      const kids = childrenOf(t.id)
      const epic = t.epic_id ? epicById.get(t.epic_id) : undefined
      return {
        id: t.id,
        label: t.title,
        column: t.status,
        // 'unassigned' swimlane rather than forcing every task into an epic.
        columnKey: t.epic_id ?? 'unassigned',
        color: epic?.color,
        progress: kids.length
          ? Math.round((kids.filter((k) => k.status === 'done').length / kids.length) * 100)
          : undefined,
        subtaskCount: kids.length,
        start_date: t.start_date ? new Date(t.start_date) : undefined,
        end_date: t.due_date ? new Date(t.due_date) : undefined,
        estimate_hours: t.estimate_hours,
      }
    })
}

export function toSwimlanes(epics: Epic[]) {
  return [
    ...epics
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ id: e.id, label: e.name })),
    { id: 'unassigned', label: 'No epic' },
  ]
}
