# Legal / Policy / Privacy / Disclaimer — Site Inventory & Implementation Plan

**Date:** 2026-05-23  
**Pass type:** audit and planning only — **no product implementation**  
**Authoritative security readiness (prior):** [reports/security/wave-2l-privacy-site-policy-readiness.md](../../reports/security/wave-2l-privacy-site-policy-readiness.md)  
**Owner constraints for this audit:** no new pages, modals, checkboxes, DB changes, Hebrew copy edits, design changes, ENV, or engine/report/Copilot logic changes.

---

## Executive summary

The Hebrew learning site has **strong in-product educational disclaimers** on parent reports and **partial AI provenance labels** on Parent AI insight blocks, plus **Help Center educational articles** (including a quoted disclaimer article). It has **no dedicated legal/policy routes** (`/privacy`, `/terms`, etc.), **no footer legal links**, and **no Terms/Privacy acceptance flow** at parent signup. Child deletion exists in-product; full parent-account deletion is not documented for users.

**Do not duplicate** the existing `ParentReportImportantDisclaimer` component text on new surfaces — **link or cross-reference** where a public policy needs the same meaning.

**Do not add** a “I confirm I am the parent/guardian” checkbox. The product model is: parent account holder creates and distributes the child login code. Future consent, if added, should be limited to **acceptance of Terms of Use and Privacy Policy** only.

**Do not mention** QA-only 50-student caps (`admin@admin.com`) in any public policy page; public copy should state **max 3 children per normal parent account** only.

---

## 1. Existing routes table

| Route | Status | File / notes |
|-------|--------|----------------|
| `/privacy` | **Missing** | No `pages/privacy*` |
| `/terms` | **Missing** | No `pages/terms*` |
| `/accessibility` | **Missing** | No dedicated accessibility statement page |
| `/contact` | **Exists** | `pages/contact.js` — FAQ, mailto, social links; no legal links |
| `/security` | **Missing (user-facing)** | `pages/api/security/csp-report.js` is API-only CSP sink, not a public page |
| `/data-deletion` | **Missing** | No route; partial in-app child delete only |
| `/ai-disclosure` | **Missing** | No route; partial inline AI labels on reports |
| `/parent-consent` | **Missing** | No route; no consent capture UI |
| `/about` | **Exists** | `pages/about.js` — marketing only |
| `/help` (+ sections) | **Exists** | `pages/help/**` — educational help, **not** legal policy |
| `/parent/login` | **Exists** | Signup/login — no policy links |
| `/parent/dashboard` | **Exists** | Child CRUD, delete modal |
| `/learning/parent-report` | **Exists** | Short report + disclaimer + optional Copilot |
| `/learning/parent-report-detailed` | **Exists** | Detailed report + disclaimer + Copilot (screen only) |

---

## 2. Existing disclaimer & legal-adjacent text table

| ID | Location | Hebrew / purpose | Type | Duplicate? |
|----|----------|------------------|------|------------|
| **D-1** | `components/ParentReportImportantDisclaimer.js` | **הבהרה חשובה** — report is practice-derived learning aid; **not** educational/didactic/professional diagnosis; consult teacher/professional | **Authoritative in-product disclaimer** | **Do not duplicate verbatim** on new pages without owner legal review; policy pages may **summarize + link** |
| **D-2** | `pages/learning/parent-report.js` | Renders `<ParentReportImportantDisclaimer />` | Same as D-1 | N/A |
| **D-3** | `pages/learning/parent-report-detailed.js` | Renders `<ParentReportImportantDisclaimer />` | Same as D-1 | N/A |
| **D-4** | `components/ParentReportInsight.jsx` | Footnote when structured AI: **"סיכום נכתב על ידי מודל AI…"**; deterministic: **"סיכום זה נבנה אוטומטית…"** | AI provenance (report insight only) | Partial AI disclosure — **not** a Copilot or site-wide policy |
| **D-5** | `data/help-center/articleHelpers.js` → `disclaimerQuoteBlock()` | Quotes D-1 paragraphs in Help article `understanding-the-disclaimer` | Educational echo of D-1 | Intentional quote in Help Center — keep synchronized with D-1 if D-1 ever changes |
| **D-6** | `data/help-center/content/parents.js` → `parent-copilot` | Limits list: based on practice data; not professional advice | Help article | Not legal policy |
| **D-7** | `data/help-center/content/parents.js` → `privacy-and-data` | Short practice-data note; points to `/contact` | Help article | **Not** a Privacy Policy |
| **D-8** | `pages/parent/dashboard.js` delete modal | Explains permanent child data deletion scope | Operational warning | Basis for **data-deletion policy section**, not replacement |
| **D-9** | Copilot guardrails (engine) | `utils/parent-copilot/*`, `llm-orchestrator.js` — blocks clinical diagnosis language | **Backend/content policy** | Not user-facing legal text |
| **D-10** | `utils/parent-report-language/forbidden-terms.js` | Blocks clinical/leak terms in report Hebrew | Engine guardrail | Not user-facing |
| **D-11** | `pages/contact.js` FAQ | Product description; no legal claims | Marketing/FAQ | No disclaimer |

