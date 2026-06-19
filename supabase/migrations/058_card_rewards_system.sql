-- Card rewards collection, shop, surprise box, duplicate conversion, and admin-managed coin economy.
-- Owner applies manually in Supabase SQL editor. Agent must NOT run this migration.
--
-- Requires 001_learning_core_foundation.sql (students, parent_profiles, set_updated_at).
-- All student-facing writes go through service-role APIs; RLS denies authenticated by default
-- except parent read-only on selected student reward ledgers.

begin;

-- ===========================================================================
-- 1. Coin economy (admin-managed; REWARD_ECONOMY_SETTINGS_ENABLED gate in app)
-- ===========================================================================

create table if not exists public.reward_economy_daily_missions (
  id uuid primary key default gen_random_uuid(),
  mission_key text not null check (char_length(mission_key) between 1 and 80),
  grade_band text not null check (grade_band in ('g12', 'g34', 'g56')),
  name_he text not null check (char_length(name_he) between 1 and 120),
  text_he text not null check (char_length(text_he) between 1 and 240),
  mission_type text not null check (mission_type in ('questions', 'minutes', 'subjects')),
  target_value integer not null check (target_value > 0),
  reward_coins integer not null check (reward_coins > 0),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_economy_daily_missions_key_band_uq unique (mission_key, grade_band)
);

create index if not exists reward_economy_daily_missions_grade_band_idx
  on public.reward_economy_daily_missions (grade_band, display_order);

comment on table public.reward_economy_daily_missions is
  'Admin-configurable daily mission targets and coin rewards per grade band. Forward-only awards in app.';

create table if not exists public.reward_economy_monthly_tiers (
  id uuid primary key default gen_random_uuid(),
  minutes_threshold integer not null check (minutes_threshold > 0),
  reward_coins integer not null check (reward_coins > 0),
  label_he text not null check (char_length(label_he) between 1 and 120),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_economy_monthly_tiers_minutes_uq unique (minutes_threshold)
);

create index if not exists reward_economy_monthly_tiers_display_order_idx
  on public.reward_economy_monthly_tiers (display_order);

comment on table public.reward_economy_monthly_tiers is
  'Admin-configurable monthly persistence tiers (highest tier only, non-cumulative).';

create table if not exists public.reward_economy_global_settings (
  id uuid primary key default gen_random_uuid(),
  monthly_minutes_cap integer not null default 600 check (monthly_minutes_cap > 0),
  monthly_coins_cap integer not null default 100000 check (monthly_coins_cap > 0),
  updated_at timestamptz not null default now()
);

comment on table public.reward_economy_global_settings is
  'Singleton row for monthly progress/coin caps shown in child UI and admin economy tab.';

create table if not exists public.reward_economy_change_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  setting_area text not null check (char_length(setting_area) between 1 and 80),
  entity_key text null check (entity_key is null or char_length(entity_key) <= 160),
  field_name text not null check (char_length(field_name) between 1 and 120),
  old_value_json jsonb null,
  new_value_json jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists reward_economy_change_log_created_at_idx
  on public.reward_economy_change_log (created_at desc);

create index if not exists reward_economy_change_log_admin_user_idx
  on public.reward_economy_change_log (admin_user_id);

comment on table public.reward_economy_change_log is
  'Append-only admin audit trail for economy setting changes. Service-role only.';

-- ===========================================================================
-- 2. Card catalog and settings
-- ===========================================================================

create table if not exists public.reward_card_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique check (char_length(setting_key) between 1 and 120),
  setting_value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_card_settings_value_json_chk
    check (jsonb_typeof(setting_value_json) in ('object', 'array', 'number', 'boolean'))
);

comment on table public.reward_card_settings is
  'Dynamic card/shop/box/conversion settings. Service-role admin APIs only.';

