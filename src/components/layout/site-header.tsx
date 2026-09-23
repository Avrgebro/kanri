import type { ReactNode } from "react"
import { IconSearch } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

/**
 * Topbar for every page: identity on the left, search and the page's own
 * controls on the right.
 */
export function SiteHeader({
  title,
  actions,
}: {
  /** A string for plain pages, or a component (e.g. the project capsule). */
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground" />
        <Separator orientation="vertical" className="!h-4" />

        {typeof title === "string" ? (
          <h1 className="truncate pl-1 text-sm font-semibold">{title}</h1>
        ) : (
          title
        )}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="gap-2 px-2 text-muted-foreground"
        >
          <IconSearch className="size-4" />
          <span className="hidden w-22 text-left text-xs lg:inline">Search…</span>
          <kbd className="rounded bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
        </Button>

        {actions}
      </div>
    </header>
  )
}
