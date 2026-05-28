# Teacher & School Report Performance Audit

**Date:** 2026-05-28  
**Type:** Read-only static trace + architecture review (no code changes, no SQL, no live load tests in this pass)  
**Scope:** Teacher dashboard/class/student routes, school classes/students browse + report modals, listed server builders  

---

## Executive summary

Slowness is **primarily server-side aggregation cost**, not missing indexes alone. The dominant pattern is:

1. **`aggregateParentReportPayload`** — per student, two unbounded Supabase reads (`learning_sessions` + `answers` for 30 days), then heavy in-memory rollup across six subjects.
2. **`buildLightweightStudentActivityMap`** — batched `IN (student_ids)` but still paginated session/answer scans (1000-row pages) for every student in scope.
3. **Class / physical reports multiply (1)** by roster size (concurrency 6).
4. **Teacher student pages** add a **post-load API waterfall** (5+ secondary endpoints) after the main report.
5. **School browse** can call **`buildLightweightStudentActivityMap` twice** for the same students (`browse-status` + class roster badges).
6. **Physical Report Hub V2** adds **per-subject `buildClassTeacherGuidanceV2`** on top of already-built full student payloads, plus **N+1** activity submit-count queries.
7. **Client navigation** uses Next.js client routing but **no teacher-side response cache** (`cache: "no-store"` on reports); every route change refetches.

Cold/warm timings below are **complexity estimates** from call graphs and prior QA sample sizes (e.g. ~5k answers / class in `TEACHER_GUIDANCE_SURFACE_PARITY_AUDIT.md`). They are **not** wall-clock benchmarks from this audit run. Use existing `Server-Timing` headers on teacher APIs (`auth`, `build`) for measured follow-up.

---

## Methodology

| Activity | Done? |
| -------- | ----- |
| Trace pages → API routes → server builders | Yes |
| Count duplicate work / waterfalls | Yes |
| Inspect recent features (browse-status, badges, V2 physical guidance) | Yes |
| Run SQL / migrations | **No** |
| Change application code | **No** |
| Live HTTP timing against production/staging | **No** (recommend next step with auth + `Server-Timing`) |

---

## Route timing table

> **Legend:** Cold = first visit / empty client cache. Warm = repeat within same session where caching applies. Teacher portal has **no** list/report cache unless noted. School list cache is **OFF by default** (`NEXT_PUBLIC_SCHOOL_PORTAL_LIST_CACHE` unset).

