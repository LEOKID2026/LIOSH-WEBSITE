# School Onboarding and Offboarding Process

**Status:** Operational draft — **not legal advice**  
**Version:** Phase 4.6 draft (2026-05-31)  
**Audience:** Platform admin, school manager, operations staff

---

## 1. Purpose

This runbook describes **operational steps** to add a school to the platform safely and to remove or freeze a school when the relationship ends. It aligns with technical controls verified in Phase 4.1–4.5 but does **not** replace legal agreements (see `SCHOOL_LEGAL_READINESS_CHECKLIST.md`).

**Prerequisites before real student data:**

- Legal documents and owner decisions in progress or complete (legal checklist)
- Phase 4 security items in Section 9 addressed or explicitly waived
- Shared-device guidance shared with school IT (`SCHOOL_SHARED_DEVICE_GUIDANCE.md`)

---

## 2. School onboarding flow

Perform in order. Use **QA/throwaway data** for dry runs; switch to real data only after Section 9 clearance.

### Step 1 — Create school (platform admin)

| Action | Owner | Verify |
|--------|-------|--------|
| Create `school_accounts` row (admin API or approved workflow) | Platform admin | School appears in admin console |
| Confirm school `is_active = true` | Admin | Inactive school blocks portal (403) |
| Record school ID and name in ops register | Ops | — |

**Do not** use production admin access without support/admin policy (legal checklist).

### Step 2 — Assign school manager

| Action | Owner | Verify |
|--------|-------|--------|
| Create or link teacher user as `school_admin` membership | Platform admin | `GET /api/school/me` → `portalRole: school_manager` |
| Issue manager JWT login (email/password) | Admin + manager | Manager can access school dashboard |
| Manager completes any required policy acceptance (if applicable to role) | Manager | — |

### Step 3 — Create classes and physical structure

| Action | Owner | Verify |
|--------|-------|--------|
| Create physical classes / grade structure if used | Manager | Browse/report filters work |
| Create subject classes (`teacher_classes` with correct `school_id`) | Manager | Phase 4.1: every class has non-null `school_id` aligned to school |
| Assign teachers to classes | Manager | Teacher sees only assigned classes |

**Phase 4.1 note:** Classes with `school_id = NULL` fail closed for manager class reports. Fix data before go-live.

### Step 4 — Create teachers and subject permissions

| Action | Owner | Verify |
|--------|-------|--------|
| Invite/add teachers to school roster | Manager | Membership role `school_teacher` or equivalent |
| Grant subjects per teacher (`school_teacher_subjects`) | Manager | Math teacher cannot create English activities (matrix test pattern) |
| Confirm teachers cannot access school manager routes | Manager / QA | `/api/school/dashboard` → 403 for non-manager teachers |

### Step 5 — Create operators and staff access

| Action | Owner | Verify |
|--------|-------|--------|
| Invite operator user (`school_operator` membership) | Manager | Operator appears in operators list |
| Provision staff code + initial PIN | Manager | Operator receives credentials securely (not email PIN in plain text if avoidable) |
| Assign operator grants **intentionally** | Manager | See Section 3 |

Default: new operators should start with **no grants** until role is confirmed.

### Step 6 — Enroll students

| Action | Owner | Verify |
|--------|-------|--------|
| Create student records | Manager or operator (if granted) | Student visible in school browse |
| Enroll in class(es) | Manager | Enrollment audit event (`school_student_enrolled`) |
| Create student access code + PIN | Manager or `student_access_admin` operator | Student can log in |
| Student login | Student | Session has `access_code_id` (Phase 4.3) |

### Step 7 — Verify report and audit access

| Action | Owner | Verify |
|--------|-------|--------|
| Manager views student report | Manager | 200; `Cache-Control: no-store`; audit `school_student_report_viewed` |
| Manager views class report | Manager | 200; cross-school class ID → 403/404 |
| Manager views audit log | Manager | Merged entries from staff/operator/teacher tables (Phase 4.4) |
| Operator **without** data_viewer cannot open student report | QA | 403 |
| Operator **with** data_viewer can open report | QA | 200 |
| Operator cannot open audit log | QA | 403 |

