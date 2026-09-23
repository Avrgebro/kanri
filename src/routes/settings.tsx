import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '@/components/layout/site-header'

export const Route = createFileRoute('/settings')({
  component: () => (
    <>
      <SiteHeader title="Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <p className="text-sm text-muted-foreground">Company details, branding and estimate document defaults.</p>
      </div>
    </>
  ),
})
