-- ===========================================================================
-- 065 — Add new Leo cards batch (shop + achievements + Lag BaOmer event)
-- MANUAL APPLY — review and run in Supabase SQL editor.
--
-- Adds 27 new cards, 2 achievement series (geometry, science),
-- renames 5 existing shop cards (simple tier), does NOT replace images.
-- Requires 058–064 applied.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Rename 5 existing shop cards (simple tier — images unchanged)
-- ---------------------------------------------------------------------------

update public.reward_cards set name_he = 'ליאו עוזר הבלש', description_he = 'ליאו עוזר הבלש', updated_at = now()
where card_key = 'leo_detective' and card_type = 'shop';

update public.reward_cards set name_he = 'ליאו הקוסם הצעיר', description_he = 'ליאו הקוסם הצעיר', updated_at = now()
where card_key = 'leo_wizard' and card_type = 'shop';

update public.reward_cards set name_he = 'ליאו הגולש הצעיר', description_he = 'ליאו הגולש הצעיר', updated_at = now()
where card_key = 'leo_surfer' and card_type = 'shop';

update public.reward_cards set name_he = 'ליאו גיבור העל', description_he = 'ליאו גיבור העל', updated_at = now()
where card_key = 'leo_superhero' and card_type = 'shop';

update public.reward_cards set name_he = 'ליאו שומר היער', description_he = 'ליאו שומר היער', updated_at = now()
where card_key = 'leo_forest_guardian' and card_type = 'shop';

-- ---------------------------------------------------------------------------
-- 2. New achievement series
-- ---------------------------------------------------------------------------

insert into public.reward_card_series (slug, name_he, description_he, display_order, is_active)
values
  ('geometry', 'גאומטריה', 'קלפי הישג בגאומטריה', 24, true),
  ('science', 'מדעים', 'קלפי הישג במדעים', 25, true)
on conflict (slug) do update set
  name_he = excluded.name_he,
  description_he = excluded.description_he,
  display_order = excluded.display_order,
  is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Shop — 16 new cards @ 150000 coins
-- ---------------------------------------------------------------------------

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  price_coins, use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select v.card_key, v.name_he, v.description_he, v.image_url, s.id, v.rarity, 'shop',
  150000, false, true, true, true
from (values
  ('leo_master_detective', 'ליאו בלש העל', 'ליאו בלש העל', null, 'professions', 'rare'),
  ('leo_grand_wizard', 'ליאו המכשף הגדול', 'ליאו המכשף הגדול', null, 'fantasy', 'rare'),
  ('leo_wave_champion', 'ליאו אלוף הגלים', 'ליאו אלוף הגלים', null, 'sport-fun', 'special'),
  ('leo_legendary_superhero', 'סופר ליאו האגדי', 'סופר ליאו האגדי', null, 'fantasy', 'gold'),
  ('leo_enchanted_forest_guardian', 'ליאו שומר היער הקסום', 'ליאו שומר היער הקסום', null, 'fantasy', 'rare'),
  ('leo_golden_knight', 'ליאו אביר הזהב', 'ליאו אביר הזהב', null, 'fantasy', 'gold'),
  ('leo_master_chef', 'ליאו השף הראשי', 'ליאו השף הראשי', null, 'professions', 'special'),
  ('leo_firefighter', 'ליאו הכבאי', 'ליאו הכבאי', null, 'professions', 'special'),
  ('leo_pirate_captain', 'ליאו קפטן הים', 'ליאו קפטן הים', null, 'fantasy', 'special'),
  ('leo_galactic_explorer', 'ליאו חוקר הגלקסיות', 'ליאו חוקר הגלקסיות', null, 'space-tech', 'special'),
  ('leo_racing_driver', 'ליאו נהג המרוצים', 'ליאו נהג המרוצים', null, 'sport-fun', 'special'),
  ('leo_music_star', 'ליאו כוכב הבמה', 'ליאו כוכב הבמה', null, 'professions', 'special'),
  ('leo_master_painter', 'ליאו הצייר הגדול', 'ליאו הצייר הגדול', null, 'professions', 'regular'),
  ('leo_genius_inventor', 'ליאו הממציא הגאון', 'ליאו הממציא הגאון', null, 'professions', 'rare'),
  ('leo_soccer_champion', 'ליאו אלוף הכדורגל', 'ליאו אלוף הכדורגל', null, 'sport-fun', 'special'),
  ('leo_arcade_champion', 'ליאו אלוף הארקייד', 'ליאו אלוף הארקייד', null, 'sport-fun', 'special')
) as v(card_key, name_he, description_he, image_url, series_slug, rarity)
join public.reward_card_series s on s.slug = v.series_slug
on conflict (card_key) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  series_id = excluded.series_id, rarity = excluded.rarity,
  price_coins = 150000, use_default_price = false,
  can_be_purchased = true, can_appear_in_surprise_box = true, is_active = true,
  card_type = 'shop', updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Event — Lag BaOmer (israeli-holidays)
-- ---------------------------------------------------------------------------

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  event_reward_mode, use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select v.card_key, v.name_he, v.description_he, v.image_url, s.id, v.rarity, 'event',
  'achievement', true, false, false, true
