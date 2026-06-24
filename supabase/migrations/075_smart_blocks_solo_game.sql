-- Solo game #11: smart-blocks (בלוקים חכמים)
-- Single migration: allowlist, payout rules, hub catalog (/game).
-- Run once: supabase/migrations/075_smart_blocks_solo_game.sql

begin;

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
    'smart-blocks'
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
    'smart-blocks'
  ));

insert into public.reward_economy_solo_game_rules (game_key, payout_rules_json) values
  (
    'smart-blocks',
    '{"lossCoins":0,"winBonus":{"easy":90,"medium":160,"hard":260},"scoreBonusDivisor":40,"maxCoins":400}'::jsonb
  )
on conflict (game_key) do update set
  payout_rules_json = excluded.payout_rules_json,
  is_active = true,
  updated_at = now();

insert into public.site_game_catalog (
  game_key, category, title_he, route, hub_route, is_enabled, sort_order, emoji, blurb_he
) values (
  'smart-blocks',
  'solo',
  'בלוקים חכמים',
  '/student/solo-games/smart-blocks',
  '/student/solo-games',
  coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'smart-blocks'), true),
  110,
  '🧱',
  'הניחו צורות, נקו שורות ועמודות והגיעו ליעד הניקוד!'
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
