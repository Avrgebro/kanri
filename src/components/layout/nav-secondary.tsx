import * as React from "react"
import { Link } from "@tanstack/react-router"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { activeItemClass, useIsActive, type NavItem } from "@/components/layout/nav-main"

export function NavSecondary({
  items,
  ...props
}: { items: NavItem[] } & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const isActive = useIsActive()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton asChild isActive={isActive(item)} className={activeItemClass}>
                <Link to={item.to}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