---

## 3. Footer & header legal links table

| Surface | Legal links today | Notes |
|---------|-------------------|-------|
| **Header** (`components/Layout.js` `menuLinksBase`) | בית, הורים, תלמיד, משחקים, לימודים, אודות, גaleria, צור קשר, **מרכז עזרה** | **No** Privacy / Terms / Accessibility |
| **Footer** (`components/Layout.js`) | © LEO K · משחקים ולמידה לילדים; link to **/help** only | **No** legal links |
| **Parent login** | Links to dashboard + learning | **No** policy links |
| **Student login** | Standard login form | **No** policy links |
| **Contact** | mailto + Instagram | **No** privacy/data-rights link |
| **About** | Product marketing | **No** legal links |

---

## 4. Consent & policy storage assessment

| Mechanism | Exists? | Detail |
|-----------|---------|--------|
| Terms acceptance at signup | **No** | `pages/parent/login.js` — email/password only |
| Privacy acceptance at signup | **No** | — |
| Parent/guardian identity checkbox | **No** (correct for product model) | User requirement: **do not add** |
| Consent timestamp in Supabase | **No** | No `consent_*` / `terms_accepted` columns found in app code |
| Child-creation consent gate | **No** | Create-student form has no policy checkbox |
| AI hybrid opt-in (internal) | **Partial** | `utils/ai-hybrid-diagnostic/governance.js` — `localStorage` key `mleo_ai_hybrid_consent_v1` for **internal hybrid reviewer**, not parent signup |
| Cookie banner | **No** | Functional cookies only (student session + Supabase parent session) |
| Deletion — child | **Yes (in-app)** | `POST /api/parent/delete-student` + dashboard modal |
| Deletion — full parent account | **No user-facing process** | Not documented on site |
| Help Center as legal store | **No** | Educational; `privacy-and-data` is not legal policy |

---

## 5. Surface-by-surface audit

### Parent dashboard (`pages/parent/dashboard.js`)

- Create child: name, grade, server-enforced cap (UI shows `students.length / studentLimit`; default messaging **3 children**).
- Edit student: includes **active** checkbox (operational, not legal consent).
- Delete child: strong Hebrew warning + name confirmation.
- **Gap:** no link to Privacy/Terms; no documented full-account deletion path.

### Short parent report (`pages/learning/parent-report.js`)

- **D-1 disclaimer present.**
- **D-4** Parent AI insight with AI/deterministic footnote when structured narrative shown.
- Parent Copilot panel (when env flag enabled): placeholder **"שאלה על הדוח…"** — **no visible AI disclosure** in Copilot chrome.
- PDF/print: Copilot in `.no-pdf`; disclaimer and insight intended in print path.

### Detailed parent report (`pages/learning/parent-report-detailed.js`)

- **D-1 disclaimer present.**
- **D-4** insight block inside print root.
- Copilot in `.no-pdf` wrapper — excluded from PDF.

### Parent Copilot (`components/parent-copilot/parent-copilot-panel.jsx`)

- UI: **"שאלה על הדוח…"**, processing text, quick actions.
- **Gap:** no inline “powered by AI / data sent to model” disclosure (Help article covers usage informally only).

### Parent login (`pages/parent/login.js`)

- Supabase signup/signin.
- **Gap:** no Terms/Privacy links or acceptance.

### Student login / home (`pages/student/login.js`, `pages/student/home.js`)

