# School staff login model — audit & recommendation (proposal only)

**Status:** Audit / proposal — **no implementation in this pass.**

## Current model

| Persona | Login | Scope |
|---------|-------|-------|
| Private teacher | Supabase email + password (`/teacher/login`) | Private classes, direct students, quotas from `teacher_limits` |
| School teacher / manager | Same Supabase email + password | School portal + optional teacher activity; scoped by `school_teacher_memberships` + entitlements |
| School operator | Same Supabase email + password | School portal operator dashboard; grants in `school_operator_grants` |
| School student | School-issued username + PIN (`student_access_codes`, `created_by_school_id`) | Student app only |
| Parent / guardian | Email/password or school-issued parent PIN | Parent dashboard |

School staff today **reuse the global Supabase auth identity** used by private teachers. There is no separate school-issued staff credential.

## Option A — Keep email/password (current)

**Pros**

- Already implemented; no new auth surface.
- Password reset, MFA, and Supabase audit trails apply.
- Staff who are also private teachers use one identity.

**Cons**

- Requires self-registration before school attach (manager cannot “create staff” end-to-end).
- Email/password feels heavy for primary-school staff who only need school-scoped access.
- Risk of scope confusion if one email has private-teacher + school entitlements.

## Option B — School-issued username + PIN (like students)

**Pros**

- Manager could provision staff without prior Supabase signup.
- Clear separation: school staff credential ≠ private teacher account.
- Familiar pattern (already used for students/guardians).

**Cons**

- New auth path, session model, and RLS/persona wiring.
- PIN rotation, lockout, and credential delivery UX.
- Operators/teachers need email for notifications — may still need linked auth for recovery.

## What would need to change later (Option B)

1. New table or flag for `school_staff_access_codes` (or extend access model).
2. Login route separate from `/teacher/login` or branch inside it.
3. Persona guard: school_staff session must not grant private-teacher APIs.
4. Manager UI: create staff + show credentials once.
5. Migration path for existing email-based staff.

## Risks

- Dual login models increase support burden.
- Weak PINs if not paired with lockout policy.
- Accidental merge of school staff with private teacher entitlements on same user.

## Recommendation

**Short term:** Keep email/password; improve manager UX (clear Hebrew copy when user missing — done) and document prerequisite registration.

**Medium term:** Consider school-issued credentials **only for operators and primary teachers without private accounts**, as a separate “school staff login” entry — not replacing email auth for power users.

**Do not implement** until product approves credential delivery, recovery, and entitlement boundaries in writing.
