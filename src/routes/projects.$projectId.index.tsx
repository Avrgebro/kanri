import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"

export const Route = createFileRoute("/projects/$projectId/")({
  component: () => (
    <EmptyState
      title="No data yet"
      description="Open issues, hours sold vs. logged and work remaining land here once this project has tasks."
    />
  ),
})
