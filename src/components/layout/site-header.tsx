import type { ReactNode } from "react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

/**
 * Topbar for every page: identity on the left, the page's own controls on
 * the right. `title` is rendered as given — plain pages wrap theirs in
 * <PageTitle>, so this component never inspects what it was handed.
 */
export function SiteHeader({
  title,
  actions,
}: {
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground" />
        <Separator orientation="vertical" className="!h-4" />

        {title}

        <div className="flex-1" />

        {actions}
      </div>
    </header>
  )
}
