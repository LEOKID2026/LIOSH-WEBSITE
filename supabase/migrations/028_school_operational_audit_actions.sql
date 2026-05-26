-- School manager operational audit actions (Phase 2).
-- Owner must apply manually in Supabase SQL editor before operational scripts.
-- Requires 027_school_managed_portal.sql applied first.

begin;

alter table public.teacher_access_audit
  drop constraint if exists teacher_access_audit_action_check;

alter table public.teacher_access_audit
  drop constraint if exists teacher_access_audit_action_chk;

alter table public.teacher_access_audit
  add constraint teacher_access_audit_action_chk check (action in (
    'grant_created',
    'grant_revoked',
    'grant_expired',
    'pin_rotated',
    'username_rotated',
    'magic_link_sent',
    'magic_link_consumed',
    'magic_link_expired',
    'guardian_login_success',
    'guardian_login_failed',
    'guardian_logout',
    'teacher_link_created',
    'teacher_link_archived',
    'teacher_onboarded',
    'class_created',
    'class_archived',
    'class_updated',
    'class_member_added',
    'class_member_removed',
    'viewed_student_report',
    'viewed_class_report',
    'link_created',
    'link_archived',
    'link_consent_failed',
    'link_limit_reached',
    'consent_issued',
    'consent_revoked',
    'magic_link_issued',
    'student_created_by_teacher',
    'student_name_updated',
    'activity_created',
    'activity_activated',
    'activity_paused',
    'activity_closed',
    'activity_archived',
    'school_subject_granted',
    'school_subject_revoked',
    'school_student_enrolled',
    'school_student_unenrolled',
    'school_class_viewed',
    'school_student_report_viewed',
    'school_student_class_transferred',
    'school_class_teacher_reassigned',
    'school_class_archived'
  ));

commit;
