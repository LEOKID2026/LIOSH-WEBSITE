-- Teacher-issued parent-access username prefix (3 lowercase letters, unique per teacher).
-- Usernames: {access_prefix}-{sequence} e.g. leo-01, abc-14

begin;

alter table public.teacher_profiles
  add column if not exists access_prefix text null;

alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_access_prefix_format_chk;

alter table public.teacher_profiles
  add constraint teacher_profiles_access_prefix_format_chk
  check (
    access_prefix is null
    or (
      char_length(access_prefix) = 3
      and access_prefix ~ '^[a-z]{3}$'
    )
  );

create unique index if not exists teacher_profiles_access_prefix_unique_idx
  on public.teacher_profiles (access_prefix)
  where access_prefix is not null;

comment on column public.teacher_profiles.access_prefix is
  'Stable 3-letter prefix for teacher-issued parent-access usernames ({prefix}-{seq}). Assigned once by the system.';

commit;
