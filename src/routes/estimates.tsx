import { createFileRoute } from "@tanstack/react-router"

import { PageBody } from "@/components/layout/page-body"
import { PageTitle } from "@/components/layout/page-title"
import { SiteHeader } from "@/components/layout/site-header"

export const Route = createFileRoute("/estimates")({
  component: () => (
    <>
      <SiteHeader title={<PageTitle>Estimates</PageTitle>} />
      <PageBody>
        <p className="text-sm text-muted-foreground">The line-item builder and live PDF preview go here.</p>
      </PageBody>
    </>
  ),
})
