import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { IconAlignLeft, IconCalendar, IconHourglass, IconSubtask } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/domain"

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

const isOverdue = (task: Task) =>
  task.due_date !== null &&
  task.status !== "done" &&
  new Date(`${task.due_date}T23:59:59`) < new Date()

export interface TaskCardProps {
  task: Task
  subtasks?: { done: number; total: number }
  /** Unfinished finish-to-start predecessors; see `waitingOn`. */
  waitingOn?: Task[]
}

export function TaskCardBody({
  task,
  subtasks,
  waitingOn,
  className,
}: TaskCardProps & { className?: string }) {
  const overdue = isOverdue(task)
  const hasDescription = Boolean(task.description?.trim())
  const hasMeta = task.due_date || subtasks || hasDescription || task.tags.length > 0

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-sm shadow-xs",
        task.status === "done" && "opacity-60",
        className,
      )}
    >
      <p className={cn("font-medium", task.status === "done" && "line-through")}>
        {task.title}
      </p>

      {/* Distinct from the Blocked column: this is derived from dependencies. */}
      {waitingOn?.length ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-chart-5">
          <IconHourglass className="size-3.5 shrink-0" />
          <span className="truncate">
            Waiting on{" "}
            {waitingOn.length === 1 ? waitingOn[0].title : `${waitingOn.length} tasks`}
          </span>
        </p>
      ) : null}

      {hasMeta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {task.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "font-medium text-destructive",
              )}
            >
              <IconCalendar className="size-3.5" />
              {fmtDate(task.due_date)}
            </span>
          )}

          {subtasks && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <IconSubtask className="size-3.5" />
              {subtasks.done}/{subtasks.total}
            </span>
          )}

          {hasDescription && (
            <IconAlignLeft className="size-3.5" aria-label="Has a description" />
          )}

          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[11px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * A card that can be dragged within and between cells, and opens on click or
 * Enter. No drag/click disambiguation is needed here: once a pointer drag
 * activates, dnd-kit swallows the click that ends it. Keyboard dragging starts
 * and ends on Space only (see the board's sensor), which leaves Enter to open.
 */
export function SortableTaskCard({ onOpen, ...props }: TaskCardProps & { onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        // The original stays in place as a slot while the overlay follows the pointer.
        isDragging && "opacity-30",
      )}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e)
        if (e.key === "Enter" && !isDragging) onOpen()
      }}
    >
      <TaskCardBody {...props} />
    </div>
  )
}
