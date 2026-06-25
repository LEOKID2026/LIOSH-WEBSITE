-- Educational game #6: leo-number-path (מסלול המספרים של ליאו)
-- FOR REVIEW ONLY — run manually after owner approval.
--
-- Requires migration 082 (leo-bakery).
--
-- Rollback (manual):
--   delete from public.site_game_catalog where game_key = 'leo-number-path';
--   delete from public.reward_economy_educational_game_rules where game_key = 'leo-number-path';

begin;

alter table public.educational_game_sessions
  drop constraint if exists educational_game_sessions_game_key_check;

alter table public.educational_game_sessions
  add constraint educational_game_sessions_game_key_check
  check (game_key in ('recycling-factory', 'leo-supermarket', 'leo-lab', 'leo-gifts', 'leo-bakery', 'leo-number-path'));

alter table public.reward_economy_educational_game_rules
  drop constraint if exists reward_economy_educational_game_rules_game_key_check;

alter table public.reward_economy_educational_game_rules
  add constraint reward_economy_educational_game_rules_game_key_check
  check (game_key in ('recycling-factory', 'leo-supermarket', 'leo-lab', 'leo-gifts', 'leo-bakery', 'leo-number-path'));

insert into public.reward_economy_educational_game_rules (game_key, payout_rules_json) values
  (
    'leo-number-path',
    '{
      "payoutModel": "leo-number-path-performance",
      "bonusPerSuccessfulTask": { "easy": 8, "medium": 11, "hard": 14 },
      "completeAll12Bonus": { "easy": 35, "medium": 50, "hard": 65 },
      "accuracyBonus90": 0.20,
      "accuracyBonus80": 0.10,
      "bestStreakBonus5": 12,
      "maxCoins": 350
    }'::jsonb
  )
on conflict (game_key) do update set
  payout_rules_json = excluded.payout_rules_json,
  is_active = true,
  updated_at = now();

insert into public.site_game_catalog (
  game_key, category, title_he, route, hub_route, is_enabled, sort_order, emoji, blurb_he
) values (
  'leo-number-path',
  'educational',
  'מסלול המספרים של ליאו',
  '/student/educational-games/leo-number-path',
  '/student/educational-games',
  coalesce(
    (select is_active from public.reward_economy_educational_game_rules where game_key = 'leo-number-path'),
    true
  ),
  60,
  '🔢',
  'סדרות, זוגי־אי זוגי וכפולות'
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

commit;
