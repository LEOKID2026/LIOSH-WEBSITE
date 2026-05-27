---
name: School Communication Master Plan
overview: A comprehensive end-to-end plan to transform the School Portal into a structured school communication and account management center, covering messaging to parents AND teachers, teacher staff inbox, mandatory first-login PIN change, account management, and read receipts. Workflow is single-approval then full implementation from start to finish, with one final report at the end.
todos:
  - id: review-plan
    content: Owner reviews SCHOOL_COMMUNICATION_AND_ACCESS_MASTER_PLAN.md and answers the 13 open questions (especially Q3, Q4, Q5, Q9, Q13)
    status: completed
  - id: approve-school-code
    content: Assign school codes to existing schools in DB after migration 030 is applied
    status: pending
  - id: approve-hebrew-copy
    content: Owner approves Hebrew UI copy list (all surfaces, all phases — see Section 16.2 of master plan) before implementation starts
    status: pending
  - id: apply-030-031-034
    content: Owner manually applies migrations 030, 031, and 034 in Supabase SQL editor when agent signals they are ready
    status: pending
  - id: full-implementation
    content: "START FULL SCHOOL PORTAL IMPLEMENTATION — full scope Phases 1 through 3 in order, no inter-phase stops"
    status: pending
  - id: apply-032-033
    content: Owner manually applies migrations 032 and 033 in Supabase SQL editor when agent signals they are required
    status: pending
  - id: final-report
    content: Agent sends ONE final completion report (files, APIs, migrations, tests, regression, manual QA checklist, changed-files package)
    status: pending
  - id: phase4-plan
    content: Plan Phase 4 optional features based on Phase 2-3 usage data
    status: pending
isProject: false
---

# School Communication and Account Management — Plan Summary (Revised)

## Document
[docs/school-portal/SCHOOL_COMMUNICATION_AND_ACCESS_MASTER_PLAN.md](docs/school-portal/SCHOOL_COMMUNICATION_AND_ACCESS_MASTER_PLAN.md)

## Revision Summary (2026-05-27)

Seven required changes have been incorporated:

1. **School Manager → Teachers messaging** — dedicated plan added (Section 10.4): all-teachers, by grade, by subject, by class team, specific teacher; teacher staff inbox at `/teacher/school-messages`; read receipts for teachers; teacher unread dashboard.
2. **Final target model expanded** — Section 10.3 now lists all parent and teacher audience types with phase labels.
3. **Student card design clarified** — explicit decision: two-tab modal inside existing `SchoolReportModal` (Tab 1: Learning Report, Tab 2: Access & Accounts). Rationale documented. New dedicated page rejected with explanation.
4. **Mandatory first-login PIN change** — moved from Phase 4 to Phase 1. `must_change_pin` column added to migration 031. Parent PIN-change gate (`ParentMustChangePinGate`) and `POST /api/guardian/change-pin` API added.
5. **Open questions count fixed** — was 11 in plan summary, 12 in document body. Now 13 in both (added Q13 about teacher inbox placement). Count matches throughout.
6. **Single-approval workflow** — phases are internal technical execution order only, not stop points. Agent proceeds from Step 1 through Step 3 without inter-step owner approval. Only allowed pause: owner manually applying a required migration file. One final report at the end.
7. **Final QA closure requirements** — Section 12.5 added with 12 subsections: file list, DB/migration status, APIs, UI, tests run, tests not run, manual QA checklist, mobile/desktop checks, permission/security checks, regression checks, multi-child and limited-scope tests, and 6 confirmation statements.

## Key Technical Decisions

- **Student card**: 2-tab modal inside `SchoolReportModal` (not a new page, not a section below report)
- **Teacher inbox**: new page `/teacher/school-messages` with badge in teacher nav (Q13 confirmed by owner)
- **Parent PIN**: 6 digits, mandatory change on first login from Phase 1 (`must_change_pin = true`)
- **Student PIN**: 4 digits, no mandatory first-login change
- **Messaging**: school manager → parents (Phase 2) + school manager → teachers (Phase 2); homeroom teacher → class parents (Phase 3)
- **Fan-out table**: `school_message_recipients` handles both parent and teacher recipients via `recipient_type` column

## Proposed DB Additions (owner applies manually)

- **Migration 030** — `school_accounts.school_code` (3-4 letters, unique, never changes)
- **Migration 031** — `created_by_school_id` + `must_change_pin` on `student_guardian_access`; `created_by_school_id` on `student_access_codes`; new `school_credential_sequences` table
- **Migration 032** — `school_messages`, `school_message_recipients`, `school_message_read_receipts` (supports parent + teacher recipients and read receipts)
- **Migration 033** — `school_id` column on `teacher_parent_messages` (backfill existing rows)
- **Migration 034** — Extend `teacher_access_audit` action allowlist for account + messaging events (including `school_parent_pin_changed_by_parent`)

## Implementation Phases