from (values
  ('event_lag_baomer', 'ל״ג בעומר', 'קלף אירוע לל״ג בעומר', null, 'special')
) as v(card_key, name_he, description_he, image_url, rarity)
join public.reward_card_series s on s.slug = 'israeli-holidays'
on conflict (card_key) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  series_id = excluded.series_id, rarity = excluded.rarity,
  card_type = 'event', event_reward_mode = 'achievement',
  can_be_purchased = false, can_appear_in_surprise_box = false, is_active = true,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. Achievements — geometry (6)
-- ---------------------------------------------------------------------------

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  subject, topic, use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select v.card_key, v.name_he, v.description_he, v.image_url, s.id, v.rarity, 'achievement',
  v.subject, v.topic, true, false, false, true
from (values
  ('achievement_geometry_shapes_champion', 'אלוף הצורות', 'הישג גאומטריה: צורות בסיסיות', null, 'regular', 'geometry', null),
  ('achievement_geometry_angles_detective', 'בלש הזוויות', 'הישג גאומטריה: זוויות ומדידה', null, 'special', 'geometry', null),
  ('achievement_geometry_polygon_architect', 'אדריכל המצולעים', 'הישג גאומטריה: מצולעים', null, 'special', 'geometry', null),
  ('achievement_geometry_symmetry_explorer', 'חוקר הסימטריה', 'הישג גאומטריה: סימטריה', null, 'special', 'geometry', null),
  ('achievement_geometry_3d_builder', 'בונה תלת־ממד', 'הישג גאומטריה: גופים תלת־ממדיים', null, 'rare', 'geometry', null),
  ('achievement_geometry_area_genius', 'גאון השטח', 'הישג גאומטריה: שטח ומשבצות', null, 'rare', 'geometry', null)
) as v(card_key, name_he, description_he, image_url, rarity, subject, topic)
join public.reward_card_series s on s.slug = 'geometry'
on conflict (card_key) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  series_id = excluded.series_id, rarity = excluded.rarity,
  subject = excluded.subject, topic = excluded.topic,
  card_type = 'achievement', can_be_purchased = false, can_appear_in_surprise_box = false,
  is_active = true, updated_at = now();

-- ---------------------------------------------------------------------------
-- 6. Achievements — science (4)
-- ---------------------------------------------------------------------------

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  subject, topic, use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select v.card_key, v.name_he, v.description_he, v.image_url, s.id, v.rarity, 'achievement',
  v.subject, v.topic, true, false, false, true
from (values
  ('achievement_science_young_scientist', 'מדען צעיר', 'הישג מדעים: מעבדה וניסויים', null, 'regular', 'science', null),
  ('achievement_science_space_discoverer', 'מגלה החלל', 'הישג מדעים: חלל וכוכבים', null, 'special', 'science', null),
  ('achievement_science_weather_explorer', 'חוקר מזג האוויר', 'הישג מדעים: מזג אוויר', null, 'special', 'science', null),
  ('achievement_science_magnet_master', 'מאסטר המגנט', 'הישג מדעים: מגנטים וכוחות', null, 'rare', 'science', null)
) as v(card_key, name_he, description_he, image_url, rarity, subject, topic)
join public.reward_card_series s on s.slug = 'science'
on conflict (card_key) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  series_id = excluded.series_id, rarity = excluded.rarity,
  subject = excluded.subject, topic = excluded.topic,
  card_type = 'achievement', can_be_purchased = false, can_appear_in_surprise_box = false,
  is_active = true, updated_at = now();

-- ---------------------------------------------------------------------------
-- 7. Achievement rules (geometry + science)
-- ---------------------------------------------------------------------------

insert into public.reward_card_rules (
  card_id, rule_type, subject, topic, min_questions, min_accuracy, is_active, grant_enabled
)
select c.id, r.rule_type, r.subject, r.topic, r.min_questions, r.min_accuracy, true, true
from (values
  ('achievement_geometry_shapes_champion', 'subject_questions', 'geometry', null, 40, null),
  ('achievement_geometry_angles_detective', 'subject_questions', 'geometry', null, 35, null),
  ('achievement_geometry_polygon_architect', 'subject_questions', 'geometry', null, 45, null),
  ('achievement_geometry_symmetry_explorer', 'subject_questions', 'geometry', null, 40, null),
  ('achievement_geometry_3d_builder', 'subject_questions', 'geometry', null, 50, null),
  ('achievement_geometry_area_genius', 'subject_accuracy', 'geometry', null, 30, 75),
  ('achievement_science_young_scientist', 'subject_questions', 'science', null, 30, null),
  ('achievement_science_space_discoverer', 'subject_questions', 'science', null, 40, null),
  ('achievement_science_weather_explorer', 'subject_questions', 'science', null, 35, null),
  ('achievement_science_magnet_master', 'subject_accuracy', 'science', null, 25, 70)
) as r(card_key, rule_type, subject, topic, min_questions, min_accuracy)
join public.reward_cards c on c.card_key = r.card_key and c.card_type = 'achievement'
where not exists (select 1 from public.reward_card_rules existing where existing.card_id = c.id);

commit;

-- Post-apply checks:
-- select card_key, name_he, price_coins from reward_cards where card_key like 'leo_%' and price_coins = 150000;
-- select card_key, name_he from reward_cards where card_key in ('leo_detective','leo_wizard','leo_surfer','leo_superhero','leo_forest_guardian');
-- select card_key, card_type, can_be_purchased, can_appear_in_surprise_box from reward_cards where card_key = 'event_lag_baomer';
-- select s.slug, count(*) from reward_cards c join reward_card_series s on s.id = c.series_id where s.slug in ('geometry','science') group by s.slug;
