# Audit Read-Only: Learning Time Measurement and Reward Impact

תאריך audit: 2026-06-15  
מצב: Audit בלבד. לא בוצעו תיקוני קוד, refactor, UI, DB, בדיקות חדשות, commit או push.  
בדיקות קיימות: נבדקו בקוד. לא הורצו במסגרת audit זה.

## 1. Scope

נבדקו זרימות מדידת זמן למידה והשפעתן על דוחות, dashboard תלמיד ופרסים:

| תחום | סטטוס |
|---|---|
| פעילות רגילה ב-master pages | נבדק בקוד |
| תרגילים קשים / long reading / word problems | נבדק בקוד |
| דף טיוטה | נבדק בקוד |
| חלון צעד-צעד / הסבר / רמז | נבדק בקוד |
| מעבר בין שאלות | נבדק בקוד |
| פעילות אישית מהורה | נבדק בקוד |
| פעילות אישית/כיתתית ממורה | נבדק בקוד חלקי |
| פעילות עצמאית של תלמיד | נבדק בקוד |
| פעילות בכיתה/מקצוע אחר | נבדק בקוד |
| דוח הורים + PDF | נבדק בקוד |
| dashboard תלמיד יומי/חודשי/מקצועי | נבדק בקוד |
| dashboard שבועי | לא נבדק כמסך ייעודי; לא נמצא dashboard שבועי מובהק בחיפוש |
| סימולציות | נבדקו קבצי simulator/seed ברמת איתור בלבד; לא הורצו |
| mobile behavior | נבדק רק דרך visibility/focus/blur ו-visualViewport בסביבת קוד; לא מוכח במכשיר |
| refresh/back/resume | נבדק בקוד חלקי; לא מוכח בהרצה |

## 2. קבצים/מודולים שנבדקו

| קובץ/מודול | תפקיד |
|---|---|
| `pages/learning/math-master.js` | start/answer/finish, ledger, time per question, local progress |
| `pages/learning/geometry-master.js` | אותו pattern עבור גאומטריה |
| `pages/learning/english-master.js` | אותו pattern עבור אנגלית |
| `pages/learning/hebrew-master.js` | אותו pattern עבור עברית |
| `pages/learning/science-master.js` | אותו pattern עבור מדעים |
| `pages/learning/moledet-geography-master.js` | אותו pattern עבור מולדת וגיאוגרפיה |
| `utils/learning-time-credit/*` | QuestionTimeLedger, caps, visibility, session duration |
| `hooks/useLearningVisibilityClock.js` | visibilitychange/focus/blur עבור ledger |
| `lib/learning/timing-policy.js` | raw/credited time policy עבור free practice ו-assigned activity |
| `pages/api/learning/session/start.js` | יצירת `learning_sessions` |
| `pages/api/learning/answer.js` | שמירת `answers.answer_payload` עם raw/credited timing |
| `pages/api/learning/session/finish.js` | שמירת `duration_seconds`, coins, daily missions |
| `lib/learning-supabase/learning-coin-award.server.js` | חישוב coins לפי duration+accuracy |
| `lib/learning-supabase/mission-progress.server.js` | daily missions כולל minutes |
| `lib/learning-supabase/monthly-persistence-reward.server.js` | פרס התמדה חודשי לפי `learning_sessions.duration_seconds` |
| `lib/learning-supabase/student-learning-profile.server.js` | דקות חודשיות/מצטברות ל-dashboard |
| `lib/learning-client/studentHomeDashboardClient.js` | תצוגת dashboard תלמיד |
| `pages/student/home.js` | UI dashboard תלמיד |
| `pages/student/activity/[activityId].js` | פעילות אישית/כיתתית/הורה, per-question timing |
| `lib/parent-server/parent-activity.server.js` | start/answer/submit פעילות מהורה |
| `lib/teacher-server/teacher-activities.server.js` | start/answer/submit פעילות כיתתית/אישית |
| `lib/parent-server/report-data-aggregate.server.js` | aggregation לדוח הורים מ-DB |
| `utils/parent-report-v2.js` | fallback/localStorage report pipeline |
| `pages/learning/parent-report.js` | הצגת זמן בדוח ו-PDF |
| `utils/*-time-tracking.js` | localStorage legacy/fallback time tracking |
| `tests/learning/learning-time-credit.test.mjs` | בדיקות קיימות ל-ledger/caps |
| `tests/learning/phase3-timing-policy.test.mjs` | בדיקות קיימות ל-raw/credited timing |
| `tests/learning/phase6-competitive-context.test.mjs` | בדיקות סטטיות על coins/monthly |

