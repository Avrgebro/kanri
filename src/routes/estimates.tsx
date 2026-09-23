import { createFileRoute } from '@tanstack/react-router'

import { IconPlus } from '@tabler/icons-react'

import { PageBody } from '@/components/layout/page-body'
import { PageTitle } from '@/components/layout/page-title'
import { SiteHeader } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/estimates')({
  component: () => (
    <>
      <SiteHeader
        title={<PageTitle>Estimates</PageTitle>}
        actions={
          <Button size="sm" className="gap-1.5 font-semibold">
            <IconPlus className="size-4" />
            New estimate
          </Button>
        }
      />
      <PageBody>
        <p className="text-sm text-muted-foreground">The line-item builder and live PDF preview go here.</p>
      </PageBody>
    </>
  ),
})
