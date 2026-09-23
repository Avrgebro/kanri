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
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <Outlet />
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  ),
})
