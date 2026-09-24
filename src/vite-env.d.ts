/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Exposed by `envPrefix` in vite.config.ts; named as Vercel's Supabase
  // integration injects them.
  readonly SUPABASE_URL: string
  /** sb_publishable_… — safe in the bundle. The secret key never is. */
  readonly SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
