import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  IconCheck,
  IconSelector,
  IconColumns3,
  IconFolderOpen,
  IconGauge,
  IconTimeline,
} from "@tabler/icons-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProjects, type ProjectRow } from "@/features/projects/queries"
import { cn } from "@/lib/utils"

export type ProjectView = "panel" | "board" | "gantt" | "docs"

export const PROJECT_VIEWS = [
  {
    key: "panel",
    label: "Panel",
    icon: IconGauge,
    to: "/projects/$projectId",
    action: "Log time",
    /** Panel is a normal scrolling page; the rest are SVAR canvas widgets. */
    fullBleed: false,
  },
  {
    key: "board",
    label: "Board",
    icon: IconColumns3,
    to: "/projects/$projectId/board",
    action: "New task",
    fullBleed: true,
  },
  {
    key: "gantt",
    label: "Gantt",
    icon: IconTimeline,
    to: "/projects/$projectId/gantt",
    action: "New task",
    fullBleed: true,
  },
  {
    key: "docs",
    label: "Docs",
    icon: IconFolderOpen,
    to: "/projects/$projectId/docs",
    action: "Upload",
    fullBleed: true,
  },
] as const

/**
 * Project scope in one bordered group: the name doubles as the switcher, and
 * the four views sit beside it. Keeping them fused makes it unambiguous that
 * the views belong to the named project — the sidebar stays app-level.
 */
export function ProjectCapsule({
  project,
  view,
}: {
  project: ProjectRow
  view: ProjectView
}) {
  const navigate = useNavigate()
  const { data: projects } = useProjects()
  const [open, setOpen] = useState(false)

  // ⌘P opens the switcher — ⌘K is reserved for a future global search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const goToView = (v: (typeof PROJECT_VIEWS)[number]) =>
    navigate({ to: v.to, params: { projectId: project.id } })

  return (
    <div className="flex h-8 min-w-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex h-[26px] min-w-0 items-center gap-1.5 rounded-md pr-1.5 pl-2 hover:bg-accent",
              open && "bg-accent",
            )}
          >
            {project.clients && (
              <>
                <span className="hidden text-xs text-muted-foreground lg:inline">
                  {project.clients.name}
                </span>
                <span className="hidden text-xs text-muted-foreground/50 lg:inline">
                  /
                </span>
              </>
            )}
            <span className="truncate text-[13px] font-semibold">{project.name}</span>
            <IconSelector className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={6} className="w-[360px] p-0">
          <Command>
            <CommandInput placeholder="Find a project…" />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup heading="Projects">
                {projects?.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.clients?.name ?? ""}`}
                    onSelect={() => {
                      // Keep the current view when switching projects.
                      const target = PROJECT_VIEWS.find((v) => v.key === view)!
                      navigate({ to: target.to, params: { projectId: p.id } })
                      setOpen(false)
                    }}
                    className="gap-2.5"
                  >
                    <IconCheck
                      className={cn("size-4", p.id !== project.id && "invisible")}
                    />
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.clients?.name ?? "No client"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-0.5 !h-4" />

      {/* ≥sm: segmented tabs, labels appear at lg. <sm: a select. */}
      <nav aria-label="Project views" className="hidden items-center gap-0.5 sm:flex">
        {PROJECT_VIEWS.map((v) => (
          <Tooltip key={v.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => goToView(v)}
                aria-current={view === v.key ? "page" : undefined}
                className={cn(
                  "flex h-[26px] items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground lg:px-2.5",
                  view === v.key &&
                    "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <v.icon className="size-4" />
                <span className="hidden lg:inline">{v.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="lg:hidden">{v.label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>

      <Select
        value={view}
        onValueChange={(v) =>
          goToView(PROJECT_VIEWS.find((x) => x.key === v) ?? PROJECT_VIEWS[0])
        }
      >
        <SelectTrigger
          size="sm"
          className="h-[26px] border-0 bg-transparent px-2 sm:hidden"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_VIEWS.map((v) => (
            <SelectItem key={v.key} value={v.key}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
