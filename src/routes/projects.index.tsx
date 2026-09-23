import { createFileRoute, Link } from "@tanstack/react-router"
import { IconPlus } from "@tabler/icons-react"

import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectFormDialog } from "@/features/projects/project-form-dialog"
import { ProjectStatusBadge } from "@/features/projects/project-status"
import { useProjects } from "@/features/projects/queries"

export const Route = createFileRoute("/projects/")({ component: ProjectList })

function ProjectList() {
  const { data, isLoading, error } = useProjects()

  return (
    <>
      <SiteHeader
        title="Projects"
        actions={
          <ProjectFormDialog
            trigger={
              <Button size="sm" className="gap-1.5 font-semibold">
                <IconPlus className="size-4" />
                New project
              </Button>
            }
          />
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {isLoading && (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Could not load projects: {error.message}
          </p>
        )}

        {data && data.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
            <div className="max-w-sm px-6 py-16 text-center">
              <p className="text-sm font-medium">No projects yet</p>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Accept an estimate to generate one, or create a project directly.
              </p>
              <ProjectFormDialog
                trigger={
                  <Button size="sm" variant="outline">
                    <IconPlus />
                    New project
                  </Button>
                }
              />
            </div>
          </div>
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
      </div>
    </>
  )
}