## 3. מפת זרימת זמן מלאה

### פעילות רגילה / עצמאית ב-master pages

1. התחלת משחק/תרגול מאפסת `sessionStartRef.current = Date.now()`, `solvedCountRef`, ו-`sessionSecondsRef`.
2. לפני שמירת תשובה, אם אין session פעיל, `ensureLearningSessionId()` קורא `startLearningSession()` ויוצר `learning_sessions` דרך `POST /api/learning/session/start`.
3. בכל שאלה חדשה נקבע `questionStartTime = Date.now()` ונפתח `QuestionTimeLedger` דרך `beginMasterQuestionLedger()`.
4. במהלך השאלה, `useLearningVisibilityClock()` מעדכן ledger לפי `visibilitychange`, `focus`, `blur`.
5. בעת תשובה, client מחשב:
   - `rawTimeSpentMs = Date.now() - questionStartTime`
   - `creditedTimeMs = ledger.peekCreditedMs()` אם ledger קיים, אחרת cap רגיל
   - `timingStatus`
6. `POST /api/learning/answer` שומר את `rawTimeSpentMs`, `creditedTimeMs`, `timingStatus` בתוך `answers.answer_payload`.
7. במעבר שאלה או סיום session, `finalizeMasterQuestionLedger()` סוגר את השאלה, מוסיף `creditedMs` אל `sessionSecondsRef`, וכותב localStorage topic time דרך `track*TopicTime`.
8. בסיום/איפוס/unmount, `recordSessionProgress()` מחשב `durationSeconds = resolveMasterSessionDurationSeconds(sessionSecondsRef)` ושולח `POST /api/learning/session/finish`.
9. `session/finish` שומר `learning_sessions.duration_seconds` ומשתמש בו ל-coins ול-daily missions.
10. דוחות ו-dashboard קוראים את `learning_sessions.duration_seconds` או fallback localStorage, לפי המסלול.

### פעילות מהורה / אישית / כיתתית

1. `pages/student/activity/[activityId].js` קורא `POST /api/student/activities/:id/start`.
2. server מעדכן status ל-`in_progress`, `started_at`, `last_seen_at`.
3. question timer מתחיל ב-client ב-`questionStartTimeRef.current = Date.now()` בכל מעבר שאלה.
4. בעת submit, `computeAssignedActivityTiming(rawMs)` מחזיר `rawTimeSpentMs`, `creditedTimeMs`, `timingStatus`.
5. `POST /answer` שומר attempt:
   - `time_spent_ms = rawTimeSpentMs`
   - `question_snapshot.rawTimeSpentMs`
   - `question_snapshot.creditedTimeMs`
   - `question_snapshot.timingStatus`
6. submit activity מסמן status `submitted`; אין `learning_sessions` ואין session `duration_seconds` עבור פעילות זו.
7. דוח הורים קורא `parent_activity_attempts.time_spent_ms`; dashboard תלמיד/coins/monthly persistence לא הוכחו ככוללים פעילות זו.

## 4. כל המקומות שבהם זמן מחושב

