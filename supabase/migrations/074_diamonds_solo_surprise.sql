-- Diamonds: solo session columns, surprise box diamonds, default diamondRules on solo payout JSON.
-- FOR REVIEW ONLY — run manually after 073_diamonds_foundation.sql and owner approval.
--
-- payout_rules_json merge safety:
--   coalesce(payout_rules_json, '{}'::jsonb) || diamondRules
--   skip row when diamondRules key already exists (idempotent re-run)
--
-- Does not alter coin_transactions, surprise_box coin rewards, or arcade_coin_apply.
--
-- Rollback (manual):
--   alter table public.solo_game_sessions drop column if exists diamonds_awarded;
--   alter table public.solo_game_sessions drop column if exists diamond_result_json;
--   alter table public.surprise_box_openings drop column if exists diamonds_reward;
--   delete from public.reward_card_settings where setting_key = 'surprise_box_diamond_rewards';

begin;

alter table public.solo_game_sessions
  add column if not exists diamonds_awarded integer not null default 0 check (diamonds_awarded >= 0);

alter table public.solo_game_sessions
  add column if not exists diamond_result_json jsonb not null default '{}'::jsonb;

comment on column public.solo_game_sessions.diamonds_awarded is
  'Diamonds credited for this session via diamond_apply (separate from coins_awarded).';

alter table public.surprise_box_openings
  add column if not exists diamonds_reward integer not null default 0 check (diamonds_reward >= 0);

comment on column public.surprise_box_openings.diamonds_reward is
  'Diamonds awarded on open (separate from coins_reward).';

insert into public.reward_card_settings (setting_key, setting_value_json)
values (
  'surprise_box_diamond_rewards',
  '[
    {"amount": 1, "weight": 70},
    {"amount": 2, "weight": 25},
    {"amount": 5, "weight": 5}
  ]'::jsonb
)
on conflict (setting_key) do nothing;

update public.reward_economy_solo_game_rules
set
  payout_rules_json = coalesce(payout_rules_json, '{}'::jsonb) || jsonb_build_object(
    'diamondRules',
    '{"enabled":true,"mode":"in_game_collect","fixedAmount":0,"tiers":[],"inGameCollectMultiplier":1,"maxPerSession":5,"onlyOnWin":false}'::jsonb
  ),
  updated_at = now()
where game_key in ('catcher', 'flyer', 'leo-jump', 'balloons', 'target-tap')
  and not (coalesce(payout_rules_json, '{}'::jsonb) ? 'diamondRules');

update public.reward_economy_solo_game_rules
set
  payout_rules_json = coalesce(payout_rules_json, '{}'::jsonb) || jsonb_build_object(
    'diamondRules',
    '{"enabled":true,"mode":"win_only","fixedAmount":1,"tiers":[],"inGameCollectMultiplier":1,"maxPerSession":3,"onlyOnWin":true}'::jsonb
  ),
  updated_at = now()
where game_key = 'maze'
  and not (coalesce(payout_rules_json, '{}'::jsonb) ? 'diamondRules');

update public.reward_economy_solo_game_rules
set
  payout_rules_json = coalesce(payout_rules_json, '{}'::jsonb) || jsonb_build_object(
    'diamondRules',
    '{"enabled":true,"mode":"win_only","fixedAmount":0,"tiers":[{"minScore":500,"amount":1}],"inGameCollectMultiplier":1,"maxPerSession":3,"onlyOnWin":false}'::jsonb
  ),
  updated_at = now()
where game_key in ('puzzle', 'memory', 'picture-puzzle', 'sort-shapes')
  and not (coalesce(payout_rules_json, '{}'::jsonb) ? 'diamondRules');

commit;
