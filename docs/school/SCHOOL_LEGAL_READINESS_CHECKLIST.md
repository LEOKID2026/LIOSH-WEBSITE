# School Legal Readiness Checklist

**Status:** Operational draft — **not legal advice**  
**Version:** Phase 4.6 draft (2026-05-31)  
**Audience:** Product owner, school pilot coordinator, technical lead

---

## 1. Scope and disclaimer

This document is an **operational checklist** of documents, decisions, and technical prerequisites that should exist or be resolved before a school uses the platform with **real student or staff data**.

It is **not**:

- Legal advice
- A statement of compliance with any law, regulation, or Ministry requirement
- A claim that the system is Ministry-approved, certified, or ready for official supplier procurement
- A substitute for review by qualified legal counsel and privacy/data-protection advisors

**External legal and privacy review is required** before any production school deployment, paid school contract, or official procurement path. Mark each item below as owned, drafted, reviewed, or approved by your legal counsel — not by engineering alone.

---

## 2. Required school documents (owner / legal to produce)

Use this as a **document inventory**. Engineering does not create these in Phase 4.6.

| Document | Purpose | Owner | Status (fill in) |
|----------|---------|-------|------------------|
| School Data Processing Agreement (DPA) | Defines processor/controller roles, data categories, subprocessors, security measures | Legal + owner | ☐ Draft ☐ Reviewed ☐ Signed |
| School onboarding agreement | Terms for school use of the platform, support, acceptable use | Legal + owner | ☐ |
| School privacy addendum | School-specific privacy disclosures beyond general site policy | Legal + owner | ☐ |
| Parent/guardian consent approach | How consent is obtained for student accounts and learning data | Legal + owner | ☐ |
| Student data retention policy | How long student learning data is kept; archival rules | Legal + owner | ☐ |
| Deletion / export request process | How schools or parents request export or erasure | Legal + owner | ☐ |
| School termination / offboarding process | Steps when a school leaves the platform (see also `SCHOOL_ONBOARDING_OFFBOARDING_PROCESS.md`) | Legal + ops | ☐ |
| Incident response procedure | Breach / security incident notification and escalation | Security + legal | ☐ |
| Access review procedure | Periodic review of manager, operator, teacher access | Ops + school manager | ☐ |
| Support / admin access policy | When platform staff may access school data for support | Legal + ops | ☐ |
| Backup / restore statement | What is backed up, RPO/RTO expectations (high level) | Engineering + ops | ☐ |
| Audit log retention statement | How long school audit logs are retained (operational recommendation: see Phase 4.4) | Legal + ops | ☐ |
| Subprocessor / vendor list | Hosting, auth, email, analytics, AI vendors if applicable | Legal + ops | ☐ |
| AI / data usage explanation | If AI features process school/student data, disclose scope and opt-out | Legal + product | ☐ |

**Note:** General site privacy/terms pages (if any) are not a substitute for school-specific agreements.

---

## 3. Owner decisions required (before real data)

Record decisions explicitly. Do not assume defaults.

| Decision | Options / notes | Decision recorded? |
|----------|-----------------|-------------------|
| **Data retention period** | e.g. 90 days pilot minimum; 1 year paid (Phase 4.4 recommendation — not enforced in product yet) | ☐ |
| **Who approves school onboarding** | Platform admin only? Written school request workflow? | ☐ |
| **Who can request deletion/export** | School manager, parent, platform admin — and verification process | ☐ |
| **Who handles support access** | Named roles; ticket approval; no standing production DB access without policy | ☐ |
| **AI features and school data** | Which features send student content to third-party AI; on/off per school | ☐ |
| **Primary consent flow** | School-as-consent vs per-parent consent vs hybrid | ☐ |
| **Penetration test timing** | Before controlled pilot? Before paid deployment? Before Ministry path? | ☐ |
| **Controlled pilot scope** | Single school, QA data only vs real school with limited grades | ☐ |
| **Audit log access** | Manager-only (current product design); operator cannot view audit log | ☐ |

---

## 4. Technical dependencies (engineering — Phase 4 status)

These are **technical readiness inputs** for legal/ops planning. They do not replace legal review.

### Phase 4.1 — Class / tenant scope (GAP-01)

| Item | Status |
|------|--------|
| Cross-school class access blocked (`loadSchoolClassInScope` AND logic) | **PASS** (static + selftest) |
| Null `school_id` on classes fail-closed | **PASS** (documented; read-only inspection recommended before pilot) |

### Phase 4.2 — Report hardening (GAP-03)

| Item | Status |
|------|--------|
| School report routes send `Cache-Control: no-store` | **PASS** (source + live HTTP sample) |
| Internal report helper fields stripped from responses | **PASS** (static + live sample) |

### Phase 4.3 — Credential / session

| Item | Status |
|------|--------|
| Staff session lifecycle (suspend, logout, PIN reset) | **PASS** (structural) |
| Operator grant boundaries (access_admin / data_viewer) | **PASS** (structural) |
| Student session invalidation on block/revoke/rotate PIN | **PASS** (regression) |

### Phase 4.4 — Audit log (GAP-02)

| Item | Status |
|------|--------|
| Manager audit API merges teacher/staff/operator audit sources | **PASS** |
| Audit metadata sanitization (no PIN/token in API) | **PASS** |
| Automated audit retention / purge job | **Not implemented** — policy decision only |

### Phase 4.5 — Runtime acceptance (verdict: **YELLOW**)

