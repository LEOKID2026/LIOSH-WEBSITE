-- Public worksheet visit analytics: allow visitor actor_type and index for funnel queries.
-- Owner applies manually in Supabase SQL editor. Agent must NOT run this migration.

begin;

create or replace function pg_temp.migration100_parse_actor_type_values(def text)
returns text[]
language plpgsql
immutable
as $func$
declare
  in_clause text;
  vals text[];
begin
  if def is null or btrim(def) = '' then
    return null;
  end if;

  in_clause := substring(def from 'actor_type\s+IN\s+\((.+)\)\s*$');
  if in_clause is null then
    in_clause := substring(def from 'actor_type\s*=\s*ANY\s*\(\s*(?:ARRAY\s*)?\[(.+)\]\s*\)');
  end if;
  if in_clause is null then
    return null;
  end if;

  select coalesce(array_agg(distinct m[1]), array[]::text[])
  into vals
  from regexp_matches(in_clause, '''([^'']+)''', 'g') as m;

  if coalesce(array_length(vals, 1), 0) = 0 then
    return null;
  end if;

  select array_agg(v order by v)
  into vals
  from unnest(vals) as v;

  return vals;
end;
$func$;

do $$
declare
  actor_check record;
  actor_check_count integer := 0;
  actor_check_name text;
  actor_check_def text;
  parsed_vals text[];
  expected_before text[] := array['admin', 'parent', 'student', 'system', 'teacher'];
  expected_after text[] := array['admin', 'parent', 'student', 'system', 'teacher', 'visitor'];
begin
  if to_regclass('public.analytics_events') is null then
    raise exception 'migration 100: public.analytics_events table does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'actor_type'
      and udt_name = 'text'
      and is_nullable = 'NO'
  ) then
    raise exception 'migration 100: public.analytics_events.actor_type text column not found';
  end if;

  for actor_check in
    select
      c.conname as constraint_name,
      pg_get_constraintdef(c.oid, true) as constraint_def
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'analytics_events'
      and c.contype = 'c'
      and (
        pg_get_constraintdef(c.oid, true) ~* 'actor_type\s+IN\s+\('
        or pg_get_constraintdef(c.oid, true) ~* 'actor_type\s*=\s*ANY\s*\('
      )
  loop
    actor_check_count := actor_check_count + 1;
    actor_check_name := actor_check.constraint_name;
    actor_check_def := actor_check.constraint_def;
  end loop;

  if actor_check_count = 0 then
    raise exception
      'migration 100: no actor_type CHECK constraint found on public.analytics_events';
  end if;

  if actor_check_count > 1 then
    raise exception
      'migration 100: multiple actor_type CHECK constraints found (% found)', actor_check_count;
  end if;

  parsed_vals := pg_temp.migration100_parse_actor_type_values(actor_check_def);
  if parsed_vals is null then
    raise exception
      'migration 100: could not parse actor_type CHECK values from constraint % (%)',
      actor_check_name,
      actor_check_def;
  end if;

  if parsed_vals = expected_after then
    null;
  elsif parsed_vals = expected_before then
    execute format(
      'alter table public.analytics_events drop constraint %I',
      actor_check_name
    );
    alter table public.analytics_events
      add constraint analytics_events_actor_type_check
      check (actor_type in ('parent', 'student', 'teacher', 'admin', 'system', 'visitor'));
  else
    raise exception
      'migration 100: unexpected actor_type CHECK values (%); expected exactly parent, student, teacher, admin, system or those plus visitor',
      array_to_string(parsed_vals, ', ');
  end if;
end $$;

drop index if exists public.analytics_events_public_worksheet_visit_idx;

create index analytics_events_public_worksheet_visit_idx
  on public.analytics_events (created_at desc, session_id)
  where actor_type = 'visitor'
    and event_name in ('public_worksheet_page_viewed', 'public_worksheet_generated');

comment on index public.analytics_events_public_worksheet_visit_idx is
  'Partial index for public worksheet visit funnel queries: actor_type + event_name fixed in predicate; created_at range scans.';

commit;
