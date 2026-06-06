# Diagnostic Engine — Current-State Audit

**File:** `docs/diagnostics/DIAGNOSTIC_ENGINE_CURRENT_STATE_AUDIT.md`  
**Date:** 2026-06-06  
**Status:** Audit only — no code, schema, UI, or Hebrew product copy changes  
**Context:** Phases 4–10 (Diagnostic Truth Fix) are **closed**. This audit maps the post-Phase-10 baseline for the Quality Master Plan.

---

## Product Principle — Context Isolation (Mandatory)

**Context isolation is mandatory.** Evidence may only be consumed inside the context that owns it, unless a separate future sharing feature is explicitly designed and approved.

| Context | Owns | Does not consume |
|---------|------|------------------|
| **Parent / guardian** | Free practice, parent-assigned activities, book reading | School classroom rollups, private-teacher-owned activity rollups, other private-teacher-only sources |
| **Private teacher** | Linked-student sessions, individual activities, **private-teacher-owned individual/group activity rollups** (not school classrooms) | Parent-assigned attempts, school-manager views, school classroom data, other teachers' private data |
| **School** | School-scoped class/student reports, permitted subjects | Parent home context, unrelated private-teacher portals |

Parent, private-teacher, and school are **fully separate diagnostic worlds**. Different accounts and contexts must not be merged, compared, hinted, synchronized, or treated as inconsistent when source policies differ.

---

## Explicit No-Change Declaration

> No application code, migrations, UI, Hebrew copy, report behavior, or authorization logic was changed to produce this document.

---

## 1. Executive Summary

The system today has a **working but split** diagnostic architecture:

| Layer | Role | Maturity |
|-------|------|----------|
| **Write-time classification** | `activity-classification.js` stamps every answer with `isDiagnosticEligible` + `evidenceCategory` | Strong SSOT (Phase 4) |
| **Server aggregation** | `report-data-aggregate.server.js` buckets evidence into diagnostic / competitive / learning; builds API payloads | Strong for counts; weak for per-diagnosis traceability |
| **Client diagnostic engine v2** | `runDiagnosticEngineV2` runs taxonomy + recurrence + confidence + intervention on mistake maps | Rich for parent UI; depends on localStorage seed from API |
| **Teacher guidance v2** | Reuses DE2 sub-utilities on sanitized server payload | Partial — lighter than full DE2 |
| **Parent-facing authority** | Server `parentFacing` + thin-data suppression | Partial — threshold on `totalAnswers`, not diagnostic-only |

**Primary gap for “evidence-based diagnostic system”:** evidence is **classified and counted** but not yet stored or surfaced as a **unified, traceable Evidence Contract** per diagnosis within each context. Confidence and sufficiency rules exist in multiple places with **inconsistent thresholds**. Several report surfaces can still imply diagnosis with **weak evidence** relative to their own source policy.

---

## 2. Evidence Sources Map

### 2.1 Source inventory

| Source | Origin / tables | Write path | Classification at write |
|--------|-----------------|------------|-------------------------|
| **Free-practice learning sessions** | `learning_sessions`, `answers` | `pages/api/learning/answer.js`, masters → session start/finish | `classifyActivityEvidence(mode, "free_practice", contextFlags)` |
| **Parent-assigned activities** | `parent_assigned_activities`, `parent_activity_attempts` | `lib/parent-server/parent-activity.server.js` | `classifyActivityEvidence(mode, "assigned_parent", …)` stored in `question_snapshot` |
| **Teacher individual activities** | `student_activities`, attempts | `lib/teacher-server/student-activity-play.server.js` | `assigned_individual` source |
| **Classroom / class activities** | `classroom_activities`, `classroom_activity_student_status`, attempts | `lib/teacher-server/teacher-activities.server.js` | `assigned_class` source; **discussion excluded from class rollups at fetch** |
| **Book reading** | `book_page_visits`, `book_reading_sessions` | `pages/api/learning/book-events.js` | `learning_book` — never diagnostic |
| **Post-book practice** | `answers` with `contextFlags.contextAfterBookReading` | Same as free practice | Diagnostic eligibility unchanged; flagged for behavior signals only |
| **Step-by-step learning** | `contextFlags.afterStepByStep` on answer | Masters set `stepByStepViewedRef` | **Forced** `learning_guided`, `isDiagnosticEligible: false` |
| **Discussion activities** | Classroom mode `discussion` | Teacher activity create/play | `learning_context`, `isDiagnosticEligible: false` |
| **Competitive modes** | challenge / speed / marathon | Same write paths | `diagnostic_competitive` — eligible but isolated bucket |
| **Diagnostic probes** | `answer_payload.clientMeta.diagnosticProbe` | Client probe flows | Metadata only → `probeEvidence`; not accuracy bucket |
| **Legacy localStorage tracking** | Browser `mleo_*` keys | Gameplay masters | Used only when parent report built via local path (no `studentId` remote) |