| Route / API | Cold load (est.) | Warm load (est.) | API calls (page) | Main slow function | Notes |
| ----------- | ----------------: | ----------------: | ----------------: | ------------------ | ----- |
| `/teacher/dashboard` | 4–20s | 4–20s | 2 (`getSession` + `GET /api/teacher/dashboard`) | `buildTeacherDashboardPayload` → `buildLightweightStudentActivityMap` | Scales with **all** roster students (plan limit, often 20–40+). 120s client timeout signals known pain. |
| `/teacher/class/[classId]` | 5–45s | 5–45s | 2 | `buildTeacherClassReportPayload` → **N×** `aggregateParentReportPayload` | N = roster size. Sample class ~5,280 cohort answers (~25 students). `subject_focus` **does not** shrink DB reads per student. |
| `/teacher/student/[studentId]` | 3–15s perceived | 3–15s | **7–8** | `buildTeacherStudentReportPayload` + panel waterfall | Main report 1× aggregate; then activities, worksheets, messages, login access, guardian access. |
| `/teacher/class/[classId]/activities` | 1–4s | 1–4s | 2 | `GET /api/teacher/activities?classId=` | Lighter than report; still session + fetch on every visit. |
| `/teacher/worksheets` | — | — | — | — | **Out of nav-critical path** for this audit; not on dashboard→class→student flow. |
| `/school/classes` | 2–8s + modal | 1–5s if list cache ON | 3 on shell ready (`me` via portal load + `classes` + `browse-status`) | `listSchoolClasses` + `buildSchoolBrowseStatusMaps` | `browse-status` waits until `classes.length > 0`. Physical modal adds heavy call. |
| `/school/students` | 2–10s + drill | 1–6s if list cache ON | 4+ (`browse-summary` + `browse-status` + `students?…` when class picked) | `buildSchoolBrowseStatusMaps` + `listSchoolStudentsInPhysicalClass` → `attachLearningStatusBadgesForBrowse` | Grade/class change refetches students; cache bust if `learningStatusBadge` missing on cached rows. |
| `GET /api/school/classes/browse-status` | 3–30s | 0–30s | — | `buildSchoolBrowseStatusMaps` → one batched `buildLightweightStudentActivityMap` | **Whole-school** student union when no `gradeLevel` filter. |
| `GET /api/school/students?gradeLevel&physicalClassName` | 1–8s | 0–8s | — | `listSchoolStudentsInPhysicalClass` + **second** activity map for badges | ~20–24 students typical; duplicates activity scan vs browse-status for same IDs. |
| `GET /api/school/classes/physical-report` | 15–90s+ | 15–90s+ | — | `buildSchoolPhysicalClassReportPayload` | N× full student aggregate + **per subject-class** classroom rollup + **per subject** `buildClassTeacherGuidanceV2` + N+1 activity counts. Sample physical cohort ~22,540 answers. |
| `GET /api/school/classes/[classId]/report-data` | 5–45s | 5–45s (report cache OFF default) | — | Same as teacher class report builder | Modal-only; same cost as teacher class page. |
| `GET /api/school/students/[studentId]/report-data` | 2–10s | 2–10s (report cache OFF default) | — | `buildTeacherStudentReportPayload` | Full student aggregate + guidance V2. |
| Teacher nav dashboard → class → student | Sum of above | **No reuse** | 3 route loads × (session + main API) | Repeated aggregation | Client `Link` navigation; `useTeacherPortalLoad` forces refetch (`cache: "no-store"`). |

---

## Specific questions

### 1. Teacher dashboard

| Question | Answer |
| -------- | ------ |
| How many API/server loads on open? | **One** data API: `GET /api/teacher/dashboard` after Supabase session (see `pages/teacher/dashboard.js`). |
| Aggregate all students/classes every time? | **Yes.** Every dashboard load runs `buildTeacherDashboardPayload` for full teacher roster (merged direct + class memberships), all dashboard class IDs, and **one** `buildLightweightStudentActivityMap` over **all** `studentIds`. |
| Fetch class reports or student summaries eagerly? | **No** full class/student report payloads. Only lightweight rollups + `teacherAttentionSignals` (top 3 students from in-memory weak-topic map). |
| Recompute activity maps more than once? | **Once** per dashboard request inside `buildTeacherDashboardPayload`. |
| Heavy attention signals? | **No** — `buildTeacherAttentionSignals` is O(students) in memory; no guidance V2. |
| Duplicate work vs cards? | Status badges and attention both derive from the **same** `activity` map; class cards use separate `loadPerClassMemberAndActivityCounts` + membership queries (not full reports). **No** duplicate full report builds on dashboard. |

**Dashboard server pipeline (sequential hotspots after parallel profile/students/classes):**

1. `loadPerClassMemberAndActivityCounts` — grouped counts per class  
2. `loadTeacherClassMembershipRows` — paginated membership  
3. `loadStudentsByMembershipRows`  
4. `buildLightweightStudentActivityMap` — **largest cost** (sessions + answers batches, optional classroom merge for teacher)  
5. `buildSchoolMembershipForMe`  

### 2. Teacher class report

| Question | Answer |
| -------- | ------ |
| One subject-class or more? | **One** `classId` per page; API `buildTeacherClassReportPayload` for that class only. |
| Full student payload per subject? | **Full** `aggregateParentReportPayload` **per roster member** (all subjects in DB), then `aggregateClassReportFromStudentPayloads` with `scopeSubjects` from `class.subject_focus` when set. |
| Guidance V2 cost? | **Moderate CPU** — `buildClassTeacherGuidanceV2` once on aggregated class payload; not N× per student. Small vs N× aggregate. |
| Data not above the fold? | **Yes** — full per-student analytics objects are built; response includes `students[]` summaries, `subjects`, `weaknessTopics`, `dailyActivity`, guidance units, classroom merges. |
| Repeated work across sections? | Single aggregation pass + one guidance build. Overlap is **display-only** (summary vs guidance vs student list use same underlying aggregates). |

