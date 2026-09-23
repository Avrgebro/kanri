import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"

export const Route = createFileRoute("/projects/$projectId/gantt")({
  component: () => <EmptyState title="Gantt" description="The timeline, with epics as summary bars." />,
})
