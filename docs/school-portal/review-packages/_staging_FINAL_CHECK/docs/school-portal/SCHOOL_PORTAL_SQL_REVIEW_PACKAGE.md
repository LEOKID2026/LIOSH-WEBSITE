# School Portal — SQL & Review Package (pre-apply)

**Purpose:** ChatGPT/owner review before any migration is run in Supabase.  
**Agent did not execute SQL.**

---

## A. Migration 032 — service-role-only access

### Confirmation

| Layer | Writes to messaging tables? |
|-------|----------------------------|
| `lib/school-server/school-messaging.server.js` | Yes — via `serviceRole.from(...)` |
| `pages/api/school/messages/**` | No — delegates to server lib |
| `pages/api/guardian/school-messages/**` | No — delegates to server lib |
| `pages/api/teacher/school-messages/**` | No — delegates to server lib |
| React pages (`/school/messages`, `/parent/school-inbox`, `/teacher/school-messages`) | No — `fetch()` to API routes only |
| `components/**` | No matches for `school_messages` / `school_message_recipients` / `school_message_read_receipts` |

Guardian/parent inbox uses **`/api/guardian/school-messages`** (guardian cookie session), not Supabase client.

### RLS

Migration enables RLS on all three tables with **no GRANT policies** for `authenticated` / `anon`. In Supabase, that means browser JWTs cannot read or write these tables. Only the **service role** (API routes) bypasses RLS.

### 032 status

**Acceptable for review** with documented access model (header comment added in migration file).

---

## B. Migration 033 — backfill rewrite

### Problem (original)

```sql
SET school_id = tp.school_id FROM teacher_profiles tp ...
```

`teacher_profiles.school_id` is not the membership source of truth and can be wrong or stale.

### Fix (rewritten file)

Backfill sets `school_id` only when:

1. `school_teacher_memberships` links `teacher_id` on the message to a school, and  
2. `school_student_enrollments` links the message’s `student_id` to the **same** school with `unenrolled_at IS NULL`, and  
3. Exactly **one** distinct `school_id` satisfies both.

If 0 or 2+ schools match → `school_id` remains `NULL`.

Optional post-apply precheck queries are commented at the bottom of `033_teacher_parent_messages_school_context.sql`.

### 033 status

**Rewritten — ready for re-review** (not approved until owner/ChatGPT sign off).

---

## C. Migration 034 — audit CHECK constraint safety

### Authoritative prior allowlist

If **`029_worksheet_activities.sql`** is applied, the current DB constraint is defined in **029** (includes worksheet actions).  
If only through **028**, use **028** list (no worksheet actions).

**034 must be a superset of 029**, not a replacement that drops values.

### Bug found in first draft of 034

First draft **omitted six actions** from 029:

- `worksheet_activity_created`
- `worksheet_activity_activated`
- `worksheet_activity_closed`
- `worksheet_activity_archived`
- `worksheet_pdf_uploaded`
- `worksheet_result_published`

Applying that draft would **break inserts** for worksheet audit rows.

### Fix

`034_school_account_audit_actions.sql` now lists **029 full set + new school account/messaging actions** (see file comments).

### Owner precheck (run in Supabase **before** applying 034)

Canonical file (not a migration; not under `docs/`):

`scripts/school-portal/sql-prechecks/034_teacher_access_audit_precheck.sql`

```sql
-- Rows that would violate the new constraint if any action exists outside the allowlist:
SELECT action, COUNT(*) AS n
FROM public.teacher_access_audit
WHERE action NOT IN (
  'grant_created','grant_revoked','grant_expired','pin_rotated','username_rotated',
  'magic_link_sent','magic_link_consumed','magic_link_expired',
  'guardian_login_success','guardian_login_failed','guardian_logout',
  'teacher_link_created','teacher_link_archived','teacher_onboarded',
  'class_created','class_archived','class_updated','class_member_added','class_member_removed',
  'viewed_student_report','viewed_class_report',
  'link_created','link_archived','link_consent_failed','link_limit_reached',
  'consent_issued','consent_revoked','magic_link_issued',
  'student_created_by_teacher','student_name_updated',
  'activity_created','activity_activated','activity_paused','activity_closed','activity_archived',
  'school_subject_granted','school_subject_revoked',
  'school_student_enrolled','school_student_unenrolled',
  'school_class_viewed','school_student_report_viewed',
  'school_student_class_transferred','school_class_teacher_reassigned','school_class_archived',
  'worksheet_activity_created','worksheet_activity_activated','worksheet_activity_closed',
  'worksheet_activity_archived','worksheet_pdf_uploaded','worksheet_result_published',
  'school_student_access_created','school_student_access_revoked','school_student_pin_rotated',
  'school_student_access_blocked','school_student_access_unblocked',
  'school_parent_access_created','school_parent_access_revoked','school_parent_pin_rotated',
  'school_parent_access_blocked','school_parent_access_unblocked',
  'school_parent_linked_to_student','school_parent_unlinked_from_student',
  'school_parent_pin_changed_by_parent',
  'school_message_sent','school_message_hidden','school_message_read'
)
GROUP BY action
ORDER BY n DESC;
```

Expected: **zero rows** before apply.

Also list distinct actions for manual diff:

```sql
SELECT DISTINCT action FROM public.teacher_access_audit ORDER BY 1;
```

### 034 status

**Fixed in repo — pending owner/ChatGPT approval** after precheck.

---

## SQL approval summary (owner tracker)

| File | Review status |
|------|----------------|
| `030_school_code.sql` | Appears acceptable |
| `031_school_account_management.sql` | Appears acceptable |
| `032_school_messaging.sql` | Pending confirmation — access model documented above |
| `033_teacher_parent_messages_school_context.sql` | **Rewritten** — re-review required |
| `034_school_account_audit_actions.sql` | **Fixed** (029 superset) — precheck required — not approved yet |

**Do not apply 032–034 until ChatGPT review completes.**
