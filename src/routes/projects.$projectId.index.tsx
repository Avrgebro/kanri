import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"
import { PageBody } from "@/components/layout/page-body"

export const Route = createFileRoute("/projects/$projectId/")({
  component: () => (
    <PageBody>
      <EmptyState
        title="No data yet"
        description="Task status, epic progress and what is due land here once this project has tasks."
      />
    </PageBody>
  ),
})
