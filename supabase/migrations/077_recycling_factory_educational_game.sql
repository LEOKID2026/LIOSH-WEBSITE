-- Educational game #1: recycling-factory (מפעל המיחזור של ליאו)
-- FOR REVIEW ONLY — run manually after owner approval.
--
-- Rollback (manual):
--   delete from public.site_game_catalog where game_key = 'recycling-factory';
--   delete from public.reward_economy_educational_game_rules where game_key = 'recycling-factory';
--   drop table if exists public.educational_game_sessions;
--   drop table if exists public.reward_economy_educational_game_rules;
--   (restore site_game_catalog category check + sync trigger + permissions from 071/072)

begin;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table if not exists public.educational_game_sessions (
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
  constraint educational_game_sessions_game_key_check
    check (game_key in ('recycling-factory'))
);

create index if not exists educational_game_sessions_student_id_started_at_idx
  on public.educational_game_sessions (student_id, started_at desc);

create index if not exists educational_game_sessions_status_idx
  on public.educational_game_sessions (status);

comment on table public.educational_game_sessions is
  'Educational / enrichment games under /student/educational-games/* — separate from solo games.';

-- ---------------------------------------------------------------------------
-- Payout rules (server-side only)
-- ---------------------------------------------------------------------------
create table if not exists public.reward_economy_educational_game_rules (
  game_key text primary key,
  payout_rules_json jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_economy_educational_game_rules_game_key_check
    check (game_key in ('recycling-factory'))
);

comment on table public.reward_economy_educational_game_rules is
  'Per-game coin payout formulas for educational Leo games (server-side only).';

insert into public.reward_economy_educational_game_rules (game_key, payout_rules_json) values
  (
    'recycling-factory',
    '{
      "winBonus": { "easy": 80, "medium": 120, "hard": 180 },
      "lossParticipation": { "easy": 20, "medium": 30, "hard": 40 },
      "accuracyBonus90": 0.25,
      "accuracyBonus75": 0.10,
      "bestStreakBonus10": 15,
      "highScoreBonusThreshold": 400,
      "highScoreBonus": 20,
      "maxCoins": 350
    }'::jsonb
  )
on conflict (game_key) do update set
  payout_rules_json = excluded.payout_rules_json,
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- site_game_catalog: allow educational category
-- ---------------------------------------------------------------------------
alter table public.site_game_catalog
  drop constraint if exists site_game_catalog_category_check;

alter table public.site_game_catalog
  add constraint site_game_catalog_category_check
  check (category in ('online', 'offline', 'solo', 'educational'));

-- Parent permissions: educational category (default enabled)
alter table public.student_game_category_permissions
  add column if not exists educational_enabled boolean not null default true;

comment on column public.student_game_category_permissions.educational_enabled is
  'Parent lock for educational / enrichment games category.';

-- Sync catalog toggle → educational payout rules
create or replace function public.sync_site_game_catalog_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.is_enabled is not distinct from new.is_enabled then
    return new;
  end if;

  new.updated_at := now();

  if new.category = 'online' then
    update public.arcade_games
    set
      enabled = new.is_enabled,
      foundation_only = case when new.is_enabled then false else foundation_only end
    where game_key = new.game_key;
  elsif new.category = 'solo' then
    update public.reward_economy_solo_game_rules
    set
      is_active = new.is_enabled,
      updated_at = now()
    where game_key = new.game_key;
  elsif new.category = 'educational' then
    update public.reward_economy_educational_game_rules
    set
      is_active = new.is_enabled,
      updated_at = now()
    where game_key = new.game_key;
  end if;

  return new;
end;
$$;

insert into public.site_game_catalog (
  game_key, category, title_he, route, hub_route, is_enabled, sort_order, emoji, blurb_he
) values (
  'recycling-factory',
  'educational',
  'מפעל המיחזור של ליאו',
  '/student/educational-games/recycling-factory',
  '/student/educational-games',
  coalesce(
    (select is_active from public.reward_economy_educational_game_rules where game_key = 'recycling-factory'),
    true
  ),
  10,
  '♻️',
  'מיינו פסולת לפחים הנכונים ושמרו על הסביבה'
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

alter table public.educational_game_sessions enable row level security;
alter table public.reward_economy_educational_game_rules enable row level security;

comment on column public.site_game_catalog.is_enabled is
  'Admin per-game toggle. Syncs to arcade_games (online), reward_economy_solo_game_rules (solo), or reward_economy_educational_game_rules (educational).';

commit;
