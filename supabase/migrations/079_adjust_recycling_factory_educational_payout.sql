-- Adjust recycling-factory educational payout: performance-based, no flat participation.
-- FOR REVIEW ONLY — run manually after owner approval.
-- Requires 077 (already applied). Does not modify leo-supermarket or other games.

begin;

update public.reward_economy_educational_game_rules
set
  payout_rules_json = '{
    "payoutModel": "recycling-factory-performance",
    "basePerCorrectItem": { "easy": 3, "medium": 4, "hard": 5 },
    "completeTargetBonus": { "easy": 35, "medium": 50, "hard": 65 },
    "accuracyBonus90": 0.20,
    "accuracyBonus75": 0.10,
    "bestStreakBonus10": 15,
    "highScoreBonusThreshold": 400,
    "highScoreBonus": 20,
    "maxCoins": 350
  }'::jsonb,
  updated_at = now()
where game_key = 'recycling-factory';

commit;
