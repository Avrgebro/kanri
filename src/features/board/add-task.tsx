import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"

import { NO_EPIC, type LaneId } from "@/features/board/board-model"
import { useCreateTask } from "@/features/tasks/queries"
import { endOfGroup } from "@/features/tasks/task-model"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/domain"

/**
 * Add a task to one board cell. The cell already says its status (column)
 * and epic (lane), so a title is all it asks for; the rest is set in the task
 * sheet. Enter adds and stays open for the next one; Escape, or leaving it
 * empty, closes it.
 */
export function AddTask({
  projectId,
  tasks,
  lane,
  status,
  alwaysVisible,
}: {
  projectId: string
  tasks: Task[]
  lane: LaneId
  status: TaskStatus
  /** Otherwise it appears on hover or focus, so the board stays quiet. */
  alwaysVisible?: boolean
}) {
  const create = useCreateTask(projectId)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const epic_id = lane === NO_EPIC ? null : lane

  function add() {
    const title = draft.trim()
    // One at a time: each new card's position comes after the last one's.
    if (!title || create.isPending) return
    create.mutate(
      { title, status, epic_id, position: endOfGroup(tasks, status, epic_id) },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => toast.error(errorMessage(err, "Could not add task")),
      },
    )
  }

  function close() {
    setOpen(false)
    setDraft("")
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-opacity hover:bg-input/40 hover:text-foreground focus-visible:opacity-100",
          !alwaysVisible && "opacity-0 group-hover/cell:opacity-100",
        )}
      >
        <IconPlus className="size-3.5" />
        Add task
      </button>
    )
  }

  return (
    <input
      autoFocus
      aria-label="New task title"
      value={draft}
      placeholder="Task title, then Enter"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") add()
        if (e.key === "Escape") close()
      }}
      // Clicking away keeps what was typed, then closes.
      onBlur={() => {
        add()
        close()
      }}
      className="h-9 rounded-lg border border-ring bg-card px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
    />
  )
}
