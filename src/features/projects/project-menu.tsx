import { useState } from "react"
import { IconDots } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProjectFormDialog } from "@/features/projects/project-form-dialog"
import { useUpdateProject, type ProjectRow } from "@/features/projects/queries"
import { toast } from "sonner"

export function ProjectMenu({ project }: { project: ProjectRow }) {
  const [editing, setEditing] = useState(false)
  const update = useUpdateProject()

  async function archive() {
    try {
      await update.mutateAsync({ id: project.id, status: "archived" })
      toast.success("Project archived")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-8 text-muted-foreground">
            <IconDots />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            Edit project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={archive}
            disabled={project.status === "archived"}
          >
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectFormDialog project={project} open={editing} onOpenChange={setEditing} />
    </>
  )
}
