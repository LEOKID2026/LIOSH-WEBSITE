-- Site game catalog: unified Admin enable/disable for 21 games (online / offline / solo).
-- FOR REVIEW ONLY — run manually after owner approval. Does not touch coin tables or legacy /mleo-* pages.
--
-- Rollback (manual):
--   drop trigger if exists trg_site_game_catalog_sync_enabled on public.site_game_catalog;
--   drop function if exists public.sync_site_game_catalog_enabled();
--   drop function if exists public.site_game_category_has_enabled(text);
--   drop table if exists public.site_game_catalog;

begin;

create table if not exists public.site_game_catalog (
  game_key text primary key,
  category text not null check (category in ('online', 'offline', 'solo')),
  title_he text not null check (char_length(title_he) between 1 and 120),
  route text not null check (char_length(route) between 1 and 200),
  hub_route text null check (hub_route is null or char_length(hub_route) <= 200),
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  emoji text null check (emoji is null or char_length(emoji) <= 16),
  blurb_he text null check (blurb_he is null or char_length(blurb_he) <= 500),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_game_catalog_category_enabled_idx
  on public.site_game_catalog (category, is_enabled, sort_order);

comment on table public.site_game_catalog is
  'Admin master catalog for 21 site games (7 online + 4 offline + 10 solo). No legacy mleo-* entries.';

create or replace function public.site_game_category_has_enabled(p_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_game_catalog g
    where g.category = p_category
      and g.is_enabled = true
  );
$$;

revoke all on function public.site_game_category_has_enabled(text) from public;
grant execute on function public.site_game_category_has_enabled(text) to service_role;

create or replace function public.sync_site_game_catalog_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.is_enabled is not distinct from new.is_enabled then
    return new;
  end if;

  new.updated_at := now();

  if new.category = 'online' then
    update public.arcade_games
    set
      enabled = new.is_enabled,
      foundation_only = case when new.is_enabled then false else foundation_only end
    where game_key = new.game_key;
  elsif new.category = 'solo' then
    update public.reward_economy_solo_game_rules
    set
      is_active = new.is_enabled,
      updated_at = now()
    where game_key = new.game_key;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_site_game_catalog_enabled() from public;
grant execute on function public.sync_site_game_catalog_enabled() to service_role;

drop trigger if exists trg_site_game_catalog_sync_enabled on public.site_game_catalog;
create trigger trg_site_game_catalog_sync_enabled
before insert or update of is_enabled, category, game_key
on public.site_game_catalog
for each row
execute function public.sync_site_game_catalog_enabled();

insert into public.site_game_catalog (
  game_key, category, title_he, route, hub_route, is_enabled, sort_order, emoji, blurb_he
) values
  (
    'fourline', 'online', 'ארבע בשורה', '/student/games/fourline', '/student/arcade',
    coalesce((select enabled from public.arcade_games where game_key = 'fourline'), true),
    10, '🎯', 'ארבע בשורה מרובת משתתפים'
  ),
  (
    'ludo', 'online', 'לודו', '/student/games/ludo', '/student/arcade',
    coalesce((select enabled from public.arcade_games where game_key = 'ludo'), true),
    20, '🎲', 'לודו קלאסי עם חברים'
  ),
  (
    'snakes-and-ladders', 'online', 'נחשים וסולמות', '/student/games/snakes-and-ladders', '/student/arcade',
    coalesce((select enabled from public.arcade_games where game_key = 'snakes-and-ladders'), true),
    30, '🐍', 'נחשים וסולמות מרובי משתתפים'
  ),
  (
    'checkers', 'online', 'דמקה', '/student/games/checkers', '/student/arcade',
    coalesce((select enabled from public.arcade_games where game_key = 'checkers'), true),
    40, '♟️', 'דמקה מרובת משתתפים'
  ),
  (
    'chess', 'online', 'שחמט', '/student/games/chess', '/student/arcade',
    coalesce((select enabled from public.arcade_games where game_key = 'chess'), true),
    50, '♚', 'שחמט מרובה משתתפים'
  ),
  (
    'dominoes', 'online', 'דומינו', '/student/games/dominoes', '/student/arcade',
    coalesce((select enabled from public.arcade_games where game_key = 'dominoes'), true),
    60, '🁫', 'דומינו מרובה משתתפים'
  ),
  (
    'bingo', 'online', 'בינגו', '/student/games/bingo', '/student/arcade',
    coalesce((select enabled from public.arcade_games where game_key = 'bingo'), true),
    70, '🎱', 'בינגו מרובה משתתפים'
  ),
  ('tic-tac-toe', 'offline', 'איקס עיגול XL', '/offline/tic-tac-toe', '/offline', true, 10, '❌⭕️', 'לוחות מ 3×3 ועד 7×7'),
  ('rock-paper-scissors', 'offline', 'אבן · נייר · מספריים', '/offline/rock-paper-scissors', '/offline', true, 20, '🪨📄✂️', 'משחקים מהירים על אותו מכשיר'),
  ('tap-battle', 'offline', 'קרב הקשות', '/offline/tap-battle', '/offline', true, 30, '⚡️', 'מי מקיש הכי מהר?'),
  ('memory-match', 'offline', 'התאמת זיכרון', '/offline/memory-match', '/offline', true, 40, '🧠', 'התאמת זוגות על אותו מכשיר'),
  (
    'catcher', 'solo', 'תופס עם ליאו', '/student/solo-games/catcher', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'catcher'), true),
    10, '🎯', 'תפסו מטבעות והתרחקו מפצצות'
  ),
  (
    'flyer', 'solo', 'ליאו במטוס', '/student/solo-games/flyer', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'flyer'), true),
    20, '🪂', 'החזיקו לטוס ואספו מטבעות'
  ),
  (
    'puzzle', 'solo', 'חידת ליאו', '/student/solo-games/puzzle', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'puzzle'), true),
    30, '🧩', 'שלבו אריחים לפני שהזמן נגמר'
  ),
  (
    'memory', 'solo', 'זיכרון ליאו', '/student/solo-games/memory', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'memory'), true),
    40, '🧠', 'מצאו זוגות לפני שהשעון נגמר'
  ),
  (
    'leo-jump', 'solo', 'ליאו קופץ', '/student/solo-games/leo-jump', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'leo-jump'), true),
    50, '🦘', 'קפצו מעל מכשולים'
  ),
  (
    'balloons', 'solo', 'פיצוץ בלונים', '/student/solo-games/balloons', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'balloons'), true),
    60, '🎈', 'פוצצו בלונים לפני שהזמן נגמר'
  ),
  (
    'maze', 'solo', 'מבוך ליאו', '/student/solo-games/maze', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'maze'), true),
    70, '🌀', 'מצאו את היציאה במבוך'
  ),
  (
    'picture-puzzle', 'solo', 'פאזל תמונה', '/student/solo-games/picture-puzzle', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'picture-puzzle'), true),
    80, '🖼️', 'סדרו את חלקי התמונה'
  ),
  (
    'target-tap', 'solo', 'קליעה למטרה', '/student/solo-games/target-tap', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'target-tap'), true),
    90, '🎯', 'לחצו על המטרות בזמן'
  ),
  (
    'sort-shapes', 'solo', 'מיון צורות', '/student/solo-games/sort-shapes', '/student/solo-games',
    coalesce((select is_active from public.reward_economy_solo_game_rules where game_key = 'sort-shapes'), true),
    100, '🔺', 'מיינו צורות לתיבות הנכונות'
  )
on conflict (game_key) do update set
  category = excluded.category,
  title_he = excluded.title_he,
  route = excluded.route,
  hub_route = excluded.hub_route,
  sort_order = excluded.sort_order,
  emoji = excluded.emoji,
  blurb_he = excluded.blurb_he,
  updated_at = now();

alter table public.site_game_catalog enable row level security;

comment on column public.site_game_catalog.is_enabled is
  'Admin per-game toggle. Syncs to arcade_games.enabled (online) or reward_economy_solo_game_rules.is_active (solo).';

commit;