- No policy or privacy text.
- **Gap:** optional minimal pointer for parents (via Help or future policy) — low priority vs parent-facing legal pages.

### Layout / footer / header (`components/Layout.js`)

- See §3 — primary placement gap for future legal links.

### Contact (`pages/contact.js`)

- FAQ + contact channels.
- **Gap:** no privacy contact, data-rights, or abuse-reporting policy section.

### About (`pages/about.js`)

- Product marketing.
- **Gap:** no educational-limitation or AI high-level notice (report disclaimer covers reports only).

### Help Center (`pages/help/**`, `data/help-center/**`)

- 42 Hebrew educational articles.
- `understanding-the-disclaimer` — quotes D-1.
- `privacy-and-data` — points to contact, not `/privacy`.
- **Not a substitute** for legal policy pages.

---

## 6. What already exists — do not duplicate

| Asset | Recommendation |
|-------|----------------|
| **D-1** `ParentReportImportantDisclaimer` | Keep as single source of truth for **on-report** educational disclaimer. Policy pages may reference it; do not paste a third conflicting version. |
| **D-4** Parent AI insight footnotes | Sufficient for **insight card** provenance; separate **site-wide AI disclosure** still needed for Copilot/LLM processing. |
| **Help `understanding-the-disclaimer`** | Keep synced with D-1 via shared quote helper pattern. |
| **Child delete flow** | Document in `/privacy` or `/data-deletion` — do not rebuild deletion UX. |
| **Engine guardrails** (Copilot/report) | Out of scope for legal pages; no change. |
| **Security docs** (`docs/security/*`) | Internal; extract plain-language summaries for `/privacy` or `/security` when approved. |

---

## 7. Real missing gaps (prioritized)

### P0 — public launch blockers (content + routes)

1. **`/privacy`** — Privacy Policy (Hebrew primary).
2. **`/terms`** — Terms of Use.
3. **Footer (+ signup) links** to Privacy and Terms.
4. **Terms + Privacy acceptance** at parent signup (checkbox or click-wrap) — **not** guardian-identity confirmation.
5. **Jurisdiction owner decisions** (D-PRIV-1..6) before final legal copy.

### P1 — strong pre-public requirements

6. **`/data-deletion`** or Privacy § deletion — child delete (exists) + **parent account** erasure process.
7. **AI / Copilot disclosure** — public page or dedicated section (`/ai-disclosure` or Privacy §) covering server-side LLM, data categories sent, retention; link from Copilot panel.
8. **Cookie / session explanation** — section in Privacy or `/privacy#cookies`.
9. **Contact page** — add privacy contact + abuse reporting pointer.

### P2 — recommended

10. **`/accessibility`** — accessibility statement (Israeli/accessibility compliance target TBD by owner).
11. **`/security`** (plain-language) — parent-facing summary; not the CSP API route.
12. **Pilot short-form notice** — optional interim page for closed pilot (G-PILOT-5) if full legal review lags.

### Non-gaps (correctly absent or already covered)

- **On-report educational disclaimer (D-1)** — already present; Wave 2L note that reports lack disclaimer is **stale**.
- **Parent/guardian identity checkbox** — intentionally absent; **must remain absent** per product decision.
- **QA 50-student cap** — internal only; must not appear in public policy.

---

## 8. Recommended phased implementation plan

> **Implementation blocked until owner approves this plan and supplies/legal-reviews copy.**  
> Whitelist for future pass (from Wave 2L + Help Center precedent): new `pages/privacy.js`, `pages/terms.js`, etc.; additive footer/header links in `Layout.js`; optional signup checkbox component; **no** engine/report/Copilot logic changes.

### Phase A — Owner decisions & legal draft prep (no site deploy required)

| Task | Output |
|------|--------|
| Decide D-PRIV-1 jurisdiction (Israel / EU / US / multi) | Gates doc updated |
| Decide D-PRIV-2 LLM vendors & disclosure wording | AI section outline |
| Decide D-PRIV-3 retention / deletion SLAs | Privacy § retention |
| Decide D-PRIV-5 cookie banner vs notice-only | Privacy § cookies |
| Assign D-PRIV-6 privacy contact email | Privacy + Contact |
| Legal review of outline (owner/lawyer) | Approved copy deck |

