-- kanri schema
-- Single-user. Every table carries owner_id and is protected by RLS.
-- Money is stored in integer cents. Hours are numeric(8,2).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type estimate_status as enum ('draft','sent','accepted','rejected','expired');
create type line_kind       as enum ('section','item');
create type line_unit       as enum ('hours','days','fixed');
create type task_status     as enum ('backlog','todo','in_progress','blocked','review','done');
create type project_status   as enum ('active','on_hold','completed','archived');
create type epic_status     as enum ('planned','active','done');

-- ---------------------------------------------------------------- settings

-- Single row. Holds company identity + the default estimate document config.
create table settings (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade unique,
  company     jsonb not null default '{}'::jsonb,   -- name, address, tax id, email, phone
  branding    jsonb not null default '{}'::jsonb,   -- logo_url, accent_color, font
  estimate_defaults jsonb not null default '{}'::jsonb,
    -- { columns: [...], show_line_hours: bool, terms_text, footer_text,
    --   payment_terms, tax_label, tax_rate, currency, date_format, valid_days }
  next_estimate_seq int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- clients

create table clients (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  contact_name text,
  email      text,
  phone      text,
  address    text,
  tax_id     text,
  notes      text,
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on clients (owner_id, name);

-- ---------------------------------------------------------------- projects

create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  name        text not null,
  code        text,                     -- short slug shown in the UI
  description text,
  status      project_status not null default 'active',
  start_date  date,
  target_date date,
  metadata    jsonb not null default '{}'::jsonb,   -- user-defined fields
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on projects (owner_id, status);

-- ---------------------------------------------------------------- estimates

create table estimates (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  client_id    uuid not null references clients(id) on delete restrict,
  project_id   uuid references projects(id) on delete set null,  -- set on acceptance
  number       text not null,                                    -- EST-2026-014
  title        text,
  status       estimate_status not null default 'draft',
  issue_date   date not null default current_date,
  valid_until  date,
  currency     text not null default 'USD',
  tax_rate     numeric(6,3) not null default 0,     -- percent, e.g. 8.250
  discount_cents int not null default 0,
  notes        text,
  terms        text,

  -- Frozen at send time. Never recomputed. See doc_config below.
  subtotal_cents int,
  tax_cents      int,
  total_cents    int,
  total_hours    numeric(10,2),

  -- Snapshot of settings.branding + estimate_defaults as of send time, so a
  -- previously sent estimate always re-renders exactly as the client saw it.
  doc_config   jsonb,
  sent_at      timestamptz,
  accepted_at  timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (owner_id, number)
);
create index on estimates (owner_id, status, issue_date desc);
create index on estimates (client_id);

create table estimate_lines (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  estimate_id uuid not null references estimates(id) on delete cascade,
  kind        line_kind not null default 'item',
  -- 'section' rows are headers: description only, prices ignored, used to group
  -- the lines that follow. On acceptance each section becomes an epic.
  position    numeric not null,          -- fractional ranking, cheap reorder
  description text not null,
  detail      text,
  qty         numeric(10,2) not null default 1,
  unit        line_unit not null default 'hours',
  unit_price_cents int not null default 0,
  -- Hours kept even when the PDF hides them, so accepted lines can seed tasks.
  hours       numeric(8,2),
  taxable     boolean not null default true
);
create index on estimate_lines (estimate_id, position);

-- Reusable blocks of line items ("Discovery 16h, Setup 8h, QA 20h").
create table line_presets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  lines      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- work

create table epics (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  description text,
  color       text not null default '#6366f1',
  status      epic_status not null default 'planned',
  position    numeric not null default 0,
  -- Set when the epic was generated from an estimate section.
  source_line_id uuid references estimate_lines(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on epics (project_id, position);

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  epic_id     uuid references epics(id) on delete set null,
  parent_id   uuid references tasks(id) on delete cascade,   -- subtasks, one level
  title       text not null,
  description text,
  status      task_status not null default 'backlog',
  position    numeric not null default 0,   -- order within (status, epic)
  start_date  date,
  due_date    date,
  estimate_hours numeric(8,2),
  actual_hours   numeric(8,2) not null default 0,
  tags        text[] not null default '{}',
  source_line_id uuid references estimate_lines(id) on delete set null,
  completed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on tasks (project_id, status, position);
create index on tasks (epic_id);
create index on tasks (parent_id);

-- Gantt dependencies. Kept separate from tasks so the Gantt can read them directly.
create table task_dependencies (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  task_id    uuid not null references tasks(id) on delete cascade,  -- successor
  depends_on uuid not null references tasks(id) on delete cascade,  -- predecessor
  type       text not null default 'e2s',   -- SVAR Gantt link types
  unique (task_id, depends_on),
  check (task_id <> depends_on)
);

-- Optional time log. Feeds actual_hours and the "sold vs spent" panel metric.
create table time_entries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  task_id    uuid references tasks(id) on delete set null,
  spent_on   date not null default current_date,
  hours      numeric(6,2) not null,
  note       text,
  created_at timestamptz not null default now()
);
create index on time_entries (project_id, spent_on);

-- ---------------------------------------------------------------- docs

-- Folder tree. Files themselves live in Supabase Storage; this is the index
-- the SVAR File Manager reads.
create table doc_folders (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  parent_id  uuid references doc_folders(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index on doc_folders (project_id, parent_id);

create table doc_files (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  folder_id   uuid references doc_folders(id) on delete cascade,
  name        text not null,
  storage_path text not null,         -- path inside the 'docs' storage bucket
  mime_type   text,
  size_bytes  bigint,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on doc_files (project_id, folder_id);

-- ---------------------------------------------------------------- RLS

-- Every table is owner-scoped. Adding a table without this block leaves it open.
do $$
declare t text;
begin
  foreach t in array array[
    'settings','clients','projects','estimates','estimate_lines','line_presets',
    'epics','tasks','task_dependencies','time_entries','doc_folders','doc_files'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format($p$
      create policy owner_all on %I
        for all to authenticated
        using (owner_id = auth.uid())
        with check (owner_id = auth.uid())
    $p$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- triggers

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'settings','clients','projects','estimates','tasks','doc_files'
  ] loop
    execute format(
      'create trigger %I_touch before update on %I
         for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- Default owner_id to the current user so inserts never have to pass it.
do $$
declare t text;
begin
  foreach t in array array[
    'settings','clients','projects','estimates','estimate_lines','line_presets',
    'epics','tasks','task_dependencies','time_entries','doc_folders','doc_files'
  ] loop
    execute format('alter table %I alter column owner_id set default auth.uid()', t);
  end loop;
end $$;
