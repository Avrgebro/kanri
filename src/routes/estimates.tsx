import { createFileRoute } from '@tanstack/react-router'
import { IconPlus } from '@tabler/icons-react'

import { SiteHeader } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/estimates')({
  component: () => (
    <>
      <SiteHeader
        title="Estimates"
        actions={
          <Button size="sm" className="gap-1.5 font-semibold">
            <IconPlus className="size-4" />
            New estimate
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <p className="text-sm text-muted-foreground">The line-item builder and live PDF preview go here.</p>
      </div>
    </>
  ),
})
