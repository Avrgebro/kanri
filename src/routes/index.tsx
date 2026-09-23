import { createFileRoute } from "@tanstack/react-router"

import { SiteHeader } from "@/components/layout/site-header"

export const Route = createFileRoute("/")({ component: Dashboard })

/** Cross-project overview: active work, hours sold vs. logged, open estimates. */
function Dashboard() {
  return (
    <>
      <SiteHeader title="Dashboard" />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
          <div className="max-w-sm px-6 py-16 text-center">
            <p className="text-sm font-medium">Nothing to report yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Once there are projects and estimates, this is where the numbers
              across all of them land.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
