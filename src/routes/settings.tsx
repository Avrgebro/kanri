import { createFileRoute } from '@tanstack/react-router'

import { PageBody } from '@/components/layout/page-body'
import { PageTitle } from '@/components/layout/page-title'
import { SiteHeader } from '@/components/layout/site-header'

export const Route = createFileRoute('/settings')({
  component: () => (
    <>
      <SiteHeader
        title={<PageTitle>Settings</PageTitle>}

      />
      <PageBody>
        <p className="text-sm text-muted-foreground">Company details, branding and estimate document defaults.</p>
      </PageBody>
    </>
  ),
})
