import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type { Client } from "@/types/domain"

export const clientKeys = { all: ["clients"] as const }

export function useClients() {
  return useQuery({
    queryKey: clientKeys.all,
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("archived", false)
        .order("name")
      if (error) throw error
      return data as Client[]
    },
  })
}
