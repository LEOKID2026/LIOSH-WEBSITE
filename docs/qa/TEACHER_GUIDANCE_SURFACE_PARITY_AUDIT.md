# Teacher Guidance Surface Parity Audit

Date: 2026-05-28

Scope: forensic read-only parity audit after the unapproved Teacher Guidance Engine Correction implementation. This report intentionally does not implement, patch, stage, commit, push, or run SQL. Evidence was collected through existing read-only server builders and Supabase client reads; no secrets are included.

## 1. Executive Finding

The product inconsistency is real, and it has two layers:

1. **Surface parity split:** subject class pages and school subject-class modals use the same class report builder and V2 guidance engine, but the school physical-class Report Hub modal uses a different builder and does **not** build `teacherGuidanceBlock` or V2 units.
2. **Classification data failure:** math/geometry/hebrew/moledet payloads contain generic or cross-subject topic keys such as `math`, `geometry`, `moledet_geography`, and `animals`. These keys are mostly unmapped to teacher-facing topic labels, so V2 creates broad subject fallbacks. Geometry does not contain topic keys such as angles, shapes, perimeter, area, symmetry, or coordinates in the inspected payload.

The recent correction did not create the missing geometry/math topic metadata. It did, however, make the missing metadata more visible by converting silent drops into broad subject fallback units. Because the school physical-class path remains V1-style and suppresses unmapped focus rows, manager Report Hub can show a different focus item from the teacher class page for the same physical class.

Recommendation: **hold the current implementation, do not revert immediately, and rework before approval.** Keep the subject fallback concept as a guardrail, but fix surface parity and topic classification before this is considered product-ready.

## 2. Inspected IDs

Report window from the default route resolver:

```json
{
  "from": "2026-04-29T00:00:00.000Z",
  "to": "2026-05-28T00:00:00.000Z"
}
```

Inspected classes:

| Case | Class ID | Name | Subject | Teacher ID | Accuracy | Answers |
| --- | --- | --- | --- | --- | ---: | ---: |
| Math class around 57%-60% | `f3ce0760-d33d-458a-a458-2ea72edf838b` | `כיתה ג׳ 3` | `math` | `cb21cfc8-472e-4c7d-bf87-2c2600beb71d` | 59.75% | 5280 |
| Geometry broad fallback | `aaac8e23-5f6d-4afa-a1a2-f77c9b567433` | `כיתה ג׳ 3` | `geometry` | `cb21cfc8-472e-4c7d-bf87-2c2600beb71d` | 59.45% | 2750 |
| Hebrew weak subject | `7069fd48-7eb4-446a-852d-7ee11244ae48` | `כיתה ג׳ 3` | `hebrew` | `897c49a9-8a37-4a6e-9cb7-109bdf26f750` | 58.32% | 3800 |
| Moledet/geography weak subject | `7d2eab95-375c-4f99-8598-a9407d4f8de6` | `כיתה ג׳ 3` | `moledet_geography` | `897c49a9-8a37-4a6e-9cb7-109bdf26f750` | 58.66% | 3060 |
| School physical Report Hub | `gradeLevel=3`, `physicalClassName=כיתה ג׳ 3`, `schoolId=bb4e5984-d95f-438f-a465-e1a8208ea7de` | all subject classes above plus English/science | all subjects | mixed | 56.93% | 22540 |

Inspected student:

| Student ID | Class ID | Class/subject | Accuracy | Answers | Why selected |
| --- | --- | --- | ---: | ---: | --- |
| `bfe02b03-1e46-4107-9434-e3a1a83db5be` | `f3ce0760-d33d-458a-a458-2ea72edf838b` | `כיתה ג׳ 3` / math | 29.57% | 230 | First high-priority attention student in the selected math class |

## 3. Endpoint And Builder Parity

