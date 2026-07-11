-- Parent subject permissions — catalog, per-student permissions, preferences, audit, RPCs.
-- FOR REVIEW ONLY — owner runs manually. Agent must NOT run this migration.
--
-- Prerequisites: students (with account_kind), parent_profiles, auth.users.
-- Seed matrix: data/subject-permissions/subject-grade-defaults.matrix.json via
--   scripts/build-subject-grade-catalog-seed.mjs → data/subject-permissions/subject-grade-catalog-seed.sql
--
-- Rollback (manual, destructive):
--   revoke/grant cleanup for RPCs and helpers (see bottom comments)
--   drop function create_parent_student_with_subject_defaults(uuid,uuid,text,text) cascade;
--   drop function apply_parent_student_grade_change(uuid,uuid,uuid,text) cascade;
--   drop function ensure_parent_student_learning_permissions(uuid,uuid,uuid) cascade;
--   drop function set_parent_student_subject_permission(uuid,uuid,uuid,text,boolean) cascade;
--   drop function enable_all_parent_student_subjects(uuid,uuid,uuid) cascade;
--   drop function set_parent_student_grade_picker(uuid,uuid,uuid,boolean) cascade;
--   drop function subject_perm_build_state(uuid) cascade;
--   drop function subject_perm_ensure_missing_internal(uuid,uuid,uuid) cascade;
--   drop function subject_perm_verify_parent_student(uuid,uuid) cascade;
--   drop function subject_perm_verify_catalog_complete() cascade;
--   drop function subject_perm_active_count() cascade;
--   drop table if exists public.student_subject_permissions_change_log;
--   drop table if exists public.student_learning_access_preferences;
--   drop table if exists public.student_subject_permissions;
--   drop table if exists public.subject_grade_default_catalog;
--   drop table if exists public.subject_permission_catalog;

begin;

-- ---------------------------------------------------------------------------
-- Catalog tables
-- ---------------------------------------------------------------------------

create table if not exists public.subject_permission_catalog (
  subject_key     text        primary key,
  display_name_he text        not null,
  sort_order      integer     not null,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now()
);

comment on table public.subject_permission_catalog is
  'Active learning subjects for parent permission control. N = count where is_active = true.';

create table if not exists public.subject_grade_default_catalog (
  grade_key             text    not null,
  subject_key           text    not null
                                    references public.subject_permission_catalog (subject_key)
                                    on delete cascade,
  is_grade_suitable     boolean not null,
  is_enabled_by_default boolean not null,
  primary key (grade_key, subject_key)
);

comment on table public.subject_grade_default_catalog is
  'Per-grade default suitability and enabled flags. Operational queries JOIN is_active catalog rows only.';

-- ---------------------------------------------------------------------------
-- Per-student permissions and preferences
-- ---------------------------------------------------------------------------

create table if not exists public.student_subject_permissions (
  student_id  uuid        not null
                            references public.students (id) on delete cascade,
  subject_key text        not null
                            references public.subject_permission_catalog (subject_key)
                            on delete restrict,
  is_enabled  boolean     not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        null
                            references auth.users (id) on delete set null,
  unique (student_id, subject_key)
);

comment on table public.student_subject_permissions is
  'Parent-controlled subject locks per registered child. Writes only via service-role RPCs.';

create index if not exists student_subject_permissions_student_idx
  on public.student_subject_permissions (student_id);

create table if not exists public.student_learning_access_preferences (
  student_id                  uuid        primary key
                                          references public.students (id) on delete cascade,
  allow_student_grade_picker  boolean     not null default false,
  updated_at                  timestamptz not null default now(),
  updated_by                  uuid        null
                                          references auth.users (id) on delete set null
);

