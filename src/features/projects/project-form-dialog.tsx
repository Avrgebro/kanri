import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useClients } from "@/features/clients/queries"
import {
  useCreateProject,
  useUpdateProject,
  type ProjectRow,
} from "@/features/projects/queries"
import { PROJECT_STATUSES } from "@/features/projects/project-status"
import type { ProjectStatus } from "@/types/domain"

/** Select has no null value, so "no client" needs a sentinel. */
const NO_CLIENT = "__none__"

export function ProjectFormDialog({
  project,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  project?: ProjectRow
  /** Omit when driving the dialog with `open` — e.g. opening from a menu item. */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setUncontrolledOpen
  const [name, setName] = useState("")
  const [clientId, setClientId] = useState(NO_CLIENT)
  const [status, setStatus] = useState<ProjectStatus>("active")
  const [description, setDescription] = useState("")

  const clients = useClients()
  const create = useCreateProject()
  const update = useUpdateProject()
  const busy = create.isPending || update.isPending

  // Reset from the project each time it opens, so a cancelled edit is discarded.
  useEffect(() => {
    if (!open) return
    setName(project?.name ?? "")
    setClientId(project?.client_id ?? NO_CLIENT)
    setStatus(project?.status ?? "active")
    setDescription(project?.description ?? "")
  }, [open, project])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const input = {
      name: name.trim(),
      client_id: clientId === NO_CLIENT ? null : clientId,
      status,
      description: description.trim() || null,
    }

    try {
      if (project) {
        await update.mutateAsync({ id: project.id, ...input })
        toast.success("Project updated")
      } else {
        await create.mutateAsync(input)
        toast.success("Project created")
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>
              Only a name is required. Everything else can be filled in later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme website rebuild"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client">Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="client">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT}>No client</SelectItem>
                    {clients.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this project covers."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
