import type { Enums, Tables } from "@/types/database"

/**
 * The app's vocabulary, derived from the generated schema.
 *
 * Rule: anything that mirrors a table or enum is aliased from `database.ts`,
 * so a migration + `supabase gen types` is the single source of truth and a
 * changed column becomes a compile error. Only shapes the database cannot
 * express — typed views over `jsonb` — are hand-written here.
 */

// ---------------------------------------------------------------- enums

export type EstimateStatus = Enums<"estimate_status">
export type LineKind = Enums<"line_kind">
export type LineUnit = Enums<"line_unit">
export type TaskStatus = Enums<"task_status">
export type ProjectStatus = Enums<"project_status">
export type EpicStatus = Enums<"epic_status">

// ---------------------------------------------------------------- rows

export type Client = Tables<"clients">
export type EstimateLine = Tables<"estimate_lines">
export type Epic = Tables<"epics">
export type Task = Tables<"tasks">
export type TaskDependency = Tables<"task_dependencies">

/**
 * What the PDF renderer needs. `estimates.doc_config` is `jsonb`, so the
 * generated type is `Json` — this is the shape we actually write into it,
 * snapshotted from settings when an estimate is sent.
 */
export interface DocConfig {
  logo_url?: string
  accent_color: string
  font: string
  company: {
    name: string
    address?: string
    email?: string
    phone?: string
    tax_id?: string
  }
  /** Hiding hours is presentation only — hours stay on the line for planning. */
  show_line_hours: boolean
  show_unit_price: boolean
  terms_text?: string
  footer_text?: string
  payment_terms?: string
  tax_label: string
  date_format: string
}

export type Estimate = Omit<Tables<"estimates">, "doc_config"> & {
  doc_config: DocConfig | null
}
