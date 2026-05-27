# School Portal Implementation — Review Package File Manifest

**Updated:** 2026-05-27 (post-SQL; ZIP rebuilt with content fingerprint)  
**No commit, no push.**

---

## Review ZIP (upload this file only)

| Property | Value |
|----------|--------|
| Path | `docs/school-portal/review-packages/school-portal-implementation-review.zip` |
| Rebuild | `powershell -File scripts/school-portal/build-review-zip.ps1` |
| Integrity | `docs/school-portal/review-packages/ZIP_CONTENT_FINGERPRINT.txt` (generated inside ZIP) |

After rebuild, confirm `ZIP_CONTENT_FINGERPRINT.txt` inside the ZIP shows `033_uses_array_agg: true` and `033_uses_min_school_id: false`.

---

## Owner SQL applied (all complete)

| Order | Item | Status |
|-------|------|--------|
| 1 | `030_school_code.sql` | Applied |
| 2 | `031_school_account_management.sql` | Applied |
| 3 | `034_school_account_audit_actions.sql` | Applied (precheck zero rows) |
| 4 | `school_code = leok` on `bb4e5984-d95f-438f-a465-e1a8208ea7de` | Applied |
| 5 | `032_school_messaging.sql` | Applied |
| 6 | `033_teacher_parent_messages_school_context.sql` (ARRAY_AGG fix) | Applied |

---

## Critical files in package (must match repo)

| File | Must contain | Must NOT contain |
|------|----------------|------------------|
| `supabase/migrations/033_…sql` | `ARRAY_AGG(DISTINCT school_id)` | `MIN(school_id)` |
| `SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md` | `POST-SQL COMPLETE`, owner SQL table | `Status: pre-SQL`, `Do not apply migrations` |
| Precheck path | `scripts/school-portal/sql-prechecks/034_teacher_access_audit_precheck.sql` | legacy docs-only precheck file (removed) |

---

## Full `git status --short`

```
 M .cursor/plans/school_communication_master_plan_c42b578a.plan.md
 M components/parent/ParentTeacherCodeReport.jsx
 M components/school-portal/SchoolPortalShell.jsx
 M components/school-portal/SchoolReportModal.jsx
 M components/teacher-portal/TeacherPortalShell.jsx
 M lib/guardian-server/guardian-login.server.js
 M lib/guardian-server/guardian-session.server.js
 M lib/parent-client/parent-teacher-code-access.js
 M lib/school-server/school-session.server.js
 M lib/teacher-server/teacher-parent-messages.server.js
 M pages/api/guardian/login.js
 M pages/api/guardian/me.js
 M pages/guardian/login.js
 M pages/parent/login.js
 M pages/school/dashboard.js
 M pages/school/students/index.js
?? .cursor/plans/private_teacher_worksheet_pdf_b2edf48e.plan.md
?? components/parent/GuardianChildSelectForm.jsx
?? components/parent/ParentMustChangePinGate.jsx
?? components/school-portal/SchoolCredentialShownOnceBox.jsx
?? components/school-portal/SchoolStudentAccessPanel.jsx
?? components/school-portal/SchoolStudentParentAccessRow.jsx
?? docs/school-portal/BLOCKER_FIXES_CHANGELOG.md
?? docs/school-portal/REVIEW_PACKAGE_FILE_MANIFEST.md
?? docs/school-portal/SCHOOL_PORTAL_IMPLEMENTATION_COMPLETION_REPORT.md
?? docs/school-portal/SCHOOL_PORTAL_PHASE4_PLAN.md
?? docs/school-portal/SCHOOL_PORTAL_SQL_REVIEW_PACKAGE.md
?? docs/school-portal/review-packages/
?? lib/school-portal/school-communication.he.js
?? lib/school-server/resolve-teacher-parent-message-school-id.server.js
?? lib/school-server/school-access-username.server.js
?? lib/school-server/school-account-management.server.js
?? lib/school-server/school-messaging.server.js
?? pages/api/guardian/change-pin.js
?? pages/api/guardian/school-messages/
?? pages/api/parent/mini-report.js
?? pages/api/school/messages/
?? pages/api/school/students/[studentId]/accounts/
?? pages/api/teacher/school-messages/
?? pages/parent/school-inbox.js
?? pages/school/messages.js
?? pages/teacher/school-messages.js
?? scripts/school-portal/build-review-zip.ps1
?? scripts/school-portal/sql-prechecks/
?? scripts/school-portal/test-school-messaging.mjs
?? scripts/school-portal/verify-034-precheck.mjs
?? supabase/migrations/030_school_code.sql
?? supabase/migrations/031_school_account_management.sql
?? supabase/migrations/032_school_messaging.sql
?? supabase/migrations/033_teacher_parent_messages_school_context.sql
?? supabase/migrations/034_school_account_audit_actions.sql
```

---

## Migrations (untracked)

- `supabase/migrations/030_school_code.sql` through `034_school_account_audit_actions.sql`
- `033` uses `(ARRAY_AGG(DISTINCT school_id))[1]` (not `MIN(school_id)`)

## Precheck (not a migration)

- `scripts/school-portal/sql-prechecks/034_teacher_access_audit_precheck.sql`
