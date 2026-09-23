import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type { Project, ProjectStatus } from "@/types/domain"

/** A project plus the client name, which the list always wants. */
export interface ProjectRow extends Project {
  clients: { id: string; name: string } | null
}

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name)")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as ProjectRow[]
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    // The sidebar calls this on every route; only run it inside a project.
    enabled: Boolean(id),
    queryFn: async (): Promise<ProjectRow> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name)")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as ProjectRow
    },
  })
}

export interface ProjectInput {
  name: string
  client_id: string | null
  status: ProjectStatus
  description: string | null
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProjectInput): Promise<ProjectRow> => {
      // owner_id defaults to auth.uid() in the database — never sent from here.
      const { data, error } = await supabase
        .from("projects")
        .insert(input)
        .select("*, clients(id, name)")
        .single()
      if (error) throw error
      return data as ProjectRow
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ProjectInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(input)
        .eq("id", id)
        .select("*, clients(id, name)")
        .single()
      if (error) throw error
      return data as ProjectRow
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: projectKeys.all })
      qc.invalidateQueries({ queryKey: projectKeys.detail(row.id) })
    },
  })
}