**Concurrency:** `CLASS_REPORT_STUDENT_CONCURRENCY = 6` (`teacher-class-report.server.js`).

### 3. Teacher student report

| Question | Answer |
| -------- | ------ |
| Full parent-style payload? | **Yes** — `aggregateParentReportPayload` + `attachStudentLearningAccountToParentReportPayload` + `sanitizeReportPayloadForTeacher` (parent-shaped analytics, teacher-sanitized). |
| All subjects though teacher teaches one/two? | **DB/compute: all subjects** in aggregate; **response** may be trimmed by `applySchoolTeacherReportFilter` **after** build (`filterReportByPermittedSubjects`). |
| Guidance recomputed more than once? | **Once** — `buildStudentTeacherGuidanceV2` on final payload (filter path may call V2 again on filtered payload). |
| Over-fetched? | **Yes** for school teachers with narrow subjects; **Yes** for below-fold panels (5+ extra APIs on mount). |

### 4. School classes/students

| Question | Answer |
| -------- | ------ |
| `browse-status` too often? | Fetched on **both** `/school/classes` and `/school/students` when portal ready. Without `NEXT_PUBLIC_SCHOOL_PORTAL_LIST_CACHE=1`, **every page mount refetches**. Navigating classes ↔ students repeats work. |
| Stale cache bust on students? | **Yes** — if cached roster rows lack `learningStatusBadge`, `loadClassStudents` ignores cache and refetches (`pages/school/students/index.js`). |
| Grade/class selection full reload? | **Yes** — `useEffect` on `gradeLevel` / `physicalClassName` calls `loadClassStudents()`; resets report modal state. |
| `buildSchoolBrowseStatusMaps` batched? | **Single** `buildLightweightStudentActivityMap` for all unique students across listed classes (good). Preceded by `listSchoolClasses` + paginated `teacher_class_students` membership load. |
| Status badges heavy per card? | **Per-class student list:** second `buildLightweightStudentActivityMap` for that class’s students only (`attachLearningStatusBadgesForBrowse`). Overlaps browse-status student set. |

### 5. Internal navigation

| Factor | Teacher portal | School portal |
| ------ | ---------------- | --------------- |
| Full page reload vs client nav | Client (`next/link`) | Client |
| API waterfall | Student page: **1 + 5** parallel secondary calls | Classes: list + browse-status; modals add report APIs |
| Duplicate `useEffect` fetch | `useTeacherPortalLoad` aborts duplicate in-flight same path; **new path = new full load** | `useSchoolDataFetch` skips duplicate same `schoolId::path` in one mount |
| Cache invalidation | **None** for reports (`Cache-Control: no-store`) | In-memory SWR **disabled by default** for lists and reports |
| Large payloads | Class/physical reports can be **MB-scale JSON** with big rosters | Physical report largest |
| SSR | `getServerSideProps` only passes ids / `linkEnabled` — **data fetched client-side** | Same pattern |

**Why navigation feels slow:** Each teacher route pays **session resolution + full server rebuild** with no cross-route payload reuse. School routes repeat **browse-status** across pages unless env cache enabled.

---

## Duplicate work table

