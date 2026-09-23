import { Badge } from "@/components/ui/badge"
import type { ProjectStatus } from "@/types/domain"

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
]

const label = (s: ProjectStatus) =>
  PROJECT_STATUSES.find((x) => x.value === s)?.label ?? s

/** Only `active` gets the lime; the rest stay quiet so the list scans well. */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant={status === "active" ? "default" : "secondary"}
      className={status === "archived" ? "opacity-60" : undefined}
    >
      {label(status)}
    </Badge>
  )
}
