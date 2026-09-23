import { useState } from "react"
import { Gantt, WillowDark, type IApi } from "@svar-ui/react-gantt"
import { toast } from "sonner"

import {
  formatStart,
  toDependencyType,
  toGanttData,
  toTaskDates,
} from "@/features/gantt/adapter"
import {
  useAddDependency,
  useDeleteDependency,
  useUpdateTask,
} from "@/features/tasks/queries"
import { errorMessage } from "@/lib/errors"
import type { Epic, Task, TaskDependency } from "@/types/domain"

/**
 * Grid columns, passed explicitly: SVAR's defaults include an "Add task"
 * button, and task creation is not built. `duration` is computed by SVAR from
 * start and the exclusive end, so it is the inclusive day count: Sep 7–10 is 4.
 *
 * Module-level on purpose, like every other prop passed to <Gantt>: SVAR's
 * React wrapper re-runs `store.init` — resetting scroll and zoom — whenever the
 * identity of a config prop changes. An inline array here would reset the
 * chart on every render.
 */
const COLUMNS = [
  { id: "text", header: "Task", flexgrow: 1 },
  { id: "start", header: "Start", width: 76, align: "center" as const, template: formatStart },
  { id: "duration", header: "Days", width: 64, align: "center" as const },
]

interface GanttData {
  projectId: string
  tasks: Task[]
  epics: Epic[]
  dependencies: TaskDependency[]
}

/**
 * The Gantt owns its state while mounted: data is read once on mount, and
 * edits are written through to the database and the shared cache. Bumping
 * `version` remounts it from the cache — used to discard an edit that failed
 * to save, since undo is a PRO feature.
 */
export function ProjectGantt(props: GanttData) {
  const [version, setVersion] = useState(0)
  return (
    <GanttView key={version} {...props} onDiscard={() => setVersion((v) => v + 1)} />
  )
}

function GanttView({
  projectId,
  tasks,
  epics,
  dependencies,
  onDiscard,
}: GanttData & { onDiscard: () => void }) {
  // Initialisers run once per mount, which is exactly the capture we want:
  // new props from the cache must not reset the chart mid-session.
  const [data] = useState(() => toGanttData(tasks, epics, dependencies))
  const { derivedIds } = data

  const updateTask = useUpdateTask(projectId)
  const addDependency = useAddDependency(projectId)
  const deleteDependency = useDeleteDependency(projectId)

  const fail = (what: string) => (err: unknown) => {
    toast.error(errorMessage(err, what))
    onDiscard()
  }

  function init(api: IApi) {
    // Creating, deleting, re-parenting and editing tasks belong to kanri's own
    // task UI, not SVAR's. Block them here so the chart can't do half a job.
    for (const action of ["add-task", "delete-task", "move-task", "show-editor"]) {
      api.intercept(action, () => false)
    }

    // Derived bars follow their children; moving one directly means nothing.
    api.intercept("drag-task", ({ id }) => !derivedIds.has(String(id)))

    api.on("update-task", ({ id, inProgress }) => {
      if (inProgress || derivedIds.has(String(id))) return
      const { start, end } = api.getTask(id)
      if (!start || !end) return
      updateTask.mutate(
        { id: String(id), ...toTaskDates(start, end) },
        { onError: fail("Could not save dates") },
      )
    })

    // Dependencies connect real tasks, so links to a derived row are refused.
    api.intercept("add-link", (ev) => {
      const { source, target } = ev.link
      if (derivedIds.has(String(source)) || derivedIds.has(String(target))) return false
      ev.id = crypto.randomUUID()
    })

    api.on("add-link", ({ id, link }) => {
      if (!id || !link.source || !link.target || !link.type) return
      addDependency.mutate(
        {
          id: String(id),
          depends_on: String(link.source),
          task_id: String(link.target),
          type: toDependencyType(link.type),
        },
        { onError: fail("Could not add dependency") },
      )
    })

    api.on("delete-link", ({ id }) => {
      deleteDependency.mutate(String(id), {
        onError: fail("Could not remove dependency"),
      })
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="svar-surface min-h-0 flex-1 overflow-hidden">
        <WillowDark>
          <Gantt
            tasks={data.tasks}
            links={data.links}
            columns={COLUMNS}
            cellBorders="full"
            zoom
            cellHeight={36}
            init={init}
          />
        </WillowDark>
      </div>

      {data.hidden > 0 && (
        <p className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground md:px-6">
          {data.hidden} {data.hidden === 1 ? "task has" : "tasks have"} no dates and{" "}
          {data.hidden === 1 ? "isn't" : "aren't"} on the timeline.
        </p>
      )}
    </div>
  )
}
