# Student learning time fairness — preview / staging E2E

**Date:** 2026-06-02  
**Runner:** `scripts/qa/staging-e2e-learning-time-fairness.mjs`  
**Supabase project:** LEO-KID (`ajxwmlwbzxwffrtlfuoe`)  
**Scope:** Preview/staging validation only — **production env not enabled**

---

## 1. Summary verdict

**Student → DB → parent report chain: PASS** on live Supabase with classroom simulation accounts and local Next.js (`NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true`).

| Area | Result |
|------|--------|
| Fairness credit in `learning_sessions.duration_seconds` | **Pass** |
| Uncapped `timeSpentMs` on answers | **Pass** |
| Student login (classroom sim) | **Pass** (`leo-s02`) |
| Parent JWT ↔ `students.parent_id` linkage | **Pass** |
| Parent report API aggregates credited duration | **Pass** (HTTP 200, today `durationSeconds` includes run) |
| Hidden-tab credit reduction | **Pass** |
| Vercel Preview deploy with flag ON | **Not done** (blocker — see §12) |
| Preferred `leo-s01` / `leo-p01` pair | **Unavailable** on this DB |
| Science challenge/speed UI smoke | **Fail** (Playwright timeout; pre-existing 25s/12s — not fixed) |

**Recommendation:** **Do not enable production.** Safe to proceed with **Preview-only** Vercel env + deploy smoke. Full production enablement still blocked until Preview URL run passes and ops sign-off on parent minute deltas.

---

## 2. Preview / staging environment used

| Item | Value |
|------|--------|
| App runtime | Local Next.js 15.5 dev — `http://127.0.0.1:3002` |
| Feature flag | `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` (dev process only) |
| Database | Live Supabase **LEO-KID** (same as `.env.local`) |
| Browser | Playwright Chromium headless, `locale: he-IL` |
| Vercel Preview URL | **Not exercised** |
| Vercel Production | **Not modified** |

**Dev command:**

```powershell
$env:NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1="true"
npx next dev -H 127.0.0.1 -p 3002
```

