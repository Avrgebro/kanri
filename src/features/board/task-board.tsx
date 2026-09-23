import { useMemo, useState } from "react"
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { IconChevronDown } from "@tabler/icons-react"
import { toast } from "sonner"

import {
  buildLanes,
  buildLayout,
  cellId,
  laneOf,
  planMove,
  subtaskCounts,
  type CellId,
  type Lane,
  type Layout,
} from "@/features/board/board-model"
import { SortableTaskCard, TaskCardBody } from "@/features/board/task-card"
import { useMoveTask } from "@/features/tasks/queries"
import { STATUS_LABELS, STATUSES, waitingOn } from "@/features/tasks/task-model"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import type { Epic, Task, TaskDependency } from "@/types/domain"

const GRID = "grid grid-cols-[repeat(6,minmax(15rem,1fr))] gap-3"

export function TaskBoard({
  projectId,
  tasks,
  epics,
  dependencies,
  onOpenTask,
}: {
  projectId: string
  tasks: Task[]
  epics: Epic[]
  dependencies: TaskDependency[]
  onOpenTask: (id: string) => void
}) {
  const lanes = useMemo(() => buildLanes(epics), [epics])
  const derived = useMemo(() => buildLayout(tasks, lanes), [tasks, lanes])
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const subtasks = useMemo(() => subtaskCounts(tasks), [tasks])
  const waiting = useMemo(() => waitingOn(tasks, dependencies), [tasks, dependencies])

  // A working copy exists only while a drag is in flight, so cards can preview
  // their drop cell. Otherwise the board renders straight from the query cache.
  const [dragLayout, setDragLayout] = useState<Layout | null>(null)
  const layout = dragLayout ?? derived
  const [activeId, setActiveId] = useState<string | null>(null)

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const move = useMoveTask(projectId)

  const sensors = useSensors(
    // A small distance so a plain click stays a click, and opens the card.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Space picks up and drops; Enter is left to open the card.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], end: ["Space"], cancel: ["Escape"] },
    }),
  )

  const containerOf = (id: string, l: Layout): CellId | undefined =>
    id in l ? (id as CellId) : (Object.keys(l) as CellId[]).find((c) => l[c].includes(id))

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
    setDragLayout(layout)
  }

  // Move the card between cells as it crosses them, so the drop target previews.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    setDragLayout((prev) => {
      if (!prev) return prev
      const from = containerOf(String(active.id), prev)
      const to = containerOf(String(over.id), prev)
      if (!from || !to || from === to) return prev

      const target = prev[to]
      const overIndex = target.indexOf(String(over.id))
      const insertAt = overIndex === -1 ? target.length : overIndex

      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, insertAt), String(active.id), ...target.slice(insertAt)],
      }
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = dragLayout
    setActiveId(null)
    // The move (if any) patches the cache synchronously below, so the working
    // copy can go in the same render without the card flashing back.
    setDragLayout(null)

    const taskId = String(active.id)
    const task = byId.get(taskId)
    const cell = current && containerOf(taskId, current)
    if (!over || !current || !task || !cell) return

    // Reorder within the final cell to the exact drop index.
    const ids = current[cell]
    const from = ids.indexOf(taskId)
    const to = ids.indexOf(String(over.id))
    const ordered = to === -1 || from === to ? ids : arrayMove(ids, from, to)

    const unchanged =
      cell === cellId(laneOf(task), task.status) && ordered.join() === derived[cell].join()
    if (unchanged) return

    const positions = new Map(tasks.map((t) => [t.id, t.position]))
    move({ taskId, ...planMove(taskId, cell, ordered, positions) }, (err) =>
      toast.error(errorMessage(err, "Could not move task")),
    )
  }

  function onDragCancel() {
    setActiveId(null)
    setDragLayout(null)
  }

  const toggle = (lane: string) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(lane)) next.delete(lane)
      else next.add(lane)
      return next
    })

  const active = activeId ? byId.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {/*
        Fills a flush PageBody and scrolls on both axes, so its scrollbars sit
        at the edges of the view. Padding is inside the scroll area.
      */}
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="min-w-max space-y-4">
          <div className={cn(GRID, "sticky top-0 z-10 bg-background py-1")}>
            {STATUSES.map((status) => {
              const count = lanes.reduce(
                (n, lane) => n + layout[cellId(lane.id, status)].length,
                0,
              )
              return (
                <div
                  key={status}
                  className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground"
                >
                  <span className="uppercase tracking-wide">{STATUS_LABELS[status]}</span>
                  <span className="tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>

          {lanes.map((lane) => (
            <Swimlane
              key={lane.id}
              lane={lane}
              layout={layout}
              byId={byId}
              subtasks={subtasks}
              waiting={waiting}
              onOpenTask={onOpenTask}
              collapsed={collapsed.has(lane.id)}
              onToggle={() => toggle(lane.id)}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {active && (
          <TaskCardBody
            task={active}
            subtasks={subtasks.get(active.id)}
            waitingOn={waiting.get(active.id)}
            className="rotate-1 shadow-lg ring-1 ring-primary/60"
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Swimlane({
  lane,
  layout,
  byId,
  subtasks,
  waiting,
  onOpenTask,
  collapsed,
  onToggle,
}: {
  lane: Lane
  layout: Layout
  byId: Map<string, Task>
  subtasks: Map<string, { done: number; total: number }>
  waiting: Map<string, Task[]>
  onOpenTask: (id: string) => void
  collapsed: boolean
  onToggle: () => void
}) {
  const total = STATUSES.reduce((n, s) => n + layout[cellId(lane.id, s)].length, 0)

  return (
    <section>
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="mb-2 flex items-center gap-2 rounded-md px-1 py-0.5 text-sm font-medium hover:text-foreground"
      >
        <IconChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        {lane.color ? (
          <span className="size-2.5 rounded-full" style={{ backgroundColor: lane.color }} />
        ) : (
          <span className="size-2.5 rounded-full border border-muted-foreground/50" />
        )}
        <span className={cn(!lane.color && "text-muted-foreground")}>{lane.name}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{total}</span>
      </button>

      {!collapsed && (
        <div className={GRID}>
          {STATUSES.map((status) => {
            const id = cellId(lane.id, status)
            return (
              <Cell key={id} id={id} ids={layout[id]}>
                {layout[id].map((taskId) => {
                  const task = byId.get(taskId)
                  return (
                    task && (
                      <SortableTaskCard
                        key={taskId}
                        task={task}
                        subtasks={subtasks.get(taskId)}
                        waitingOn={waiting.get(taskId)}
                        onOpen={() => onOpenTask(taskId)}
                      />
                    )
                  )
                })}
              </Cell>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Cell({
  id,
  ids,
  children,
}: {
  id: CellId
  ids: string[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <SortableContext id={id} items={ids} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-col gap-2 rounded-lg bg-muted/40 p-2 transition-colors",
          isOver && "bg-primary/10",
        )}
      >
        {children}
      </div>
    </SortableContext>
  )
}
