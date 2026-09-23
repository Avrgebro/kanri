import { useMemo, useState } from "react"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendar,
  IconCircleCheckFilled,
  IconCircleHalf2,
  IconClockHour4,
  IconCloudCheck,
  IconColumns3,
  IconCornerLeftUp,
  IconLoader2,
  IconLock,
  IconStack2,
  IconTag,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useMoveTask,
  useSaveState,
  useUpdateTask,
  type SaveState,
  type TaskFields,
} from "@/features/tasks/queries"
import {
  DateField,
  DescriptionField,
  DueHint,
  EstimateField,
  ghost,
  Property,
  TagsField,
  TitleField,
} from "@/features/tasks/task-sheet-fields"
import {
  DeleteSubtask,
  Dependencies,
  Subtasks,
  WaitingNotice,
} from "@/features/tasks/task-sheet-relations"
import {
  dueState,
  endOfGroup,
  STATUS_LABELS,
  STATUSES,
  waitingOn,
} from "@/features/tasks/task-model"
import { StatusIcon } from "@/features/tasks/task-status"
import { shortDate } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import type { Epic, Task, TaskDependency, TaskStatus } from "@/types/domain"

/** Select has no null value, so "no epic" needs a sentinel. */
const NO_EPIC = "__none__"

interface TaskSheetProps {
  projectId: string
  /** Shown in the top bar of a top-level task, for context. */
  projectName: string
  tasks: Task[]
  epics: Epic[]
  dependencies: TaskDependency[]
  /** The task to show; the sheet is closed when it is undefined. */
  taskId: string | undefined
  /** Show another task in the sheet: a subtask, parent or dependency. */
  onOpenTask: (id: string) => void
  onClose: () => void
}

/**
 * Everything about one task. Fields save as they are committed — on blur for
 * text, on pick for the rest — so there is no Save button to forget; the top
 * bar says whether the last write landed.
 */
export function TaskSheet({ taskId, onClose, ...props }: TaskSheetProps) {
  // Closing clears `taskId` at once, but the sheet still slides out for a
  // moment. Keep rendering the last task until then rather than an empty panel.
  const [lastId, setLastId] = useState(taskId)
  if (taskId && taskId !== lastId) setLastId(taskId)

  const open = props.tasks.some((t) => t.id === taskId)
  const shown = props.tasks.find((t) => t.id === (taskId ?? lastId))

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent showCloseButton={false} className="w-full gap-0 sm:max-w-lg">
        {/* Keyed so drafts reset when the sheet switches to another task. */}
        {shown && <TaskDetail key={shown.id} task={shown} {...props} />}
      </SheetContent>
    </Sheet>
  )
}

