import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"
import { PageBody } from "@/components/layout/page-body"

export const Route = createFileRoute("/projects/$projectId/docs")({
  component: () => (
    <PageBody>
      <EmptyState title="Docs" description="Files and folders for this project." />
    </PageBody>
  ),
})
