# Migration 026 — Individual student activities

## Purpose

Adds `student_activities`, `student_activity_status`, and `student_activity_attempts` for private-tutor / targeted assignments (one student per activity).

## DB integrity

- `student_activities` has `unique (id, student_id)` (`student_activities_id_student_uq`).
- `student_activity_status` and `student_activity_attempts` use composite foreign keys on `(activity_id, student_id)` referencing `student_activities (id, student_id)`, so status/attempt rows cannot target a different student than the activity.

## Apply (owner only)

1. Open Supabase SQL editor for the project.
2. Run `supabase/migrations/026_student_activities.sql` in full.
3. Confirm three tables exist and RLS is enabled with no authenticated policies.

## After apply

- Teacher APIs: `/api/teacher/student-activities/*`
- Student play uses existing `/api/student/activities/*` with `scope: "student"` on list/start.
- Feature flag: `individual_activities` (default **on** in app).

## Rollback

Drop tables in reverse order: `student_activity_attempts`, `student_activity_status`, `student_activities`.
