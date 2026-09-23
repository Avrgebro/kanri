import {
  IconColumns3,
  IconFolderOpen,
  IconGauge,
  IconTimeline,
  type Icon,
} from "@tabler/icons-react"

/**
 * Keyed by view so every lookup is total — no `find`, no fallback, no `!`.
 * `ProjectView` is derived from this table, so the two cannot drift.
 */
export const PROJECT_VIEWS = {
  panel: {
    label: "Panel",
    icon: IconGauge,
    to: "/projects/$projectId",
    action: null,
  },
  board: {
    label: "Board",
    icon: IconColumns3,
    to: "/projects/$projectId/board",
    action: "New task",
  },
  gantt: {
    label: "Gantt",
    icon: IconTimeline,
    to: "/projects/$projectId/gantt",
    action: "New task",
  },
  docs: {
    label: "Docs",
    icon: IconFolderOpen,
    to: "/projects/$projectId/docs",
    action: "Upload",
  },
} as const satisfies Record<
  string,
  { label: string; icon: Icon; to: string; action: string | null }
>

export type ProjectView = keyof typeof PROJECT_VIEWS

/** Declaration order is the display order. */
export const PROJECT_VIEW_KEYS = Object.keys(PROJECT_VIEWS) as ProjectView[]