| מקום | מה מחושב | מקור זמן | הערת audit |
|---|---|---|---|
| `QuestionTimeLedger` | credited ms פר שאלה | Date.now + visibility | מוכח בקוד |
| `computeFreePracticeTiming()` | raw/credited/timingStatus | rawMs + ledger | מוכח בקוד |
| `resolveMasterSessionDurationSeconds()` | session duration | סכום creditedMs | מוכח בקוד |
| master pages | rawMs פר תשובה | `Date.now() - questionStartTime` | מוכח בקוד |
| `computeAssignedActivityTiming()` | raw/credited assigned activity | `Date.now() - questionStartTimeRef` | מוכח בקוד |
| `session/finish` | `duration_seconds` | body.durationSeconds מה-client | מוכח בקוד; server לא מחשב מחדש |
| `report-data-aggregate.server.js` | report duration | `learning_sessions.duration_seconds` עם sanitize | מוכח בקוד |
| `parent-report-v2.js` | fallback timeMinutes | `session.duration`, אחרת `total * 30s` | מוכח בקוד |
| `student-learning-profile.server.js` | monthly/lifetime minutes | `learning_sessions.duration_seconds / 60` | מוכח בקוד |
| `monthly-persistence-reward.server.js` | activeMinutes | completed `learning_sessions.duration_seconds` | מוכח בקוד |
| `mission-progress.server.js` | daily mission minutes | `durationSeconds / 60` | מוכח בקוד |

## 5. כל המקומות שבהם זמן נשמר

| Storage | שדה | מה נשמר | סטטוס |
|---|---|---|---|
| `learning_sessions` | `started_at` | זמן יצירת session בצד server | מוכח |
| `learning_sessions` | `ended_at` | זמן finish בצד server | מוכח |
| `learning_sessions` | `duration_seconds` | duration מה-client אחרי cap/ledger | מוכח |
| `answers` | `answer_payload.rawTimeSpentMs` | זמן wall-clock פר תשובה | מוכח |
| `answers` | `answer_payload.creditedTimeMs` | זמן מזוכה פר תשובה | מוכח |
| `answers` | `answer_payload.timingStatus` | normal/long/very_long/no_timer | מוכח |
| `parent_activity_attempts` | `time_spent_ms` | raw time לפי client | מוכח |
| `parent_activity_attempts.question_snapshot` | raw/credited/timingStatus | timing snapshot | מוכח |
| `classroom_activity_attempts` | `time_spent_ms` | raw time לפי client | מוכח |
| `classroom_activity_attempts.question_snapshot` | raw/credited/timingStatus | timing snapshot | מוכח |
| localStorage | `mleo_time_tracking` | math topic sessions | מוכח |
| localStorage | `mleo_geometry_time_tracking` | geometry topic sessions | מוכח |
| localStorage | `mleo_english_time_tracking` | english topic sessions | מוכח |
| localStorage | `mleo_hebrew_time_tracking` | hebrew topic sessions | מוכח |
| localStorage | `mleo_science_time_tracking` | science topic sessions | מוכח |
| localStorage | `mleo_moledet_geography_time_tracking` | moledet/geography topic sessions | מוכח |
| `student_learning_state` | `challenges` | daily mission progress | מוכח |
| `coin_transactions` | metadata.durationSeconds | coin award metadata | מוכח |

## 6. כל המקומות שבהם זמן מוצג

| Surface | מקור | סטטוס |
|---|---|---|
| דוח הורים summary | `report.totalTimeMinutes` / topic `timeMinutes` | מוכח |
| דוח הורים טבלאות מקצוע | `data.timeMinutes` | מוכח |
| דוח הורים mobile cards | `data.timeMinutes` | מוכח |
| PDF דוח הורים | אותו DOM תחת `#parent-report-pdf` | מוכח בקוד; לא הורץ export |
| גרף יומי בדוח הורים | `dailyActivity.timeMinutes` | מוכח |
| dashboard תלמיד stats | `learningMinutesThisMonth`, `learningMinutesLifetimeRounded` | מוכח |
| dashboard תלמיד subject cards | `sessionMinutesRounded` | מוכח |
| dashboard תלמיד progress panel | monthly persistence minutes/tiers | מוכח |
| daily missions panel | mission progress; מקור minutes ב-challenges | לא נפתח הקובץ עצמו; המקור מוכח ב-view model/API |
| weekly dashboard | לא נבדק / לא נמצא surface ייעודי |

