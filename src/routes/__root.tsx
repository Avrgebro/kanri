import { Outlet, createRootRoute } from "@tanstack/react-router"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

/**
 * App shell. Routes render their own <SiteHeader /> so each page owns its
 * title and primary actions.
 */
export const Route = createRootRoute({
  component: () => (
    <SidebarProvider
      // Locked to the viewport: the topbar never scrolls, only page content does.
      className="h-svh"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      {/* min-w-0: a flex item defaults to min-width:auto and would grow to fit
          wide content like the board, scrolling the whole page instead of it.
          overflow-hidden: the inset clips, so scrolling happens in PageBody. */}
      <SidebarInset className="min-w-0 overflow-hidden">
        <Outlet />
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  ),
})
