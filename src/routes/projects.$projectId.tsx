import { Outlet, createFileRoute, Link, useMatchRoute } from "@tanstack/react-router"
import { IconArrowLeft, IconPlus } from "@tabler/icons-react"

import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectCapsule, PROJECT_VIEWS } from "@/features/projects/project-capsule"
import { ProjectMenu } from "@/features/projects/project-menu"
import { useProject } from "@/features/projects/queries"

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectLayout,
})

function ProjectLayout() {
  const { projectId } = Route.useParams()
  const { data: project, isLoading, error } = useProject(projectId)
  const matchRoute = useMatchRoute()

  const current =
    PROJECT_VIEWS.find((v) =>
      matchRoute({ to: v.to, params: { projectId }, fuzzy: false }),
    ) ?? PROJECT_VIEWS[0]

  if (isLoading) {
    return (
      <>
        <SiteHeader title="Project" />
        <div className="p-4 md:p-6">
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </>
    )
  }

  if (error || !project) {
    return (
      <>
        <SiteHeader title="Project" />
        <div className="p-4 md:p-6">
          <p className="text-sm text-destructive">
            {error?.message ?? "Project not found."}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/projects">
              <IconArrowLeft />
              Back to projects
            </Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader
        title={<ProjectCapsule project={project} view={current.key} />}
        actions={
          <>
            <ProjectMenu project={project} />
            <Button size="sm" className="gap-1.5 font-semibold">
              <IconPlus className="size-4" />
              {current.action}
            </Button>
          </>
        }
      />

      <div className="flex flex-1 flex-col p-4 md:p-6">
        <Outlet />
      </div>
    </>
  )
}
