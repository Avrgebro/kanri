import { useMemo, useState } from "react"
import {
  IconChevronRight,
  IconHourglass,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  useAddDependency,
  useCreateTask,
  useDeleteDependency,
  useDeleteTask,
  useMoveTask,
} from "@/features/tasks/queries"
import {
  DEPENDENCY_LABELS,
  DEPENDENCY_TYPES,
  dependents,
  nextSubtaskPosition,
  STATUS_LABELS,
} from "@/features/tasks/task-model"
import { StatusIcon } from "@/features/tasks/task-status"
import { errorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"
import type { DependencyType, Task, TaskDependency } from "@/types/domain"

type OpenTask = (id: string) => void

/** A list row that bleeds into the gutter, so its hover fill lines up with the text above. */
const row = "-mx-2 flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-input/40"

function TaskLink({ task, onOpenTask }: { task: Task; onOpenTask: OpenTask }) {
  return (
    <button
      onClick={() => onOpenTask(task.id)}
      className={cn(
        "min-w-0 flex-1 truncate text-left text-sm hover:underline",
        task.status === "done" && "text-muted-foreground",
      )}
    >
      {task.title}
    </button>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
}

// ---------------------------------------------------------------- waiting

export function WaitingNotice({ waiting, onOpenTask }: { waiting: Task[]; onOpenTask: OpenTask }) {
  if (!waiting.length) return null
  return (
    <div className="flex gap-2.5 rounded-lg border border-chart-5/30 bg-chart-5/10 p-3">
      <IconHourglass className="mt-0.5 size-4 shrink-0 text-chart-5" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-chart-5">
            Waiting on {waiting.length === 1 ? "1 task" : `${waiting.length} tasks`} to finish
          </span>
          <span className="text-xs leading-[17px] text-muted-foreground">
            Worked out from dependencies, and clears on its own when they're done. Unrelated to the
            Blocked status.
          </span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {waiting.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => onOpenTask(t.id)}
                className="-ml-1.5 flex h-7 w-[calc(100%+0.375rem)] items-center gap-2 rounded-md px-1.5 text-left text-[13px] hover:bg-chart-5/12"
              >
                <StatusIcon status={t.status} className="size-3.5" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground">{STATUS_LABELS[t.status]}</span>
                <IconChevronRight className="size-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- subtasks

export function Subtasks({
  projectId,
  task,
  tasks,
  onOpenTask,
}: {
  projectId: string
  task: Task
  tasks: Task[]
  onOpenTask: OpenTask
}) {
  const move = useMoveTask(projectId)
  const create = useCreateTask(projectId)
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
      { parent_id: task.id, title, status: "todo", position: nextSubtaskPosition(tasks, task.id) },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => toast.error(errorMessage(err, "Could not add subtask")),
      },
    )
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <SectionTitle>Subtasks</SectionTitle>
        {subtasks.length > 0 && (
          <>
            <span className="text-xs tabular-nums">
              {done}/{subtasks.length} done
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-3"
                style={{ width: `${Math.round((done / subtasks.length) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {subtasks.length ? (
        <ul className="flex flex-col">
          {subtasks.map((s) => (
            <li key={s.id} className={row}>
              <Checkbox
                aria-label={`Mark ${s.title} done`}
                checked={s.status === "done"}
                onCheckedChange={(checked) => toggle(s, checked === true)}
              />
              <button
                onClick={() => onOpenTask(s.id)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-sm hover:underline",
                  s.status === "done" && "text-muted-foreground line-through",
                )}
              >
                {s.title}
              </button>
              {s.status !== "done" && s.status !== "todo" && (
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <StatusIcon status={s.status} className="size-3.5" />
                  {STATUS_LABELS[s.status]}
                </span>
              )}
              <IconChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] leading-[19px] text-muted-foreground">
          No subtasks yet. Break this into steps you can tick off; they show as a count on the card.
        </p>
      )}

      <label className="flex h-9 items-center gap-2.5 rounded-md border border-dashed border-input px-2.5">
        <IconPlus className="size-3.5 text-muted-foreground" />
        <input
          aria-label="New subtask"
          value={draft}
          placeholder="Add a subtask"
          disabled={create.isPending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded border px-1.5 font-mono text-[11px] text-muted-foreground">↵</kbd>
      </label>
    </section>
  )
}

// ---------------------------------------------------------------- dependencies

function DependencyRow({
  dep,
  other,
  showDone,
  onOpenTask,
  onRemove,
}: {
  dep: TaskDependency
  other: Task
  showDone?: boolean
  onOpenTask: OpenTask
  onRemove: () => void
}) {
  const type = DEPENDENCY_LABELS[dep.type]
  return (
    <li className={cn(row, "pr-1")}>
      <span title={STATUS_LABELS[other.status]}>
        <StatusIcon status={other.status} />
      </span>
      <TaskLink task={other} onOpenTask={onOpenTask} />
      {showDone && other.status === "done" && (
        <span className="shrink-0 text-xs text-muted-foreground">Done</span>
      )}
      {dep.type !== "finish_to_start" && (
        <span
          title={`${type.name}: ${type.hint.toLowerCase()}`}
          className="shrink-0 rounded border px-1.5 font-mono text-[11px] text-muted-foreground"
        >
          {type.short}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove dependency on ${other.title}`}
        onClick={onRemove}
        className="size-7 shrink-0 text-muted-foreground"
      >
        <IconX />
      </Button>
    </li>
  )
}

export function Dependencies({
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
  onOpenTask: OpenTask
}) {
  const remove = useDeleteDependency(projectId)
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const dependsOn = dependencies.filter((d) => d.task_id === task.id)
  const neededBy = dependencies.filter((d) => d.depends_on === task.id)

  const onRemove = (id: string) => () =>
    remove.mutate(id, {
      onError: (err) => toast.error(errorMessage(err, "Could not remove dependency")),
    })

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <div className="flex h-7 items-center justify-between">
          <SectionTitle>Depends on</SectionTitle>
          <DependencyPicker
            projectId={projectId}
            task={task}
            tasks={tasks}
            dependencies={dependencies}
          />
        </div>
        {dependsOn.length ? (
          <ul className="flex flex-col">
            {dependsOn.map((d) => {
              const other = byId.get(d.depends_on)
              return (
                other && (
                  <DependencyRow
                    key={d.id}
                    dep={d}
                    other={other}
                    showDone
                    onOpenTask={onOpenTask}
                    onRemove={onRemove(d.id)}
                  />
                )
              )
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">Nothing. This task can start any time.</p>
        )}
      </div>

      {neededBy.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex h-7 items-center">
            <SectionTitle>Needed by</SectionTitle>
          </div>
          <ul className="flex flex-col">
            {neededBy.map((d) => {
              const other = byId.get(d.task_id)
              return (
                other && (
                  <DependencyRow
                    key={d.id}
                    dep={d}
                    other={other}
                    onOpenTask={onOpenTask}
                    onRemove={onRemove(d.id)}
                  />
                )
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

/**
 * Search the project's tasks and link one, with the dependency type chosen
 * up front. It leaves out tasks that can't be linked and says which, so a
 * missing task doesn't look like a bug.
 */
function DependencyPicker({
  projectId,
  task,
  tasks,
  dependencies,
}: {
  projectId: string
  task: Task
  tasks: Task[]
  dependencies: TaskDependency[]
}) {
  const add = useAddDependency(projectId)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<DependencyType>("finish_to_start")

  const { candidates, linked, loops } = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]))
    const linked = new Set(dependencies.filter((d) => d.task_id === task.id).map((d) => d.depends_on))
    // Anything downstream of this task would close a cycle.
    const loops = [...dependents(task.id, dependencies)]
      .map((id) => byId.get(id))
      .filter((t): t is Task => t !== undefined)
    const loopIds = new Set(loops.map((t) => t.id))
    const candidates = tasks
      .filter((t) => t.id !== task.id && !linked.has(t.id) && !loopIds.has(t.id))
      // Top-level tasks first, then subtasks, each by title.
      .sort((a, b) => Number(!!a.parent_id) - Number(!!b.parent_id) || a.title.localeCompare(b.title))
      .map((t) => ({ task: t, parent: t.parent_id ? byId.get(t.parent_id) : undefined }))
    return { candidates, linked: linked.size, loops }
  }, [tasks, dependencies, task.id])

  function link(dependsOn: string) {
    setOpen(false)
    add.mutate(
      { task_id: task.id, depends_on: dependsOn, type },
      { onError: (err) => toast.error(errorMessage(err, "Could not add dependency")) },
    )
  }

  const hidden = [
    "this task",
    linked && `${linked} already linked`,
    loops.length && `${loops.length} would create a loop (${loops.map((t) => t.title).join(", ")})`,
  ].filter(Boolean)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-[13px]">
          <IconPlus className="size-3.5" />
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <Command>
          <CommandInput placeholder="Search tasks…" />
          <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
            <span>Link as</span>
            <div role="radiogroup" aria-label="Dependency type" className="flex gap-0.5 rounded-md bg-muted p-0.5">
              {DEPENDENCY_TYPES.map((t) => (
                <button
                  key={t}
                  role="radio"
                  aria-checked={t === type}
                  title={`${DEPENDENCY_LABELS[t].name}: ${DEPENDENCY_LABELS[t].hint.toLowerCase()}`}
                  onClick={() => setType(t)}
                  className={cn(
                    "h-[22px] rounded px-1.5 font-mono text-[11px]",
                    t === type ? "bg-background text-foreground" : "hover:text-foreground",
                  )}
                >
                  {DEPENDENCY_LABELS[t].short}
                </button>
              ))}
            </div>
            <span className="ml-auto text-foreground">{DEPENDENCY_LABELS[type].name}</span>
          </div>
          <CommandList className="max-h-[260px]">
            <CommandEmpty>No matching tasks.</CommandEmpty>
            {candidates.map(({ task: t, parent }) => (
              <CommandItem key={t.id} value={`${t.title} ${t.id}`} onSelect={() => link(t.id)}>
                <StatusIcon status={t.status} className="size-3.5" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {parent && (
                  <span className="max-w-28 truncate text-xs text-muted-foreground">in {parent.title}</span>
                )}
              </CommandItem>
            ))}
          </CommandList>
          <p className="border-t px-3 py-2 text-xs leading-[17px] text-muted-foreground">
            Not shown: {hidden.join(" · ")}.
          </p>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------- delete

export function DeleteSubtask({
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
      disabled={remove.isPending}
      onClick={() =>
        remove.mutate(task.id, {
          onSuccess: onDeleted,
          onError: (err) => toast.error(errorMessage(err, "Could not delete subtask")),
        })
      }
      className="-ml-2.5 w-fit gap-1.5 px-2.5 hover:bg-destructive/25"
    >
      <IconTrash className="text-destructive" />
      Delete subtask
    </Button>
  )
}
