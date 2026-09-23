import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The content region under a SiteHeader — the only thing on a page that
 * scrolls, so the topbar stays put.
 *
 * `flush` is for canvas views (the board, the Gantt) that fill the region edge
 * to edge and scroll themselves: no padding, no scrolling of its own. They
 * pad their own content, inside their own scroll area, so the scrollbars sit
 * at the edge of the view.
 */
export function PageBody({
  children,
  flush = false,
  className,
}: {
  children: ReactNode
  flush?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !flush && "gap-4 overflow-y-auto p-4 md:gap-6 md:p-6",
        className,
      )}
    >
      {children}
    </div>
  )
}
