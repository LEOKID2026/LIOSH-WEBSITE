# Persona Password Reset Plan (Phase 7)

**Status:** PLAN ONLY — no code changed, no SQL created, no migration created, no UI changed, no Hebrew changed, no commit, no push, no deploy.

**Recommended order:** Implement password reset (Phase 7) before public registration (Phase 6). It is smaller, lower risk, and does not require any new database tables.

---

## 1. Background and Current State

### 1.1 Personas covered

Password reset applies only to Supabase email/password personas:

| Persona | Login page | Portal destination |
|---------|-----------|-------------------|
| Parent | `/parent/login` | `/parent/dashboard` |
| Private Teacher | `/teacher/login` | `/teacher/dashboard` |
| School Manager | `/teacher/login` | `/school/dashboard` |
| Platform Admin | `/teacher/login` | `/admin/teachers` |

**Out of scope — not covered by this plan:**

- School Teacher / School Operator code+PIN reset — handled separately by School Manager via existing `reset-pin` APIs and the future staff code/PIN login plan (`school_staff_code_pin_login_plan.plan.md`)
- Student PIN reset — already implemented via school manager credential APIs
- Guardian/school-parent PIN reset — already implemented via school manager credential APIs
- OAuth / social login password changes — not in scope
- Email template redesign — not in scope

### 1.2 What currently exists

- **No** forgot-password page or route exists.
- **No** `/auth/reset-password` (or equivalent) callback page exists.
- `supabase.auth.resetPasswordForEmail` is **not called anywhere** in application code.
- `supabase.auth.updateUser({ password })` is **not called anywhere** in application code.
- `detectSessionInUrl: true` is already set in `getLearningSupabaseBrowserClient()` (`lib/learning-supabase/client.js`), which means Supabase's PKCE recovery token in the URL hash will be automatically picked up when implemented.
- `supabase.auth.getSession()` is already used on both login pages, so the pattern is established.

### 1.3 Supabase recovery flow summary

```
User clicks "Forgot password" on login page
  → Client calls supabase.auth.resetPasswordForEmail(email, { redirectTo })
  → Supabase sends recovery email with a link to redirectTo?token_hash=...&type=recovery
  → User clicks the link → browser lands on redirectTo (our callback page)
  → Supabase JS client auto-exchanges the URL token hash for a recovery session
  → Client calls supabase.auth.updateUser({ password: newPassword })
  → On success, session is active; redirect to appropriate portal
```

The `redirectTo` URL must be added to the **Supabase dashboard allowlist** under Authentication → URL Configuration → Redirect URLs before any testing can occur.

---

## 2. Architecture

### 2.1 New pages to create

| File | Route | Purpose |
|------|-------|---------|
| `pages/auth/forgot-password.js` | `/auth/forgot-password` | Email input form; calls `resetPasswordForEmail`; shows success message |
| `pages/auth/reset-password.js` | `/auth/reset-password` | New password form; reads recovery session; calls `updateUser`; redirects persona-aware |

No new API routes are required. Both pages use the browser Supabase client directly (same pattern as login pages).

### 2.2 Forgot-password page (`/auth/forgot-password`)

**Inputs:** email address field.

**Behavior:**
1. User submits email.
2. Client calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<origin>/auth/reset-password' })`.
3. Always show a success-style message regardless of whether the email exists — prevents user enumeration.
4. No loading spinner looping forever — show message after submit, disable button.

**Security note:** The Supabase `resetPasswordForEmail` call does not reveal whether an account exists. The same Hebrew success copy must be shown for all submissions.

**Entry points:**
- "Forgot password?" link on `/parent/login` (below the email/password form, login mode only)
- "Forgot password?" link on `/teacher/login` (below the email/password form)

Links must **not** appear in signup mode on the parent page. Links must **not** appear on student login, guardian login, or any code/PIN login forms.

### 2.3 Reset-password callback page (`/auth/reset-password`)

**Behavior:**
1. On mount, call `supabase.auth.getSession()`. Because `detectSessionInUrl: true` is already configured, the Supabase client automatically exchanges the recovery token in the URL hash into a session.
2. If no recovery session is present (expired, already used, or tampered), show an error state with a link back to the appropriate forgot-password page.
3. If session is present but `session.user.recovery_sent_at` is null or the session type is not `recovery`, treat as invalid.
4. Show the new-password form: two fields (new password + confirm).
5. On submit, call `supabase.auth.updateUser({ password: newPassword })`.
6. On success, perform **persona-aware redirect** (see Section 2.4).
7. On failure (weak password, session expired mid-form), show Hebrew error.

**Password strength:** Enforce Supabase's minimum (currently 6 characters). Do not implement custom strength rules beyond what Supabase enforces; add a note if the owner wants stricter requirements.