## 7. כל המקומות שבהם זמן משפיע על החלטות

| החלטה | מקור זמן | השפעה | סטטוס |
|---|---|---|---|
| Session coins | `durationSeconds` ב-`session/finish` | אם duration <= 0 אין coins; אחרת base+accuracy bonus | מוכח |
| Daily missions minutes | `durationSeconds / 60` | משימת minutes מתקדמת | מוכח |
| Daily missions subjects | subject ב-finish | subject mission מתקדמת גם ללא דרישת duration בקוד pure function | מוכח בקוד |
| Monthly persistence reward | completed `learning_sessions.duration_seconds` | tiers 100/250/400/600 דקות | מוכח |
| Student dashboard monthly progress | `learning_sessions.duration_seconds` | תצוגה ו-progress; בקוד ה-derived לא נמצא filter מפורש ל-`status = completed` | מוכח בקוד |
| Parent report duration | `learning_sessions.duration_seconds` / fallback localStorage | תצוגה, charts, topic row identity | מוכח |
| Parent recommendations/diagnostics | time participates as row field and fluency signals for attempts | חלקית מוכח |
| Parent assigned fluency signals | `parent_activity_attempts.time_spent_ms` | משפיע על timeMs/avgTimePerQuestion ומדדי שטף, לא הוכח כ-total minutes | מוכח חלקית |
| Badges/stars/xp local progress | בעיקר answer correctness/streak, לא duration | מוכח חלקית; לא מופה מלא בכל subject |
| In-run score/streak | correct answer/streak/timeLeft in speed mode, לא credited duration | מוכח חלקית |

## 8. טבלת session / duration / reward / report

| Flow | Session מתחיל | Session מסתיים | Duration מחושב | Reward | Report |
|---|---|---|---|---|---|
| Free practice / learning | `startLearningSession()` בזמן תשובה ראשונה או התחלת session לפי master | `recordSessionProgress()` בסיום/cleanup | credited ledger sum → `duration_seconds` | coins + daily missions + monthly persistence | `learning_sessions` + answers |
| Challenge/speed | אותו session flow | אותו finish | tier `legacy_game` cap 120s לשאלה | אין skip mode ב-coin helper; duration>0 מספיק | נכלל עם mode |
| Hard/word problem | אותו flow | אותו finish | cap 480s לשאלה אם fairness on; 120s אם off | כן, לפי duration | כן |
| Long reading | אותו flow | אותו finish | cap 600s לשאלה אם fairness on; 120s אם off | כן | כן |
| דף טיוטה | לא session נפרד | לא session נפרד | כל עוד tab visible וה-question ledger פתוח, הזמן נספר | כן, כחלק מה-session | כן |
| חלון הסבר/צעד-צעד | לא session נפרד | לא session נפרד | כל עוד ledger פתוח ו-visible, הזמן נספר; מסומן `afterStepByStep` | כן, כחלק מה-session | כן + classification |
| פעילות מהורה | `parent_activity_status.started_at` | `submitted_at` | per-answer raw/credited; אין session duration | לא מוכח כמשפיע על coins/monthly; נראה שלא | כן למדדי תשובה/שטף; לא הוכח כ-`totalTimeMinutes` |
| פעילות כיתתית/אישית | `classroom_activity_student_status.started_at` | `submitted_at` | per-answer raw/credited; אין session duration | לא מוכח | בדוח הורים נבדק בעיקר parent attempts; classroom report ו-total minutes לא נבדקו מלא |
| פעילות שלא הושלמה | session active או attempts in_progress | אין finish/submit | master: duration לא נשמר ב-session אם אין finish; attempts נשמרים פר תשובה | לא מוכח reward | parent attempts שכבר נענו יכולים להופיע לפי answered_at; לא מוכח לכל surface |
| קריאת ספר / learning book | `book_reading_sessions` / `book_page_visits` | book tracker end events | dwell נפרד, כולל hidden-tab tracking | לא מוכח כמשפיע על session rewards/monthly | יכול להיכנס לדוחות book/reading; לא מופה מלא |

