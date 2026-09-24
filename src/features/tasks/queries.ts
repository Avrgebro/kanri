import {
  useIsMutating,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type { DependencyType, Task, TaskDependency, TaskStatus } from "@/types/domain"

/**
 * A project's tasks, epics and dependencies. Owned here rather than by any one
 * view: the board, the Gantt, the task sheet and the panel all read the same
 * data, and a write from one must reach the others through the same cache entry.
 */
export const taskKeys = {
  tasks: (projectId: string) => ["projects", projectId, "tasks"] as const,
  epics: (projectId: string) => ["projects", projectId, "epics"] as const,
  dependencies: (projectId: string) => ["projects", projectId, "dependencies"] as const,
  /** Every write below carries this key, so the save state can be read off it. */
  writes: (projectId: string) => ["projects", projectId, "task-writes"] as const,
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: taskKeys.tasks(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("position")
      if (error) throw error
      return data
    },
  })
}

export function useProjectEpics(projectId: string) {
  return useQuery({
    queryKey: taskKeys.epics(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epics")
        .select("*")
        .eq("project_id", projectId)
        .order("position")
      if (error) throw error
      return data
    },
  })
}

/** Dependencies for a project, scoped through the tasks they connect. */
export function useProjectDependencies(projectId: string) {
  return useQuery({
    queryKey: taskKeys.dependencies(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("*, tasks!task_dependencies_task_id_fkey!inner(project_id)")
        .eq("tasks.project_id", projectId)
      if (error) throw error
      return data.map(({ tasks: _scope, ...dep }) => dep)
    },
  })
}

/*
 * Writes patch the cache rather than invalidating it. The Gantt holds its own
 * state while mounted, and a refetch after every edit would be wasted work for
 * every other view: the patch is exactly what the server stored.
 */

// ---------------------------------------------------------------- move

export interface PositionWrite {
  id: string
  position: number
}

export interface MoveTaskInput {
  taskId: string
  status: TaskStatus
  epic_id: string | null
  /** Positions to write: the moved task's, or its whole cell when renumbered. */
  writes: PositionWrite[]
}

const applyMove = ({ taskId, status, epic_id, writes }: MoveTaskInput) => {
  const positions = new Map(writes.map((w) => [w.id, w.position]))
  return (tasks: Task[] = []) =>
    tasks.map((t) => {
      const position = positions.get(t.id) ?? t.position
      return t.id === taskId ? { ...t, status, epic_id, position } : { ...t, position }
    })
}

/**
 * Change a task's status, epic or order. Every such change goes through the
 * atomic `move_task` call, which also keeps `completed_at` in step with status.
 *
 * The cache is patched synchronously, in the same tick as the call, so a board
 * drop never renders the card back in its old cell while the write is in
 * flight. On failure the cache is restored from the snapshot taken before.
 */
export function useMoveTask(projectId: string) {
  const qc = useQueryClient()
  const key = taskKeys.tasks(projectId)

  const mutation = useMutation({
    mutationKey: taskKeys.writes(projectId),
    mutationFn: async ({ taskId, status, epic_id, writes }: MoveTaskInput) => {
      const { error } = await supabase.rpc("move_task", {
        p_task: taskId,
        p_status: status,
        p_ids: writes.map((w) => w.id),
        p_positions: writes.map((w) => w.position),
        // Omitted means null: no epic.
        p_epic: epic_id ?? undefined,
      })
      if (error) throw error
    },
    // Refetch so server-set fields such as `completed_at` land in the cache.
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  return (input: MoveTaskInput, onError: (err: unknown) => void) => {
    // Cancel before patching: cancelling reverts an in-flight refetch, which
    // would otherwise land on top of the patch with pre-move data.
    void qc.cancelQueries({ queryKey: key })
    const previous = qc.getQueryData<Task[]>(key)
    qc.setQueryData<Task[]>(key, applyMove(input))

    mutation.mutate(input, {
      onError: (err) => {
        qc.setQueryData(key, previous)
        onError(err)
      },
    })
  }
}

// ---------------------------------------------------------------- fields

/** Plain fields. Status and epic are not here: they move the task (above). */
export type TaskFields = Partial<
  Pick<Task, "title" | "description" | "start_date" | "due_date" | "estimate_hours" | "tags">
>

/**
 * Optimistic, so inputs bound straight to the cache (dates) don't snap back
 * while the write is in flight; a rejected write restores the snapshot.
 */
export function useUpdateTask(projectId: string) {
  const qc = useQueryClient()
  const key = taskKeys.tasks(projectId)
  return useMutation({
    mutationKey: taskKeys.writes(projectId),
    mutationFn: async ({ id, ...fields }: TaskFields & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(fields)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async ({ id, ...fields }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Task[]>(key)
      qc.setQueryData<Task[]>(key, (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, ...fields } : t)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => qc.setQueryData(key, context?.previous),
    onSuccess: (task) =>
      qc.setQueryData<Task[]>(key, (tasks) => tasks?.map((t) => (t.id === task.id ? task : t))),
  })
}

/**
 * A new task: a card in a board cell (status and epic), or a subtask (parent;
 * the schema gives it the parent's epic). Everything else is filled in later.
 */
export interface NewTask {
  title: string
  status: TaskStatus
  position: number
  epic_id?: string | null
  parent_id?: string
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: taskKeys.writes(projectId),
    mutationFn: async (task: NewTask) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ project_id: projectId, ...task })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (task) =>
      qc.setQueryData<Task[]>(taskKeys.tasks(projectId), (tasks) => [...(tasks ?? []), task]),
  })
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: taskKeys.writes(projectId),
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      // Subtasks and dependencies go with it (on delete cascade).
      qc.setQueryData<Task[]>(taskKeys.tasks(projectId), (tasks) =>
        tasks?.filter((t) => t.id !== id && t.parent_id !== id),
      )
      void qc.invalidateQueries({ queryKey: taskKeys.dependencies(projectId) })
    },
  })
}

// ---------------------------------------------------------------- dependencies

export function useAddDependency(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: taskKeys.writes(projectId),
    mutationFn: async (dep: {
      id?: string
      task_id: string
      depends_on: string
      type: DependencyType
    }) => {
      // The Gantt passes its own id so chart and database agree from the
      // start, with no temporary id to reconcile; the sheet lets it default.
      const { data, error } = await supabase
        .from("task_dependencies")
        .insert(dep)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (dep) =>
      qc.setQueryData<TaskDependency[]>(taskKeys.dependencies(projectId), (deps) => [
        ...(deps ?? []),
        dep,
      ]),
  })
}

export function useDeleteDependency(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: taskKeys.writes(projectId),
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_dependencies").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onSuccess: (id) =>
      qc.setQueryData<TaskDependency[]>(taskKeys.dependencies(projectId), (deps) =>
        deps?.filter((d) => d.id !== id),
      ),
  })
}

// ---------------------------------------------------------------- save state

export type SaveState = "saving" | "failed" | "saved"

/**
 * What the task sheet shows in place of a Save button, read off the writes
 * above: saving while any is in flight, failed if the latest one failed.
 */
export function useSaveState(projectId: string): SaveState {
  const mutationKey = taskKeys.writes(projectId)
  const pending = useIsMutating({ mutationKey })
  const statuses = useMutationState({ filters: { mutationKey }, select: (m) => m.state.status })
  if (pending) return "saving"
  return statuses.at(-1) === "error" ? "failed" : "saved"
}
