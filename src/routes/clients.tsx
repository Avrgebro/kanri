import { createFileRoute } from "@tanstack/react-router"

import { PageBody } from "@/components/layout/page-body"
import { PageTitle } from "@/components/layout/page-title"
import { SiteHeader } from "@/components/layout/site-header"

export const Route = createFileRoute("/clients")({
  component: () => (
    <>
      <SiteHeader title={<PageTitle>Clients</PageTitle>} />
      <PageBody>
        <p className="text-sm text-muted-foreground">Client records and their estimate history.</p>
      </PageBody>
    </>
  ),
})