## 9. תשובות ל-20 שאלות חובה

| # | שאלה | ממצא |
|---|---|---|
| 1 | מתי session מתחיל | ב-free practice: `POST /api/learning/session/start`, בדרך כלל דרך `ensureLearningSessionId()` לפני answer ראשון/תחילת flow. ב-assigned activity: status מתחיל ב-`start` אך זה לא `learning_sessions`. |
| 2 | מתי session מסתיים | ב-free practice: `recordSessionProgress()` שולח `session/finish`. ב-assigned activity: `submit` מסמן submitted. |
| 3 | איך `duration_seconds` מחושב | client מחשב credited ms דרך ledger, ממיר לשניות, ושולח ל-server. server שומר את body value אחרי normalize בלבד. |
| 4 | האם זמן בדף טיוטה נספר | מוכח בקוד: scratchpad הוא overlay באותו question; אין pause. אם tab visible וה-ledger פתוח, הזמן נספר. לא מוכח בהרצה. |
| 5 | האם זמן בחלון צעד־צעד נספר | מוכח בקוד: פתיחת הסבר מסמנת `stepByStepViewedRef`, לא עוצרת ledger. הזמן נספר כל עוד visible. |
| 6 | האם זמן בחלון הסבר נספר | מוכח בקוד באותו אופן; assigned activity explanation משפיע על `explanationViewed`, לא על timer pause. |
| 7 | האם זמן במעבר בין שאלות נספר | זמן השאלה נסגר ב-`closeOpenQuestionLedger()` לפני שאלה חדשה. זמן delay אחרי תשובה לפני מעבר לא מוכח כנספר לשאלה הבאה; תלוי מתי ledger נסגר. |
| 8 | האם זמן בפעילות אישית מהורה נספר | כן פר תשובה ב-`parent_activity_attempts`; לא כ-`learning_sessions.duration_seconds`; לא הוכח שהוא מגדיל `totalTimeMinutes` בדוח. |
| 9 | האם זמן בפעילות עצמאית של תלמיד נספר | כן במסלול master/free practice. פעילות אישית assigned נבדקה חלקית ונמדדת פר תשובה, לא כ-session reward. |
| 10 | האם זמן בכיתה אחרת / מקצוע אחר נספר נכון | subject ו-content grade נשמרים metadata/session/answer. הפרדה בדוח לפי grade/topic מוכחת חלקית; summary subject יכול לערבב grades לפי audits קודמים. |
| 11 | האם זמן משפיע על דוח הורים | כן. |
| 12 | האם זמן משפיע על dashboard תלמיד | כן, monthly/lifetime/subject minutes. |
| 13 | האם זמן משפיע על פרסים / streak / coins / progress | coins/daily missions/monthly persistence כן. streak/badges/progress המקומיים נראים בעיקר לפי תשובות, לא duration; לא מופה מלא. |
| 14 | timeout / pause / hidden tab / mobile | hidden/focus/blur קיימים ב-ledger. pause timeout לא נבדק מלא. mobile מוכח רק דרך browser events/visualViewport, לא במכשיר. |
| 15 | localStorage או fallback ישן לזמן | כן, `mleo_*_time_tracking` ו-`parent-report-v2` fallback. |
| 16 | client או server | החישוב הראשי client-side. server שומר ומסכם, לא מחשב duration מחדש מה-DB. |
| 17 | refresh / back / resume | assigned activity resume קיים. master snapshots קיימים בחלק מהמקצועות, אבל שמירת duration ב-refresh/back לא מוכחת מקצה לקצה. |
| 18 | פעילות שלא הושלמה נספרת | free practice בלי finish לא נספרת כ-`learning_sessions.duration_seconds`. attempts שכבר נשלחו נשמרים. לא מוכח לכל דוח. |
| 19 | תלמיד יכול לקבל פרס בלי זמן אמיתי | דרך UI רגיל לא מוכח. דרך API authenticated, server מקבל `durationSeconds` מה-client ואין recompute; לכן לא מוכח מוגן. |
| 20 | תלמיד יכול לעבוד זמן אמיתי ולא לקבל קרדיט | כן במקרים מוכחים: hidden tab לא מזוכה; cap לשאלה/session; פעילות מהורה לא נכנסת ל-monthly rewards; refresh לפני finish לא מוכח כבטוח. |

