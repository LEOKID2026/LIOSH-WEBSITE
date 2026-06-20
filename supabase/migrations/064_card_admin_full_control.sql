-- Card admin full control: extend reward_cards + reward_card_rules for Admin-managed acquisition.
-- Owner applies manually in Supabase SQL editor. Agent must NOT run this migration.
--
-- Requires 058_card_rewards_system.sql (and 059+ catalog seeds).
-- Safe: additive columns only, no deletes, no card_id changes, no student_reward_cards changes.

begin;

-- ===========================================================================
-- 1. reward_cards — visibility, requirement override, grade bands
-- ===========================================================================

alter table public.reward_cards
  add column if not exists visibility_mode text not null default 'visible_locked';

alter table public.reward_cards
  drop constraint if exists reward_cards_visibility_mode_chk;

alter table public.reward_cards
  add constraint reward_cards_visibility_mode_chk
  check (visibility_mode in ('visible_locked', 'hidden_until_eligible'));

alter table public.reward_cards
  add column if not exists requirement_text_he text null;

alter table public.reward_cards
  add column if not exists image_asset_key text null;

alter table public.reward_cards
  add column if not exists grade_bands text[] null;

comment on column public.reward_cards.visibility_mode is
  'visible_locked = show locked card; hidden_until_eligible = hide until rule progress/eligible.';

comment on column public.reward_cards.requirement_text_he is
  'Optional child-facing requirement override; if null, built from active rules.';

comment on column public.reward_cards.grade_bands is
  'Optional grade band filter (g12, g34, g56) for display and auto-grant eligibility.';

-- ===========================================================================
-- 2. reward_card_rules — flexible params + grant control
-- ===========================================================================

alter table public.reward_card_rules
  add column if not exists params_json jsonb not null default '{}'::jsonb;

alter table public.reward_card_rules
  add column if not exists requirement_text_he text null;

alter table public.reward_card_rules
  add column if not exists grant_enabled boolean not null default true;

alter table public.reward_card_rules
  add column if not exists min_learning_minutes_monthly integer null;

alter table public.reward_card_rules
  add column if not exists grade_band text null;

alter table public.reward_card_rules
  add column if not exists starts_at timestamptz null;

alter table public.reward_card_rules
  add column if not exists ends_at timestamptz null;

alter table public.reward_card_rules
  add column if not exists display_order integer not null default 0;

alter table public.reward_card_rules
  drop constraint if exists reward_card_rules_grade_band_chk;

alter table public.reward_card_rules
  add constraint reward_card_rules_grade_band_chk
  check (grade_band is null or grade_band in ('g12', 'g34', 'g56'));

create index if not exists reward_card_rules_card_active_idx
  on public.reward_card_rules (card_id, is_active);

comment on column public.reward_card_rules.params_json is
  'Rule parameters (thresholds, windows). Legacy columns mirrored here on backfill.';

comment on column public.reward_card_rules.grant_enabled is
  'When false, rule is evaluated for UI only — no auto-grant (e.g. subject_improvement stub).';

-- ===========================================================================
-- 3. Backfill params_json from legacy rule columns (preserves 059 behavior)
-- ===========================================================================

update public.reward_card_rules rr
set params_json = jsonb_strip_nulls(
  jsonb_build_object(
    'min_questions', rr.min_questions,
    'min_accuracy', rr.min_accuracy,
    'min_streak_days', rr.min_streak_days,
    'min_completed_activities', rr.min_completed_activities,
    'subject', rr.subject,
    'topic', rr.topic,
    'min_learning_minutes_monthly', rr.min_learning_minutes_monthly
  )
),
updated_at = now()
where rr.params_json = '{}'::jsonb
   or rr.params_json is null;

update public.reward_card_rules rr
set requirement_text_he = c.description_he,
    updated_at = now()
from public.reward_cards c
where rr.card_id = c.id
  and rr.is_active = true
  and rr.requirement_text_he is null
  and c.description_he is not null
  and char_length(trim(c.description_he)) > 0;

update public.reward_cards c
set requirement_text_he = c.description_he,
    updated_at = now()
where c.requirement_text_he is null
  and c.description_he is not null
  and char_length(trim(c.description_he)) > 0
  and c.card_type in ('achievement', 'event');

update public.reward_card_rules rr
set grant_enabled = false,
    updated_at = now()
where rr.rule_type = 'subject_improvement'
  and rr.grant_enabled = true;

update public.reward_cards
set visibility_mode = 'visible_locked',
    updated_at = now()
where card_type = 'event'
  and visibility_mode is distinct from 'visible_locked';

commit;
