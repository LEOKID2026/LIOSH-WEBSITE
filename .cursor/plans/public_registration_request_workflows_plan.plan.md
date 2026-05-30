# Public Registration / Request Workflows Plan (Phase 6)

**Status:** PLAN ONLY — no code changed, no SQL created, no migration created, no UI changed, no Hebrew changed, no commit, no push, no deploy.

**Recommended order:** Implement password reset (Phase 7 / `persona_password_reset_plan.plan.md`) first. Phase 6 is larger and involves more owner decisions. Do not begin Phase 6 implementation until password reset is deployed and stable.

---

## 1. Background and Product Rules

### 1.1 What this plan covers

Two distinct public request flows:

1. **Private teacher self-registration request** — a person asks to become a private teacher on the platform; Platform Admin reviews and approves or rejects.
2. **School registration request** — a school administrator requests to register a school on the platform; Platform Admin reviews, approves, configures quotas, and assigns a School Manager.

### 1.2 What this plan does NOT cover

- OAuth / social login (separate future plan)
- Payment integration (separate future plan)
- Password reset for any persona (`persona_password_reset_plan.plan.md`)
- School Teacher self-registration — school teachers are **created by School Manager**, not by public registration. They will use school code/PIN login per `school_staff_code_pin_login_plan.plan.md`.
- School Operator self-registration — same as school teacher: created by School Manager.
- Student registration — created by School Manager.
- Guardian access — created by School Manager.
- Hard-delete of any user.
- English-visible UI.
- Changing student/guardian login flows.
- Broad login page redesign.

### 1.3 Staffing model (relationship to staff code/PIN plan)

| Persona | Created by | Login method |
|---------|-----------|-------------|
| Platform Admin | Manual / seed | email + password |
| School Manager | Platform Admin | email + password |
| Private Teacher | Platform Admin (after request) | email + password |
| School Teacher | School Manager | school code + PIN (future; per `school_staff_code_pin_login_plan.plan.md`) |
| School Operator/Secretary | School Manager | school code + PIN (future) |
| School Student | School Manager | school code + PIN |
| School Guardian | School Manager | school code + PIN |

Public self-registration for school teachers and operators is **not part of this plan and must not be built**.

### 1.4 Critical product rule — no auto-activation

- A private teacher request must **never** auto-create an active `private_teacher` entitlement.
- A school registration request must **never** auto-create an active school account or an active `school_manager` entitlement.
- There is no `TEACHER_SIGNUP_MODE` or equivalent. Approval is always required.
- This rule is not configurable.

---

## 2. Current Auth and Entitlement Model

### 2.1 Relevant existing tables

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase-managed auth users; `app_metadata.role` = `teacher` or `parent` |
| `account_persona_entitlements` | Central access table; `persona`, `status` (`pending`/`active`/`suspended`/`rejected`/`revoked`), `approval_source` |
| `teacher_profiles` | Profile row for all teacher personas; `id` FK to `auth.users(id)` |
| `teacher_limits` | Quota/feature row for private teachers |
| `school_accounts` | One row per approved school |
| `school_teacher_memberships` | Maps teacher → school; `role` = `teacher`/`school_admin`/`school_operator` |

### 2.2 `account_persona_entitlements` status lifecycle

```
pending → active     (admin approval)
pending → rejected   (admin rejection)
active  → suspended  (admin suspend)
active  → revoked    (admin revoke)
```

The `pending` status is the schema default. The table and guards already support it (`entitlementStatusToErrorCode("pending")` → `"entitlement_pending"` → 403 in API guards). Nothing new needs to be added to the entitlement table schema.

### 2.3 What `pending` means at runtime

When an entitlement row exists with `status = 'pending'`:
- `assertActivePersonaEntitlement` returns `{ ok: false, code: "entitlement_pending" }`
- All persona-gated APIs return 403
- The user can log in (auth is separate from entitlement) but cannot access their portal
- This is the correct behavior for a request that is under review