| Surface | Endpoint / path | Server builder | Guidance engine | View-model |
| --- | --- | --- | --- | --- |
| Teacher class page | `/api/teacher/classes/[classId]/report-data` | `buildTeacherClassReportPayload` | `buildClassTeacherGuidanceV2` | page renders payload directly |
| School subject-class modal | `/api/school/classes/[classId]/report-data` | `buildTeacherClassReportPayload` using `inScope.classRow.teacher_id` | `buildClassTeacherGuidanceV2` | `parseClassReportViewModel` |
| School physical-class Report Hub modal | `/api/school/classes/physical-report?gradeLevel=3&physicalClassName=כיתה ג׳ 3` | `buildSchoolPhysicalClassReportPayload` | none; no `teacherGuidanceBlock` | `parsePhysicalClassReportViewModel` |
| Teacher student page | `/api/teacher/students/[studentId]/report-data` | `buildTeacherStudentReportPayload` | `buildStudentTeacherGuidanceV2` | page renders payload directly |
| School student modal | `/api/school/students/[studentId]/report-data` | `buildTeacherStudentReportPayload` via school scope | `buildStudentTeacherGuidanceV2` | `parseStudentReportViewModel` |
| Teacher dashboard cards | teacher dashboard payload | `buildTeacherDashboardPayload` and dashboard attention helpers | student/class attention summaries, not the class report V2 block | `TeacherDashboardClient` |

Answer to the parity question: teacher class page and school subject-class modal use the same core builder and same classId/time window. The visible manager/teacher divergence appears when the manager is looking at the **physical-class Report Hub modal**, which is a different API and builder, aggregates all subject classes, does not run V2 class guidance, and uses raw `weaknessTopics`.

## 4. Raw Payload Evidence

### 4.1 Math Subject Class: `f3ce0760-d33d-458a-a458-2ea72edf838b`

Source:

```json
{
  "teacherEndpoint": "/api/teacher/classes/f3ce0760-d33d-458a-a458-2ea72edf838b/report-data",
  "schoolSubjectEndpoint": "/api/school/classes/f3ce0760-d33d-458a-a458-2ea72edf838b/report-data",
  "serverBuilder": "buildTeacherClassReportPayload -> buildClassTeacherGuidanceV2",
  "viewModel": "parseClassReportViewModel",
  "classId": "f3ce0760-d33d-458a-a458-2ea72edf838b",
  "subjectScope": "math"
}
```

Raw `summary` / `roster`:

```json
{
  "summary": {
    "totalSessions": 528,
    "totalAnswers": 5280,
    "correctAnswers": 3155,
    "wrongAnswers": 2125,
    "accuracy": 59.75,
    "studentsWithActivity": 22
  },
  "roster": {
    "studentCount": 22,
    "activeMemberCount": 22
  }
}
```

Raw `subjects.math` and `topics`:

```json
{
  "math": {
    "answers": 5280,
    "correct": 3155,
    "wrong": 2125,
    "accuracy": 59.75,
    "topics": {
      "math": {
        "answers": 3520,
        "correct": 2457,
        "wrong": 1063,
        "accuracy": 69.8,
        "mapped": false,
        "recommendable": true,
        "label": null
      },
      "animals": {
        "answers": 1760,
        "correct": 698,
        "wrong": 1062,
        "accuracy": 39.66,
        "mapped": false,
        "recommendable": true,
        "label": null
      }
    }
  }
}
```

Raw `weaknessTopics` for subject:

```json
[
  { "subject": "math", "topic": "math", "wrong": 1063, "answers": 3520, "studentCount": 22 },
  { "subject": "math", "topic": "animals", "wrong": 1062, "answers": 1760, "studentCount": 22 }
]
```

Raw `teacherGuidanceBlock`:

```json
{
  "guidanceSeverityTier": "class_needs_reinforcement",
  "classHealthSignal": "needs_reinforcement",
  "teacherSummary": {
    "cohortAccuracy": 59.75,
    "totalAnswers": 5280,
    "totalStudents": 22,
    "studentsWithActivity": 22,
    "percentStudentsActive": 100,
    "classHealthSignal": "needs_reinforcement",
    "guidanceSeverityTier": "class_needs_reinforcement"
  },
  "classificationGapSummary": {
    "subjects": [
      {
        "subject": "math",
        "reasons": ["unmapped_topic"],
        "droppedAnswerCount": 5280,
        "totalAnswers": 5280
      }
    ]
  },
  "classRecommendationUnits": [
    {
      "unitId": "math::__class_subject_fallback",
      "level": "subject",
      "scope": "class",
      "subject": "math",
      "topic": null,
      "topicLabelHe": null,
      "headlineHe": "מתמטיקה — קושי ברמת מקצוע בכיתה",
      "accuracyPct": 59.75,
      "totalAnswers": 5280,
      "wrongCount": 2125,
      "affectedStudentCount": 22,
      "classificationGap": true,
      "classificationGapReasons": ["unmapped_topic"],
      "reason": "low_class_subject_accuracy_no_mapped_topic"
    }
  ]
}
```

