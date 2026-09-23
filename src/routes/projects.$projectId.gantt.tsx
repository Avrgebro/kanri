import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"
import { PageBody } from "@/components/layout/page-body"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjectEpics, useProjectTasks } from "@/features/tasks/queries"
import { ProjectGantt } from "@/features/gantt/project-gantt"
import { useProjectDependencies } from "@/features/gantt/queries"
import { errorMessage } from "@/lib/errors"

export const Route = createFileRoute("/projects/$projectId/gantt")({ component: GanttRoute })

function GanttRoute() {
  const { projectId } = Route.useParams()
  const tasks = useProjectTasks(projectId)
  const epics = useProjectEpics(projectId)
  const dependencies = useProjectDependencies(projectId)

  // Render only once everything is in: the chart captures its data on mount.
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
          description="The timeline appears once this project has tasks with dates."
        />
      </PageBody>
    )
  }

  return (
    <PageBody flush>
      <ProjectGantt
        projectId={projectId}
        tasks={tasks.data}
        epics={epics.data ?? []}
        dependencies={dependencies.data ?? []}
      />
    </PageBody>
  )
}