create table if not exists public.reward_card_series (
  id uuid primary key default gen_random_uuid(),
  name_he text not null check (char_length(name_he) between 1 and 120),
  slug text not null unique check (char_length(slug) between 1 and 80),
  description_he text null check (description_he is null or char_length(description_he) <= 500),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reward_card_series_display_order_idx
  on public.reward_card_series (display_order);

comment on table public.reward_card_series is
  'Card series for shop and achievement collections.';

create table if not exists public.reward_cards (
  id uuid primary key default gen_random_uuid(),
  card_key text null unique check (card_key is null or char_length(card_key) between 1 and 80),
  name_he text not null check (char_length(name_he) between 1 and 120),
  description_he text null check (description_he is null or char_length(description_he) <= 500),
  image_url text null check (image_url is null or char_length(image_url) <= 500),
  series_id uuid not null references public.reward_card_series (id) on delete restrict,
  rarity text not null check (rarity in ('regular', 'special', 'rare', 'gold')),
  card_type text not null check (card_type in ('achievement', 'shop', 'event')),
  event_reward_mode text null check (
    event_reward_mode is null
    or event_reward_mode in ('achievement', 'shop', 'box')
  ),
  subject text null check (subject is null or char_length(subject) <= 80),
  topic text null check (topic is null or char_length(topic) <= 160),
  price_coins integer null check (price_coins is null or price_coins >= 0),
  use_default_price boolean not null default true,
  can_be_purchased boolean not null default false,
  can_appear_in_surprise_box boolean not null default false,
  box_weight integer null check (box_weight is null or box_weight >= 0),
  is_active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_cards_event_mode_chk check (
    card_type != 'event' or event_reward_mode is not null
  ),
  constraint reward_cards_achievement_flags_chk check (
    card_type != 'achievement'
    or (can_be_purchased = false and can_appear_in_surprise_box = false)
  )
);

create index if not exists reward_cards_series_id_idx
  on public.reward_cards (series_id);

create index if not exists reward_cards_card_type_idx
  on public.reward_cards (card_type, is_active);

create index if not exists reward_cards_rarity_idx
  on public.reward_cards (rarity);

create index if not exists reward_cards_card_key_idx
  on public.reward_cards (card_key)
  where card_key is not null;

comment on table public.reward_cards is
  'Full card catalog: shop, achievement, and timed event cards.';

create table if not exists public.reward_card_rules (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.reward_cards (id) on delete cascade,
  rule_type text not null check (char_length(rule_type) between 1 and 80),
  subject text null check (subject is null or char_length(subject) <= 80),
  topic text null check (topic is null or char_length(topic) <= 160),
  min_questions integer null check (min_questions is null or min_questions >= 0),
  min_accuracy numeric(5, 2) null check (
    min_accuracy is null or (min_accuracy >= 0 and min_accuracy <= 100)
  ),
  min_streak_days integer null check (min_streak_days is null or min_streak_days >= 0),
  min_completed_activities integer null check (
    min_completed_activities is null or min_completed_activities >= 0
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reward_card_rules_card_id_idx
  on public.reward_card_rules (card_id);

comment on table public.reward_card_rules is
  'Achievement card unlock rules evaluated by server-side achievement evaluator.';

-- ===========================================================================
-- 3. Per-student card state
-- ===========================================================================

create table if not exists public.student_reward_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  card_id uuid not null references public.reward_cards (id) on delete restrict,
  owned boolean not null default true,
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_reward_cards_student_card_uq unique (student_id, card_id)
);

create index if not exists student_reward_cards_student_id_idx
  on public.student_reward_cards (student_id);

create index if not exists student_reward_cards_card_id_idx
  on public.student_reward_cards (card_id);

comment on table public.student_reward_cards is
  'Student-owned cards and duplicate counts for shop/box cards only.';

create table if not exists public.surprise_box_state (
  student_id uuid primary key references public.students (id) on delete cascade,
  has_pending_box boolean not null default false,
  first_box_given boolean not null default false,
  last_opened_at timestamptz null,
  next_available_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.surprise_box_state is
  'One pending box max per student; no accumulation counter. Server-time only.';

create table if not exists public.surprise_box_openings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  opened_at timestamptz not null default now(),
  coins_reward integer not null check (coins_reward >= 0),
  card_1_id uuid not null references public.reward_cards (id) on delete restrict,
  card_2_id uuid not null references public.reward_cards (id) on delete restrict,
  card_1_was_duplicate boolean not null default false,
  card_2_was_duplicate boolean not null default false,
  created_at timestamptz not null default now(),
  constraint surprise_box_openings_distinct_cards_chk check (card_1_id <> card_2_id)
);

create index if not exists surprise_box_openings_student_id_idx
  on public.surprise_box_openings (student_id, opened_at desc);

comment on table public.surprise_box_openings is
  'Immutable log of surprise box opens (coins + two cards).';

create table if not exists public.reward_card_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  card_id uuid null references public.reward_cards (id) on delete set null,
  transaction_type text not null check (
    transaction_type in (
      'earned_achievement',
      'shop_purchase',
      'surprise_box_reward',
      'duplicate_conversion',
      'admin_grant'
    )
  ),
  coins_before integer null check (coins_before is null or coins_before >= 0),
  coins_after integer null check (coins_after is null or coins_after >= 0),
  coins_amount integer not null default 0,
  reason text not null check (char_length(reason) between 1 and 160),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint reward_card_transactions_metadata_object_chk
    check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists reward_card_transactions_student_id_idx
  on public.reward_card_transactions (student_id, created_at desc);

create index if not exists reward_card_transactions_card_id_idx
  on public.reward_card_transactions (card_id)
  where card_id is not null;

comment on table public.reward_card_transactions is
  'Card reward ledger mirroring coin side-effects for shop/box/conversion/achievement grants.';

create table if not exists public.reward_card_conversions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  card_id uuid not null references public.reward_cards (id) on delete restrict,
  duplicates_spent integer not null check (duplicates_spent > 0),
  coins_received integer not null check (coins_received > 0),
  created_at timestamptz not null default now()
);

create index if not exists reward_card_conversions_student_id_idx
  on public.reward_card_conversions (student_id, created_at desc);

comment on table public.reward_card_conversions is
  'Duplicate-to-coins conversion history.';

-- ===========================================================================
-- 4. updated_at triggers
-- ===========================================================================

drop trigger if exists trg_reward_economy_daily_missions_set_updated_at
  on public.reward_economy_daily_missions;
create trigger trg_reward_economy_daily_missions_set_updated_at
  before update on public.reward_economy_daily_missions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_economy_monthly_tiers_set_updated_at
  on public.reward_economy_monthly_tiers;
create trigger trg_reward_economy_monthly_tiers_set_updated_at
  before update on public.reward_economy_monthly_tiers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_economy_global_settings_set_updated_at
  on public.reward_economy_global_settings;
create trigger trg_reward_economy_global_settings_set_updated_at
  before update on public.reward_economy_global_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_card_settings_set_updated_at
  on public.reward_card_settings;
create trigger trg_reward_card_settings_set_updated_at
  before update on public.reward_card_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_card_series_set_updated_at
  on public.reward_card_series;
create trigger trg_reward_card_series_set_updated_at
  before update on public.reward_card_series
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_cards_set_updated_at
  on public.reward_cards;
create trigger trg_reward_cards_set_updated_at
  before update on public.reward_cards
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_card_rules_set_updated_at
  on public.reward_card_rules;
create trigger trg_reward_card_rules_set_updated_at
  before update on public.reward_card_rules
  for each row execute function public.set_updated_at();

drop trigger if exists trg_student_reward_cards_set_updated_at
  on public.student_reward_cards;
create trigger trg_student_reward_cards_set_updated_at
  before update on public.student_reward_cards
  for each row execute function public.set_updated_at();

drop trigger if exists trg_surprise_box_state_set_updated_at
  on public.surprise_box_state;
create trigger trg_surprise_box_state_set_updated_at
  before update on public.surprise_box_state
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- 5. RLS — deny authenticated by default; parent read on selected student tables
-- ===========================================================================

alter table public.reward_economy_daily_missions enable row level security;
alter table public.reward_economy_monthly_tiers enable row level security;
alter table public.reward_economy_global_settings enable row level security;
alter table public.reward_economy_change_log enable row level security;
alter table public.reward_card_settings enable row level security;
alter table public.reward_card_series enable row level security;
alter table public.reward_cards enable row level security;
alter table public.reward_card_rules enable row level security;
alter table public.student_reward_cards enable row level security;
alter table public.surprise_box_state enable row level security;
alter table public.surprise_box_openings enable row level security;
alter table public.reward_card_transactions enable row level security;
alter table public.reward_card_conversions enable row level security;

drop policy if exists student_reward_cards_parent_read_owned on public.student_reward_cards;
create policy student_reward_cards_parent_read_owned
  on public.student_reward_cards
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_reward_cards.student_id
        and s.parent_id = auth.uid()
    )
  );

