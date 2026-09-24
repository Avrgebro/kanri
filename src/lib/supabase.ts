import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

const url = import.meta.env.SUPABASE_URL
const key = import.meta.env.SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    "Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY.\n" +
      "Local dev: run `npx supabase start` (.env.development is committed).\n" +
      "Production: copy .env.example to .env.production.local and fill it in.",
  )
}

/**
 * Browser client, keyed with the publishable key: it only identifies the
 * project. Every request carries the signed-in user's JWT, and RLS
 * (`owner_id = auth.uid()` on every table) is what actually protects the data.
 * The secret key bypasses RLS and must never appear in this app.
 */
export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
