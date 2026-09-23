import { createFileRoute, Link } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"
import { PageBody } from "@/components/layout/page-body"
import { PageTitle } from "@/components/layout/page-title"
import { SiteHeader } from "@/components/layout/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import { NewProjectButton } from "@/features/projects/new-project-button"
import { ProjectStatusBadge } from "@/features/projects/project-status"
import { useProjects } from "@/features/projects/queries"
import { errorMessage } from "@/lib/errors"

export const Route = createFileRoute("/projects/")({ component: ProjectList })

function ProjectList() {
  const { data, isLoading, error } = useProjects()

  return (
    <>
      <SiteHeader
        title={<PageTitle>Projects</PageTitle>}
        actions={<NewProjectButton />}
      />

      <PageBody>
        {isLoading && (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Could not load projects: {errorMessage(error)}
          </p>
        )}

        {data?.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Accept an estimate to generate one, or create a project directly."
            action={<NewProjectButton variant="outline" />}
          />
        )}

        {data && data.length > 0 && (
          <div className="grid gap-3">
            {data.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {p.clients?.name ?? "No client"}
                      {p.description ? ` · ${p.description}` : ""}
                    </p>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