drop policy if exists surprise_box_openings_parent_read_owned on public.surprise_box_openings;
create policy surprise_box_openings_parent_read_owned
  on public.surprise_box_openings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = surprise_box_openings.student_id
        and s.parent_id = auth.uid()
    )
  );

drop policy if exists reward_card_transactions_parent_read_owned on public.reward_card_transactions;
create policy reward_card_transactions_parent_read_owned
  on public.reward_card_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = reward_card_transactions.student_id
        and s.parent_id = auth.uid()
    )
  );

-- ===========================================================================
-- 6. Seed — coin economy (matches legacy MISSION_POOL + MONTHLY_PERSISTENCE_TIERS)
-- ===========================================================================

insert into public.reward_economy_daily_missions (
  mission_key, grade_band, name_he, text_he, mission_type, target_value, reward_coins, display_order
) values
  ('questions_10', 'g12', '10 שאלות', 'ענה על 10 שאלות היום', 'questions', 10, 20, 1),
  ('minutes_5',    'g12', '5 דקות',   'למד 5 דקות היום',          'minutes',   5,  20, 2),
  ('subjects_1',   'g12', 'מקצוע אחד', 'תרגל מקצוע אחד לפחות',    'subjects',  1,  20, 3),
  ('questions_15', 'g34', '15 שאלות', 'ענה על 15 שאלות היום',    'questions', 15, 20, 1),
  ('minutes_8',    'g34', '8 דקות',   'למד 8 דקות היום',          'minutes',   8,  20, 2),
  ('subjects_2',   'g34', 'שני מקצועות', 'תרגל שני מקצועות שונים',  'subjects',  2,  20, 3),
  ('questions_20', 'g56', '20 שאלות', 'ענה על 20 שאלות היום',    'questions', 20, 20, 1),
  ('minutes_10',   'g56', '10 דקות',  'למד 10 דקות היום',         'minutes',   10, 20, 2),
  ('subjects_2',   'g56', 'שני מקצועות', 'תרגל שני מקצועות שונים',  'subjects',  2,  20, 3)
