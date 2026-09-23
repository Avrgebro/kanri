import { createFileRoute } from "@tanstack/react-router"
import { IconPlus } from "@tabler/icons-react"

import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/projects")({ component: Projects })

function Projects() {
  return (
    <>
      <SiteHeader
        title="Projects"
        actions={
          <Button size="sm">
            <IconPlus />
            New project
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
          <div className="max-w-sm px-6 py-16 text-center">
            <p className="text-sm font-medium">No projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Accept an estimate to generate one, or create a project directly.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
