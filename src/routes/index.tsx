import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/layout/empty-state"
import { PageBody } from "@/components/layout/page-body"
import { PageTitle } from "@/components/layout/page-title"
import { SiteHeader } from "@/components/layout/site-header"

export const Route = createFileRoute("/")({ component: Dashboard })

/** Cross-project overview: active work, what is due, open estimates. */
function Dashboard() {
  return (
    <>
      <SiteHeader title={<PageTitle>Dashboard</PageTitle>} />
      <PageBody>
        <EmptyState
          title="Nothing to report yet"
          description="Once there are projects and estimates, this is where the numbers across all of them land."
        />
      </PageBody>
    </>
  )
}
