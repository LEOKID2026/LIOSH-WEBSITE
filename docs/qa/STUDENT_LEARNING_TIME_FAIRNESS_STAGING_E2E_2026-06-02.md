# Student learning time fairness — staging E2E

**Date:** 2026-06-02  
**Runner:** `scripts/qa/staging-e2e-learning-time-fairness.mjs` (Playwright + live Supabase read-back)  
**Scope:** Authenticated local E2E only — **no production deploy**, **no Vercel production env change**

---

## 1. Summary verdict

**Staging / local with flag ON: core fairness behavior validated on live DB.**

| Area | Result |
|------|--------|
| Credited `duration_seconds` (default / hard / long reading caps) | **Pass** |
| Wall-clock `timeSpentMs` not clamped to credit | **Pass** (where answer saved) |
| Hidden tab credit reduction | **Pass** |
| Session finish API persists credited seconds | **Pass** (after stop + finish wait) |
| Science challenge UI smoke | **Fail** (selector timeout; timers not changed) |
| Classroom student `leo-s01` | **Not used** (401 on live DB; see §4) |
| Parent report session list for test pairing | **Inconclusive** (HTTP 200, empty session list) |

**Recommendation:** **Safe to continue staging QA** with `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` on a **preview/staging deploy** using a real classroom student (`leo-s01` or equivalent) and a linked parent login. **Not safe for production enablement** until that staging deploy smoke passes and parent-facing minutes are spot-checked.

---

## 2. Environment used

| Item | Value |
|------|--------|
| App | Local Next.js 15.5 dev (`http://127.0.0.1:3002`) |
| Feature flag | `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` (set on dev process) |
| Database | Live Supabase (same project as `.env.local`) |
| Browser | Playwright Chromium headless, `locale: he-IL` |
| Deploy | **None** — no push, no Vercel staging URL exercised |
| Static QA (pre-req) | `learning-time-credit` tests, 61/61 fairness QA script, build pass (per prior report) |

**Operator command used:**

```powershell
$env:NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1="true"
npx next dev -H 127.0.0.1 -p 3002
```

---

## 3. Feature flag confirmation

- Flag required: `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` (must be `"true"` at **dev/build** time for client bundle).
- Evidence flag was active: math stop-without-answer credited **300s** (not legacy **120s**); geometry/hebrew credited **363s** / **601s** respectively.
- Production and preview Vercel env vars were **not** modified in this task.

---

## 4. Student / test accounts (no secrets)

| Role | Identifier |
|------|------------|
| Configured E2E student | `leo-s01` (from `.env.e2e.local`) |
| **Actual student used** | `ADMIN` (fallback — `leo-s01` returned HTTP **401** on live DB) |
| Student UUID | `d119f721-05b3-4fe2-ac58-4174ac06f733` |
| Display name | ישראל ישראלי |
| `parent_id` on row | `05c73a19-bf1f-4f1a-b034-7cd2ece4feec` |
| Parent API probe | `admin@admin.com` (JWT sign-in **200**) |
| Teacher-code parent `leo-p01` | HTTP **401** on `/api/guardian/login` against this DB |

PINs/passwords are stored only in local gitignored env files and are **not** copied here.

**Implication:** Results prove fairness plumbing on a **live** DB with a **working** demo account, not the full classroom matrix (`leo-s01` / `leo-p01`) on this Supabase project.

---

## 5. Scenarios run

### 5.1 Math — default tier, ~400s visible (simulated clock)

- **Flow:** Learning mode → start → fast-forward 400s → stop (no MCQ click).
- **sessionId:** `db243dcb-c7dc-4e19-8783-2d5f7d6f1d7a`
- **Expected:** Credited cap **300s** (not 120s legacy, not 0).
- **Actual:** `duration_seconds` **300**, `POST /api/learning/session/finish` body `durationSeconds: 300`, status **completed**.
- **timeSpentMs:** No answer row (expected).

### 5.2 Geometry — concept-style question, ~360s visible

- **Flow:** Start → fast-forward 360s → answer MCQ → wait for finish → stop.
- **sessionId:** `7e4ed1e9-3c4c-4ca2-a2a6-6c14deae360f`
- **Question sample:** `concept_measure_interpret` / `perimeter_vs_area` (concept tag in fingerprint).
- **Expected:** ~**360s** credited (not **120**, not **0**).
- **Actual:** `duration_seconds` **363**, finish payload **363**; `timeSpentMs` **360052** on answer row.
- **Note:** First run without finish wait left session **active** with `duration_seconds: 0`; fixed by waiting for finish after stop.

### 5.3 Hebrew — reading topic, ~620s visible

- **Flow:** Topic `reading` → start → fast-forward 620s → answer → finish.
- **sessionId:** `3ebc08cc-e22f-4214-ad49-019e3a14f288`
- **Expected:** Cap near **600s** on credit; wall clock ~620s on answer.
- **Actual:** `duration_seconds` **601**; `timeSpentMs` **620046**.

### 5.4 Math — hidden tab (~120s visible + ~300s hidden)

