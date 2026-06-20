-- ===========================================================================
-- DRAFT — 063_economy_single_source.sql
-- ===========================================================================
-- STATUS: FOR REVIEW ONLY — DO NOT RUN without explicit owner approval.
-- Purpose: extend Admin/DB economy for session coins, arcade entry costs,
--          arcade payout rules; remove rigid arcade entry_cost CHECK constraints.
-- Prerequisite: 058_card_rewards_system.sql, 004_arcade_foundation.sql
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Session coin formula (replaces hardcoded 10/15/20 + daily cap 300)
-- ---------------------------------------------------------------------------

create table if not exists public.reward_economy_session_coins (
  id uuid primary key default gen_random_uuid(),
  base_coins integer not null check (base_coins > 0),
  bonus_80_coins integer not null check (bonus_80_coins >= 0),
  bonus_95_coins integer not null check (bonus_95_coins >= 0),
  daily_cap integer not null check (daily_cap > 0),
  updated_at timestamptz not null default now(),
  constraint reward_economy_session_coins_singleton check (id = '00000000-0000-4000-8000-000000000063'::uuid)
);

comment on table public.reward_economy_session_coins is
  'Singleton: learning/parent-activity coin formula. Admin-managed; no code defaults at runtime.';

insert into public.reward_economy_session_coins (
  id, base_coins, bonus_80_coins, bonus_95_coins, daily_cap
) values (
  '00000000-0000-4000-8000-000000000063'::uuid,
  10, 5, 10, 300
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Admin-managed arcade entry cost catalog
-- ---------------------------------------------------------------------------

create table if not exists public.reward_economy_entry_cost_options (
  id uuid primary key default gen_random_uuid(),
  amount integer not null check (amount > 0),
  label_he text not null check (char_length(label_he) between 1 and 40),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_economy_entry_cost_options_amount_uq unique (amount)
);

comment on table public.reward_economy_entry_cost_options is
  'Allowed arcade entry cost amounts — replaces ARCADE_ENTRY_COSTS hardcoded array.';

insert into public.reward_economy_entry_cost_options (amount, label_he, display_order) values
  (10,    '10',   1),
  (100,   '100',  2),
  (1000,  '1K',   3),
  (10000, '10K',  4)
on conflict (amount) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Per-game arcade payout rules (replaces pot formulas in game servers)
-- ---------------------------------------------------------------------------

create table if not exists public.reward_economy_arcade_payout_rules (
  id uuid primary key default gen_random_uuid(),
  game_key text not null unique references public.arcade_games (game_key) on delete cascade,
  payout_rules_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.reward_economy_arcade_payout_rules is
  'Per-game payout config. Examples: {"winner_takes_pot":true}, {"pot_multiplier":2}, {"bingo_row_pot_pct":0.1}';

-- Seed payout rules for enabled games (idempotent via game_key)
insert into public.reward_economy_arcade_payout_rules (game_key, payout_rules_json) values
  ('fourline',           '{"winner_takes_pot":true,"pot_multiplier":2}'::jsonb),
  ('bingo',              '{"bingo_row_pot_pct":0.1,"full_card_takes_remaining_pot":true}'::jsonb),
  ('checkers',           '{"winner_takes_pot":true,"pot_multiplier":2}'::jsonb),
  ('chess',              '{"winner_takes_pot":true,"pot_multiplier":2}'::jsonb),
  ('dominoes',           '{"winner_takes_pot":true,"pot_multiplier":2}'::jsonb),
  ('snakes-and-ladders', '{"winner_takes_pot":true,"pot_multiplier":1}'::jsonb),
  ('ludo',               '{"winner_takes_pot":true,"pot_multiplier":1}'::jsonb)
on conflict (game_key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Relax arcade entry_cost CHECK — costs come from Admin catalog
-- ---------------------------------------------------------------------------

alter table public.arcade_rooms
  drop constraint if exists arcade_rooms_entry_cost_check;

alter table public.arcade_quick_match_queue
  drop constraint if exists arcade_quick_match_queue_entry_cost_check;

-- Optional: add FK-style validation via trigger (deferred to app layer in Phase 5)

-- ---------------------------------------------------------------------------
-- 5. RLS — service-role only (match 058 pattern)
-- ---------------------------------------------------------------------------

alter table public.reward_economy_session_coins enable row level security;
alter table public.reward_economy_entry_cost_options enable row level security;
alter table public.reward_economy_arcade_payout_rules enable row level security;

-- No authenticated policies — admin APIs use service role.

commit;

-- ===========================================================================
-- END DRAFT 063 — review only; not applied to any environment yet.
-- ===========================================================================