---

## 3. Permission review before activation

Complete this matrix **before** giving operators or wide teacher access to real students.

| Role | Expected access | Must NOT have |
|------|-----------------|---------------|
| **School manager** | Full school portal: classes, teachers, operators, students, reports, audit log | Other schools’ data |
| **School teacher** | Assigned classes/subjects; teacher portal; school-context reports for permitted subjects | School dashboard, operator admin, audit log, other schools |
| **Operator — no grants** | `/api/school/me` only (limited payload) | Student reports, credential routes, audit log, dashboard |
| **Operator — `student_access_admin` only** | Student account/code/PIN routes | Student reports, audit log, manager routes |
| **Operator — `student_data_viewer` only** | Student report/data routes | Credential admin routes, audit log, manager routes |
| **Operator — both grants** | Credential admin + reports (if business allows) | Audit log, manager routes, self-grant |
| **Student** | Own learning session only | School portal, other students’ data |

**Verification:** Phase 4.3 structural PASS; live operator cookie matrix **NOT RUN** in Phase 4.5 — repeat before pilot (Section 9).

---

## 4. Staff and operator lifecycle

For each action, verify **session invalidation** where applicable.

| Event | Who | System actions | Verification |
|-------|-----|----------------|--------------|
| **Create** | Manager | Membership + staff code + entitlement | Login succeeds; audit `staff_code_created` |
| **Suspend** | Manager | `is_active=false`, entitlement suspended, sessions revoked | Existing cookie → 401 on next `/api/school/me` (**live test NOT RUN in 4.5**) |
| **Reactivate** | Manager | Entitlement restored, access code active | New login works |
| **Regenerate code** | Manager | Old code revoked; sessions for old access revoked | Old code login fails |
| **Reset PIN** | Manager | New PIN; sessions for access revoked | Old PIN fails |
| **Change PIN (self)** | Staff | PIN updated; other sessions revoked | User stays logged in on current session |
| **Revoke** | Manager | Access revoked; sessions ended | Login fails |

**Audit:** Manager-visible log includes staff login success/fail, suspend, reactivate, code regenerate, PIN reset (Phase 4.4).

**Operators — grants:** Only manager can PATCH operator grants. Operators cannot self-grant.

---

## 5. Student lifecycle

| Event | Who | Session impact | Verification |
|-------|-----|----------------|--------------|
| **Enroll** | Manager | — | Audit `school_student_enrolled` |
| **Move class / transfer** | Manager | — | Audit `school_student_class_transferred`; scope checks |
| **Block access** | Manager or access_admin operator | **Live sessions ended** | Student cookie → 401 |
| **Unblock access** | Manager or access_admin operator | — | New login works |
| **Revoke access** | Manager or access_admin operator | **Live sessions ended** | Login fails |
| **Rotate PIN** | Manager or access_admin operator | **Live sessions ended** | Old PIN fails |
| **Deactivate / archive student** | Manager | Confirm sessions ended if access revoked | Student not in active browse |

Phase 4.3 verified `endLiveStudentSessions` on block/revoke/rotate at code level.

---

## 6. Teacher lifecycle

| Event | Who | Verification |
|-------|-----|--------------|
| **Add teacher to school** | Manager | Membership; subject grants empty until assigned |
| **Assign subjects** | Manager | Audit `school_subject_granted`; teacher can create activities in subject |
| **Remove subject** | Manager | Audit `school_subject_revoked`; teacher blocked from subject activities/reports |
| **Assign to class** | Manager | Class roster correct; Phase 4.1 scope holds |
| **Remove from class** | Manager | Teacher loses class report access |
| **Suspend / deactivate teacher** | Manager / admin | Teacher portal blocked; school routes 403 |
| **Remove from school** | Manager | No school membership; no cross-school leakage |

After removal, confirm teacher cannot access former school’s student reports or class reports (handler matrix pattern).

---

## 7. School offboarding

When a school leaves the platform or must be frozen:

### Phase A — Freeze access (immediate)