on conflict (mission_key, grade_band) do nothing;

insert into public.reward_economy_monthly_tiers (
  minutes_threshold, reward_coins, label_he, display_order
) values
  (100, 10000,  '100 דקות התמדה', 1),
  (250, 30000,  '250 דקות התמדה', 2),
  (400, 60000,  '400 דקות התמדה', 3),
  (600, 100000, '600 דקות התמדה', 4)
on conflict (minutes_threshold) do nothing;

insert into public.reward_economy_global_settings (id, monthly_minutes_cap, monthly_coins_cap)
values ('00000000-0000-4000-8000-000000000058'::uuid, 600, 100000)
on conflict (id) do nothing;

-- ===========================================================================
-- 7. Seed — card settings
-- ===========================================================================

insert into public.reward_card_settings (setting_key, setting_value_json) values
  (
    'shop_default_prices',
    '{"regular":8000,"special":18000,"rare":40000,"gold":90000}'::jsonb
  ),
  (
    'surprise_box_coin_rewards',
    '[
      {"amount":500,"weight":4500},
      {"amount":1000,"weight":3000},
      {"amount":2000,"weight":1500},
      {"amount":4000,"weight":800},
      {"amount":10000,"weight":200}
    ]'::jsonb
  ),
  (
    'surprise_box_card_rarity_weights',
    '{"regular":7800,"special":1700,"rare":450,"gold":50}'::jsonb
  ),
  (
    'duplicate_conversion_values',
    '{"regular":2500,"special":6000,"rare":15000,"gold":35000}'::jsonb
  ),
  (
    'surprise_box_general_settings',
    '{
      "box_interval_minutes":180,
      "max_pending_boxes":1,
      "first_box_immediate":true,
      "prevent_duplicate_in_box":true
    }'::jsonb
  ),
  ('duplicate_threshold', '10'::jsonb),
  ('system_enabled', 'false'::jsonb)
on conflict (setting_key) do nothing;

-- ===========================================================================
-- 8. Seed — card series
-- ===========================================================================