Raw school subject-class view-model output:

```json
{
  "insight": "הכיתה דורשת חיזוק. מתמטיקה — קושי ברמת מקצוע בכיתה (22 תלמידים · 60% הצלחה).",
  "focusItems": [
    {
      "label": "מתמטיקה — קושי ברמת מקצוע בכיתה",
      "detail": "שיעור טעות 40%",
      "count": 22,
      "drilldownKey": "math::general"
    }
  ]
}
```

Surface comparison:

| Field | Teacher class page | School modal / Report Hub subject-class | Difference |
| --- | --- | --- | --- |
| accuracy | 59.75% | 60% rounded | rounding only |
| answers | 5280 | 5280 | none |
| active students | 22 | 22 | none |
| subject scope | `math` | `math` | none |
| weak topics | `math`, `animals`, both unmapped | V2 fallback rendered | raw topics suppressed by V2/view-model |
| subject fallback units | 1 | 1 | none |
| topic units | 0 | 0 | none |
| class tier | `class_needs_reinforcement` | `class_needs_reinforcement` via insight | none |
| displayed guidance text | `מתמטיקה — קושי ברמת מקצוע בכיתה` | same headline; Report Hub adds insight and error rate | presentation differs |

### 4.2 Geometry Subject Class: `aaac8e23-5f6d-4afa-a1a2-f77c9b567433`

Source:

```json
{
  "teacherEndpoint": "/api/teacher/classes/aaac8e23-5f6d-4afa-a1a2-f77c9b567433/report-data",
  "schoolSubjectEndpoint": "/api/school/classes/aaac8e23-5f6d-4afa-a1a2-f77c9b567433/report-data",
  "serverBuilder": "buildTeacherClassReportPayload -> buildClassTeacherGuidanceV2",
  "viewModel": "parseClassReportViewModel",
  "classId": "aaac8e23-5f6d-4afa-a1a2-f77c9b567433",
  "subjectScope": "geometry"
}
```

Raw `summary`:

```json
{
  "totalSessions": 275,
  "totalAnswers": 2750,
  "correctAnswers": 1635,
  "wrongAnswers": 1115,
  "accuracy": 59.45,
  "studentsWithActivity": 22
}
```

All geometry topic keys observed:

```json
{
  "geometry": {
    "answers": 1760,
    "correct": 1232,
    "wrong": 528,
    "accuracy": 70,
    "mapped": false,
    "recommendable": true,
    "label": null
  },
  "animals": {
    "answers": 990,
    "correct": 403,
    "wrong": 587,
    "accuracy": 40.71,
    "mapped": false,
    "recommendable": true,
    "label": null
  }
}
```

No geometry skill topic keys were present in the payload: no `angles`, no `shapes`, no `perimeter`, no `area`, no `symmetry`, no `coordinates`, no Hebrew topic-equivalent keys. The payload only had a subject-name key and a cross-subject `animals` key.

Raw `teacherGuidanceBlock`:

```json
{
  "guidanceSeverityTier": "class_needs_reinforcement",
  "classHealthSignal": "needs_reinforcement",
  "classificationGapSummary": {
    "subjects": [
      {
        "subject": "geometry",
        "reasons": ["unmapped_topic"],
        "droppedAnswerCount": 2750,
        "totalAnswers": 2750
      }
    ]
  },
  "classRecommendationUnits": [
    {
      "unitId": "geometry::__class_subject_fallback",
      "level": "subject",
      "scope": "class",
      "subject": "geometry",
      "topic": null,
      "topicLabelHe": null,
      "headlineHe": "גיאומטריה — קושי ברמת מקצוע בכיתה",
      "accuracyPct": 59.45,
      "totalAnswers": 2750,
      "wrongCount": 1115,
      "affectedStudentCount": 22,
      "classificationGap": true,
      "classificationGapReasons": ["unmapped_topic"],
      "reason": "low_class_subject_accuracy_no_mapped_topic"
    }
  ]
}
```

