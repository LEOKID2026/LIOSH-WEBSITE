# Hebrew Learning Content Inventory — Summary

Generated: 2026-05-29T15:55:39.378Z

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | 96 |
| Hebrew learning strings/templates | 60174 |
| Student-visible | 52684 |
| Teacher-preview-visible | 0 |
| Needs review | 1256 |
| Question stems | 11831 |
| Answer options | 7229 |
| Hints/explanations/solutions | 2959 |
| Student feedback strings | 406 |
| Curriculum/topic/skill labels | 231 |
| Dynamic templates | 1442 |
| Rendered scenario samples | 128 |
| Owner review candidates | 120 |
| Risk flags | 3279 |

## Top 30 highest-risk learning-content phrases

1. **high** [raw_key_or_placeholder] — `${prog} / ${m.target} דק׳` (components/learning/SubjectDailyMissionsModal.js:17)
2. **high** [raw_key_or_placeholder] — `משימה ${index + 1}: ${textHe}` (components/learning/SubjectDailyMissionsModal.js:33)
3. **high** [raw_key_or_placeholder] — `${prog} / ${m.target} דק׳` (components/student/StudentDailyMissionsPanel.js:16)
4. **high** [raw_key_or_placeholder] — `משימה ${index + 1}: ${textHe}` (components/student/StudentDailyMissionsPanel.js:61)
5. **high** [potentially_sensitive_or_discouraging_feedback] — `טיפש` (data/hebrew-questions/g1.js:1398)
6. **high** [potentially_sensitive_or_discouraging_feedback] — `טיפש` (data/hebrew-questions/g2.js:968)
7. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון` (data/hebrew-questions/g4.js:1758)
8. **high** [potentially_sensitive_or_discouraging_feedback] — `קרא את הטקסט המידעי: 'הכישלון לא נורא. הוא עוזר ללמוד. הוא עוזר להשתפר.' מה הרעיון המרכזי?` (data/hebrew-questions/g4.js:1792)
9. **high** [potentially_sensitive_or_discouraging_feedback] — `הכישלון לא נורא. הוא עוזר ללמוד. הוא עוזר להשתפר.` (data/hebrew-questions/g4.js:1792)
10. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון עוזר ללמוד ולהשתפר` (data/hebrew-questions/g4.js:1794)
11. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון נורא` (data/hebrew-questions/g4.js:1795)
12. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון` (data/hebrew-questions/g4.js:1948)
13. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון` (data/hebrew-questions/g4.js:2290)
14. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון` (data/hebrew-questions/g5.js:870)
15. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון` (data/hebrew-questions/g5.js:1230)
16. **high** [potentially_sensitive_or_discouraging_feedback] — `כישלון` (data/hebrew-questions/g6.js:869)
17. **high** [raw_key_or_placeholder] — `אין מספיק שאלות ${subjectHe} עבור ${gradeLabel} — נושא: ${topicLabel} — רמה: ${levelLabel}` (lib/classroom-activities/generate-activity-questions-client.js:97)
18. **high** [raw_key_or_placeholder] — `ענית נכון על ${correct} שאלות` (lib/classroom-activities/student-activity-result-labels.client.js:13)
19. **high** [raw_key_or_placeholder] — `ענית נכון על ${correct} מתוך ${total} שאלות` (lib/classroom-activities/student-activity-result-labels.client.js:15)
20. **high** [raw_key_or_placeholder] — `${correct} שאלות` (lib/classroom-activities/student-activity-result-labels.client.js:26)
21. **high** [raw_key_or_placeholder] — `${correct}/${total} שאלות` (lib/classroom-activities/student-activity-result-labels.client.js:28)
22. **high** [raw_key_or_placeholder] — `הפירוש הנכון הוא: ${correctAnswer}.` (pages/learning/english-master.js:319)
23. **high** [raw_key_or_placeholder] — `הפירוש הנכון הוא: ${correctAnswer}.` (pages/learning/english-master.js:326)
24. **high** [raw_key_or_placeholder] — `התשובה הנכונה היא: ${correctAnswer}.` (pages/learning/english-master.js:339)
25. **high** [raw_key_or_placeholder] — `התרגום הנכון: ${correctAnswer}.` (pages/learning/english-master.js:357)
26. **high** [raw_key_or_placeholder] — `התרגום הנכון: ${correctAnswer}.` (pages/learning/english-master.js:367)
27. **high** [raw_key_or_placeholder] — `התשובה הנכונה היא: ${correctAnswer}.` (pages/learning/english-master.js:404)
28. **high** [raw_key_or_placeholder] — `המשפט הנכון באנגלית: ${correctAnswer}.` (pages/learning/english-master.js:421)
29. **high** [raw_key_or_placeholder] — `🧮 מלך ה${opName}` (pages/learning/hebrew-master.js:2072)
30. **high** [raw_key_or_placeholder] — `🧮 מלך ה${opName}` (pages/learning/hebrew-master.js:2073)

## Scope

Learning content across subjects (math, geometry, Hebrew, English, science, moledet-geography), question banks, generators, hints/explanations, classroom activities, and curriculum labels.

Excluded: parent reports, teacher/school reports, site decision copy, games/arcade, live classroom/audio, review-packages.

## Files scanned (96)

- components/learning/StudentQuestionDisplay.jsx
- components/learning/SubjectDailyMissionsModal.js
- components/learning/SubjectMonthlyPrizeJourney.js
- components/learning/geometry/GeometryExplanationDiagram.jsx
- components/student/ClassroomGeometryQuestionDiagram.jsx
- components/student/StudentAccessGate.js
- components/student/StudentAvatarPickerModal.js
- components/student/StudentClassroomActivitiesPanel.jsx
- components/student/StudentDailyMissionsPanel.js
- components/student/StudentMonthlyPersistencePanel.js
- data/curriculum-spine/v1/skills.json
- data/english-curriculum.js
- data/english-questions/grammar-pools.js
- data/english-questions/index.js
- data/english-questions/sentence-pools.js
- data/english-questions/translation-pools.js
- data/english-questions/word-lists.js
- data/geography-questions/g1.js
- data/geography-questions/g2.js
- data/geography-questions/g3.js
- data/geography-questions/g4.js
- data/geography-questions/g5.js
- data/geography-questions/g6.js
- data/geography-questions/index.js
- data/hebrew-curriculum.js
- data/hebrew-g1-content-map.js
- data/hebrew-g2-content-map.js
- data/hebrew-g3-content-map.js
- data/hebrew-g3-reading-bank.js
- data/hebrew-g4-content-map.js
- data/hebrew-g5-content-map.js
- data/hebrew-g6-content-map.js
- data/hebrew-questions/g1.js
- data/hebrew-questions/g2.js
- data/hebrew-questions/g3.js
- data/hebrew-questions/g4.js
- data/hebrew-questions/g5.js
- data/hebrew-questions/g6.js
- data/moledet-geography-curriculum.js
- data/science-curriculum.js
- data/science-questions-closure-fill.js
- data/science-questions-g3-body-bank.js
- data/science-questions-needs-more-volume.js
- data/science-questions-p0-g123-fill.js
- data/science-questions-p1-g456-fill.js
- data/science-questions-phase3.js
- data/science-questions-phase4b1.js
- data/science-questions-production-batch1.js
- data/science-questions.js
- lib/classroom-activities/classroom-activities-labels.client.js
- lib/classroom-activities/classroom-activities-preview.js
- lib/classroom-activities/classroom-activities-shared.server.js
- lib/classroom-activities/classroom-skill-labels-he.js
- lib/classroom-activities/frozen-activity-question.server.js
- lib/classroom-activities/generate-activity-questions-client.js
- lib/classroom-activities/student-activity-error-labels.client.js
- lib/classroom-activities/student-activity-result-labels.client.js
- lib/learning/session-topic-helpers.js
- pages/learning/curriculum.js
- pages/learning/english-master.js
- pages/learning/geometry-curriculum.js
- pages/learning/geometry-master.js
- pages/learning/hebrew-master.js
- pages/learning/index.js
- pages/learning/math-master.js
- pages/learning/moledet-geography-master.js
- pages/learning/science-master.js
- pages/student/activity/[activityId].js
- utils/curriculum-audit/israeli-primary-curriculum-map.js
- utils/diagnostic-labels-he.js
- utils/english-question-generator.js
- utils/geometry-activity-question-stem.js
- utils/geometry-conceptual-bank.js
- utils/geometry-constants.js
- utils/geometry-explanations.js
- utils/geometry-probe-bank.js
- utils/geometry-question-generator.js
- utils/hebrew-constants.js
- utils/hebrew-explanations.js
- utils/hebrew-g1-subtopic.js
- utils/hebrew-g2-subtopic.js
- utils/hebrew-g3456-subtopic.js
- utils/hebrew-legacy-metadata.js
- utils/hebrew-question-generator.js
- utils/hebrew-rich-question-bank.js
- utils/learning-question-font.js
- utils/learning-ui-classes.js
- utils/math-animations.js
- utils/math-constants.js
- utils/math-explanations.js
- utils/math-question-generator.js
- utils/moledet-geography-constants.js
- utils/moledet-geography-explanations.js
- utils/moledet-geography-question-generator.js
- utils/student-question-display.js
- utils/student-question-stem-sanitizer.js

## Notes

- No product source code was modified.
- `suggested_replacement` and `owner_approved_replacement` columns are empty — pending owner review.
- Hebrew archive `data/hebrew-questions/*` scanned but marked internal_only (not runtime).
- Excel: `reports/learning-content-hebrew-inventory.xlsx`
