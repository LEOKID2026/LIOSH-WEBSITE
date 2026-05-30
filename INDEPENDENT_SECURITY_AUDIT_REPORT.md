# Independent Security Audit Report
## Hebrew Learning Site (LIOSH) — Pre-Launch Technical Security Review

**Audit Date:** May 31, 2026  
**Auditor:** Independent AI Security Reviewer  
**Scope:** Technical security verification (Phase 1–3 + Phase 4 School Portal)  
**Exclusions:** ENV handling (per owner instruction), Legal/DPA/Ministry compliance, External legal review  

---

## A. Executive Summary

This audit independently verifies the **Technical GREEN** claim for the Hebrew learning site's security posture. The review examined:

- **11 security selftest scripts** (static + runtime tests)
- **Core server-side authorization modules** (15+ files)
- **API route handlers** (school portal + teacher portal + student)
- **Service worker / PWA behavior**
- **Test output artifacts** from claimed GREEN state

**ENV handling excluded by owner instruction.**

---

## B. Final Verdict: **YELLOW** (Conditional)

The **Technical GREEN claim is NOT fully justified** due to:
1. **Test quality concerns** — Handler matrix relies on code string matching rather than runtime behavior verification
2. **Missing live HTTP coverage** — Key cross-school isolation tests marked NOT_RUN without fixtures
3. **Subject mismatch ambiguity** — "English block" test may pass for wrong reason (subject_mismatch vs subject_not_permitted)

However, the **code-level security architecture is sound** and no critical vulnerabilities were found.

---

## C. Technical GREEN Claim Assessment

| Claim Component | Status | Evidence |
|-----------------|--------|----------|
| Phase 1–3 closure | **VERIFIED** | `wave4a-phase1-3-security-selftest.mjs` passes; static checks confirm guards |
| Phase 4.1 class scope | **VERIFIED** | `isSchoolClassRowInScope` uses AND logic; null school_id fails closed |
| Phase 4.2 report hardening | **VERIFIED** | All routes use `setSensitiveReportNoStoreHeaders`; `_dailyBySubject` stripped |
| Phase 4.3 credential/session | **VERIFIED** | Staff session re-checks entitlement; suspend invalidates cookies |
| Phase 4.4 audit logs | **VERIFIED** | Manager-only route; metadata sanitized; school-scoped queries |
| Runtime acceptance | **PARTIAL** | Static checks pass; live HTTP mostly NOT_RUN (fixtures missing) |
| Handler matrix 27/27 | **QUESTIONABLE** | Passes by string matching; actual HTTP behavior not verified |

---

## D. Findings Summary

| Severity | Count | Items |
|----------|-------|-------|
| **BLOCKER** | 0 | None identified |
| **HIGH** | 0 | None identified |
| **MEDIUM** | 2 | Test quality gaps; Subject mismatch ambiguity |
| **LOW** | 2 | Manual PWA verification needed; Runtime fixture dependency |

---

## E. Parent + Children Findings

**Verdict: PASS**

### Verified Controls
- **Policy acceptance blocks non-parent personas**: `assertPolicyAcceptanceParentEligible` @ `lib/parent-server/policy-acceptance.server.js:163-189`
  - Checks `app_metadata.role` for "teacher" or "admin"
  - Queries `account_persona_entitlements` for blocked personas (private_teacher, school_teacher, school_manager, school_operator, admin)
  - Requires both checks to pass before returning parentUserId

- **Parent A cannot access Parent B child**: `phase1-3-runtime-acceptance.mjs:144-158` tests this via HTTP

- **Direct API ID protection**: `resolveAuthenticatedParentUserId` calls `assertPolicyAcceptanceParentEligible` before returning any user ID

### Evidence
```javascript
// lib/parent-server/policy-acceptance.server.js:163-189
export async function assertPolicyAcceptanceParentEligible(user, serviceRole) {
  const role = user?.app_metadata?.role?.trim().toLowerCase() || "";
  if (role === "teacher" || role === "admin") {
    return { ok: false, error: "Not authorized for parent actions", status: 403 };
  }
  // Additional entitlement check...
}
```

---

## F. Private Teacher Findings

**Verdict: PASS**