### Internal Execution Step 1 — School Account Management + Mandatory First-Login PIN Change
- New APIs: `/api/school/students/[studentId]/accounts/...`, `POST /api/guardian/change-pin`
- New components: `SchoolStudentAccessPanel`, `SchoolStudentParentAccessRow`, `SchoolCredentialShownOnceBox`, `ParentMustChangePinGate`
- Extend: `SchoolReportModal` → two-tab modal (Learning Report + Access & Accounts)
- SQL required: migrations 030, 031, 034 (owner applies when signalled — only allowed pause)

### Internal Execution Step 2 — Messaging Core: Parent Inbox + Teacher Inbox + Mini-Report
- Initial scope: `all_parents` and `all_teachers` only; expand to grade/class/subject within this step
- New APIs: `/api/school/messages/...`, `/api/parent/school-messages/...`, `/api/teacher/school-messages/...`, `/api/parent/mini-report`
- New pages: `/school/messages`, `/parent/school-inbox`, `/teacher/school-messages`
- New components: compose modal + audience picker (parent + teacher sides), parent inbox, teacher inbox, mini-report card
- SQL required: migrations 032, 033 (owner applies when signalled — only allowed pause)

### Internal Execution Step 3 — Read Receipt Dashboard + Advanced Targeting + Homeroom Teacher Messaging
- Read receipt panel with parent/teacher tabs; manager sees counts broken out by type
- Advanced audience targeting (grade, subject, class team for both parents and teachers)
- Homeroom teacher → class parents messaging
- Dashboard unread counters (separate parent/teacher stat cards)
- School secretary role CHECK constraint added (no UI)

### Phase 4 — Future Optional
- Scheduled messages, parent reply, push/email notifications, bulk credential export, school secretary UI

## Scope Boundary (Non-Negotiable)
- **Regular private teachers and regular non-school parents must remain completely unchanged.**
- Allowed impact area: `/school/**`, `/teacher/school-messages`, additive-only changes to `/parent/dashboard`, new `/parent/school-inbox`, new `/api/parent/school-messages/`, new `/api/teacher/school-messages/`.
- No changes to existing teacher portal routes or components outside school messaging.
- No changes to existing parent dashboard behavior outside new school inbox card.
- No changes to existing parent report or private teacher message panel.

## Approved Workflow
1. Owner reviews final plan and Hebrew copy list, then gives explicit command: **`START FULL SCHOOL PORTAL IMPLEMENTATION`**
2. Agent implements full scope (Steps 1 → 2 → 3) without stopping between steps.
3. Agent pauses ONLY when a migration file must be manually applied by owner before DB integration tests can run. Agent states which file, owner applies it, agent continues automatically.
4. Agent sends ONE final completion report at the end of all steps.
5. Owner uploads report + changed-files package to ChatGPT.
6. Owner and ChatGPT review at the end. Owner performs manual UI/QA checks.
7. Owner decides acceptance.

## Constraints (Non-Negotiable, All Phases)
- Agent never executes SQL
- Agent never commits
- Agent never pushes
- Owner manually applies all migrations in Supabase SQL editor
- No Hebrew text created or changed without owner approval of exact wording
- No design changes to existing screens without approval

## Owner Decisions — All 13 Answered (2026-05-27)

1. **School code assignment** — Manual/administrative only. No UI in Phase 1.
2. **Parent credential model** — One credential per parent, linked to multiple children.
3. **Guardian session vs. Auth** — Use existing guardian/custom session. No Supabase Auth merge.
4. **Homeroom teacher definition** — Primary/homeroom teacher of a physical class. Phase 3 must confirm schema source of truth before enabling homeroom messaging.
5. **School secretary role** — Phase 3/4 only. Not Phase 1.
6. **Attachments** — No file upload in initial messaging phase. URL-only if needed later.
7. **Email/SMS/push** — Not Phase 1 or initial Phase 2. Portal-only.
8. **Mini-report** — Parent dashboard card/section with link to detailed report.
9. **First-login parent PIN change** — Approved for Phase 1. Student PIN: no mandatory change.
10. **Existing Supabase Auth parents** — Do not merge. No changes without separate audit.
11. **Student messaging** — Not Phase 1-3. Future/optional only.
12. **Hebrew copy** — Agent prepares exact list of new labels; owner approves before implementation.
13. **Teacher inbox placement** — Dedicated page `/teacher/school-messages` with badge. Approved.

## Approved Full Scope (Steps 1–3, all delivered before final report)
- Step 1: school account management, student + parent credentials, two-tab modal, shown-once PIN, mandatory parent first-login PIN change, reset/block/unblock/revoke/link/unlink, audit log
- Step 2: messaging core, school → parents, school → teachers, parent school inbox, teacher school inbox, mini-report card
- Step 3: read receipt dashboard, advanced targeting, homeroom teacher messaging, dashboard counters
- Hebrew copy: entire list approved before implementation starts (see Section 16.2 of master plan)
- Excluded from all steps: messaging-free private teacher flow changes, regular parent dashboard changes, secretary role UI, file attachments, email/SMS/push notifications, student messaging
