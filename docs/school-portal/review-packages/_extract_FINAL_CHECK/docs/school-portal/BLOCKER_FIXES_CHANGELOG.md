# Blocker fixes — 2026-05-27 (post–ChatGPT review)

## BLOCKER 1 — Private guardian flow restored

- `/api/guardian/me` returns `isSchoolLinked` (from `created_by_school_id`).
- `ParentTeacherCodeReport.jsx`: school inbox, mini-report, and PIN gate only when `isSchoolLinked`.
- School APIs (`/api/guardian/school-messages/*`, `/api/parent/mini-report`, `/api/guardian/change-pin`) return 403 for non–school-linked sessions.
- `/parent/school-inbox` redirects to `/guardian/view` if not school-linked.

## BLOCKER 2 — Multi-child login (partial; link deferred)

- `guardian-login.server.js`: resolves all active rows per username; PIN match; optional `studentId` in login body.
- If multiple children match: HTTP 409 `guardian_multiple_students` with student list (no session until child chosen).
- `parent/login.js`, `guardian/login.js`, `GuardianChildSelectForm.jsx`: child picker UI.
- **Link existing parent** (`linkSchoolParentByUsername`) returns `501 multi_child_link_deferred`; UI removed from `SchoolStudentAccessPanel`.
- One credential → multiple children: create separate parent access per child at school until full multi-child portal ships.

## BLOCKER 3 — Mini-report response shape

- `pages/api/parent/mini-report.js` now returns `{ data: { miniReport } }` (matches UI).

## BLOCKER 4 — `teacher_parent_messages.school_id`

- New `lib/school-server/resolve-teacher-parent-message-school-id.server.js`.
- `createTeacherParentMessage` sets `school_id` only when teacher membership and student enrollment share **exactly one** school (same rule as migration 033).
- Private teacher messages stay `school_id = NULL`.

## BLOCKER 5 — SQL 034 precheck

- `scripts/school-portal/sql-prechecks/034_teacher_access_audit_precheck.sql` — exact query (not under `docs/`); expect **zero rows** before apply.
- `034_school_account_audit_actions.sql` includes full **029** worksheet allowlist + new school actions.

## Files changed in this pass

| File | Change |
|------|--------|
| `components/parent/ParentTeacherCodeReport.jsx` | School UI gated on `isSchoolLinked` |
| `components/parent/GuardianChildSelectForm.jsx` | **New** |
| `components/school-portal/SchoolStudentAccessPanel.jsx` | Removed link-parent UI |
| `lib/guardian-server/guardian-login.server.js` | Multi-row credential resolve |
| `lib/guardian-server/guardian-session.server.js` | `isSchoolLinkedGuardianAccess()` |
| `lib/parent-client/parent-teacher-code-access.js` | `studentId` login + 409 parse |
| `lib/school-server/school-account-management.server.js` | Link deferred (501) |
| `lib/school-server/resolve-teacher-parent-message-school-id.server.js` | **New** |
| `lib/teacher-server/teacher-parent-messages.server.js` | Ambiguous school_id |
| `pages/api/guardian/me.js` | `isSchoolLinked` |
| `pages/api/guardian/login.js` | `studentId`, 409 payload |
| `pages/api/guardian/change-pin.js` | School-only |
| `pages/api/guardian/school-messages/**` | School-only guard |
| `pages/api/parent/mini-report.js` | `{ miniReport }` wrapper + school guard |
| `pages/parent/login.js` | Child picker |
| `pages/guardian/login.js` | Child picker |
| `pages/parent/school-inbox.js` | Non-school redirect |
| `scripts/school-portal/sql-prechecks/034_teacher_access_audit_precheck.sql` | **New** (precheck; not a migration) |
| `supabase/migrations/033_*.sql` | (prior pass) membership backfill |
| `supabase/migrations/034_*.sql` | (prior pass) 029 superset |