### Verified Controls
- **Deactivated teacher blocked**: `wave4a-phase1-3-security-selftest.mjs:86-107` confirms both `/api/teacher/me` and `/api/teacher/onboard` check `is_account_active === false`
- **Subject grant enforcement**: `school-portal-security-matrix.mjs:556-577` tests that math-only teacher cannot create English activities
- **Batch monitor subject re-check**: `wave4a-phase1-3-security-selftest.mjs:152-158` confirms `assertActivitySubjectAllowed` called

### Evidence
```javascript
// lib/teacher-server/teacher-student-login-access.server.js:30-37
export async function endLiveStudentSessions(serviceRole, studentId) {
  const now = new Date().toISOString();
  await serviceRole
    .from("student_sessions")
    .update({ ended_at: now })
    .eq("student_id", studentId)
    .is("ended_at", null);
}
```

---

## G. Student Session/Access Findings

**Verdict: PASS**

### Verified Controls
- **Null access_code_id fails closed**: `student-auth.js:153-155` returns null if `!sessionRow.access_code_id`
- **Access code re-validation**: `getAuthenticatedStudentSession` re-queries `student_access_codes` and validates via `isStudentSessionAccessCodeBindingValid`
- **Blocked student session invalidation**: `school-account-management.server.js` calls `endLiveStudentSessions` on block/revoke/PIN rotate
- **Student logout**: `student/logout.js` revokes DB session AND clears cookie

### Evidence
```javascript
// lib/learning-supabase/student-session-access-code.server.js:6-12
export function isStudentSessionAccessCodeBindingValid(sessionRow, codeRow) {
  if (!sessionRow?.access_code_id) return false;  // Fail closed
  if (!codeRow?.id) return false;
  if (codeRow.is_active === false) return false;
  if (codeRow.revoked_at) return false;
  return true;
}
```

---

## H. School Tenant Isolation Findings

**Verdict: PASS (Code) / NOT_VERIFIED (Live Runtime)**

### Verified Controls
- **AND logic in `isSchoolClassRowInScope`**: @ `lib/school-server/school-class-scope.server.js:9-17`
  - Requires: `classRow.school_id === schoolId` AND `schoolTeacherIds.includes(classRow.teacher_id)`
  - Null school_id returns false (fail-closed)
  - Missing class row returns false

- **GAP-01 fix verified**: `school-phase4-class-scope-selftest.mjs:55-67` confirms dual-membership teacher cannot access class from School A via School B context

- **`loadSchoolClassInScope` integration**: Uses `isSchoolClassRowInScope` helper, not unsafe OR logic

### Evidence
```javascript
// lib/school-server/school-class-scope.server.js:9-17
export function isSchoolClassRowInScope(classRow, schoolId, schoolTeacherIds) {
  if (!classRow?.id) return false;
  if (!classRow.teacher_id) return false;
  if (!schoolId || classRow.school_id !== schoolId) return false;  // Strict school match
  if (!Array.isArray(schoolTeacherIds) || !schoolTeacherIds.includes(classRow.teacher_id)) {
    return false;  // Teacher must be in school roster
  }
  return true;
}
```

### Concern
- Runtime acceptance tests for cross-school access were largely NOT_RUN due to missing fixtures
- Reliance on static code analysis rather than live HTTP verification

---

## I. School Operator/Staff Findings

**Verdict: PASS**

### Verified Controls
- **Operator grant matrix**:
  - `requireSchoolCredentialAdminContext` requires `student_access_admin` grant
  - `requireSchoolDataViewerContext` requires `student_data_viewer` grant
  - Manager-only routes use `requireSchoolManagerApiContext`

- **Staff session security**:
  - Cookie: HttpOnly, SameSite=Strict, Max-Age configured
  - Session re-checks entitlement via `assertActivePersonaEntitlement`
  - Suspend revokes live sessions via `revokeLiveStaffSessionsForUser`
  - PIN reset/regenerate revokes sessions

- **Change-PIN requires active session**: Route uses `resolveStaffSession`, binds to session userId not request body