**SSOT for classification:** `lib/learning/activity-classification.js`  
**SSOT for read-time bucketing:** `lib/parent-server/report-data-aggregate.server.js` → `classifyAnswerForAggregation`, `applyClassificationToSlice`

### 2.2 Diagnostic vs intentionally non-diagnostic

| Mode / context | `isDiagnosticEligible` | `evidenceCategory` | Enters `diagnosticAnswers`? | Notes |
|----------------|------------------------|--------------------|-----------------------------|-------|
| practice, graded, drill, review, normal | true | `diagnostic_independent` | Yes | Primary cold-probe evidence |
| quiz, homework, worksheet | true | `diagnostic_independent` | Yes | Assigned independent |
| practice_mistakes, live_lesson | true | `diagnostic_guided` | Yes | Eligible with context flag |
| challenge, speed, marathon | true | `diagnostic_competitive` | No (→ `competitiveAnswers`) | Signals via `competitiveContext` |
| learning, guided_practice | false | `learning_guided` | No (→ `learningAnswers`) | Not mastery-eligible |
| mistakes (review mode) | false | `learning_review` | No | Reviewing prior wrongs |
| discussion | false | `learning_context` | No | No accuracy diagnostic meaning |
| book / learning_book | false | `learning_book` | No | Time in `learningActivity` only |
| afterStepByStep=true | false | `learning_guided` (forced) | No | Overrides all modes |
| unclassified / unknown mode | false | `unclassified` | No | Excluded from claims |

**Discussion — explicit policy:**
- Classification: `MODE_CLASSIFICATION_MAP.discussion` → non-diagnostic.
- Classroom rollup fetch: `fetchScopedClassroomActivitiesForClassIds` uses `.neq("mode", "discussion")` — discussion never enters class aggregate reports.
- Teacher activity server handles discussion as a distinct UX mode (optional answers, recipient scope rules).

---

## 3. Report Consumer Matrix

Which evidence sources enter each report surface (post Phase 10). **Differences across columns are intentional** — each column is a separate diagnostic world with its own source policy.

| Evidence source | Parent API + UI (remote) | Guardian API | Teacher student API | Teacher class API | School student/class API | Client DE2 (parent UI) |
|-----------------|--------------------------|--------------|---------------------|-------------------|--------------------------|-------------------------|
| `learning_sessions` + `answers` | Yes | Yes | Yes | Yes (per-student roster) | Yes | Yes (via adapter seed) |
| Parent-assigned attempts | **Yes** (`includeParentActivities: true`) | Yes | **No** (default) | No | No | If in API body |
| Private-teacher / school activity rollups | **No** | No | **Yes** (private-teacher-owned individual/group rollups — not school classrooms) | **Yes** (same private-teacher scope) | **Yes** (school classroom rollups only) | No |
| Teacher individual activities | Via answers table if synced | Same | Yes | Via roster | Yes | If in answers |
| Book reading | Yes (`learningActivity`) | Yes | Yes | Partial | Yes | No |
| Post-book practice flags | Yes (behavior + positiveEvidence) | Yes | Yes | Yes | Yes | Indirect |
| Competitive bucket | Yes (`competitiveContext`) | Yes | Yes | Yes | Yes | Mistake maps may include |
| Probe metadata | Yes (`probeEvidence`) | Yes | Yes | Limited | Yes | DE2 probe plans |
| localStorage gameplay cache | **No** (remote path) | No | No | No | No | **Yes** (local-only fallback) |

**Intentional context / source isolation (by design):**
- **Parent context** includes: free practice, parent-assigned attempts, book reading. It **excludes** classroom/school rollups — correct by design.
- **Private-teacher context** includes: sessions, answers, individual activities, and **private-teacher-owned individual/group activity rollups** (not school classrooms). It **excludes** parent-assigned attempts (default API) and school classroom data — correct by design.
- **School context** includes: school-scoped student/class payloads with permitted-subject filtering. It **excludes** parent-home and unrelated private-teacher sources — correct by design.

A parent not seeing classroom/school activity is **expected**, not a defect. A private teacher not seeing parent/school-only sources is **expected**. A school report not seeing private-teacher/parent-only sources is **expected**. Quality work must **not** treat these differences as bugs to fix via merge, parity, or cross-context hints.

