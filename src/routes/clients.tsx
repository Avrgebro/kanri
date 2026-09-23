import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '@/components/layout/site-header'

export const Route = createFileRoute('/clients')({
  component: () => (
    <>
      <SiteHeader title="Clients" />
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Client records and their estimate history.</p>
      </div>
    </>
  ),
})
