# Teacher/School Report Hebrew Copy Inventory — Summary

Generated: 2026-05-29T14:52:10.249Z

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | 220 |
| Hebrew strings/templates | 1817 |
| Teacher/school-visible | 1526 |
| Internal-only | 4 |
| Needs review | 287 |
| Dynamic templates | 142 |
| Empty/thin data strings | 50 |
| Diagnostic/guidance strings | 429 |
| Export copy strings | 467 |
| Professional terms tracked | 31 |
| Rendered scenario samples | 37 |
| Owner review candidates | 203 |

## Top 30 highest-risk teacher/school phrases

1. **high** [teacher/teacher_dashboard] — `תלמיד נוסף.\nשם משתמש: ${body.data.loginUsername}\nPIN: 1234` (components/teacher-portal/TeacherDashboardClient.jsx:199)
2. **high** [teacher/report_general] — `לא משולב במנוע האבחון — דוח נפרד מפעילויות אוטומטיות.` (components/teacher-portal/TeacherStudentWorksheetsPanel.jsx:42)
3. **high** [school_manager/activity_export] — `ניתן לרשום תלמיד לפי מזהה UUID בטופס למעלה.` (lib/school-portal/school-ui.he.js:64)
4. **high** [school_manager/activity_export] — `מזהה תלמיד (UUID)` (lib/school-portal/school-ui.he.js:137)
5. **high** [mixed_or_unclear/guidance_diagnostic] — `לבודד משפטי שאלה קצרים עם do/does/is/are במקום הנכון.` (utils/fast-diagnostic-engine/probe-map-he.js:136)
6. **high** [mixed_or_unclear/guidance_diagnostic] — `לבחור -er/-est או more/most במשפט קצר.` (utils/fast-diagnostic-engine/probe-map-he.js:151)
7. **high** [mixed_or_unclear/guidance_diagnostic] — `לבחור בין will ל-going to בהקשר ברור.` (utils/fast-diagnostic-engine/probe-map-he.js:156)
8. **high** [mixed_or_unclear/guidance_diagnostic] — `לבדוק צורת perfect מול זמן פשוט באותו הקשר.` (utils/fast-diagnostic-engine/probe-map-he.js:161)
9. **high** [mixed_or_unclear/guidance_diagnostic] — `לבודד if/when עם צורת פועל מתאימה בגוף אחד.` (utils/fast-diagnostic-engine/probe-map-he.js:166)
10. **high** [mixed_or_unclear/guidance_diagnostic] — `לבודד משפטים עם I/he/they ולבחור צורת be מתאימה.` (utils/fast-diagnostic-engine/probe-map-he.js:208)
11. **high** [mixed_or_unclear/guidance_diagnostic] — `לבודד משפטי שאלה קצרים עם do/does/is/are במקום הנכון.` (utils/fast-diagnostic-engine/probe-map-he.js:228)
12. **high** [mixed_or_unclear/guidance_diagnostic] — `להבחין בין some/many/much במשפט קצר.` (utils/fast-diagnostic-engine/probe-map-he.js:238)
13. **high** [mixed_or_unclear/guidance_diagnostic] — `לבחור בין will ל-going to בהקשר ברור.` (utils/fast-diagnostic-engine/probe-map-he.js:248)
14. **high** [mixed_or_unclear/guidance_diagnostic] — `לבדוק perfect מול זמן פשוט באותו הקשר.` (utils/fast-diagnostic-engine/probe-map-he.js:253)
15. **high** [mixed_or_unclear/guidance_diagnostic] — `לבודד if/when עם צורת פועל מתאימה.` (utils/fast-diagnostic-engine/probe-map-he.js:258)
16. **high** [mixed_or_unclear/guidance_diagnostic] — `ב${topicName} נראה דפוס עקבי (${w} טעויות בטווח; ריכוז דומה של סוג הקושי). ${tagLab ? ` (utils/fast-diagnostic-engine/run-fast-diagnosis-for-unit.js:160)
17. **high** [mixed_or_unclear/guidance_diagnostic] — `השערה ראשונית ב${topicName}: חוזרות על אותו סוג טעות — כדאי לאמת בהמשך עם עוד דוגמאות. ${tagLab ? ` (utils/fast-diagnostic-engine/run-fast-diagnosis-for-unit.js:165)
18. **high** [mixed_or_unclear/guidance_diagnostic] — `סימן ראשוני ב${topicName}${tagLab ? ` (utils/fast-diagnostic-engine/run-fast-diagnosis-for-unit.js:170)
19. **medium** [teacher/subject_permission] — `אין מספיק נתונים` (components/teacher-portal/SubjectSummaryCards.jsx:10)
20. **medium** [teacher/subject_permission] — `אין מספיק נתונים לפי מקצוע` (components/teacher-portal/SubjectSummaryCards.jsx:66)
21. **medium** [teacher/teacher_dashboard] — `אין מספיק נתונים` (components/teacher-portal/TeacherDashboardClient.jsx:83)
22. **medium** [teacher/teacher_dashboard] — `עדיין אין מספיק נתונים` (components/teacher-portal/TeacherDashboardClient.jsx:597)
23. **medium** [teacher/teacher_dashboard] — `דורש התערבות מיידית` (components/teacher-portal/TeacherDashboardClient.jsx:637)
24. **medium** [teacher/teacher_dashboard] — `דורש התערבות מיידית` (components/teacher-portal/TeacherDashboardClient.jsx:641)
25. **medium** [school_manager/school_admin_ui] — `אין מספיק נתונים` (lib/school-portal/school-report-view-model.js:585)
26. **medium** [school_manager/school_admin_ui] — `אין מספיק נתונים` (lib/school-portal/school-ui.he.js:241)
27. **medium** [teacher/report_general] — `לא היו מפגשי תרגול בתקופה` (lib/teacher-portal/teacher-ui.he.js:25)
28. **medium** [teacher/report_general] — `לא הייתה פעילות בתקופה` (lib/teacher-portal/teacher-ui.he.js:28)
29. **medium** [teacher/report_general] — `אין מספיק נתונים לניתוח` (lib/teacher-portal/teacher-ui.he.js:29)
30. **medium** [teacher/report_general] — `דורש התערבות מיידית` (lib/teacher-portal/teacher-ui.he.js:45)

## Scan scope

Primary roots: pages/teacher, pages/school, components/teacher-portal, components/school-portal, components/reporting, lib/teacher-portal, lib/school-portal, lib/teacher-server, lib/school-server, classroom-activities, diagnostic Hebrew utils, teacher/school report APIs.

Excluded: regular parent-report copy (except teacher parent-report preview page in pages/teacher), student game copy, live classroom docs, review-packages staging copies.

## Notes

- No product source code was modified.
- `suggested_replacement` columns are empty — pending owner review.
- Teachers may receive more professional language than parents; raw engine keys and unexplained jargon are flagged.
- Excel: `reports/teacher-school-report-hebrew-copy-inventory.xlsx`
