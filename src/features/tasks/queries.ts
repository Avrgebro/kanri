import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"

/**
 * A project's tasks and epics. Owned here rather than by any one view: the
 * board, the Gantt and the panel all read the same data, and a write from one
 * must reach the others through the same cache entry.
 */
export const taskKeys = {
  tasks: (projectId: string) => ["projects", projectId, "tasks"] as const,
  epics: (projectId: string) => ["projects", projectId, "epics"] as const,
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