### 2.4 Persona-aware redirect after reset

After `updateUser` succeeds, the active session contains the user's `app_metadata`. Use the same logic already in `pages/teacher/login.js` (`teacherPostLoginPath`) and `pages/parent/login.js` to determine the correct destination:

```
app_metadata.role === "admin"
  → call GET /api/teacher/me to confirm admin entitlement
  → redirect to /admin/teachers

app_metadata.role === "teacher"
  → call GET /api/teacher/me
  → if schoolMembership.isSchoolManager → /school/dashboard
  → if schoolMembership.schoolRole === "school_operator" → /school/operator/dashboard
  → else → /teacher/dashboard

app_metadata.role === "parent" (or no role)
  → redirect to /parent/dashboard
```

The `/api/teacher/me` call is already implemented and returns the routing metadata. Reuse it rather than duplicating logic.

**No persona escalation:** The redirect is read-only; it reads the user's existing entitlement and routes accordingly. Password reset does not change `account_persona_entitlements`, `school_teacher_memberships`, or any other authorization record.

### 2.5 Supabase dashboard configuration required (owner action)

Before any testing, the owner must:

1. Go to Supabase dashboard → Authentication → URL Configuration → Redirect URLs.
2. Add `<production_origin>/auth/reset-password` to the allowlist.
3. Add `http://localhost:3001/auth/reset-password` and any staging origin to the allowlist for local/staging testing.
4. Confirm the Supabase project's SMTP / email provider is configured to send auth emails.
5. Optionally customize the recovery email template (Hebrew subject/body) — see Section 3 (Hebrew copy gate).

Without the allowlist entry, Supabase will reject the `redirectTo` parameter and the recovery email will not contain the correct link.

---

## 3. Hebrew Copy Required (Owner Approval Gate)

**No UI may be implemented until the owner approves the following Hebrew strings.** This is a hard gate — the same rule applied to all prior lifecycle and assignment UI.

### 3.1 Forgot-password page labels

| Key (proposed) | Suggested Hebrew |
|---------------|-----------------|
| `AUTH_FORGOT_PASSWORD_TITLE` | `שכחת סיסמה?` |
| `AUTH_FORGOT_PASSWORD_EMAIL_LABEL` | `כתובת דוא״ל` |
| `AUTH_FORGOT_PASSWORD_SUBMIT` | `שליחת קישור לאיפוס` |
| `AUTH_FORGOT_PASSWORD_SUCCESS` | `אם קיים חשבון עם כתובת זו, ישלח קישור לאיפוס הסיסמה.` |
| `AUTH_FORGOT_PASSWORD_BACK` | `חזרה לכניסה` |

### 3.2 Reset-password callback page labels

| Key (proposed) | Suggested Hebrew |
|---------------|-----------------|
| `AUTH_RESET_PASSWORD_TITLE` | `איפוס סיסמה` |
| `AUTH_RESET_PASSWORD_NEW_LABEL` | `סיסמה חדשה` |
| `AUTH_RESET_PASSWORD_CONFIRM_LABEL` | `אימות סיסמה חדשה` |
| `AUTH_RESET_PASSWORD_SUBMIT` | `שמירת סיסמה חדשה` |
| `AUTH_RESET_PASSWORD_SUCCESS` | `הסיסמה עודכנה. מועבר/ת לפורטל…` |
| `AUTH_RESET_PASSWORD_ERROR_MISMATCH` | `הסיסמאות אינן תואמות` |
| `AUTH_RESET_PASSWORD_ERROR_WEAK` | `הסיסמה קצרה מדי — יש להזין לפחות 6 תווים` |
| `AUTH_RESET_PASSWORD_ERROR_EXPIRED` | `קישור האיפוס פג תוקף או כבר שומש. יש לבקש קישור חדש.` |
| `AUTH_RESET_PASSWORD_ERROR_GENERIC` | `אירעה שגיאה בעדכון הסיסמה. נסו שנית.` |
| `AUTH_RESET_PASSWORD_REQUEST_NEW` | `בקשת קישור חדש` |

### 3.3 Login page additions (links)

| Key (proposed) | Suggested Hebrew |
|---------------|-----------------|
| `AUTH_FORGOT_PASSWORD_LINK` | `שכחתי סיסמה` |

### 3.4 Recovery email template (Supabase dashboard)

The owner must decide whether to customize the Supabase recovery email subject and body in Hebrew, or use the default Supabase English template. If customized, the Hebrew copy must be approved before the template is updated.

**Recommendation:** Customize to Hebrew. Proposed subject: `איפוס סיסמה — ליאוש קידס`. Proposed body is minimal (per Supabase template variables: `{{ .ConfirmationURL }}`).

---

## 4. Security Requirements

### 4.1 Invalid or expired recovery token

