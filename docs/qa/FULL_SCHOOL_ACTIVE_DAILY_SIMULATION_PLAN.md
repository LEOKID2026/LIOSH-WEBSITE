---
name: Full School Active Daily Simulation
overview: "Replace the 12-student AAA nightly with a hybrid 398-student full-school simulation: DB simulation for all students, real Playwright UI sampling for 12-15 representative students, and API-level report validation — all against the existing demo school (bb4e5984-d95f-438f-a465-e1a8208ea7de)."
todos:
  - id: disable-aaa-nightly
    content: "Disable old AAA Task Scheduler nightly (operator: schtasks /Change /Disable)"
    status: pending
  - id: write-plan-doc
    content: Write docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_PLAN.md
    status: pending
  - id: build-sim-config
    content: Create scripts/school-portal/sim/school-sim-config.mjs (persona model, timetable, topic catalog)
    status: pending
  - id: build-persona-model
    content: Create scripts/school-portal/sim/persona-model.mjs (6-type profiles, attendance, weak-subject)
    status: pending
  - id: build-planner
    content: Create scripts/school-portal/sim/school-day-planner.mjs (class x subject x hour schedule)
    status: pending
  - id: build-topic-catalog
    content: Create scripts/school-portal/sim/topic-catalog.mjs (real topic keys per subject/grade)
    status: pending
  - id: build-db-sim
    content: Create scripts/school-portal/sim/db-simulator.mjs (realistic DB writes for all 398 students)
    status: pending
  - id: build-ui-sampler
    content: Create scripts/school-portal/sim/ui-sampler.mjs (Playwright for 12-15 sampled students)
    status: pending
  - id: build-report-validator
    content: Create scripts/school-portal/sim/report-validator.mjs (teacher/school/parent API validation)
    status: pending
  - id: build-orchestrator
    content: Create scripts/school-portal/run-school-sim-nightly.mjs (top-level nightly orchestrator)
    status: pending
  - id: wire-package-json
    content: Add npm run qa:school:daily and related commands to package.json
    status: pending
  - id: run-tests
    content: Execute T1-T14 test checklist (one continuous pass)
    status: pending
  - id: delivery-report
    content: Write docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_DELIVERY_REPORT.md
    status: pending
isProject: false
---

# Full School Active Daily Simulation Plan

> **Status:** Plan only — no implementation, no SQL, no commits.
> **After approval:** implementation runs end-to-end without staged pauses until complete, then runs the full test suite, then delivers one final report.

---

## 1. Stop / Disable the Old AAA Nightly

The 12-student AAA Phase D2 nightly must be disabled before the new simulation goes live.

**Action (operator, one command):**

```bat
schtasks /Change /TN "Liosh QA — virtual student nightly" /Disable
```

If the task does not yet exist (never registered), nothing to do.

**What is preserved (nothing deleted):**
- `scripts/virtual-student-qa/` — all 39 files remain in repo, intact
- `scripts/launch-readiness/` — all 26 files remain in repo, intact
- `%LOCALAPPDATA%\liosh-qa\virtual-student-state\state.json` — not touched
- All `npm run qa:launch:*` scripts — remain in package.json unchanged

**Documentation update (in the plan only):**
- The AAA simulation is superseded by the school simulation for nightly QA
- It remains available for isolated per-student smoke runs (`node scripts/virtual-student-qa/run.mjs --phase d2 --students AAA1 ...`)

---

## 2. Clean Reset Before First New Run

**Goal:** Wipe all learning and classroom activity data for the demo school's 398 students, reset the school-day counter, and start from a clean state — while preserving every structural element.

### 2A. What is preserved (never touched)

- `school_accounts` row for demo school
- `school_teacher_memberships` (11 teachers + 1 manager)
- `school_teacher_subjects` (subject grants)
- `school_student_enrollments` (398 rows)
- `teacher_profiles` (12 rows)
- `teacher_limits` (12 rows)
- `teacher_classes` (108 rows)
- `teacher_class_students` (2,388 rows)
- `student_access_codes` (credentials — never touched)
- Auth users (teachers, school manager, demo parent)
- Student rows (398 rows in `students` table)
- All permissions, credentials, and class structure

### 2B. What is deleted/archived (activity data only)

**Classroom-layer tables** (written by Phase 1 DB simulation):
- `classroom_activities` for the demo school
- `classroom_activity_student_status` (cascade from activities)
- `classroom_activity_attempts` (cascade from activities)
- `student_activities` for demo teachers (archived via `status=archived`, not hard-deleted)

**Self-practice learning tables** (written by Phase 2 Playwright UI):
- `learning_sessions` WHERE `student_id IN [398 demo student IDs]`
- `answers` WHERE `learning_session_id IN [IDs of those deleted learning sessions]` — **not** by `student_id` directly