insert into public.reward_card_series (slug, name_he, description_he, display_order) values
  ('animals',     'חיות',         'קלפי חיות מגניבות',              1),
  ('space',       'חלל',          'קלפי חלל וכוכבים',               2),
  ('dinosaurs',   'דינוזאורים',   'קלפי דינוזאורים אמיצים',         3),
  ('robots',      'רובוטים',      'קלפי רובוטים חכמים',             4),
  ('heroes',      'גיבורי למידה','קלפי גיבורים שלומדים',           5),
  ('fantasy',     'פנטזיה',       'קלפי קסם ודרקונים',             6),
  ('nature',      'טבע',          'קלפי טבע וחיות בר',             7),
  ('football',    'כדורגל',       'קלפי כדורגל וספורט',             8),
  ('math',        'חשבון',        'קלפי הישג בחשבון',               9),
  ('hebrew',      'עברית',        'קלפי הישג בעברית',              10),
  ('english',     'אנגלית',       'קלפי הישג באנגלית',             11),
  ('science',     'מדעים',        'קלפי הישג במדעים',              12),
  ('geometry',    'גיאומטריה',    'קלפי הישג בגיאומטריה',          13),
  ('moledet',     'מולדת',        'קלפי הישג במולדת',              14),
  ('general',     'כללי',         'קלפי הישג כלליים',              15),
  ('persistence', 'התמדה',        'קלפי הישג בהתמדה',              16)
on conflict (slug) do nothing;

-- ===========================================================================
-- 9. Seed — shop cards (36 across shop series; >= 32 required)
-- ===========================================================================

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select
  v.card_key,
  v.name_he,
  v.description_he,
  '/rewards/cards/shop/' || s.slug || '/' || v.card_key || '.svg',
  s.id,
  v.rarity,
  'shop',
  true,
  true,
  true,
  true
from (
  values
    -- animals (6)
    ('animals',     'lion_gold',       'אריה זהב',       'אריה מוזהב עוצמתי',           'gold'),
    ('animals',     'tiger_fast',      'נמר מהיר',       'נמר מהיר וזריז',              'special'),
    ('animals',     'panda_happy',     'פנדה שמחה',      'פנדה שמח ואוהב',              'regular'),
    ('animals',     'dog_loyal',       'כלב נאמן',       'כלב נאמן ואוהב',              'regular'),
    ('animals',     'bear_strong',     'דוב חזק',        'דוב חזק ואמיץ',               'regular'),
    ('animals',     'fox_clever',      'שועל זריז',      'שועל חכם וזריז',              'special'),
    -- space (6)
    ('space',       'space_cat',       'חתול חלל',       'חתול אמיץ בחלל',              'special'),
    ('space',       'star_rocket',     'טיל כוכבים',     'טיל שטס בין כוכבים',          'regular'),
    ('space',       'green_star',      'כוכב ירוק',      'כוכב ירוק זוהר',              'regular'),
    ('space',       'space_pilot',     'טייס חלל',       'טייס חלל מנוסה',             'regular'),
    ('space',       'cute_alien',      'חייזר חמוד',     'חייזר חמוד מכוכב רחוק',       'special'),
    ('space',       'nebula_glow',     'ערפילית זוהרת',  'ערפילית צבעונית בחלל',        'rare'),
    -- dinosaurs (4)
    ('dinosaurs',   'blue_dino',       'דינוזאור כחול',  'דינוזאור כחול ידידותי',       'regular'),
    ('dinosaurs',   'trex_mighty',     'טי-רекс',        'טי-רекс עוצמתי',              'special'),
    ('dinosaurs',   'ptero_fly',       'פטרוזאור',       'פטרוזאור שט בגובה',           'regular'),
    ('dinosaurs',   'tri_guard',       'טריצרטופס',      'טריצרטופס עם קרניים',         'rare'),
    -- robots (4)
    ('robots',      'smart_robot',     'רובוט חכם',      'רובוט חכם שעוזר ללמוד',       'special'),
    ('robots',      'silver_robot',    'רובוט כסוף',     'רובוט כסוף מבריק',            'regular'),
    ('robots',      'gold_robot',      'רובוט זהב',      'רובוט זהב נדיר',              'gold'),
    ('robots',      'helper_bot',      'עוזר רובוט',     'רובוט עוזר קטן',              'regular'),
    -- heroes (4)
    ('heroes',      'learning_hero',   'גיבור למידה',    'גיבור שלומד כל יום',          'regular'),
    ('heroes',      'class_star',      'כוכב הכיתה',     'כוכב שמאיר בכיתה',            'special'),
    ('heroes',      'number_hero',     'גיבור המספרים',  'גיבור שאוהב מספרים',          'regular'),
    ('heroes',      'persistence_hero','גיבור התמדה',    'גיבור שלא מוותר',             'rare'),
    -- fantasy (4)
    ('fantasy',     'little_dragon',   'דרקון קטן',      'דרקון קטן וחמוד',             'special'),
    ('fantasy',     'magic_shield',    'מגן הקסם',       'מגן קסום מגן',                'regular'),
    ('fantasy',     'green_spell',     'קסם ירוק',       'קסם ירוק מנצח',               'regular'),
    ('fantasy',     'golden_knight',   'אביר זהב',       'אביר זהב אמיץ',               'gold'),
    -- nature (4)
    ('nature',      'wise_owl',        'ינשוף חכם',      'ינשוף חכם ביער',              'special'),
    ('nature',      'wise_turtle',     'צב חכם',         'צב חכם וסבלני',               'regular'),
    ('nature',      'color_flower',    'פרח צבעוני',     'פרח צבעוני בטבע',             'regular'),
    ('nature',      'magic_forest',    'יער קסום',       'יער קסום מלא חיים',           'rare'),
    -- football (4)
    ('football',    'gold_striker',    'כדורגלן זהב',    'כדורגלן מוזהב',               'gold'),
    ('football',    'top_goalkeeper',  'שוער מעולה',     'שוער שומר על השער',           'special'),
    ('football',    'goal_king',       'מלך השערים',     'מלך שמבקיע שערים',            'regular'),
    ('football',    'field_star',      'כוכב המגרש',     'כוכב שמאיר על המגרש',         'regular')
) as v(slug, card_key, name_he, description_he, rarity)
join public.reward_card_series s on s.slug = v.slug
on conflict (card_key) do nothing;

