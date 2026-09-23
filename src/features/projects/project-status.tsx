import { Badge } from "@/components/ui/badge"
import type { ProjectStatus } from "@/types/domain"

/** Exhaustive by type: adding a ProjectStatus without a label is a compile error. */
const LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
}

export const PROJECT_STATUSES = Object.entries(LABELS).map(([value, label]) => ({
  value: value as ProjectStatus,
  label,
}))

/** Only `active` gets the lime; the rest stay quiet so the list scans well. */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant={status === "active" ? "default" : "secondary"}
      className={status === "archived" ? "opacity-60" : undefined}
    >
      {LABELS[status]}
    </Badge>
  )
}
