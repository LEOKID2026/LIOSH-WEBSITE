-- Educational game #8: leo-word-train (רכבת המילים של ליאו)
-- FOR REVIEW ONLY — run manually after owner approval.
--
-- Requires migration 087 (leo-pizzeria).
-- Enables ADMIN toggle via site_game_catalog (same as all educational games).
--
-- Rollback (manual):
--   delete from public.site_game_catalog where game_key = 'leo-word-train';
--   delete from public.reward_economy_educational_game_rules where game_key = 'leo-word-train';

begin;

alter table public.educational_game_sessions
  drop constraint if exists educational_game_sessions_game_key_check;

alter table public.educational_game_sessions
  add constraint educational_game_sessions_game_key_check
  check (game_key in (
    'recycling-factory',
    'leo-supermarket',
    'leo-lab',
    'leo-gifts',
    'leo-bakery',
    'leo-number-path',
    'leo-pizzeria',
    'leo-word-train'
  ));

alter table public.reward_economy_educational_game_rules
  drop constraint if exists reward_economy_educational_game_rules_game_key_check;

alter table public.reward_economy_educational_game_rules
  add constraint reward_economy_educational_game_rules_game_key_check
  check (game_key in (
    'recycling-factory',
    'leo-supermarket',
    'leo-lab',
    'leo-gifts',
    'leo-bakery',
    'leo-number-path',
    'leo-pizzeria',
    'leo-word-train'
  ));

insert into public.reward_economy_educational_game_rules (game_key, payout_rules_json) values
  (
    'leo-word-train',
    '{
      "payoutModel": "leo-language-task-performance",
      "bonusPerSuccessfulTask": { "easy": 6, "medium": 8, "hard": 10 },
      "completeAll20Bonus": { "easy": 40, "medium": 55, "hard": 70 },
      "accuracyBonus90": 0.20,
      "accuracyBonus80": 0.10,
      "bestStreakBonus5": 12,
      "maxCoins": 400
    }'::jsonb
  )
on conflict (game_key) do update set
  payout_rules_json = excluded.payout_rules_json,
  is_active = true,
  updated_at = now();

insert into public.site_game_catalog (
  game_key, category, title_he, route, hub_route, is_enabled, sort_order, emoji, blurb_he
) values (
  'leo-word-train',
  'educational',
  'רכבת המילים של ליאו',
  '/student/educational-games/leo-word-train',
  '/student/educational-games',
  coalesce(
    (select is_active from public.reward_economy_educational_game_rules where game_key = 'leo-word-train'),
    true
  ),
  70,
  '🚂',
  'אותיות, מילים ומשפטים באנגלית — על קרונות הרכבת'
)
on conflict (game_key) do update set
  category = excluded.category,
  title_he = excluded.title_he,
  route = excluded.route,
  hub_route = excluded.hub_route,
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  emoji = excluded.emoji,
  blurb_he = excluded.blurb_he,
  updated_at = now();

commit;
