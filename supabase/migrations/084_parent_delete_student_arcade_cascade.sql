-- 084_parent_delete_student_arcade_cascade.sql
-- Purpose: Parent-owned student delete must not be blocked by arcade RESTRICT FKs.
-- Safety: Alters arcade FKs to CASCADE on students; updates delete_parent_owned_student RPC order.
-- Apply: manual by owner only.
--
-- Rollback (manual): restore ON DELETE RESTRICT on arcade_* student FKs from 004_arcade_foundation.sql

begin;

-- arcade_rooms.host_student_id
alter table public.arcade_rooms
  drop constraint if exists arcade_rooms_host_student_id_fkey;

alter table public.arcade_rooms
  add constraint arcade_rooms_host_student_id_fkey
  foreign key (host_student_id) references public.students (id) on delete cascade;

-- arcade_room_players.student_id
alter table public.arcade_room_players
  drop constraint if exists arcade_room_players_student_id_fkey;

alter table public.arcade_room_players
  add constraint arcade_room_players_student_id_fkey
  foreign key (student_id) references public.students (id) on delete cascade;

-- arcade_results.student_id
alter table public.arcade_results
  drop constraint if exists arcade_results_student_id_fkey;

alter table public.arcade_results
  add constraint arcade_results_student_id_fkey
  foreign key (student_id) references public.students (id) on delete cascade;

create or replace function public.delete_parent_owned_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_student_id is null then
    raise exception 'DELETE_STUDENT_MISSING_ID';
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.parent_id = auth.uid()
  ) then
    raise exception 'DELETE_STUDENT_NOT_OWNED';
  end if;

  delete from public.arcade_results where student_id = p_student_id;
  delete from public.arcade_quick_match_queue where student_id = p_student_id;
  delete from public.arcade_rooms where host_student_id = p_student_id;
  delete from public.arcade_room_players where student_id = p_student_id;
  delete from public.arcade_results where student_id = p_student_id;

  delete from public.students where id = p_student_id;
end;
$$;

comment on function public.delete_parent_owned_student(uuid) is
  'Deletes one student owned by auth.uid(); arcade cleanup then students row (child tables CASCADE).';

commit;