- [ ] Set school `is_active = false` (blocks portal with 403)
- [ ] Suspend all operators and school staff access codes
- [ ] Revoke or suspend manager entitlement per admin procedure
- [ ] Confirm no active staff/student sessions remain (spot-check audit + session tables — **read-only** unless owner approves mutation)

### Phase B — Data disposition (legal decision)

Owner/legal must decide:

- [ ] **Export** — provide school data export per DPA/deletion policy (process not defined in Phase 4.6)
- [ ] **Retain** — retention period per legal checklist
- [ ] **Delete** — deletion workflow with legal approval; **no destructive SQL in Phase 4**

Engineering does not execute deletion in this document.

### Phase C — Access cleanup

- [ ] Remove or archive teacher memberships
- [ ] Revoke operator grants and staff codes
- [ ] Revoke student access codes
- [ ] Document final state in ops register

### Phase D — Audit and confirmation

- [ ] Export or archive audit logs per retention policy (`school_staff_audit_log`, `school_operator_audit_log`, `teacher_access_audit` for school scope)
- [ ] Manager audit API no longer accessible (school inactive)
- [ ] Final sign-off checklist signed by platform owner

---

## 8. Open owner decisions

Record decisions before scaling beyond pilot.

| Topic | Question for owner / legal |
|-------|---------------------------|
| Retention | How long to keep learning data and audit logs after offboarding? |
| Deletion | Who approves permanent delete; timeline; verification |
| Transfer | Can a student transfer between schools on-platform? Process? |
| Export format | CSV, PDF reports, API — who delivers to school? |
| External legal approval | Sign-off date before first paying school |
| External security review | Pen-test before pilot vs before paid |
| Pilot waiver | Can Phase 4.5 NOT RUN items be waived for limited pilot? Written waiver required |

---

## 9. Remaining verification before controlled school pilot

**Do not hide these gaps.** They are documented in Phase 4.5 and carried forward here.

| Item | Status | Impact on onboarding |
|------|--------|----------------------|
| Operator/staff live cookie grant matrix | **NOT RUN** | Complete Step 7 credential/report checks with live staff cookies before real operators |
| Staff suspend → 401 live | **NOT RUN** | Execute during Step 4 suspend drill on QA operator |
| Browser/PWA manual checks | **NOT RUN** | Required if school uses labs or PWA — Section 6 of shared-device doc |
| Handler matrix 27/27 | **25/27** | Optional fixture refresh; tenant/subject tests already PASS |
| Live audit pagination at scale | **Recommended** | Spot-check after school has audit history |
| Worksheet report audit gap | **Open** | Accept for pilot or track as post-4.7 enhancement |

**Current security closure verdict:** **YELLOW** (Phase 4.5). Onboarding with **real** student data should wait for owner acceptance of remaining items or written waiver.

---

## 10. Quick reference — API routes by role

| Route | Manager | Operator (grants) | Teacher | Student |
|-------|---------|-------------------|---------|---------|
| `GET /api/school/me` | Yes | Yes (limited if no grants) | No* | No |
| `GET /api/school/dashboard` | Yes | No | No | No |
| `GET /api/school/audit-log` | Yes | **No** | No | No |
| `GET /api/school/students/.../report-data` | Yes | data_viewer only | No** | No |
| Student credential routes | Yes | access_admin only | No | No |
| `POST /api/school/staff/logout` | N/A | Staff cookie | N/A | N/A |

\*School-affiliated teachers use teacher portal JWT, not school manager routes.  
\*\*Teachers use teacher-context report routes with subject filtering.

---

## 11. Related documents

| Document | Purpose |
|----------|---------|
| `SCHOOL_LEGAL_READINESS_CHECKLIST.md` | Legal docs and go-live gates |
| `SCHOOL_SHARED_DEVICE_GUIDANCE.md` | Labs, kiosks, PWA logout |
| `reports/security/school-phase4-5-runtime-acceptance-summary.md` | Runtime test results |
| `docs/auth/SCHOOL_STAFF_ROUTE_AUDIT.md` | Technical route/auth reference |

---

## 12. Disclaimer

This process description is for internal operations. It is **not** legal advice. Data processing, consent, and deletion must follow agreements approved by legal counsel.
