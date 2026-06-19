-- Leo cards — closed catalog (76 cards + 4 common asset paths).
-- Owner applies manually in Supabase SQL editor. Agent must NOT run this migration.
--
-- Requires 058_card_rewards_system.sql already applied.
-- Does NOT modify 058. card_key = filename without .webp (exact closed list).
--
-- Catalog: shop=40, achievement=24, event=12 (events inactive by default).
--
-- Asset paths (swap WebP in place — no future SQL for same card_key):
--   public/rewards/cards/shop/{professions,space-tech,fantasy,sport-fun,style}/*.webp
--   public/rewards/cards/achievements/{general,math,language,subjects}/*.webp
--   public/rewards/cards/events/*.webp
--   public/rewards/cards/common/{card_back,surprise_box_icon,duplicate_icon,coin_convert_icon}.webp
--
-- Rarity source of truth: scripts/leo-059-approved-rarities.mjs
-- Verify after edit: npm run rewards:verify-059

begin;

-- ===========================================================================
-- 1. Deactivate legacy 058 seed cards (36 shop + 24 achievement)
-- ===========================================================================

update public.reward_cards
set is_active = false, can_be_purchased = false, can_appear_in_surprise_box = false, updated_at = now()
where card_type = 'shop' and card_key in (
    'lion_gold',
    'tiger_fast',
    'panda_happy',
    'dog_loyal',
    'bear_strong',
    'fox_clever',
    'space_cat',
    'star_rocket',
    'green_star',
    'space_pilot',
    'cute_alien',
    'nebula_glow',
    'blue_dino',
    'trex_mighty',
    'ptero_fly',
    'tri_guard',
    'smart_robot',
    'silver_robot',
    'gold_robot',
    'helper_bot',
    'learning_hero',
    'class_star',
    'number_hero',
    'persistence_hero',
    'little_dragon',
    'magic_shield',
    'green_spell',
    'golden_knight',
    'wise_owl',
    'wise_turtle',
    'color_flower',
    'magic_forest',
    'gold_striker',
    'top_goalkeeper',
    'goal_king',
    'field_star'
  );

update public.reward_cards
set is_active = false, can_be_purchased = false, can_appear_in_surprise_box = false, updated_at = now()
where card_type = 'achievement' and card_key in (
    'strong_start',
    'week_star',
    'never_give_up',
    'mission_done',
    'question_master',
    'power_week',
    'streak_3',
    'streak_7',
    'streak_14',
    'number_explorer',
    'math_star',
    'multiplication_champ',
    'young_reader',
    'winning_reader',
    'word_discoverer',
    'english_star',
    'english_speaker',
    'nature_explorer',
    'young_scientist',
    'geometry_ace',
    'shape_master',
    'homeland_explorer',
    'homeland_scholar',
    'parent_activity'
  );

-- ===========================================================================
-- 2. Series
-- ===========================================================================

insert into public.reward_card_series (slug, name_he, description_he, display_order, is_active) values
  ('professions', 'מקצועות', 'קלפי מקצועות של ליאו', 1, true),
  ('space-tech', 'חלל וטכנולוגיה', 'קלפי חלל וטכנולוגיה של ליאו', 2, true),
  ('sport-fun', 'ספורט וכיף', 'קלפי ספורט וכיף של ליאו', 3, true),
  ('style', 'סטייל ליאו', 'קלפי סטייל של ליאו', 4, true),
  ('fantasy', 'פנטזיה', 'קלפי פנטזיה והרפתקאות של ליאו', 5, true),
  ('language', 'שפות', 'קלפי הישג בשפות', 21, true),
  ('subjects', 'מקצועות לימוד', 'קלפי הישג במקצועות', 22, true),
  ('events', 'אירועים', 'קלפי אירוע', 30, true)
on conflict (slug) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  display_order = excluded.display_order, is_active = true, updated_at = now();

update public.reward_card_series set name_he = 'כללי', description_he = 'קלפי הישג כלליים', display_order = 20, is_active = true, updated_at = now() where slug = 'general';
update public.reward_card_series set name_he = 'חשבון', description_he = 'קלפי הישג בחשבון', display_order = 23, is_active = true, updated_at = now() where slug = 'math';

update public.reward_card_series set is_active = false, updated_at = now()
where slug in ('animals', 'space', 'dinosaurs', 'robots', 'heroes', 'nature', 'football',
  'persistence', 'hebrew', 'english', 'science', 'geometry', 'moledet',
  'events-hanukkah', 'events-passover', 'events-new-year', 'events-site-birthday');

-- ===========================================================================
-- 3. Common UI assets (not reward_cards rows)
-- ===========================================================================

insert into public.reward_card_settings (setting_key, setting_value_json) values (
  'leo_card_common_assets',
  '{
    "card_back": "/rewards/cards/common/card_back.webp",
    "surprise_box_icon": "/rewards/cards/common/surprise_box_icon.webp",
    "duplicate_icon": "/rewards/cards/common/duplicate_icon.webp",
    "coin_convert_icon": "/rewards/cards/common/coin_convert_icon.webp"
  }'::jsonb
) on conflict (setting_key) do update set setting_value_json = excluded.setting_value_json, updated_at = now();

-- ===========================================================================
-- 4. Shop — 40 cards
-- ===========================================================================

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select v.card_key, v.name_he, v.description_he, v.image_url, s.id, v.rarity, 'shop',
  true, true, true, true
from (values
    ('professions', 'leo_scientist', 'ליאו המדען', 'ליאו המדען', '/rewards/cards/shop/professions/leo_scientist.webp', 'regular'),
    ('professions', 'leo_detective', 'ליאו הבלש', 'ליאו הבלש', '/rewards/cards/shop/professions/leo_detective.webp', 'regular'),
    ('professions', 'leo_doctor', 'ליאו הרופא', 'ליאו הרופא', '/rewards/cards/shop/professions/leo_doctor.webp', 'special'),
    ('professions', 'leo_chef', 'ליאו השף', 'ליאו השף', '/rewards/cards/shop/professions/leo_chef.webp', 'regular'),
    ('professions', 'leo_pilot', 'ליאו הטייס', 'ליאו הטייס', '/rewards/cards/shop/professions/leo_pilot.webp', 'special'),
    ('professions', 'leo_engineer', 'ליאו המהנדס', 'ליאו המהנדס', '/rewards/cards/shop/professions/leo_engineer.webp', 'special'),
    ('professions', 'leo_artist', 'ליאו האמן', 'ליאו האמן', '/rewards/cards/shop/professions/leo_artist.webp', 'regular'),
    ('professions', 'leo_musician', 'ליאו המוזיקאי', 'ליאו המוזיקאי', '/rewards/cards/shop/professions/leo_musician.webp', 'regular'),
    ('space-tech', 'leo_astronaut', 'ליאו האסטרונאוט', 'ליאו האסטרונאוט', '/rewards/cards/shop/space-tech/leo_astronaut.webp', 'rare'),
    ('space-tech', 'leo_space_commander', 'ליאו מפקד החלל', 'ליאו מפקד החלל', '/rewards/cards/shop/space-tech/leo_space_commander.webp', 'gold'),
    ('space-tech', 'leo_star_explorer', 'ליאו חוקר הכוכבים', 'ליאו חוקר הכוכבים', '/rewards/cards/shop/space-tech/leo_star_explorer.webp', 'special'),
    ('space-tech', 'leo_robotic', 'ליאו הרובוטי', 'ליאו הרובוטי', '/rewards/cards/shop/space-tech/leo_robotic.webp', 'rare'),
    ('space-tech', 'leo_super_inventor', 'ליאו ממציא העל', 'ליאו ממציא העל', '/rewards/cards/shop/space-tech/leo_super_inventor.webp', 'rare'),
    ('space-tech', 'leo_galaxy_captain', 'ליאו קפטן גלקסי', 'ליאו קפטן גלקסי', '/rewards/cards/shop/space-tech/leo_galaxy_captain.webp', 'gold'),
    ('space-tech', 'leo_space_pilot', 'ליאו טייס חלל', 'ליאו טייס חלל', '/rewards/cards/shop/space-tech/leo_space_pilot.webp', 'special'),
    ('space-tech', 'leo_technodog', 'ליאו טכנודוג', 'ליאו טכנודוג', '/rewards/cards/shop/space-tech/leo_technodog.webp', 'rare'),
    ('fantasy', 'leo_wizard', 'ליאו הקוסם', 'ליאו הקוסם', '/rewards/cards/shop/fantasy/leo_wizard.webp', 'special'),
    ('fantasy', 'leo_sorcerer', 'ליאו המכשף', 'ליאו המכשף', '/rewards/cards/shop/fantasy/leo_sorcerer.webp', 'rare'),
    ('fantasy', 'leo_knight', 'ליאו האביר', 'ליאו האביר', '/rewards/cards/shop/fantasy/leo_knight.webp', 'special'),
    ('fantasy', 'leo_pirate', 'ליאו הפיראט', 'ליאו הפיראט', '/rewards/cards/shop/fantasy/leo_pirate.webp', 'regular'),
    ('fantasy', 'leo_ninja', 'ליאו הנינג''ה', 'ליאו הנינג''ה', '/rewards/cards/shop/fantasy/leo_ninja.webp', 'rare'),
    ('fantasy', 'leo_king', 'ליאו המלך', 'ליאו המלך', '/rewards/cards/shop/fantasy/leo_king.webp', 'gold'),
    ('fantasy', 'leo_forest_guardian', 'ליאו שומר היער', 'ליאו שומר היער', '/rewards/cards/shop/fantasy/leo_forest_guardian.webp', 'special'),
    ('fantasy', 'leo_superhero', 'סופר ליאו', 'סופר ליאו', '/rewards/cards/shop/fantasy/leo_superhero.webp', 'gold'),
    ('sport-fun', 'leo_football', 'ליאו הכדורגלן', 'ליאו הכדורגלן', '/rewards/cards/shop/sport-fun/leo_football.webp', 'regular'),
    ('sport-fun', 'leo_basketball', 'ליאו הכדורסלן', 'ליאו הכדורסלן', '/rewards/cards/shop/sport-fun/leo_basketball.webp', 'regular'),
    ('sport-fun', 'leo_runner', 'ליאו הרץ', 'ליאו הרץ', '/rewards/cards/shop/sport-fun/leo_runner.webp', 'regular'),
    ('sport-fun', 'leo_swimmer', 'ליאו השחיין', 'ליאו השחיין', '/rewards/cards/shop/sport-fun/leo_swimmer.webp', 'special'),
    ('sport-fun', 'leo_surfer', 'ליאו הגולש', 'ליאו הגולש', '/rewards/cards/shop/sport-fun/leo_surfer.webp', 'special'),
    ('sport-fun', 'leo_dancer', 'ליאו הרקדן', 'ליאו הרקדן', '/rewards/cards/shop/sport-fun/leo_dancer.webp', 'regular'),
    ('sport-fun', 'leo_champion', 'ליאו האלוף', 'ליאו האלוף', '/rewards/cards/shop/sport-fun/leo_champion.webp', 'rare'),
    ('sport-fun', 'leo_gamer', 'ליאו הגיימר', 'ליאו הגיימר', '/rewards/cards/shop/sport-fun/leo_gamer.webp', 'special'),
    ('style', 'leo_smart', 'ליאו החכם', 'ליאו החכם', '/rewards/cards/shop/style/leo_smart.webp', 'special'),
    ('style', 'leo_funny', 'ליאו המצחיק', 'ליאו המצחיק', '/rewards/cards/shop/style/leo_funny.webp', 'regular'),
    ('style', 'leo_playful', 'ליאו השובב', 'ליאו השובב', '/rewards/cards/shop/style/leo_playful.webp', 'regular'),
    ('style', 'leo_celebration', 'ליאו החוגג', 'ליאו החוגג', '/rewards/cards/shop/style/leo_celebration.webp', 'special'),
    ('style', 'leo_classic', 'ליאו הקלאסי', 'ליאו הקלאסי', '/rewards/cards/shop/style/leo_classic.webp', 'regular'),
    ('style', 'leo_glasses', 'ליאו עם משקפיים', 'ליאו עם משקפיים', '/rewards/cards/shop/style/leo_glasses.webp', 'regular'),
    ('style', 'leo_suit', 'ליאו בחליפה', 'ליאו בחליפה', '/rewards/cards/shop/style/leo_suit.webp', 'rare'),
    ('style', 'leo_cool', 'ליאו המגניב', 'ליאו המגניב', '/rewards/cards/shop/style/leo_cool.webp', 'special')
) as v(series_slug, card_key, name_he, description_he, image_url, rarity)
join public.reward_card_series s on s.slug = v.series_slug
on conflict (card_key) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  image_url = excluded.image_url, series_id = excluded.series_id, rarity = excluded.rarity,
  card_type = 'shop', use_default_price = true,
  can_be_purchased = true, can_appear_in_surprise_box = true, is_active = true, updated_at = now();

-- ===========================================================================
-- 5. Achievement — 24 cards
-- ===========================================================================

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  subject, topic, use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select v.card_key, v.name_he, v.description_he, v.image_url, s.id, v.rarity, 'achievement',
  v.subject, v.topic, true, false, false, true
from (values
    ('general', 'achievement_strong_start', 'מתחיל חזק', 'סיים 20 שאלות כלליות', '/rewards/cards/achievements/general/achievement_strong_start.webp', 'regular', null, null),
    ('general', 'achievement_20_questions', '20 שאלות', 'סיים 20 שאלות', '/rewards/cards/achievements/general/achievement_20_questions.webp', 'regular', null, null),
    ('general', 'achievement_3_day_streak', 'מתמיד 3 ימים', 'למד 3 ימים ברצף', '/rewards/cards/achievements/general/achievement_3_day_streak.webp', 'special', null, null),
    ('general', 'achievement_7_day_streak', 'מתמיד 7 ימים', 'למד 7 ימים ברצף', '/rewards/cards/achievements/general/achievement_7_day_streak.webp', 'rare', null, null),
    ('general', 'achievement_week_star', 'כוכב השבוע', 'סיים 100 שאלות בשבוע', '/rewards/cards/achievements/general/achievement_week_star.webp', 'gold', null, null),
    ('general', 'achievement_never_give_up', 'לא מוותר', 'שיפור בנושא שהיה חלש', '/rewards/cards/achievements/general/achievement_never_give_up.webp', 'rare', null, null),
    ('general', 'achievement_big_progress', 'התקדמות גדולה', '200 שאלות בשבוע', '/rewards/cards/achievements/general/achievement_big_progress.webp', 'rare', null, null),
    ('general', 'achievement_task_complete', 'משימה הושלמה', 'סיים פעילות אישית מהורה', '/rewards/cards/achievements/general/achievement_task_complete.webp', 'special', null, null),
    ('math', 'achievement_number_explorer', 'חוקר המספרים', '30 שאלות בחשבון', '/rewards/cards/achievements/math/achievement_number_explorer.webp', 'regular', 'math', null),
    ('math', 'achievement_addition_champion', 'אלוף החיבור', '80% הצלחה בחיבור עם 30 שאלות', '/rewards/cards/achievements/math/achievement_addition_champion.webp', 'special', 'math', 'addition'),
    ('math', 'achievement_subtraction_champion', 'אלוף החיסור', '80% הצלחה בחיסור עם 30 שאלות', '/rewards/cards/achievements/math/achievement_subtraction_champion.webp', 'special', 'math', 'subtraction'),
    ('math', 'achievement_multiplication_champion', 'אלוף הכפל', '80% הצלחה בכפל עם 30 שאלות', '/rewards/cards/achievements/math/achievement_multiplication_champion.webp', 'rare', 'math', 'multiplication'),
    ('math', 'achievement_division_champion', 'אלוף החילוק', '80% הצלחה בחילוק עם 30 שאלות', '/rewards/cards/achievements/math/achievement_division_champion.webp', 'rare', 'math', 'division'),
    ('math', 'achievement_shapes_master', 'מאסטר הצורות', '50 שאלות בגיאומטריה', '/rewards/cards/achievements/math/achievement_shapes_master.webp', 'special', 'geometry', null),
    ('language', 'achievement_young_reader', 'קורא צעיר', '30 שאלות בעברית', '/rewards/cards/achievements/language/achievement_young_reader.webp', 'regular', 'hebrew', null),
    ('language', 'achievement_word_discoverer', 'מגלה מילים', 'הצלחה באוצר מילים', '/rewards/cards/achievements/language/achievement_word_discoverer.webp', 'special', 'hebrew', 'vocabulary'),
    ('language', 'achievement_understanding_master', 'מאסטר ההבנה', '40 שאלות בעברית', '/rewards/cards/achievements/language/achievement_understanding_master.webp', 'rare', 'hebrew', null),
    ('language', 'achievement_hebrew_star', 'כוכב עברית', '50 שאלות בעברית', '/rewards/cards/achievements/language/achievement_hebrew_star.webp', 'rare', 'hebrew', null),
    ('language', 'achievement_english_star', 'כוכב אנגלית', '30 שאלות באנגלית', '/rewards/cards/achievements/language/achievement_english_star.webp', 'rare', 'english', null),
    ('language', 'achievement_great_listener', 'מאזין מצוין', '50 שאלות באנגלית', '/rewards/cards/achievements/language/achievement_great_listener.webp', 'special', 'english', null),
    ('subjects', 'achievement_science_explorer', 'חוקר המדע', '30 שאלות במדעים', '/rewards/cards/achievements/subjects/achievement_science_explorer.webp', 'special', 'science', null),
    ('subjects', 'achievement_moledet_explorer', 'חוקר המולדת', '30 שאלות במולדת', '/rewards/cards/achievements/subjects/achievement_moledet_explorer.webp', 'special', 'moledet', null),
    ('subjects', 'achievement_personal_activity', 'פעילות אישית', 'סיים פעילות אישית מהורה', '/rewards/cards/achievements/subjects/achievement_personal_activity.webp', 'rare', null, null),
    ('subjects', 'achievement_new_record', 'שיא חדש', 'למד 14 ימים ברצף', '/rewards/cards/achievements/subjects/achievement_new_record.webp', 'gold', null, null)
) as v(series_slug, card_key, name_he, description_he, image_url, rarity, subject, topic)
join public.reward_card_series s on s.slug = v.series_slug
on conflict (card_key) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  image_url = excluded.image_url, series_id = excluded.series_id, rarity = excluded.rarity,
  card_type = 'achievement', subject = excluded.subject, topic = excluded.topic,
  use_default_price = true, can_be_purchased = false, can_appear_in_surprise_box = false,
  is_active = true, updated_at = now();

-- ===========================================================================
-- 6. Achievement rules
-- ===========================================================================

insert into public.reward_card_rules (
  card_id, rule_type, subject, topic, min_questions, min_accuracy, min_streak_days, min_completed_activities, is_active
)
select c.id, r.rule_type, r.subject, r.topic, r.min_questions, r.min_accuracy, r.min_streak_days, r.min_completed_activities, true
from (values
    ('achievement_strong_start', 'total_questions', null, null, 20, null, null, null),
    ('achievement_20_questions', 'total_questions', null, null, 20, null, null, null),
    ('achievement_3_day_streak', 'learning_streak_days', null, null, null, null, 3, null),
    ('achievement_7_day_streak', 'learning_streak_days', null, null, null, null, 7, null),
    ('achievement_week_star', 'weekly_questions', null, null, 100, null, null, null),
    ('achievement_never_give_up', 'subject_improvement', null, null, null, null, null, null),
    ('achievement_big_progress', 'weekly_questions', null, null, 200, null, null, null),
    ('achievement_task_complete', 'parent_activity_complete', null, null, null, null, null, 1),
    ('achievement_number_explorer', 'subject_questions', 'math', null, 30, null, null, null),
    ('achievement_addition_champion', 'subject_accuracy', 'math', 'addition', 30, 80, null, null),
    ('achievement_subtraction_champion', 'subject_accuracy', 'math', 'subtraction', 30, 80, null, null),
    ('achievement_multiplication_champion', 'subject_accuracy', 'math', 'multiplication', 30, 80, null, null),
    ('achievement_division_champion', 'subject_accuracy', 'math', 'division', 30, 80, null, null),
    ('achievement_shapes_master', 'subject_questions', 'geometry', null, 50, null, null, null),
    ('achievement_young_reader', 'subject_questions', 'hebrew', null, 30, null, null, null),
    ('achievement_word_discoverer', 'subject_accuracy', 'hebrew', 'vocabulary', 20, 70, null, null),
    ('achievement_understanding_master', 'subject_questions', 'hebrew', null, 40, null, null, null),
    ('achievement_hebrew_star', 'subject_questions', 'hebrew', null, 50, null, null, null),
    ('achievement_english_star', 'subject_questions', 'english', null, 30, null, null, null),
    ('achievement_great_listener', 'subject_questions', 'english', null, 50, null, null, null),
    ('achievement_science_explorer', 'subject_questions', 'science', null, 30, null, null, null),
    ('achievement_moledet_explorer', 'subject_questions', 'moledet', null, 30, null, null, null),
    ('achievement_personal_activity', 'parent_activity_complete', null, null, null, null, null, 1),
    ('achievement_new_record', 'learning_streak_days', null, null, null, null, 14, null)
) as r(card_key, rule_type, subject, topic, min_questions, min_accuracy, min_streak_days, min_completed_activities)
join public.reward_cards c on c.card_key = r.card_key and c.card_type = 'achievement'
where not exists (select 1 from public.reward_card_rules existing where existing.card_id = c.id);

update public.reward_card_rules rr set
  rule_type = r.rule_type, subject = r.subject, topic = r.topic,
  min_questions = r.min_questions, min_accuracy = r.min_accuracy,
  min_streak_days = r.min_streak_days, min_completed_activities = r.min_completed_activities,
  is_active = true, updated_at = now()
from (values
    ('achievement_strong_start', 'total_questions', null, null, 20, null, null, null),
    ('achievement_20_questions', 'total_questions', null, null, 20, null, null, null),
    ('achievement_3_day_streak', 'learning_streak_days', null, null, null, null, 3, null),
    ('achievement_7_day_streak', 'learning_streak_days', null, null, null, null, 7, null),
    ('achievement_week_star', 'weekly_questions', null, null, 100, null, null, null),
    ('achievement_never_give_up', 'subject_improvement', null, null, null, null, null, null),
    ('achievement_big_progress', 'weekly_questions', null, null, 200, null, null, null),
    ('achievement_task_complete', 'parent_activity_complete', null, null, null, null, null, 1),
    ('achievement_number_explorer', 'subject_questions', 'math', null, 30, null, null, null),
    ('achievement_addition_champion', 'subject_accuracy', 'math', 'addition', 30, 80, null, null),
    ('achievement_subtraction_champion', 'subject_accuracy', 'math', 'subtraction', 30, 80, null, null),
    ('achievement_multiplication_champion', 'subject_accuracy', 'math', 'multiplication', 30, 80, null, null),
    ('achievement_division_champion', 'subject_accuracy', 'math', 'division', 30, 80, null, null),
    ('achievement_shapes_master', 'subject_questions', 'geometry', null, 50, null, null, null),
    ('achievement_young_reader', 'subject_questions', 'hebrew', null, 30, null, null, null),
    ('achievement_word_discoverer', 'subject_accuracy', 'hebrew', 'vocabulary', 20, 70, null, null),
    ('achievement_understanding_master', 'subject_questions', 'hebrew', null, 40, null, null, null),
    ('achievement_hebrew_star', 'subject_questions', 'hebrew', null, 50, null, null, null),
    ('achievement_english_star', 'subject_questions', 'english', null, 30, null, null, null),
    ('achievement_great_listener', 'subject_questions', 'english', null, 50, null, null, null),
    ('achievement_science_explorer', 'subject_questions', 'science', null, 30, null, null, null),
    ('achievement_moledet_explorer', 'subject_questions', 'moledet', null, 30, null, null, null),
    ('achievement_personal_activity', 'parent_activity_complete', null, null, null, null, null, 1),
    ('achievement_new_record', 'learning_streak_days', null, null, null, null, 14, null)
) as r(card_key, rule_type, subject, topic, min_questions, min_accuracy, min_streak_days, min_completed_activities)
join public.reward_cards c on c.card_key = r.card_key and c.card_type = 'achievement'
where rr.card_id = c.id;

update public.reward_card_rules rr set is_active = false, updated_at = now()
from public.reward_cards c
where rr.card_id = c.id and c.card_type = 'achievement' and c.card_key in (
    'strong_start',
    'week_star',
    'never_give_up',
    'mission_done',
    'question_master',
    'power_week',
    'streak_3',
    'streak_7',
    'streak_14',
    'number_explorer',
    'math_star',
    'multiplication_champ',
    'young_reader',
    'winning_reader',
    'word_discoverer',
    'english_star',
    'english_speaker',
    'nature_explorer',
    'young_scientist',
    'geometry_ace',
    'shape_master',
    'homeland_explorer',
    'homeland_scholar',
    'parent_activity'
  );

-- Deactivate rules on wrong leo-prefixed achievement keys from prior draft (if any)
update public.reward_card_rules rr set is_active = false, updated_at = now()
from public.reward_cards c
where rr.card_id = c.id and c.card_type = 'achievement' and c.card_key like 'leo_%';

update public.reward_cards set is_active = false, can_be_purchased = false, can_appear_in_surprise_box = false, updated_at = now()
where card_type = 'achievement' and card_key like 'leo_%';

-- ===========================================================================
-- 7. Event — 12 cards (inactive by default)
-- ===========================================================================

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  event_reward_mode, use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select v.card_key, v.name_he, v.description_he, v.image_url, s.id, v.rarity, 'event',
  'achievement', true, false, false, false
from (values
    ('event_hanukkah', 'קלף חנוכה', 'קלף אירוע לחנוכה', '/rewards/cards/events/event_hanukkah.webp', 'special'),
    ('event_purim', 'קלף פורים', 'קלף אירוע לפורים', '/rewards/cards/events/event_purim.webp', 'special'),
    ('event_passover', 'קלף פסח', 'קלף אירוע לפסח', '/rewards/cards/events/event_passover.webp', 'special'),
    ('event_rosh_hashana', 'קלף ראש השנה', 'קלף אירוע לראש השנה', '/rewards/cards/events/event_rosh_hashana.webp', 'rare'),
    ('event_sukkot', 'קלף סוכות', 'קלף אירוע לסוכות', '/rewards/cards/events/event_sukkot.webp', 'special'),
    ('event_shavuot', 'קלף שבועות', 'קלף אירוע לשבועות', '/rewards/cards/events/event_shavuot.webp', 'special'),
    ('event_independence_day', 'קלף יום העצמאות', 'קלף אירוע ליום העצמאות', '/rewards/cards/events/event_independence_day.webp', 'rare'),
    ('event_back_to_learning', 'קלף חוזרים ללמוד', 'קלף אירוע לפתיחת שנת לימודים', '/rewards/cards/events/event_back_to_learning.webp', 'regular'),
    ('event_summer', 'קלף הקיץ', 'קלף אירוע לקיץ', '/rewards/cards/events/event_summer.webp', 'regular'),
    ('event_winter', 'קלף החורף', 'קלף אירוע לחורף', '/rewards/cards/events/event_winter.webp', 'regular'),
    ('event_birthday', 'קלף יום הולדת', 'קלף אירוע ליום הולדת', '/rewards/cards/events/event_birthday.webp', 'rare'),
    ('event_end_of_year', 'קלף סוף השנה', 'קלף אירוע לסוף שנת הלימודים', '/rewards/cards/events/event_end_of_year.webp', 'gold')
) as v(card_key, name_he, description_he, image_url, rarity)
join public.reward_card_series s on s.slug = 'events'
on conflict (card_key) do update set
  name_he = excluded.name_he, description_he = excluded.description_he,
  image_url = excluded.image_url, series_id = excluded.series_id, rarity = excluded.rarity,
  card_type = 'event', event_reward_mode = 'achievement', use_default_price = true,
  can_be_purchased = false, can_appear_in_surprise_box = false, is_active = false, updated_at = now();

-- Deactivate wrong event keys from prior draft (if any)
update public.reward_cards set is_active = false, can_be_purchased = false, can_appear_in_surprise_box = false, updated_at = now()
where card_type = 'event' and card_key not in (
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

commit;

-- Post-apply checks:
-- select card_type, count(*) from reward_cards where is_active=true group by card_type;
--   -- shop=40, achievement=24
-- select card_type, count(*) from reward_cards where card_key like 'achievement_%' or card_key like 'leo_%' or card_key like 'event_%' group by card_type;
--   -- shop=40, achievement=24, event=12
-- select count(*) from reward_cards where card_key in (/* all 76 keys */) ;
--   -- 76
-- select card_key, image_url from reward_cards where image_url not like '%.webp';
--   -- 0 rows (card rows only)
-- select card_key from reward_cards where card_type='shop' and is_active=true and card_key in ('bear_strong','panda_happy');
--   -- 0 rows
