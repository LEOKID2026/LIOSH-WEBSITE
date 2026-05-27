-- 034_school_account_audit_actions.sql
-- Extend teacher_access_audit action allowlist for school account + messaging.
-- Owner applies manually. Requires 029_worksheet_activities.sql applied first
-- (029 is the current authoritative allowlist before this migration).
--
-- SAFETY: This list is 029's full allowlist PLUS new school account/messaging actions.
-- Do not apply until precheck below returns zero rows (see docs/school-portal/SCHOOL_PORTAL_SQL_REVIEW_PACKAGE.md).

BEGIN;

ALTER TABLE public.teacher_access_audit
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_check;

ALTER TABLE public.teacher_access_audit
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_chk;

ALTER TABLE public.teacher_access_audit
  ADD CONSTRAINT teacher_access_audit_action_chk CHECK (action IN (
    -- Base (024+)
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
    -- School manager (028)
    'school_subject_granted',
    'school_subject_revoked',
    'school_student_enrolled',
    'school_student_unenrolled',
    'school_class_viewed',
    'school_student_report_viewed',
    'school_student_class_transferred',
    'school_class_teacher_reassigned',
    'school_class_archived',
    -- Worksheet activities (029) — must remain after 034
    'worksheet_activity_created',
    'worksheet_activity_activated',
    'worksheet_activity_closed',
    'worksheet_activity_archived',
    'worksheet_pdf_uploaded',
    'worksheet_result_published',
    -- School account management (031+ app)
    'school_student_access_created',
    'school_student_access_revoked',
    'school_student_pin_rotated',
    'school_student_access_blocked',
    'school_student_access_unblocked',
    'school_parent_access_created',
    'school_parent_access_revoked',
    'school_parent_pin_rotated',
    'school_parent_access_blocked',
    'school_parent_access_unblocked',
    'school_parent_linked_to_student',
    'school_parent_unlinked_from_student',
    'school_parent_pin_changed_by_parent',
    -- School messaging (032+ app)
    'school_message_sent',
    'school_message_hidden',
    'school_message_read'
  ));

COMMIT;
