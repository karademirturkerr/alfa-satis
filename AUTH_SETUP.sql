create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique,
  full_name text,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "user profiles public lookup by username" on public.user_profiles;
create policy "user profiles public lookup by username"
on public.user_profiles
for select
to anon
using (true);

drop policy if exists "user profiles authenticated read" on public.user_profiles;
create policy "user profiles authenticated read"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);
