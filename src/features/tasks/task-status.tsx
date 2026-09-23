import {
  IconBan,
  IconCircle,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCircleDot,
  IconCircleHalf2,
  type Icon,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/types/domain"

/** Each status's icon and colour. Blocked is red: it is set by hand, on purpose. */
const STATUS_ICON: Record<TaskStatus, { icon: Icon; className: string }> = {
  backlog: { icon: IconCircleDashed, className: "text-muted-foreground" },
  todo: { icon: IconCircle, className: "text-muted-foreground" },
  in_progress: { icon: IconCircleHalf2, className: "text-chart-2" },
  blocked: { icon: IconBan, className: "text-destructive" },
  review: { icon: IconCircleDot, className: "text-chart-4" },
  done: { icon: IconCircleCheckFilled, className: "text-chart-3" },
}

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const { icon: Glyph, className: tone } = STATUS_ICON[status]
  return <Glyph aria-hidden className={cn("size-4 shrink-0", tone, className)} />
}