| Area | Duplicate work found | Files / functions | Impact | Recommendation |
| ---- | -------------------- | ----------------- | ------ | -------------- |
| Class report per student | N full parent aggregates despite `subject_focus` | `buildClassReportStudentEntry` → `aggregateParentReportPayload`; scope only in `aggregateClassReportFromStudentPayloads` | **High** — 2× unbounded queries × roster | Add subject/date-scoped fetch or shared batch loader for class reports |
| Physical class report | Same N aggregates + **S** classroom rollup queries (one per subject-class) + **S** guidance builds | `school-physical-class-report.server.js` | **Very high** for multi-subject physical groups | One classroom rollup batch; lazy guidance per subject in modal tabs |
| School browse vs class roster | Two activity maps for same students | `buildSchoolBrowseStatusMaps` + `attachLearningStatusBadgesForBrowse` | **Medium** on `/school/students` drill-down | Return per-student badge from browse-status map or single shared endpoint |
| School pages | `browse-status` on classes **and** students | `pages/school/classes/index.js`, `pages/school/students/index.js` | **Medium** on cross-nav | Shared React context or longer TTL session cache |
| Teacher student page | Main report + 5 auxiliary APIs always requested | `TeacherStudentIndividualActivitiesPanel`, `TeacherStudentWorksheetsPanel`, `TeacherParentMessagePanel`, `StudentLoginAccessPanel`, `GuardianAccessPanel` | **Medium** perceived latency | Lazy-load panels below fold or on expand |
| Student report subject filter | Full aggregate then `filterReportByPermittedSubjects` | `buildTeacherStudentReportPayload`, `applySchoolTeacherReportFilter` | **Medium** for school teachers | Pass permitted subjects into aggregate or filter queries |
| Physical report activities | Count query per recent activity | `loadRecentActivitiesForPhysicalClass` + `Promise.all` count loops | **Medium** with many activities | Single grouped count query |
| Dashboard vs class report | Same students may get lightweight map (dashboard) then full aggregate (class page) | `teacher-dashboard-activity.server.js` vs `aggregateParentReportPayload` | **High** across session workflow | Not interchangeable caches today; document or unify layers |
| Guidance V2 physical | `aggregateClassReportFromStudentPayloads` per subject on **same** `studentPayloads` | `buildPhysicalSubjectGuidanceBlock` | **Low–medium** CPU vs IO | Acceptable after IO fix; optional memoize scoped agg |

---

## Recent-change impact table

| Recent change | Possible performance impact | Verified? | Recommendation |
| ------------- | --------------------------- | --------- | -------------- |
| `GET /api/school/classes/browse-status` | Extra whole-school (or grade) activity scan on school pages | **Yes** (code path) | Gate behind drill level; grade-scoped query param already exists — use on classes page when only one grade shown |
| `learningStatusBadge` on school student cards | Second `buildLightweightStudentActivityMap` per class list | **Yes** | Merge with browse-status or embed in `students?` only |
| Cache bust for missing `learningStatusBadge` | Forces refetch for users with old session cache | **Yes** | One-time; will stabilize |
| Physical Report Hub V2 (`subjectGuidanceBlocks`) | **S ×** `buildClassTeacherGuidanceV2` + scoped re-aggregation per subject | **Yes** | Keep V2 logic; defer until student payloads cached or shared |
| Teacher dashboard attention / status badges | Uses existing lightweight map only | **Yes** — not a new full-report path | Low priority |
| Classroom activity merge on dashboard/reports | Extra queries per teacher/class/student | **Yes** (intended parity) | Batch classroom rollups where possible |
| `Server-Timing` on teacher dashboard/class/student APIs | Enables measurement, not a regression | **Yes** | Use in staging benchmarks |

---

## File responsibility table