## 10. פערים אפשריים

| פער | ראיה | השפעה |
|---|---|---|
| server סומך על `durationSeconds` מה-client | `session/finish` שומר body.durationSeconds ומשתמש בו ל-coins/missions | reward/report יכולים להיות מושפעים מנתון client-side |
| אין recompute server-side מ-answers/raw/credited | לא נמצא חישוב server-side של session duration מסכום answers | לא מוכח עמיד בפני client tampering |
| cap לשאלה עלול לקצץ עבודה עמוקה | default 300s, hard 480s, long_reading 600s, legacy off 120s | תלמיד עובד זמן אמיתי ולא מקבל מלוא הקרדיט |
| feature flag fairness כבוי כברירת מחדל | `NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1 === "true"` בלבד | בסביבה ללא flag: 120s לשאלה ו-topic >=300s לא מזוכה ב-local fallback |
| assigned activity report משתמש raw ולא credited | aggregation קורא `attempt.time_spent_ms`; write path שם raw | דוח הורים יכול להציג זמן גבוה מה-credit cap |
| parent/class activities לא נכנסות ל-monthly persistence | monthly reward קורא רק `learning_sessions` completed | עבודה אמיתית בפעילות מהורה לא מקבלת פרס חודשי |
| student monthly display לא מסנן completed כמו monthly reward | `computeStudentLearningDerived` קורא `learning_sessions` ומסכם duration לפי `started_at`; reward job מסנן `status = completed` | dashboard תלמיד ופרס חודשי עלולים לסטות אם row לא completed מחזיק duration |
| book reading uses separate timing tables | `book_page_visits` / `book_reading_sessions` נפרדים מ-`learning_sessions` | זמן קריאה אמיתי לא הוכח כמשפיע על coins/monthly session minutes |
| partial/unsubmitted activity | attempts נשמרים, submit לא חובה; לא מופה מלא בכל surface | אפשר לקבל דוח חלקי או לא לקבל credit, תלוי surface |
| mobile behavior לא מוכח | לא הורצה בדיקה במכשיר / browser lifecycle mobile | background/suspend עשויים להתנהג אחרת |

## 11. ממצאים לפי חומרה

### CRITICAL

לא נמצא ממצא CRITICAL מוכח בקוד. זה לא PASS: לא בוצעו בדיקות runtime, mobile, security abuse או E2E מלאות.

### HIGH

1. `duration_seconds` הוא client-supplied ומשמש לפרסים.  
   `session/finish` שומר `body.durationSeconds` ומיד מעביר אותו ל-`awardLearningSessionCoins()` ול-`updateDailyMissionProgress()`. לא נמצאה recomputation server-side לפי `started_at`, `ended_at`, `answers.answer_payload.creditedTimeMs` או מספר תשובות.

2. עבודה אמיתית ארוכה יכולה להיחתך משמעותית.  
   caps: default 300s, hard 480s, long reading 600s, challenge 120s, session max 3h. אם fairness flag כבוי, cap legacy הוא 120s לשאלה ו-topic localStorage מעל 300s יכול לקבל 0 שניות.

3. פעילויות מהורה/אישיות לא מקבלות אותו reward path כמו free practice.  
   הן נשמרות ב-attempts ולא ב-`learning_sessions`, ולכן monthly persistence ו-dashboard minutes שמבוססים על `learning_sessions` לא מוכחים ככוללים אותן.

