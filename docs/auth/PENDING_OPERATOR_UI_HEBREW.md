# Pending operator UI Hebrew — owner approval required

**Status:** UI currently uses interim **English** readable grant labels via `lib/school-portal/operator-grant-labels.js` until owner approves Hebrew below.

## Proposed Hebrew labels (awaiting approval)

| Key | Technical grant | Proposed Hebrew | Usage |
|-----|-----------------|-----------------|-------|
| `SCHOOL_NAV_OPERATORS` | — | מזכיר/ות בית ספר | School manager side nav |
| `SCHOOL_OPERATORS_TITLE` | — | מזכיר/ות וצוות תפעול | Operators list page title |
| `SCHOOL_INVITE_OPERATOR_SECTION` | — | הוספת מזכיר/ה לבית הספר | Operator invite form heading |
| `SCHOOL_INVITE_OPERATOR_SUBMIT` | — | הזמנת מזכיר/ה | Operator invite submit button |
| `SCHOOL_OPERATOR_IDENTITY` | — | פרטי מפעיל/ת | Operator detail identity section |
| `SCHOOL_OPERATOR_NO_TEACHING` | — | מפעיל/ת — ללא הרשאות מקצוע וללא פעילויות הוראה | Operator subtitle / disclaimer |
| `SCHOOL_OPERATOR_DASHBOARD_TITLE` | — | ממשק מפעיל/ת | Operator home heading |
| `SCHOOL_OPERATOR_GRANT_ACCESS_ADMIN` | `student_access_admin` | ניהול גישות ו-PIN לתלמידים/הורים | Grant toggle label |
| `SCHOOL_OPERATOR_GRANT_DATA_VIEWER` | `student_data_viewer` | צפייה בדוחות ופרטי תלמידים | Grant toggle label |

## Already implemented (staff invite — not pending)

| Key | Hebrew | Usage |
|-----|--------|-------|
| `SCHOOL_INVITE_TEACHER_SECTION` | הוספת מורה לבית הספר | Teacher invite form |
| `SCHOOL_INVITE_TEACHER_SUBMIT` | הזמנת מורה | Teacher invite button |
| `SCHOOL_INVITE_EMAIL` | דוא״ל של חשבון המשתמש | Email field on staff invite |
| `ADMIN_NAV_PARENTS` | הורים רשומים | Platform admin nav |

## Interim English (until grant Hebrew approved)

- `student_access_admin` → "Manage student/parent access and PINs"
- `student_data_viewer` → "View student reports and details"

After owner approval, replace entries in `operator-grant-labels.js` with approved Hebrew constants from `school-ui.he.js`.
