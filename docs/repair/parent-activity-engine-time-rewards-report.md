# Phase 2 Repair: Parent Activity → Engine, Time, Rewards, Report

תאריך: 2026-06-15  
סטטוס: הושלם

## 1. החלטת מוצר כפי שיושמה

- פעילות שהורה שולח לילד **אינה** מוצגת בדוח הורים כסעיף/תווית נפרדת.
- תשובות מפעילות הורה **כן** נספרות כראיית למידה אמיתית של הילד בתוך סטטיסטיקות מקצוע/נושא הכלליות.
- `guided_practice` מהורה מסווג כ-`diagnostic_guided` (משקל 0.7 במנוע), לא כ-`learning_guided` בלבד.
- `homework` מהורה נשאר `diagnostic_independent`.
- זמן לפרסים/דוח/dashboard משתמש ב-**credited time** (`question_snapshot.creditedTimeMs` או cap מ-`timing-policy`).
- פעילות שלא התחילה (`not_started`) לא נותנת סטטיסטיקה/פרסים.
- פעילות חלקית נספרת רק לפי תשובות שבוצעו (`is_correct != null`).
- אין כתיבה ל-`answers` — מניעת double counting מול self-practice.
- פרסים ב-submit פעם אחת בלבד (`coin_parent_activity_{activityId}` + `alreadySubmitted` guard).

## 2. קבצים ששונו

| קובץ | שינוי |
|------|--------|
| `lib/learning/activity-classification.js` | `assigned_parent` + `guided_practice` → `diagnostic_guided` |
| `lib/learning-supabase/parent-activity-learning-credit.server.js` | **חדש** — credited time + סיכום attempts |
| `lib/learning-supabase/parent-activity-completion-reward.server.js` | **חדש** — coins + daily missions ב-submit |
| `lib/parent-server/parent-activity.server.js` | dynamic import rewards ב-`submitParentActivity` |
| `lib/parent-server/report-data-aggregate.server.js` | re-classify parent attempts, credited time, duration, data health |
| `lib/learning-supabase/student-learning-profile.server.js` | parent attempts → answers + monthly minutes |
| `lib/learning-supabase/monthly-persistence-reward.server.js` | parent credited minutes בחישוב חודשי |
| `utils/parent-report-language/grade-insight-he.js` | הסרת phrase "בפעילות שנשלחה מההורה" |
| `utils/answer-compare.js` | תיקון import `.js` (תאימות node test) |
| `tests/parent-server/parent-assigned-activities.test.mjs` | בדיקות Phase 2 + `gradeLevel` |
| `tests/learning/parent-activity-learning-credit.test.mjs` | **חדש** |
| `tests/learning/activity-classification.test.mjs` | parent guided_practice diagnostic |
| `tests/learning/phase4-aggregate-filter.test.mjs` | parent guided_practice → diagnostic bucket |
| `tests/learning/phase9-single-truth-progress.test.mjs` | parent minutes ב-derived |

## 3. איך parent activity נכנסת למנוע

1. `recordParentActivityAnswer` שומר ב-`parent_activity_attempts.question_snapshot` את `isDiagnosticEligible` / `evidenceCategory` מ-`classifyActivityEvidence(mode, "assigned_parent", ...)`.
2. `guided_practice` מהורה מקבל override ל-`diagnostic_guided` (לא כמו כיתה).
3. `aggregateReportPayloadFromActivityRows` **מחשב מחדש** סיווג מ-`assigned_parent` (לא רק snapshot ישן) ומזין:
   - `diagnosticAnswers` / `diagnosticCorrect` / rollups
   - `recentMistakes`
   - `positiveEvidence`
4. `normalizeEvidenceRow` ב-`diagnostic-evidence-contract.js` כבר מאפשר `sourceType: assigned_parent`.

## 4. איך parent activity נכנסת לזמן

| שכבה | מקור |
|------|------|
| דוח הורים | `resolveParentAttemptCreditedTimeMs` → `timeMsSum`, `durationSeconds`, `dailyActivity` |
| Dashboard תלמיד | `computeStudentLearningDerived` — `sumParentActivityCreditedMinutesInRange` + per-subject minutes |
| Monthly persistence | `sumCompletedSessionMinutesForIsraelMonth` + parent credited minutes |

