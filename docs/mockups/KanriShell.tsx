import * as React from "react"
import {
  Briefcase, Check, ChevronsUpDown, Columns3, FolderOpen, GanttChartSquare, Gauge, Home, MoreHorizontal, Plus, Receipt, Search, Settings, Users,
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarSeparator, SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type AppRoute = "dashboard" | "projects" | "estimates" | "clients" | "settings"
type ProjectView = "panel" | "board" | "gantt" | "docs"
type Route = { app: AppRoute; project?: { id: string; view: ProjectView } }

const APP_NAV: { key: Exclude<AppRoute, "settings">; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "projects", label: "Projects", icon: Briefcase },
  { key: "estimates", label: "Estimates", icon: Receipt },
  { key: "clients", label: "Clients", icon: Users },
]
const VIEWS: { key: ProjectView; label: string; icon: React.ElementType; action: string; fullBleed: boolean }[] = [
  { key: "panel", label: "Panel", icon: Gauge, action: "Log time", fullBleed: false },
  { key: "board", label: "Board", icon: Columns3, action: "New task", fullBleed: true },
  { key: "gantt", label: "Gantt", icon: GanttChartSquare, action: "New task", fullBleed: true },
  { key: "docs", label: "Docs", icon: FolderOpen, action: "Upload", fullBleed: true },
]
const APP_ACTION: Partial<Record<AppRoute, string>> = { projects: "New project", estimates: "New estimate", clients: "New client" }
const PROJECTS = [
  { id: "p1", name: "Commerce replatform", client: "Northwind Outfitters" },
  { id: "p2", name: "Brand site refresh", client: "Halden & Co" },
  { id: "p3", name: "Ops dashboard", client: "Tessera Health" },
  { id: "p4", name: "Mobile checkout", client: "Northwind Outfitters" },
  { id: "p5", name: "Data migration", client: "Pellow Freight" },
]