### 2.4 `approval_source` values relevant to this plan

| Value | When used |
|-------|----------|
| `self_signup` | User submitted a public registration request |
| `admin` | Platform Admin directly created the entitlement (existing behavior) |

---

## 3. Private Teacher Request Flow

### 3.1 States and transitions

```
[No account] → [Request submitted: pending entitlement] → [Admin reviews]
                                                         ↓               ↓
                                                   [Approved: active]  [Rejected: rejected]
                                                         ↓
                                             [Admin sets subjects, limits, features]
```

State | `account_persona_entitlements.status` | Access
------|--------------------------------------|-------
Request submitted | `pending` | Blocked (403 `entitlement_pending`)
Admin approved | `active` | Full teacher portal access
Admin rejected | `rejected` | Blocked (403 `entitlement_rejected`)
Admin suspended | `suspended` | Blocked (403 `entitlement_suspended`)
Admin revoked | `revoked` | Blocked (403 `entitlement_revoked`)

### 3.2 Request submission flow

1. User visits `/teacher/login` → clicks a new "Request access" tab (design mirrors the existing parent signup tab pattern; matches dark visual language).
2. User submits: full name, email address, subjects requested (checkboxes), optional brief description / motivation.
3. **Server-side (new API `POST /api/auth/teacher-request`):**
   a. Check: does an `auth.users` row exist with this email?
      - If yes: use the existing `user_id`. Do not create a second auth user.
      - If no: call Supabase Admin API to create an auth user (`role: teacher`) and send an invitation email (or password-setup email). **Owner decision required** — see Section 7, Open Decision 1.
   b. Upsert a `teacher_profiles` row if none exists.
   c. Insert `account_persona_entitlements` row: `persona = 'private_teacher'`, `status = 'pending'`, `approval_source = 'self_signup'`.
   d. If a row already exists with `status` other than `rejected`, return an appropriate error (no duplicate pending requests).
   e. Optionally store the requested subjects and description in a separate `teacher_registration_requests` table for admin review context. **Owner decision required** — see Section 7, Open Decision 2.
   f. Return success.
4. Show Hebrew success message: request submitted, under review.
5. No email is sent by the app to the Platform Admin at this point unless email notification is explicitly approved — see Section 7, Open Decision 3.

### 3.3 Admin review flow (approval)

The existing admin teacher detail page (`/admin/teachers/[teacherId]`) already shows:
- Entitlement status via `AdminUserLifecyclePanel`
- Plan/quota via `TeacherAdminDetailView`
- Lifecycle actions: `suspend`, `reactivate`, `revoke` via `POST /api/admin/users/[userId]/lifecycle`

For the registration request workflow, the following needs to be **added** to the admin UI:

| Addition | File | Description |
|----------|------|-------------|
| "Pending requests" filter/tab | `pages/admin/teachers/index.js` | Filter teacher list to show only `pending` private_teacher entitlements |
| Approve action | `pages/admin/teachers/[teacherId].js` | Calls the lifecycle `reactivate` action (sets `status = 'active'`) |
| Reject action | `pages/admin/teachers/[teacherId].js` | Calls a new `reject` lifecycle action (sets `status = 'rejected'`; stores reason) |
| Subject grant UI | `pages/admin/teachers/[teacherId].js` | Already exists — admin grants subjects and sets `teacher_limits` after approval |

> The `reactivate` lifecycle action already sets `status = 'active'`. A new `reject` action needs to be added to `lib/admin-server/admin-lifecycle.server.js` and `POST /api/admin/users/[userId]/lifecycle` if not already present. Current code has `suspend`, `reactivate`, `revoke` — `reject` may need to be added.

### 3.4 What admin does after approving a private teacher

1. Set `status = 'active'` (via approve/reactivate action).
2. Grant subjects via `POST /api/admin/teachers/[teacherId]/discussion-subjects` (already exists).
3. Set `teacher_limits` (max students, max classes, features) via `PATCH /api/admin/teachers/[teacherId]/quotas` (already exists).
4. Optionally enable features via `PATCH /api/admin/teachers/[teacherId]/features` (already exists).

