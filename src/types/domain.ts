export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type LineKind = 'section' | 'item'
export type LineUnit = 'hours' | 'days' | 'fixed'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'review' | 'done'
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'
export type EpicStatus = 'planned' | 'active' | 'done'

export interface Client {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  notes: string | null
  archived: boolean
}

export interface Project {
  id: string
  client_id: string | null
  name: string
  code: string | null
  description: string | null
  status: ProjectStatus
  start_date: string | null
  target_date: string | null
  metadata: Record<string, unknown>
}

/** What the PDF renderer needs. Snapshotted onto the estimate when sent. */
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

export interface Estimate {
  id: string
  client_id: string
  project_id: string | null
  number: string
  title: string | null
  status: EstimateStatus
  issue_date: string
  valid_until: string | null
  currency: string
  tax_rate: number
  discount_cents: number
  notes: string | null
  terms: string | null
  subtotal_cents: number | null
  tax_cents: number | null
  total_cents: number | null
  total_hours: number | null
  doc_config: DocConfig | null
  sent_at: string | null
  accepted_at: string | null
}

export interface EstimateLine {
  id: string
  estimate_id: string
  kind: LineKind
  position: number
  description: string
  detail: string | null
  qty: number
  unit: LineUnit
  unit_price_cents: number
  hours: number | null
  taxable: boolean
}

export interface Epic {
  id: string
  project_id: string
  name: string
  description: string | null
  color: string
  status: EpicStatus
  position: number
  source_line_id: string | null
}

export interface Task {
  id: string
  project_id: string
  epic_id: string | null
  parent_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  position: number
  start_date: string | null
  due_date: string | null
  estimate_hours: number | null
  actual_hours: number
  tags: string[]
  source_line_id: string | null
  completed_at: string | null
}

export interface TaskDependency {
  id: string
  task_id: string
  depends_on: string
  type: string
}