**Exit:** approved Hebrew copy deck; no code required yet.

### Phase B — Core legal pages + navigation (minimal UX)

| Task | Scope |
|------|--------|
| Add `/privacy` and `/terms` pages | Reuse `Layout` + `about.js` / `contact.js` visual patterns (RTL, existing cards) |
| Add footer links: פרטיות, תנאי שימוש | Additive `Layout.js` only |
| Optional header footer mirror on contact/about | Same additive pattern |
| Cross-link Contact ↔ Privacy | `pages/contact.js` small link addition when approved |

**Exit:** routes return 200; footer links work; **no** signup checkbox yet.

### Phase C — Signup acceptance (Terms + Privacy only)

| Task | Scope |
|------|--------|
| Parent signup: required acceptance of Terms + Privacy | Checkbox or equivalent on `pages/parent/login.js` signup mode only |
| Store acceptance evidence | **Owner choice:** Supabase user metadata vs server audit log — requires separate approved DB/API design (out of scope until Phase C approved) |
| **Explicitly exclude** guardian-identity confirmation | Product rule |

**Exit:** new parents cannot signup without Terms+Privacy acceptance; evidence storage documented.

### Phase D — AI, deletion & cookies (content pages + light linking)

| Task | Scope |
|------|--------|
| `/ai-disclosure` or Privacy § AI | Copilot + Parent AI insight + LLM subprocessors; **link** from Copilot panel (one line + href) — no Copilot logic change |
| Data deletion page or Privacy § | Document child delete (existing) + parent account request via contact |
| Cookie/session section | Student cookie + Supabase session; no banner unless Phase A chose banner |
| Do **not** duplicate D-1 on reports | Link from Terms to report disclaimer meaning only |

**Exit:** AI and deletion discoverable from product surfaces.

### Phase E — Accessibility, pilot notice, launch gate

| Task | Scope |
|------|--------|
| `/accessibility` statement | Owner-approved Hebrew |
| Optional `/security` plain-language summary | Derived from `docs/security` non-secret summaries |
| Pilot waiver alignment | G-PILOT-5 short notice if needed |
| Verification | Manual QA checklist; G-PUB-11 evidence; no public launch until ENV phase separate |

**Exit:** public-launch legal gate evidence pack complete (with legal signoff).

---

## 9. Files inspected (audit pass)

### Pages & layout

- `pages/contact.js`
- `pages/about.js`
- `pages/parent/login.js`
- `pages/parent/dashboard.js`
- `pages/student/login.js`
- `pages/student/home.js` (grep)
- `pages/learning/parent-report.js` (grep + disclaimer usage)
- `pages/learning/parent-report-detailed.js` (grep)
- `pages/help/index.js` (+ route glob)
- `components/Layout.js`
- `components/ParentReportImportantDisclaimer.js`
- `components/ParentReportInsight.jsx`
- `components/parent-copilot/parent-copilot-panel.jsx`

### Help Center (educational, not legal)

- `data/help-center/content/parents.js`
- `data/help-center/content/parent-report.js`
- `data/help-center/articleHelpers.js`

### Planning / security (reference only)

- `docs/security/PRIVACY_COOKIES_CHILD_DATA_PLAN.md`
- `reports/security/wave-2l-privacy-site-policy-readiness.md`
- `docs/security/SECURITY_GATES_AND_SIGNOFF_PLAN.md`

### Route existence checks

- Glob: `pages/privacy*`, `pages/terms*` → **0 files**
- Grep: consent/storage patterns across repo

---

## 10. Confirmations (this audit pass)

| Rule | Status |
|------|--------|
| No product behavior changed | **Yes** — report-only |
| No ENV / Vercel env touched | **Yes** |
| No engine / report calculation / Copilot logic changed | **Yes** |
| No Hebrew UI copy changed | **Yes** |
| No design / CSS changed | **Yes** |
| No new pages, modals, checkboxes, DB | **Yes** |
| No commit / push / deploy | **Yes** (this pass) |

---

## 11. Next step

**Stop here.** Await owner approval of:

1. Phase order (A→E) or reprioritization  
2. Jurisdiction (D-PRIV-1)  
3. Whether acceptance evidence requires DB/metadata (Phase C)  
4. Legal review timing  

Do **not** implement routes or signup checkboxes until explicit approval.