> **Why `learning_sessions` and `answers` must be reset:**
> The R1 normal parent route (`/api/parent/students/[id]/report-data`) aggregates over a rolling 30-day window from `learning_sessions` and `answers`. If old sessions exist from prior validation runs, they will appear in R1's aggregate and could produce a false "totalAnswers > 0" that has nothing to do with Phase 2. The reset removes this pollution so R1 validation reflects only the current simulation's Phase 2 output.

**Safe scoping:** The reset targets only the 398 student IDs owned by `state.demoParentId`. These IDs are stored in `sim-state.json` after the seed phase, and the existing `reset-demo-school-activities.mjs` already loads them from there. No other students are touched.

**Backup before delete:** Before deleting `learning_sessions` and `answers`, the runner queries and saves row counts to `reports/school-sim-daily/<date>/db-sim/pre-reset-counts.json`. This is a read-only snapshot, not a data backup, but gives the operator a record of what was cleared.

### 2C. Reset command

```powershell
# Existing script handles classroom tables; will be extended to include:
#   1. DELETE learning_sessions WHERE student_id IN [398 demo student IDs]
#   2. Collect the deleted/targeted learning_sessions.id values
#   3. DELETE answers WHERE learning_session_id IN [those IDs]
#   (answers are never deleted directly by student_id — Section 18.5 is authoritative)
node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=activities
```

The new simulation runner calls this automatically at the start of the first run (when `sim-state.currentSchoolDay === 0`). On subsequent nightly runs the reset is NOT repeated — only the new day's activities are added (idempotency: skip if today's activities already exist, `--force` to override).

### 2D. Alternative for R1 validation if reset is not performed (delta approach)

If the operator explicitly skips the reset (e.g., mid-simulation), the report validator falls back to a **delta approach**:

1. Before Phase 2 begins, read and store the current `count(answers)` per sampled student.
2. After Phase 2 completes, read the new count.
3. R1 validation passes only if `newCount - baselineCount >= expectedAnswersFromUISession`.

The delta approach is recorded in `report-validation/parent-route-r1.json` with a `validationMode: "delta"` flag so it is visible in the morning report. The plan recommends the full reset (clean state) rather than the delta approach.

### 2E. Safeguard

Before any data is deleted, the runner calls `assertDemoSchoolBaseline()` from `demo-school-lib.mjs`. If the baseline (108/398/2,388) is wrong, the runner aborts with a clear error before touching any data.

---

## 3. Architecture — Hybrid Model

Three sequential phases in one nightly runner:

```
Phase 1 — DB Simulation (5–15 min)
  For all 398 students across 18 physical classes:
  - Generate today's school-day schedule (subject × hour × class)
  - For each class × subject slot, insert classroom_activity + all student responses
  - Realistic profiles, realistic scoring, real topic keys, varied activity modes
  - Individual student_activities for weak-topic or improvement-pattern students

Phase 2 — Playwright UI Sample (30–60 min)
  For 12–15 sampled students across grades / profiles:
  - Real browser login → navigate to subject → answer questions → session complete
  - Uses existing subject drivers from scripts/virtual-student-qa/lib/subject-drivers/
  - Verifies that real learning API endpoints produce persisted data matching DB state

Phase 3 — Report Validation (5–10 min)
  Pure API calls (no browser):
  - Teacher report API × 11 teachers
  - School admin report API
  - Parent report API (demo parent)
  - Cross-class / cross-subject isolation checks
  - No-empty-report checks when activity exists
```

**Total estimated runtime:** 40–90 minutes.

---

## 4. Student Persona Model (all 398)

Replace the 3-bucket `achievementProfile()` with a 6-type distribution assigned once at initialization and stored per-student in the enhanced `sim-state.json`.

| Type | Share | Score range | Behavior |
|---|---|---|---|
| `struggling` | 15% | 20–50% | Low scores, high error rate, often skips homework |
| `average` | 45% | 50–70% | Moderate scores, completes most activities |
| `good` | 25% | 65–85% | Consistently good, completes all activity types |
| `excellent` | 5% | 82–100% | Very high scores, completes bonus/test activities |
| `inconsistent` | 5% | 10–90% (wide random) | Unpredictable attendance and score |
| `improving` | 5% | Week-over-week rising score, starts weak | Score increases each simulated day by a small delta |

**Per-student weak subjects** (randomly assigned at initialization, ~30% of students):
One subject in which the student scores 15–25% below their base profile. Stored in `sim-state.json` as `studentWeakSubject[studentId]`.

**Per-student attendance probability:**
- `excellent`: 0.95
- `good`: 0.90
- `average`: 0.80
- `improving`: 0.75
- `struggling`: 0.65
- `inconsistent`: 0.40

**Repeated mistakes:** For `struggling` and `inconsistent` students, the same wrong answer index is used for specific topics (stored per-student), simulating a recurring misconception visible in diagnostic reports.

---

## 5. School-Day Schedule Model

