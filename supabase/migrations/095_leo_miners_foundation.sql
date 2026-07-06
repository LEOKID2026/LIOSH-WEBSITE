-- Leo Miners idle solo game: persistent state, accrue/claim logs, config singleton.
-- FOR REVIEW ONLY — run manually after owner approval.
--
-- Requires migrations through 094.
-- Default: catalog disabled + solo payout rules inactive until E2E verification.
-- Re-run safety: on conflict, catalog/solo rows update metadata only — never reset is_enabled / is_active.
--
-- Rollback (manual):
--   drop table if exists public.leo_miners_claim_log;
--   drop table if exists public.leo_miners_accrue_log;
--   drop table if exists public.leo_miners_state;
--   drop table if exists public.leo_miners_config;
--   delete from public.site_game_catalog where game_key = 'leo-miners';
--   delete from public.reward_economy_solo_game_rules where game_key = 'leo-miners';

begin;

-- ---------------------------------------------------------------------------
-- 1. Persistent per-student miners state (idle game — not solo_game_sessions)
-- ---------------------------------------------------------------------------

create table if not exists public.leo_miners_state (
  student_id uuid primary key references public.students (id) on delete cascade,
  board_json jsonb not null default '{}'::jsonb,
  upgrades_json jsonb not null default '{}'::jsonb,
  mining_points_pending numeric(12, 2) not null default 0 check (mining_points_pending >= 0),
  diamonds_pending integer not null default 0 check (diamonds_pending >= 0),
  offline_pending_json jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz null,
  last_accrue_at timestamptz null,
  last_claim_at timestamptz null,
  reset_count integer not null default 0 check (reset_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leo_miners_state_updated_at_idx
  on public.leo_miners_state (updated_at desc);

create index if not exists leo_miners_state_last_seen_at_idx
  on public.leo_miners_state (last_seen_at desc)
  where last_seen_at is not null;

comment on table public.leo_miners_state is
  'Leo Miners idle game board + pending rewards. One row per student. Server authority via API.';

-- ---------------------------------------------------------------------------
-- 2. Accrue audit log (idempotent per student + idempotency_key)
-- ---------------------------------------------------------------------------

create table if not exists public.leo_miners_accrue_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  idempotency_key text not null,
  action_type text not null check (action_type in ('rock_break', 'offline_batch', 'gift')),
  stage_counts jsonb not null default '{}'::jsonb,
  breaks_count integer not null default 0 check (breaks_count >= 0),
  offline_elapsed_sec integer not null default 0 check (offline_elapsed_sec >= 0),
  calculated_points numeric(12, 2) not null default 0,
  daily_points_after numeric(12, 2) not null default 0,
  status text not null check (status in ('applied', 'rejected', 'duplicate')),
  reject_reason text null,
  created_at timestamptz not null default now(),
  constraint leo_miners_accrue_log_idempotency_uq unique (student_id, idempotency_key)
);

create index if not exists leo_miners_accrue_log_student_created_idx
  on public.leo_miners_accrue_log (student_id, created_at desc);

create index if not exists leo_miners_accrue_log_created_idx
  on public.leo_miners_accrue_log (created_at desc);

comment on table public.leo_miners_accrue_log is
  'Immutable accrue audit for Leo Miners. Server-calculated points only.';

-- ---------------------------------------------------------------------------
-- 3. Claim audit log (idempotent per student + idempotency_key)
-- ---------------------------------------------------------------------------

create table if not exists public.leo_miners_claim_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  idempotency_key text not null,
  claim_type text not null check (claim_type in ('coins', 'diamonds_chest')),
  points_claimed numeric(12, 2) not null default 0 check (points_claimed >= 0),
  coins_granted integer not null default 0 check (coins_granted >= 0),
  diamonds_granted integer not null default 0 check (diamonds_granted >= 0),
  coin_transaction_id uuid null,
  diamond_transaction_id uuid null,
  status text not null check (status in ('completed', 'rejected', 'duplicate')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint leo_miners_claim_log_idempotency_uq unique (student_id, idempotency_key)
);

create index if not exists leo_miners_claim_log_student_created_idx
  on public.leo_miners_claim_log (student_id, created_at desc);

comment on table public.leo_miners_claim_log is
  'Claim audit for Leo Miners — points to Leo coins / diamonds via service APIs.';

-- ---------------------------------------------------------------------------
-- 4. Singleton game config (caps, ratios, stage table overrides)
-- ---------------------------------------------------------------------------

create table if not exists public.leo_miners_config (
  id uuid primary key default '00000000-0000-4000-8000-000000000095'::uuid,
  settings_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint leo_miners_config_singleton check (id = '00000000-0000-4000-8000-000000000095'::uuid)
);

comment on table public.leo_miners_config is
  'Singleton Leo Miners economy settings. Defaults seeded; runtime merges with code defaults.';

insert into public.leo_miners_config (id, settings_json, is_active)
values (
  '00000000-0000-4000-8000-000000000095'::uuid,
  '{
    "enabled": false,
    "economy_enabled": false,
    "accrue_enabled": false,
    "claim_enabled": false,
    "offline_enabled": true,
    "gifts_enabled": true,
    "diamond_chest_enabled": false,
    "guest_play_enabled": true,
    "guest_claim_enabled": true,
    "guest_diamond_enabled": false,
    "daily_points_cap": 2500,
    "daily_coins_cap": 500,
    "max_coins_per_claim": 500,
    "min_points_to_claim": 1,
    "points_to_coins_ratio": 1,
    "coins_rounding": "floor",
    "claim_cooldown_sec": 0,
    "diamond_chest_cost": 3,
    "diamond_chest_amount": 1,
    "daily_diamond_cap": 1,
    "max_diamonds_per_claim": 1,
    "offline_cap_hours": 12,
    "offline_factor": 0.35,
    "offline_min_seconds": 60,
    "offline_max_claims_per_day": 3,
    "max_breaks_per_minute": 60,
    "max_breaks_per_batch": 120,
    "max_stage": 100000,
    "max_offline_elapsed_sec": 43200,
    "reject_impossible_stage_jump": true,
    "guest_multiplier": 0.5,
    "guest_daily_points_cap": 500,
    "guest_daily_coins_cap": 100,
    "guest_daily_diamond_cap": 0,
    "base_dps": 2,
    "level_dps_multiplier": 1.9,
    "rock_base_hp": 60,
    "rock_hp_multiplier": 1.4,
    "gold_factor": 0.5,
    "spawn_initial_cost": 50,
    "spawn_cost_multiplier": 1.12,
    "dps_upgrade_multiplier": 1.1,
    "gold_upgrade_multiplier": 1.1,
    "auto_dog_interval_sec": 600,
    "auto_dog_bank_cap": 6,
    "base_stage_v1": 0.20,
    "softcut": [
      { "upto": 0.55, "factor": 1.0 },
      { "upto": 0.75, "factor": 0.55 },
      { "upto": 0.90, "factor": 0.30 },
      { "upto": 1.0, "factor": 0.15 },
      { "upto": 9.99, "factor": 0.06 }
    ],
    "stage_blocks": [
      { "start": 1, "end": 10, "r": 1.32 },
      { "start": 11, "end": 20, "r": 1.18 },
      { "start": 21, "end": 30, "r": 1.11 },
      { "start": 31, "end": 40, "r": 1.06 },
      { "start": 41, "end": 50, "r": 1.025 },
      { "start": 51, "end": 1000, "r": 1.0004 }
    ]
  }'::jsonb,
  false
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Solo game allowlist + catalog (disabled by default)
-- Allowlist = migration 076 list + leo-miners (matches lib/solo-games/solo-game-registry.js).
-- ---------------------------------------------------------------------------

alter table public.solo_game_sessions
  drop constraint if exists solo_game_sessions_game_key_check;

alter table public.solo_game_sessions
  add constraint solo_game_sessions_game_key_check
  check (game_key in (
    'catcher',
    'puzzle',
    'memory',
    'flyer',
    'leo-jump',
    'balloons',
    'maze',
    'picture-puzzle',
    'target-tap',
    'sort-shapes',
    'smart-blocks',
    'fruit-slice',
    'leo-miners'
  ));

alter table public.reward_economy_solo_game_rules
  drop constraint if exists reward_economy_solo_game_rules_game_key_check;

alter table public.reward_economy_solo_game_rules
  add constraint reward_economy_solo_game_rules_game_key_check
  check (game_key in (
    'catcher',
    'puzzle',
    'memory',
    'flyer',
    'leo-jump',
    'balloons',
    'maze',
    'picture-puzzle',
    'target-tap',
    'sort-shapes',
    'smart-blocks',
    'fruit-slice',
    'leo-miners'
  ));

insert into public.reward_economy_solo_game_rules (game_key, payout_rules_json, is_active) values
  (
    'leo-miners',
    '{
      "payoutModel": "leo-miners-idle",
      "maxCoins": 500,
      "diamondRules": {
        "enabled": true,
        "fixedAmount": 1,
        "maxPerSession": 3
      }
    }'::jsonb,
    false
  )
on conflict (game_key) do update set
  payout_rules_json = excluded.payout_rules_json,
  updated_at = now();

insert into public.site_game_catalog (
  game_key, category, title_he, route, hub_route, is_enabled, sort_order, emoji, blurb_he
) values (
  'leo-miners',
  'solo',
  'ליאו הכורה',
  '/student/solo-games/leo-miners',
  '/game',
  false,
  130,
  '⛏️',
  'כרו סלעים, שדרגו את ליאו הכורה ואספו פרסים!'
)
on conflict (game_key) do update set
  category = excluded.category,
  title_he = excluded.title_he,
  route = excluded.route,
  hub_route = excluded.hub_route,
  sort_order = excluded.sort_order,
  emoji = excluded.emoji,
  blurb_he = excluded.blurb_he,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 6. RLS — service-role only (match 069 / 063 pattern)
-- ---------------------------------------------------------------------------

alter table public.leo_miners_state enable row level security;
alter table public.leo_miners_accrue_log enable row level security;
alter table public.leo_miners_claim_log enable row level security;
alter table public.leo_miners_config enable row level security;

-- No authenticated policies — student APIs use service role.

commit;