### Evidence
```javascript
// lib/school-server/school-staff-session.server.js:47-60
export function setStaffSessionCookie(res, token, maxAgeSeconds) {
  const cookie = [
    `${STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",  // CSRF protection
    `Max-Age=${maxAgeSeconds}`,
    secure ? "Secure" : "",
  ].join("; ");
}
```

---

## J. School Reports/Export/Cache Findings

**Verdict: PASS**

### Verified Controls
- **All school report routes use no-store headers**: `school-phase4-report-hardening-selftest.mjs:46-70`
  - `pages/api/school/students/[studentId]/report-data.js`
  - `pages/api/school/classes/[classId]/report-data.js`
  - `pages/api/school/classes/physical-report.js`
  - `pages/api/school/worksheet-activities/[worksheetId]/report.js`

- **Internal field stripping**: `stripInternalReportPayloadFields` removes `_dailyBySubject`

- **Subject filtering**: `filterReportByPermittedSubjects` drops ungranted subjects and recomputes summary

- **No school export routes exist**: Verified via file system check

### Evidence
```javascript
// pages/api/school/students/[studentId]/report-data.js:138-139
setSensitiveReportNoStoreHeaders(res);
return res.status(200).json(stripInternalReportPayloadFields(report.payload));
```

---

## K. School Audit Log Findings

**Verdict: PASS**

### Verified Controls
- **Manager-only route**: `pages/api/school/audit-log.js:16` uses `requireSchoolManagerApiContext`
- **Three-source merge**: `listSchoolAuditLog` queries:
  - `teacher_access_audit` (filtered by teacher_ids in school)
  - `school_staff_audit_log` (filtered by school_id)
  - `school_operator_audit_log` (filtered by school_id)

- **Metadata sanitization**: `AUDIT_METADATA_DENY_KEYS` strips pin, token, password, email, ip, cookie, bearer

- **Pagination**: Merges entries, sorts by createdAt desc, slices by offset/limit

### Evidence
```javascript
// lib/school-server/school-audit-log.server.js:61-75
const AUDIT_METADATA_DENY_KEYS = new Set([
  "pin", "pin_plain", "pin_hash", "token", "token_plain", "password",
  "email", "full_name", "ip", "ip_address", "session_token", "cookie", "bearer",
]);
```

---

## L. Browser/PWA/Shared-Device Findings

**Verdict: PASS**

### Verified Controls
- **Service worker skips API routes**: `public/sw.js:285-291`
  ```javascript
  if (url.pathname.startsWith('/api/') || request.destination === 'script') {
    return;  // Skip API routes
  }
  ```

- **Student /me sets no-store**: `pages/api/student/me.js:14-17`
  ```javascript
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  ```

- **Staff logout clears session**: `staffLogout` sets `revoked_at` on session row

- **No sensitive storage in school UI**: `school-phase4-runtime-acceptance.mjs:212-219` grep confirms no localStorage/sessionStorage usage for secrets

### Concern
- **Installed PWA mode**: Marked NOT_RUN (manual owner verification required)
- This is acceptable per scope exclusion

---

## M. Test Quality Assessment

**Verdict: PARTIALLY RELIABLE**

### Strengths
1. **Static source checks** are comprehensive — regex patterns verify guards exist
2. **Unit tests** for pure functions (`isSchoolClassRowInScope`, `isStudentSessionAccessCodeBindingValid`) are robust
3. **Selftests are deterministic** — no flaky async operations

### Weaknesses
1. **Handler matrix relies on string matching**: Tests check that source files contain certain strings, not that handlers actually enforce security at runtime
2. **Subject mismatch ambiguity**: `school-portal-security-matrix.mjs:571-577` accepts either `subject_not_permitted` OR `subject_mismatch` as valid block. The `subject_mismatch` code suggests a validation error, not an authorization denial.
3. **Live HTTP coverage gaps**: Most runtime tests marked NOT_RUN due to missing fixtures
4. **No negative testing**: Tests verify "can access own" but don't comprehensively test "cannot access others" via live HTTP

### Recommendation
- Add live HTTP integration tests with actual fixture provisioning
- Differentiate between validation errors (400) and authorization denials (403)
- Verify that security matrix 27/27 PASS represents actual authorization blocks, not just code presence

---

## N. Legal/Compliance/Process Boundary Assessment

**Verdict: CORRECTLY EXCLUDED**

The following are correctly excluded from Technical GREEN:
- Legal/DPA/Ministry compliance certification
- Official supplier approval
- Operational docs (exist but are not legal sign-off)
- Real school deployment decisions

**What still requires owner/legal/external review:**
1. Data Processing Agreement (DPA) with schools
2. Ministry of Education approval (if required)
3. Privacy policy acceptance workflow for parents
4. Terms of service for school staff
5. Data retention policy implementation beyond technical capability

---

## O. Remaining Launch Blockers (Technical Only)

**No technical blockers identified.**

**Recommended pre-launch actions (non-blocking):**
1. Run `school-phase4-runtime-acceptance.mjs` with full fixtures and verify 0 FAIL
2. Manual verification of installed PWA mode on owner device
3. Verify build passes consistently (not just after retry)

---

## P. What Is Safe to Say Is Closed

### Phase 1–3 Security (Verified)
- ✅ Parent + own children isolation
- ✅ Private teacher + own students/subjects
- ✅ Student session/access lifecycle with fail-closed null access_code_id
- ✅ Policy acceptance persona blocking

### Phase 4 School Portal (Verified)
- ✅ Class scope with AND logic (no OR bypass)
- ✅ Null school_id fail-closed
- ✅ Report hardening (no-store headers, internal field stripping)
- ✅ Staff session security (HttpOnly, SameSite, entitlement re-check)
- ✅ Operator grant matrix (credential_admin vs data_viewer)
- ✅ Audit log manager-only access with sanitization
- ✅ Service worker API skip

---

## Q. What Still Requires Owner/Legal/External Review

1. **ENV handling** (explicitly excluded from this audit)
2. **Legal/DPA/Ministry compliance** (requires external legal review)
3. **Installed PWA mode verification** (requires owner device manual check)
4. **Production deployment configuration** (ENV, CDN, database access)
5. **Security incident response procedures** (operational, not technical)
6. **Data retention policy enforcement** (legal decision beyond technical capability)

---

## R. Exact Files/Functions/Evidence Reviewed

### Security Selftest Scripts (11 files)
1. `scripts/security/wave4a-phase1-3-security-selftest.mjs`
2. `scripts/security/student-session-access-code-selftest.mjs`
3. `scripts/security/phase1-3-runtime-acceptance.mjs`
4. `scripts/security/school-phase4-runtime-acceptance.mjs`
5. `scripts/security/school-phase4-class-scope-selftest.mjs`
6. `scripts/security/school-phase4-report-hardening-selftest.mjs`
7. `scripts/security/school-phase4-credential-session-selftest.mjs`
8. `scripts/security/school-phase4-audit-log-selftest.mjs`
9. `scripts/security/school-phase4-qa-staff-cookie-fixtures.mjs`
10. `scripts/security/school-phase4-browser-pwa-verification.mjs`
11. `scripts/school-portal/school-portal-security-matrix.mjs`

### Core Security Implementation (15+ files)
1. `lib/parent-server/policy-acceptance.server.js` — Parent eligibility guard
2. `lib/learning-supabase/student-session-access-code.server.js` — Fail-closed binding
3. `lib/learning-supabase/student-auth.js` — Session validation
4. `lib/school-server/school-class-scope.server.js` — AND scope logic
5. `lib/school-server/school-scope.server.js` — loadSchoolClassInScope
6. `lib/school-server/school-audit-log.server.js` — Audit merge + sanitize
7. `lib/school-server/school-staff-session.server.js` — Staff session security
8. `lib/teacher-server/teacher-student-login-access.server.js` — Session invalidation
9. `lib/teacher-server/teacher-activity.server.js` — Subject gate
10. `public/sw.js` — Service worker API skip

### API Routes (verified guards)
1. `pages/api/school/students/[studentId]/report-data.js`
2. `pages/api/school/classes/[classId]/report-data.js`
3. `pages/api/school/audit-log.js`
4. `pages/api/student/me.js`
5. `pages/api/student/logout.js`
6. `pages/api/teacher/me.js`
7. `pages/api/teacher/onboard.js`

---

## S. Final Recommendation

### Launch Decision: **PROCEED WITH CONDITIONS**

The Hebrew learning site's **technical security architecture is sound**. No critical vulnerabilities were identified in the code review.

**Conditions for full GREEN status:**
1. Run runtime acceptance tests with full fixtures and confirm 0 FAIL, 0 NOT_RUN for critical security paths
2. Document the subject mismatch vs subject_not_permitted test behavior
3. Verify build passes consistently on clean environment
4. Complete manual PWA verification on owner device

**Post-launch hardening (recommended within 30 days):**
1. Add live HTTP negative tests for all cross-user access scenarios
2. Implement automated security regression testing in CI
3. Security penetration test by external firm

---

*ENV handling excluded by owner instruction.*

*This audit report is based on static code analysis and selftest review. It does not constitute legal advice or official compliance certification.*
