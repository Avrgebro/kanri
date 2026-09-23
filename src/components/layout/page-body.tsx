import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** The content region under a SiteHeader. One place to change page padding. */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6", className)}
    >
      {children}
    </div>
  )
}
