import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { IconCalendar, IconSubtask } from "@tabler/icons-react"

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

export function TaskCardBody({
  task,
  subtasks,
  className,
}: {
  task: Task
  subtasks?: { done: number; total: number }
  className?: string
}) {
  const overdue = isOverdue(task)
  const hasMeta = task.due_date || subtasks || task.tags.length > 0

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

/** A card that can be dragged within and between cells. */
export function SortableTaskCard(props: {
  task: Task
  subtasks?: { done: number; total: number }
}) {
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
    >
      <TaskCardBody {...props} />
    </div>
  )
}