**Date mapping:** One simulated "school day" per calendar day the runner executes. Calendar weekends (Fri/Sat in Israeli school model) are skipped — state counter advances but no activities are written.

**Enhanced timetable** (derived from existing `TIMETABLE_BY_DAY`):

| Day | Hours 1–6 |
|---|---|
| Sunday | math, hebrew, english, science, moledet_geo†, geometry† |
| Monday | math, english, hebrew, math, science, moledet_geo† |
| Tuesday | geometry†, hebrew, english, math, science, moledet_geo† |
| Wednesday | math, english, science, hebrew, math, moledet_geo† |
| Thursday | math, geometry†, hebrew, english, math, science |

†Grade constraint enforcement applied at slot selection (see Section 6).

**Activity mode assignment** (replaces the current all-`guided_practice`)

| Time slot | Mode |
|---|---|
| Hours 1–2 (morning) | `guided_practice` (lesson) |
| Hours 3–4 (midday) | `homework` or `guided_practice` (alternating by day) |
| Hour 5 (late) | `quiz` for science/geometry; `homework` for language subjects |
| Hour 6 (end of day, Thursday only) | `test` for math and english |

---

## 6. Grade / Class / Subject Rules

**Subject availability by grade:**

| Subject | Grades |
|---|---|
| math | 1–6 (daily) |
| hebrew | 1–6 (daily) |
| english | 1–6 (almost daily; grade 1 simpler vocabulary topics) |
| science | 1–6 (3× per week; linked to timetable slots 4–5) |
| geometry | 2–6 (2–3× per week; grade 1 excluded) |
| moledet_geography | 3–6 (2× per week; grades 1–2 slot replaced with extra hebrew or science) |

**Topic keys per subject per grade** (replaces the current stub-topic approach):

The simulation will draw topic keys from the real product topic catalog — the same keys the learning engine uses. The real topic catalog is discoverable from `lib/classroom-activities/generate-activity-questions-client.js` and the learning-engine question bank.

Placeholder mapping (to be confirmed from question bank audit during implementation):

| Subject | Grade 1–2 topics | Grade 3–4 topics | Grade 5–6 topics |
|---|---|---|---|
| math | addition, subtraction | multiplication, division, fractions | fractions, ratio, word_problems |
| geometry | — | shapes, angles | shapes, angles, area, perimeter |
| hebrew | vowels_reading, plurals | plurals, verb_forms | verb_forms, sentence_structure |
| english | vocabulary (simple), simple_sentences | vocabulary, grammar_basics | vocabulary, reading_comprehension |
| science | living_things, animals | animals, plants, matter | environment, matter, forces |
| moledet_geography | — | community, maps_basic | maps, regions, history |

**Question set construction** (replaces the current stub questions):
Each activity's `question_set` is built from the real question bank for the relevant subject + topic + grade. If the real question generator is callable server-side (via `generate-activity-questions-client.js` or equivalent), it will be called. If it is client-only, the simulation will inline the topic's known question schema (correct structure, real topic slugs, real difficulty levels) rather than using generic stub text.

**Weak-topic classes** (existing `WEAK_TOPICS_BY_CLASS` already defined in `demo-school-data.mjs`):
All 12 defined weak-topic overrides are honored. Students in weak-topic classes score 15–25% lower than their base profile on that subject.

---

## 7. Homework / Quiz / Test Model

**Classroom activities** (for the whole class — `classroom_activities` table):
- Created as part of the school-day schedule (Phase 1 DB simulation)
- Mode: `guided_practice`, `homework`, `quiz`, or `test` per Section 5

**Individual student_activities** (self-initiated practice — `student_activities` table):
- Only created for students with `improving` or `excellent` profiles, or students whose teacher has assigned a weak-topic practice
- 1–2 individual activities per studied student per day, subject to attendance probability
- Mode: `practice` always (individual activities are self-driven)

**Student response distribution per activity:**
- `attended` students produce a full `classroom_activity_student_status` row + attempt rows
- `absent` students (per attendance probability) produce no rows for that slot (realistic sparse coverage)

---

## 8. UI Automation Sample (Phase 2)

**Sample selection** — 12–15 students chosen once per run, aiming for:
- At least 1 student from each grade (grades 1–6) = 6 minimum
- Profile distribution: 2 struggling, 4 average, 3 good, 2 excellent, 1 inconsistent, 1 improving
- Subject coverage: at least math, english, hebrew in the sample
- Teacher coverage: at least 3 different teachers' classes covered

**Reuse the existing subject drivers unchanged:**
- `scripts/virtual-student-qa/lib/subject-drivers/math-master.mjs`
- `scripts/virtual-student-qa/lib/subject-drivers/english-master.mjs`
- `scripts/virtual-student-qa/lib/subject-drivers/hebrew-master.mjs`
- (science, geometry, moledet-geography drivers where applicable)