Raw school subject-class view-model output:

```json
{
  "insight": "הכיתה דורשת חיזוק. גיאומטריה — קושי ברמת מקצוע בכיתה (22 תלמידים · 59% הצלחה).",
  "focusItems": [
    {
      "label": "גיאומטריה — קושי ברמת מקצוע בכיתה",
      "detail": "שיעור טעות 41%",
      "count": 22,
      "drilldownKey": "geometry::general"
    }
  ]
}
```

Surface comparison:

| Field | Teacher class page | School modal / Report Hub subject-class | Difference |
| --- | --- | --- | --- |
| accuracy | 59.45% | 59% rounded | rounding only |
| answers | 2750 | 2750 | none |
| active students | 22 | 22 | none |
| subject scope | `geometry` | `geometry` | none |
| weak topics | `animals` 990 answers, `geometry` 1760 answers; both unmapped | only fallback rendered | raw topics suppressed because no label |
| subject fallback units | 1 | 1 | none for subject-class modal |
| topic units | 0 | 0 | none |
| class tier | `class_needs_reinforcement` | `class_needs_reinforcement` via insight | none |
| displayed guidance text | `גיאומטריה — קושי ברמת מקצוע בכיתה` | same headline; Report Hub adds insight/error rate | presentation differs |

Why broad fallback: the V2 engine did not have any mapped geometry topic units to prefer. It saw weak subject performance, enough answers, and all topic evidence dropped as `unmapped_topic`; therefore it created the subject fallback as designed. This is correct for the implemented guardrail but unacceptable as final product because the input topic metadata is defective for geometry.

### 4.3 School Physical-Class Report Hub: `כיתה ג׳ 3`

Source:

```json
{
  "endpoint": "/api/school/classes/physical-report?gradeLevel=3&physicalClassName=%D7%9B%D7%99%D7%AA%D7%94%20%D7%92%D7%B3%203",
  "serverBuilder": "buildSchoolPhysicalClassReportPayload -> aggregateClassReportFromStudentPayloads",
  "viewModel": "parsePhysicalClassReportViewModel",
  "teacherGuidanceBlock": null
}
```

Raw `summary`:

```json
{
  "totalSessions": 2254,
  "totalAnswers": 22540,
  "correctAnswers": 12831,
  "wrongAnswers": 9709,
  "accuracy": 56.93,
  "studentsWithActivity": 22
}
```

Raw `subjectBreakdown`:

```json
[
  { "classId": "f3ce0760-d33d-458a-a458-2ea72edf838b", "subjectFocus": "math", "accuracy": 59.75, "totalAnswers": 5280 },
  { "classId": "aaac8e23-5f6d-4afa-a1a2-f77c9b567433", "subjectFocus": "geometry", "accuracy": 59.45, "totalAnswers": 2750 },
  { "classId": "481b0ff7-1bf5-47d5-be71-de258e4dc5bc", "subjectFocus": "english", "accuracy": 58.37, "totalAnswers": 3870 },
  { "classId": "7069fd48-7eb4-446a-852d-7ee11244ae48", "subjectFocus": "hebrew", "accuracy": 58.32, "totalAnswers": 3800 },
  { "classId": "7d2eab95-375c-4f99-8598-a9407d4f8de6", "subjectFocus": "moledet_geography", "accuracy": 58.66, "totalAnswers": 3060 },
  { "classId": "be993b54-0b37-4467-b37e-25a53a67d5b1", "subjectFocus": "science", "accuracy": 46.85, "totalAnswers": 3780 }
]
```

Raw topic classification map:

