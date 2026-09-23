import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database"

/** A project plus the client name, which every project screen wants. */
export type ProjectRow = Tables<"projects"> & {
  clients: Pick<Tables<"clients">, "id" | "name"> | null
}

/** owner_id is set by the database default (auth.uid()) — never sent. */
export type ProjectInput = Omit<
  TablesInsert<"projects">,
  "id" | "owner_id" | "created_at" | "updated_at"
>

const SELECT = "*, clients(id, name)"

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(SELECT)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(SELECT)
        .eq("id", id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(input)
        .select(SELECT)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: TablesUpdate<"projects"> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(input)
        .eq("id", id)
        .select(SELECT)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: projectKeys.all })
      qc.invalidateQueries({ queryKey: projectKeys.detail(row.id) })
    },
  })
}
