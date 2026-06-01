# Migration 054 — Assigned Activity Question Snapshot

Owner-run only. Do not apply from agent sessions.

## File

`supabase/migrations/054_assigned_activity_question_snapshot.sql`

## What it adds

- `snapshot_status`, `snapshot_frozen_at` on:
  - `classroom_activities`
  - `student_activities`
  - `parent_assigned_activities`
- `question_key` on:
  - `classroom_activity_attempts`
  - `student_activity_attempts`
  - `parent_activity_attempts`
- `question_snapshot` on `worksheet_student_answers`
- Supporting indexes

## Rollback

Drop the added columns (all additive). See Section 7.8 in the implementation plan.

## Application note

Application code writes `snapshot_status = 'frozen'` for new activities after this migration is applied. Existing rows remain `legacy_missing` by default.
