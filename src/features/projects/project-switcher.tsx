import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { IconCheck, IconSelector } from "@tabler/icons-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PROJECT_VIEWS, type ProjectView } from "@/features/projects/project-views"
import { useProjects, type ProjectRow } from "@/features/projects/queries"
import { cn } from "@/lib/utils"

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement)

/** The project name, which opens a searchable list of the others. */
export function ProjectSwitcher({
  project,
  view,
}: {
  project: ProjectRow
  view: ProjectView
}) {
  const navigate = useNavigate()
  const { data: projects } = useProjects()
  const [open, setOpen] = useState(false)

  // ⌘P opens the switcher. Skipped while typing, so it does not swallow the
  // keystroke inside the project form or the switcher's own search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "p" || !(e.metaKey || e.ctrlKey)) return
      if (isEditable(e.target)) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
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
                    navigate({
                      to: PROJECT_VIEWS[view].to,
                      params: { projectId: p.id },
                    })
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
  )
}
