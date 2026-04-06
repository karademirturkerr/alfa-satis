create table if not exists public.report_settings (
  app_id text primary key,
  phone_number text not null,
  send_time text not null default '22:00',
  report_type text not null default 'daily_summary',
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.report_logs (
  id bigint generated always as identity primary key,
  app_id text not null,
  report_date text not null,
  mode text not null,
  status text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.report_settings enable row level security;
alter table public.report_logs enable row level security;

drop policy if exists "public report settings read" on public.report_settings;
create policy "public report settings read"
on public.report_settings
for select
to anon
using (true);

drop policy if exists "public report settings insert" on public.report_settings;
create policy "public report settings insert"
on public.report_settings
for insert
to anon
with check (true);

drop policy if exists "public report settings update" on public.report_settings;
create policy "public report settings update"
on public.report_settings
for update
to anon
using (true)
with check (true);

create or replace function public.touch_report_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists report_settings_set_updated_at on public.report_settings;
create trigger report_settings_set_updated_at
before update on public.report_settings
for each row
execute function public.touch_report_settings_updated_at();
