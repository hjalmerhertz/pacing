-- Pacing database schema.
--
-- Run this once in your Supabase project: open the project, click "SQL
-- Editor" in the left sidebar, paste this in, press Run.
--
-- Two tables. Neither holds anything private: `cache` is a copy of match
-- data Riot already serves publicly, and `focus` holds a metric name and
-- two numbers against a Riot ID.

-- ---------------------------------------------------------------------
-- Downloaded match and timeline data.
--
-- A finished match never changes, so this is a pure cache: one row per
-- match, written once, read many times. Hosting makes it shared - one
-- player's download serves every later visitor who looks at the same game.
-- ---------------------------------------------------------------------
create table if not exists public.cache (
  key         text primary key,
  value       jsonb not null,
  created_at  timestamptz not null default now()
);

-- Lets us clean out stale static data (Data Dragon, benchmarks) later
-- without scanning the whole table.
create index if not exists cache_created_at_idx
  on public.cache (created_at);

-- ---------------------------------------------------------------------
-- Focus goals: the one thing a player is currently working on.
-- ---------------------------------------------------------------------
create table if not exists public.focus (
  id          bigint generated always as identity primary key,
  riot_id     text not null,
  metric      text not null,
  baseline    double precision not null,
  target      double precision not null,
  started_at  bigint not null,
  achieved_at bigint,
  note        text default ''
);

create index if not exists focus_riot_id_idx
  on public.focus (riot_id);

-- Only one goal open at a time per player. The app enforces this too, but
-- the database is the place that can actually guarantee it.
create unique index if not exists focus_one_open_per_player
  on public.focus (riot_id)
  where achieved_at is null;

-- ---------------------------------------------------------------------
-- Row-level security.
--
-- The app reaches these tables only from the server, using the service
-- role key, which bypasses RLS. Turning RLS on with no public policies
-- means that if the anon key ever leaks, it still grants nothing.
-- ---------------------------------------------------------------------
alter table public.cache enable row level security;
alter table public.focus enable row level security;
