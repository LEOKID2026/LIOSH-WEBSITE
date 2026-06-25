-- Educational game #2: leo-supermarket (המכולת של ליאו)
-- FOR REVIEW ONLY — run manually after owner approval.
--
-- Requires migration 077 (educational_game_sessions, reward_economy_educational_game_rules, site_game_catalog educational).
--
-- Rollback (manual):
--   delete from public.site_game_catalog where game_key = 'leo-supermarket';
--   delete from public.reward_economy_educational_game_rules where game_key = 'leo-supermarket';
--   (restore game_key checks to recycling-factory only if removing this game entirely)

begin;

-- Widen game_key checks to include leo-supermarket
alter table public.educational_game_sessions
  drop constraint if exists educational_game_sessions_game_key_check;

alter table public.educational_game_sessions
  add constraint educational_game_sessions_game_key_check
  check (game_key in ('recycling-factory', 'leo-supermarket'));

alter table public.reward_economy_educational_game_rules
  drop constraint if exists reward_economy_educational_game_rules_game_key_check;

alter table public.reward_economy_educational_game_rules
  add constraint reward_economy_educational_game_rules_game_key_check
  check (game_key in ('recycling-factory', 'leo-supermarket'));

insert into public.reward_economy_educational_game_rules (game_key, payout_rules_json) values
  (
    'leo-supermarket',
    '{
      "payoutModel": "leo-supermarket-performance",
      "bonusPerCorrectCustomer": { "easy": 7, "medium": 10, "hard": 13 },
      "completeAll30Bonus": { "easy": 40, "medium": 60, "hard": 80 },
      "accuracyBonus90": 0.20,
      "accuracyBonus75": 0.10,
      "bestStreakBonus10": 15,
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
  'leo-supermarket',
  'educational',
  'המכולת של ליאו',
  '/student/educational-games/leo-supermarket',
  '/student/educational-games',
  coalesce(
    (select is_active from public.reward_economy_educational_game_rules where game_key = 'leo-supermarket'),
    true
  ),
  20,
  '🏪',
  'משחק כסף, קניות והחזרת עודף'
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