4. דוח הורים עבור parent activity משתמש raw time ולא credited time.  
   ה-write path שומר raw ב-`time_spent_ms`, ואת credited בתוך JSON snapshot; aggregation משתמש ב-`attempt.time_spent_ms` למדדי תשובה/שטף. לא הוכח שזמן זה מגדיל `totalTimeMinutes`, ולכן יש גם סיכון הפוך: effort של פעילות מהורה נראה במדדי תשובה אבל לא בדקות הכוללות.

### MEDIUM

1. אין הוכחת E2E ש-refresh/back/unmount תמיד מסיים session ומזכה זמן נכון.
2. אין הוכחת mobile lifecycle ל-hidden tab / background / suspend.
3. localStorage fallback עדיין קיים ויכול להציג/לחשב לפי sessions מקומיים או fallback `total * 30s`.
4. dashboard שבועי לא נמצא/לא נבדק כמסך ייעודי.
5. daily subject mission pure function מוסיפה subject ללא דרישת duration חיובי; UI רגיל כנראה לא מגיע לשם בלי duration, אך server-side לא מוכח כמוגן.
6. Student monthly minutes ו-monthly persistence reward לא משתמשים בדיוק באותו filter: dashboard derived לא הוכח כמסנן `completed`, reward כן.

### LOW

1. `timeSpentMs` raw/credited naming לא אחיד בין `answers.answer_payload` לבין attempt columns.
2. בדיקות קיימות כוללות static source assertions; הן מוכיחות פחות מ-integration tests.
3. PDF לא נבדק בהפקה בפועל; הוא משתמש באותו DOM, אך export לא הורץ.

## 12. בדיקות קיימות שמוכיחות את זה באמת

לא הורצו במסגרת audit זה. לפי קריאת קוד, הבדיקות הבאות קיימות ומוכיחות חלקים מההתנהגות אם הן עוברות:

| בדיקה | מה היא מוכיחה |
|---|---|
| `tests/learning/learning-time-credit.test.mjs` | tier classification, caps, hidden time not credited, hard question 6 minutes credited, session cap |
| `tests/learning/phase3-timing-policy.test.mjs` | assigned activity raw/credited separation, cap 300s, free-practice timing fields, no fabricated 5000ms |
| `tests/learning/phase6-competitive-context.test.mjs` | static check שאין skip לפי challenge/speed ב-coin helper; monthly persistence queries `learning_sessions` only |
| `scripts/parent-activity-grade-evidence-selftest.mjs` | fixtures עם `time_spent_ms` עבור parent activity report; לא נבדק בהרצה כאן |

## 13. בדיקות קיימות שלא מוכיחות מספיק

| בדיקה | למה לא מספיק |
|---|---|
| `learning-time-credit.test.mjs` | unit tests בלבד; לא מוכיח start→answer→finish→DB→reward |
| `phase3-timing-policy.test.mjs` | policy pure functions; לא מוכיח UI lifecycle, refresh, mobile או report aggregation |
| `phase6-competitive-context.test.mjs` | static source assertions; לא מוכיח award בפועל או idempotency תחת נתוני DB |
| parent report QA scripts | חלקם seed/simulation; לא מוכיחים פעילות תלמיד אמיתית בדפדפן |
| e2e קיימים | לא נמצאה בדיקה שמוכיחה timing/reward end-to-end |

## 14. בדיקות חסרות