| Item | Status |
|------|--------|
| Live tenant isolation (manager A → school B) | **PASS** |
| Live report no-store headers | **PASS** |
| Live manager audit log sample | **PASS** |
| Handler security matrix | **25/27** (2 stale activity fixture failures — not a security regression) |
| Operator/staff live cookie matrix | **NOT RUN** |
| Staff suspend → 401 live test | **NOT RUN** |
| Browser / PWA manual checks | **NOT RUN** |

See **Section 8** and `SCHOOL_SHARED_DEVICE_GUIDANCE.md` for remaining pre-pilot verification.

### ENV / infrastructure (out of Phase 4 scope)

| Item | Status |
|------|--------|
| Production ENV hardening | **Separate track** — not part of Phase 4 closure |
| RLS policy completeness vs service-role API pattern | Documented in Phase 4 plan; external audit recommended for Ministry path |

---

## 5. Before controlled school pilot

Complete **all** that apply. Legal items require counsel sign-off.

### Legal / process

- [ ] DPA or equivalent draft reviewed by legal counsel
- [ ] School onboarding agreement and privacy addendum drafted
- [ ] Parent/guardian consent approach approved by legal
- [ ] Incident response and deletion process documented
- [ ] Pilot school identified; written approval from school leadership
- [ ] Subprocessor list current and disclosed to pilot school

### Technical (Phase 4)

- [ ] Phase 4.1–4.4 regression selftests PASS on release candidate
- [ ] Phase 4.5 runtime acceptance re-run on target environment
- [ ] **Remaining verification before controlled school pilot** (Section 8) — owner accepts YELLOW or completes items
- [ ] Shared-device guidance distributed to pilot school staff (`SCHOOL_SHARED_DEVICE_GUIDANCE.md`)
- [ ] Onboarding/offboarding runbook reviewed (`SCHOOL_ONBOARDING_OFFBOARDING_PROCESS.md`)

### Operational

- [ ] Named platform contact for pilot support
- [ ] Named school manager and backup contact
- [ ] Audit log review cadence agreed (manager uses `/api/school/audit-log` or UI when available)
- [ ] No production demo accounts used for real students

---

## 6. Before paid deployment

Everything in Section 5, plus:

- [ ] All Section 2 documents **signed** or formally approved where required
- [ ] Retention and deletion policies **implemented operationally** (not checklist-only)
- [ ] Audit log retention job or manual process in place
- [ ] Support/admin access policy enforced and logged
- [ ] Phase 4.5 items in Section 8 **completed or explicitly waived** by owner with written rationale
- [ ] Penetration test or independent security review **if required** by owner decision (Section 3)
- [ ] Backup/restore tested on schedule
- [ ] Operator/staff live credential matrix **PASS**
- [ ] Browser/PWA manual checklist **PASS**

---

## 7. Before Ministry / official supplier path

Everything in Sections 5–6, plus (typical expectations — **not legal advice**):

- [ ] Formal legal review for education-sector and child-data requirements in target jurisdiction
- [ ] Full penetration test and remediation closure
- [ ] Complete RLS / data-access audit with external reviewer
- [ ] Documented data residency and subprocessor agreements
- [ ] Accessibility and procurement documentation as required by buyer
- [ ] Long-term audit retention and lawful access procedures
- [ ] Business continuity and disaster recovery tested
- [ ] No known **FAIL** items in Phase 4 security closure (target: GREEN in Phase 4.7)

**This product has not been verified for any Ministry or government procurement framework.** Owner must map requirements independently with legal counsel.

---

## 8. Remaining verification before controlled school pilot

These items are **carry-forward from Phase 4.5**. They do not block writing this checklist, but they **do block a final GREEN security sign-off** and should be completed or waived in writing before real student data.

| Item | Phase 4.5 status | Action before pilot |
|------|------------------|---------------------|
| Operator/staff live cookie grant matrix | **NOT RUN** | Run with QA operator staff cookies; see `reports/security/school-phase4-5-browser-manual-qa-notes.md` and `role-boundary-operator-verification.mjs` |
| Staff suspend → existing cookie → 401 | **NOT RUN** | Live test with pre-suspended QA staff session |
| Browser/PWA manual checks (logout, back button, offline) | **NOT RUN** | Execute `reports/security/school-phase4-5-browser-manual-qa-notes.md` |
| Handler matrix 27/27 | **25/27** | Optional: refresh activity-create fixture grade alignment in `school-portal-security-matrix.mjs` |
| Large audit log pagination | **Not fully live-tested** | Spot-check merged pagination on pilot school |
| Worksheet report audit write | **Gap documented** (Phase 4.4) | Accept or add audit write in future phase |

**Current engineering verdict for school security closure:** **YELLOW** (Phase 4.5). Final GREEN requires Phase 4.7 owner sign-off after above items are addressed or waived.

---

## 9. Related documents

| Document | Location |
|----------|----------|
| Shared device guidance | `docs/school/SCHOOL_SHARED_DEVICE_GUIDANCE.md` |
| Onboarding / offboarding process | `docs/school/SCHOOL_ONBOARDING_OFFBOARDING_PROCESS.md` |
| Phase 4.5 runtime summary | `reports/security/school-phase4-5-runtime-acceptance-summary.md` |
| Browser manual QA steps | `reports/security/school-phase4-5-browser-manual-qa-notes.md` |
| Phase 4 security plan (reference) | `.cursor/plans/school_phase4_security_final_closure_plan.md` |

---

## 10. Document control

| Field | Value |
|-------|-------|
| Created | Phase 4.6 — operational draft |
| Legal review | **Required before use with real schools** |
| Next review | After Phase 4.7 closure or before first pilot |