**E2E command:**

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3002"
$env:E2E_STUDENT_USERNAME="leo-s02"
$env:E2E_PARENT_EMAIL="parent-class-sim@liosh-dev.invalid"
$env:SIM_TEACHER_PARENT_PASSWORD="<from secure store — not in repo>"
node scripts/qa/staging-e2e-learning-time-fairness.mjs
```

---

## 3. Feature flag confirmation

| Check | Result |
|-------|--------|
| Flag required | `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` at build/dev time |
| Evidence flag active locally | Math stop credited **300s** (not legacy **120s**) |
| Vercel Preview env var | **Absent** (`vercel env ls` — no `LEARNING_TIME_FAIRNESS` entry) |
| Vercel Production env var | **Not set / not enabled** |

---

## 4. Valid student / parent account pair (no secrets)

### Account discovery (Supabase SQL)

| Account | Status on LEO-KID DB |
|---------|----------------------|
| `leo-s01` | **No row** in `student_access_codes` → login **401** |
| `leo-p01` | **No rows** in `student_guardian_access` (table count **0**) → guardian login **401** |
| `leo-s02` … `leo-s27` | Active student access codes (classroom simulation) |
| `parent-class-sim@liosh-dev.invalid` | Auth user `837971e1-ea50-4aea-a7a2-17a24555371a`, active **parent** entitlement |

### Pair used for this run

| Role | Identifier |
|------|------------|
| Student username | `leo-s02` |
| Student UUID | `17bdbd64-5a33-4f87-8c4c-2459ad84c269` |
| Student display name | איתי לוי |
| Parent email (JWT) | `parent-class-sim@liosh-dev.invalid` |
| Parent UUID (`students.parent_id`) | `837971e1-ea50-4aea-a7a2-17a24555371a` |
| Relationship | Classroom sim parent owns `leo-s02`–`leo-s20` (shared `parent_id`) |

PINs/passwords are **not** recorded here. Student PIN is the standard sim PIN (`1234` per teacher-classroom-sim docs). Parent password is `SIM_TEACHER_PARENT_PASSWORD` / bootstrap default — store only in local secure env.

---

## 5. Student login result

| Test | HTTP | Notes |
|------|------|-------|
| `leo-s01` / PIN | **401** | Not provisioned on this project |
| `leo-s02` / PIN | **200** | Used for E2E |
| `student/me` after login | **200** | Returns student id above |

---

## 6. Parent linkage result

| Check | Result |
|-------|--------|
| Parent JWT sign-in | **200** (`parent-class-sim@liosh-dev.invalid`) |
| JWT `user.id` === `students.parent_id` for `leo-s02` | **Yes** (`837971e1-…`) |
| `GET /api/parent/students/{id}/report-data` | **200** (not 404 forbidden) |
| Teacher-code guardian login (`leo-p01`) | **401** — `student_guardian_access` empty |

---

## 7. Scenarios run

Run timestamp: **2026-06-02T10:25:57Z** (Playwright simulated clock).

### Math — default cap (~400s visible, stop)

- sessionId: `9d0e9210-76a6-473b-b35a-17a6d155c484`
- `duration_seconds`: **300** | finish payload: **300**

### Geometry — concept (~360s visible + answer)

- sessionId: `ea91802e-351d-46d7-a5c0-e41fe05af1bd`
- `duration_seconds`: **363** | `timeSpentMs`: **360057**

### Hebrew — reading (~620s visible + answer)

- sessionId: `e8df79e0-f974-4c13-860e-d5ea6101eb1a`
- `duration_seconds`: **601** | `timeSpentMs`: **620046**

### Math — hidden tab (120s visible + 300s hidden)

- sessionId: `825411be-c5e5-4dbd-b7be-4d178666e196`
- `duration_seconds`: **182** (vs **300** visible-only control)

### Science — challenge/speed smoke

- **Not completed** — Playwright could not click mode **אתגר** within 20s (page/load selector issue).
- **Pre-existing:** Science challenge **25s**, speed **12s** — documented only; **not changed**.

---

## 8. DB rows checked

| Session ID | Subject | Status | `duration_seconds` | `timeSpentMs` (answer) |
|------------|---------|--------|-------------------|-------------------------|
| `9d0e9210-…` | math | completed | 300 | — |
| `ea91802e-…` | geometry | completed | 363 | 360057 |
| `e8df79e0-…` | hebrew | completed | 601 | 620046 |
| `825411be-…` | math | completed | 182 | — |

All sessions: `POST /api/learning/session/finish` returned **200** with matching `durationSeconds`.

---

## 9. Parent report result

**Endpoint:** `GET /api/parent/students/17bdbd64-…/report-data`  
**Auth:** Bearer JWT (`parent-class-sim@liosh-dev.invalid`)

| Field | Value (after run) |
|-------|-------------------|
| HTTP | **200** |
| `summary.totalDurationSeconds` | **4192** (30-day window; includes prior activity) |
| `summary.totalSessions` | **36** |
| `dailyActivity` **2026-06-02** | **8 sessions**, **2893 `durationSeconds`** |

This run alone credited ~**1447s** (~24 min) across four finished sessions; today's daily aggregate reflects those fairness credits plus earlier same-day sessions for `leo-s02`.

Report payload does not expose per-session IDs in the client JSON; aggregation uses `learning_sessions.duration_seconds` (verified via service role for session IDs in §8).

---

## 10. Rewards / monthly / missions result

| Item | Observation |
|------|-------------|
| Student `home-profile` derived minutes | `derived.monthlyMinutesIsraelMonth` ≈ **24.12** min (sample before run); increases after sessions via `learning_sessions` aggregation |
| `monthly` object on profile row | Empty `{}` — display minutes come from **derived** pipeline, not cached `monthly` JSON |
| Daily minutes mission | `challenges.dailyMissions` returned **[]** for `leo-s02` during probe — mission UI not asserted in this run |
| Parent monthly persistence rewards | Not separately asserted; parent report `totalDurationSeconds` reflects credited time |
| Coins formula / daily cap | Unchanged (static QA); no coin regression tested here |
| Streak | Not incremented in assertions; calendar-day streak logic unchanged |

---

## 11. Challenge / speed regression result

| Item | Result |
|------|--------|
| Science **אתגר** mode UI smoke | **Fail** (automation timeout) |
| Science timer values | **25s** challenge / **12s** speed — **pre-existing**, out of scope |
| Fairness on challenge/speed | Should remain legacy **120s** game credit per plan — not contradicted |

---

## 12. Remaining blockers

1. **No Vercel Preview deploy with flag ON** — `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1` is not in Vercel env (Preview or Production). Local-only validation so far.

2. **`leo-s01` / `leo-p01` not on LEO-KID** — classroom bootstrap uses `leo-s02+` and JWT parent `parent-class-sim@…`, not teacher-code guardian rows.

3. **Deploy requires commit/push** (not done in this task):
   - Push branch with fairness implementation to trigger Preview deployment.
   - Add Vercel env: `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true` for **Preview** environment only.
   - Re-run E2E against Preview URL (`PLAYWRIGHT_BASE_URL=https://…vercel.app`).

4. **Science UI smoke** — automation could not reach challenge mode; manual spot-check on Preview recommended.

5. **Daily missions array empty** for sim student — may need mission seed / grade band; not a fairness regression but limits mission assertion.

---

## 13. Recommendation: production enablement

| Environment | Verdict |
|-------------|---------|
| **Production** | **Not safe to enable** `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1` |
| **Preview / staging** | **Proceed** — add Preview env var + deploy, re-run E2E on Preview URL |
| **Local + LEO-KID DB** | **Pass** for fairness credit + parent report chain with `leo-s02` / `parent-class-sim` |

Production remains blocked until:

- Preview URL E2E passes with flag ON, and
- Ops review of parent-facing minute increases (e.g. today's **2893s** aggregate for active sim student), and
- Explicit production env approval (separate from this task).

---

## Appendix: what is needed for Vercel Preview (no action taken)

Per hard rules, **no commit, push, or Vercel env mutation** was performed. To complete Preview validation:

1. Commit/push fairness implementation branch (user approval required).
2. `vercel env add NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1` → value `true` → **Preview** only.
3. Deploy Preview; confirm flag in browser bundle.
4. Re-run:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://<preview-host>.vercel.app"
$env:E2E_STUDENT_USERNAME="leo-s02"
$env:E2E_PARENT_EMAIL="parent-class-sim@liosh-dev.invalid"
$env:SIM_TEACHER_PARENT_PASSWORD="<secret>"
node scripts/qa/staging-e2e-learning-time-fairness.mjs
```

---

_Authored 2026-06-02 from automated Playwright run + Supabase account discovery + parent report API verification._