function TaskDetail({
  task,
  projectId,
  projectName,
  tasks,
  epics,
  dependencies,
  onOpenTask,
}: Omit<TaskSheetProps, "taskId" | "onClose"> & { task: Task }) {
  const move = useMoveTask(projectId)
  const update = useUpdateTask(projectId)
  const parent = task.parent_id ? tasks.find((t) => t.id === task.parent_id) : undefined
  const epic = epics.find((e) => e.id === task.epic_id)
  const due = dueState(task, new Date())
  const waiting = useMemo(
    () => waitingOn(tasks, dependencies).get(task.id) ?? [],
    [tasks, dependencies, task.id],
  )

  const save = (fields: TaskFields) =>
    update.mutate(
      { id: task.id, ...fields },
      { onError: (err) => toast.error(errorMessage(err, "Could not save task")) },
    )

  function moveTo(status: TaskStatus, epic_id: string | null) {
    // A top-level task changing cell goes to the end of it. A subtask has no
    // cell, and its position orders it within its parent, so it keeps it.
    const writes = task.parent_id
      ? []
      : [{ id: task.id, position: endOfGroup(tasks, task, status, epic_id) }]
    move({ taskId: task.id, status, epic_id, writes }, (err) =>
      toast.error(errorMessage(err, "Could not move task")),
    )
  }

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b pr-3 pl-5">
        {parent ? (
          <button
            onClick={() => onOpenTask(parent.id)}
            className="-ml-1.5 flex h-7 min-w-0 items-center gap-1.5 rounded-md pr-2 pl-1.5 text-[13px] text-muted-foreground hover:bg-input/50 hover:text-foreground"
          >
            <IconCornerLeftUp className="size-3.5 shrink-0" />
            <span className="shrink-0">Subtask of</span>
            <span className="truncate font-medium text-foreground">{parent.title}</span>
          </button>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <IconColumns3 className="size-3.5 shrink-0" />
            <span className="truncate">{projectName}</span>
          </span>
        )}
        <div className="flex-1" />
        <SaveIndicator projectId={projectId} />
        <Separator orientation="vertical" className="mx-1 h-4!" />
        <SheetClose asChild>
          <Button variant="ghost" size="icon" title="Close (Esc)" className="size-8">
            <IconX />
            <span className="sr-only">Close</span>
          </Button>
        </SheetClose>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-5 pb-7">
        {/* Radix requires a title; the visible one is the editable field. */}
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <SheetDescription className="sr-only">Task details</SheetDescription>

        <div className="flex flex-col gap-2.5">
          <TitleField task={task} onSave={(title) => save({ title })} />
          {task.status === "done" && (
            <div className="flex items-center gap-2.5 rounded-lg border border-chart-3/30 bg-chart-3/12 py-2 pr-2 pl-3">
              <IconCircleCheckFilled className="size-4 shrink-0 text-chart-3" />
              <span className="flex-1 text-[13px]">
                Done{task.completed_at && ` on ${shortDate(new Date(task.completed_at))}`}. Due
                dates and dependencies no longer raise warnings.
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => moveTo("todo", task.epic_id)}
              >
                Reopen
              </Button>
            </div>
          )}
        </div>

        <WaitingNotice waiting={waiting} onOpenTask={onOpenTask} />

        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-x-2 gap-y-1">
          <Property icon={IconCircleHalf2} label="Status">
            <Select value={task.status} onValueChange={(s) => moveTo(s as TaskStatus, task.epic_id)}>
              <SelectTrigger aria-label="Status" className="h-8! w-fit gap-2 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <StatusIcon status={s} />
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {task.status === "blocked" && (
              <span className="px-2 pb-1 text-xs text-muted-foreground">
                Set by hand. Something outside the project is holding this up.
              </span>
            )}
          </Property>

          <Property icon={IconStack2} label="Epic">
            {parent ? (
              // A subtask's epic is its parent's; the schema keeps it so.
              <span
                title="A subtask's epic follows its parent"
                className="flex h-8 items-center gap-2 px-2 text-sm"
              >
                <EpicDot epic={epic} />
                {epic?.name ?? "No epic"}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconLock className="size-3" />
                  follows parent
                </span>
              </span>
            ) : (
              <Select
                value={task.epic_id ?? NO_EPIC}
                onValueChange={(e) => moveTo(task.status, e === NO_EPIC ? null : e)}
              >
                <SelectTrigger
                  aria-label="Epic"
                  className={cn(ghost, "h-8! w-fit gap-2", !epic && "text-muted-foreground")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_EPIC}>
                    <EpicDot />
                    No epic
                  </SelectItem>
                  {epics.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <EpicDot epic={e} />
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Property>

          <Property icon={IconCalendar} label="Dates">
            <div className="flex flex-wrap items-center gap-1">
              <DateField
                label="Start date"
                value={task.start_date}
                max={task.due_date}
                onChange={(start_date) => save({ start_date })}
              />
              <IconArrowRight className="size-3.5 text-muted-foreground" />
              <DateField
                label="Due date"
                value={task.due_date}
                min={task.start_date}
                due={due}
                onChange={(due_date) => save({ due_date })}
              />
              {due && <DueHint due={due} />}
            </div>
          </Property>

          <Property icon={IconClockHour4} label="Estimate">
            <EstimateField task={task} onSave={(estimate_hours) => save({ estimate_hours })} />
          </Property>

          <Property icon={IconTag} label="Tags">
            <TagsField task={task} onSave={(tags) => save({ tags })} />
          </Property>
        </div>

        <DescriptionField task={task} onSave={(description) => save({ description })} />

        {!parent && (
          <>
            <Separator />
            <Subtasks projectId={projectId} task={task} tasks={tasks} onOpenTask={onOpenTask} />
          </>
        )}

        <Separator />
        <Dependencies
          projectId={projectId}
          task={task}
          tasks={tasks}
          dependencies={dependencies}
          onOpenTask={onOpenTask}
        />

        {parent && (
          <>
            <Separator />
            <DeleteSubtask
              projectId={projectId}
              task={task}
              onDeleted={() => onOpenTask(parent.id)}
            />
          </>
        )}
      </div>
    </>
  )
}

/** An epic's colour; hollow for "No epic". */
function EpicDot({ epic }: { epic?: Epic }) {
  return epic ? (
    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: epic.color }} />
  ) : (
    <span className="size-2 shrink-0 rounded-full border border-dashed border-muted-foreground" />
  )
}

const SAVE_STATE: Record<
  SaveState,
  { icon: typeof IconCloudCheck; label: string; className: string }
> = {
  saved: { icon: IconCloudCheck, label: "Saved", className: "text-muted-foreground" },
  saving: {
    icon: IconLoader2,
    label: "Saving…",
    className: "text-muted-foreground [&>svg]:animate-spin",
  },
  failed: { icon: IconAlertTriangle, label: "Not saved", className: "font-medium text-foreground" },
}

function SaveIndicator({ projectId }: { projectId: string }) {
  const { icon: Glyph, label, className } = SAVE_STATE[useSaveState(projectId)]
  return (
    <span role="status" className={cn("flex items-center gap-1.5 text-xs", className)}>
      <Glyph className="size-3.5" />
      {label}
    </span>
  )
}