-- ===========================================================================
-- 10. Seed — achievement cards (24+) with rules
-- ===========================================================================

insert into public.reward_cards (
  card_key, name_he, description_he, image_url, series_id, rarity, card_type,
  subject, topic, use_default_price, can_be_purchased, can_appear_in_surprise_box, is_active
)
select
  v.card_key,
  v.name_he,
  v.description_he,
  '/rewards/cards/achievements/' || s.slug || '/' || v.card_key || '.svg',
  s.id,
  v.rarity,
  'achievement',
  v.subject,
  v.topic,
  true,
  false,
  false,
  true
from (
  values
    ('general',     'strong_start',        'מתחיל חזק',        'סיים 20 שאלות כלליות',              'regular', null,    null),
    ('general',     'week_star',           'כוכב השבוע',       'סיים 100 שאלות בשבוע',              'special', null,    null),
    ('general',     'never_give_up',       'לא מוותר',         'שיפור בנושא שהיה חלש',              'rare',    null,    null),
    ('general',     'mission_done',        'משימה הושלמה',     'סיים פעילות אישית מהורה',           'regular', null,    null),
    ('general',     'question_master',     'מאסטר שאלות',      'סיים 50 שאלות כלליות',              'special', null,    null),
    ('general',     'power_week',          'שבוע חזק',         '200 שאלות בשבוע',                   'gold',    null,    null),
    ('persistence', 'streak_3',            'מתמיד 3 ימים',     'למד 3 ימים ברצף',                   'regular', null,    null),
    ('persistence', 'streak_7',            'מתמיד 7 ימים',     'למד 7 ימים ברצף',                   'special', null,    null),
    ('persistence', 'streak_14',           'לוחם התמדה',       'למד 14 ימים ברצף',                  'rare',    null,    null),
    ('math',        'number_explorer',     'חוקר המספרים',     '30 שאלות בחשבון',                   'regular', 'math',  null),
    ('math',        'math_star',           'כוכב חשבון',       '50 שאלות בחשבון',                   'special', 'math',  null),
    ('math',        'multiplication_champ','אלוף הכפל',         '80% הצלחה בכפל עם 30 שאלות',        'gold',    'math',  'multiplication'),
    ('hebrew',      'young_reader',        'קורא צעיר',        '30 שאלות בעברית',                   'regular', 'hebrew', null),
    ('hebrew',      'winning_reader',      'קורא מנצח',        '50 שאלות בעברית',                   'special', 'hebrew', null),
    ('hebrew',      'word_discoverer',     'מגלה מילים',       'הצלחה באוצר מילים',                'rare',    'hebrew', 'vocabulary'),
    ('english',     'english_star',        'כוכב אנגלית',      '30 שאלות באנגלית',                  'regular', 'english', null),
    ('english',     'english_speaker',     'דובר אנגלית',      '50 שאלות באנגלית',                  'special', 'english', null),
    ('science',     'nature_explorer',     'חוקר הטבע',        '30 שאלות במדעים',                   'regular', 'science', null),
    ('science',     'young_scientist',     'מדען צעיר',        '50 שאלות במדעים',                   'special', 'science', null),
    ('geometry',    'geometry_ace',        'אלוף הגיאומטריה',  '30 שאלות בגיאומטריה',               'regular', 'geometry', null),
    ('geometry',    'shape_master',        'גיאומטר מוכשר',    '50 שאלות בגיאומטריה',               'special', 'geometry', null),
    ('moledet',     'homeland_explorer',   'חוקר המולדת',      '30 שאלות במולדת',                   'regular', 'moledet', null),
    ('moledet',     'homeland_scholar',    'ידע מולדת',        '50 שאלות במולדת',                   'special', 'moledet', null),
    ('general',     'parent_activity',     'פעילות מהורה',     'סיים פעילות אישית מהורה',           'regular', null,    null)
) as v(slug, card_key, name_he, description_he, rarity, subject, topic)
join public.reward_card_series s on s.slug = v.slug
on conflict (card_key) do nothing;

