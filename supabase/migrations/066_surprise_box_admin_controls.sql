-- Surprise box: stacked pending count + flexible opening rewards (admin-controlled).
-- Run manually after review. Does not touch Copilot / parent report / SW.

-- 1) Stack up to max_pending_boxes (configured in reward_card_settings JSON).
alter table public.surprise_box_state
  add column if not exists pending_box_count integer not null default 0;

comment on column public.surprise_box_state.pending_box_count is
  'Unopened surprise boxes queued for the student (capped by surprise_box_general_settings.max_pending_boxes).';

update public.surprise_box_state
set pending_box_count = case when has_pending_box then 1 else 0 end
where pending_box_count = 0;

-- Keep legacy boolean in sync for any older readers.
update public.surprise_box_state
set has_pending_box = (pending_box_count > 0);

alter table public.surprise_box_state
  drop constraint if exists surprise_box_state_pending_box_count_nonneg_chk;

alter table public.surprise_box_state
  add constraint surprise_box_state_pending_box_count_nonneg_chk
  check (pending_box_count >= 0);

-- 2) Opening log: optional card columns + full rewards JSON for variable prize counts.
alter table public.surprise_box_openings
  add column if not exists rewards_json jsonb null;

alter table public.surprise_box_openings
  alter column card_1_id drop not null;

alter table public.surprise_box_openings
  alter column card_2_id drop not null;

-- Allow 0–1 cards (null) but still forbid duplicate card_1/card_2 when both are set.
alter table public.surprise_box_openings
  drop constraint if exists surprise_box_openings_distinct_cards_chk;

alter table public.surprise_box_openings
  add constraint surprise_box_openings_distinct_cards_chk check (
    card_1_id is null or card_2_id is null or card_1_id <> card_2_id
  );

comment on column public.surprise_box_openings.rewards_json is
  'Full open payload: coin amounts array + card ids/metadata (cards_per_open / coin_prizes_per_open from admin).';

-- 3) Extend general settings seed with admin-controlled composition (merge, do not overwrite entire doc).
-- 058 seeds surprise_box_general_settings with ON CONFLICT DO NOTHING; this is a safe fallback if the row is missing.
insert into public.reward_card_settings (setting_key, setting_value_json) values (
  'surprise_box_general_settings',
  '{
    "box_interval_minutes": 180,
    "max_pending_boxes": 1,
    "first_box_immediate": true,
    "prevent_duplicate_in_box": true,
    "cards_per_open": 2,
    "coin_prizes_per_open": 1
  }'::jsonb
) on conflict (setting_key) do nothing;

update public.reward_card_settings
set setting_value_json = setting_value_json
  || '{"cards_per_open":2,"coin_prizes_per_open":1}'::jsonb
where setting_key = 'surprise_box_general_settings'
  and not (setting_value_json ? 'cards_per_open');

update public.reward_card_settings
set setting_value_json = setting_value_json
  || '{"coin_prizes_per_open":1}'::jsonb
where setting_key = 'surprise_box_general_settings'
  and (setting_value_json ? 'cards_per_open')
  and not (setting_value_json ? 'coin_prizes_per_open');

-- Ensure max_pending_boxes exists (was seeded as 1 in 058).
update public.reward_card_settings
set setting_value_json = setting_value_json
  || '{"max_pending_boxes":1}'::jsonb
where setting_key = 'surprise_box_general_settings'
  and not (setting_value_json ? 'max_pending_boxes');