- **Flow:** Visible 120s → synthetic `visibilitychange` hidden 300s → visible remainder → stop.
- **sessionId:** `ac733695-2e43-417d-be79-5fb8d18a1d39`
- **Expected:** Credited well below full visible-only **300s** run.
- **Actual:** `duration_seconds` **182** vs **300** on default-only run → hidden time not fully credited.

### 5.5 Science — challenge / speed smoke

- **Attempt:** Open science master → click mode **אתגר** → start.
- **Result:** Playwright timeout (15s) waiting for **אתגר** button — **not completed**.
- **Pre-existing (document only):** Science challenge **25s**, speed **12s** (`science-master.js`); other masters commonly **20s** / **10s**. **No timer changes** in this task.

---

## 6. DB rows checked

| Session | Subject | Status | `duration_seconds` | `answers.answer_payload.timeSpentMs` |
|---------|---------|--------|-------------------|--------------------------------------|
| `db243dcb-…` | math | completed | **300** | — |
| `7e4ed1e9-…` | geometry | completed | **363** | **360052** |
| `3ebc08cc-…` | hebrew | completed | **601** | **620046** |
| `ac733695-…` | math | completed | **182** | — |

**Checks:**

| # | Check | Result |
|---|--------|--------|
| 1 | Fairness credit in `learning_sessions.duration_seconds` | **Pass** |
| 2 | `timeSpentMs` remains full wall-clock (not capped to 120s/300s) | **Pass** (geometry + hebrew) |
| 3 | Hidden tab reduces credited total | **Pass** |
| 4 | Finish API aligns with DB `duration_seconds` | **Pass** |

---

## 7. Parent report result

- **Endpoint:** `GET /api/parent/students/{studentId}/report-data`
- **Auth:** Supabase JWT (`admin@admin.com`) → **HTTP 200**
- **Sessions in default 30-day payload matching this run:** **0** (empty array)
- **Likely cause:** Parent JWT user ≠ guardian linked to `ADMIN` student for report ownership filter, or date/window mismatch — **not** a failure of `duration_seconds` writes (rows exist in DB).

**Follow-up for staging deploy:** Re-run report with **teacher-code parent** (`leo-p01`) tied to the same student row used in E2E.

---

## 8. Rewards / monthly / missions / coins / streak

| Item | E2E in this run | Notes |
|------|-----------------|-------|
| Student dashboard / monthly minutes | Not reliably sampled (`home-profile` monthly fields n/a in script) | Finish calls succeeded; minutes should follow credited seconds via existing `addSessionProgress` path |
| Parent rewards / monthly progress | Not validated (report empty) | Depends on §7 linkage |
| Daily minutes mission | Not incremented in script assertions | Validated in static QA (`verify-phase2-missions.mjs`) |
| Coins formula + daily cap | Not re-run | Unchanged code path; static QA |
| Streak | Not re-run | Calendar-day based; unchanged |

---

## 9. Challenge / speed regression result

- **Science challenge/speed UI smoke:** **Not completed** (timeout).
- **Documented pre-existing:** Science **25s** challenge / **12s** speed vs **20s** / **10s** elsewhere.
- **Assigned quiz timers:** Not exercised (out of scope).
- **Fairness flag:** Challenge/speed should remain on **legacy 120s** game credit per plan — not contradicted by this run.

---

## 10. Remaining risks

1. **Classroom credentials** — `leo-s01` / `leo-p01` not valid on this live DB; staging deploy must use accounts that exist in target Supabase.
2. **Stop-game timing** — Stopping &lt;1s after answer can leave session **active** with `duration_seconds: 0` until finish runs; real students usually stop after longer play.
3. **Parent report ownership** — Credited minutes in DB do not automatically prove parent UI shows them until report is fetched for the correct parent↔student pair.
4. **Book snapshot / tier misclassification** — Known from static QA; one geometry concept question classified as hard tier (363s &lt; 480s cap — OK).
5. **`useLearningVisibilityClock` passes `ledger: questionTimeLedgerRef.current` snapshot** — may affect hidden-tab accuracy in edge cases; hidden test still passed in simulation.
6. **Preview/staging URL** — This run was **local only**; Vercel preview with flag ON still needs a short smoke after deploy.

---

## 11. Production enablement recommendation

| Environment | Recommendation |
|-------------|----------------|
| **Production** (`NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1`) | **Do not enable** |
| **Local dev** | **OK** with flag ON for continued QA |
| **Vercel staging / preview** | **Proceed** — deploy with flag ON, re-run this E2E (or manual equivalent) using **valid classroom student + parent**, then confirm parent report minutes |

**If staging deploy is required first:** Push branch to preview, set `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` on **staging/preview only** (not production), ensure classroom test accounts exist in that project, then re-run `node scripts/qa/staging-e2e-learning-time-fairness.mjs` against the preview URL.

---

## Reproduce

```powershell
$env:NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1="true"
npx next dev -H 127.0.0.1 -p 3002

$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3002"
node scripts/qa/staging-e2e-learning-time-fairness.mjs
```

---

_Authored from automated run 2026-06-02T08:14Z (local, flag ON) plus manual review of DB rows and parent API probe._
