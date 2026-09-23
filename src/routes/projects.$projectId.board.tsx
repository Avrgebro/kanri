import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"

export const Route = createFileRoute("/projects/$projectId/board")({
  component: () => <EmptyState title="Board" description="The kanban board, grouped into epic swimlanes." />,
})
