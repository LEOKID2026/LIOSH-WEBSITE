-- Parent per-child game category permissions (online / offline / solo).
-- FOR REVIEW ONLY — run manually after 071_site_game_catalog.sql and owner approval.
-- Does not touch coin tables or legacy /mleo-* pages.
--
-- Audit: log_student_game_permissions_change() + trg_student_game_permissions_audit (AFTER UPDATE).
-- Parent API must set updated_by on permission changes.
--
-- Rollback (manual):
--   drop trigger if exists trg_student_game_permissions_audit on public.student_game_category_permissions;
--   drop trigger if exists trg_students_game_permissions_created on public.students;
--   drop function if exists public.log_student_game_permissions_change();
--   drop function if exists public.handle_student_game_permissions_created();
--   drop table if exists public.student_game_permissions_change_log;
--   drop table if exists public.student_game_category_permissions;

begin;

create table if not exists public.student_game_category_permissions (
  student_id uuid primary key references public.students (id) on delete cascade,
  online_enabled boolean not null default true,
  offline_enabled boolean not null default true,
  solo_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

comment on table public.student_game_category_permissions is
  'Parent-controlled category locks per child. Default all enabled. Parent lock is per-category only.';

create index if not exists student_game_category_permissions_updated_at_idx
  on public.student_game_category_permissions (updated_at desc);

create table if not exists public.student_game_permissions_change_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  changed_by uuid null references auth.users (id) on delete set null,
  field_name text not null check (field_name in ('online_enabled', 'offline_enabled', 'solo_enabled')),
  old_value boolean not null,
  new_value boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists student_game_permissions_change_log_student_idx
  on public.student_game_permissions_change_log (student_id, created_at desc);

comment on table public.student_game_permissions_change_log is
  'Append-only audit when parent toggles child game category permissions. Populated by trg_student_game_permissions_audit.';

create or replace function public.log_student_game_permissions_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.online_enabled is distinct from new.online_enabled then
      insert into public.student_game_permissions_change_log (
        student_id,
        changed_by,
        field_name,
        old_value,
        new_value
      )
      values (
        new.student_id,
        new.updated_by,
        'online_enabled',
        old.online_enabled,
        new.online_enabled
      );
    end if;

    if old.offline_enabled is distinct from new.offline_enabled then
      insert into public.student_game_permissions_change_log (
        student_id,
        changed_by,
        field_name,
        old_value,
        new_value
      )
      values (
        new.student_id,
        new.updated_by,
        'offline_enabled',
        old.offline_enabled,
        new.offline_enabled
      );
    end if;

    if old.solo_enabled is distinct from new.solo_enabled then
      insert into public.student_game_permissions_change_log (
        student_id,
        changed_by,
        field_name,
        old_value,
        new_value
      )
      values (
        new.student_id,
        new.updated_by,
        'solo_enabled',
        old.solo_enabled,
        new.solo_enabled
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.log_student_game_permissions_change() from public;
grant execute on function public.log_student_game_permissions_change() to service_role;

drop trigger if exists trg_student_game_permissions_audit on public.student_game_category_permissions;
create trigger trg_student_game_permissions_audit
after update of online_enabled, offline_enabled, solo_enabled, updated_by
on public.student_game_category_permissions
for each row
execute function public.log_student_game_permissions_change();

create or replace function public.handle_student_game_permissions_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_game_category_permissions (
    student_id,
    online_enabled,
    offline_enabled,
    solo_enabled
  )
  values (new.id, true, true, true)
  on conflict (student_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_student_game_permissions_created() from public;
grant execute on function public.handle_student_game_permissions_created() to service_role;

drop trigger if exists trg_students_game_permissions_created on public.students;
create trigger trg_students_game_permissions_created
after insert on public.students
for each row
execute function public.handle_student_game_permissions_created();

insert into public.student_game_category_permissions (
  student_id,
  online_enabled,
  offline_enabled,
  solo_enabled
)
select
  s.id,
  true,
  true,
  true
from public.students s
left join public.student_game_category_permissions p
  on p.student_id = s.id
where p.student_id is null;

alter table public.student_game_category_permissions enable row level security;
alter table public.student_game_permissions_change_log enable row level security;

drop policy if exists student_game_category_permissions_parent_select on public.student_game_category_permissions;
create policy student_game_category_permissions_parent_select
on public.student_game_category_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_game_category_permissions.student_id
      and s.parent_id = auth.uid()
  )
);

drop policy if exists student_game_category_permissions_parent_update on public.student_game_category_permissions;
create policy student_game_category_permissions_parent_update
on public.student_game_category_permissions
for update
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_game_category_permissions.student_id
      and s.parent_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_game_category_permissions.student_id
      and s.parent_id = auth.uid()
  )
);

drop policy if exists student_game_permissions_change_log_parent_read on public.student_game_permissions_change_log;
create policy student_game_permissions_change_log_parent_read
on public.student_game_permissions_change_log
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_game_permissions_change_log.student_id
      and s.parent_id = auth.uid()
  )
);

commit;
