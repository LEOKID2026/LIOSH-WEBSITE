# Phase 3 — Student Dashboard / Progress / Defaults Truth

**Date:** 2026-06-15  
**Scope:** Student home dashboard, learning profile view models, subject lobby tiles, display truth helpers.

---

## 1. קבצים ששונו

| קובץ | סוג שינוי |
|------|-----------|
| `lib/learning-shared/student-display-truth.js` | **חדש** — states + formatters |
| `lib/learning-client/studentHomeDashboardClient.js` | view model truth fields |
| `lib/learning-shared/student-subject-dashboard-view.js` | accuracy null, challenge states, monthly journey |
| `lib/learning-shared/student-account-state-view.js` | stars/xp/level truth states; parent snapshot null-safe sums |
| `lib/learning-supabase/student-learning-profile.server.js` | `accuracy: null` when אין שאלות מדורגות |
| `pages/api/student/home-profile.js` | `monthlyPersistenceStatus` + `monthlyPersistenceLoadError` |
| `pages/api/student/learning-profile.js` | `monthlyPersistenceLoadError` במקום בליעה שקטה |
| `pages/student/home.js` | UI: no-data / loading / cumulative labels |
| `components/student/StudentMonthlyPersistencePanel.js` | unavailable / noData / filter note |
| `pages/learning/*-master.js` (×6) | `accuracyDisplayHe` במקום `{accuracy}%` |
| `scripts/verify-student-dashboard-view.mjs` | בדיקות null accuracy |
| `tests/learning/phase9-single-truth-progress.test.mjs` | Phase 3 test suite (7 tests) |

**לא שונו (נבדקו):**  
`utils/progress-storage.js`, `lib/learning-student-local-sync.js`, `lib/learning-client/studentLearningProfileClient.js`, `lib/learning-client/dailyMissionsView.js` — כבר מסומנים cache-only / server-only.

---

## 2. Default / fallback שנמצאו (לפני התיקון)

| מיקום | fallback ישן | בעיה |
|-------|-------------|------|
| `student-subject-dashboard-view.js` | `middleAccuracyPct = … \|\| 0` | 0% כשאין דיוק |
| `studentHomeDashboardClient.js` | `progressApprox = … ? 8 : 0` | progress bar דקורטיבי |
| `studentHomeDashboardClient.js` | `n()` → 0 לכל null | דקות/מטבעות/שאלות מזויפים |
| `student-account-state-view.js` | `stars ?? 0`, `playerLevel ?? 1` | אפס/1 כאמת לפני טעינה |
| `computeStudentLearningDerived` | `accuracy: 0` ללא שאלות | 0% מדומה |
| `home.js` | `heroCoins = Number(...) \|\| 0` | 0 מטבעות בטעינה |
| `home.js` | missions subtitle `0/0` | נראה כאמת |
| `learning-profile.js` / `home-profile.js` | `catch {}` על persistence | שגיאה נעלמת |
| masters (×6) | `{accuracy}%` | null → "null%" / 0% |

---

## 3. מה נחסם

- **localStorage** לא משמש authority ל-dashboard (home לא קורא `loadMonthlyProgress` / `LEO_*`).
- **Progress bar** בכרטיסי מקצוע — לא מוצג כשאין `accuracy` + שאלות מדורגות.
- **Monthly journey bar** — לא מוצג כש-`progressPct === null`.
- **0% / 0 דקות / 0 מטבעות** — לא מוצגים כשהמקור חסר (רק `realZero` מהשרת).
- **המלצות** — לא מוצגות כאבחון; כותרת «הצעה להמשך» + `hintHe: "הצעה כללית — לא אבחון"`.
- **Daily progress reconciled** — לא `serverConfirmed`; מסומן `estimated`.

---

## 4. מה סומן noData / unavailable / estimated

