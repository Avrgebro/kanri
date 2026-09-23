import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\n" +
      "Local dev: run `npx supabase start` (.env.development is committed).\n" +
      "Production: copy .env.example to .env.production.local and fill it in.",
  )
}

/**
 * Browser client. Every request carries the signed-in user's JWT, and RLS
 * (`owner_id = auth.uid()` on every table) is what actually protects the data.
 * The service role key must never appear in this app.
 */
export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