No new APIs are required for step 2–4. They already exist and are used in the current admin teacher detail page.

### 3.5 What a pending teacher sees

After submitting a request:
- They can log in to the teacher portal (auth works).
- `GET /api/teacher/me` returns an error or a limited response because no active entitlement exists.
- The teacher portal shows a "pending" state page rather than redirecting to the dashboard.
- The pending state page must be Hebrew-only.

This requires a small addition to `pages/teacher/login.js` or `pages/teacher/dashboard.js`: detect the `entitlement_pending` error from `/api/teacher/me` and show a Hebrew pending message instead of an error redirect.

---

## 4. School Registration Request Flow

### 4.1 States and transitions

```
[School request submitted: pending school_accounts + pending school_manager entitlement]
  → [Admin reviews]
         ↓                      ↓
  [Approved: active school,    [Rejected: school_accounts row updated,
   active school_manager]       pending manager entitlement → rejected]
```

State | `school_accounts.is_active` | `school_manager` entitlement | Access
------|----------------------------|------------------------------|-------
Request submitted | `false` | `pending` | Blocked
Admin approved | `true` | `active` | School portal accessible
Admin rejected | `false` | `rejected` | Blocked

### 4.2 Request submission flow

1. User visits a new public route `/school/register` (or a tab on `/teacher/login` — **Owner decision required**, see Section 7, Open Decision 4).
2. User submits: school name, city, contact email, contact person name, number of teachers (approximate), number of students (approximate), optional message.
3. **Server-side (new API `POST /api/auth/school-request`):**
   a. Insert a `school_accounts` row with `is_active = false`, `name = schoolName`, `city`, `contact_email`. All quota fields (`max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`) left null or set to safe defaults.
   b. Check or create an `auth.users` row for the contact email (same auth-user creation decision as private teacher — see Section 7, Open Decision 1).
   c. Upsert a `teacher_profiles` row for the contact user.
   d. Insert `school_teacher_memberships` row: `teacher_id = contactUserId`, `school_id = newSchoolId`, `role = 'school_admin'`.
   e. Insert `account_persona_entitlements`: `persona = 'school_manager'`, `status = 'pending'`, `approval_source = 'self_signup'`.
   f. Return success.
4. Show Hebrew success message.

### 4.3 Admin review flow (approval)

The existing admin school detail page (`/admin/schools/[schoolId]`) already allows:
- Setting quotas (`max_school_teachers`, `max_school_managers`, `max_school_students`, `max_school_operators`)
- Assigning/removing teachers and managers
- Viewing school status

For the registration request workflow, add:

| Addition | File | Description |
|----------|------|-------------|
| "Pending schools" filter | `pages/admin/schools/index.js` | Filter school list to show `is_active = false` schools |
| Approve action | `pages/admin/schools/[schoolId].js` | Sets `school_accounts.is_active = true`; sets school_manager entitlement `status = 'active'`; prompts admin to set quotas |
| Reject action | `pages/admin/schools/[schoolId].js` | Sets manager entitlement `status = 'rejected'`; school_accounts row may be soft-deleted or left inactive |

### 4.4 What admin does after approving a school

1. Set `school_accounts.is_active = true`.
2. Set quotas: `max_school_teachers`, `max_school_managers = 1`, `max_school_students`, `max_school_operators`.
3. Activate school manager entitlement: `school_manager` → `status = 'active'`.
4. Optionally configure enabled tools/features on the school account.

### 4.5 What a pending school manager sees

Same pattern as pending teacher: they can log in but `/api/teacher/me` detects `school_manager` entitlement `status = pending` → show a Hebrew pending state page.

---

## 5. Required Database Changes

### 5.1 Assessment: are new tables needed?

**For the request and entitlement data:** No new tables required. `account_persona_entitlements` with `status = 'pending'` and `approval_source = 'self_signup'` covers both flows.

