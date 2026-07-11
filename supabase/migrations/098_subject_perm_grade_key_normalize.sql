-- Patch for owner: normalize students.grade_level (grade_1) to catalog grade_key (g1)
-- in subject-permissions RPCs. Do NOT re-run 097.
-- Apply manually in Supabase SQL editor after review.

begin;

create or replace function public.subject_perm_normalize_grade_key(p_grade text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
  v_lower text;
  v_num text;
  v_hebrew text;
begin
  if p_grade is null then
    return null;
  end if;

  v := trim(p_grade);
  if v = '' then
    return null;
  end if;

  v_lower := lower(v);

  if v_lower ~ '^g[1-6]$' then
    return v_lower;
  end if;

  if v_lower ~ '^[1-6]$' then
    return 'g' || v_lower;
  end if;

  v_num := substring(v_lower from '(?:grade|grade_|g|class|כיתה)[\s_-]*([1-6])');
  if v_num is not null then
    return 'g' || v_num;
  end if;

  v_hebrew := substring(v from 'כיתה\s*([אבגדהו])');
  if v_hebrew is not null then
    case v_hebrew
      when 'א' then return 'g1';
      when 'ב' then return 'g2';
      when 'ג' then return 'g3';
      when 'ד' then return 'g4';
      when 'ה' then return 'g5';
      when 'ו' then return 'g6';
      else null;
    end case;
  end if;

  v_hebrew := substring(v from '^([אבגדהו])[''׳"]?$');
  if v_hebrew is not null then
    case v_hebrew
      when 'א' then return 'g1';
      when 'ב' then return 'g2';
      when 'ג' then return 'g3';
      when 'ד' then return 'g4';
      when 'ה' then return 'g5';
      when 'ו' then return 'g6';
      else null;
    end case;
  end if;

  return null;
end;
$$;

-- subject_perm_ensure_missing_internal: use normalized grade key
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
  v_grade_key text;
begin
  v_student := public.subject_perm_verify_parent_student(p_parent_id, p_student_id);
  perform public.subject_perm_verify_catalog_complete();

  v_grade_key := public.subject_perm_normalize_grade_key(v_student.grade_level);
  if v_grade_key is null then
    raise exception 'SUBJECT_PERM_GRADE_LEVEL_REQUIRED';
  end if;

  select count(*)::integer
  into v_grade_count
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where g.grade_key = v_grade_key
    and s.is_active = true;

  v_n := public.subject_perm_active_count();
  if v_grade_count <> v_n then
    raise exception 'SUBJECT_CATALOG_GRADE_INCOMPLETE grade % has % rows expected %',
      v_grade_key, v_grade_count, v_n;
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
    where g.grade_key = v_grade_key
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

-- create_parent_student_with_subject_defaults
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
  v_grade_key text;
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

  v_grade_key := public.subject_perm_normalize_grade_key(trim(p_grade_level));
  if v_grade_key is null then
    raise exception 'SUBJECT_PERM_GRADE_LEVEL_REQUIRED';
  end if;

  select count(*)::integer
  into v_grade_count
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where g.grade_key = v_grade_key
    and s.is_active = true;

  v_n := public.subject_perm_active_count();
  if v_grade_count <> v_n then
    raise exception 'SUBJECT_CATALOG_GRADE_INCOMPLETE grade % has % rows expected %',
      v_grade_key, v_grade_count, v_n;
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
  where g.grade_key = v_grade_key
    and s.is_active = true;

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
  select
    v_student_id,
    g.subject_key,
    null,
    g.is_enabled_by_default,
    p_changed_by,
    'initial_seed'
  from public.subject_grade_default_catalog g
  join public.subject_permission_catalog s
    on s.subject_key = g.subject_key
  where g.grade_key = v_grade_key
    and s.is_active = true;

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

-- apply_parent_student_grade_change
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
  v_grade_key text;
  v_n integer;
  v_grade_count integer;
begin
  if p_grade_level is null or char_length(trim(p_grade_level)) = 0 then
    raise exception 'SUBJECT_PERM_GRADE_LEVEL_REQUIRED';
  end if;

  v_new_grade := trim(p_grade_level);
  v_grade_key := public.subject_perm_normalize_grade_key(v_new_grade);
  if v_grade_key is null then
    raise exception 'SUBJECT_PERM_GRADE_LEVEL_REQUIRED';
  end if;

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
  where g.grade_key = v_grade_key
    and s.is_active = true;

  v_n := public.subject_perm_active_count();
  if v_grade_count <> v_n then
    raise exception 'SUBJECT_CATALOG_GRADE_INCOMPLETE grade % has % rows expected %',
      v_grade_key, v_grade_count, v_n;
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
    where g.grade_key = v_grade_key
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

commit;
