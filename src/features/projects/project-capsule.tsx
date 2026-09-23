import { useNavigate } from "@tanstack/react-router"

import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ProjectSwitcher } from "@/features/projects/project-switcher"
import {
  PROJECT_VIEWS,
  PROJECT_VIEW_KEYS,
  type ProjectView,
} from "@/features/projects/project-views"
import type { ProjectRow } from "@/features/projects/queries"
import { cn } from "@/lib/utils"

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

  const goTo = (key: ProjectView) =>
    navigate({ to: PROJECT_VIEWS[key].to, params: { projectId: project.id } })

  return (
    <div className="flex h-8 min-w-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
      <ProjectSwitcher project={project} view={view} />

      <Separator orientation="vertical" className="mx-0.5 !h-4" />

      {/* ≥sm: segmented tabs, labels appear at lg. <sm: a select. */}
      <nav aria-label="Project views" className="hidden items-center gap-0.5 sm:flex">
        {PROJECT_VIEW_KEYS.map((key) => {
          const { label, icon: Icon } = PROJECT_VIEWS[key]
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => goTo(key)}
                  aria-current={view === key ? "page" : undefined}
                  className={cn(
                    "flex h-[26px] items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground lg:px-2.5",
                    view === key &&
                      "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="lg:hidden">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <Select value={view} onValueChange={(v) => goTo(v as ProjectView)}>
        <SelectTrigger
          size="sm"
          className="h-[26px] border-0 bg-transparent px-2 sm:hidden"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_VIEW_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {PROJECT_VIEWS[key].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