**For storing request metadata** (requested subjects for teacher, approximate counts for school): This is the key open decision (see Section 7, Open Decision 2). Options:

| Option | Pros | Cons |
|--------|------|------|
| A — Store in existing tables only | No new migration | Admin sees less context for review |
| B — Add `teacher_registration_requests` table | Rich review context | Requires new migration (owner must approve and run) |
| C — Add `school_registration_requests` table | Rich review context | Requires new migration (owner must approve and run) |

**Recommendation:** Option B and C. The admin needs to see what subjects the teacher requested and what the school submitted. However, both migrations must be reviewed and run by the owner before implementation begins.

### 5.2 Proposed migration for teacher registration requests (if Option B approved)

**File:** `supabase/migrations/048_teacher_registration_requests.sql` (or next available number)

> Note: Migration 048 may already be used by `school_staff_code_pin_login_plan.plan.md`. Check actual migration count before numbering.

```sql
-- Purpose: Store metadata submitted with private teacher registration requests.
-- Safety: New table only. No existing data modified.
-- Rollback: DROP TABLE IF EXISTS public.teacher_registration_requests CASCADE;

CREATE TABLE IF NOT EXISTS public.teacher_registration_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_subjects  text[]  NULL,
  description     text        NULL CHECK (description IS NULL OR char_length(description) <= 1000),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS trr_user_id_idx ON public.teacher_registration_requests (user_id);
CREATE INDEX IF NOT EXISTS trr_status_idx  ON public.teacher_registration_requests (status);

ALTER TABLE public.teacher_registration_requests ENABLE ROW LEVEL SECURITY;
```

**Verification query (owner runs after migration):**
```sql
SELECT count(*) FROM public.teacher_registration_requests;
-- Expected: 0 (new table, no rows yet)
```

### 5.3 Proposed migration for school registration requests (if Option C approved)

**File:** next available migration number after teacher requests migration.

```sql
-- Purpose: Store metadata submitted with school registration requests.
-- Safety: New table only. No existing data modified.
-- Rollback: DROP TABLE IF EXISTS public.school_registration_requests CASCADE;

CREATE TABLE IF NOT EXISTS public.school_registration_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           uuid        NULL REFERENCES public.school_accounts(id) ON DELETE SET NULL,
  contact_user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name        text        NOT NULL,
  contact_email       text        NOT NULL,
  approx_teachers     integer     NULL,
  approx_students     integer     NULL,
  message             text        NULL CHECK (message IS NULL OR char_length(message) <= 1000),
  status              text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS srr_status_idx ON public.school_registration_requests (status);

ALTER TABLE public.school_registration_requests ENABLE ROW LEVEL SECURITY;
```

**Verification query (owner runs after migration):**
```sql
SELECT count(*) FROM public.school_registration_requests;
-- Expected: 0
```

### 5.4 Existing table changes needed

`school_accounts.is_active` — already a boolean field used in existing guards (`school.is_active === false` → 403 `school_inactive`). No schema change needed.

`account_persona_entitlements.approval_source` — `'self_signup'` is already a valid value. No schema change needed.

`admin-lifecycle.server.js` — the `reject` action may need to be added if not already implemented (check: current actions are `suspend`, `reactivate`, `revoke`). This is a code change, not a migration.

---

## 6. Required New APIs

### 6.1 Private teacher registration

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/teacher-request` | None (public) | Submit registration request; creates pending entitlement |
| `GET` | `/api/admin/teachers?status=pending` | Admin | Filter teacher list to pending requests (extend existing) |

### 6.2 School registration

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/school-request` | None (public) | Submit school registration request |
| `GET` | `/api/admin/schools?status=pending` | Admin | Filter school list to pending requests (extend existing) |
| `POST` | `/api/admin/schools/[schoolId]/approve` | Admin | Approve school; activate school + manager |
| `POST` | `/api/admin/schools/[schoolId]/reject` | Admin | Reject school request |

### 6.3 Lifecycle `reject` action (if not already implemented)

