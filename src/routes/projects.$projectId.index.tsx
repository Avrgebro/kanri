import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/projects/$projectId/")({ component: Panel })

/** Open work, hours sold vs. logged, work remaining — once tasks exist. */
function Panel() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
      <div className="max-w-sm px-6 py-16 text-center">
        <p className="text-sm font-medium">No data yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Open issues, hours sold vs. logged and work remaining land here once
          this project has tasks.
        </p>
      </div>
    </div>
  )
}
