-- Extend admin_audit_log target_type for student manual coin credits and parent settings audit.
-- Safe widen: only adds new allowed values; existing rows unchanged.

begin;

alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_target_type_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_target_type_check
    check (target_type in ('teacher', 'school', 'student', 'parent_settings'));

commit;
