-- Storage bucket for the project docs section, plus a settings row per user.
-- Both live in a migration so local and prod cannot drift.

-- ---------------------------------------------------------------- storage

-- Private bucket. Files are reached through signed URLs, never public links.
insert into storage.buckets (id, name, public, file_size_limit)
values ('docs', 'docs', false, 52428800)   -- 50 MB per file
on conflict (id) do nothing;

-- Objects are owner-scoped, same rule as every table.
-- Path convention: <project_id>/<doc_file_id>-<filename>
create policy "docs owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'docs' and owner = auth.uid());

create policy "docs owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'docs' and owner = auth.uid());

create policy "docs owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'docs' and owner = auth.uid())
  with check (bucket_id = 'docs' and owner = auth.uid());

create policy "docs owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and owner = auth.uid());

-- ---------------------------------------------------------------- settings

-- Every user gets exactly one settings row, created on signup rather than
-- lazily by the app, so the estimate defaults always exist.
create or replace function bootstrap_settings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into settings (owner_id, company, branding, estimate_defaults)
  values (
    new.id,
    '{}'::jsonb,
    '{"accent_color": "#334155"}'::jsonb,
    jsonb_build_object(
      'columns',         jsonb_build_array('description', 'hours', 'rate', 'amount'),
      'show_line_hours', true,
      'show_unit_price', true,
      'tax_label',       'Tax',
      'tax_rate',        0,
      'currency',        'USD',
      'date_format',     'yyyy-MM-dd',
      'valid_days',      30
    )
  )
  on conflict (owner_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created_bootstrap_settings
  after insert on auth.users
  for each row execute function bootstrap_settings();