comment on table public.student_learning_access_preferences is
  'Parent-controlled grade picker permission per registered child.';

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.student_subject_permissions_change_log (
  id                    uuid        primary key default gen_random_uuid(),
  student_id            uuid        not null
                                    references public.students (id) on delete cascade,
  field_name            text        not null,
  old_value             boolean     null,
  new_value             boolean     not null,
  changed_by            uuid        null
                                    references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  reason                text        not null
                                    check (reason in (
                                      'initial_seed',
                                      'parent_toggle',
                                      'enable_all',
                                      'grade_change_reset',
                                      'backfill',
                                      'grade_picker_toggle'
                                    )),
  previous_grade_level  text        null,
  new_grade_level       text        null
);

comment on table public.student_subject_permissions_change_log is
  'Append-only audit for subject permission and grade-picker changes.';

create index if not exists student_subject_permissions_change_log_student_idx
  on public.student_subject_permissions_change_log (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Seed catalog (from resolver artifact — data/subject-permissions/subject-grade-catalog-seed.sql)
-- ---------------------------------------------------------------------------

insert into public.subject_permission_catalog (subject_key, display_name_he, sort_order, is_active)
values
  ('math', 'מתמטיקה', 1, true),
  ('geometry', 'גאומטריה', 2, true),
  ('hebrew', 'עברית', 3, true),
  ('english', 'אנגלית', 4, true),
  ('science', 'מדעים', 5, true),
  ('history', 'היסטוריה', 6, true),
  ('moledet', 'מולדת', 7, true),
  ('geography', 'גאוגרפיה', 8, true)
on conflict (subject_key) do update set
  display_name_he = excluded.display_name_he,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.subject_grade_default_catalog (grade_key, subject_key, is_grade_suitable, is_enabled_by_default)
values
  ('g1', 'math', true, true),
  ('g1', 'geometry', true, true),
  ('g1', 'hebrew', true, true),
  ('g1', 'english', true, true),
  ('g1', 'science', true, true),
  ('g1', 'history', false, false),
  ('g1', 'moledet', false, false),
  ('g1', 'geography', false, false),
  ('g2', 'math', true, true),
  ('g2', 'geometry', true, true),
  ('g2', 'hebrew', true, true),
  ('g2', 'english', true, true),
  ('g2', 'science', true, true),
  ('g2', 'history', false, false),
  ('g2', 'moledet', true, true),
  ('g2', 'geography', false, false),
  ('g3', 'math', true, true),
  ('g3', 'geometry', true, true),
  ('g3', 'hebrew', true, true),
  ('g3', 'english', true, true),
  ('g3', 'science', true, true),
  ('g3', 'history', false, false),
  ('g3', 'moledet', true, true),
  ('g3', 'geography', false, false),
  ('g4', 'math', true, true),
  ('g4', 'geometry', true, true),
  ('g4', 'hebrew', true, true),
  ('g4', 'english', true, true),
  ('g4', 'science', true, true),
  ('g4', 'history', false, false),
  ('g4', 'moledet', true, true),
  ('g4', 'geography', false, false),
  ('g5', 'math', true, true),
  ('g5', 'geometry', true, true),
  ('g5', 'hebrew', true, true),
  ('g5', 'english', true, true),
  ('g5', 'science', true, true),
  ('g5', 'history', false, false),
  ('g5', 'moledet', false, false),
  ('g5', 'geography', true, true),
  ('g6', 'math', true, true),
  ('g6', 'geometry', true, true),
  ('g6', 'hebrew', true, true),
  ('g6', 'english', true, true),
  ('g6', 'science', true, true),
  ('g6', 'history', true, true),
  ('g6', 'moledet', false, false),
  ('g6', 'geography', true, true)
on conflict (grade_key, subject_key) do update set
  is_grade_suitable = excluded.is_grade_suitable,
  is_enabled_by_default = excluded.is_enabled_by_default;

-- ---------------------------------------------------------------------------
-- Private helpers (revoked from public / anon / authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.subject_perm_active_count()
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.subject_permission_catalog
  where is_active = true;
$$;

create or replace function public.subject_perm_verify_catalog_complete()
returns void
language plpgsql
as $$
declare
  v_n integer;
  v_join_count integer;
  v_grade text;
  v_grade_count integer;
begin
  v_n := public.subject_perm_active_count();
  if v_n <= 0 then
    raise exception 'SUBJECT_CATALOG_EMPTY';
  end if;

  select count(*)::integer
  into v_join_count
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where s.is_active = true;

  if v_join_count <> 6 * v_n then
    raise exception 'SUBJECT_CATALOG_INCOMPLETE total % expected %', v_join_count, 6 * v_n;
  end if;

  foreach v_grade in array array['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] loop
    select count(*)::integer
    into v_grade_count
    from public.subject_grade_default_catalog g
    join public.subject_permission_catalog s
      on s.subject_key = g.subject_key
    where g.grade_key = v_grade
      and s.is_active = true;

    if v_grade_count <> v_n then
      raise exception 'SUBJECT_CATALOG_INCOMPLETE grade % has % rows expected %',
        v_grade, v_grade_count, v_n;
    end if;
  end loop;
end;
$$;

create or replace function public.subject_perm_verify_parent_student(
  p_parent_id uuid,
  p_student_id uuid
)
returns public.students
language plpgsql
as $$
declare
  v_student public.students;
begin
  if p_parent_id is null or p_student_id is null then
    raise exception 'SUBJECT_PERM_MISSING_IDS';
  end if;

  select s.*
  into v_student
  from public.students s
  where s.id = p_student_id;

  if not found then
    raise exception 'SUBJECT_PERM_STUDENT_NOT_FOUND';
  end if;

  if v_student.parent_id is distinct from p_parent_id then
    raise exception 'SUBJECT_PERM_STUDENT_NOT_OWNED';
  end if;

  if v_student.account_kind = 'guest' then
    raise exception 'SUBJECT_PERM_GUEST_NOT_ALLOWED';
  end if;

  return v_student;
end;
$$;

create or replace function public.subject_perm_build_state(p_student_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_student public.students;
  v_allow boolean;
  v_permissions jsonb;
begin
  select s.*
  into v_student
  from public.students s
  where s.id = p_student_id;

  if not found then
    raise exception 'SUBJECT_PERM_STUDENT_NOT_FOUND';
  end if;

  select p.allow_student_grade_picker
  into v_allow
  from public.student_learning_access_preferences p
  where p.student_id = p_student_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'subject_key', perm.subject_key,
        'is_enabled', perm.is_enabled
      )
      order by cat.sort_order
    ),
    '[]'::jsonb
  )
  into v_permissions
  from public.student_subject_permissions perm
  join public.subject_permission_catalog cat
    on cat.subject_key = perm.subject_key
   and cat.is_active = true
  where perm.student_id = p_student_id;

  return jsonb_build_object(
    'ok', true,
    'student', jsonb_build_object(
      'id', v_student.id,
      'parent_id', v_student.parent_id,
      'full_name', v_student.full_name,
      'grade_level', v_student.grade_level,
      'is_active', v_student.is_active,
      'account_kind', v_student.account_kind
    ),
    'allow_student_grade_picker', coalesce(v_allow, false),
    'permissions', coalesce(v_permissions, '[]'::jsonb)
  );
end;
$$;

create or replace function public.subject_perm_ensure_missing_internal(
  p_parent_id uuid,
  p_changed_by uuid,
  p_student_id uuid
)
returns void
language plpgsql
as $$
declare
  v_student public.students;
  v_n integer;
  v_grade_count integer;
begin
  v_student := public.subject_perm_verify_parent_student(p_parent_id, p_student_id);
  perform public.subject_perm_verify_catalog_complete();

  if v_student.grade_level is null or char_length(trim(v_student.grade_level)) = 0 then
    raise exception 'SUBJECT_PERM_GRADE_LEVEL_REQUIRED';
  end if;

  select count(*)::integer
  into v_grade_count
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where g.grade_key = v_student.grade_level
    and s.is_active = true;

  v_n := public.subject_perm_active_count();
  if v_grade_count <> v_n then
    raise exception 'SUBJECT_CATALOG_GRADE_INCOMPLETE grade % has % rows expected %',
      v_student.grade_level, v_grade_count, v_n;
  end if;

  with inserted as (
    insert into public.student_subject_permissions (
      student_id,
      subject_key,
      is_enabled,
      updated_at,
      updated_by
    )
    select
      p_student_id,
      g.subject_key,
      g.is_enabled_by_default,
      now(),
      p_changed_by
    from public.subject_grade_default_catalog g
    join public.subject_permission_catalog s
      on s.subject_key = g.subject_key
    where g.grade_key = v_student.grade_level
      and s.is_active = true
    on conflict (student_id, subject_key) do nothing
    returning subject_key, is_enabled
  )
  insert into public.student_subject_permissions_change_log (
    student_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    reason
  )
  select
    p_student_id,
    i.subject_key,
    null,
    i.is_enabled,
    p_changed_by,
    'backfill'
  from inserted i;

  with inserted_pref as (
    insert into public.student_learning_access_preferences (
      student_id,
      allow_student_grade_picker,
      updated_at,
      updated_by
    )
    values (
      p_student_id,
      false,
      now(),
      p_changed_by
    )
    on conflict (student_id) do nothing
    returning student_id
  )
  insert into public.student_subject_permissions_change_log (
    student_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    reason
  )
  select
    ip.student_id,
    'allow_student_grade_picker',
    null,
    false,
    p_changed_by,
    'backfill'
  from inserted_pref ip;
end;
$$;

revoke all on function public.subject_perm_active_count() from public;
revoke all on function public.subject_perm_active_count() from anon;
revoke all on function public.subject_perm_active_count() from authenticated;

revoke all on function public.subject_perm_verify_catalog_complete() from public;
revoke all on function public.subject_perm_verify_catalog_complete() from anon;
revoke all on function public.subject_perm_verify_catalog_complete() from authenticated;

revoke all on function public.subject_perm_verify_parent_student(uuid, uuid) from public;
revoke all on function public.subject_perm_verify_parent_student(uuid, uuid) from anon;
revoke all on function public.subject_perm_verify_parent_student(uuid, uuid) from authenticated;

revoke all on function public.subject_perm_build_state(uuid) from public;
revoke all on function public.subject_perm_build_state(uuid) from anon;
revoke all on function public.subject_perm_build_state(uuid) from authenticated;

revoke all on function public.subject_perm_ensure_missing_internal(uuid, uuid, uuid) from public;
revoke all on function public.subject_perm_ensure_missing_internal(uuid, uuid, uuid) from anon;
revoke all on function public.subject_perm_ensure_missing_internal(uuid, uuid, uuid) from authenticated;

-- ---------------------------------------------------------------------------
-- RPCs (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.create_parent_student_with_subject_defaults(
  p_parent_id uuid,
  p_changed_by uuid,
  p_full_name text,
  p_grade_level text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_n integer;
  v_grade_count integer;
begin
  if p_parent_id is null or p_changed_by is null then
    raise exception 'SUBJECT_PERM_MISSING_IDS';
  end if;

  if p_full_name is null or char_length(trim(p_full_name)) = 0 then
    raise exception 'SUBJECT_PERM_FULL_NAME_REQUIRED';
  end if;

  if p_grade_level is null or char_length(trim(p_grade_level)) = 0 then
    raise exception 'SUBJECT_PERM_GRADE_LEVEL_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.parent_profiles pp
    where pp.id = p_parent_id
  ) then
    raise exception 'SUBJECT_PERM_PARENT_NOT_FOUND';
  end if;

  perform public.subject_perm_verify_catalog_complete();

  select count(*)::integer
  into v_grade_count
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where g.grade_key = p_grade_level
    and s.is_active = true;

  v_n := public.subject_perm_active_count();
  if v_grade_count <> v_n then
    raise exception 'SUBJECT_CATALOG_GRADE_INCOMPLETE grade % has % rows expected %',
      p_grade_level, v_grade_count, v_n;
  end if;

  insert into public.students (
    parent_id,
    full_name,
    grade_level
  )
  values (
    p_parent_id,
    trim(p_full_name),
    trim(p_grade_level)
  )
  returning id into v_student_id;

  insert into public.student_subject_permissions (
    student_id,
    subject_key,
    is_enabled,
    updated_at,
    updated_by
  )
  select
    v_student_id,
    g.subject_key,
    g.is_enabled_by_default,
    now(),
    p_changed_by
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where g.grade_key = trim(p_grade_level)
    and s.is_active = true;

  insert into public.student_subject_permissions_change_log (
    student_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    reason
  )
  select
    v_student_id,
    perm.subject_key,
    null,
    perm.is_enabled,
    p_changed_by,
    'initial_seed'
  from public.student_subject_permissions perm
  where perm.student_id = v_student_id;

  insert into public.student_learning_access_preferences (
    student_id,
    allow_student_grade_picker,
    updated_at,
    updated_by
  )
  values (
    v_student_id,
    false,
    now(),
    p_changed_by
  );

  insert into public.student_subject_permissions_change_log (
    student_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    reason
  )
  values (
    v_student_id,
    'allow_student_grade_picker',
    null,
    false,
    p_changed_by,
    'initial_seed'
  );

  return public.subject_perm_build_state(v_student_id);
end;
$$;

create or replace function public.apply_parent_student_grade_change(
  p_parent_id uuid,
  p_changed_by uuid,
  p_student_id uuid,
  p_grade_level text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students;
  v_previous_grade text;
  v_new_grade text;
  v_n integer;
  v_grade_count integer;
begin
  if p_grade_level is null or char_length(trim(p_grade_level)) = 0 then
    raise exception 'SUBJECT_PERM_GRADE_LEVEL_REQUIRED';
  end if;

  v_new_grade := trim(p_grade_level);

  select s.*
  into v_student
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    raise exception 'SUBJECT_PERM_STUDENT_NOT_FOUND';
  end if;

  if v_student.parent_id is distinct from p_parent_id then
    raise exception 'SUBJECT_PERM_STUDENT_NOT_OWNED';
  end if;

  if v_student.account_kind = 'guest' then
    raise exception 'SUBJECT_PERM_GUEST_NOT_ALLOWED';
  end if;

  v_previous_grade := v_student.grade_level;

  perform public.subject_perm_verify_catalog_complete();

  select count(*)::integer
  into v_grade_count
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where g.grade_key = v_new_grade
    and s.is_active = true;

  v_n := public.subject_perm_active_count();
  if v_grade_count <> v_n then
    raise exception 'SUBJECT_CATALOG_GRADE_INCOMPLETE grade % has % rows expected %',
      v_new_grade, v_grade_count, v_n;
  end if;

  update public.students
  set
    grade_level = v_new_grade,
    updated_at = now()
  where id = p_student_id;

  with old_values as (
    select
      perm.subject_key,
      perm.is_enabled as old_is_enabled
    from public.student_subject_permissions perm
    where perm.student_id = p_student_id
  ),
  upserted as (
    insert into public.student_subject_permissions (
      student_id,
      subject_key,
      is_enabled,
      updated_at,
      updated_by
    )
    select
      p_student_id,
      g.subject_key,
      g.is_enabled_by_default,
      now(),
      p_changed_by
    from public.subject_grade_default_catalog g
    join public.subject_permission_catalog s
      on s.subject_key = g.subject_key
    where g.grade_key = v_new_grade
      and s.is_active = true
    on conflict (student_id, subject_key) do update
      set
        is_enabled = excluded.is_enabled,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    returning subject_key, is_enabled as new_is_enabled
  )
  insert into public.student_subject_permissions_change_log (
    student_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    reason,
    previous_grade_level,
    new_grade_level
  )
  select
    p_student_id,
    u.subject_key,
    o.old_is_enabled,
    u.new_is_enabled,
    p_changed_by,
    'grade_change_reset',
    v_previous_grade,
    v_new_grade
  from upserted u
  left join old_values o
    on o.subject_key = u.subject_key
  where o.old_is_enabled is distinct from u.new_is_enabled;

  return public.subject_perm_build_state(p_student_id);
end;
$$;

create or replace function public.ensure_parent_student_learning_permissions(
  p_parent_id uuid,
  p_changed_by uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.subject_perm_ensure_missing_internal(p_parent_id, p_changed_by, p_student_id);
  return public.subject_perm_build_state(p_student_id);
end;
$$;

create or replace function public.set_parent_student_subject_permission(
  p_parent_id uuid,
  p_changed_by uuid,
  p_student_id uuid,
  p_subject_key text,
  p_is_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
begin
  if p_subject_key is null or char_length(trim(p_subject_key)) = 0 then
    raise exception 'SUBJECT_PERM_SUBJECT_KEY_REQUIRED';
  end if;

  if p_is_enabled is null then
    raise exception 'SUBJECT_PERM_IS_ENABLED_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.subject_permission_catalog c
    where c.subject_key = trim(p_subject_key)
      and c.is_active = true
  ) then
    raise exception 'SUBJECT_PERM_SUBJECT_KEY_INVALID';
  end if;

  perform public.subject_perm_ensure_missing_internal(p_parent_id, p_changed_by, p_student_id);

  select perm.is_enabled
  into v_old
  from public.student_subject_permissions perm
  where perm.student_id = p_student_id
    and perm.subject_key = trim(p_subject_key)
  for update;

  if not found then
    raise exception 'SUBJECT_PERM_ROW_MISSING';
  end if;

  if v_old is distinct from p_is_enabled then
    update public.student_subject_permissions
    set
      is_enabled = p_is_enabled,
      updated_at = now(),
      updated_by = p_changed_by
    where student_id = p_student_id
      and subject_key = trim(p_subject_key);

    insert into public.student_subject_permissions_change_log (
      student_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      reason
    )
    values (
      p_student_id,
      trim(p_subject_key),
      v_old,
      p_is_enabled,
      p_changed_by,
      'parent_toggle'
    );
  end if;

  return public.subject_perm_build_state(p_student_id);
end;
$$;

create or replace function public.enable_all_parent_student_subjects(
  p_parent_id uuid,
  p_changed_by uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.subject_perm_ensure_missing_internal(p_parent_id, p_changed_by, p_student_id);

  with updated as (
    update public.student_subject_permissions perm
    set
      is_enabled = true,
      updated_at = now(),
      updated_by = p_changed_by
    from public.subject_permission_catalog cat
    where perm.student_id = p_student_id
      and cat.subject_key = perm.subject_key
      and cat.is_active = true
      and perm.is_enabled = false
    returning perm.subject_key, false as old_value, true as new_value
  )
  insert into public.student_subject_permissions_change_log (
    student_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    reason
  )
  select
    p_student_id,
    u.subject_key,
    u.old_value,
    u.new_value,
    p_changed_by,
    'enable_all'
  from updated u;

  return public.subject_perm_build_state(p_student_id);
end;
$$;

create or replace function public.set_parent_student_grade_picker(
  p_parent_id uuid,
  p_changed_by uuid,
  p_student_id uuid,
  p_allow_student_grade_picker boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students;
  v_old boolean;
begin
  if p_allow_student_grade_picker is null then
    raise exception 'SUBJECT_PERM_GRADE_PICKER_REQUIRED';
  end if;

  v_student := public.subject_perm_verify_parent_student(p_parent_id, p_student_id);

  select pref.allow_student_grade_picker
  into v_old
  from public.student_learning_access_preferences pref
  where pref.student_id = p_student_id
  for update;

  if not found then
    insert into public.student_learning_access_preferences (
      student_id,
      allow_student_grade_picker,
      updated_at,
      updated_by
    )
    values (
      p_student_id,
      p_allow_student_grade_picker,
      now(),
      p_changed_by
    );

    insert into public.student_subject_permissions_change_log (
      student_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      reason
    )
    values (
      p_student_id,
      'allow_student_grade_picker',
      null,
      p_allow_student_grade_picker,
      p_changed_by,
      'grade_picker_toggle'
    );
  elsif v_old is distinct from p_allow_student_grade_picker then
    update public.student_learning_access_preferences
    set
      allow_student_grade_picker = p_allow_student_grade_picker,
      updated_at = now(),
      updated_by = p_changed_by
    where student_id = p_student_id;

    insert into public.student_subject_permissions_change_log (
      student_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      reason
    )
    values (
      p_student_id,
      'allow_student_grade_picker',
      v_old,
      p_allow_student_grade_picker,
      p_changed_by,
      'grade_picker_toggle'
    );
  end if;

  return public.subject_perm_build_state(p_student_id);
end;
$$;

revoke all on function public.create_parent_student_with_subject_defaults(uuid, uuid, text, text) from public;
revoke all on function public.create_parent_student_with_subject_defaults(uuid, uuid, text, text) from anon;
revoke all on function public.create_parent_student_with_subject_defaults(uuid, uuid, text, text) from authenticated;
grant execute on function public.create_parent_student_with_subject_defaults(uuid, uuid, text, text) to service_role;

revoke all on function public.apply_parent_student_grade_change(uuid, uuid, uuid, text) from public;
revoke all on function public.apply_parent_student_grade_change(uuid, uuid, uuid, text) from anon;
revoke all on function public.apply_parent_student_grade_change(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.apply_parent_student_grade_change(uuid, uuid, uuid, text) to service_role;

revoke all on function public.ensure_parent_student_learning_permissions(uuid, uuid, uuid) from public;
revoke all on function public.ensure_parent_student_learning_permissions(uuid, uuid, uuid) from anon;
revoke all on function public.ensure_parent_student_learning_permissions(uuid, uuid, uuid) from authenticated;
grant execute on function public.ensure_parent_student_learning_permissions(uuid, uuid, uuid) to service_role;

revoke all on function public.set_parent_student_subject_permission(uuid, uuid, uuid, text, boolean) from public;
revoke all on function public.set_parent_student_subject_permission(uuid, uuid, uuid, text, boolean) from anon;
revoke all on function public.set_parent_student_subject_permission(uuid, uuid, uuid, text, boolean) from authenticated;
grant execute on function public.set_parent_student_subject_permission(uuid, uuid, uuid, text, boolean) to service_role;

revoke all on function public.enable_all_parent_student_subjects(uuid, uuid, uuid) from public;
revoke all on function public.enable_all_parent_student_subjects(uuid, uuid, uuid) from anon;
revoke all on function public.enable_all_parent_student_subjects(uuid, uuid, uuid) from authenticated;
grant execute on function public.enable_all_parent_student_subjects(uuid, uuid, uuid) to service_role;

revoke all on function public.set_parent_student_grade_picker(uuid, uuid, uuid, boolean) from public;
revoke all on function public.set_parent_student_grade_picker(uuid, uuid, uuid, boolean) from anon;
revoke all on function public.set_parent_student_grade_picker(uuid, uuid, uuid, boolean) from authenticated;
grant execute on function public.set_parent_student_grade_picker(uuid, uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- RLS — catalog tables: service_role read only; no anon/authenticated access
-- ---------------------------------------------------------------------------

alter table public.subject_permission_catalog enable row level security;
alter table public.subject_grade_default_catalog enable row level security;

revoke all on public.subject_permission_catalog from anon;
revoke all on public.subject_permission_catalog from authenticated;
revoke all on public.subject_grade_default_catalog from anon;
revoke all on public.subject_grade_default_catalog from authenticated;

grant select on public.subject_permission_catalog to service_role;
grant select on public.subject_grade_default_catalog to service_role;

-- ---------------------------------------------------------------------------
-- RLS — parent SELECT on own registered children; no direct authenticated writes
-- ---------------------------------------------------------------------------

alter table public.student_subject_permissions enable row level security;
alter table public.student_learning_access_preferences enable row level security;
alter table public.student_subject_permissions_change_log enable row level security;

drop policy if exists student_subject_permissions_parent_select on public.student_subject_permissions;
create policy student_subject_permissions_parent_select
on public.student_subject_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_subject_permissions.student_id
      and s.parent_id = auth.uid()
      and s.account_kind <> 'guest'
  )
);

drop policy if exists student_learning_access_preferences_parent_select on public.student_learning_access_preferences;
create policy student_learning_access_preferences_parent_select
on public.student_learning_access_preferences
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_learning_access_preferences.student_id
      and s.parent_id = auth.uid()
      and s.account_kind <> 'guest'
  )
);

drop policy if exists student_subject_permissions_change_log_parent_select on public.student_subject_permissions_change_log;
create policy student_subject_permissions_change_log_parent_select
on public.student_subject_permissions_change_log
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_subject_permissions_change_log.student_id
      and s.parent_id = auth.uid()
      and s.account_kind <> 'guest'
  )
);

-- ---------------------------------------------------------------------------
-- Post-seed catalog completeness check
-- ---------------------------------------------------------------------------

select public.subject_perm_verify_catalog_complete();

-- ---------------------------------------------------------------------------
-- Backfill existing registered parent children (missing rows only)
-- ---------------------------------------------------------------------------

with eligible as (
  select
    s.id as student_id,
    s.parent_id,
    s.grade_level
  from public.students s
  where s.parent_id is not null
    and s.account_kind <> 'guest'
    and s.grade_level is not null
    and char_length(trim(s.grade_level)) > 0
),
inserted_permissions as (
  insert into public.student_subject_permissions (
    student_id,
    subject_key,
    is_enabled,
    updated_at,
    updated_by
  )
  select
    e.student_id,
    g.subject_key,
    g.is_enabled_by_default,
    now(),
    e.parent_id
  from eligible e
  join public.subject_grade_default_catalog g
    on g.grade_key = e.grade_level
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
   and s.is_active = true
  on conflict (student_id, subject_key) do nothing
  returning student_id, subject_key, is_enabled
)
insert into public.student_subject_permissions_change_log (
  student_id,
  field_name,
  old_value,
  new_value,
  changed_by,
  reason
)
select
  ip.student_id,
  ip.subject_key,
  null,
  ip.is_enabled,
  e.parent_id,
  'backfill'
from inserted_permissions ip
join eligible e on e.student_id = ip.student_id;

with eligible as (
  select
    s.id as student_id,
    s.parent_id
  from public.students s
  where s.parent_id is not null
    and s.account_kind <> 'guest'
),
inserted_preferences as (
  insert into public.student_learning_access_preferences (
    student_id,
    allow_student_grade_picker,
    updated_at,
    updated_by
  )
  select
    e.student_id,
    false,
    now(),
    e.parent_id
  from eligible e
  on conflict (student_id) do nothing
  returning student_id
)
insert into public.student_subject_permissions_change_log (
  student_id,
  field_name,
  old_value,
  new_value,
  changed_by,
  reason
)
select
  ip.student_id,
  'allow_student_grade_picker',
  null,
  false,
  e.parent_id,
  'backfill'
from inserted_preferences ip
join eligible e on e.student_id = ip.student_id;

-- Guest children must never receive permission rows (even with parent_id set).
do $$
begin
  if exists (
    select 1
    from public.students s
    where s.account_kind = 'guest'
      and s.parent_id is not null
      and (
        exists (
          select 1
          from public.student_subject_permissions p
          where p.student_id = s.id
        )
        or exists (
          select 1
          from public.student_learning_access_preferences pref
          where pref.student_id = s.id
        )
        or exists (
          select 1
          from public.student_subject_permissions_change_log log
          where log.student_id = s.id
        )
      )
  ) then
    raise exception 'SUBJECT_PERM_GUEST_BACKFILL_VIOLATION';
  end if;
end $$;

commit;