**API sanitization (Phase 10 verified):**
- All student-level APIs apply `stripInternalReportPayloadFields` — raw `accuracy` removed; `diagnosticAccuracy` is human-facing.
- Teacher class API exposes cohort `accuracy` as activity rollup; `weaknessTopics` use `diagnosticWrong` / `diagnosticAnswers`.

---

## 4. Subject / Topic / Subtopic / Question Metadata

### 4.1 Where metadata is created

| Field | Created at | Stored in | Notes |
|-------|------------|-----------|-------|
| `subject` | Session / activity / answer write | `learning_sessions.subject`, `answer_payload.subject`, activity rows | Normalized via `REPORT_AGG_SUBJECTS` allowlist |
| `topic` | Same | `learning_sessions.topic`, `answer_payload.topic` | Topic keys vary by subject engine |
| `grade` / `grade_level` | Student profile | `students.grade_level` | Used in report student row + grade-aware templates |
| `gameMode` / `mode` | Master or activity definition | `answer_payload.gameMode`, session `metadata.mode`, activity `mode` | Drives classification |
| `questionEngine` | `buildQuestionEngineMetadataFromQuestion` | `answer_payload.questionEngine` or `question_snapshot.questionEngine` | Phase 8 MCQ contract (`phase-8-mcq-contract-v1`) |
| `skill_key` / `skillId` | Question params, assigned snapshot | `parent_activity_attempts.skill_key`, engine metadata | Mapped in `question-engine-metadata.js` |
| `difficulty` / `difficulty_level` | Activity definition | `parent_assigned_activities.difficulty_level` | Parent activities only |
| `taxonomyId` | DE2 bridge from topic bucket | Computed at diagnosis time, not persisted per answer | `topic-taxonomy-bridge.js`, `taxonomy-registry.js` |
| `diagnosticProbe` | Client probe UI | `answer_payload.clientMeta` | → `probeEvidence` in aggregator |
| `contextFlags` | Write path | `answer_payload.contextFlags` | `afterStepByStep`, `contextAfterBookReading`, `hasHints` |
| `question_snapshot` | Assigned attempt submit | `parent_activity_attempts.question_snapshot` | Full question state + classification |

**Gap:** No persisted `subSkill`, `difficultyDepth`, `questionQuality`, or unified `diagnosticWeight` at answer row level. DE2 infers patterns from mistake events and enriched row maps, not from a normalized evidence contract.

### 4.2 Where metadata is consumed

| Consumer | Reads |
|----------|-------|
| Server aggregator | `answer_payload`, `question_snapshot`, session fields → topic slices, `recentMistakes`, `questionEngine` extract |
| `positive-evidence.js` | Diagnostic counts + behavior flags + book + competitive passthrough |
| `competitive-context.js` | Competitive bucket + mode |
| `teacher-guidance-v2.server.js` | Aggregated subjects/topics, `recentMistakes`, taxonomy bridge |
| `runDiagnosticEngineV2` | localStorage mistake maps + `rawMistakesBySubject` seeded from `recentMistakes` |
| `parent-report-parent-facing.server.js` | `diagnosticAccuracy`, topic/subject slices, `dailyActivity` |
| Grade-aware templates | `taxonomyId` + `grade_level` → `grade-aware-recommendation-templates.js` |

---

## 5. Date Range Application

| Surface | Resolver | Default | Filter fields | Max window |
|---------|----------|---------|---------------|------------|
| Parent API | Inline in `report-data.js` + `buildDefaultRange()` | 30 days UTC | Sessions: `started_at` (fallback `created_at`); Answers: `answered_at` | Implicit via query validation |
| Parent UI presets | `lib/reporting/parent-report-date-range.js` | week/month/day/schoolYear/custom | Maps to API `from`/`to` | `MAX_REPORT_RANGE_DAYS = 366` |
| Teacher / school / guardian APIs | `resolveTeacherReportDateRange` | 30 days or `windowDays` | Same SQL bounds as parent | 1–366 days |
| Client `generateParentReportV2` | `resolveParentReportGenerationArgs` | Mirrors UI period | Filters mistake maps / tracking rows by timestamp | Same presets |
| Classroom rollups | `classroom-activity-class-report.server.js` | Inherited from report request | `closed_at` / `activated_at` / `created_at` on activities | Same window |
| Book reading merge | `aggregateParentReportPayload` | Same window | Visit/session timestamps in range | Gated by feature flag |

