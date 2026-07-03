-- Leo Game Club foundation (preparation — owner runs in Supabase)

-- Tables: guest feature permissions, player profiles, friends, invites,

-- missions, achievements, safe messages, cosmetics, events, tournaments, personal rooms



begin;



create table if not exists public.guest_feature_permissions (

  feature_key text primary key,

  enabled_for_guest boolean not null default false,

  updated_at timestamptz not null default now()

);



insert into public.guest_feature_permissions (feature_key, enabled_for_guest) values

  ('room_public_create', true),

  ('room_private_create', true),

  ('room_join_by_code', true),

  ('quick_game', true),

  ('invites_send', false),

  ('invites_receive', false),

  ('friends', false),

  ('safe_messages', true),

  ('shop', false),

  ('events', true),

  ('tournaments', false),

  ('missions', false),

  ('personal_room', false)

on conflict (feature_key) do nothing;



create table if not exists public.arcade_player_profiles (

  student_id uuid primary key references public.students(id) on delete cascade,

  display_name varchar(20),

  display_name_updated_at timestamptz,

  avatar_id integer,

  title_id integer,

  total_wins integer not null default 0,

  total_games integer not null default 0,

  favorite_game_key varchar,

  updated_at timestamptz not null default now()

);



create table if not exists public.arcade_friend_requests (

  id uuid primary key default gen_random_uuid(),

  from_student_id uuid not null references public.students(id) on delete cascade,

  to_student_id uuid not null references public.students(id) on delete cascade,

  status varchar(20) not null default 'pending',

  created_at timestamptz not null default now(),

  unique (from_student_id, to_student_id),

  check (from_student_id <> to_student_id)

);



create index if not exists idx_arcade_friend_requests_from_created

  on public.arcade_friend_requests (from_student_id, created_at desc);



create table if not exists public.arcade_friendships (

  id uuid primary key default gen_random_uuid(),

  student_a_id uuid not null references public.students(id) on delete cascade,

  student_b_id uuid not null references public.students(id) on delete cascade,

  created_at timestamptz not null default now(),

  unique (student_a_id, student_b_id),

  check (student_a_id < student_b_id)

);



create table if not exists public.arcade_presence (

  student_id uuid primary key references public.students(id) on delete cascade,

  last_seen_at timestamptz not null default now(),

  is_online boolean not null default false

);



create table if not exists public.arcade_invites (

  id uuid primary key default gen_random_uuid(),

  from_student_id uuid not null references public.students(id) on delete cascade,

  to_student_id uuid not null references public.students(id) on delete cascade,

  room_id uuid references public.arcade_rooms(id) on delete set null,

  game_key varchar not null,

  status varchar(20) not null default 'pending',

  expires_at timestamptz not null,

  created_at timestamptz not null default now(),

  check (from_student_id <> to_student_id)

);



create index if not exists idx_arcade_invites_to_pending

  on public.arcade_invites (to_student_id, status, expires_at);



create index if not exists idx_arcade_invites_from_created

  on public.arcade_invites (from_student_id, created_at desc);



create table if not exists public.arcade_daily_missions (

  id uuid primary key default gen_random_uuid(),

  game_key varchar,

  description_he text not null,

  goal_type varchar not null,

  goal_count integer not null default 1,

  reward_coins integer not null default 0,

  reward_badge_id integer,

  active boolean not null default true

);



create table if not exists public.arcade_player_mission_progress (

  student_id uuid not null references public.students(id) on delete cascade,

  mission_id uuid not null references public.arcade_daily_missions(id) on delete cascade,

  date date not null default current_date,

  progress integer not null default 0,

  completed_at timestamptz,

  primary key (student_id, mission_id, date)

);



create table if not exists public.arcade_achievements (

  id uuid primary key default gen_random_uuid(),

  key varchar unique not null,

  name_he varchar not null,

  description_he text,

  condition_type varchar not null,

  condition_value integer not null default 1,

  reward_badge_id integer

);



insert into public.arcade_achievements (key, name_he, description_he, condition_type, condition_value) values

  ('first_game', 'שחקן ראשון', 'שחק משחק ארקייד אחד', 'games_played', 1),

  ('ten_wins', '10 ניצחונות', 'נצח 10 פעמים', 'wins', 10),

  ('fifty_games', '50 משחקים', 'שחק 50 משחקי ארקייד', 'games_played', 50)

