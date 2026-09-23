import type { ReactNode } from "react"

/** The header's heading. Pages that need a richer control pass their own node. */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="truncate pl-1 text-sm font-semibold">{children}</h1>
}
