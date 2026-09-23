import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  IconFileDollar,
  IconFolder,
  IconLayoutDashboard,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain, type NavItem } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain: NavItem[] = [
  { title: "Dashboard", to: "/", icon: IconLayoutDashboard, exact: true },
  { title: "Projects", to: "/projects", icon: IconFolder },
  { title: "Estimates", to: "/estimates", icon: IconFileDollar },
  { title: "Clients", to: "/clients", icon: IconUsers },
]

const navSecondary: NavItem[] = [
  { title: "Settings", to: "/settings", icon: IconSettings },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/">
                <span className="text-base font-semibold tracking-tight">kanri</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
