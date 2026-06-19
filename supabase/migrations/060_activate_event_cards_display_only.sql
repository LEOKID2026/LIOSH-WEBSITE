-- ===========================================================================
-- 060 — Activate event cards for display only (locked + series tabs)
-- MANUAL APPLY — do not run automatically; review and execute in Supabase SQL editor.
--
-- Effect:
--   • 12 event cards visible in student UI (locked + series)
--   • Still NOT purchasable, NOT in surprise box, NOT obtainable via shop/box
-- Does NOT change prices, coins, box settings, shop cards, or achievement cards.
-- ===========================================================================

begin;

update public.reward_cards
set
  is_active = true,
  can_be_purchased = false,
  can_appear_in_surprise_box = false,
  updated_at = now()
where card_type = 'event'
  and card_key in (
    'event_hanukkah',
    'event_purim',
    'event_passover',
    'event_rosh_hashana',
    'event_sukkot',
    'event_shavuot',
    'event_independence_day',
    'event_back_to_learning',
    'event_summer',
    'event_winter',
    'event_birthday',
    'event_end_of_year'
  );

-- Post-apply checks (run manually after commit):
-- select card_key, is_active, can_be_purchased, can_appear_in_surprise_box
-- from public.reward_cards where card_type = 'event' order by card_key;
--   -- expect 12 rows: is_active=true, can_be_purchased=false, can_appear_in_surprise_box=false
-- select count(*) from public.reward_cards where card_type = 'event' and is_active = true;
--   -- expect 12

commit;