**UI flow per sampled student:**
1. Real `/student/login` (username + PIN)
2. Navigate to subject learning page
3. Answer questions per profile (strong profile → correct answers, struggling → wrong answers per profile)
4. `session/finish` triggered by stopping the game
5. Verify `/api/learning/session/start` and `/api/learning/session/finish` API calls appeared in network log
6. Close browser context

**Target URL:** `https://liosh-website.vercel.app` (or local dev server if `SCHOOL_SIM_BASE_URL` overridden)

**Sampled student credentials — verified against schema and seeding code:**

The student login system uses the `student_access_codes` table (migration 001 + 015). The login flow at `/api/student/login` takes a `username` + `pin`, then verifies by computing:
- `code_hash = HMAC-SHA256(username, LEARNING_STUDENT_ACCESS_SECRET)`
- `pin_hash = HMAC-SHA256(pin, LEARNING_STUDENT_ACCESS_SECRET)`

and looking them up in `student_access_codes`.

**What is stored and readable:**
- `student_access_codes.login_username` — **plaintext**, stored verbatim (e.g., `demo-g1s1-01`). Readable via service role.
- `student_access_codes.code_hash` / `pin_hash` — **HMAC-SHA256 hashes**, not reversible. The PIN itself is never stored in the DB.

**What the UI sampler must do:**
1. Load `DEMO_STUDENT_PIN` from the env file (e.g., `"1234"` — the value used during seed phase in `seed-demo-school.mjs` line 368). This is the plaintext PIN for all 398 demo students.
2. Load `login_username` for sampled students from `student_access_codes` via service role query (plaintext, readily available).
3. Pass `{ username: loginUsername, pin: DEMO_STUDENT_PIN }` to `authenticateViaUi()` — the same form fields the real student uses (`שם משתמש` + `קוד כניסה`).

**No plaintext PINs are stored in the DB or hardcoded in scripts.** The PIN is provided at runtime via the `DEMO_STUDENT_PIN` env var, which must be set in the operator's private env file (same file that holds `DEMO_TEACHER_PASSWORD`). The UI sampler reads it via `process.env.DEMO_STUDENT_PIN` and fails fast if absent.

**Env file requirement:**
```powershell
# In the private env file (outside repo):
$env:DEMO_STUDENT_PIN = "<pin-used-at-seed-time>"
```

The seeding code defaults this to `"1234"` when the env var is not set, so the seed-time PIN is known. The operator's env file must confirm the PIN that was actually used during seed.

---

## 9. Report Validation (Phase 3 — API Level)

> **Data-source contract** — two separate data paths feed the product's report engine.
> This section makes that explicit and never conflates them.
>
> | Table | Written by | Read by |
> |---|---|---|
> | `classroom_activities` + `classroom_activity_student_status` + `classroom_activity_attempts` | Phase 1 DB simulation (all 398 students) | Teacher reports, School admin reports, Teacher QA parent-report bridge (R3) |
> | `student_activities` + `learning_sessions` + `answers` | Phase 2 Playwright UI (12–15 sampled students doing real self-practice) | Normal parent route (R1) |
>
> "Parent report passed" is not claimed unless the actual full parent report engine is exercised via the correct data source.

---

### 9A. Teacher Report Validation (R2)

**Route:** `GET /api/teacher/students/[studentId]/report-data`
**Auth:** Teacher JWT (each of the 11 demo teachers)
**Data source:** `classroom_activities` (Phase 1 — populated for all 398 students)

Checks (1 sampled student per teacher, 11 calls total):

| Check | Pass criterion |
|---|---|
| HTTP status | 200 |
| `summary.totalAnswers > 0` | Student has classroom activity from Phase 1 simulation |
| Only this teacher's subjects appear | Math teacher sees math/geometry only; English teacher sees english only; etc. |
| No subjects from other teachers | No cross-subject permission leak |
| Score distribution plausible | `summary.averageScore` between 10% and 100% (matching student profile) |
| `range` field present | Date range covers today's simulation |

**Failure criterion (P0):** Any teacher report returns 5xx, or a teacher's payload contains a subject they do not own, or a student with today's activity shows `totalAnswers = 0`.

---

### 9B. School Admin Report Validation (R4)

**Route:** `GET /api/school/students/[studentId]/report-data`
**Auth:** School manager JWT (`school@leo-k.com`)
**Data source:** `classroom_activities` (Phase 1 — all 398 students)

Checks (1 student per grade × 6 grades = 6 calls, plus 2 class drill-down calls):

| Check | Pass criterion |
|---|---|
| HTTP status | 200 for all calls |
| All 6 subjects may appear | School scope is not subject-filtered — manager sees everything |
| `summary.totalAnswers > 0` for students with activity | |
| Class drill-down | `GET /api/school/classes/[classId]/report-data` → `studentCount` matches enrolled count |
| Cross-class isolation | Class A students do not appear in Class B's report |

**Failure criterion (P0):** Any school report call returns 5xx, or a class report contains students from another class.

