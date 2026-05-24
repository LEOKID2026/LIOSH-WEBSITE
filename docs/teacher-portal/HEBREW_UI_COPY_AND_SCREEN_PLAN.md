# Hebrew UI Copy & Screen Plan — Teacher Portal + Guardian Access

**Status:** AWAITING OWNER APPROVAL — Do not implement until approved.  
**Phase:** Pre-implementation approval pack  
**Date:** 2026-05-25  
**Scope:** All teacher-facing screens + guardian access screens  
**Rules:** Hebrew only for visible product text. No legal jargon. No PII exposure. No engine keys.

---

## Table of Contents

1. [Feature Flags & Activation Checklist](#1-feature-flags--activation-checklist)
2. [Screen: Teacher Login (`/teacher/login`)](#2-screen-teacher-login-teacherlogin)
3. [Screen: Teacher Dashboard (`/teacher/dashboard`)](#3-screen-teacher-dashboard-teacherdashboard)
4. [Screen: Teacher Student Report (`/teacher/student/[studentId]`)](#4-screen-teacher-student-report-teacherstudentstudenid)
5. [Screen: Teacher Class Report (`/teacher/class/[classId]`)](#5-screen-teacher-class-report-teacherclassclassid)
6. [Screen: Guardian Access Management (within dashboard)](#6-screen-guardian-access-management-within-dashboard)
7. [Screen: Guardian Login (`/guardian/login`)](#7-screen-guardian-login-guardianlogin)
8. [Screen: Guardian View (`/guardian/view`)](#8-screen-guardian-view-guardianview)
9. [Shared Components & Reuse Notes](#9-shared-components--reuse-notes)
10. [Open Questions for Owner](#10-open-questions-for-owner)
11. [Owner Approval Checklist](#11-owner-approval-checklist)

---

## 1. Feature Flags & Activation Checklist

All teacher and guardian screens are fully behind feature flags.
**No screen renders visible Hebrew copy until the corresponding flag is set to `true`.**

| Flag | Current value (dev) | Required for visible UI | Notes |
|------|--------------------|--------------------------|-|
| `TEACHER_PORTAL_ENABLED` | `true` | Routes accessible | Already on in dev |
| `TEACHER_PORTAL_UI_COPY_ENABLED` | `false` | Hebrew copy visible on teacher screens | **Flip only after owner approves this doc** |
| `TEACHER_PORTAL_LINK_ENABLED` | `true` | Link flow visible | Already on in dev |
| `TEACHER_PORTAL_INVITE_ONLY` | `true` | No public signup shown | Keep `true` always |
| `GUARDIAN_PORTAL_ENABLED` | `true` | Guardian routes accessible | Already on in dev |
| `GUARDIAN_PORTAL_UI_COPY_ENABLED` | `false` | Hebrew copy visible on guardian screens | **Flip only after owner approves this doc** |

**Safe activation order after approval:**
1. Owner approves Hebrew copy in this document.
2. Developer sets `TEACHER_PORTAL_UI_COPY_ENABLED=true` and `GUARDIAN_PORTAL_UI_COPY_ENABLED=true`.
3. Internal smoke test with real user session.
4. Soft launch.

---

## 2. Screen: Teacher Login (`/teacher/login`)

### Route & Purpose

| Field | Value |
|---|---|
| Route | `/teacher/login` |
| Purpose | Authenticated entry point for teacher accounts. No public signup. Accounts created by admin/invite only. |
| Auth flow | Supabase email + password. Auto-redirects to `/teacher/dashboard` if already logged in. |
| Flag gate | `TEACHER_PORTAL_ENABLED=true` (redirects to `/` if false) |
| Copy gate | `TEACHER_PORTAL_UI_COPY_ENABLED=true` (shows only skeleton/blank otherwise) |

### Hebrew Copy

| Element | Hebrew |
|---|---|
| Page `<title>` | `כניסה למורים — לִישׁ` |
| Main heading `<h1>` | `כניסה למורים` |
| Invite-only notice (small text below heading) | `הכניסה מיועדת למורים שהתווספו על ידי צוות לִישׁ.` |
| Email label | `כתובת דוא״ל` |
| Email placeholder | `המייל שלך` |
| Password label | `סיסמה` |
| Password placeholder | *(ריק — לא להוסיף טקסט)* |
| Submit button (idle) | `כניסה` |
| Submit button (loading) | `מתחבר…` |

### Error States

| State / `data-state` | Cause | Hebrew message shown to user |
|---|---|---|
| `login_failed` (generic) | Wrong email/password, or not a teacher account | `כתובת הדוא״ל או הסיסמה שגויים. אם אתה מורה רשום — נסה שנית.` |
| `feature_disabled` (silent redirect) | Portal disabled server-side | Silent redirect to `/` — no message shown |
| `not_a_teacher` (silent redirect) | Valid Supabase account but no teacher role | Silent redirect to `/` — no message shown |

### Empty / Loading State

| State | Hebrew |
|---|---|
| Page loading / client hydrating | *(no visible text — spinner or blank)* |

### Data Shown / Hidden

| Shown | Hidden |
|---|---|
| Email field, Password field, Submit button, Invite-only notice | Any student data, parent data, teacher ID, internal error codes |

### Privacy Notes

- Never display the reason "you don't have teacher access" explicitly — silent redirect prevents enumeration.
- No "forgot password" link on teacher login — admin resets externally.

### Layout — Mobile

- Single centered card, max-width 420px, full-width padding on small screens.
- Form direction: RTL (Hebrew).
- Password field shows toggle-eye icon (standard browser behavior acceptable).

### Layout — Desktop

- Same centered card on white background.
- Reuse existing `<Layout>` site wrapper (same header/footer as parent login).

### Reuse

- Reuses: `components/Layout`.
- Does **not** reuse the parent login component (separate form, separate auth flow).

---

## 3. Screen: Teacher Dashboard (`/teacher/dashboard`)

### Route & Purpose

| Field | Value |
|---|---|
| Route | `/teacher/dashboard` |
| Purpose | Main hub for the teacher: plan summary, linked students list, classes list. |
| Auth | Teacher bearer token required. Auto-redirects to `/teacher/login` if not authenticated. |
| Flag gate | `TEACHER_PORTAL_ENABLED=true` |
| Copy gate | `TEACHER_PORTAL_UI_COPY_ENABLED=true` |

### Hebrew Copy — Page Header

| Element | Hebrew |
|---|---|
| Page `<title>` | `לוח בקרה — מורים — לִישׁ` |
| Main heading `<h1>` | `לוח הבקרה שלי` |
| Logged-in teacher name (if set) | `שלום, [displayName]` |
| Logged-in teacher name (if not set) | `שלום` |
| Logout button | `יציאה` |

### Hebrew Copy — Plan / Limits Card

| Element | Hebrew |
|---|---|
| Card heading | `מנוי וגבולות` |
| Students usage | `תלמידים מקושרים: [X] מתוך [Y]` |
| Classes usage | `כיתות פעילות: [X] מתוך [Y]` |
| Plan name (basic plan) | `תוכנית בסיסית` |

### Hebrew Copy — Students Section

| Element | Hebrew |
|---|---|
| Section heading | `התלמידים שלי` |
| Student row: display name | `[שם התלמיד]` |
| Student row: link to report | `צפה בדוח` |
| Empty state (no students yet) | `עדיין לא קישרת תלמידים. ניתן לקשר תלמיד לאחר שהורה מאשר.` |
| "Add student" note (when link enabled) | `לקישור תלמיד חדש — בקש מההורה לשלוח לך קוד הסכמה.` |

### Hebrew Copy — Classes Section

| Element | Hebrew |
|---|---|
| Section heading | `הכיתות שלי` |
| Active class row: class name | `[שם הכיתה]` |
| Active class row: member count | `[N] תלמידים` |
| Active class row: link to class report | `דוח כיתה` |
| Archived class row note | `(כיתה בארכיון)` |
| Create class button | `כיתה חדשה` |
| Empty state (no classes yet) | `עדיין אין כיתות. לחץ על "כיתה חדשה" כדי להתחיל.` |
| Create class modal — name label | `שם הכיתה` |
| Create class modal — name placeholder | `למשל: כיתה ד׳ 2026` |
| Create class modal — confirm button | `צור כיתה` |
| Create class modal — cancel button | `ביטול` |
| Class limit reached error | `הגעת למספר הכיתות המרבי בתוכנית שלך.` |

### Error States

| State / `data-state` | Hebrew |
|---|---|
| `data_load_error` | `אירעה שגיאה בטעינת הנתונים. רענן את הדף ונסה שנית.` |
| `schema_not_ready` | `המערכת עדיין מתכוננת. נסה שנית בעוד מספר דקות.` |

### Loading State

| State | Hebrew |
|---|---|
| `loading` | *(spinner בלבד, ללא טקסט)* |

### Data Shown

- `displayName` (teacher)
- `planCode` (as plan label)
- `activeStudentLinks` / `studentLimit`
- `activeClasses` / `classLimit`
- Student display names (masked: first name + last initial, e.g. "דן כ.")
- Class names, active member count
- Links to student reports, class reports

### Data Hidden

- Teacher auth email
- Teacher internal ID (`teacherId`)
- Parent names, parent email, parent PII of any kind
- Raw plan code key (show translated label instead)
- Internal error codes

### Privacy Notes

- Student full name is masked server-side (first name + last initial). Do not show full surname in the list.
- No parent information is ever shown on teacher screens.

### Layout — Mobile

- Stacked sections: plan card → students section → classes section.
- Each student row is a full-width tap target.
- Create class button is a floating action button or full-width bottom button.

### Layout — Desktop

- Two-column layout: left = students, right = classes.
- Plan card at top spanning full width.

### Reuse

- Reuses: `components/Layout`.
- Student name masking: already handled server-side in `teacher-students.server.js` (`maskStudentFullName`).

---

## 4. Screen: Teacher Student Report (`/teacher/student/[studentId]`)

### Route & Purpose

| Field | Value |
|---|---|
| Route | `/teacher/student/[studentId]` |
| Purpose | Detailed per-student pedagogical report. Teacher-only view. No parent PII. |
| Auth | Teacher bearer token. Validates student is linked to this teacher. |
| Flag gate | `TEACHER_PORTAL_ENABLED=true` |
| Copy gate | `TEACHER_PORTAL_UI_COPY_ENABLED=true` |

### Hebrew Copy — Page Header

| Element | Hebrew |
|---|---|
| Page `<title>` | `דוח תלמיד — [שם] — לִישׁ` |
| Back link | `← חזרה ללוח הבקרה` |
| Page heading | `דוח תלמיד: [שם מוסווה]` |
| Report range note | `נתונים מ-30 הימים האחרונים` |

### Hebrew Copy — Summary Card

| Field | Hebrew label |
|---|---|
| Total sessions | `מפגשי תרגול` |
| Total answers | `תשובות` |
| Overall accuracy | `אחוז הצלחה` |
| Last active | `פעילות אחרונה` |
| Days inactive | `לא פעיל [N] ימים` |
| Inactivity warning | `התלמיד לא תרגל ביותר מ-7 ימים.` |

### Hebrew Copy — Subject Summary

| Field | Hebrew label |
|---|---|
| Section heading | `ביצועים לפי מקצוע` |
| Subject: math | `מתמטיקה` |
| Subject: geometry | `גיאומטריה` |
| Subject: hebrew | `עברית` |
| Subject: english | `אנגלית` |
| Subject: science | `מדע` |
| Subject: geography | `גאוגרפיה` |
| Per-subject: answers | `תשובות` |
| Per-subject: accuracy | `הצלחה` |
| Per-subject: sessions | `מפגשים` |
| Insufficient data for subject | `אין מספיק נתונים` |

### Hebrew Copy — Teacher Guidance Block (`teacherGuidanceBlock`)

| Field | Hebrew label |
|---|---|
| Section heading | `המלצות לי כמורה` |
| Overall status: strong | `מצוין — התלמיד מצליח בכלל המקצועות` |
| Overall status: on_track | `תקין — התלמיד בקצב תקין` |
| Overall status: needs_attention | `דורש תשומת לב` |
| Overall status: at_risk | `בסיכון — מומלץ לתת תמיכה מיוחדת` |
| Overall status: insufficient_data | `אין מספיק נתונים לניתוח` |
| inactiveWarning (shown when present) | `⚠ התלמיד לא תרגל ביותר מ-7 ימים — מומלץ לעקוב.` |

### Hebrew Copy — Next Practice Focus (`nextPracticeFocus`)

| Field | Hebrew label |
|---|---|
| Section heading | `על מה להתמקד בתרגול הבא` |
| Focus item: subject | מקצוע (translated label per subject, see above) |
| Focus item: topic | `נושא: [topic key — translated, see below]` |
| Focus item: urgency — high | `דחוף` |
| Focus item: urgency — medium | `ממוצע` |
| Focus item: urgency — low | `נמוך` |
| No focus items | `אין נושאים דחופים כרגע — המשך כרגיל.` |

### Hebrew Copy — Risk Signals (`riskSignals`)

| Field | Hebrew label |
|---|---|
| Section heading | `אותות אזהרה` |
| Signal: inactivity | `חוסר פעילות ממושך` |
| Signal: low_accuracy_math | `קשיים במתמטיקה` |
| Signal: low_accuracy_hebrew | `קשיים בעברית` |
| Signal: low_accuracy_english | `קשיים באנגלית` |
| Signal: low_accuracy_science | `קשיים במדע` |
| Signal: low_accuracy_geometry | `קשיים בגיאומטריה` |
| Signal: low_accuracy_geography | `קשיים בגאוגרפיה` |
| No signals | `לא זוהו אותות אזהרה בתקופה זו.` |

### Hebrew Copy — Strengths (`strengths`)

| Field | Hebrew label |
|---|---|
| Section heading | `חוזקות` |
| Strength item | `[שם מקצוע] — [N]% הצלחה` |
| No strengths data | `אין מספיק נתונים להצגת חוזקות.` |

### Hebrew Copy — Support Suggestions (`supportSuggestions`)

| Field | Hebrew label |
|---|---|
| Section heading | `הצעות לתמיכה` |
| Suggestion item (bullet) | *(הטקסט המלא — ראה הערות בהמשך)* |
| No suggestions | `אין הצעות מיוחדות לתקופה זו.` |

> **Note on suggestion text:** Support suggestions are currently generated as English developer strings. Before implementation, each string key must be translated. A full translation table is in [Open Questions #1](#10-open-questions-for-owner).

### Hebrew Copy — Guardian Access Summary (`guardianAccessSummary`)

| Field | Hebrew label |
|---|---|
| Section heading | `גישת הורה` |
| No guardian access | `לא הוגדרה גישת הורה לתלמיד זה.` |
| Active access row | `גישה פעילה — פג תוקף: [תאריך]` |
| Expired access row | `גישה פגת תוקף` |
| Revoked access row | `גישה בוטלה` |
| Manage link | `ניהול גישת הורה` |

### Error States

| State / `data-state` | Hebrew |
|---|---|
| `forbidden` | `אין לך הרשאה לצפות בדוח תלמיד זה.` |
| `load_error` | `אירעה שגיאה בטעינת הדוח. רענן ונסה שנית.` |
| `invalid_student` | `מזהה תלמיד שגוי.` |
| `unauthenticated` (silent) | redirect to `/teacher/login` — no message |

### Loading State

| State | Hebrew |
|---|---|
| `loading` | *(spinner בלבד)* |

### Data Shown

- Masked student name (first name + last initial)
- Subject-level stats (sessions, answers, accuracy)
- Teacher guidance block (status, weak topics, strengths, suggestions)
- Next practice focus (subject + topic, urgency)
- Risk signals
- Guardian access summary (status only — no username/PIN/token)

### Data Hidden

- Full student surname
- Parent name, parent email, parent ID
- Copilot / AI conversations
- Raw internal field names / keys
- Access usernames, PINs, tokens

### Privacy Notes

- `teacherGuidanceBlock` is teacher-only — never exposed to guardian view.
- `guardianAccessSummary` shows status only; credentials are shown once at creation and never again.

### Layout — Mobile

- Stacked accordion sections (tap to expand): Summary → Subjects → Guidance → Focus → Risks → Strengths → Suggestions → Guardian Access.
- Subject section uses horizontal scroll cards.

### Layout — Desktop

- Two-column: left = summary + subjects, right = guidance + suggestions + guardian access.

### Reuse

- Reuses `components/Layout`.
- Subject color coding can reuse existing parent report subject style tokens if present.

---

## 5. Screen: Teacher Class Report (`/teacher/class/[classId]`)

### Route & Purpose

| Field | Value |
|---|---|
| Route | `/teacher/class/[classId]` |
| Purpose | Cohort-level pedagogical report for a single class. Aggregated from all active members. |
| Auth | Teacher bearer token. Class must be owned by this teacher. |
| Flag gate | `TEACHER_PORTAL_ENABLED=true` |
| Copy gate | `TEACHER_PORTAL_UI_COPY_ENABLED=true` |

### Hebrew Copy — Page Header

| Element | Hebrew |
|---|---|
| Page `<title>` | `דוח כיתה — [שם הכיתה] — לִישׁ` |
| Back link | `← חזרה ללוח הבקרה` |
| Page heading | `דוח כיתה: [שם הכיתה]` |
| Member count note | `[N] תלמידים פעילים` |
| Report range note | `נתונים מ-30 הימים האחרונים` |

### Hebrew Copy — Class Summary Card

| Field | Hebrew label |
|---|---|
| Total sessions (class aggregate) | `סה״כ מפגשי תרגול בכיתה` |
| Total answers | `סה״כ תשובות` |
| Class average accuracy | `אחוז הצלחה ממוצע` |
| Students with data | `תלמידים עם נתונים` |
| Students without data | `תלמידים ללא נתונים` |

### Hebrew Copy — Cohort Subject Summary

| Field | Hebrew label |
|---|---|
| Section heading | `ביצועי הכיתה לפי מקצוע` |
| Same subject labels as student report (§4 above) | *(see §4)* |
| Cohort average per subject | `ממוצע כיתתי: [N]%` |

### Hebrew Copy — Weak Subjects / Topics (`weakSubjects`)

| Field | Hebrew label |
|---|---|
| Section heading | `נושאים שדורשים חיזוק` |
| Row: subject + topic | `[מקצוע] → [נושא]: [N]% הצלחה ממוצע` |
| No weak topics | `לא זוהו נושאים בעייתיים בתקופה זו.` |

### Hebrew Copy — Students Needing Attention (`attentionStudents`)

| Field | Hebrew label |
|---|---|
| Section heading | `תלמידים שדורשים מעקב` |
| Student row (name masked) | `[שם מוסווה]` |
| Reason: inactivity | `לא פעיל זמן ממושך` |
| Reason: low accuracy | `קשיים בביצועים` |
| Link to student report | `צפה בדוח` |
| No attention students | `כל תלמידי הכיתה בסדר — אין צורך בהתערבות מיוחדת.` |

### Hebrew Copy — Suggested Groups (`suggestedGroups`)

| Field | Hebrew label |
|---|---|
| Section heading | `קבוצות עבודה מוצעות` |
| Group: struggling | `קבוצת תמיכה ([N] תלמידים)` |
| Group: on_track | `קבוצת חיזוק ([N] תלמידים)` |
| Group: advanced | `קבוצת התקדמות ([N] תלמידים)` |
| No groups possible | `אין מספיק נתונים להרכבת קבוצות.` |
| Note below groups | `*קבוצות מחושבות על בסיס ביצועים — המורה מחליט סופית.` |

### Hebrew Copy — Next Lesson Focus (`nextLessonFocus`)

| Field | Hebrew label |
|---|---|
| Section heading | `מיקוד השיעור הבא` |
| Focus subject | `[מקצוע]` |
| Focus topic | `נושא: [תרגום]` |
| Focus justification | `[N]% מהתלמידים התקשו בנושא זה.` |
| No clear focus | `אין נושא בולט לשיעור הבא — המשך לפי תכנית הלימודים.` |

### Hebrew Copy — Reinforcement Suggestions (`reinforcementSuggestions`)

| Field | Hebrew label |
|---|---|
| Section heading | `הצעות לחיזוק` |
| Item (bullet) | *(תרגום מלא — ראה שאלות פתוחות)* |
| No suggestions | `אין הצעות חיזוק מיוחדות לתקופה זו.` |

### Hebrew Copy — Extension Suggestions (`extensionSuggestions`)

| Field | Hebrew label |
|---|---|
| Section heading | `הצעות להעשרה` |
| Item (bullet) | *(תרגום מלא — ראה שאלות פתוחות)* |
| No suggestions | `אין הצעות העשרה לתקופה זו.` |

### Hebrew Copy — Insufficient Data States

| Condition | Hebrew |
|---|---|
| Class has 0 active members | `הכיתה ריקה — הוסף תלמידים כדי לראות דוח.` |
| Class has members but no activity data | `אין עדיין נתוני תרגול לכיתה זו.` |
| Fewer than 3 students with data (groups not shown) | `אין מספיק תלמידים עם נתונים להרכבת קבוצות.` |
| `insufficient_data` flag on guidance | `לא ניתן לחשב המלצות — אין מספיק נתונים בתקופה זו.` |

### Error States

| State / `data-state` | Hebrew |
|---|---|
| `forbidden` | `אין לך הרשאה לצפות בדוח כיתה זו.` |
| `load_error` | `אירעה שגיאה בטעינת הדוח. רענן ונסה שנית.` |
| `invalid_class` | `מזהה כיתה שגוי.` |

### Data Shown

- Class name
- Aggregated subject stats
- Weak topics (subject + topic key, translated)
- Attention students list (masked names)
- Suggested groups (tiers: struggling / on_track / advanced)
- Next lesson focus
- Reinforcement/extension suggestions

### Data Hidden

- Individual student full names (masked)
- Parent info
- Copilot fields
- Raw UUIDs
- Per-student raw data (links to student report only)

### Privacy Notes

- Student names in attention list are masked (first name + last initial).
- Do not aggregate or display student scores in a way that creates a sortable "ranking" visible to other students. This screen is teacher-only.

### Layout — Mobile

- Collapsible sections, each with a heading and expand arrow.
- Suggested groups shown as horizontal color-coded chips.

### Layout — Desktop

- Main column: class summary + subjects + weak topics + attention students.
- Side panel (right): next lesson focus + suggested groups + suggestions.

### Reuse

- Reuses `components/Layout`.
- Attention students list reuses same student-row component as dashboard.

---

## 6. Screen: Guardian Access Management (within dashboard)

> **Route context:** Guardian access management is shown inside the teacher student report screen (`/teacher/student/[studentId]`), in the "Guardian Access" section. It is NOT a separate route.

### Purpose

The teacher creates a login credential for a guardian (typically a parent or other trusted adult) so they can view a limited child report without a full parent account.

### Hebrew Copy — Access List

| Element | Hebrew |
|---|---|
| Section heading | `גישת הורה` |
| No access row | `לא הוגדרה גישת הורה לתלמיד זה.` |
| Access row: label | `כניסה: [שם משתמש]` |
| Access row: status active | `פעילה — פג תוקף [תאריך בעברית]` |
| Access row: status expired | `פגת תוקף` |
| Access row: status revoked | `בוטלה` |
| Create new access button | `צור גישה חדשה להורה` |

### Hebrew Copy — Create Access Flow

| Element | Hebrew |
|---|---|
| Modal / section heading | `יצירת גישה להורה` |
| Expiry label | `תוקף הגישה` |
| Expiry option: 30 days | `30 יום` |
| Expiry option: 60 days | `60 יום` |
| Expiry option: 90 days | `90 יום` |
| Confirm button | `צור גישה` |
| Cancel button | `ביטול` |

### Hebrew Copy — Shown-Once Credentials Warning

This warning is shown **immediately after creation** and **never again**. The credentials themselves (username + PIN) are shown once only.

| Element | Hebrew |
|---|---|
| Warning banner | `⚠ שמור את הפרטים האלה — לא יוצגו שוב.` |
| Username label | `שם משתמש:` |
| PIN label | `קוד כניסה:` |
| Magic link label | `קישור כניסה מהיר:` |
| Copy username button | `העתק שם משתמש` |
| Copy PIN button | `העתק קוד` |
| Copy link button | `העתק קישור` |
| Close / dismiss button | `סגור — שמרתי את הפרטים` |
| Warning text below credentials | `הקישור המהיר תקף ל-7 ימים בלבד. שם המשתמש והקוד תקפים עד [תאריך].` |

### Hebrew Copy — Revoke Access

| Element | Hebrew |
|---|---|
| Revoke button | `בטל גישה` |
| Confirm dialog title | `ביטול גישת הורה` |
| Confirm dialog body | `לאחר הביטול ההורה לא יוכל להיכנס. פעולה זו בלתי הפיכה.` |
| Confirm button | `כן, בטל גישה` |
| Cancel button | `ביטול` |

### Hebrew Copy — Rotate PIN

| Element | Hebrew |
|---|---|
| Rotate PIN button | `חדש קוד כניסה` |
| Confirm dialog title | `חידוש קוד הכניסה` |
| Confirm dialog body | `הקוד הנוכחי יבוטל ויופק קוד חדש. שמור את הקוד החדש — הוא יוצג פעם אחת בלבד.` |
| Confirm button | `חדש קוד` |
| Cancel button | `ביטול` |
| New PIN shown-once label | `קוד כניסה חדש:` |

### Hebrew Copy — Rotate Username

| Element | Hebrew |
|---|---|
| Rotate username button | `שנה שם משתמש` |
| Confirm dialog title | `שינוי שם המשתמש` |
| Confirm dialog body | `שם המשתמש הנוכחי יבוטל. שם המשתמש החדש יוצג פעם אחת בלבד.` |
| Confirm button | `שנה שם משתמש` |
| Cancel button | `ביטול` |
| New username shown-once label | `שם משתמש חדש:` |

### Access Status Labels (reused across screens)

| API value | Hebrew display |
|---|---|
| `active` | `פעילה` |
| `expired` | `פגת תוקף` |
| `revoked` | `בוטלה` |

### Error States

| Error code | Hebrew |
|---|---|
| `student_not_linked` | `אין לך גישה לניהול תלמיד זה.` |
| `access_already_exists` | `כבר קיימת גישה פעילה לתלמיד זה.` |
| `internal_error` | `אירעה שגיאה. נסה שנית.` |

### Privacy Notes

- PIN and username are shown exactly once (on create/rotate) and never stored in visible form on subsequent loads.
- Magic link token is shown once and expires after 7 days.
- Teacher must communicate credentials to the guardian directly (outside the app).
- No email is sent automatically — teacher delivers credentials manually.

### Layout — Mobile

- "Create access" button anchored to bottom of guardian section.
- Shown-once credentials displayed in a full-screen modal with prominent warning.
- Copy buttons are large tap targets.

### Layout — Desktop

- Shown-once credentials displayed in an inline callout box with copy buttons.

---

## 7. Screen: Guardian Login (`/guardian/login`)

### Route & Purpose

| Field | Value |
|---|---|
| Route | `/guardian/login` |
| Purpose | Guardian (limited access holder) enters username + PIN issued by the teacher to view one child's report. |
| Auth flow | POST to `/api/guardian/login` with `loginUsername` + `pin` (cookie-based session). Auto-login via `?invite=<token>` magic link. |
| Flag gate | `GUARDIAN_PORTAL_ENABLED=true` (redirects to `/` if false) |
| Copy gate | `GUARDIAN_PORTAL_UI_COPY_ENABLED=true` |

### Hebrew Copy

| Element | Hebrew |
|---|---|
| Page `<title>` | `כניסה לצפייה בדוח ילד — לִישׁ` |
| Main heading `<h1>` | `כניסה לצפייה בדוח` |
| Explanatory subtitle | `קיבלתם פרטי כניסה מהמורה? הכניסו אותם כאן.` |
| Username label | `שם משתמש` |
| Username placeholder | `שם המשתמש שקיבלת` |
| PIN label | `קוד כניסה` |
| PIN placeholder | `הקוד שקיבלת` |
| Submit button (idle) | `כניסה` |
| Submit button (loading) | `מתחבר…` |

### Magic Link State

| Element | Hebrew |
|---|---|
| Auto-login spinner text | `מתחבר דרך הקישור…` |
| Invite link failed | `הקישור לא תקף או פג תוקפו. בקשו מהמורה קישור חדש.` |

### Error States

| State / `data-state` | Cause | Hebrew |
|---|---|---|
| `login_failed` | Wrong username or PIN | `שם המשתמש או הקוד שגויים. פנו למורה לקבלת פרטים מעודכנים.` |
| Expired access (server returns `session_revoked` / `access_expired`) | Access expired or revoked | `הגישה שלכם פגה תוקפה או בוטלה. פנו למורה לחידוש.` |
| `invite_failed` | Magic link invalid/expired | *(see Magic Link State above)* |

### Data Shown / Hidden

| Shown | Hidden |
|---|---|
| Username field, PIN field, Submit button, Subtitle | Student data (loaded only after successful login), teacher name, parent data |

### Privacy Notes

- No "forgot PIN" flow — guardian must contact teacher.
- Do not show whether an account exists for a given username (no enumeration message).
- Error message is the same for "wrong username" and "wrong PIN".

### Layout — Mobile

- Single centered card.
- PIN field: `inputMode="numeric"` keyboard on mobile.
- Form direction: RTL.

### Layout — Desktop

- Same centered card, max-width 420px.
- Reuses `<Layout>`.

---

## 8. Screen: Guardian View (`/guardian/view`)

### Route & Purpose

| Field | Value |
|---|---|
| Route | `/guardian/view` |
| Purpose | Read-only, limited view of one child's learning progress. No editing, no other students, no copilot, no parent dashboard. |
| Auth | Cookie-based guardian session (`liosh_guardian_session`). Auto-redirects to `/guardian/login` if not authenticated. |
| Flag gate | `GUARDIAN_PORTAL_ENABLED=true` |
| Copy gate | `GUARDIAN_PORTAL_UI_COPY_ENABLED=true` |

### Hebrew Copy — Page Header

| Element | Hebrew |
|---|---|
| Page `<title>` | `דוח ילד — לִישׁ` |
| Main heading `<h1>` | `דוח הלמידה של [שם מוצג של הילד]` |
| Limited access notice (persistent banner) | `אתם צופים בדוח מוגבל שהוגדר עבורכם על ידי המורה. גישה זו מוגבלת לילד אחד.` |
| Logout button | `יציאה` |

### Hebrew Copy — Subject Summary

Identical subject labels to §4 above.

| Field | Hebrew |
|---|---|
| Section heading | `ביצועים לפי מקצוע` |
| Per-subject: sessions | `מפגשים` |
| Per-subject: answers | `תשובות` |
| Per-subject: accuracy | `אחוז הצלחה` |
| Insufficient data | `אין מספיק נתונים עדיין` |

### Hebrew Copy — Activity Summary

| Field | Hebrew |
|---|---|
| Section heading | `סיכום פעילות` |
| Total sessions | `מפגשי תרגול` |
| Last active | `פעיל לאחרונה` |
| No recent activity | `לא היה תרגול בתקופה האחרונה.` |

### Hebrew Copy — Access Expiry Notice

| Condition | Hebrew |
|---|---|
| Access expires in ≤7 days | `⚠ הגישה שלכם לדוח זה תפוג בקרוב ([תאריך]). פנו למורה לחידוש.` |

### Error States

| State / `data-state` | Hebrew |
|---|---|
| `error` (guardian me failed) | `אירעה שגיאה. נסו להיכנס שנית.` |
| `scope_violation` | `אין לכם גישה לדוח זה.` |
| `report_error` | `לא ניתן לטעון את הדוח כרגע. נסו שנית מאוחר יותר.` |

### Data Shown (Guardian-Visible Fields)

- Child's display name (not full name)
- Subject-level stats: sessions, answers, accuracy
- Daily/weekly activity summary
- Access expiry date

### Data Hidden — Guardian View MUST NOT Show

| Hidden field | Reason |
|---|---|
| Parent name, parent email | Parent PII |
| Parent ID, parent internal IDs | PII |
| `copilot`, `copilotLastResponse` | AI conversation data |
| `teacherGuidanceBlock` | Teacher-only content |
| `guardianAccessSummary` | Internal access management data |
| Gamification data (coins, awards) | Not part of guardian scope |
| Other children's data | Single-child access only |
| Topic-level breakdowns (raw keys) | Technical keys not suitable for guardians |

### Privacy Notes

- Guardian sees **exactly one child** — the one tied to their session. No switcher, no list.
- The limited-access banner must always be visible (not dismissable) to make clear this is not a full parent dashboard.
- Session expires after 24 hours. Guardian must re-login with credentials.
- No "remember me" functionality.

### Layout — Mobile

- Persistent notice banner at top.
- Subject cards as horizontal scroll.
- Logout button at bottom.

### Layout — Desktop

- Persistent notice banner as a top bar.
- Subject cards in grid (2 × 3 or 3 × 2).
- Logout button in top-right corner.

### Reuse

- Reuses `components/Layout`.
- Subject cards may reuse parent report subject style tokens with reduced field set.

---

## 9. Shared Components & Reuse Notes

| Component | Reuse decision |
|---|---|
| `components/Layout` | ✅ Reuse on all 6 screens |
| Parent login form | ✗ Do not reuse — separate auth system |
| Parent report subject cards | ⚠ Reuse style only (color tokens, accuracy ring). Do not reuse data model. |
| Parent report copilot block | ✗ Never shown on teacher/guardian screens |
| Existing error boundaries | ✅ Reuse for `load_error` / `forbidden` states |

### New components to build (after approval)

| Component | Used by |
|---|---|
| `TeacherStudentRow` | Dashboard students list, class report attention list |
| `TeacherClassRow` | Dashboard classes list |
| `SubjectSummaryCard` (teacher variant) | Student report, class report, guardian view |
| `TeacherGuidanceBlock` | Student report |
| `ClassGuidanceBlock` | Class report |
| `GuardianAccessRow` | Student report guardian section |
| `ShownOnceCredentialModal` | Create access + rotate actions |
| `LimitedAccessBanner` | Guardian view (persistent, non-dismissable) |

---

## 10. Open Questions for Owner

### Question 1 — Suggestion String Translation

Support suggestions and class reinforcement/extension suggestions are generated as English developer keys (e.g. `"increase_practice_frequency"`, `"review_weak_topic_with_teacher"`). Before implementation, each key needs an approved Hebrew translation.

**Proposed keys and draft Hebrew translations — please approve or edit:**

| English key | Draft Hebrew |
|---|---|
| `increase_practice_frequency` | `מומלץ להגביר את תדירות התרגול` |
| `review_weak_topic_with_teacher` | `מומלץ לחזור על הנושא בשיעור פרטני` |
| `provide_extra_encouragement` | `מומלץ לעודד את התלמיד — הוא זקוק לתמיכה נוספת` |
| `monitor_for_further_decline` | `מומלץ לעקוב — ביצועי התלמיד ירדו לאחרונה` |
| `student_ready_for_enrichment` | `התלמיד מוכן לחומר מאתגר יותר` |
| `no_action_needed` | `אין צורך בהתערבות מיוחדת כרגע` |

**Action needed:** Owner to approve/edit the Hebrew text for each key.

### Question 2 — Topic Key Translation

Topics in the data are stored as Hebrew-compatible keys (e.g. `"fractions"`, `"addition"`, `"multiplication"`, `"grammar"`, `"vocabulary"`). A full topic translation table per subject is needed.

**Action needed:** Owner to supply or approve a topic → Hebrew display mapping. This will be used in the student report's "Next Practice Focus" and the class report's "Weak Topics" sections.

### Question 3 — Student Name Display

Currently masked as "שם פ." (first name + last initial). Is this the correct format, or should full first name only be shown?

**Options:**
- A) `[שם פרטי] [ראשית תואר]` — e.g. `דנה כ.`
- B) `[שם פרטי]` only — e.g. `דנה`
- C) Nickname / custom display name (teacher sets it)

**Action needed:** Owner to choose A, B, or C.

### Question 4 — Guardian Name / Recipient

The system creates guardian access but does not store the guardian's name (it stores `notes` field only). Should the teacher be able to label the access with a name (e.g. "אמא של דנה")?

**Options:**
- A) Allow teacher to type a free-text note when creating access (shown in access list for teacher's reference only)
- B) No label — access identified by username only

**Action needed:** Owner to choose A or B.

### Question 5 — Guardian View — Topic Detail

Should guardian view show per-topic breakdown (same as subject summary, just at topic level), or only the subject-level summary?

**Recommendation:** Subject-level only for guardian (fewer details = less overwhelming, simpler privacy boundary).

**Action needed:** Owner to confirm.

### Question 6 — Access Expiry Email Reminder

Currently there is no automated email when guardian access is about to expire. Should the teacher receive an in-app notification? Or is the manual flow (teacher checks the list) sufficient for now?

**Action needed:** Out of scope for this phase unless owner requests it.

---

## 11. Owner Approval Checklist

The following items require explicit owner sign-off before implementation begins.

- [ ] **Hebrew copy approved** — all labels, buttons, error messages in §2–8 above
- [ ] **Suggestion string translations approved** (Question 1)
- [ ] **Topic key translations provided/approved** (Question 2)
- [ ] **Student name display format chosen** (Question 3 — A/B/C)
- [ ] **Guardian access label (notes) decision made** (Question 4 — A/B)
- [ ] **Guardian view topic detail decision made** (Question 5)
- [ ] **Flags activation order confirmed** — `TEACHER_PORTAL_UI_COPY_ENABLED=true` + `GUARDIAN_PORTAL_UI_COPY_ENABLED=true` only after copy approval
- [ ] **Layout approach confirmed** — reuse existing `<Layout>` for all screens
- [ ] **No new SQL/RLS required** — confirmed (all schema changes already in migrations 019/020/021)
- [ ] **No new API routes required** — confirmed (all APIs already built in phases 4–8)

---

*Document created: 2026-05-25. Author: AI assistant per owner instructions. Implementation blocked until owner approves this document.*
