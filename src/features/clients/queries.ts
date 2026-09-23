import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"

export const clientKeys = { all: ["clients"] as const }

export function useClients() {
  return useQuery({
    queryKey: clientKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("archived", false)
        .order("name")
      if (error) throw error
      return data
    },
  })
}
