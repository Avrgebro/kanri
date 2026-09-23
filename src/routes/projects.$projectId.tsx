import { Outlet, createFileRoute, Link, useMatchRoute } from "@tanstack/react-router"
import { IconArrowLeft } from "@tabler/icons-react"

import { PageBody } from "@/components/layout/page-body"
import { PageTitle } from "@/components/layout/page-title"
import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectCapsule } from "@/features/projects/project-capsule"
import { ProjectMenu } from "@/features/projects/project-menu"
import {
  PROJECT_VIEWS,
  PROJECT_VIEW_KEYS,
  type ProjectView,
} from "@/features/projects/project-views"
import { useProject } from "@/features/projects/queries"
import { errorMessage } from "@/lib/errors"

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectLayout,
})

function ProjectLayout() {
  const { projectId } = Route.useParams()
  const { data: project, isLoading, error } = useProject(projectId)
  const matchRoute = useMatchRoute()

  const view: ProjectView =
    PROJECT_VIEW_KEYS.find((key) =>
      matchRoute({ to: PROJECT_VIEWS[key].to, params: { projectId }, fuzzy: false }),
    ) ?? "panel"

  return (
    <>
      <SiteHeader
        title={
          project ? (
            <ProjectCapsule project={project} view={view} />
          ) : (
            <PageTitle>Project</PageTitle>
          )
        }
        actions={project && <ProjectMenu project={project} />}
      />

      {/* Each view renders its own PageBody: canvas views need it flush. */}
      {project ? (
        <Outlet />
      ) : (
        <PageBody>
          {isLoading && <Skeleton className="h-28 rounded-xl" />}

          {error && (
            <div>
              <p className="text-sm text-destructive">{errorMessage(error)}</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/projects">
                  <IconArrowLeft />
                  Back to projects
                </Link>
              </Button>
            </div>
          )}
        </PageBody>
      )}
    </>
  )
}