`POST /api/admin/users/[userId]/lifecycle` with `{ action: "reject", persona, reason }` → sets `status = 'rejected'` in `account_persona_entitlements`. Check `lib/admin-server/admin-lifecycle.server.js` — if `reject` is not already handled, add it alongside `suspend`, `reactivate`, `revoke`.

### 6.4 Security rules for all new public APIs

- `POST /api/auth/teacher-request` and `POST /api/auth/school-request` are unauthenticated (public submission forms).
- They must not accept arbitrary JSON fields.
- They must validate all inputs server-side (name length, email format, subjects from allowlist).
- They must return the same success response regardless of whether an auth user was created — prevents user enumeration.
- Rate limiting: add application-level rate limiting (by IP) to prevent spam. Use the existing `lib/security/login-rate-limit.js` pattern.
- No personal data is logged in plain-text audit rows; store only `user_id` and action type.

---

## 7. Hebrew Copy Required (Owner Approval Gate)

All UI must be Hebrew-only. No English visible text. No raw DB keys. This is a hard gate before any implementation begins.

### 7.1 Private teacher request form

| Key (proposed) | Suggested Hebrew |
|---------------|-----------------|
| `REG_TEACHER_TITLE` | `בקשה להצטרף כמורה/ת פרטי/ת` |
| `REG_TEACHER_NAME_LABEL` | `שם מלא` |
| `REG_TEACHER_EMAIL_LABEL` | `כתובת דוא״ל` |
| `REG_TEACHER_SUBJECTS_LABEL` | `מקצועות מבוקשים` |
| `REG_TEACHER_DESCRIPTION_LABEL` | `מידע נוסף (אופציונלי)` |
| `REG_TEACHER_SUBMIT` | `שליחת בקשה` |
| `REG_TEACHER_SUCCESS` | `בקשתך התקבלה. הצוות יבדוק אותה ויצור קשר בהקדם.` |
| `REG_TEACHER_ALREADY_PENDING` | `בקשה כבר ממתינה לאישור.` |

### 7.2 School registration form

| Key (proposed) | Suggested Hebrew |
|---------------|-----------------|
| `REG_SCHOOL_TITLE` | `רישום בית ספר` |
| `REG_SCHOOL_NAME_LABEL` | `שם בית הספר` |
| `REG_SCHOOL_CITY_LABEL` | `עיר` |
| `REG_SCHOOL_CONTACT_NAME_LABEL` | `שם איש קשר` |
| `REG_SCHOOL_CONTACT_EMAIL_LABEL` | `דוא״ל איש קשר` |
| `REG_SCHOOL_APPROX_TEACHERS_LABEL` | `מספר מורים משוער` |
| `REG_SCHOOL_APPROX_STUDENTS_LABEL` | `מספר תלמידים משוער` |
| `REG_SCHOOL_MESSAGE_LABEL` | `הערות (אופציונלי)` |
| `REG_SCHOOL_SUBMIT` | `שליחת בקשת רישום` |
| `REG_SCHOOL_SUCCESS` | `בקשת הרישום התקבלה. הצוות יבדוק אותה ויצור קשר בהקדם.` |

### 7.3 Pending state pages

| Key (proposed) | Suggested Hebrew |
|---------------|-----------------|
| `PENDING_TEACHER_HEADING` | `בקשתך ממתינה לאישור` |
| `PENDING_TEACHER_BODY` | `הגשת בקשה להצטרף כמורה/ת. הצוות יבדוק את בקשתך ויעדכן אותך בהקדם.` |
| `PENDING_SCHOOL_HEADING` | `רישום בית הספר ממתין לאישור` |
| `PENDING_SCHOOL_BODY` | `בקשת רישום בית הספר התקבלה. לאחר האישור תקבל/י גישה לפורטל הניהול.` |

### 7.4 Admin review labels

