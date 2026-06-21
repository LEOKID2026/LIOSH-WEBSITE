-- Solo Leo games V1: session tracking + payout rules (child world, single-player).

begin;

create table if not exists public.solo_game_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  game_key text not null,
  difficulty text,
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  metrics_json jsonb not null default '{}'::jsonb,
  coins_awarded integer not null default 0,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solo_game_sessions_game_key_check
    check (game_key in ('catcher', 'puzzle', 'memory', 'flyer'))
);

create index if not exists solo_game_sessions_student_id_started_at_idx
  on public.solo_game_sessions (student_id, started_at desc);

create index if not exists solo_game_sessions_status_idx
  on public.solo_game_sessions (status);

comment on table public.solo_game_sessions is
  'Single-player Leo solo game runs under /student/solo-games/* — one row per started session.';

create table if not exists public.reward_economy_solo_game_rules (
  game_key text primary key,
  payout_rules_json jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_economy_solo_game_rules_game_key_check
    check (game_key in ('catcher', 'puzzle', 'memory', 'flyer'))
);

comment on table public.reward_economy_solo_game_rules is
  'Per-game coin payout formulas for solo Leo games (server-side only).';

insert into public.reward_economy_solo_game_rules (game_key, payout_rules_json) values
  (
    'catcher',
    '{"baseCoins":50,"perScoreUnit":5,"scoreUnitDivisor":10,"perLevelBonus":20,"maxCoins":500}'::jsonb
  ),
  (
    'flyer',
    '{"baseCoins":40,"perScoreUnit":4,"scoreUnitDivisor":12,"perLevelBonus":15,"maxCoins":450}'::jsonb
  ),
  (
    'puzzle',
    '{"lossCoins":15,"winBonus":{"easy":100,"medium":200,"hard":350},"scoreBonusDivisor":50,"maxCoins":400}'::jsonb
  ),
  (
    'memory',
    '{"winBonus":{"easy":80,"medium":150,"hard":250},"mistakePenalty":5,"timeBonusPerSec":1,"maxCoins":400}'::jsonb
  )
on conflict (game_key) do nothing;

alter table public.solo_game_sessions enable row level security;
alter table public.reward_economy_solo_game_rules enable row level security;

commit;