---

### 9C. Teacher QA Full Parent Report Validation (R3) — Primary parent-report gate

This is the critical path for validating that classroom simulation data reaches the full parent report engine (`generateParentReportV2`).

**Bridge route:** `GET /api/teacher/students/[studentId]/parent-report-data`
**Auth:** Teacher JWT
**Data source:** `classroom_activities` (Phase 1) — merged into a parent-report-shaped payload by `buildTeacherParentReportPreviewPayload` + `classroom-activity-class-report.server.js`
**UI entry point:** `/learning/parent-report?studentId=...&source=teacher&period=week`

**Two-level check:**

**Level 1 — API payload check (no browser, per sampled student):**

| Check | Pass criterion |
|---|---|
| HTTP status | 200 |
| `summary.totalAnswers > 0` for students with today's classroom activity | Simulation data reached the payload |
| Subject data present only for this teacher's permitted subjects | Subject-scope still enforced in the bridge |
| `_dailyBySubject` key absent | Internal keys not leaked |
| `range.from` / `range.to` cover today | Date range correct |
| Topic-level data present (not just top-level summary) | Report engine will find something to render |
| `insights` or `recommendations` present | Not empty when activity exists |

**Level 2 — Browser render check (Playwright, for 3 sampled students):**

Log in as the responsible teacher, navigate to `/learning/parent-report?studentId=...&source=teacher&period=week`, assert:
- Report page renders (not a blank/error page)
- Summary section shows non-zero question count
- Subject-specific section appears for at least one simulated subject
- "No activity" state is NOT shown when the student has classroom activity today

**Failure criterion (P0):** API payload returns `totalAnswers = 0` for a student with Phase 1 activity, or browser render shows "no activity" for such a student, or a teacher's bridge payload leaks another teacher's subject.

---

### 9D. Normal Parent Route Sanity Check (R1)

**Route:** `GET /api/parent/students/[studentId]/report-data`
**Auth:** Demo parent JWT (`demofamily@leo-k.com`)
**Data source:** `student_activities` + `learning_sessions` + `answers` — written by **Phase 2 Playwright UI** only (real self-practice sessions)

> **Honest scope:** This route does NOT read from `classroom_activities`. Phase 1 DB simulation data does NOT appear here by design. This check does NOT validate whether classroom simulation data reaches the parent — that is the R3 check above.

Checks (called for the 12–15 Phase 2 UI-sampled students only):

| Check | Pass criterion |
|---|---|
| HTTP status | 200 |
| `summary.totalAnswers > 0` for students who completed a Phase 2 UI session | Self-practice data persisted correctly |
| Route returns 200 even if student has no self-practice | Graceful empty state, not 500 |
| Summary fields coherent with Phase 2 session (same subject, similar answer count) | No data corruption |

> For students who were NOT in the Phase 2 UI sample, the normal parent route may legitimately return `totalAnswers = 0`. This is NOT a failure — it reflects the correct data-source behavior. The plan does not mark this as a report validation failure.

**Failure criterion (P0):** HTTP 5xx for any sampled student, or `totalAnswers` significantly higher than Phase 2 session answered count (would indicate cross-student bleed into the parent route).

---

### 9E. Isolation and Bleed Checks (cross-cutting)

Run after all four report validation groups:

| Check | Method | Pass criterion |
|---|---|---|
| Cross-student bleed | Compare two students' R2 payloads | No shared activity IDs or question data |
| Cross-class bleed | Compare two classes' school drill-down | No student overlap |
| Subject permission leak | R2: teacher A sees only their subjects | No subject keys from other teachers' domains |
| R3 bridge subject scope | Same teacher JWT used for R3 as for R2 | Same subjects visible, no extras |
| R1 vs R3 independence | R1 payload for a UI-sampled student differs from R3 payload for same student | They aggregate different tables — scores may differ; neither is wrong |

---

### 9F. Report Validation Summary Artifact

`report-validation/` folder contains:

- `teacher-reports.json` — per-teacher: endpoint, status, totalAnswers, subjects visible, pass/fail, reason
- `school-reports.json` — per sampled student + class drill-downs: status, counts, pass/fail
- `r3-bridge-api.json` — per sampled student: R3 payload summary (totalAnswers, subjects, insights present), pass/fail
- `r3-bridge-browser.json` — per 3 Playwright-verified students: render pass/fail, screenshot path, "no activity" detected
- `parent-route-r1.json` — per Phase 2 UI-sampled student: R1 status, totalAnswers, pass/fail
- `isolation-checks.json` — bleed and scope checks, one row per check

---

## 10. Artifacts

