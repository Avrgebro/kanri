import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { taskKeys } from "@/features/tasks/queries"
import { supabase } from "@/lib/supabase"
import type { DependencyType, Task, TaskDependency } from "@/types/domain"

export const ganttKeys = {
  dependencies: (projectId: string) => ["projects", projectId, "dependencies"] as const,
}

/** Dependencies for a project, scoped through the tasks they connect. */
export function useProjectDependencies(projectId: string) {
  return useQuery({
    queryKey: ganttKeys.dependencies(projectId),
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
 * These mutations patch the cache instead of invalidating it. The Gantt holds
 * its own state while mounted — refetching would hand it new props and reset
 * its scroll and zoom after every drag. Patching the shared task cache keeps the
 * Board and panel in step without disturbing the chart.
 */

export function useUpdateTaskDates(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...dates
    }: {
      id: string
      start_date: string
      due_date: string
    }) => {
      const { error } = await supabase.from("tasks").update(dates).eq("id", id)
      if (error) throw error
      return { id, ...dates }
    },
    onSuccess: ({ id, ...dates }) =>
      qc.setQueryData<Task[]>(taskKeys.tasks(projectId), (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, ...dates } : t)),
      ),
  })
}

export function useAddDependency(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dep: {
      id: string
      task_id: string
      depends_on: string
      type: DependencyType
    }) => {
      // The id is generated client-side so the Gantt and the database agree on
      // it from the start — no temporary id to reconcile afterwards.
      const { data, error } = await supabase
        .from("task_dependencies")
        .insert(dep)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (dep) =>
      qc.setQueryData<TaskDependency[]>(ganttKeys.dependencies(projectId), (deps) => [
        ...(deps ?? []),
        dep,
      ]),
  })
}

export function useDeleteDependency(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_dependencies").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onSuccess: (id) =>
      qc.setQueryData<TaskDependency[]>(ganttKeys.dependencies(projectId), (deps) =>
        deps?.filter((d) => d.id !== id),
      ),
  })
}