1. E2E: תלמיד פותר שאלה קשה 7 דקות עם tab visible → `answers.creditedTimeMs`, `learning_sessions.duration_seconds`, דוח, dashboard, coins.
2. E2E: דף טיוטה פתוח 4 דקות → הזמן נספר.
3. E2E: חלון הסבר/צעד-צעד פתוח → הזמן נספר ומסומן `afterStepByStep`.
4. E2E: hidden tab 5 דקות → raw נשמר, credited לא גדל.
5. E2E mobile: background app / lock screen / return.
6. Integration: refresh/back באמצע שאלה לפני submit.
7. Integration: session finish עם duration חיובי אך 0 answers נבדק ומוגן.
8. Integration: parent activity long answer raw 20m / credited 5m → report משתמש בשדה הנכון.
9. Integration: parent activity affects or does not affect monthly persistence לפי החלטת product.
10. Integration: class/grade-other subject separation בדוח, dashboard ו-reward.
11. PDF snapshot test לזמן בדוח.
12. Weekly dashboard test אם קיים surface שבועי.

## 15. סיכונים להשקה

| סיכון | חומרה | למה |
|---|---|---|
| פרסים לפי duration client-side | HIGH | לא מוכח מוגן מפני client tampering |
| under-credit לתלמידים שעובדים לאט/עמוק | HIGH | caps ו-hidden behavior יכולים למחוק effort אמיתי |
| הורה רואה effort/זמן-תשובה בפעילות מהורה אבל תלמיד לא מקבל reward חודשי | HIGH | mismatch בין report fluency/diagnostics לבין reward/dashboard minutes |
| mobile background behavior | MEDIUM | לא מוכח במכשירים |
| fallback localStorage מול DB | MEDIUM | שני pipelines יכולים לתת תמונת זמן שונה |
| PDF מסתמך על אותו DOM בלי בדיקת export | LOW | סיכון תצוגה, לא חישוב |

## 16. המלצות בלי ליישם

1. להחליט product-wise האם reward צריך להתבסס על credited time בלבד, raw time, או שילוב.
2. להוסיף server-side validation/recompute ל-`duration_seconds` מסכום `answers.answer_payload.creditedTimeMs` או לכל הפחות sanity check מול answers.
3. להגדיר במפורש אם parent/class assigned activities נכללות ב-dashboard minutes וב-monthly persistence.
4. בדוח הורים, להחליט אם assigned activity time יוצג raw או credited; כרגע נראה raw.
5. להוסיף E2E אחד קטן שמוכיח start→answer→finish→report→reward.
6. להוסיף mobile lifecycle test או לפחות Playwright visibility/background simulation.
7. להציג בדוחות הבחנה בין raw time לבין credited time אם שניהם חשובים פדגוגית.
8. לקבוע rollout flag ברור ל-`NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1`; בלי flag הישן יכול לקצץ ל-120s.

## 17. שאלות פתוחות לבעלים

1. האם "זמן למידה" בדוח הורים אמור להיות raw effort או credited anti-abuse time?
2. האם תלמיד אמור לקבל monthly persistence credit על פעילות שהורה שלח?
3. האם פעילות כיתתית/אישית ממורה אמורה להשפיע על coins/streak/monthly minutes?
4. האם caps הנוכחיים מתאימים לתרגילים קשים באמת: 5/8/10 דקות לשאלה?
5. האם hidden tab צריך לעצור קרדיט מיידית או רק אחרי idle threshold?
6. האם `duration_seconds` צריך להיות source of truth אם הוא מגיע מה-client?
7. האם dashboard שבועי קיים או נדרש?
8. האם PDF חייב להציג raw/credited בנפרד?
9. האם session ללא תשובות אבל עם duration חיובי צריך לקבל coins?
10. האם refresh/back באמצע שאלה אמור לשמור זמן חלקי?

## 18. סיכום Audit

המדידה המרכזית קיימת וממופה: free-practice מודד זמן בצד client באמצעות ledger, שומר per-answer raw/credited, וסוגר `learning_sessions.duration_seconds` שמשפיע על dashboard, דוחות ופרסים. עם זאת, לא מוכח שהשרת מוודא את duration בעצמו, ולא מוכח שכל עבודה אמיתית מקבלת קרדיט, במיוחד בפעילויות מהורה/כיתה, mobile lifecycle, refresh/back ותרגילים ארוכים תחת caps.

לא בוצעו תיקונים. לא נוצרו בדיקות. לא בוצע commit.