- If `getSession()` returns no session or an error on the callback page, immediately show the expired/invalid error state.
- Do not show the new-password form.
- Provide a link back to `/auth/forgot-password` so the user can request a new link.
- Recovery tokens in Supabase are single-use and expire after the configured TTL (default: 1 hour).

### 4.2 No persona escalation

- Password reset only resets the password. It does not modify `account_persona_entitlements`, `parent_account_settings`, `school_teacher_memberships`, `teacher_limits`, or any authorization record.
- Post-reset redirect is determined by reading existing metadata — not by granting new access.
- A user with a `pending` entitlement who resets their password will still be blocked by the normal entitlement guard on the dashboard. This is correct behavior — password reset does not approve an account.

### 4.3 No wrong-portal redirect

- After password reset, the persona-aware redirect must send the user to the correct portal based on their `app_metadata.role`.
- A user with `app_metadata.role === "teacher"` must not be redirected to `/parent/dashboard`.
- A user with no teacher role must not be redirected to `/teacher/dashboard`.
- The `/api/teacher/me` call is used for teacher/admin role resolution — same as the existing post-login flow — so the same guards apply.

### 4.4 No user enumeration

- The forgot-password form always shows the same success message regardless of whether the email is registered.
- No different error message for "email not found" vs. "reset email sent".

### 4.5 Rate limiting

- Supabase internally rate-limits reset email sends. No additional application-level rate limiter is required in the first implementation.
- Document this decision so the owner can revisit if spam/abuse is observed.

---

## 5. Implementation Checklist (for the implementation pass)

All items require owner Hebrew copy approval (Section 3) before UI work begins.

### 5.1 Supabase dashboard (owner action — not Cursor)
- [ ] Add `/auth/reset-password` (production, staging, localhost) to Redirect URLs allowlist
- [ ] Confirm SMTP / email provider is active for the Supabase project
- [ ] Decide Hebrew vs. default recovery email template; update if Hebrew chosen

### 5.2 New files
- [ ] `pages/auth/forgot-password.js` — email form, `resetPasswordForEmail`, success message
- [ ] `pages/auth/reset-password.js` — recovery session check, new-password form, `updateUser`, persona-aware redirect

### 5.3 Hebrew copy constants
- [ ] Add all approved Hebrew strings to a new `lib/auth/auth-reset.he.js` file (keeps reset copy isolated from existing `school-ui.he.js` and `admin-ui.he.js`)

### 5.4 Login page links (minimal — no redesign)
- [ ] Add "forgot password" link to `/parent/login` (login mode only, not signup mode)
- [ ] Add "forgot password" link to `/teacher/login`

### 5.5 Build and lint
- [ ] `npm run build` passes with zero new errors
- [ ] Linter passes on new files

---

## 6. Tests Required

### 6.1 Automated — new test file `tests/auth/password-reset-matrix.mjs`

| Test ID | Scenario | Expected |
|---------|----------|----------|
| `forgot_password_form_renders` | GET `/auth/forgot-password` returns 200 | HTML renders (static, no server logic) |
| `reset_password_page_renders` | GET `/auth/reset-password` returns 200 | HTML renders |
| `forgot_password_link_on_parent_login` | Source of `/parent/login` contains forgot-password link | Link present, Hebrew label, no English |
| `forgot_password_link_on_teacher_login` | Source of `/teacher/login` contains forgot-password link | Link present, Hebrew label, no English |
| `no_forgot_link_on_student_login` | Source of `/student/login` does NOT contain forgot-password route | Not present |
| `no_forgot_link_on_guardian_login` | Source of `/guardian/login` does NOT contain forgot-password route | Not present |
| `reset_page_no_english` | Source of `/auth/reset-password` contains no forbidden English strings | Hebrew-only visible UI |
| `forgot_page_no_english` | Source of `/auth/forgot-password` contains no forbidden English strings | Hebrew-only visible UI |

> Integration tests that actually call `resetPasswordForEmail` or `updateUser` require a live Supabase session and are documented as manual QA below (Section 6.2). Automated tests cover the static and UI-structure checks.

### 6.2 Integration tests (live, run by owner or in e2e suite)

The following require real Supabase credentials and are **manual or e2e only**, not part of the node test matrix:

| Scenario | Expected |
|----------|----------|
| Parent requests reset for registered email | Recovery email received (check inbox) |
| Parent requests reset for unknown email | Same success message — no error |
| Parent clicks valid recovery link → sets new password | Redirect to `/parent/dashboard`; new password works |
| Private teacher clicks valid recovery link → sets new password | Redirect to `/teacher/dashboard` |
| School manager clicks valid recovery link → sets new password | Redirect to `/school/dashboard` |
| Platform admin clicks valid recovery link → sets new password | Redirect to `/admin/teachers` |
| User clicks expired recovery link (wait > token TTL) | Error state shown; link to request new reset |
| User uses same recovery link twice | Error state on second use (token consumed) |
| User with `pending` entitlement resets password | Password resets; dashboard still blocks with `entitlement_pending` |
| User with `revoked` entitlement resets password | Password resets; dashboard still blocks with `entitlement_revoked` |

