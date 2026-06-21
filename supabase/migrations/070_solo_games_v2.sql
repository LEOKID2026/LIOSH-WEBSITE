-- Solo Leo games V2: extend game_key allowlist + achievement-only payout rules (all 10 games).
-- Policy: no participation coins (baseCoins=0, lossCoins=0). Coins only from score/progress/win.

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
    'sort-shapes'
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
    'sort-shapes'
  ));

insert into public.reward_economy_solo_game_rules (game_key, payout_rules_json) values
  (
    'catcher',
    '{"baseCoins":0,"perScoreUnit":5,"scoreUnitDivisor":10,"perLevelBonus":20,"maxCoins":500}'::jsonb
  ),
  (
    'flyer',
    '{"baseCoins":0,"perScoreUnit":4,"scoreUnitDivisor":12,"perLevelBonus":15,"maxCoins":450}'::jsonb
  ),
  (
    'puzzle',
    '{"lossCoins":0,"winBonus":{"easy":100,"medium":200,"hard":350},"scoreBonusDivisor":50,"maxCoins":400}'::jsonb
  ),
  (
    'memory',
    '{"winBonus":{"easy":80,"medium":150,"hard":250},"mistakePenalty":5,"timeBonusPerSec":1,"maxCoins":400}'::jsonb
  ),
  (
    'leo-jump',
    '{"baseCoins":0,"perScoreUnit":5,"scoreUnitDivisor":10,"perLevelBonus":15,"maxCoins":480}'::jsonb
  ),
  (
    'balloons',
    '{"baseCoins":0,"perScoreUnit":4,"scoreUnitDivisor":5,"perLevelBonus":0,"maxCoins":420}'::jsonb
  ),
  (
    'target-tap',
    '{"baseCoins":0,"perScoreUnit":5,"scoreUnitDivisor":8,"perLevelBonus":10,"maxCoins":450}'::jsonb
  ),
  (
    'maze',
    '{"lossCoins":0,"winBonus":{"easy":90,"medium":160,"hard":260},"scoreBonusDivisor":40,"maxCoins":400}'::jsonb
  ),
  (
    'picture-puzzle',
    '{"lossCoins":0,"winBonus":{"easy":100,"medium":180,"hard":300},"scoreBonusDivisor":50,"maxCoins":400}'::jsonb
  ),
  (
    'sort-shapes',
    '{"winBonus":{"easy":80,"medium":140,"hard":220},"mistakePenalty":5,"timeBonusPerSec":1,"maxCoins":400}'::jsonb
  )
on conflict (game_key) do update set
  payout_rules_json = excluded.payout_rules_json,
  is_active = true,
  updated_at = now();

commit;