**Within-context date-range note:** Inside a single context (e.g. parent API only), different presets (`week` vs `month` vs custom) can yield different counts for the same student — that is a **within-context** consistency concern. Comparing counts **across** parent vs private-teacher vs school portals is **out of scope** — those contexts use different source policies and must not be synchronized.

---

## 6. Data Sufficiency Computation (Current)

Multiple independent sufficiency systems coexist:

| Location | Threshold / rule | Field used | Output |
|----------|------------------|------------|--------|
| `finalizeTopicGradeSlice` (aggregator) | `diagnosticAnswers >= 5` | Per-topic diagnostic count | `diagnosticConfidence: "sufficient" \| "insufficient"` |
| `isServerThinDataReportPayload` | `totalAnswers < 15` or zero activity | **Mixed** `summary.totalAnswers` | Suppresses client `patternDiagnostics` |
| `parent-report-parent-facing.server.js` | Subject min 5, topic min 3 diagnostic answers | `diagnosticAnswers` / `diagnosticAccuracy` | Hebrew insights; warns on thin totals |
| `teacher-recommendations.server.js` | Student signal min 5 answers, topic min 3 | **`diagnosticAnswers` preferred, falls back to `answers`** | `insufficientData` boolean |
| `teacher-guidance-v2.server.js` | Same + DE2 `resolveConfidenceLevel` | Mixed at student level; diagnostic at topic | `insufficientData`, unit severity |
| `positive-evidence.js` | Student 5, subject 8, topic 5 diagnostic | `diagnosticAnswers` | `not_enough_data` signal |
| `confidence-policy.js` (DE2) | `q < 2 && w === 0`, `q < 4 && w < 2`, etc. | Row `questions` / wrong events | `insufficient_data`, `early_signal_only`, … |
| `output-gating.js` (DE2) | Hard deny on `insufficient_data`, weak evidence, hints | Confidence + recurrence | Suppresses parent-facing diagnostic lines |
| School browse / physical class | Various (`totalAnswers < 5`, `< 10`) | Cohort mixed totals | UI status chips |

**Key inconsistency:** Thin-data guard uses **mixed** `totalAnswers` (15) while topic sufficiency uses **diagnostic** counts (5). Teacher student `insufficientData` uses `diagnosticAnswers ?? totalAnswers` — competitive/learning activity can satisfy “sufficient” without independent diagnostic evidence.

---

## 7. Recommendations & Explanations Generation

### 7.1 Server-side (deterministic, no LLM)

| Consumer | File | Input | Output |
|----------|------|-------|--------|
| Parent Hebrew insights | `parent-report-parent-facing.server.js` | Sanitized aggregate payload | `parentFacing.insights`, `homeRecommendations` |
| Parent API enrichment | `enrichPayloadWithParentFacing` | Same | Attached to API JSON before strip |
| Teacher guidance v1 | `teacher-recommendations.server.js` | Sanitized payload | `nextPracticeFocus`, `riskSignals`, `strengthsForTeacher` |
| Teacher guidance v2 | `teacher-guidance-v2.server.js` | Payload + DE2 utilities | `recommendationUnits`, `strengthUnits`, `supportSuggestionsV2` |
| School subject filter rebuild | `school-subjects.server.js` → `filterReportByPermittedSubjects` | Recomputes guidance after scope filter | Scoped teacher block |
| Grade-aware templates | `grade-aware-recommendation-templates.js` | taxonomyId + grade | Hebrew recommendation lines when template exists |

### 7.2 Client-side (parent report UI)

| Stage | File | Role |
|-------|------|------|
| API → local seed | `report-data-adapter.js`, `seed-db-report-local-storage.js` | Converts API body to DE2 input shape |
| Full report build | `parent-report-v2.js` → `generateParentReportV2` | Topic maps, trends, pattern diagnostics |
| Taxonomy diagnosis | `runDiagnosticEngineV2` | Recurrence, confidence, priority, intervention, probes |
| Detailed report | `detailed-parent-report.js` | Extended pattern / contract surfaces |
| Server authority overlay | `parent-facing-report-authority.js` | Server `parentFacing` wins; suppresses client diagnostics on thin data |
| Optional AI adapter | `parent-report-ai-adapter.js` | Deterministic + optional enrichment (not DE2) |

**Dual-path risk:** Client DE2 can emit taxonomy diagnoses from seeded mistakes even when server aggregation has marked topic `diagnosticConfidence: "insufficient"`. Thin-data path clears `patternDiagnostics.subjects` but **not all** DE2 surfaces (e.g. some analysis blocks, detailed contract) may still carry pattern language unless gated.

---

## 8. Current Risks — Weak Evidence Presented as Diagnosis

