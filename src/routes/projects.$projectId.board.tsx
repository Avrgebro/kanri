import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { EmptyState } from "@/components/layout/empty-state"
import { PageBody } from "@/components/layout/page-body"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskBoard } from "@/features/board/task-board"
import {
  useProjectDependencies,
  useProjectEpics,
  useProjectTasks,
} from "@/features/tasks/queries"
import { TaskSheet } from "@/features/tasks/task-sheet"
import { errorMessage } from "@/lib/errors"

/**
 * The open task lives in the URL, so the back button closes the sheet, a
 * refresh keeps it open, and a task can be linked to directly.
 */
const search = z.object({ task: z.string().optional() })

export const Route = createFileRoute("/projects/$projectId/board")({
  validateSearch: search,
  component: Board,
})

function Board() {
  const { projectId } = Route.useParams()
  const { task: openTaskId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const tasks = useProjectTasks(projectId)
  const epics = useProjectEpics(projectId)
  const dependencies = useProjectDependencies(projectId)

  if (tasks.isLoading || epics.isLoading || dependencies.isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-96 rounded-xl" />
      </PageBody>
    )
  }

  const error = tasks.error ?? epics.error ?? dependencies.error
  if (error) {
    return (
      <PageBody>
        <p className="text-sm text-destructive">{errorMessage(error)}</p>
      </PageBody>
    )
  }

  if (!tasks.data?.length) {
    return (
      <PageBody>
        <EmptyState
          title="No tasks yet"
          description="Tasks appear here once they are created, or when an accepted estimate seeds this project."
        />
      </PageBody>
    )
  }

  // Opening pushes a history entry; switching between tasks inside the sheet
  // replaces it, so one press of back always closes the sheet.
  const openTask = (id: string) =>
    void navigate({ search: { task: id }, replace: openTaskId !== undefined })
  const closeTask = () => void navigate({ search: {} })

  const data = {
    projectId,
    tasks: tasks.data,
    epics: epics.data ?? [],
    dependencies: dependencies.data ?? [],
  }

  return (
    <PageBody flush>
      <TaskBoard {...data} onOpenTask={openTask} />
      <TaskSheet {...data} taskId={openTaskId} onOpenTask={openTask} onClose={closeTask} />
    </PageBody>
  )
}