insert into public.reward_card_rules (
  card_id, rule_type, subject, topic, min_questions, min_accuracy, min_streak_days, min_completed_activities
)
select
  c.id,
  r.rule_type,
  r.subject,
  r.topic,
  r.min_questions,
  r.min_accuracy,
  r.min_streak_days,
  r.min_completed_activities
from (
  values
    ('strong_start',         'total_questions',          null,      null,           20,   null,  null, null),
    ('week_star',            'weekly_questions',         null,      null,          100,   null,  null, null),
    ('never_give_up',        'subject_improvement',      null,      null,           null, null,  null, null),
    ('mission_done',         'parent_activity_complete', null,      null,           null, null,  null,    1),
    ('question_master',      'total_questions',          null,      null,           50,   null,  null, null),
    ('power_week',           'weekly_questions',         null,      null,          200,   null,  null, null),
    ('streak_3',             'learning_streak_days',     null,      null,           null, null,     3, null),
    ('streak_7',             'learning_streak_days',     null,      null,           null, null,     7, null),
    ('streak_14',            'learning_streak_days',     null,      null,           null, null,    14, null),
    ('number_explorer',      'subject_questions',        'math',    null,           30,   null,  null, null),
    ('math_star',            'subject_questions',        'math',    null,           50,   null,  null, null),
    ('multiplication_champ', 'subject_accuracy',         'math',    'multiplication', 30, 80.00, null, null),
    ('young_reader',         'subject_questions',        'hebrew',  null,           30,   null,  null, null),
    ('winning_reader',       'subject_questions',        'hebrew',  null,           50,   null,  null, null),
    ('word_discoverer',      'subject_accuracy',         'hebrew',  'vocabulary',   20,   70.00, null, null),
    ('english_star',         'subject_questions',        'english', null,           30,   null,  null, null),
    ('english_speaker',      'subject_questions',        'english', null,           50,   null,  null, null),
    ('nature_explorer',      'subject_questions',        'science', null,           30,   null,  null, null),
    ('young_scientist',      'subject_questions',        'science', null,           50,   null,  null, null),
    ('geometry_ace',         'subject_questions',        'geometry', null,          30,   null,  null, null),
    ('shape_master',         'subject_questions',        'geometry', null,          50,   null,  null, null),
    ('homeland_explorer',    'subject_questions',        'moledet', null,           30,   null,  null, null),
    ('homeland_scholar',     'subject_questions',        'moledet', null,           50,   null,  null, null),
    ('parent_activity',      'parent_activity_complete', null,      null,           null, null,  null,    1)
) as r(card_key, rule_type, subject, topic, min_questions, min_accuracy, min_streak_days, min_completed_activities)
join public.reward_cards c on c.card_key = r.card_key and c.card_type = 'achievement'
where not exists (
  select 1
  from public.reward_card_rules existing
  where existing.card_id = c.id
);

commit;
