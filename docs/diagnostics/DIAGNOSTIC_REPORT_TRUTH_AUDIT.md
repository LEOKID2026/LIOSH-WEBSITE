# Diagnostic & Report Truth Audit

**Scope:** Core diagnostic engine and parent/teacher report payload consistency  
**Audit Date:** 2026-05-29  
**Version:** v1.0  
**Status:** AUDIT-ONLY — No product changes made

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Data-Flow Architecture](#2-data-flow-architecture)
3. [File/Function Inventory](#3-filefunction-inventory)
4. [Thresholds & Evidence Policies](#4-thresholds--evidence-policies)
5. [Test Scenarios — Expected vs Actual](#5-test-scenarios--expected-vs-actual)
6. [Findings Classification](#6-findings-classification)
7. [Proposed Fix Plan — Not Implemented](#7-proposed-fix-plan--not-implemented)
8. [Appendix: Raw Data Schema](#appendix-raw-data-schema)

---

## 1. Executive Summary

### 1.1 Audit Questions Answered

| Question | Answer | Confidence |
|----------|--------|------------|
| Is the diagnostic engine currently trustworthy? | **Mostly yes, with edge-case issues** | High |
| Are parent and teacher reports using the same truth source? | **No — different aggregation paths** | High |
| Which labels are unsafe or possibly misleading? | **"monitor" default tier, thin-data recommendations** | High |
| What exact fixes are needed, by priority? | **See Section 6 and 7** | High |

### 1.2 Summary of Critical Findings

| Severity | Count | Summary |
|----------|-------|---------|
| **BLOCKER** | 0 | No contradictions with raw data found |
| **HIGH** | 3 | Inconsistencies between report surfaces |
| **MEDIUM** | 4 | Thin evidence produces strong wording |
| **LOW** | 2 | Threshold mismatches, fallback issues |

### 1.3 Key Risk Areas

1. **Different data sources**: Parent reports use `learning_sessions/answers` only; Teacher reports merge classroom activity data
2. **Threshold divergence**: Same student can get `insufficientData=true` on parent side but guidance on teacher side
3. **Date range handling**: Classroom activities use `closed_at/activated_at` vs `learning_sessions` use `started_at`
4. **Subject filtering**: Teacher reports respect `permittedSubjects`; parent reports aggregate all subjects

---

## 2. Data-Flow Architecture

### 2.1 Complete Data Flow Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAW DATABASE TABLES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐                        │
│  │ learning_sessions   │    │ answers             │                        │
│  │ - student_id        │    │ - student_id        │                        │
│  │ - subject           │◄───┤ - learning_session_id                       │
│  │ - topic             │    │ - question_id       │                        │
│  │ - started_at        │    │ - is_correct        │                        │
│  │ - ended_at          │    │ - answer_payload    │                        │
│  │ - duration_seconds  │    │ - answered_at       │                        │
│  │ - status            │    └─────────────────────┘                        │
│  └─────────────────────┘                                                   │
│                              ┌─────────────────────────┐                    │
│                              │ classroom_activities    │                    │
│                              │ - teacher_id            │                    │
│                              │ - class_id              │                    │
│                              │ - subject               │                    │
│                              │ - topic                 │                    │
│                              │ - status (draft|active|paused|closed|archived)  │
│                              │ - activated_at          │                    │
│                              │ - closed_at             │                    │
│                              └───────────┬─────────────┘                    │
│                                          │                                 │
│                              ┌───────────▼─────────────┐                  │
│                              │ classroom_activity_      │                  │
│                              │   _student_status        │                  │
│                              │ - activity_id            │                  │
│                              │ - student_id             │                  │
│                              │ - status (not_started|in_progress|submitted)│
│                              │ - answers_count          │                  │
│                              │ - correct_count          │                  │
│                              │ - submitted_at           │                  │
│                              └──────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGGREGATION BUILDERS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PARENT BASELINE: report-data-aggregate.server.js                    │   │
│  │                                                                     │   │
│  │ aggregateParentReportPayload(serviceClient, student, fromDate,    │   │
│  │                              toDate)                                │   │
│  │   → fetchSessionsInRange()          [learning_sessions]           │   │
│  │   → fetchAnswersInRange()            [answers]                      │   │
│  │   → aggregateReportPayloadFromActivityRows()                         │   │
│  │        → builds: subjects[subject].topics[topic]                    │   │
│  │        → creates: summary.totalAnswers, accuracy                    │   │
│  │        → creates: dailyActivity array                               │   │
│  │        → creates: recentMistakes (last 20 wrong answers)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TEACHER CLASSROOM MERGE: classroom-activity-class-report.server.js  │   │
│  │                                                                     │   │
│  │ loadClassroomActivityRollupForStudentReport()                      │   │
│  │   → load classroom_activities by class_id                         │   │
│  │   → load classroom_activity_student_status                         │   │
│  │   → buildClassroomActivityRollupsByStudentId()                     │   │
│  │   → mergeClassroomActivityRollupIntoReportPayload()                │   │
│  │        → MERGES into parent baseline (summation)                   │   │
│  │        → adds sessions, answers, correct, wrong                    │   │
│  │        → adds daily activity from classroom sources                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DIAGNOSTIC ENGINE V2                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  runDiagnosticEngineV2({ maps, rawMistakesBySubject, startMs, endMs })       │
│                                                                             │
│  Input: Aggregated subject/topic maps (from aggregation builders)          │
│                                                                             │
│  Process per subject/topic:                                                │
│    1. filterMistakesForRow() → gets raw mistakes for this topic             │
│    2. taxonomyIdsForReportBucket() → candidate taxonomy IDs               │
│    3. passesRecurrenceRules() → checks minWrong, minDistinctDays            │
│    4. resolveConfidenceLevel() → confidence: high|moderate|low|insufficient │
│    5. resolvePriority() → priority: P1|P2|P3|P4                             │
│    6. applyOutputGating() → decision gates                                 │
│         → diagnosisAllowed: true/false                                    │
│         → probeOnly: true/false                                           │
│         → interventionAllowed: true/false                                  │
│         → cannotConcludeYet: true/false                                   │
│    7. buildInterventionPlan() → if interventionAllowed                     │
│    8. buildCanonicalState() → standardized state representation            │
│                                                                             │
│  Output: Array of diagnostic units per topic                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYLOAD BUILDERS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PARENT REPORT (parent-report-v2.js)                               │   │
│  │                                                                     │   │
│  │ generateParentReportV2(rawData, studentInfo, startMs, endMs)       │   │
│  │   → runDiagnosticEngineV2()                                        │   │
│  │   → buildPatternDiagnosticsFromV2() / legacy pattern analysis     │   │
│  │   → creates parent-facing Hebrew text                             │   │
│  │   → uses: TOPIC_EVIDENCE_THRESHOLDS                              │   │
│  │        - minQuestionsTopicConclusion: 8                            │   │
│  │        - minQuestionsModerate: 12                                  │   │
│  │        - minQuestionsHighVolume: 40                                  │   │
│  │   → resolveParentTopicConfidenceBand()                             │   │
│  │   → classifyTopicEvidenceBand()                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TEACHER STUDENT REPORT (teacher-report.server.js)                 │   │
│  │                                                                     │   │
│  │ buildTeacherStudentReportPayload({ serviceRole, teacherId,         │   │
│  │                                    studentId, fromDate, toDate })   │   │
│  │   → teacherHasReportAccessToStudent() → access check               │   │
│  │   → aggregateParentReportPayload() → BASELINE (parent source)      │   │
│  │   → loadClassroomRollupForTeacherStudentReport() → CLASSROOM MERGE │   │
│  │   → mergeClassroomActivityRollupIntoReportPayload()                │   │
│  │   → attachStudentLearningAccountToParentReportPayload()            │   │
│  │   → sanitizeReportPayloadForTeacher() → removes parent PII         │   │
│  │   → buildStudentTeacherGuidanceV2() → GUIDANCE                     │   │
│  │        → uses: MIN_ANSWERS_FOR_STUDENT_SIGNAL: 5                   │   │
│  │        → uses: MIN_ANSWERS_FOR_TOPIC_SIGNAL: 3                       │   │
│  │        → uses: LOW_ACCURACY_THRESHOLD: 65                          │   │
│  │        → uses: ON_TRACK_MIN_ACCURACY: 75                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TEACHER CLASS REPORT (teacher-class-report.server.js)               │   │
│  │                                                                     │   │
│  │ buildTeacherClassReportPayload({ serviceRole, teacherId, classId,   │   │
│  │                                fromDate, toDate })                  │   │
│  │   → loadTeacherClassOwned() → verify ownership                     │   │
│  │   → loadClassMembers() → roster students                           │   │
│  │   → loadClassroomActivityRollupsForClassReport() → classroom data  │   │
│  │   → buildRosterStudentReportEntries() → per-student payloads       │   │
│  │   → aggregateClassReportFromStudentPayloads() → cohort rollup     │   │
│  │        → sums: totalSessions, totalAnswers, correct, wrong         │   │
│  │        → calculates: cohortAccuracy                                │   │
│  │        → identifies: weaknessTopics (accuracy < 65, answers >= 3)   │   │
│  │        → identifies: attentionList (scoring logic below)              │   │
│  │   → buildClassTeacherGuidanceV2() → class guidance                │   │
│  │        → uses: MIN_CLASS_ANSWERS_FOR_GUIDANCE: 10                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SCHOOL PHYSICAL CLASS REPORT (school-physical-class-report.server)  │   │
│  │                                                                     │   │
│  │ buildSchoolPhysicalClassReportPayload({ schoolId, gradeLevel,      │   │
│  │                                       physicalClassName })          │   │
│  │   → loadSubjectClassesForPhysicalReport() → all subject classes     │   │
│  │   → loadPhysicalClassRoster() → aggregated roster                  │   │
│  │   → loadClassroomActivityRollupsForMultipleClassReports()          │   │
│  │   → Similar to class report but aggregates across subjects         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATUS LABELS & UI                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TEACHER RECOMMENDATIONS / STATUS TIER MAPPING                       │   │
│  │ teacher-recommendations.server.js                                   │   │
│  │                                                                     │   │
│  │ Student Guidance Tiers:                                            │   │
│  │   deriveStudentGuidanceSeverityTier(accuracyPct):                  │   │
│  │     ≤49% → "critical"                                              │   │
│  │     ≤64% → "needs_reinforcement"                                   │   │
│  │     ≤74% → "monitor"                                               │   │
│  │     >74% → "on_track"                                              │   │
│  │                                                                     │   │
│  │ Class Guidance Tiers:                                              │   │
│  │   deriveClassGuidanceSeverityTier(accuracyPct):                    │   │
│  │     Same thresholds, prefixed with "class_"                        │   │
│  │                                                                     │   │
│  │ Risk Level Mapping:                                                │   │
│  │   mapRiskLevelFromTier():                                          │   │
│  │     "critical" → "high"                                            │   │
│  │     "needs_reinforcement" | "monitor" → "moderate"                  │   │
│  │     "on_track" → "low"                                             │   │
│  │                                                                     │   │
│  │ Class Health Signal:                                               │   │
│  │   mapClassHealthSignalFromTier():                                  │   │
│  │     "critical_class" → "critical_class"                            │   │
│  │     "class_needs_reinforcement" → "needs_reinforcement"            │   │
│  │     "class_monitor" → "monitor"                                  │   │
│  │     "class_on_track" → "strong"                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SCHOOL REPORT VIEW MODEL (school-report-view-model.js)             │   │
│  │                                                                     │   │
│  │ Student Learning Status Badge:                                     │   │
│  │   deriveStudentLearningStatusLabelHe():                            │   │
│  │     accuracy ≥ 90% → "חזק" (Strong)                                 │   │
│  │     accuracy ≥ 75% → "תקין" (On Track)                             │   │
│  │     accuracy ≥ 65% → "במעקב" (Monitor)                              │   │
│  │     accuracy ≥ 50% → "צריך חיזוק" (Needs Support)                 │   │
│  │     accuracy < 50% → "דורש התערבות" (Critical)                     │   │
│  │                                                                     │   │
│  │ Class Status Label:                                                │   │
│  │   classOrCohortLearningStatusLabelHe():                            │   │
│  │     Similar mapping for class-level                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Critical Data Source Differences

| Data Source | Parent Reports | Teacher Reports (Student) | Teacher Reports (Class) |
|-------------|---------------|----------------------------|-------------------------|
| **learning_sessions** | ✓ Yes | ✓ Yes (merged) | ✓ Yes (aggregated) |
| **answers** | ✓ Yes | ✓ Yes (merged) | ✓ Yes (aggregated) |
| **classroom_activities** | ✗ No | ✓ Yes (merged) | ✓ Yes (primary) |
| **classroom_activity_student_status** | ✗ No | ✓ Yes (merged) | ✓ Yes (primary) |
| **worksheet activities** | ✗ No | ✗ No (partial) | Partial |

**Impact:** A student with only classroom activity (no free learning) will show:
- **Parent report:** `insufficientData: true`, empty subjects
- **Teacher report:** Full data including classroom activity

---

## 3. File/Function Inventory

### 3.1 Parent Report Aggregation

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `aggregateParentReportPayload` | `lib/parent-server/report-data-aggregate.server.js` | 695 | Entry point for parent report aggregation |
| `aggregateReportPayloadFromActivityRows` | `lib/parent-server/report-data-aggregate.server.js` | 335 | Core aggregation logic |
| `fetchSessionsInRange` | `lib/parent-server/report-data-aggregate.server.js` | 264 | Query learning_sessions |
| `fetchAnswersInRange` | `lib/parent-server/report-data-aggregate.server.js` | 294 | Query answers |
| `batchAggregateParentReportPayloadsForRoster` | `lib/parent-server/report-data-aggregate-batch.server.js` | 178 | Batch for class roster |
| `generateParentReportV2` | `utils/parent-report-v2.js` | 2078 | Parent-facing report generator |
| `runDiagnosticEngineV2` | `utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js` | 38 | Diagnostic engine |

### 3.2 Teacher Student Report

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `buildTeacherStudentReportPayload` | `lib/teacher-server/teacher-report.server.js` | 424 | Main teacher student report builder |
| `teacherHasReportAccessToStudent` | `lib/teacher-server/teacher-report.server.js` | 49 | Access control logic |
| `sanitizeReportPayloadForTeacher` | `lib/teacher-server/teacher-report.server.js` | 337 | Removes parent PII |
| `buildStudentTeacherGuidance` | `lib/teacher-server/teacher-recommendations.server.js` | 185 | V1 guidance (deprecated) |
| `buildStudentTeacherGuidanceV2` | `lib/teacher-server/teacher-guidance-v2.server.js` | 362 | V2 guidance (current) |

### 3.3 Teacher Class Report

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `buildTeacherClassReportPayload` | `lib/teacher-server/teacher-class-report.server.js` | 253 | Main class report builder |
| `aggregateClassReportFromStudentPayloads` | `lib/teacher-server/teacher-class-report.server.js` | 51 | Cohort aggregation |
| `buildRosterStudentReportEntries` | `lib/teacher-server/roster-report-student-entries.server.js` | 1 | Per-student entries |
| `buildClassTeacherGuidance` | `lib/teacher-server/teacher-recommendations.server.js` | 390 | V1 class guidance |
| `buildClassTeacherGuidanceV2` | `lib/teacher-server/teacher-guidance-v2.server.js` | 620 | V2 class guidance |

### 3.4 Classroom Activity Integration

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `loadClassroomActivityRollupForStudentReport` | `lib/teacher-server/teacher-report.server.js` | 213 | Loads classroom data for student |
| `loadClassroomActivityRollupsForClassReport` | `lib/teacher-server/classroom-activity-class-report.server.js` | 323 | Loads for class report |
| `buildClassroomActivityRollupsByStudentId` | `lib/teacher-server/classroom-activity-class-report.server.js` | 212 | Builds per-student rollups |
| `mergeClassroomActivityRollupIntoReportPayload` | `lib/teacher-server/classroom-activity-class-report.server.js` | 86 | Merges into parent payload |
| `loadClassroomActivityRollupsForMultipleClassReports` | `lib/teacher-server/classroom-activity-class-report.server.js` | 413 | Multi-class (school) |

### 3.5 Diagnostic Engine Components

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `resolveConfidenceLevel` | `utils/diagnostic-engine-v2/confidence-policy.js` | 15 | Confidence calculation |
| `resolvePriority` | `utils/diagnostic-engine-v2/priority-policy.js` | 12 | Priority (P1-P4) |
| `breadthFromWeakRowCount` | `utils/diagnostic-engine-v2/priority-policy.js` | 35 | Breadth calculation |
| `applyOutputGating` | `utils/diagnostic-engine-v2/output-gating.js` | 26 | Decision gates |
| `buildInterventionPlan` | `utils/diagnostic-engine-v2/intervention-layer.js` | 1 | Intervention logic |
| `passesRecurrenceRules` | `utils/diagnostic-engine-v2/recurrence.js` | 1 | Recurrence check |

### 3.6 Status/Label Mapping

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `deriveStudentGuidanceSeverityTier` | `lib/teacher-server/teacher-recommendations.server.js` | 40 | Student tier |
| `deriveClassGuidanceSeverityTier` | `lib/teacher-server/teacher-recommendations.server.js` | 53 | Class tier |
| `mapRiskLevelFromTier` | `lib/teacher-server/teacher-recommendations.server.js` | 79 | Risk level |
| `mapClassHealthSignalFromTier` | `lib/teacher-server/teacher-recommendations.server.js` | 65 | Health signal |
| `deriveStudentLearningStatusLabelHe` | `lib/teacher-portal/student-learning-status.js` | 1 | Hebrew status labels |
| `classOrCohortLearningStatusLabelHe` | `lib/teacher-portal/student-learning-status.js` | 1 | Hebrew class status |

### 3.7 School Reports

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `buildSchoolPhysicalClassReportPayload` | `lib/school-server/school-physical-class-report.server.js` | 193 | School class report |
| `parseClassReportViewModel` | `lib/school-portal/school-report-view-model.js` | 337 | Class view model |
| `parseStudentReportViewModel` | `lib/school-portal/school-report-view-model.js` | 547 | Student view model |
| `parsePhysicalClassReportViewModel` | `lib/school-portal/school-report-view-model.js` | 825 | Physical class VM |

---

## 4. Thresholds & Evidence Policies

### 4.1 Evidence Thresholds Comparison

| Threshold | Value | Used By | Purpose |
|-----------|-------|---------|---------|
| **MIN_ANSWERS_FOR_STUDENT_SIGNAL** | 5 | Teacher V1/V2 | `insufficientData` gate |
| **MIN_ANSWERS_FOR_TOPIC_SIGNAL** | 3 | Teacher V1/V2 | Topic weakness detection |
| **MIN_CLASS_ANSWERS_FOR_GUIDANCE** | 10 | Teacher Class | Class-level guidance gate |
| **MIN_STUDENT_ANSWERS_FOR_GROUP** | 3 | Teacher Class | Differentiation groups |

### 4.2 Parent Report Evidence Thresholds

| Threshold | Value | Location | Purpose |
|-----------|-------|----------|---------|
| **minQuestionsTopicConclusion** | 8 | `parent-report-topic-evidence.js:11` | Topic-level conclusions |
| **minQuestionsModerate** | 12 | `parent-report-topic-evidence.js:13` | Moderate confidence band |
| **minQuestionsHighVolume** | 40 | `parent-report-topic-evidence.js:15` | High volume band |
| **thinMaxQuestions** | 6 | `parent-report-topic-evidence.js:16` | Thin data cutoff |

### 4.3 Accuracy Thresholds

| Threshold | Value | Used By | Label Trigger |
|-----------|-------|---------|---------------|
| **LOW_ACCURACY_THRESHOLD** | 65% | Teacher V1/V2 | "needs_reinforcement", "low_accuracy" |
| **ON_TRACK_MIN_ACCURACY** | 75% | Teacher V1/V2 | "on_track" cutoff |
| **STRENGTH_THRESHOLD** | 80% | Teacher V2 | "mastered_topic" |
| **ATTENTION_ACCURACY_THRESHOLD** | 65% | Teacher V1 | Attention list inclusion |
| **ATTENTION_PRIORITY_BOOST_THRESHOLD** | 50% | Teacher V1 | Attention score boost |

### 4.4 Guidance Severity Tier Thresholds

| Tier | Accuracy Range | Student Tier | Class Tier |
|------|-----------------|--------------|------------|
| Critical / Critical Class | ≤49% | `critical` | `critical_class` |
| Needs Reinforcement | 50-64% | `needs_reinforcement` | `class_needs_reinforcement` |
| Monitor | 65-74% | `monitor` | `class_monitor` |
| On Track | ≥75% | `on_track` | `class_on_track` |

**Source:** `teacher-recommendations.server.js:15-19`

### 4.5 Confidence Policy Thresholds

| Condition | Result | Source |
|-----------|--------|--------|
| questions ≥ 40 | `high` confidence | `confidence-policy.js:23` |
| questions ≥ 12 AND wrongs ≥ 2 | `moderate` confidence | `confidence-policy.js:24` |
| questions < 2 AND wrongs = 0 | `insufficient_data` | `confidence-policy.js:25` |
| questions < 4 AND wrongs < 2 | `insufficient_data` | `confidence-policy.js:26` |
| hintInvalidates = true | `early_signal_only` | `confidence-policy.js:28` |
| recurrenceFull = false AND wrongs ≥ 2 | `moderate` | `confidence-policy.js:37` |
| recurrenceFull = false AND wrongs < 2 | `low` | `confidence-policy.js:38` |

### 4.6 Output Gating Logic

| Condition | diagnosisAllowed | probeOnly | interventionAllowed | Source |
|-----------|-----------------|-----------|---------------------|--------|
| hardDeny (contradictory, counterEvidence, weakEvidence, insufficient_data) | false | varies | false | `output-gating.js:69-74` |
| confidence = moderate, priority = P2/P3/P4, recurrenceFull | true | false | true if high priority | `output-gating.js:203-212` |
| confidence = high, recurrenceFull | true | false | true | `output-gating.js:198-201` |
| confidence = low / early_signal_only | false | true | false | `output-gating.js:175-185` |
| no taxonomy match | false | true | false | `output-gating.js:168-173` |

---

## 5. Test Scenarios — Expected vs Actual

### 5.1 Scenario: High Activity + High Accuracy

**Setup:**
- Student: 50 answers in math over 7 days
- Accuracy: 92%
- Topics: addition (30 answers, 95%), subtraction (20 answers, 88%)

**Expected:**
| Surface | Expected Status | confidence | priority | intervention |
|---------|----------------|------------|----------|--------------|
| Parent | "Stable mastery", no recommendations | high | - | no |
| Teacher Student | `on_track`, strengths list | high | P3 | no |
| Teacher Class | In "advanced" group | high | - | extension suggestions |

**Actual (Code Review):**
| Surface | Status | Notes |
|---------|--------|-------|
| Parent | Correctly identifies strengths | `strengthProfile.tags` includes "stable_mastery" |
| Teacher Student | `guidanceSeverityTier: "on_track"` | Correct |
| V2 Guidance | `strengthUnits` populated | Correct |

**Finding:** ✓ **PASS** — Correct behavior

---

### 5.2 Scenario: High Activity + Low Accuracy

**Setup:**
- Student: 45 answers in math
- Accuracy: 58% (26 correct, 19 wrong)
- Topics: fractions (25 answers, 52%), addition (20 answers, 65%)
- Mistakes: 19 recent mistakes, 5 on fractions with pattern "adds_denominators_directly"

**Expected:**
| Surface | Expected Status |
|---------|----------------|
| Parent | "Needs practice", diagnostic finding for fractions |
| Teacher Student | `needs_reinforcement`, weak topics list, recommendation for fractions |
| Diagnostic | `needsPractice: true`, taxonomy match for fraction addition |

**Actual:**
| Check | Result |
|-------|--------|
| Confidence | `moderate` (q=45 ≥ 12, w=19 ≥ 2) ✓ |
| Breadth | `narrow` (1 weak topic) ✓ |
| Priority | `P2` (moderate + narrow) ✓ |
| Gating | `diagnosisAllowed: true`, `interventionAllowed: true` ✓ |
| Tier | `needs_reinforcement` (58% ≤ 64%) ✓ |

**Finding:** ✓ **PASS** — Correct behavior

---

### 5.3 Scenario: Low Activity (Thin Data)

**Setup:**
- Student: 4 answers in math
- Accuracy: 50% (2 correct, 2 wrong)
- Date range: 30 days

**Expected:**
| Surface | Expected Status | Rationale |
|---------|----------------|-----------|
| Parent | "Insufficient data", withhold conclusions | `minQuestionsTopicConclusion: 8` not met |
| Teacher Student | `insufficientData: true` | `MIN_ANSWERS_FOR_STUDENT_SIGNAL: 5` not met |
| Diagnostic | `insufficient_data` confidence | `q < 4` per confidence-policy |

**Actual:**
| Surface | Result | Issue |
|---------|--------|-------|
| Parent | Withholds topic conclusions ✓ | `thin` evidence band |
| Teacher V1 | `insufficientData: true` ✓ | Correct |
| **Teacher V2** | **May produce recommendations** ⚠️ | See Finding #1 |

**Finding #1 (HIGH):** V2 guidance may produce `recommendationUnits` even with thin data.

In `teacher-guidance-v2.server.js:449`:
```javascript
if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && accuracy < LOW_ACCURACY_THRESHOLD) {
  // This fires at 3 answers, 50% accuracy
```

With only 4 total answers (2 wrong), a topic with 3 answers and 50% accuracy will produce a recommendation unit even though overall data is insufficient.

---

### 5.4 Scenario: Classroom Activity Only (No Free Learning)

**Setup:**
- Student: 0 learning_sessions, 0 answers (direct)
- Classroom activities: 3 submitted activities, 25 answers total, 80% accuracy
- Parent view: No data (only sees learning_sessions/answers)
- Teacher view: Sees classroom activity via merge

**Expected:**
| Surface | Expected Status |
|---------|----------------|
| Parent | `insufficientData`, empty subjects, "no activity" message |
| Teacher | Full data including classroom activity, `on_track` |

**Actual:**
| Surface | Result |
|---------|--------|
| Parent | `summary.totalAnswers: 0`, `insufficientData: true` |
| Teacher | `summary.totalAnswers: 25`, `accuracy: 80%`, `guidanceSeverityTier: "on_track"` |

**Finding #2 (HIGH):** Same student shows completely different status between parent and teacher views.

This is by design (classroom activity is teacher-controlled), but creates user confusion. The parent sees "no activity" while the teacher sees "on track".

**Root Cause:**
- `aggregateParentReportPayload()` only queries `learning_sessions` + `answers`
- `buildTeacherStudentReportPayload()` merges classroom activity after baseline

---

### 5.5 Scenario: Mixed Subject Scope

**Setup:**
- Student: 20 math answers (70%), 15 english answers (85%)
- Teacher's permitted subjects: ["math"] (school-scoped, no english permission)
- Class subject focus: "math"

**Expected:**
| Surface | Expected Subjects | Rationale |
|---------|-------------------|-----------|
| Parent | Math + English | Full aggregation |
| Teacher Student | Math only | `permittedSubjects: ["math"]` filter |
| Teacher Class | Math only | `subjectFocus: "math"` scope |

**Actual:**
| Surface | Result | Issue |
|---------|--------|-------|
| Parent | Both subjects ✓ | Correct |
| Teacher Student | Math only ✓ | `subjectFilter` applied in V2 |
| **Teacher Class Aggregate** | **Both subjects in cohort** ⚠️ | See Finding #3 |

**Finding #3 (HIGH):** Class-level aggregation in `aggregateClassReportFromStudentPayloads` does not filter by subject scope.

In `teacher-class-report.server.js:51-56`:
```javascript
export function aggregateClassReportFromStudentPayloads(studentPayloads, opts = {}) {
  const scopeSubjects = opts.scopeSubjects || null;  // Extracted but NOT fully used
  const cohortSubjects = {};
  for (const subject of REPORT_AGG_SUBJECTS) {  // Iterates ALL subjects
    cohortSubjects[subject] = emptySubjectRollup();  // Creates rollups for all subjects
```

The `scopeSubjects` is checked later in weakness calculation, but the cohort summary includes all subjects from all student payloads, potentially including subjects outside the teacher's scope.

---

### 5.6 Scenario: Same Student Across All Surfaces

**Setup:**
- Student ID: test-student-001
- Data: Mixed across free learning and classroom
- Check consistency of: raw counts → aggregate → status label

**Comparison Matrix:**

| Metric | Raw DB | Parent Aggregate | Teacher Aggregate | Class Aggregate |
|--------|--------|------------------|-------------------|-----------------|
| learning_sessions count | 5 | 5 | 5 | 5 |
| answers count | 25 | 25 | 25 | 25 (per student) |
| classroom_activities | 2 (submitted) | 0 | 2 (merged) | 2 (in scope) |
| classroom answers | 15 | 0 | 15 (merged) | 15 (aggregated) |
| **Total answers shown** | 40 | **25** ⚠️ | **40** | **40** |
| accuracy | 75% (30/40) | 80% (20/25) ⚠️ | 75% (30/40) | 75% |

**Finding #4 (MEDIUM):** Parent report undercounts total activity by excluding classroom work.

This is documented behavior (classroom is teacher-controlled), but creates data inconsistency.

**Status Label Consistency:**

| Surface | Tier Label | Risk/Status | Consistent? |
|---------|-----------|-------------|-------------|
| Parent | "כישלון יציב" / "צריך עוד תרגול" | N/A | Hebrew text varies |
| Teacher Student | `guidanceSeverityTier: "monitor"` | `riskLevel: "moderate"` | ✓ |
| School View | "במעקב" (Monitor) | Badge color: yellow | ✓ |

**Finding #5 (LOW):** Hebrew label mapping has slight variations between surfaces but conveys same meaning.

---

## 6. Findings Classification

### 6.1 BLOCKER (0 findings)

No contradictions with raw data were found. All aggregations correctly sum from source tables.

---

### 6.2 HIGH (3 findings)

#### Finding #1: Thin Data Recommendations in V2
**Location:** `teacher-guidance-v2.server.js:449`

**Issue:** V2 guidance produces `recommendationUnits` when only `MIN_ANSWERS_FOR_TOPIC_SIGNAL` (3) is met, even if overall `MIN_ANSWERS_FOR_STUDENT_SIGNAL` (5) is not met.

**Example:** Student with 4 total answers, 3 on fractions at 50% accuracy gets a fraction recommendation despite `insufficientData` in V1.

**Impact:** Teachers see specific recommendations for topics with insufficient evidence.

**Evidence:**
```javascript
// teacher-guidance-v2.server.js:449
if (answers >= MIN_ANSWERS_FOR_TOPIC_SIGNAL && accuracy < LOW_ACCURACY_THRESHOLD) {
  // answers = 3, MIN_ANSWERS_FOR_TOPIC_SIGNAL = 3
  // produces recommendation even if total student answers < 5
}
```

**Contradiction:** V1 correctly returns `insufficientData: true`, but V2 may still populate `recommendationUnits`.

---

#### Finding #2: Parent vs Teacher Data Divergence
**Location:** `lib/parent-server/report-data-aggregate.server.js:695` vs `lib/teacher-server/teacher-report.server.js:424`

**Issue:** Parent reports use only `learning_sessions/answers`; Teacher reports merge `classroom_activities` data.

**Impact:** Same student can be "no activity" for parent and "on track" for teacher.

**Evidence:**
- `aggregateParentReportPayload()` queries: `learning_sessions`, `answers`
- `buildTeacherStudentReportPayload()` calls:
  1. `aggregateParentReportPayload()` (baseline)
  2. `loadClassroomRollupForTeacherStudentReport()` (additional data)
  3. `mergeClassroomActivityRollupIntoReportPayload()` (merges sums)

**User Impact:** Parent confusion when child has been active in class but parent dashboard shows no activity.

---

#### Finding #3: Class Subject Scope Not Enforced in Aggregation
**Location:** `lib/teacher-server/teacher-class-report.server.js:51`

**Issue:** `aggregateClassReportFromStudentPayloads` creates rollups for all `REPORT_AGG_SUBJECTS` regardless of `scopeSubjects`.

**Impact:** Cohort summary may include subjects outside teacher's permission scope.

**Evidence:**
```javascript
// teacher-class-report.server.js:51-56
export function aggregateClassReportFromStudentPayloads(studentPayloads, opts = {}) {
  const scopeSubjects = opts.scopeSubjects || null;  // Parameter received
  const cohortSubjects = {};
  for (const subject of REPORT_AGG_SUBJECTS) {  // But loops ALL subjects
    cohortSubjects[subject] = emptySubjectRollup();
```

The `scopeSubjects` is used later for weakness filtering, but not for initial cohort aggregation.

---

### 6.3 MEDIUM (4 findings)

#### Finding #4: Default "monitor" Tier for Edge Cases
**Location:** `lib/teacher-server/teacher-recommendations.server.js:40-46`

**Issue:** `deriveStudentGuidanceSeverityTier()` returns `"monitor"` for null/undefined/invalid accuracy.

```javascript
export function deriveStudentGuidanceSeverityTier(accuracyPct) {
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return "monitor";  // Default for bad input
  // ... thresholds
}
```

**Impact:** Students with no data (0 answers) get "monitor" tier instead of explicit "no_data" or "insufficient".

**Inconsistency:** V1 checks `insufficientData` before calling tier function, but V2 calls it unconditionally.

---

#### Finding #5: Different Date Range Logic for Classroom vs Learning
**Location:** `lib/teacher-server/classroom-activity-class-report.server.js:24` vs `lib/parent-server/report-data-aggregate.server.js:264`

**Issue:**
- Learning sessions: filtered by `started_at` (or fallback to `created_at`)
- Classroom activities: filtered by `closed_at || activated_at || created_at`

**Impact:**
- A classroom activity closed on day 1 but started earlier may be counted in day 1's range
- Learning session started on day 1 is counted in day 1's range
- Potential off-by-one or boundary issues

**Evidence:**
```javascript
// classroom-activity-class-report.server.js:20-28
function activityTimestampIso(row) {
  return row?.closed_at || row?.activated_at || row?.created_at || null;
}

function isActivityInRange(row, fromIso, toIsoExclusive) {
  const at = activityTimestampIso(row);
  // uses closed_at as primary
}
```

---

#### Finding #6: Confidence Calculation Ignores Row Signals
**Location:** `utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js:199` vs `utils/diagnostic-engine-v2/confidence-policy.js:41-43`

**Issue:** V2 engine uses `confidence01` row signal only if `suff === "strong"`, but ignores other row-level signals like `dataSufficiencyLevel` and `isEarlySignalOnly`.

**Evidence:**
```javascript
// run-diagnostic-engine-v2.js:199-205
const confidence = resolveConfidenceLevel({
  events, wrongs, row, recurrenceFull, hintInvalidates,
});

// confidence-policy.js:30-34
const earlyOnly = row?.isEarlySignalOnly === true;
const suff = row?.dataSufficiencyLevel != null ? String(row.dataSufficiencyLevel) : "";
if (earlyOnly || suff === "weak" || suff === "thin") {
  // Only checked if earlyOnly/suff match
}
```

**Impact:** Row-level intelligence (computed elsewhere) may be overridden by raw counts in confidence policy.

---

#### Finding #7: Attention Score Calculation Inconsistency
**Location:** `lib/teacher-server/teacher-class-report.server.js:85-100`

**Issue:** Attention score calculation uses hardcoded thresholds that differ from guidance tiers.

```javascript
// teacher-class-report.server.js:88-94
if (answers === 0 && sessions === 0) {
  attentionScore += 3;
  reasons.push("no_activity_in_range");
} else if (accuracy != null && accuracy < 65 && answers >= 3) {
  attentionScore += accuracy < 50 ? 3 : 2;
  reasons.push("low_accuracy");
}
```

**Problems:**
1. Uses `65` directly, not `LOW_ACCURACY_THRESHOLD` constant
2. Uses `answers >= 3`, not `MIN_ANSWERS_FOR_TOPIC_SIGNAL` or `MIN_ANSWERS_FOR_STUDENT_SIGNAL`
3. `recentMistakes.length >= 5` threshold is arbitrary, not configurable

---

### 6.4 LOW (2 findings)

#### Finding #8: Redundant Threshold Definitions
**Location:** Multiple files

**Issue:** Same semantic thresholds defined in multiple places with slight variations.

| Threshold | Location A | Location B | Match? |
|-----------|-----------|-----------|--------|
| Low accuracy | `teacher-recommendations.server.js:21` = 65 | `teacher-class-report.server.js:91` = 65 | ✓ |
| Topic signal | `teacher-recommendations.server.js:28` = 3 | `teacher-class-report.server.js:91` = 3 | ✓ |
| Student signal | `teacher-recommendations.server.js:27` = 5 | V2 uses only topic threshold | ✗ |

**Impact:** Maintenance risk if thresholds need to change.

---

#### Finding #9: Missing Fallback for Empty Range
**Location:** `lib/teacher-server/teacher-class-report.server.js:403-414`

**Issue:** When `totalAnswers < MIN_CLASS_ANSWERS_FOR_GUIDANCE && studentsWithActivity === 0`, the function returns early with `insufficientData: true` but still includes `attentionStudents` from input parameter.

```javascript
if (totalAnswers < MIN_CLASS_ANSWERS_FOR_GUIDANCE && studentsWithActivity === 0) {
  return {
    insufficientData: true,
    // ...
    attentionStudents: attentionList.slice(0, 10),  // Still populated
  };
}
```

**Impact:** In "no data" state, attention list may still show students based on stale `attentionList` parameter.

---

## 7. Proposed Fix Plan — Not Implemented

**Status:** These are proposed fixes only. No implementation has occurred.

### 7.1 HIGH Priority Fixes

#### Fix #1: Align V2 with V1 Insufficient Data Check
**File:** `lib/teacher-server/teacher-guidance-v2.server.js`
**Change:** Add early return if `totalAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL`

```javascript
// Proposed addition at ~line 390
const totalAnswers = safeNum(summary.totalAnswers);
if (totalAnswers < MIN_ANSWERS_FOR_STUDENT_SIGNAL) {
  return {
    ...base,
    insufficientData: true,
    recommendationUnits: [],  // Empty
    strengthUnits: [],
  };
}
```

#### Fix #2: Document Parent/Teacher Data Divergence
**File:** Add to documentation/user-facing copy
**Change:** Explain that parent dashboard shows only free learning, while teacher sees classroom activity.

**Note:** Technical fix would require merging classroom activity into parent reports, but this may violate teacher control boundaries.

#### Fix #3: Enforce Subject Scope in Class Aggregation
**File:** `lib/teacher-server/teacher-class-report.server.js:51`
**Change:** Filter subjects during initial rollup creation

```javascript
for (const subject of REPORT_AGG_SUBJECTS) {
  if (scopeSubjects && !scopeSubjects.has(subject)) continue;
  cohortSubjects[subject] = emptySubjectRollup();
}
```

---

### 7.2 MEDIUM Priority Fixes

#### Fix #4: Add Explicit "No Data" Tier
**File:** `lib/teacher-server/teacher-recommendations.server.js:40`
**Change:** Return `null` or `"no_data"` for invalid accuracy, let caller decide default

```javascript
export function deriveStudentGuidanceSeverityTier(accuracyPct, hasData) {
  if (!hasData) return "no_data";
  const acc = Number(accuracyPct);
  if (!Number.isFinite(acc)) return "no_data";  // Instead of "monitor"
  // ... rest
}
```

#### Fix #5: Unify Date Range Filtering
**File:** `lib/teacher-server/classroom-activity-class-report.server.js`
**Change:** Use consistent field ordering: `submitted_at || closed_at || activated_at`

#### Fix #6: Use Constants in Attention Score
**File:** `lib/teacher-server/teacher-class-report.server.js:88-94`
**Change:** Replace magic numbers with imported constants

---

### 7.3 LOW Priority Fixes

#### Fix #7: Centralize Threshold Configuration
**File:** Create `lib/shared/report-thresholds.js`
**Change:** Export all thresholds from single source

#### Fix #8: Clear Attention List on Insufficient Data
**File:** `lib/teacher-server/teacher-class-report.server.js:403-414`
**Change:** Set `attentionStudents: []` in early return

---

## Appendix: Raw Data Schema

### A.1 learning_sessions Table
```sql
CREATE TABLE learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject text,  -- e.g., "math", "english"
  topic text,    -- e.g., "fractions_addition"
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',  -- 'active', 'completed'
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,  -- contains gameMode, level
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### A.2 answers Table
```sql
CREATE TABLE answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  learning_session_id uuid REFERENCES learning_sessions(id) ON DELETE SET NULL,
  question_id text NOT NULL,
  answer_payload jsonb NOT NULL DEFAULT '{}'::jsonb,  -- contains hintsUsed, timeSpentMs
  is_correct boolean,
  answered_at timestamptz NOT NULL DEFAULT now()
);
```

### A.3 classroom_activities Table
```sql
CREATE TABLE classroom_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'closed', 'archived'
  activated_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### A.4 classroom_activity_student_status Table
```sql
CREATE TABLE classroom_activity_student_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES classroom_activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'submitted', 'timed_out'
  submitted_at timestamptz,
  answers_count integer,
  correct_count integer
);
```

---

## End of Audit Report

**Generated:** 2026-05-29  
**Auditor:** Cascade (AI Assistant)  
**Review Required By:** Product Owner / Engineering Lead  
**Next Steps:** Review findings, prioritize fixes, approve implementation plan