```
reports/school-sim-daily/<YYYY-MM-DD>/
  run-summary.json         (machine-readable; gate reads this)
  run-summary.md           (human-readable morning report)

  db-sim/
    plan.json              (which classes × subjects ran today)
    grade-summary.json     (per-grade: activities, students active, score distribution)
    class-summary.json     (per-class: activities created, attendance rate)
    student-exceptions.json (absent students, DB errors, outlier scores)

  ui-sample/
    sample-manifest.json   (which students were sampled, grade/profile/subject)
    sample-results.json    (per-student: pass/fail, questions answered, session verified)
    screenshots/           (only on failure)
    logs/                  (per-student log file)

  report-validation/
    teacher-reports.json     (9A — R2: per-teacher status, subjects, totalAnswers)
    school-reports.json      (9B — R4: school + class drill-down results)
    r3-bridge-api.json       (9C Level 1 — R3 payload: totalAnswers, subjects, insights, scope)
    r3-bridge-browser.json   (9C Level 2 — Playwright render: pass/fail, screenshot path)
    parent-route-r1.json     (9D — R1: per UI-sampled student status and totalAnswers)
    isolation-checks.json    (9E — bleed + scope checks, one row per check)

  failure-repro.md         (only present on FAIL — operator runbook)
```

Longitudinal state (outside repo, not committed):
```
%LOCALAPPDATA%\liosh-qa\school-sim-state\
  sim-state.json           (currentSchoolDay, studentProfiles, weakSubjects, lastRunAt)
  sim-state.json.bak
  timeline.md              (append-only daily summary)
```

---

## 11. Pass / Fail Criteria

### P0 — Run fails, state not advanced, operator action required