on conflict (key) do nothing;



create table if not exists public.arcade_player_achievements (

  student_id uuid not null references public.students(id) on delete cascade,

  achievement_id uuid not null references public.arcade_achievements(id) on delete cascade,

  unlocked_at timestamptz not null default now(),

  primary key (student_id, achievement_id)

);



create table if not exists public.arcade_safe_messages (

  id uuid primary key default gen_random_uuid(),

  text_he varchar not null,

  emoji varchar,

  category varchar,

  min_permission_level varchar not null default 'guest',

  active boolean not null default true

);



create table if not exists public.arcade_cosmetic_items (

  id uuid primary key default gen_random_uuid(),

  key varchar unique not null,

  name_he varchar not null,

  category varchar not null,

  price_coins integer not null default 0,

  rarity varchar,

  preview_url varchar,

  active boolean not null default true

);



create table if not exists public.arcade_player_cosmetics (

  student_id uuid not null references public.students(id) on delete cascade,

  item_id uuid not null references public.arcade_cosmetic_items(id) on delete cascade,

  equipped boolean not null default false,

  purchased_at timestamptz not null default now(),

  primary key (student_id, item_id)

);



create table if not exists public.arcade_reports (

  id uuid primary key default gen_random_uuid(),

  reporter_id uuid not null references public.students(id) on delete cascade,

  reported_id uuid not null references public.students(id) on delete cascade,

  reason text not null,

  created_at timestamptz not null default now(),

  reviewed_by uuid,

  reviewed_at timestamptz

);



create table if not exists public.arcade_blocks (

  id uuid primary key default gen_random_uuid(),

  blocker_id uuid not null references public.students(id) on delete cascade,

  blocked_id uuid not null references public.students(id) on delete cascade,

  created_at timestamptz not null default now(),

  unique (blocker_id, blocked_id)

);



create table if not exists public.arcade_events (

  id uuid primary key default gen_random_uuid(),

  title_he varchar not null,

  game_key varchar,

  event_type varchar not null,

  reward_coins integer not null default 0,

  reward_badge_id integer,

  starts_at timestamptz not null,

  ends_at timestamptz not null,

  active boolean not null default true

);



create table if not exists public.arcade_event_participation (

  student_id uuid not null references public.students(id) on delete cascade,

  event_id uuid not null references public.arcade_events(id) on delete cascade,

  completed_at timestamptz,

  reward_claimed boolean not null default false,

  primary key (student_id, event_id)

);



create table if not exists public.arcade_tournaments (

  id uuid primary key default gen_random_uuid(),

  title_he varchar not null,

  game_key varchar not null,

  max_players integer not null default 8,

  status varchar not null default 'registration',

  starts_at timestamptz,

  bracket_data jsonb,

  created_by_admin_id uuid

);



create table if not exists public.arcade_tournament_players (

  tournament_id uuid not null references public.arcade_tournaments(id) on delete cascade,

  student_id uuid not null references public.students(id) on delete cascade,

  seed integer,

  result varchar,

  primary key (tournament_id, student_id)

);



create table if not exists public.arcade_personal_rooms (

  student_id uuid primary key references public.students(id) on delete cascade,

  room_name varchar,

  background_id integer,

  decoration_slots jsonb not null default '[]'::jsonb,

  updated_at timestamptz not null default now()

);



alter table public.guest_feature_permissions enable row level security;

alter table public.arcade_player_profiles enable row level security;

alter table public.arcade_friend_requests enable row level security;

alter table public.arcade_friendships enable row level security;

alter table public.arcade_presence enable row level security;

alter table public.arcade_invites enable row level security;

alter table public.arcade_daily_missions enable row level security;

alter table public.arcade_player_mission_progress enable row level security;

alter table public.arcade_achievements enable row level security;

alter table public.arcade_player_achievements enable row level security;

alter table public.arcade_safe_messages enable row level security;

alter table public.arcade_cosmetic_items enable row level security;

alter table public.arcade_player_cosmetics enable row level security;

alter table public.arcade_reports enable row level security;

alter table public.arcade_blocks enable row level security;

alter table public.arcade_events enable row level security;

alter table public.arcade_event_participation enable row level security;

alter table public.arcade_tournaments enable row level security;

alter table public.arcade_tournament_players enable row level security;

alter table public.arcade_personal_rooms enable row level security;



commit;

