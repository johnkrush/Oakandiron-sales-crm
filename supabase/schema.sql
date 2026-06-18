-- Oakandiron Sales CRM — Supabase schema & access policies
--
-- Run this once in the Supabase dashboard → SQL Editor for the project
-- referenced by VITE_SUPABASE_URL. Safe to re-run: every statement is
-- guarded with IF NOT EXISTS / DROP ... IF EXISTS.
--
-- Why the policies matter: the app connects with a public (publishable)
-- key, which is subject to Row Level Security. If RLS is enabled with no
-- policies, reads silently return nothing and writes are rejected — which
-- is what makes leads "disappear" across devices.

-- ── Tables ─────────────────────────────────────────────────────────
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  household_name text,
  address        text,
  contact_name   text,
  phone          text,
  email          text,
  status         text not null,
  notes          text,
  assigned_rep   text,
  lat            double precision,
  lng            double precision,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  password   text,
  role       text not null default 'rep',
  created_at timestamptz not null default now()
);

-- ── Realtime ───────────────────────────────────────────────────────
-- The app subscribes to postgres_changes on both tables.
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.team_members;

-- ── Row Level Security ─────────────────────────────────────────────
alter table public.leads        enable row level security;
alter table public.team_members enable row level security;

-- This app has no per-user auth (a single shared public key), so the
-- public key needs full read/write. Tighten these if you later add
-- Supabase Auth.
drop policy if exists "public read leads"  on public.leads;
drop policy if exists "public write leads" on public.leads;
create policy "public read leads"  on public.leads for select using (true);
create policy "public write leads" on public.leads for all    using (true) with check (true);

drop policy if exists "public read team"  on public.team_members;
drop policy if exists "public write team" on public.team_members;
create policy "public read team"  on public.team_members for select using (true);
create policy "public write team" on public.team_members for all    using (true) with check (true);