| Risk ID | Description | Severity | Affected surfaces |
|---------|-------------|----------|-------------------|
| **R1 Dual engine divergence** | Server buckets say insufficient; client DE2 may still label taxonomy patterns from few mistakes | High | Parent report UI (remote + local paths) |
| **R2 Mixed vs diagnostic thresholds** | `totalAnswers` satisfies teacher/parent “enough data” while `diagnosticAnswers` is tiny | Medium | Teacher guidance, thin-data guard |
| **R3 Accidental cross-context merge** | Future code or tests may compare, merge, or hint across parent / private-teacher / school contexts | Medium (guardrail) | Any surface if isolation is violated |
| **R4 Classroom rollup granularity** | Class activities contribute counts only — no per-question mistakes or `questionEngine` in class merge | Medium | Teacher/class/school weakness topics |
| **R5 Competitive conflation in attention** | Class `attentionList` uses mixed summary accuracy, not `diagnosticAccuracy` | Low | Teacher class report |
| **R6 Low bar strength signals** | Teacher strength units at 3 diagnostic answers | Medium | Teacher guidance v2 |
| **R7 Ungated grade-aware fallback** | Raw engine Hebrew may appear when template missing (guards exist but partial) | Medium | Parent report resolvers |
| **R8 Local-only parent path** | `buildLocalParentReports` reads real localStorage without server authority | Medium | Parent report without `studentId` |
| **R9 No diagnosis traceability** | Consumers cannot answer “which N questions support this claim?” | High | All surfaces |
| **R10 Missing telemetry** | No audio/draft/answer-change signals → confidence cannot downgrade aid-assisted answers | Medium | Future quality layer |
| **R11 Date range mismatch (within context)** | Different presets within the same context API for same student/range params | Medium | Single-context reports only |
| **R12 Cohort `accuracy` on class API** | Mixed rollup exposed alongside diagnostic weakness counts | Low | Teacher class API |

---

## 9. Phase 4–10 Improvements Already Landed

These reduce but do not eliminate the risks above:

- **Phase 4:** Diagnostic / learning / competitive bucket separation; `diagnosticAccuracy` sole human-facing accuracy in APIs.
- **Phase 5:** Book reading excluded from diagnostic buckets; `learningActivity` isolated.
- **Phase 6:** `competitiveContext`; competitive wrongs excluded from `recentMistakes` / weakness.
- **Phase 7:** `positiveEvidence` with explicit `not_enough_data` signals.
- **Phase 8:** `questionEngine` on mistakes; MCQ metadata contract.
- **Phase 9:** Server monthly truth; parent report isolated storage shim.
- **Phase 10:** Consumer verification tests; legacy authority demoted.

---

## 10. Key File Index

| Area | Path |
|------|------|
| Classification SSOT | `lib/learning/activity-classification.js` |
| Aggregation SSOT | `lib/parent-server/report-data-aggregate.server.js` |
| Classroom merge | `lib/teacher-server/classroom-activity-class-report.server.js` |
| Parent activities | `lib/parent-server/parent-activity.server.js` |
| Positive evidence | `lib/learning/positive-evidence.js` |
| Competitive context | `lib/learning/competitive-context.js` |
| DE2 core | `utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js` |
| Confidence / gating | `utils/diagnostic-engine-v2/confidence-policy.js`, `output-gating.js`, `recurrence.js` |
| Teacher guidance | `lib/teacher-server/teacher-guidance-v2.server.js`, `teacher-recommendations.server.js` |
| Parent facing | `lib/parent-server/parent-report-parent-facing.server.js`, `parent-facing-report-authority.js` |
| Question metadata | `lib/learning/question-engine-metadata.js` |
| Date range | `lib/reporting/report-date-range.js`, `parent-report-date-range.js` |
| Verification tests | `tests/reports/diagnostic-truth-consumer-verification.test.mjs`, `tests/learning/phase4–phase10` |

---

## 11. Audit Conclusion

The engine is **correct at classification and counting** but **not yet a unified evidence-based diagnostic system**. The next evolution requires:

1. A single **Diagnostic Evidence Contract** persisted or derivable per answer.
2. A shared **Evidence Quality Layer** consumed by each context's report builders (parent, private-teacher, school — separately).
3. **Traceability** from every human-facing diagnosis to supporting evidence IDs **within that context's source policy**.
4. **Aligned sufficiency/confidence** rules with explicit `no_data` / `preliminary_signal` / `supported_diagnosis` states.

See `DIAGNOSTIC_ENGINE_QUALITY_MASTER_PLAN.md` for the phased upgrade plan.