| Key (proposed) | Suggested Hebrew |
|---------------|-----------------|
| `ADMIN_PENDING_REQUESTS_TAB` | `בקשות ממתינות` |
| `ADMIN_APPROVE_ACTION` | `אישור בקשה` |
| `ADMIN_REJECT_ACTION` | `דחיית בקשה` |
| `ADMIN_REJECT_REASON_LABEL` | `סיבת דחייה (אופציונלי)` |
| `ADMIN_APPROVED_SUCCESS` | `הבקשה אושרה.` |
| `ADMIN_REJECTED_SUCCESS` | `הבקשה נדחתה.` |
| `ADMIN_STATUS_PENDING` | `ממתין לאישור` |

---

## 8. Email / Notification Decision

**Cursor must not implement email sending without explicit owner approval.** Document the decision point here.

### 8.1 Scenarios where email would be useful

| Event | Sender | Recipient | Content |
|-------|--------|-----------|---------|
| Teacher submits request | Platform | Admin | New request notification |
| School submits request | Platform | Admin | New request notification |
| Admin approves teacher | Platform | Teacher | "Your request was approved" + login link |
| Admin rejects teacher | Platform | Teacher | "Your request was declined" + optional reason |
| Admin approves school | Platform | School manager | "Your school is registered" + login link |
| Admin rejects school | Platform | School contact | "Your registration was declined" + optional reason |

### 8.2 Email implementation requirements (if approved by owner)

If the owner approves email notifications:
- **Supabase SMTP must be configured** — verify the project has an active email provider.
- Use Supabase's `auth.admin.sendRawEmail` (service role) or a transactional email provider (Resend, SendGrid, etc.) — **owner must choose**.
- Hebrew email subject and body copy must be approved before implementation.
- Email sending is fire-and-forget; a failure to send email must not block the approval/rejection action.
- No email UI is added to the current plan — email is a separate deliverable.

**Current recommendation:** Defer email notifications to a separate implementation pass. First implement the request/approval flows without email; add notification emails in a follow-up once the owner selects and configures a provider.

---

## 9. Tests Required

### 9.1 Automated — new test file `tests/auth/registration-request-matrix.mjs`

| Test ID | Scenario | Expected |
|---------|----------|----------|
| `teacher_request_creates_pending_entitlement` | `POST /api/auth/teacher-request` with valid payload | 201; `account_persona_entitlements.status = 'pending'` for `private_teacher` |
| `teacher_request_no_active_access` | GET `/api/teacher/me` with pending teacher token | 403 `entitlement_pending` |
| `teacher_request_duplicate_pending` | Second `POST /api/auth/teacher-request` for same email | 409 or specific error; no second pending row |
| `teacher_request_no_subject_access_before_approval` | Pending teacher calls subject API | 403 |
| `admin_approve_teacher` | Admin lifecycle `reactivate` on pending teacher | 200; entitlement `status = 'active'` |
| `admin_reject_teacher` | Admin lifecycle `reject` on pending teacher | 200; entitlement `status = 'rejected'` |
| `rejected_teacher_still_blocked` | Rejected teacher calls `/api/teacher/me` | 403 `entitlement_rejected` |
| `teacher_cannot_set_own_subjects` | Pending/active teacher POSTs to own subject grant endpoint | 403 (only admin can grant subjects) |
| `teacher_cannot_set_own_quotas` | Pending/active teacher PATCHes own quotas | 403 |
| `school_request_creates_pending` | `POST /api/auth/school-request` with valid payload | 201; `school_accounts.is_active = false`; manager entitlement `pending` |
| `school_request_no_active_access` | GET `/api/teacher/me` with pending school manager token | 403 `entitlement_pending` (or school_inactive) |
| `admin_approve_school` | Admin approve action | 200; `school_accounts.is_active = true`; manager entitlement `active` |
| `admin_reject_school` | Admin reject action | 200; manager entitlement `rejected` |
| `school_request_does_not_auto_activate` | No admin action taken; wait | Entitlement remains `pending`; no automatic activation |
| `manager_only_active_after_admin_approval` | School manager login before approval | 403 portal blocked |

