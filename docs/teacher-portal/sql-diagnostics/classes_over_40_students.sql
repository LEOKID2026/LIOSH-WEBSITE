-- Read-only diagnostic: classes with more than 40 active members.
-- Run manually after migration 025; grandfathered classes are not auto-trimmed.

select
  tcs.class_id,
  tc.name as class_name,
  tc.teacher_id,
  count(*)::int as active_members
from public.teacher_class_students tcs
join public.teacher_classes tc on tc.id = tcs.class_id
where tcs.removed_at is null
  and tc.is_archived = false
  and tc.archived_at is null
group by tcs.class_id, tc.name, tc.teacher_id
having count(*) > 40
order by active_members desc;
