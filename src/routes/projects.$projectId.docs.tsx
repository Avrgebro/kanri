import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"

export const Route = createFileRoute("/projects/$projectId/docs")({
  component: () => <EmptyState title="Docs" description="Files and folders for this project." />,
})