### 9.2 Hebrew UI guard extension

After implementation, add to `tests/auth/hebrew-ui-guard.mjs`:

- `pages/auth/teacher-request.js` (or wherever the form lives) added to scanned files
- `pages/auth/school-request.js` added to scanned files
- Admin pending-filter UI scanned
- Forbidden English: `"Pending"`, `"Approve"`, `"Reject"`, `"Submit"`, `"Request"`, `"Register"`, `"School registration"`
- Forbidden raw keys: `self_signup`, `private_teacher`, `school_manager`, `pending`

### 9.3 UI role scope matrix extension

Add to `tests/auth/ui-role-scope-matrix.mjs`:

- Pending teacher cannot access teacher dashboard
- Pending school manager cannot access school dashboard
- Admin can see pending-requests filter
- Teacher cannot approve/reject other users
- Parent cannot see teacher request form via wrong portal

---

## 10. Manual QA Checklist

### 10.1 Private teacher request

- [ ] Request form visible at designated route
- [ ] All visible text Hebrew; no English; no raw DB keys
- [ ] Submit valid request → success message shown (Hebrew)
- [ ] Submit duplicate request → appropriate Hebrew error
- [ ] Log in with pending teacher account → portal blocked; Hebrew pending message shown
- [ ] Admin sees pending teacher in admin teacher list
- [ ] Admin approves → teacher can access teacher portal
- [ ] Admin grants subjects → teacher can use subject APIs
- [ ] Admin rejects → teacher portal shows rejected state
- [ ] Rejected teacher cannot access teacher portal
- [ ] Teacher cannot grant own subjects or change own quotas

### 10.2 School registration request

- [ ] School request form visible at designated route
- [ ] All visible text Hebrew; no English
- [ ] Submit valid request → success message shown
- [ ] Admin sees pending school in admin school list
- [ ] Admin approves school → school manager can access school portal
- [ ] Admin sets quotas during/after approval
- [ ] Admin rejects → school manager portal blocked
- [ ] School does not appear as active until admin approval
- [ ] School teacher/operator creation only possible after school is active

### 10.3 Security checks

- [ ] Request APIs reject invalid email formats
- [ ] Request APIs reject subjects not in allowlist
- [ ] Rate limiting blocks rapid repeated submissions from same IP
- [ ] No user enumeration (same response for registered and unregistered emails)

---

## 11. Open Decisions — Owner Must Answer

**These decisions must be made before any implementation begins.**

1. **Auth user creation on request submission:** When a teacher or school contact submits a request, how is their auth user created?
   - Option A: App calls Supabase Admin API server-side to create `auth.users` row and sends a Supabase invitation email (user sets their password via the invitation link).
   - Option B: User must already have a Supabase account; the form is login-gated (user logs in first, then submits a request).
   - Option C: App calls `supabase.auth.signUp` from the client (user sets their own password as part of the request form).
   - **Recommendation:** Option A (server-side invite) — cleanest; avoids requiring users to create an account before they know if they are approved. But it requires Supabase email delivery to be working.

2. **Request metadata storage:** Should submitted request details (subjects, description, school size) be stored in dedicated tables (`teacher_registration_requests`, `school_registration_requests`) or only in `account_persona_entitlements` + `school_accounts`?
   - **Recommendation:** Yes, add dedicated tables. Admin needs context to review requests. Both migrations are small and safe (new tables only, no existing data changed). Owner must review and run them.

3. **Email notifications:** Should the platform send emails on request submission and on approval/rejection?
   - **Recommendation:** Defer email to a follow-up pass. Implement the request/approval flow first without email.

4. **Public registration entry point:**
   - Option A: New public routes (`/teacher/register`, `/school/register`) linked from the login pages.
   - Option B: New tab on `/teacher/login` for teacher requests (matches the pattern of the parent login/signup tabs).
   - **Recommendation:** Option B for teacher requests (tab on `/teacher/login`). Option A for school registration (separate route `/school/register` linked from the teacher login page or marketing site), since school registration is a different audience.

