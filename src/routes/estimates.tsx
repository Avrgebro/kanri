import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '@/components/layout/site-header'

export const Route = createFileRoute('/estimates')({
  component: () => (
    <>
      <SiteHeader title="Estimates" />
      <div className="p-6">
        <p className="text-sm text-muted-foreground">The line-item builder and live PDF preview go here.</p>
      </div>
    </>
  ),
})
