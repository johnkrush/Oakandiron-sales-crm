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

-- ── Reconcile columns on pre-existing tables ───────────────────────
-- CREATE TABLE IF NOT EXISTS does nothing if the table already exists,
-- so a table created earlier with a partial schema would be missing
-- columns the app writes (this is what caused writes to 400 with
-- "Could not find the 'assigned_rep' column"). These add any missing
-- columns and are no-ops where they already exist.
alter table public.leads add column if not exists household_name text;
alter table public.leads add column if not exists address        text;
alter table public.leads add column if not exists contact_name   text;
alter table public.leads add column if not exists phone          text;
alter table public.leads add column if not exists email          text;
alter table public.leads add column if not exists status         text;
alter table public.leads add column if not exists notes          text;
alter table public.leads add column if not exists assigned_rep   text;
alter table public.leads add column if not exists lat            double precision;
alter table public.leads add column if not exists lng            double precision;
alter table public.leads add column if not exists created_at     timestamptz default now();
alter table public.leads add column if not exists updated_at     timestamptz default now();

alter table public.team_members add column if not exists name       text;
alter table public.team_members add column if not exists email      text;
alter table public.team_members add column if not exists password   text;
alter table public.team_members add column if not exists role       text default 'rep';
alter table public.team_members add column if not exists created_at timestamptz default now();

-- status must accept all four app values (interested, not-home, follow-up,
-- not-interested). A table created earlier may have restricted it via an
-- enum or CHECK constraint, which silently rejects the other statuses.
-- Make it plain text and drop any restricting CHECK constraints.
alter table public.leads alter column status type text using status::text;

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.leads'::regclass and contype = 'c'
  loop
    execute format('alter table public.leads drop constraint %I', c.conname);
  end loop;
end $$;

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

-- ── Deleted-lead tombstones ────────────────────────────────────────
-- A deleted lead used to "come back": any device still holding it in its
-- local cache would re-insert it on sync. This tombstone table + trigger
-- make a delete permanent at the DB level — once an id is here, the lead
-- can never be re-created, no matter what (stale) client tries.
create table if not exists public.deleted_leads (
  id         uuid primary key,
  deleted_at timestamptz not null default now()
);

alter table public.deleted_leads enable row level security;
drop policy if exists "public write deleted_leads" on public.deleted_leads;
create policy "public write deleted_leads" on public.deleted_leads
  for all using (true) with check (true);

-- Block re-inserting any lead whose id has been tombstoned. Returning NULL
-- from a BEFORE INSERT trigger silently skips that row, so a stale client's
-- re-insert simply does nothing instead of resurrecting the lead.
create or replace function public.block_deleted_lead_insert()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.deleted_leads d where d.id = NEW.id) then
    return null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_block_deleted_lead_insert on public.leads;
create trigger trg_block_deleted_lead_insert
  before insert on public.leads
  for each row execute function public.block_deleted_lead_insert();

-- ── Refresh PostgREST schema cache ─────────────────────────────────
-- So the API layer immediately picks up any columns added above.
notify pgrst, 'reload schema';
