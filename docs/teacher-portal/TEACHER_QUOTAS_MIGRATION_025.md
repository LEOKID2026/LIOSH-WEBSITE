# Migration 025 — Teacher Quotas & Admin Control

**Owner applies SQL manually.** The agent does not run this migration against your database.

## File

`supabase/migrations/025_teacher_quotas_admin.sql`

## What it does

1. Adds `teacher_plans.max_students_per_class` and sets **40** for all plans.
2. Sets `teacher_plans.student_limit` and `class_limit` to **NULL** (unlimited total students and classes).
3. Extends `teacher_limits` with per-class override, `feature_flags`, `is_account_active`.
4. Creates `admin_audit_log`.
5. Creates future stubs: `school_accounts`, `school_teacher_memberships`, FK on `teacher_profiles.school_id`.

## After apply

1. Set platform owner `app_metadata.role = "admin"` in Supabase Auth for the owner user.
2. Open `/admin/teachers` with that user's session.
3. Optional diagnostic: `docs/teacher-portal/sql-diagnostics/classes_over_40_students.sql`

## Active limits (code + DB)

| Limit | Value |
|-------|-------|
| Max students per class | 40 (hard) |
| Max classes per teacher | unlimited |
| Max total students per teacher | unlimited |