```json
{
  "math": {
    "math": { "answers": 3520, "accuracy": 69.8, "mapped": false, "label": null },
    "animals": { "answers": 1760, "accuracy": 39.66, "mapped": false, "label": null }
  },
  "geometry": {
    "geometry": { "answers": 1760, "accuracy": 70, "mapped": false, "label": null },
    "animals": { "answers": 990, "accuracy": 40.71, "mapped": false, "label": null }
  },
  "hebrew": {
    "hebrew": { "answers": 2420, "accuracy": 69.21, "mapped": false, "label": null },
    "animals": { "answers": 1380, "accuracy": 39.2, "mapped": false, "label": null }
  },
  "moledet_geography": {
    "moledet_geography": { "answers": 1980, "accuracy": 68.94, "mapped": false, "label": null },
    "animals": { "answers": 1080, "accuracy": 39.81, "mapped": false, "label": null }
  },
  "science": {
    "animals": { "answers": 3780, "accuracy": 46.85, "mapped": true, "label": "בעלי חיים" }
  }
}
```

Raw physical-class view-model output:

```json
{
  "insight": "סיכום כללי לכיתה בכל המקצועות: 22 מתוך 22 תלמידים עם פעילות, 22540 תשובות/הגשות.",
  "focusItems": [
    {
      "label": "מדעים — בעלי חיים",
      "detail": "שיעור טעות 53%",
      "count": 22,
      "drilldownKey": "science::animals"
    }
  ],
  "summaryCards": [
    { "label": "תלמידים", "value": "22" },
    { "label": "תשובות", "value": "22540" },
    { "label": "דיוק", "value": "57%" },
    { "label": "פעילים", "value": "22" }
  ]
}
```

Surface comparison against the math teacher class:

| Field | Teacher class page | School physical Report Hub | Difference |
| --- | --- | --- | --- |
| accuracy | 59.75% math subject class | 56.93% all-subject physical class | different subject scope |
| answers | 5280 math | 22540 all subjects | different aggregation scope |
| active students | 22 | 22 | none |
| subject scope | `math` only | all subjects in physical class | major divergence |
| weak topics | math topics `math`, `animals`, both unmapped | physical `weaknessTopics`; only science/animals maps to UI label | different builder/view-model |
| subject fallback units | 1 math fallback | 0; no V2 `teacherGuidanceBlock` | major divergence |
| topic units | 0 | 1 visible V1 focus: `מדעים — בעלי חיים` | different guidance source |
| class tier | `class_needs_reinforcement` | none; physical path has no class tier | major divergence |
| displayed guidance text | `מתמטיקה — קושי ברמת מקצוע בכיתה` | `מדעים — בעלי חיים`; generic all-subject insight | major divergence |

This explains the manual observation that one manager surface can show a subject/topic reinforcement item while the teacher class page shows broad fallback. They are not using the same payload path when the manager is in the physical-class Report Hub modal.

### 4.4 Individual Student: `bfe02b03-1e46-4107-9434-e3a1a83db5be`

Source:

```json
{
  "endpoint": "/api/teacher/students/bfe02b03-1e46-4107-9434-e3a1a83db5be/report-data",
  "serverBuilder": "buildTeacherStudentReportPayload -> buildStudentTeacherGuidanceV2",
  "classId": "f3ce0760-d33d-458a-a458-2ea72edf838b",
  "subjectScope": "math via class context"
}
```

Raw `summary`:

```json
{
  "totalSessions": 23,
  "totalAnswers": 230,
  "correctAnswers": 68,
  "wrongAnswers": 162,
  "accuracy": 29.57
}
```

Raw `subjects` excerpt:

```json
{
  "math": {
    "answers": 230,
    "correct": 68,
    "wrong": 162,
    "accuracy": 29.57,
    "topics": {
      "math": { "answers": 160, "accuracy": 33.75, "mapped": false, "label": null },
      "animals": { "answers": 70, "accuracy": 20, "mapped": false, "label": null }
    }
  },
  "geometry": { "answers": 0, "accuracy": 0, "topics": {} },
  "hebrew": { "answers": 0, "accuracy": 0, "topics": {} },
  "moledet_geography": { "answers": 0, "accuracy": 0, "topics": {} }
}
```

Raw `teacherGuidanceBlock`:

