# School Shared Device Guidance

**Status:** Operational draft — **not legal advice**  
**Version:** Phase 4.6 draft (2026-05-31)  
**Audience:** School managers, teachers, operators/staff, students (via school staff), IT/lab coordinators

---

## 1. Who this is for

| Role | Why shared-device rules matter |
|------|--------------------------------|
| **School manager** | Oversees portal access, audit review, and school-wide policy on lab/kiosk use |
| **Teacher** | May use classroom computers; accesses teacher portal and school-context reports |
| **Operator / staff** | Uses code+PIN login (`liosh_staff_session` cookie); may manage student credentials |
| **Student** | Uses student code/PIN; session cookie grants access to learning and reports |

This guidance applies when **more than one person uses the same browser, computer, tablet, or installed PWA** (computer lab, library kiosk, shared classroom device, family tablet used by multiple children).

---

## 2. Safe use on shared devices

### Always do

1. **Log out when finished** — every role (see Section 4).
2. **Do not share codes or PINs** — staff codes, operator PINs, and student login credentials are personal to the account holder, even in schools.
3. **Close the report or student view** when stepping away — do not leave sensitive screens visible.
4. **Close the browser tab or PWA window** after logout, especially on shared machines.
5. **Use a private/incognito or separate browser profile** when possible for admin/operator tasks on shared PCs.

### Never do

1. Leave the portal open and walk away.
2. Write codes or PINs on sticky notes attached to the monitor.
3. Let one student log in for another student.
4. Use “remember password” or saved autofill for staff or student login on shared devices (product may not offer this for staff cookies — still avoid saving passwords in the browser).
5. Assume closing the tab alone is enough — **use the official logout action**.

### Technical context (for IT staff)

- Staff sessions use an **HttpOnly** cookie (`liosh_staff_session`) — not readable from JavaScript, but still valid until logout or expiry if the browser profile is shared.
- School report and `/api/school/me` responses are marked **no-store** in the API (Phase 4.2–4.5). That reduces browser cache risk but **does not replace logout**.
- The service worker is designed to **skip caching `/api/` routes** (Phase 4.5 static verification). Offline replay of protected JSON should not occur — **confirm manually before pilot** (Section 6).

---

## 3. PWA installed mode guidance

School users may install the site as a PWA (“Add to home screen” / installed app).

| Topic | Guidance |
|-------|----------|
| **Logout still required** | Installed app uses the same cookies and sessions as the browser. Logout inside the app before handing the device to someone else. |
| **Back button after logout** | After logout, using the back button must **not** show fresh protected report or student data. **Manual check required before pilot** — see Section 6. |
| **Offline mode** | Protected school/student APIs should **fail offline**, not serve cached report payloads. Run offline check in Section 6 before pilot. |
| **Uninstall / clear site data** | For lab machines, periodically clear site data or reinstall if sessions persist unexpectedly. |

**Phase 4.5 status:** Browser/PWA manual checks were **NOT RUN** in automation. Treat Section 6 as **mandatory pre-pilot** for any school using labs or installed PWAs.

---

## 4. Role-specific logout guidance

### School manager

- **How:** Use manager logout from the school portal / teacher account linked as school admin (JWT session).
- **After logout:** Confirm school dashboard and `/api/school/me` are unreachable without signing in again.
- **Shared device:** Do not leave manager session active on a classroom PC.

### Operator / staff (code + PIN)

- **How:** Use staff logout — `POST /api/school/staff/logout` or the UI equivalent. This clears `liosh_staff_session` and ends the server session.
- **After logout:** `/api/school/me` must return **401** with the same cookie.
- **PIN change:** After mandatory PIN change, old sessions for the same user are revoked except the current session (by design).

### Teacher (school-affiliated, JWT)

- **How:** Teacher portal logout (same as private teacher logout path).
- **Note:** School teachers must not use school manager routes unless they are the designated manager. On shared devices, logout even if only viewing class activities.

### Student

- **How:** Student logout from student home / `POST /api/student/logout`.
- **After logout:** `/api/student/me` must return **401** with the same cookie.
- **Credential change:** If manager/operator blocks, revokes, or rotates student PIN, active student sessions end (Phase 4.3 — verified structurally; live spot-check recommended at pilot).

---

## 5. School lab / kiosk recommendations

For computer labs, libraries, and young learners:

1. **Dedicated OS user accounts** per class session where feasible (login to Windows/macOS as `LabGrade3`, then browser).
2. **Browser profile separation** — one Chrome/Edge profile per lab station or “Guest mode” reset between classes.
3. **Supervised login** — adult verifies each student logs in as themselves and logs out at end of period.
4. **Session timer** — remind students 5 minutes before end of class to save work and log out.
5. **Periodic reset** — weekly clear browsing data for lab profiles; document in school IT runbook.
6. **No operator credentials on student stations** — operators should use office machines for credential admin, not student lab PCs.
7. **Physical privacy** — angle screens away from walkways when showing individual student reports.

---

## 6. Pre-pilot manual checks (required — Phase 4.5 NOT RUN)

Execute on a **QA or pilot environment** with throwaway accounts before real students use shared devices. Detailed steps: `reports/security/school-phase4-5-browser-manual-qa-notes.md`.

| # | Check | Pass criteria |
|---|-------|---------------|
| 1 | Manager logout + back button | Back does not show fresh protected school data |
| 2 | Staff logout + back button | Same; `/api/school/me` → 401 after logout |
| 3 | Student logout + `/api/student/me` | 401 after logout; back button safe |
| 4 | PWA offline | Installed PWA offline does not show cached report JSON |
| 5 | Network tab | School report responses show `Cache-Control: no-store` |
| 6 | Application → Storage | No report payloads in localStorage/sessionStorage on school pages |

Record results: PASS / FAIL / NOT APPLICABLE. **Any FAIL blocks GREEN sign-off** until fixed or waived in writing by owner.

---

## 7. Remaining verification before controlled school pilot

These items were **not completed** in Phase 4.5 automated/runtime acceptance:

| Item | Status |
|------|--------|
| Browser manual checklist (Section 6) | **NOT RUN** — owner must execute |
| Operator/staff live cookie grant matrix | **NOT RUN** |
| Staff suspend → 401 with existing cookie | **NOT RUN** |
| Handler matrix 27/27 | **25/27** (stale activity fixtures only) |

Shared-device **written guidance** (this document) is complete as an operational draft. **Behavioral verification** on real lab hardware is still required before pilot.

---

## 8. Disclaimer

This document is operational guidance for schools using the platform. It is **not** legal advice and does not guarantee compliance with any education, privacy, or child-protection regulation. Schools should combine this with their own IT policies and legal counsel.

---

## 9. Related documents

- `docs/school/SCHOOL_LEGAL_READINESS_CHECKLIST.md`
- `docs/school/SCHOOL_ONBOARDING_OFFBOARDING_PROCESS.md`
- `reports/security/school-phase4-5-browser-manual-qa-notes.md`