| שדה | States |
|-----|--------|
| דיוק (home + subject) | `noData` / `realZero` / `serverConfirmed` + `accuracyDisplayHe` |
| דקות חודשיות | `noData` / `realZero` / `serverConfirmed`; persistence error → `unavailable` |
| מטבעות | `loading` (hero בטעינה) / `unavailable` (null) / `realZero` / `serverConfirmed` |
| אתגר יומי/שבועי | `noData` / `estimated` (reconciled או live merge) / `serverConfirmed` |
| המלצות | `estimated` + hint |
| כוכבים / XP | `cumulative` scope label; state per field |

**Labels עברית:**  
`אין עדיין נתונים`, `הנתון לא זמין כרגע`, `מצטבר`, `לחודש הנוכחי (ישראל)`, `מכל הפגישות עם משך`, `מפגישות שהושלמו`.

---

## 5. מה נשאר local cache בלבד

| מפתח / מודול | שימוש |
|--------------|--------|
| `utils/progress-storage.js` | cache sync משרת בלבד; `NOT authoritative` |
| `studentLearningProfileClient.readLocalCache` | merge שרת wins; לא display authority |
| `learning-student-local-sync.js` | identity + ניקוי `mleo_*` / `LEO_*` במעבר תלמיד |
| `mleo_player_avatar*` | UI avatar בלבד; שרת profile wins כשקיים |
| masters `localStorage` | scores/progress/mistakes — persistence לסשן; display lobby מ-`buildStudentSubjectDashboardView` |

---

## 6. בדיקות שנוספו

`tests/learning/phase9-single-truth-progress.test.mjs` — suite **Phase 3 — student dashboard display truth**:

1. missing accuracy → `noData`, not 0%
2. real 0 accuracy with graded answers → `0%`
3. missing monthly minutes → no fabricated progress bar
4. subject dashboard null accuracy → `accuracyDisplayHe`
5. reconciled daily → `estimated`
6. persistence load error → `unavailable`
7. home.js לא קורא localStorage progress keys

---

## 7. בדיקות שהורצו ותוצאות

```text
node --test tests/learning/phase9-single-truth-progress.test.mjs
# tests 19 | pass 19 | fail 0
```

**לא הורצו (דורש Supabase / dev server):**

- `scripts/verify-student-dashboard-view.mjs <studentId> math`
- `scripts/verify-phase2-missions.mjs`
- `scripts/verify-israel-monthly-display.mjs`

---

## 8. תלויות מול סוכן 2

| נושא | סטטוס |
|------|--------|
| פעילות הורה → דקות/progress/rewards | **מחובר** — `sumParentActivityCreditedMinutesInRange` ב-`computeStudentLearningDerived` + `monthly-persistence-reward.server.js` |
| פעילות הורה → answers/accuracy bySubject | **מחובר** — `parent_activity_attempts` ב-derived |
| פעילות הורה בדוח הורים | **מחוץ scope** — לא מוצגת כפעילות נפרדת (by design) |

**הערת פילטר:**  
- `monthlyJourney` / `accountStats.learningMinutesThisMonth` — כל `learning_sessions` עם duration + parent credit.  
- `monthlyPersistence` panel — `completed` sessions + parent credit.  
- כשהערכים שונים → `meta.minutesFilterMismatch: true` + `filterNoteHe` על כל צד.

---

## 9. סיכונים פתוחים

1. **פער פילטר דקות** — derived vs persistence עלולים להציג מספרים שונים; מסומן אך לא מאוחד למקור יחיד.
2. **masters localStorage** — עדיין כותבים scores/progress; lobby display canonical אך in-game HUD עלול להשתמש ב-react state לפני PATCH.
3. **`summaryLevel` default 1** — snapshot parent עדיין מציג min level 1 כש-null (רק ב-home summary, לא accuracy).
4. **verify scripts** — לא הורצו מול DB חי בסביבה זו.
5. **Coin balance בטעינה** — hero מציג «טוען…» עד home-profile; `/me` coin_balance לפני profile עדיין יכול להיות 0 אמיתי מהשרת.

---

## Definition of Done — checklist

- [x] dashboard לא מציג default/fallback כאמת
- [x] progress/rewards/coins עם מקור + state
- [x] localStorage לא authority
- [x] missing vs real zero מובחנים
- [x] בדיקות Phase 3 עוברות (19/19)
