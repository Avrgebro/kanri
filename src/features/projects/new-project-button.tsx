import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { ProjectFormDialog } from "@/features/projects/project-form-dialog"

/** Owns the dialog's open state so the dialog itself stays controlled-only. */
export function NewProjectButton({
  variant,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        className="gap-1.5 font-semibold"
        onClick={() => setOpen(true)}
      >
        <IconPlus className="size-4" />
        New project
      </Button>
      <ProjectFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
