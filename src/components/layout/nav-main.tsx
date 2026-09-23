import { Link, useMatchRoute } from "@tanstack/react-router"
import type { Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface NavItem {
  title: string
  to: string
  icon?: Icon
  /** Match this path only. Otherwise child routes keep the parent selected. */
  exact?: boolean
}

/** Selected state: solid lime fill, with the theme's black on-primary text. */
export const activeItemClass =
  "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground " +
  "data-[active=true]:font-medium " +
  "data-[active=true]:hover:bg-primary/90 data-[active=true]:hover:text-primary-foreground " +
  "data-[active=true]:active:bg-primary/90 data-[active=true]:active:text-primary-foreground"

/** Shared so the main and secondary groups highlight identically. */
export function useIsActive() {
  const matchRoute = useMatchRoute()
  return (item: NavItem) => Boolean(matchRoute({ to: item.to, fuzzy: !item.exact }))
}

export function NavMain({ items, label }: { items: NavItem[]; label?: string }) {
  const isActive = useIsActive()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive(item)}
                className={activeItemClass}
              >
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
