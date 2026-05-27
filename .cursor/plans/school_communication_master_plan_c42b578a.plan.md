---
name: School Communication Master Plan
overview: A comprehensive end-to-end plan to transform the School Portal into a structured school communication and account management center, covering messaging, account management, parent inbox, read receipts, and permissions across 4 implementation phases.
todos:
  - id: review-plan
    content: Owner reviews SCHOOL_COMMUNICATION_AND_ACCESS_MASTER_PLAN.md and answers the 12 open questions
    status: pending
  - id: approve-school-code
    content: Assign school codes to existing schools in DB after migration 030 is applied
    status: pending
  - id: approve-hebrew-copy
    content: Owner approves Hebrew UI copy for Access & Accounts section before Phase 1 implementation
    status: pending
  - id: apply-030-031
    content: Owner manually applies migrations 030 and 031 in Supabase SQL editor
    status: pending
  - id: apply-034
    content: Owner manually applies migration 034 (audit action allowlist extension)
    status: pending
  - id: phase1-impl
    content: "Implement Phase 1: school account management APIs and student card UI"
    status: pending
  - id: phase1-tests
    content: Run Phase 1 test suite (unit, API, permission, Playwright)
    status: pending
  - id: apply-032-033
    content: Owner manually applies migrations 032 and 033 before Phase 2
    status: pending
  - id: phase2-impl
    content: "Implement Phase 2: messaging core, parent inbox, mini-report"
    status: pending
  - id: phase2-tests
    content: Run Phase 2 test suite including multi-child and read-receipt tests
    status: pending
  - id: phase3-impl
    content: "Implement Phase 3: read receipt dashboard, homeroom teacher messaging, counters"
    status: pending
  - id: phase4-plan
    content: Plan Phase 4 optional features based on Phase 2-3 usage data
    status: pending
isProject: false
---

# School Communication and Account Management — Plan Summary

## Document Created
[docs/school-portal/SCHOOL_COMMUNICATION_AND_ACCESS_MASTER_PLAN.md](docs/school-portal/SCHOOL_COMMUNICATION_AND_ACCESS_MASTER_PLAN.md)

## Existing System — Key Findings

### Regular Teacher Flow (exists today)
- Student login: `student_access_codes` table + 4-digit PIN (hashed)
- Parent access: `student_guardian_access` table + PIN (hashed), custom guardian session
- Username format already implemented: `{prefix}-{p|s}{sequence}` (e.g. `leo-p01`, `leo-s01`)
- Teacher gets a unique 3-letter `access_prefix` in `teacher_profiles.access_prefix`
- Crypto reusable: `lib/guardian-server/guardian-crypto.server.js`
- Username allocation reusable: `lib/teacher-server/teacher-access-prefix.server.js`
- PIN shown-once pattern implemented in `GuardianAccessPanel.jsx` / `StudentLoginAccessPanel.jsx`
- Teacher→parent messages: `teacher_parent_messages` table (migration 023), per-student-per-teacher
- Parent report: `buildTeacherStudentReportPayload` (shared, already used by school portal)

### School Portal (exists today)
- Pages: Dashboard, Teachers, Classes, Students
- Auth gate: `requireSchoolManagerApiContext()` — requires `school_admin` role in `school_teacher_memberships`
- Student card: learning report modal only — no Access & Accounts section
- No messaging capability
- No school-level account management
- No parent school inbox
- No read receipts

### Critical Gaps
- `school_accounts` has no `school_code` column
- No school-issued student/parent credential management
- No school→parent or school→teacher messaging
- No parent school inbox
- No read receipts on any message
- No homeroom teacher messaging scope
- No mini-report for parents in school context

## Proposed DB Additions (owner applies manually)

- **Migration 030** — `school_accounts.school_code` (3-4 letters, unique, never changes)
- **Migration 031** — `created_by_school_id` on `student_guardian_access` and `student_access_codes`; new `school_credential_sequences` table (atomic counters)
- **Migration 032** — `school_messages`, `school_message_recipients`, `school_message_read_receipts` tables
- **Migration 033** — `school_id` column on `teacher_parent_messages` (backfill existing rows)
- **Migration 034** — Extend `teacher_access_audit` action allowlist for account + messaging events

## Username Strategy
- School-issued student: `{school_code}-s{sequence}` (e.g. `leo-s0152`)
- School-issued parent: `{school_code}-p{sequence}` (e.g. `leo-p0152`)
- School code: 3-4 lowercase letters, unique, assigned once, never changes
- Permissions NEVER derived from username — all auth via DB relations
- Reuses existing crypto and allocation logic (school-scoped variant)

## Permission Matrix Summary
- School manager (`school_admin`): full account management + all messaging
- Homeroom teacher: send to own class parents only (Phase 3)
- Subject teacher: send to own linked students' parents only (Phase 3)
- Parent: read own school messages + own children's mini-report
- Student: no messaging in Phase 1-3

## Implementation Phases

### Phase 1 — School Account Management (Priority)
- Goal: school manager creates/resets/blocks student and parent accounts from student card
- New APIs: `/api/school/students/[studentId]/accounts/...`
- New components: `SchoolStudentAccessPanel`, `SchoolStudentParentAccessRow`
- Extend: `SchoolReportModal` with Access & Accounts tab
- Migrations: 030, 031, 034
- Forbidden: changing existing teacher/parent flow

### Phase 2 — Messaging Core + Parent Inbox + Mini-Report
- Goal: school manager sends messages; parents receive in school inbox; teacher messages linked to school
- New APIs: `/api/school/messages/...`, `/api/parent/school-messages/...`, `/api/parent/mini-report`
- New pages: `/school/messages`, `/parent/school-inbox`
- New components: compose modal, audience picker, parent inbox list/detail, mini-report card
- Migrations: 032, 033
- Start with `all_parents` audience only; expand later

### Phase 3 — Read Receipts, Advanced Targeting, Dashboard Counters
- Read receipt dashboard (who read / who did not)
- Homeroom teacher → class parents messaging
- Dashboard unread message counters
- School secretary role DB addition
- Segment targeting (grade filter)

### Phase 4 — Future Optional
- Scheduled messages, parent reply, student messaging, push/email notifications, bulk credential export

## Risks
- Wrong parent seeing wrong child's message — mitigated by `recipient_user_id = auth.uid()` checks and RLS
- Duplicate parent accounts — UI warns if account already exists
- Becoming uncontrolled WhatsApp — prevented: no parent-initiated messages, no reply threads in Phase 1-3
- Breaking existing teacher flow — strict API separation, regression test suite
- Hebrew text changed without approval — planning constraint enforced throughout

## Open Questions Requiring Owner Decision
1. Who assigns school codes (admin UI or manual)?
2. One parent credential for multiple children, or one per child? (Recommended: one credential)
3. Guardian session vs. Supabase Auth for school-issued parent accounts?
4. What defines a "homeroom teacher" for messaging eligibility?
5. Is school secretary role needed in Phase 1?
6. Attachment handling: URL-only or file upload?
7. Notification delivery (email/SMS) for urgent messages — Phase 2 or later?
8. Mini-report: new page or dashboard card?
9. Force-change PIN on first parent login — Phase 1 or Phase 2?
10. Existing Supabase Auth parent accounts — should they receive school inbox messages?
11. Hebrew UI copy approval process and approver?
