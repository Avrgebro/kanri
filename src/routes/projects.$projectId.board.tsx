import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"
import { PageBody } from "@/components/layout/page-body"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskBoard } from "@/features/board/task-board"
import { useProjectEpics, useProjectTasks } from "@/features/tasks/queries"
import { errorMessage } from "@/lib/errors"

export const Route = createFileRoute("/projects/$projectId/board")({ component: Board })

function Board() {
  const { projectId } = Route.useParams()
  const tasks = useProjectTasks(projectId)
  const epics = useProjectEpics(projectId)

  if (tasks.isLoading || epics.isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-96 rounded-xl" />
      </PageBody>
    )
  }

  const error = tasks.error ?? epics.error
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

  return (
    <PageBody flush>
      <TaskBoard projectId={projectId} tasks={tasks.data} epics={epics.data ?? []} />
    </PageBody>
  )
}
