-- 094: students.leo_number — confirm uniqueness + optional backfill for legacy rows
--
-- App-side lazy assignment: lib/guest/ensure-student-leo-number.server.js
-- runs on /api/arcade/profile/me for registered children missing leo_number.
--
-- This migration is OPTIONAL for owners who prefer DB backfill before deploy.
-- Safe to run: does not overwrite existing leo_number values (guests included).

-- Already created in 086_guest_child_mode.sql — idempotent guard.
create unique index if not exists students_leo_number_uidx
  on public.students (leo_number)
  where leo_number is not null;

alter table public.students
  drop constraint if exists students_leo_number_format_chk;

alter table public.students
  add constraint students_leo_number_format_chk
  check (leo_number is null or leo_number ~ '^[0-9]{6}$');

-- Backfill students.leo_number where NULL (registered + guest).
-- Skips rows that already have a number. Retries on collision.
do $$
declare
  r record;
  candidate text;
  attempts int;
  taken boolean;
begin
  for r in
    select id from public.students where leo_number is null order by created_at
  loop
    attempts := 0;
    loop
      attempts := attempts + 1;
      if attempts > 60 then
        raise exception 'leo_number backfill exhausted for student %', r.id;
      end if;
      candidate := lpad((floor(random() * 1000000))::int::text, 6, '0');
      if candidate !~ '^[0-9]{6}$' then
        continue;
      end if;
      select exists(
        select 1 from public.students where leo_number = candidate
      ) into taken;
      exit when not taken;
    end loop;

    update public.students
    set leo_number = candidate
    where id = r.id and leo_number is null;
  end loop;
end $$;
