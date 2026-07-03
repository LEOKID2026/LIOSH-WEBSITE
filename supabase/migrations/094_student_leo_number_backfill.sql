-- 094: students.leo_number — 8-digit format (10000000–99999999), backfill null/legacy rows
--
-- App-side lazy assignment: lib/guest/ensure-student-leo-number.server.js
-- runs on /api/arcade/profile/me for registered children missing a valid leo_number.
--
-- Product: Leo number is always 8 digits, no leading zero. No 6-digit compatibility.
-- Idempotent: safe to run more than once.

create unique index if not exists students_leo_number_uidx
  on public.students (leo_number)
  where leo_number is not null;

alter table public.students
  drop constraint if exists students_leo_number_format_chk;

-- Backfill NULL or any value that is not a valid 8-digit Leo number (includes legacy 6-digit).
do $$
declare
  r record;
  candidate text;
  attempts int;
  taken boolean;
begin
  for r in
    select id
    from public.students
    where leo_number is null
       or leo_number !~ '^[1-9][0-9]{7}$'
    order by created_at
  loop
    attempts := 0;
    loop
      attempts := attempts + 1;
      if attempts > 60 then
        raise exception 'leo_number backfill exhausted for student %', r.id;
      end if;
      candidate := (floor(random() * (99999999 - 10000000 + 1)) + 10000000)::bigint::text;
      if candidate !~ '^[1-9][0-9]{7}$' then
        continue;
      end if;
      select exists(
        select 1 from public.students where leo_number = candidate
      ) into taken;
      exit when not taken;
    end loop;

    update public.students
    set leo_number = candidate
    where id = r.id;
  end loop;
end $$;

alter table public.students
  add constraint students_leo_number_format_chk
  check (leo_number is null or leo_number ~ '^[1-9][0-9]{7}$');
