# kanri

Single-user project management + client estimating.

## Stack

- **Vite + React 19 + TypeScript** — SPA, no server. Nothing here needs SSR.
- **TanStack Router** (file-based, typed) + **TanStack Query** (cache, optimistic DnD)
- **Supabase** — Postgres + Storage + Auth, accessed from the browser under RLS
- **SVAR** — Gantt and File Manager only
- **dnd-kit** — the board. SVAR's Kanban has no swimlanes in any edition, so the
  board is built on shadcn + dnd-kit to get epic swimlanes and a native look
- **shadcn/ui + Tailwind v4** — everything else: forms, dialogs, tables, nav
  (theme: "Light Green" from tweakcn — lime primary, slate neutrals, Inter)
- **@react-pdf/renderer** — estimate PDFs, generated client-side

## Layout

```
src/
  components/
    ui/           shadcn primitives ONLY — vendor-owned, regenerable, never hand-edited
    layout/       app shell: app-sidebar, nav-*, site-header, theme-toggle
  features/       one folder per domain area, self-contained
    estimates/    totals.ts + pdf/EstimateDocument.tsx
    tasks/        tasks, epics, dependencies and every task write (queries.ts),
                  task-model.ts (waiting-on, cycles, positions), the task sheet
    board/        custom kanban: board-model.ts (cells, drops), task-board, task-card
    gantt/        SVAR Gantt: adapter (dates, link types), project-gantt
    docs/         SVAR File Manager as a pure view: adapter (rows <-> paths), queries
                  (every write, storage objects), project-docs
  routes/         TanStack file-based routes; each renders its own <SiteHeader />
                  and <PageBody> (`flush` for the board and Gantt, which scroll
                  themselves)
  hooks/          shared hooks
  lib/            supabase client, money, fractional ranking, cn
  types/          hand-written domain types
supabase/
  migrations/     schema as ordered migrations (Supabase CLI)
  seed.sql
```

The rules:

- **`components/ui` is the only place primitives live**, and nothing in it is
  edited by hand — `npx shadcn@latest add <name>` must stay safe to re-run.
  (One documented exception: `ui/sonner.tsx` imports `@/hooks/use-theme`
  instead of `next-themes`, which this app does not use.)
- Anything composed from primitives goes in `components/layout` (app chrome)
  or `features/<area>` (domain).
- **A feature may import another feature's `queries.ts` — that file is its
  public data API — and never its components.** A project form needs a client
  picker, so `features/projects` importing `useClients` is correct; importing
  a client *component* is not. A component that genuinely needs sharing moves
  to `components/layout`.

## Model

```
Client ─┬─ Estimate ── EstimateLine   (kind: 'section' | 'item')
        └─ Project  ─┬─ Epic ── Task ── Task (subtask, one level)
                     ├─ TaskDependency
                     ├─ TimeEntry
                     └─ DocFolder / DocFile  → Supabase Storage
```

Accepting an estimate sets `estimates.project_id` and converts each **section →
epic** and each **item → task**, carrying `hours` into `tasks.estimate_hours`.
`source_line_id` keeps the trail back to the sold line.

## Decisions worth not re-litigating

- **Money is integer cents.** Never floats.
- **Estimates freeze on send.** `subtotal/tax/total_cents` and `doc_config` are
  snapshotted, *and a trigger rejects any edit to `estimate_lines` once the
  estimate leaves `draft`* — otherwise the PDF would re-render from live lines
  beside a frozen total. Revising a sent estimate means cloning it to a new
  draft with a new number, which is what a revised estimate actually is.
- **Acceptance is one SQL call.** `accept_estimate(estimate_id)` marks the
  estimate accepted, creates the project, and seeds epics from sections and
  tasks from items in a single transaction. The browser has no transaction, so
  a client-side sequence could half-seed a project and duplicate on retry.
  Partial unique indexes on `source_line_id` make a double-accept fail loudly.
- **Hours logged are computed, never stored.** `time_entries` is the source of
  truth; there is no `tasks.actual_hours` to drift.
- **Hiding hours is presentation only.** `doc_config.show_line_hours` controls the
  PDF; `estimate_lines.hours` is always stored, because accepted lines seed tasks.
- **Hierarchy vs. flat sets.** Epic → Task → Subtask is the only nesting,
  enforced by a trigger, not by convention. Anything that cuts across epics (a
  dated release, say) gets its own flat table plus a nullable FK — never a new
  tree level.
- **Invariants live in the database where they can.** Subtask depth, link
  types and owner scoping are constraints and triggers, not prose. A rule the
  schema can express should not be left to discipline.
- **Tasks may have no epic.** An "unassigned" swimlane beats inventing an epic.
- **SVAR shapes stop at the adapter.** `src/features/*/adapter.ts` maps domain
  rows into SVAR's format. Nothing outside those files knows SVAR exists — the
  database stores `finish_to_start`, the adapter translates it to SVAR's
  `e2s`.
- **Editing is ours.** SVAR's built-in editors stay off; clicking a card or bar
  opens a shadcn sheet, so there's one task editor and one visual language.
- **RLS on every table.** `owner_id = auth.uid()`, forced. A new table without a
  policy is a public table — see the `do $$` block at the bottom of the initial migration.

## Tests

```bash
npm test          # vitest
npm run test:tz   # the same suite under three timezones — date code must not
                  # depend on where it runs
```

Tests cover pure logic and vendor contracts, not rendering: board ordering and
rebalancing, task rules (waiting-on, cycles, positions), and the Gantt and
docs adapters. Every Gantt and docs fixture is also fed through SVAR's own
store, because an adapter that type-checks is not proof SVAR accepts its
output — that gap once shipped a crash.

## Setup

```bash
cp .env.example .env         # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

### Database

Two environments, managed with the Supabase CLI. Nothing is changed by hand in
a dashboard — local and prod must stay reproducible from `supabase/migrations/`.

| | where | credentials |
|---|---|---|
| **dev** | local Docker stack (`npx supabase start`) | `.env.development`, committed (fixed demo keys) |
| **prod** | Supabase project `bafwkzrqdziezdxfuujq` (us-west-2) | `.env.production.local`, gitignored |

```bash
npx supabase start                      # db, auth, storage, studio on :54321-54324
npx supabase db reset                   # rebuild local from migrations + seed
npx supabase stop                       # when done for the day

npx supabase migration new <name>       # then edit the generated file
npx supabase db diff -f <name>          # capture dashboard changes as a migration
```

Workflow for a schema change: write the migration, `db reset` to prove it applies
from scratch, then `db push` to prod. Never push something that has not been
reset locally first.

```bash
npx supabase db push                                                  # apply to prod
npx supabase migration list                                           # local vs remote
npx supabase gen types typescript --linked > src/types/database.ts    # generated rows
```

`src/types/domain.ts` is hand-written and intentionally separate from generated
row types: it is the app's vocabulary, not a mirror of the tables.

### Auth

Single user, email + password. `AuthGate` in `main.tsx` shows the sign-in form
when there is no session; there are no route guards, because RLS
(`owner_id = auth.uid()`, forced on all 12 tables) is the real boundary.

Create the local user once after `db reset` — Studio at http://127.0.0.1:54323
→ Authentication → Add user (tick "Auto Confirm"). The signup trigger creates
that user's `settings` row automatically. Do the same once in the prod
dashboard.