```json
{
  "guidanceSeverityTier": "critical",
  "riskLevel": "high",
  "teacherGuidance": {
    "overallAccuracy": 29.57,
    "totalAnswers": 230,
    "riskLevel": "high"
  },
  "classificationGapSummary": {
    "subjects": [
      {
        "subject": "math",
        "reasons": ["unmapped_topic"],
        "droppedAnswerCount": 230,
        "totalAnswers": 230
      }
    ]
  },
  "recommendationUnits": [
    {
      "unitId": "math::__subject_fallback",
      "level": "subject",
      "scope": "individual",
      "subject": "math",
      "topic": null,
      "topicLabelHe": null,
      "headlineHe": "מתמטיקה — קושי ברמת מקצוע",
      "accuracyPct": 29.57,
      "totalAnswers": 230,
      "wrongCount": 162,
      "classificationGap": true,
      "classificationGapReasons": ["unmapped_topic"],
      "reason": "low_subject_accuracy_no_mapped_topic"
    }
  ]
}
```

Student surface comparison:

| Field | Teacher student page | School student modal / view-model | Difference |
| --- | --- | --- | --- |
| accuracy | 29.57% | same source if opened through school student endpoint | none expected for same student/class context |
| answers | 230 | same source | none expected |
| subject scope | math only in inspected context | school student endpoint can pass `classId`, `gradeLevel`, `physicalClassName` | possible if omitted |
| weak topics | `math`, `animals`, both unmapped | fallback if V2 guidance present | raw topics not teacher-displayable |
| subject fallback units | 1 | 1 if same payload parsed | none expected |
| topic units | 0 | 0 | none |
| risk/tier | `critical`, `high` | `critical` used by view-model insight | none expected |
| displayed guidance text | `מתמטיקה — קושי ברמת מקצוע` | view-model would show same fallback headline | none expected |

The inspected individual student did not have Hebrew/Moledet/Geometry activity in the math class context. If the manual screenshot showed the same student weak in Hebrew/Moledet/Geometry/Math, that is likely from the school student modal with broader physical-class context or from another student URL not available in this chat. The same failure mode remains: those subject payloads use unmapped generic topic keys, so guidance collapses into subject fallback.

## 5. Geometry And Math Root Cause

Geometry broad fallback was produced because:

1. `subjects.geometry.topics` contained only `geometry` and `animals`.
2. `resolveTopicLabelHe("geometry", "geometry")` returned no label.
3. `resolveTopicLabelHe("geometry", "animals")` returned no label.
4. V2 dropped all candidate topic evidence as `unmapped_topic`.
5. Since subject accuracy was weak and enough answers existed, V2 created `geometry::__class_subject_fallback`.

Math broad fallback was produced for the same pattern:

1. `subjects.math.topics` contained only `math` and `animals`.
2. Both are unmapped for math teacher guidance labels.
3. V2 produced `math::__class_subject_fallback`.

This is not a normal geometry/math product state. It indicates the topic classification pipeline or activity/question metadata is not preserving teachable skill taxonomy.

## 6. Subject Fallback Overuse

Coverage calculation used recommendation evidence answers for the inspected subject-class payloads. Since no mapped topic-level V2 units were produced, mapped topic coverage is 0%.

| Case | Topic-level units | Subject fallback units | Mapped topic answer coverage | Subject fallback answer coverage | Conclusion |
| --- | ---: | ---: | ---: | ---: | --- |
| Math `כיתה ג׳ 3` | 0 | 1 | 0 / 5280 = 0% | 5280 / 5280 = 100% | fallback dominates |
| Geometry `כיתה ג׳ 3` | 0 | 1 | 0 / 2750 = 0% | 2750 / 2750 = 100% | fallback dominates; unacceptable for geometry |
| Hebrew `כיתה ג׳ 3` | 0 | 1 | 0 / 3800 = 0% | 3800 / 3800 = 100% | fallback dominates |
| Moledet/geography `כיתה ג׳ 3` | 0 | 1 | 0 / 3060 = 0% | 3060 / 3060 = 100% | fallback dominates |
| Student `bfe02...` math | 0 | 1 | 0 / 230 = 0% | 230 / 230 = 100% | fallback dominates |
| School physical class | V1 visible focus: 1 science topic | 0 V2 fallbacks | only science `animals` maps; math/geometry/hebrew/moledet hidden | no V2 fallback on physical path | surface diverges |

Subject fallback is being overused in math/geometry because mapped topic units are absent. Treat this as a data/pipeline failure, not a final guidance state.

## 7. Root Cause Classification

