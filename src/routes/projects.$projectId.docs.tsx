import { createFileRoute } from "@tanstack/react-router"

import { PageBody } from "@/components/layout/page-body"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectDocs } from "@/features/docs/project-docs"
import { useProjectDocs } from "@/features/docs/queries"
import { errorMessage } from "@/lib/errors"

export const Route = createFileRoute("/projects/$projectId/docs")({ component: Docs })

function Docs() {
  const { projectId } = Route.useParams()
  const docs = useProjectDocs(projectId)

  if (docs.isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-96 rounded-xl" />
      </PageBody>
    )
  }

  if (docs.error || !docs.data) {
    return (
      <PageBody>
        <p className="text-sm text-destructive">{errorMessage(docs.error)}</p>
      </PageBody>
    )
  }

  // No empty state of its own: an empty project shows the File Manager's,
  // which is also where the first folder or upload is added.
  return (
    <PageBody flush>
      <ProjectDocs projectId={projectId} {...docs.data} />
    </PageBody>
  )
}
