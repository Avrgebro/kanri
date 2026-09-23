import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react"
import { IconHourglass, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  useAddDependency,
  useCreateSubtask,
  useDeleteDependency,
  useDeleteTask,
  useMoveTask,
  useUpdateTask,
  type TaskFields,
} from "@/features/tasks/queries"
import {
  dependents,
  endOfGroup,
  nextSubtaskPosition,
  STATUS_LABELS,
  STATUSES,
  waitingOn,
} from "@/features/tasks/task-model"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import type { Epic, Task, TaskDependency, TaskStatus } from "@/types/domain"

/** Select has no null value, so "no epic" needs a sentinel. */
const NO_EPIC = "__none__"

interface TaskSheetProps {
  projectId: string
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
 * text, on change for pickers — so there is no Save button to forget.
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
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {/* Keyed so drafts reset when the sheet switches to another task. */}
        {shown && <TaskDetail key={shown.id} task={shown} {...props} />}
      </SheetContent>
    </Sheet>
  )
}

function TaskDetail({
  task,
  projectId,
  tasks,
  epics,
  dependencies,
  onOpenTask,
}: Omit<TaskSheetProps, "taskId" | "onClose"> & { task: Task }) {
  const move = useMoveTask(projectId)
  const update = useUpdateTask(projectId)
  const parent = task.parent_id ? tasks.find((t) => t.id === task.parent_id) : undefined

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
      <SheetHeader className="gap-3 border-b pr-12">
        {parent && (
          <button
            onClick={() => onOpenTask(parent.id)}
            className="truncate text-left text-xs text-muted-foreground hover:text-foreground"
          >
            Subtask of {parent.title}
          </button>
        )}
        {/* Radix requires a title; the visible one is the editable field. */}
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <SheetDescription className="sr-only">Task details</SheetDescription>
        <TitleField task={task} onSave={(title) => save({ title })} />

        <div className="grid grid-cols-2 gap-3">
          <Select value={task.status} onValueChange={(s) => moveTo(s as TaskStatus, task.epic_id)}>
            <SelectTrigger aria-label="Status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* A subtask's epic follows its parent, so it is not chosen here. */}
          <Select
            value={task.epic_id ?? NO_EPIC}
            onValueChange={(e) => moveTo(task.status, e === NO_EPIC ? null : e)}
            disabled={Boolean(task.parent_id)}
          >
            <SelectTrigger aria-label="Epic" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_EPIC}>No epic</SelectItem>
              {epics.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SheetHeader>

      <div className="grid gap-6 p-4">
        <WaitingNotice task={task} tasks={tasks} dependencies={dependencies} onOpenTask={onOpenTask} />

        <Field label="Description" htmlFor="task-description">
          <DescriptionField task={task} onSave={(description) => save({ description })} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Start" htmlFor="task-start">
            <Input
              id="task-start"
              type="date"
              value={task.start_date ?? ""}
              max={task.due_date ?? undefined}
              onChange={(e) => save({ start_date: e.target.value || null })}
            />
          </Field>
          <Field label="Due" htmlFor="task-due">
            <Input
              id="task-due"
              type="date"
              value={task.due_date ?? ""}
              min={task.start_date ?? undefined}
              onChange={(e) => save({ due_date: e.target.value || null })}
            />
          </Field>
          <Field label="Estimate (h)" htmlFor="task-estimate">
            <EstimateField task={task} onSave={(estimate_hours) => save({ estimate_hours })} />
          </Field>
        </div>

        <Field label="Tags" htmlFor="task-tags">
          <TagsField task={task} onSave={(tags) => save({ tags })} />
        </Field>

        {!task.parent_id && (
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

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

/** Enter commits a single-line draft by blurring it, which saves. */
const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") e.currentTarget.blur()
}

// ---------------------------------------------------------------- fields

function TitleField({ task, onSave }: { task: Task; onSave: (title: string) => void }) {
  const [draft, setDraft] = useState(task.title)
  return (
    <Input
      aria-label="Title"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={blurOnEnter}
      onBlur={() => {
        const title = draft.trim()
        // A task always has a title; clearing it puts the old one back.
        if (!title) setDraft(task.title)
        else if (title !== task.title) onSave(title)
      }}
      className="h-auto border-transparent px-2 py-1 text-lg font-semibold shadow-none md:text-lg dark:bg-transparent"
    />
  )
}

function DescriptionField({
  task,
  onSave,
}: {
  task: Task
  onSave: (description: string | null) => void
}) {
  const [draft, setDraft] = useState(task.description ?? "")
  return (
    <Textarea
      id="task-description"
      rows={4}
      value={draft}
      placeholder="Notes, links, acceptance criteria…"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const description = draft.trim() || null
        if (description !== task.description) onSave(description)
      }}
    />
  )
}