5. **Reject reason — is it required or optional?** When admin rejects a request, must they provide a reason? Is the reason shown to the requester?
   - **Recommendation:** Optional reason for the admin; show reason to the requester only if provided. Match the lifecycle API's existing `reason` field.

6. **`reject` lifecycle action:** Does `POST /api/admin/users/[userId]/lifecycle` already support `action: "reject"`? If not, it must be added. Owner should confirm current implementation scope.

---

## 12. Files to Create / Modify (Implementation Phase)

### New files

| File | Purpose |
|------|---------|
| `pages/auth/teacher-request.js` | Teacher registration request form (or tab on `/teacher/login`) |
| `pages/auth/school-request.js` | School registration request form |
| `pages/api/auth/teacher-request.js` | Public API — create pending teacher request |
| `pages/api/auth/school-request.js` | Public API — create pending school request |
| `pages/api/admin/schools/[schoolId]/approve.js` | Admin — approve school |
| `pages/api/admin/schools/[schoolId]/reject.js` | Admin — reject school |
| `lib/auth/auth-registration.he.js` | Hebrew copy for registration forms and pending states |
| `tests/auth/registration-request-matrix.mjs` | Automated test matrix |

### Modified files

| File | Change |
|------|--------|
| `pages/teacher/login.js` | Add "request access" tab (or link to request form) |
| `pages/teacher/dashboard.js` | Handle `entitlement_pending` → show pending state |
| `pages/school/dashboard.js` | Handle school inactive / manager pending state |
| `pages/admin/teachers/index.js` | Add "pending requests" filter |
| `pages/admin/teachers/[teacherId].js` | Add approve/reject actions for pending requests |
| `pages/admin/schools/index.js` | Add pending schools filter |
| `pages/admin/schools/[schoolId].js` | Add approve/reject actions |
| `lib/admin-server/admin-lifecycle.server.js` | Add `reject` action if not present |
| `tests/auth/hebrew-ui-guard.mjs` | Add new pages to scan list |
| `tests/auth/ui-role-scope-matrix.mjs` | Add pending-state test cases |

### Migrations (if open decisions 1 and 2 are approved)

| File | Purpose |
|------|---------|
| `supabase/migrations/NNN_teacher_registration_requests.sql` | Metadata table for teacher requests |
| `supabase/migrations/NNN_school_registration_requests.sql` | Metadata table for school requests |

All migrations must be reviewed by the owner and run manually. Cursor does not run SQL.

---

## 13. Build and ZIP Requirements

After implementation:

- [ ] `npm run build` passes with zero new errors
- [ ] `tests/auth/hebrew-ui-guard.mjs` passes (all checks including new pages)
- [ ] `tests/auth/ui-role-scope-matrix.mjs` passes
- [ ] `tests/auth/school-class-assignment-matrix.mjs` passes (regression)
- [ ] `tests/auth/registration-request-matrix.mjs` passes (new)
- [ ] `node scripts/create-delivery-zip.mjs` updated to include new files
- [ ] Updated ZIP at `review-packages/role-boundary-foundation-delivery.zip`

---

## 14. Explicit Confirmations

As of the creation of this plan file:

- **No code was changed.**
- **No SQL was created.**
- **No migration was created.**
- **No UI was changed.**
- **No Hebrew copy was changed.**
- **No commit was made.**
- **No push was made.**
- **No deploy was made.**

This file is a specification only. Implementation requires:
1. Owner answers to all Open Decisions (Section 11)
2. Owner Hebrew copy approval (Section 7)
3. Owner review and manual execution of any required migrations (Section 5)
4. Password Reset plan (Phase 7) implemented and stable first

---

*Created: 2026-05-30 | Relates to: `role_boundary_fix_plan_631834d8.plan.md` Phase 6 | Companion: `persona_password_reset_plan.plan.md` | Separate from: `school_staff_code_pin_login_plan.plan.md`*