| Mismatch | Classification | Evidence | Responsible files |
| --- | --- | --- | --- |
| Teacher class page vs school physical Report Hub shows different guidance | 1. Different API/server builder; 3. School view-model transforms data differently; 5. Class subject scope differs | teacher subject class uses V2 `teacherGuidanceBlock`; physical class has `teacherGuidanceBlock: null` and all-subject summary | `pages/api/school/classes/physical-report.js`, `lib/school-server/school-physical-class-report.server.js`, `lib/school-portal/school-report-view-model.js`, `lib/teacher-server/teacher-class-report.server.js` |
| School physical Report Hub shows `מדעים — בעלי חיים` while math/geometry subject pages show broad fallbacks | 1. Different builder; 7. Topic units exist but other topics suppressed; 8. geometry/math metadata missing | physical view-model uses raw `weaknessTopics`; only science/animals maps to a label | `lib/school-portal/school-report-view-model.js`, `lib/teacher-portal/teacher-ui.he.js`, `lib/school-server/school-physical-class-report.server.js` |
| Geometry shows broad fallback | 6. V2 fallback generated but topic units missing; 8. Geometry/math topic metadata missing | topic keys were `geometry` and `animals`, both unmapped for geometry | `lib/teacher-server/teacher-guidance-v2.server.js`, `lib/teacher-portal/teacher-ui.he.js`, upstream topic metadata/classification pipeline |
| Math shows broad fallback | 6. V2 fallback generated but topic units missing; 8. Geometry/math topic metadata missing | topic keys were `math` and `animals`, both unmapped for math | `lib/teacher-server/teacher-guidance-v2.server.js`, `lib/teacher-portal/teacher-ui.he.js`, upstream topic metadata/classification pipeline |
| Subject modal and teacher page differ in wording/count presentation | 2. Same payload but UI renders differently; 3. School view-model transforms data differently | teacher page displays unit evidence; school modal converts to insight/error-rate/focus drilldown | `pages/teacher/class/[classId].js`, `lib/school-portal/school-report-view-model.js` |
| Dashboard attention may not match report guidance | 1. Different builder; 9. threshold/fallback conflict risk | dashboard cards use attention payloads, not class V2 unit list | `lib/teacher-server/teacher-dashboard.server.js`, `components/teacher-portal/TeacherDashboardClient.jsx` |

## 8. Did The Recent Correction Create Surface Inconsistency?

Partially.

It did not create the underlying classification failure. The generic topic keys and missing labels already cause topic diagnosis to fail.

It did create a new visible divergence:

1. `teacher-guidance-v2.server.js` now turns dropped topics into broad subject fallback units for subject class and student reports.
2. `pages/teacher/class/[classId].js` and `pages/teacher/student/[studentId].js` now render those fallback units.
3. `school-report-view-model.js` renders those fallback units for subject-class modals through `parseClassReportViewModel`.
4. `buildSchoolPhysicalClassReportPayload` / `parsePhysicalClassReportViewModel` were not upgraded to V2 parity. They still use raw all-subject `weaknessTopics` and label filtering.

Therefore, the correction improves one path but leaves another manager path on older behavior, producing cross-surface mismatch.

## 9. Implementation Recommendation

Do not approve or commit the current implementation as-is.

Recommended path:

1. **Hold the implementation**, because it prevents calm/empty weak-state messaging and exposes useful diagnostics.
2. **Adjust fallback rules and surface parity before approval**, especially for the school physical-class Report Hub and dashboard.
3. **Fix topic classification/metadata for math and geometry before treating fallback output as product-ready.** Geometry should produce skill/topic units in normal data.
4. **Do not revert yet** unless the owner needs to remove the broad fallback from browser review immediately. A revert would hide the newly exposed classification problem and may reintroduce misleading calm states.
5. **Rework plan before more code changes.** The next plan should cover physical-class Report Hub V2 parity, topic taxonomy repair, and fallback confidence/diagnostic display policy.

## 10. Constraints Confirmation

- No implementation patch was applied.
- No product/source code was changed by this audit.
- No SQL was run.
- No migration was created.
- No simulation or parallel workstream files were touched.
- No `git add .`, no `git add -A`, no staging.
- No commit.
- No push.