function EstimateField({
  task,
  onSave,
}: {
  task: Task
  onSave: (hours: number | null) => void
}) {
  const [draft, setDraft] = useState(task.estimate_hours?.toString() ?? "")
  return (
    <Input
      id="task-estimate"
      type="number"
      inputMode="decimal"
      min={0}
      step={0.5}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={blurOnEnter}
      onBlur={() => {
        const hours = draft.trim() === "" ? null : Number(draft)
        if (hours !== null && (Number.isNaN(hours) || hours < 0)) {
          setDraft(task.estimate_hours?.toString() ?? "")
          return
        }
        if (hours !== task.estimate_hours) onSave(hours)
      }}
    />
  )
}

function TagsField({ task, onSave }: { task: Task; onSave: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("")

  function add() {
    const tag = draft.trim()
    setDraft("")
    if (tag && !task.tags.includes(tag)) onSave([...task.tags, tag])
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {task.tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            aria-label={`Remove ${tag}`}
            onClick={() => onSave(task.tags.filter((t) => t !== tag))}
            className="rounded-sm text-muted-foreground hover:text-foreground"
          >
            <IconX className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        id="task-tags"
        value={draft}
        placeholder="Add a tag"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
        className="h-7 w-32 flex-1 text-sm"
      />
    </div>
  )
}

// ---------------------------------------------------------------- relations

function TaskLink({ task, onOpenTask }: { task: Task; onOpenTask: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpenTask(task.id)}
      className={cn(
        "min-w-0 flex-1 truncate text-left text-sm hover:underline",
        task.status === "done" && "text-muted-foreground line-through",
      )}
    >
      {task.title}
    </button>
  )
}

function WaitingNotice({
  task,
  tasks,
  dependencies,
  onOpenTask,
}: {
  task: Task
  tasks: Task[]
  dependencies: TaskDependency[]
  onOpenTask: (id: string) => void
}) {
  const waiting = useMemo(
    () => waitingOn(tasks, dependencies).get(task.id) ?? [],
    [tasks, dependencies, task.id],
  )
  if (!waiting.length) return null

  return (
    <div className="flex gap-2 rounded-lg border border-chart-5/30 bg-chart-5/10 p-3 text-sm">
      <IconHourglass className="mt-0.5 size-4 shrink-0 text-chart-5" />
      <div className="min-w-0 flex-1">
        <p className="text-chart-5">Waiting on {waiting.length === 1 ? "a task" : `${waiting.length} tasks`} to finish</p>
        <ul className="mt-1 grid gap-0.5">
          {waiting.map((t) => (
            <li key={t.id} className="flex">
              <TaskLink task={t} onOpenTask={onOpenTask} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Subtasks({
  projectId,
  task,
  tasks,
  onOpenTask,
}: {
  projectId: string
  task: Task
  tasks: Task[]
  onOpenTask: (id: string) => void
}) {
  const move = useMoveTask(projectId)
  const create = useCreateSubtask(projectId)
  const [draft, setDraft] = useState("")

  const subtasks = tasks
    .filter((t) => t.parent_id === task.id)
    .sort((a, b) => a.position - b.position)
  const done = subtasks.filter((t) => t.status === "done").length

  function toggle(subtask: Task, checked: boolean) {
    move(
      // The epic is the parent's either way; the schema holds it there.
      { taskId: subtask.id, status: checked ? "done" : "todo", epic_id: subtask.epic_id, writes: [] },
      (err) => toast.error(errorMessage(err, "Could not update subtask")),
    )
  }

  function add() {
    const title = draft.trim()
    if (!title) return
    create.mutate(
      { parent: task, title, position: nextSubtaskPosition(tasks, task.id) },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => toast.error(errorMessage(err, "Could not add subtask")),
      },
    )
  }

  return (
    <Section title={subtasks.length ? `Subtasks · ${done}/${subtasks.length}` : "Subtasks"}>
      {subtasks.length > 0 && (
        <ul className="grid gap-2">
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Checkbox
                aria-label={`Mark ${s.title} done`}
                checked={s.status === "done"}
                onCheckedChange={(checked) => toggle(s, checked === true)}
              />
              <TaskLink task={s} onOpenTask={onOpenTask} />
              {s.status !== "done" && s.status !== "todo" && (
                <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABELS[s.status]}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Input
        aria-label="New subtask"
        value={draft}
        placeholder="Add a subtask"
        disabled={create.isPending}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        className="h-8 text-sm"
      />
    </Section>
  )
}

function Dependencies({
  projectId,
  task,
  tasks,
  dependencies,
  onOpenTask,
}: {
  projectId: string
  task: Task
  tasks: Task[]
  dependencies: TaskDependency[]
  onOpenTask: (id: string) => void
}) {
  const add = useAddDependency(projectId)
  const remove = useDeleteDependency(projectId)
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const dependsOn = dependencies.filter((d) => d.task_id === task.id)
  const neededBy = dependencies.filter((d) => d.depends_on === task.id)

  // Anything this task could depend on without closing a cycle: not itself,
  // not already a predecessor, not anything downstream of it.
  const candidates = useMemo(() => {
    const downstream = dependents(task.id, dependencies)
    const already = new Set(
      dependencies.filter((d) => d.task_id === task.id).map((d) => d.depends_on),
    )
    return tasks
      .filter((t) => t.id !== task.id && !already.has(t.id) && !downstream.has(t.id))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [tasks, dependencies, task.id])

  const onRemoveError = (err: unknown) =>
    toast.error(errorMessage(err, "Could not remove dependency"))

  const row = (dep: TaskDependency, other: Task | undefined) =>
    other && (
      <li key={dep.id} className="flex items-center gap-2">
        <TaskLink task={other} onOpenTask={onOpenTask} />
        {/* Finish-to-start is the default and goes unlabelled. */}
        {dep.type !== "finish_to_start" && (
          <span className="shrink-0 text-xs text-muted-foreground">{dep.type.replaceAll("_", " ")}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove dependency on ${other.title}`}
          onClick={() => remove.mutate(dep.id, { onError: onRemoveError })}
          className="size-7 shrink-0 text-muted-foreground"
        >
          <IconX />
        </Button>
      </li>
    )

  return (
    <Section title="Dependencies">
      <div className="grid gap-2">
        <p className="text-xs text-muted-foreground">Depends on</p>
        {dependsOn.length > 0 && (
          <ul className="grid gap-1">{dependsOn.map((d) => row(d, byId.get(d.depends_on)))}</ul>
        )}
        {/* Always empty: it is an action, not a field, so it shows its placeholder. */}
        <Select
          value=""
          disabled={!candidates.length}
          onValueChange={(depends_on) =>
            add.mutate(
              { task_id: task.id, depends_on, type: "finish_to_start" },
              { onError: (err) => toast.error(errorMessage(err, "Could not add dependency")) },
            )
          }
        >
          <SelectTrigger aria-label="Add a dependency" className="h-8 w-full text-sm">
            <SelectValue placeholder="Add a task this depends on" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {neededBy.length > 0 && (
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Needed by</p>
          <ul className="grid gap-1">{neededBy.map((d) => row(d, byId.get(d.task_id)))}</ul>
        </div>
      )}
    </Section>
  )
}

function DeleteSubtask({
  projectId,
  task,
  onDeleted,
}: {
  projectId: string
  task: Task
  onDeleted: () => void
}) {
  const remove = useDeleteTask(projectId)
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={remove.isPending}
      onClick={() =>
        remove.mutate(task.id, {
          onSuccess: onDeleted,
          onError: (err) => toast.error(errorMessage(err, "Could not delete subtask")),
        })
      }
      className="justify-self-start text-destructive hover:text-destructive"
    >
      Delete subtask
    </Button>
  )
}
