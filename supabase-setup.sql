-- ============================================================
-- MISK CRISIS RADAR — Supabase setup (6-dimension model)
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- NOTE: this resets the crisis tables, so run it before you
-- enter real cases (safe during setup).
-- ============================================================

drop table if exists case_updates cascade;
drop table if exists crisis_cases cascade;

create extension if not exists "pgcrypto";

-- ---- Main table ----------------------------------------------
-- Six scoring dimensions, each 1-5. Composite score &
-- Low/Medium/High classification are computed in the app.
create table crisis_cases (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  category           text not null,
  summary            text,
  status             text not null default 'Active',  -- Active | Monitoring | Escalated | Resolved

  severity           int  not null default 3,         -- 1-5  how serious right now
  urgency            int  not null default 3,         -- 1-5  how fast we must act
  reach              int  not null default 3,         -- 1-5  how many know / care
  sentiment          int  not null default 3,         -- 1-5  how negative the feeling
  escalation_risk    int  not null default 3,         -- 1-5  how likely to escalate
  strategic_impact   int  not null default 3,         -- 1-5  impact on Misk's reputation & goals

  expected_impact    text,                            -- what happens if it escalates
  recommended_action text,                            -- what we should do
  reference_links    text,                            -- pasted links (X, news, etc.)

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---- Monitoring notes per case -------------------------------
create table case_updates (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references crisis_cases(id) on delete cascade,
  note       text not null,
  author     text,
  created_at timestamptz not null default now()
);

-- ---- updated_at trigger --------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_cases_updated_at on crisis_cases;
create trigger trg_cases_updated_at
  before update on crisis_cases
  for each row execute function set_updated_at();

-- ---- Row Level Security (internal team tool) -----------------
alter table crisis_cases enable row level security;
alter table case_updates enable row level security;

drop policy if exists "team_read_cases"    on crisis_cases;
drop policy if exists "team_write_cases"   on crisis_cases;
drop policy if exists "team_read_updates"  on case_updates;
drop policy if exists "team_write_updates" on case_updates;

create policy "team_read_cases"    on crisis_cases for select to anon using (true);
create policy "team_write_cases"   on crisis_cases for all    to anon using (true) with check (true);
create policy "team_read_updates"  on case_updates for select to anon using (true);
create policy "team_write_updates" on case_updates for all    to anon using (true) with check (true);

-- ---- Live sync -----------------------------------------------
alter publication supabase_realtime add table crisis_cases;
alter publication supabase_realtime add table case_updates;
