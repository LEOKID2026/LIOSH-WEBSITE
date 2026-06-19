-- ===========================================================================
-- 061 — Split 12 event cards into two series
-- MANUAL APPLY — review and run in Supabase SQL editor.
--
-- Series:
--   • israeli-holidays — חגים בישראל (7 cards)
--   • events           — אירועים (5 cards)
--
-- Does NOT change prices, flags, images, or card keys.
-- ===========================================================================

begin;

-- Rename/clarify existing events series → general "אירועים"
update public.reward_card_series
set
  name_he = 'אירועים',
  description_he = 'קלפי אירועים כלליים',
  display_order = 31,
  is_active = true,
  updated_at = now()
where slug = 'events';

-- New series: Israeli holidays
insert into public.reward_card_series (slug, name_he, description_he, display_order, is_active)
values ('israeli-holidays', 'חגים בישראל', 'קלפי חגים ומועדים בישראל', 30, true)
on conflict (slug) do update set
  name_he = excluded.name_he,
  description_he = excluded.description_he,
  display_order = excluded.display_order,
  is_active = true,
  updated_at = now();

-- חגים בישראל (7)
update public.reward_cards c
set series_id = s.id, updated_at = now()
from public.reward_card_series s
where s.slug = 'israeli-holidays'
  and c.card_type = 'event'
  and c.card_key in (
    'event_hanukkah',
    'event_purim',
    'event_passover',
    'event_rosh_hashana',
    'event_sukkot',
    'event_shavuot',
    'event_independence_day'
  );

-- אירועים (5)
update public.reward_cards c
set series_id = s.id, updated_at = now()
from public.reward_card_series s
where s.slug = 'events'
  and c.card_type = 'event'
  and c.card_key in (
    'event_back_to_learning',
    'event_summer',
    'event_winter',
    'event_birthday',
    'event_end_of_year'
  );

commit;

-- Post-apply checks:
-- select s.name_he, s.slug, count(*) as cards
-- from public.reward_cards c
-- join public.reward_card_series s on s.id = c.series_id
-- where c.card_type = 'event'
-- group by s.name_he, s.slug, s.display_order
-- order by s.display_order;
--   -- חגים בישראל = 7, אירועים = 5