| File / function | Role | Performance concern |
| --------------- | ---- | ------------------- |
| `pages/teacher/dashboard.js` | Client: session + single dashboard API | 120s timeout; no cache |
| `lib/teacher-server/teacher-dashboard.server.js` → `buildTeacherDashboardPayload` | Orchestrates roster + activity map + attention | Many sequential DB steps before activity map |
| `lib/teacher-server/teacher-dashboard-activity.server.js` → `buildLightweightStudentActivityMap` | Batched sessions/answers for many students | Scales with students × activity volume; pagination loops |
| `lib/teacher-server/teacher-class-report.server.js` → `buildTeacherClassReportPayload` | N× student aggregate + class guidance | **Primary class report bottleneck** |
| `lib/parent-server/report-data-aggregate.server.js` → `aggregateParentReportPayload` | Per-student sessions+answers (unbounded) | **Core cost** for all full reports |
| `lib/teacher-server/teacher-report.server.js` → `buildTeacherStudentReportPayload` | Single-student full pipeline | Heavy but 1 student; filter-after-build waste |
| `lib/teacher-server/teacher-guidance-v2.server.js` | V2 guidance CPU | Minor vs aggregate IO |
| `lib/teacher-server/classroom-activity-class-report.server.js` | Classroom table rollups | Extra queries per class/student context |
| `lib/teacher-portal/use-teacher-portal-session.js` → `useTeacherPortalLoad` | Refetch every navigation | `cache: "no-store"` |
| `pages/teacher/student/[studentId].js` | Mounts 5+ child panels | Client waterfall |
| `lib/school-server/school-browse-status.server.js` → `buildSchoolBrowseStatusMaps` | School-wide browse rollups | Expensive when many students |
| `lib/school-server/school-students.server.js` → `listSchoolStudentsInPhysicalClass`, `attachLearningStatusBadgesForBrowse` | Class roster + badges | Duplicate activity map |
| `lib/school-server/school-physical-class-report.server.js` → `buildSchoolPhysicalClassReportPayload` | Worst-case report builder | N students + S subjects + N+1 counts |
| `lib/school-portal/use-school-data-fetch.js` | List fetching | No cache unless env flag |
| `lib/school-portal/school-portal-cache-flags.js` | Cache defaults **OFF** | Explains repeated school fetches |
| `lib/school-portal/school-report-view-model.js` → `parsePhysicalClassReportViewModel` | Client VM only | CPU on large JSON in browser |
| `pages/api/teacher/dashboard.js`, `report-data.js` | API + `Server-Timing` | Measurement hook |

---

## DB / Supabase call patterns (identifiable without SQL)

| Pattern | Where | Notes |
| ------- | ----- | ----- |
| `learning_sessions` + `answers` by `student_id` + date range | `aggregateParentReportPayload` | **Per student**, no row limit (unlike dashboard batch) |
| `learning_sessions` + `answers` `.in(student_id)` paginated 1000 | `buildLightweightStudentActivityMap` | Better shape; still O(total rows) |
| `teacher_class_students` paginated | Dashboard, browse-status, school lists | Multiple passes |
| `classroom_activities` / status rollups | Class report, physical report | Per-class or per-student loaders |
| `teacher_access_audit` read before write | Class/student report views | Extra round-trip (once per day per entity) |

---

## Recommendations (prioritized — report only)

### P0 — must fix before continuing (severe blockers)

| Item | Rationale |
| ---- | --------- |
| **Physical Report Hub open on large schools** | `buildSchoolPhysicalClassReportPayload` combines N× full aggregates, S subject guidance passes, S classroom rollups, and N+1 activity counts — aligns with “manual use feels slow” after V2 parity. **Block opening modal without lazy load or progressive API** in production until IO is bounded. |
| **Class report N× unbounded student fetch** | With ~20+ active students and thousands of answers each (documented in parity audit), class report is structurally **tens of seconds**. This is a product-scale blocker for daily teacher use. |

*No P0 client-only cosmetic fixes will suffice.*

### P1 — high impact, safe optimization

1. **Batch or share student analytics for class/physical reports** — one query pass per class roster, or memoize `aggregateParentReportPayload` per `studentId` for request lifetime.  
2. **Honor `subject_focus` at fetch time** — reduce sessions/answers loaded when class is single-subject.  
3. **Lazy-load school physical report** — modal opens shell first; load summary then subjects on tab expand.  
4. **Deduplicate school activity maps** — serve `learningStatusBadge` from browse-status keyed by `studentId` or single combined `students?` endpoint.  
5. **Call `browse-status` once per school session** — shared provider + default `NEXT_PUBLIC_SCHOOL_PORTAL_LIST_CACHE=1` in staging to validate.  
6. **Lazy-load teacher student below-fold panels** — defer worksheets, guardian, messages, activities until section visible.  
7. **Teacher report short-TTL server cache** — keyed by `(teacherId, classId|studentId, dateRange)` with invalidation on new activity (optional Redis later).  
8. **Replace physical report per-activity count loop** — one aggregated query for `submittedCount`.  
9. **Apply permitted-subjects before aggregate** for school-linked teachers on student report.  