ברירת מחדל: `creditedTimeMs` מ-snapshot; אם חסר — `computeAssignedActivityTiming(raw)`.

## 5. איך parent activity נכנסת לפרסים

ב-`submitParentActivity` (רק submit ראשון, `answers_count > 0`):

1. `syncParentActivityCompletionRewards` טוען attempts ומסכם.
2. **Coins** — `awardParentActivityCompletionRewards` עם `idempotencyKey: coin_parent_activity_{activityId}` (אותה נוסחת tier כמו session).
3. **Daily missions** — `updateDailyMissionProgress` לפי `answersCount` + `durationSeconds` + `subject`.
4. `ENABLE_SESSION_COIN_AWARDS=true` נדרש ל-coins (כמו session finish).

לא נכתב `learning_sessions` — אין כפילות מול session rewards.

## 6. איך נמנעה הצגה נפרדת בדוח

- אין section חדש בדוח — parent attempts נספרים בתוך `subjects[subject].topics[topic]`.
- `stripInternalReportPayloadFields` מסיר מ-topics: `evidenceSourceCounts`, `evidenceSources`, `primaryEvidenceSource`.
- `evidenceSourcePhraseHe("parent_assigned_activity")` מחזיר `""` — Copilot/PDF לא מקבלים "בפעילות שנשלחה מההורה".
- provenance פנימי נשמר ב-aggregation לפני strip (audit/debug).

## 7. איך נמנעה כפילות ספירה

- Parent activity נשמרת **רק** ב-`parent_activity_attempts`.
- אין insert ל-`answers`.
- דוח הורים: `answers` מ-`learning_sessions` + `parent_activity_attempts` — מקורות נפרדים, ללא join כפול.
- ספירה רק ל-attempts עם `is_correct != null`.

## 8. איך נמנעה כפילות פרסים

- `submitParentActivity`: אם `status === "submitted"` → `alreadySubmitted: true`, ללא reward sync.
- Coin idempotency: `coin_parent_activity_{activityId}` דרך `applyArcadeCoinMove`.
- Mission coins: `mission_complete_{studentId}_{date}_{missionId}` (קיים).
- Dynamic import של reward module — לא נטען ב-answer path.

## 9. בדיקות שנוספו

- `tests/learning/parent-activity-learning-credit.test.mjs` — credited time, partial answers, strip provenance
- `parent-assigned-activities.test.mjs` — diagnostic guided, reward wiring, evidence strip
- עדכון phase4 — parent guided_practice → diagnostic
- עדכון activity-classification — parent modes

## 10. בדיקות שהורצו ותוצאות

```bash
node --test tests/parent-server/parent-assigned-activities.test.mjs \
  tests/learning/parent-activity-learning-credit.test.mjs \
  tests/learning/activity-classification.test.mjs \
  tests/learning/phase4-aggregate-filter.test.mjs
```

**תוצאה: 84/84 pass** (2026-06-15)

## 11. דברים שנשארו פתוחים

- **Backfill**: attempts ישנים עם snapshot `learning_guided` מתוקנים ב-aggregation ע"י re-derive; snapshot ב-DB לא עודכן retroactively.
- **Lifetime minutes** ב-dashboard: per-subject כולל parent; lifetime aggregate עדיין מבוסס בעיקר על `learning_sessions` + חודש נוכחי מ-derived.
- **Classroom assigned activities** — לא נכללו ב-scope; עדיין ללא session rewards.
- **E2E submit+coin** — לא הורץ מול Supabase אמיתי; אימות RPC ב-staging מומלץ.
- `meta._dataHealth.parentActivityAttemptsUnavailable` — פנימי בלבד; נסרק לפני API public.

## 12. האם יש צורך בתיאום עם סוכן אחר

- **Copilot / truth-packet**: אם סוכן אחר מציג `primaryEvidenceSource` לפני strip — לוודא שמשתמש ב-payload אחרי `stripInternalReportPayloadFields`.
- **PDF export**: אין שינוי template נפרד; מסתמך על strip + `grade-insight-he`.
- **QA scripts** (`parent-activity-grade-evidence-selftest.mjs`): עשויים לצפות phrase ישן — לעדכן אם רצים ב-CI.