### 6.3 Hebrew UI guard extension

Add to `tests/auth/hebrew-ui-guard.mjs`:
- `pages/auth/forgot-password.js` and `pages/auth/reset-password.js` added to `LIFECYCLE_UI_FILES`
- Forbidden English strings checked: `"Forgot password"`, `"Reset password"`, `"New password"`, `"Confirm"`, `"Submit"`, `"Back"`, `"Send"`
- Forbidden raw keys checked: `recovery`, `updateUser` as visible text

---

## 7. Manual QA Checklist

The owner or a designated tester must complete this checklist before the feature is considered ready.

### 7.1 Pre-QA setup
- [ ] Recovery email link is in Supabase dashboard allowlist
- [ ] Supabase SMTP is confirmed working (test email delivery)
- [ ] QA accounts available: parent (`demofamily@leo-k.com`), private teacher, school manager (`school@leo-k.com`), admin (`office@leo.com`)

### 7.2 Forgot-password form
- [ ] Form visible at `/auth/forgot-password`
- [ ] All visible text is Hebrew; no English
- [ ] Submit with a registered email → success message shown (Hebrew)
- [ ] Submit with an unregistered email → same success message shown (no difference)
- [ ] "Back to login" link works

### 7.3 Reset-password callback
- [ ] Recovery email arrives (check spam folder too)
- [ ] Clicking link opens `/auth/reset-password`
- [ ] No English visible on the page
- [ ] Password mismatch → Hebrew error; form remains
- [ ] Password too short → Hebrew error; form remains
- [ ] Valid new password submitted → Hebrew success message → redirect fires
- [ ] Redirect goes to correct portal for each persona (parent, teacher, school manager, admin)
- [ ] Old password no longer works after reset
- [ ] New password works on next login
- [ ] Clicking expired link → Hebrew expiry error; link to request new reset visible

### 7.4 No-access cases
- [ ] Student login page has no forgot-password link
- [ ] Guardian login page has no forgot-password link
- [ ] School staff code/PIN screens have no forgot-password link

---

## 8. Open Decisions — Owner Must Answer

1. **Recovery token TTL:** Supabase default is 1 hour. Is this acceptable, or should it be shorter/longer? (Configured in Supabase dashboard → Authentication → Auth Providers.)

2. **Hebrew recovery email template:** Should the Supabase recovery email subject and body be customized to Hebrew? If yes, owner must provide or approve the Hebrew copy for the email body (separate from the in-app copy in Section 3).

3. **Minimum password length:** Supabase default minimum is 6 characters. Is this acceptable, or should the app enforce a stricter minimum on the client side (e.g., 8)?

4. **"Back to login" destination for teacher personas:** After a school manager or admin resets their password, the "forgot password" page's "back" link should go to `/teacher/login`. Is this correct, or should school managers have a separate entry point in the future?

5. **Admin persona support:** Platform admin uses `app_metadata.role === "admin"`. Password reset should work identically. Confirm this is explicitly approved (user query says "only if safe and explicitly supported"). This plan considers it safe because the redirect reads existing metadata and does not grant new access.

---

## 9. Build and ZIP Requirements

After implementation:

- [ ] `npm run build` passes with zero new errors
- [ ] `tests/auth/hebrew-ui-guard.mjs` passes (445+ checks; new pages added)
- [ ] `tests/auth/ui-role-scope-matrix.mjs` passes (21/21)
- [ ] `tests/auth/school-class-assignment-matrix.mjs` passes (14/14)
- [ ] New `tests/auth/password-reset-matrix.mjs` passes
- [ ] `node scripts/create-delivery-zip.mjs` updated to include new files
- [ ] Updated ZIP at `review-packages/role-boundary-foundation-delivery.zip`

---

## 10. Explicit Confirmations

As of the creation of this plan file:

- **No code was changed.**
- **No SQL was created.**
- **No migration was created.**
- **No UI was changed.**
- **No Hebrew copy was changed.**
- **No commit was made.**
- **No push was made.**
- **No deploy was made.**

This file is a specification only. Implementation requires owner Hebrew copy approval (Section 3) and Supabase dashboard configuration (Section 2.5) before any code is written.

---

*Created: 2026-05-30 | Relates to: `role_boundary_fix_plan_631834d8.plan.md` Phase 7 | Separate from: `school_staff_code_pin_login_plan.plan.md`*