### P2 — later optimization

- Materialized daily rollups / summary tables per student-class-date  
- Denormalized `student_activity_summary_30d` maintained by job  
- Edge CDN not applicable to authenticated JSON; focus on DB rollups  
- Broader guidance engine caching across surfaces  

---

## Files likely touched in an optimization patch (for approval later)

| Area | Files |
| ---- | ----- |
| Class report batching | `lib/teacher-server/teacher-class-report.server.js`, new or `lib/parent-server/report-data-aggregate.server.js` |
| Physical report | `lib/school-server/school-physical-class-report.server.js`, `pages/school/classes/index.js` |
| Dashboard activity | `lib/teacher-server/teacher-dashboard-activity.server.js` |
| School browse | `lib/school-server/school-browse-status.server.js`, `lib/school-server/school-students.server.js`, `pages/api/school/classes/browse-status.js` |
| Student page waterfall | `pages/teacher/student/[studentId].js`, panel components under `components/teacher-portal/` |
| Caching flags | `lib/school-portal/school-portal-cache-flags.js`, `lib/teacher-portal/use-teacher-portal-session.js` |
| APIs timing | `pages/api/teacher/*.js`, `lib/teacher-server/api-timing.server.js` |

**Explicitly out of scope for optimization (per boundaries):** parent/guardian report UX copy, worksheet PDF pipeline, simulation scripts, SQL migrations in the investigation phase.

---

## Suggested measurement follow-up (no code in this audit)

1. Authenticated `curl` to `/api/teacher/dashboard` and class `report-data` — read `Server-Timing: auth;dur=…, build;dur=…`.  
2. Browser Network tab: confirm student page **7+** requests and payload sizes.  
3. Compare class report `build` ms vs roster size and cohort answer counts from audit metadata.  
4. Enable `NEXT_PUBLIC_SCHOOL_PORTAL_LIST_CACHE=1` in staging and re-test classes ↔ students navigation.

---

## Audit confirmations

| Requirement | Status |
| ----------- | ------ |
| Report path | `docs/qa/TEACHER_SCHOOL_REPORT_PERFORMANCE_AUDIT.md` |
| Code changes | **None** |
| SQL executed | **None** |
| Simulation files touched | **None** |
| Parent/guardian/worksheet code touched | **None** |
| Git commit / push / stage | **None** |
| `git status --short` | *(empty — clean working tree at audit time)* |

---

## Routes / endpoints inspected

**Pages:** `/teacher/dashboard`, `/teacher/class/[classId]`, `/teacher/student/[studentId]`, `/teacher/class/[classId]/activities`, `/school/classes`, `/school/students`  

**APIs:** `GET /api/teacher/dashboard`, `GET /api/teacher/classes/[classId]/report-data`, `GET /api/teacher/students/[studentId]/report-data`, `GET /api/teacher/activities`, `GET /api/school/classes`, `GET /api/school/classes/browse-status`, `GET /api/school/classes/physical-report`, `GET /api/school/classes/[classId]/report-data`, `GET /api/school/students/browse-summary`, `GET /api/school/students`, `GET /api/school/students/[studentId]/report-data`  

**Server builders traced:** `buildTeacherDashboardPayload`, `buildLightweightStudentActivityMap`, `buildTeacherClassReportPayload`, `buildTeacherStudentReportPayload`, `buildClassTeacherGuidanceV2`, `buildStudentTeacherGuidanceV2`, `buildSchoolPhysicalClassReportPayload`, `buildSchoolBrowseStatusMaps`, `listSchoolStudentsInPhysicalClass`, `parsePhysicalClassReportViewModel` (client VM), browse badge helpers.