export default function KanriShell({ initial = { app: "projects", project: { id: "p1", view: "panel" } } as Route }) {
  const [route, setRoute] = React.useState<Route>(initial)
  const project = route.project && PROJECTS.find((p) => p.id === route.project!.id)
  const view = route.project && VIEWS.find((v) => v.key === route.project!.view)
  const fullBleed = !!view?.fullBleed

  return (
    // Height is locked to the viewport; only the content region scrolls (or the widget does).
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar route={route} onNavigate={(app) => setRoute({ app })} />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
          <SidebarTrigger className="text-muted-foreground" />
          <Separator orientation="vertical" className="!h-4" />

          {project && view ? (
            <ProjectCapsule
              project={project}
              view={view.key}
              onView={(v) => setRoute({ app: "projects", project: { id: project.id, view: v } })}
              onSwitch={(id) => setRoute({ app: "projects", project: { id, view: view.key } })} // keep current view
            />
          ) : (
            <div className="flex items-baseline gap-2 pl-1">
              <h1 className="text-sm font-semibold capitalize">{route.app}</h1>
            </div>
          )}

          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-2 px-2 text-muted-foreground">
            <Search className="size-4" />
            <span className="hidden w-22 text-left text-xs lg:inline">Search…</span>
            <kbd className="rounded bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
          </Button>
          {project && <ProjectMenu />}
          {(view?.action ?? APP_ACTION[route.app]) && (
            <Button size="sm" className="gap-1.5 font-semibold">
              <Plus className="size-4" />{view?.action ?? APP_ACTION[route.app]}
            </Button>
          )}
        </header>

        {/* Content region: padded + scrolling for pages; bare flex box for SVAR widgets. */}
        <main className={cn("relative min-h-0 flex-1", fullBleed ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
          {fullBleed ? (
            <WidgetPlaceholder name={view!.label} />
          ) : (
            <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 py-5">
              <Greybox className="h-[250px]" label={view ? "panel content" : `${route.app} content`} />
              <Greybox className="h-[250px]" label="…" />
              <Greybox className="h-[320px]" label="…" />
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar({ route, onNavigate }: { route: Route; onNavigate: (a: AppRoute) => void }) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader>
        <div className="flex h-9 items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-foreground text-[13px] font-bold text-background">k</span>
          <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">kanri</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {APP_NAV.map(({ key, label, icon: Icon }) => {
              const exact = route.app === key && !route.project
              const ancestor = key === "projects" && !!route.project
              return (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    tooltip={label}
                    isActive={exact || ancestor}
                    onClick={() => onNavigate(key)}
                    // Exact location = lime. Ancestor of a project route = neutral accent (lime moves to the view tab).
                    className={cn(
                      "text-muted-foreground",
                      exact && "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      ancestor && "data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground",
                    )}
                  >
                    <Icon /><span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" isActive={route.app === "settings"} onClick={() => onNavigate("settings")}
              className="text-muted-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground">
              <Settings /><span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
        <div className="flex h-9 items-center gap-2.5 px-0.5 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-[26px]"><AvatarFallback className="bg-sidebar-accent text-[11px] font-semibold">MK</AvatarFallback></Avatar>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium">Mara Kuro</span>
            <span className="text-[11px] text-muted-foreground">Solo · kuro.studio</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

// Project scope: name (= switcher) + views, fused in one bordered group.
function ProjectCapsule({ project, view, onView, onSwitch }: {
  project: (typeof PROJECTS)[number]; view: ProjectView; onView: (v: ProjectView) => void; onSwitch: (id: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "p" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o) } }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex h-8 min-w-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn("flex h-[26px] min-w-0 items-center gap-1.5 rounded-md pl-2 pr-1.5 hover:bg-accent", open && "bg-accent")}>
            <span className="hidden text-xs text-muted-foreground lg:inline">{project.client.split(" ")[0]}</span>
            <span className="hidden text-xs text-muted-foreground/50 lg:inline">/</span>
            <span className="truncate text-[13px] font-semibold">{project.name}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[360px] p-0">
          <Command>
            <CommandInput placeholder="Find a project…" />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup heading="Recent">
                {PROJECTS.slice(0, 3).map((p, i) => (
                  <CommandItem key={p.id} value={`${p.name} ${p.client}`} onSelect={() => { onSwitch(p.id); setOpen(false) }} className="gap-2.5">
                    <Check className={cn("size-4", p.id !== project.id && "invisible")} />
                    <span className="font-medium">{p.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.client}</span>
                    <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">⌘{i + 1}</kbd>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Active">
                {PROJECTS.slice(3).map((p) => (
                  <CommandItem key={p.id} value={`${p.name} ${p.client}`} onSelect={() => { onSwitch(p.id); setOpen(false) }} className="gap-2.5 pl-[34px]">
                    <span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{p.client}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-0.5 !h-4" />

      {/* ≥640px: segmented tabs (labels hidden below lg). <640px: select. */}
      <nav aria-label="Project views" className="hidden items-center gap-0.5 sm:flex">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onView(key)}
                aria-current={view === key ? "page" : undefined}
                className={cn(
                  "flex h-[26px] items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground lg:px-2.5",
                  view === key && "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Icon className="size-4" /><span className="hidden lg:inline">{label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="lg:hidden">{label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>
      <Select value={view} onValueChange={(v) => onView(v as ProjectView)}>
        <SelectTrigger size="sm" className="h-[26px] border-0 bg-transparent px-2 sm:hidden"><SelectValue /></SelectTrigger>
        <SelectContent>{VIEWS.map((v) => <SelectItem key={v.key} value={v.key}>{v.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

function ProjectMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="size-8 text-muted-foreground"><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Edit project</DropdownMenuItem>
        <DropdownMenuItem>Open estimate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Greybox({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-xl border border-dashed border-foreground/15 bg-foreground/[0.03] font-mono text-[11px] text-muted-foreground", className)}>
      {label}
    </div>
  )
}

// Stand-in for SVAR Kanban / Gantt / FileManager: fills the region, owns its own toolbar + scroll.
function WidgetPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-dashed border-foreground/15 px-3 font-mono text-[10px] text-muted-foreground">
        SVAR {name} toolbar
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex h-full w-[1800px] items-center justify-center font-mono text-[11px] text-muted-foreground">
          SVAR {name} · edge-to-edge · owns both scrollbars
        </div>
      </div>
    </div>
  )
}