- Demo school baseline check failed before simulation (wrong student/class count)
- DB simulation wrote < 80% of expected activities (DB error or capacity issue)
- UI sample: parent or school manager login failed
- UI sample: > 3 of 12–15 sampled students failed to complete session
- Report validation: school admin or teacher report API returned 5xx for > 2 endpoints
- Cross-student data bleed detected
- Subject permission leak detected (teacher sees another teacher's subject data)

### P1 — Run partially degraded, state advances with warning flag

- 1–3 of 12–15 UI sample students failed session (driver bug, not product bug)
- Report validation: 1 teacher endpoint returned empty data (data not yet propagated)
- Score distribution for a grade outside expected range (indicates profile model drift)
- Some `student_activities` for individual students failed to insert

### P2 — Informational, no impact on state advance

- Specific subject missing from a grade due to timetable skip rule
- Attendance lower than expected for `inconsistent` profile students (by design)
- `improving` student score delta smaller than model target

### Launch gate verdict mapping (feeding into `npm run qa:launch:daily-gate`)

The new simulation writes `run-summary.json` in the same schema the existing `aggregator.mjs` nightly layer already reads. `isFullNightlyRun` is `true` when `studentLabelsFilter` is absent and all 398 students were processed.

---

## 12. Estimated Runtime

| Phase | Estimated time | Notes |
|---|---|---|
| Pre-flight + reset check | 1–2 min | API calls only |
| Phase 1: DB simulation | 8–20 min | 108 activities × 22 students avg × batch inserts |
| Phase 2: UI sample (15 students) | 30–60 min | 2–4 min per student in realtime mode |
| Phase 3: Report validation | 10–20 min | ~40 API calls (R2/R4/R1) + Playwright browser render for 3 students (R3 Level 2) |
| Artifact write | < 1 min | |
| **Total** | **55–110 min** | Well within 02:00 → 12:00 window |

---

## 13. Nightly Command

```powershell
# Standard nightly (Task Scheduler or manual):
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs

# Dry-run (plan only, no DB writes, no UI):
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --dry-run

# Preflight only (check credentials + demo school baseline):
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --preflight-only

# Skip UI sample (DB sim + reports only, faster):
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --skip-ui-sample

# Force re-run of same date:
node --env-file=.env.local scripts/school-portal/run-school-sim-nightly.mjs --force

# Or via npm (after package.json update):
npm run qa:school:daily
npm run qa:school:daily -- --dry-run
npm run qa:school:daily -- --preflight-only
```

---

## 14. New Files to Create (Implementation Checklist)

All under `scripts/school-portal/sim/` (new sub-directory) and wiring in `package.json`. No changes to product code, routes, migrations, CSS, or Hebrew copy.

- `scripts/school-portal/sim/school-sim-config.mjs` — All constants: persona distributions, timetable overrides, topic catalog, activity mode rules, grade/subject availability
- `scripts/school-portal/sim/persona-model.mjs` — 6-type profile assignment, attendance probability, weak-subject assignment, improving-student score delta
- `scripts/school-portal/sim/school-day-planner.mjs` — Generates the day's class × subject × hour schedule honoring grade rules and timetable
- `scripts/school-portal/sim/topic-catalog.mjs` — Real topic keys per subject × grade, pulled from or aligned to `generate-activity-questions-client.js`
- `scripts/school-portal/reset-demo-school-activities.mjs` — **Extended** to: (1) delete `learning_sessions` WHERE `student_id IN [398 demo student IDs]`, (2) collect those session IDs, (3) delete `answers` WHERE `learning_session_id IN [those IDs]` — never by `student_id` directly (Section 18.5 is authoritative)
- `scripts/school-portal/sim/db-simulator.mjs` — Writes `classroom_activities`, `classroom_activity_student_status`, `classroom_activity_attempts`, and `student_activities` with realistic data
- `scripts/school-portal/sim/ui-sampler.mjs` — Playwright orchestrator for 12–15 sampled students, reusing existing subject drivers
- `scripts/school-portal/sim/report-validator.mjs` — Four-track validation: R2 teacher, R4 school, R3 bridge (API + Playwright browser render), R1 parent sanity; isolation checks; writes all six artifact JSON files
- `scripts/school-portal/sim/artifacts.mjs` — Writes all artifact files to `reports/school-sim-daily/<date>/`
- `scripts/school-portal/sim/longitudinal-state.mjs` — `sim-state.json` read/write (outside repo), atomic rotation, `timeline.md` append
- `scripts/school-portal/run-school-sim-nightly.mjs` — Top-level orchestrator: preflight → reset-guard → Phase 1 → Phase 2 → Phase 3 → artifact write → state advance

---

## 15. Final Test Checklist (after implementation)

Run by the implementation in one continuous pass after all files are written:

- `T1` Dry-run: outputs plan, no DB writes, exit 0
- `T2` Preflight-only: demo school baseline 108/398/2388 confirmed, demo credentials valid
- `T3` DB simulation (advance): activities created = expected count, all profiles covered
- `T4` Grade summary: each of 6 grades has > 0 activities, score distributions within expected bands
- `T5` Activity mode distribution: guided_practice, homework, quiz, test all appear
- `T6` Attendance: struggling students have < 100% row coverage; excellent students have > 90%
- `T7` UI sample: 12+ students complete sessions, session API calls verified in network log
- `T8a` Teacher report validation (R2): all 11 teacher reports non-empty, subject-scope correct per teacher
- `T8b` School admin report validation (R4): school report non-empty, class drill-down counts match enrolled students
- `T8c` Teacher QA parent-report bridge API (R3): `totalAnswers > 0` for all 3 sampled students with classroom activity, insights present, no `_dailyBySubject` leak, subject scope enforced
- `T8d` Teacher QA parent-report bridge browser: Playwright renders report for 3 students, no "no activity" shown when activity exists
- `T8e` Normal parent route sanity (R1): HTTP 200 for all Phase 2 UI-sampled students; `totalAnswers > 0` for students who completed a UI session; graceful empty state for non-sampled students
- `T9` Isolation: no cross-subject leaks (R2 + R3), no cross-student bleed (R2, R4, R1), R1 vs R3 are independent data sources
- `T10` No-empty-reports: every class with > 0 classroom activities has non-zero aggregated data in teacher report (R2) and school report (R4)
- `T11` Artifact check: all required JSON files present and parseable
- `T12` Idempotency: re-run same date without `--force` is blocked and exits 0 with no state change
- `T13` Force re-run: re-run with `--force` succeeds and replaces today's artifacts
- `T14` Launch gate integration: `npm run qa:launch:daily-gate -- --date <today>` reads the new `run-summary.json` and produces `isFullNightlyRun=true`, nightly layer = pass

---

## 16. What Must Not Be Touched

By design, the simulation never modifies:

- Product UI pages (`pages/` other than new QA scripts)
- CSS or design tokens
- Hebrew text in the UI (`lib/teacher-portal/teacher-ui.he.js`, etc.)
- Product routes
- Supabase schema or migrations (no new SQL)
- Authentication logic (`lib/auth-*`, Supabase auth config)
- The existing 12-student AAA simulation scripts (archived in place)
- The existing `launch-readiness/` gate scripts
- Demo school structural data (students, teachers, classes, memberships, enrollments, credentials)

---

## 17. Post-Approval Execution Model

After the owner approves this plan:

1. Implementation runs continuously from Step 1 to Step 14 of the implementation checklist with no staged pause for approval.
2. All tests (T1–T14) run automatically at the end of implementation.
3. One delivery report is produced: `docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_DELIVERY_REPORT.md`.
4. Implementation stops only if a blocking error prevents progress — in that case a failure report is produced and the owner is notified once.

No commit. No push. No SQL changes. No UI changes.

---

## 18. Owner Build Approval Contract

> This section is binding. It defines exactly how approval is given, how implementation must behave, and what the hard constraints are during the entire build.

---

### 18.1 Approval Mechanism

**Implementation begins only when the owner presses Build (or explicitly types an approval command in Cursor).**

- Chat messages that discuss the plan, request plan edits, or ask clarifying questions are plan-edit requests only.
- They do not authorize implementation to begin.
- The agent must not start writing files, running scripts, modifying data, or calling any non-readonly tool until Build approval is given.
- If this message is received before Build is pressed, the agent reads it as a plan update request and stops.

---

### 18.2 Execution Rules After Build

After Build approval, the agent implements the full approved scope continuously, without stopping to ask for intermediate approvals.

**What "continuously" means:**
- Complete all files in the implementation checklist (Section 14) in order.
- Do not stop after Phase 1 to ask "should I continue?"
- Do not stop after writing each file to ask for review.
- Do not stop after the DB simulator to ask whether to build the UI sampler.
- Do not stop at any intermediate milestone to request approval.

**The only permitted stop points are:**
1. A blocking error that prevents safe continuation (see Section 18.6).
2. Completion of the full implementation + test suite.

---

### 18.3 No Staged Stop-and-Wait

This is a QA and simulation infrastructure project, not a multi-phase product feature with user-visible changes. The build produces scripts and artifact files only. No staged approval is needed between phases.

The agent should behave as if running a build pipeline:
- Build → Test → Report
- One continuous pass
- One final result

---

### 18.4 Hard Constraints During Implementation

The following constraints apply at all times during implementation. They cannot be overridden by any implicit instruction in the code, logs, or intermediate results:

| Constraint | Detail |
|---|---|
| No commit | `git commit` must never be called |
| No push | `git push` must never be called |
| No UI changes | No edits to `pages/` UI components, `components/`, or any user-facing page |
| No CSS / design changes | No edits to `.css`, `.scss`, Tailwind config, or design token files |
| No Hebrew text changes | No edits to any Hebrew-language string in `lib/teacher-portal/teacher-ui.he.js` or any `.he.js` / `.he.ts` file or inline JSX Hebrew copy |
| No product route changes | No edits to existing API routes under `pages/api/` or `pages/` route files |
| No SQL migrations | No new `.sql` files under `supabase/migrations/` unless explicitly approved in a separate decision by the owner |
| No auth logic changes | No edits to `lib/learning-supabase/student-auth.js`, `lib/auth-*`, or Supabase auth configuration |
| No structural demo school changes | Do not delete or modify: `students` rows, `teacher_profiles`, `teacher_classes`, `teacher_class_students`, `school_teacher_memberships`, `school_teacher_subjects`, `school_student_enrollments`, `student_access_codes`, or auth users |

---

### 18.5 Reset Safety Contract

The clean reset (Section 2) is permitted only under these exact conditions:

1. **Scope:** Demo school only. Targets the 398 student IDs owned by `state.demoParentId` from `sim-state.json`. No other students, teachers, or schools are touched.
2. **What is deleted:**
   - `classroom_activities`, `classroom_activity_student_status`, `classroom_activity_attempts` for the demo school
   - `student_activities` for demo teacher IDs (archived via `status=archived`, not hard-deleted)
   - `learning_sessions` WHERE `student_id IN [398 demo student IDs]`
   - `answers` WHERE `learning_session_id IN [IDs of the deleted learning sessions]` — **not** WHERE `student_id IN [...]` directly, to avoid accidentally broadening scope if `answers.student_id` has any unexpected coverage
3. **Baseline verification first:** `assertDemoSchoolBaseline()` must pass (108/398/2,388) before any delete is executed.
4. **Pre-reset snapshot:** Row counts for `classroom_activities`, `learning_sessions`, and `answers` are saved to `pre-reset-counts.json` before any delete.
5. **Never broaden delete scope:** If the service role query returns an unexpected row count (e.g., `learning_sessions` count is 10× higher than expected), the reset aborts with an error rather than proceeding.

---

### 18.6 Failure Behavior

If a blocking error prevents safe continuation at any point during implementation, the agent must:

1. **Stop immediately** — do not attempt workarounds that could cause data changes or violate the constraints in Section 18.4.
2. **Produce a failure report** at `docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_FAILURE_REPORT.md` containing:
   - What was completed (list of files written, commands run, data modified)
   - What failed (exact error message and stack trace)
   - Which phase failed (Section 14 checklist item number)
   - Whether any DB data was modified (and which tables)
   - A safe next step for the operator (e.g., re-run reset before retrying, or revert a specific file)
3. **Do not commit or push** even the failure report.
4. **Notify once** — deliver the failure report in chat and stop.

---

### 18.7 Success Behavior

If all implementation steps complete without a blocking error:

1. Run the full final test checklist T1–T14 (Section 15) automatically.
2. Write the delivery report at `docs/qa/FULL_SCHOOL_ACTIVE_DAILY_SIMULATION_DELIVERY_REPORT.md` containing:
   - All files created or modified, with paths
   - All commands run during the build, in order
   - Artifact paths produced
   - Pass/fail result per test (T1–T14), with output summary
   - Any P1/P2 warnings or deferred items
   - Confirmation that no commit, no push, no UI changes, no SQL migrations, and no demo school structural changes occurred
3. Do not commit. Do not push.
4. Deliver the report in chat and stop.
