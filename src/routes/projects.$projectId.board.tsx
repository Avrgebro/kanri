import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/$projectId/board')({
  component: () => (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
      <div className="max-w-sm px-6 py-16 text-center">
        <p className="text-sm font-medium">Board</p>
        <p className="mt-1 text-sm text-muted-foreground">The kanban board, grouped into epic swimlanes.</p>
      </div>
    </div>
  ),
})
