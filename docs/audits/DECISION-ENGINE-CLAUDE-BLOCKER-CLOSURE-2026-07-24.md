# סגירת Blockers ופערי מוצר — מנוע ההחלטות (ADC V2) — דוח סופי

**תאריך:** 2026-07-24
**מקור:** `docs/audits/DECISION-ENGINE-INDEPENDENT-CLAUDE-AUDIT-2026-07-24.md` (verdict מקורי: `NOT APPROVED`)
**היקף:** חמישה סבבי תיקון רצופים — (1) סגירת 3 ה-BLOCKERs, (2) סגירת פערי המוצר שנותרו מסבב 1, (3) חיבור bookkeeping אמיתי של `practice_more`/`strengthen_prerequisite` (חלקי — נדחה כ-NOT APPROVED), (4) חיבור **ההשפעה בפועל על בחירת תוכן** של שתיהן + gating אמיתי ל-exact_skill (חלקי — verdict `APPROVED` בוטל לאחר מכן בגלל שער חוזה שבור שלא נחקר), (5) חקירה ותיקון שורש מלאים של `parent-output-final-closure-contract.test.mjs` (38/38) והחזרתו ל-CI. ללא שינוי עיצובי, ללא commit/push/deploy.

---

## פסק דין

# `APPROVED`

שלושת ה-BLOCKERs המקוריים **נסגרו במלואם ואומתו** (סעיף 2). כל שמונת הפערים המשניים מסבב 2 **נסגרו במלואם, ללא revert**. סבב 3 חיבר בפועל bookkeeping (מונה) ל-`practice_more` ורשם `topicKey` נכון ל-`strengthen_prerequisite` — אך **לא** חיבר השפעה אמיתית על בחירת התוכן, ולכן נדחה כ-`NOT APPROVED` בצדק. **סבב 4 סגר את שתי הסתירות** (practice_more משפיע בפועל על תוכן; exact_skill חסום נכון ללא consumer), אך תוך כדי כך התגלה ש-`tests/learning/parent-output-final-closure-contract.test.mjs` (שער חוזה רשמי, 38/38 ב-2026-07-23) נכשל ב-12 בדיקות — וסבב 4 תייג זאת בטעות כ"מחוץ להיקף" במקום לחקור ולתקן. המשתמש דחה את ה-`APPROVED` בצדק וביטל אותו זמנית.

**סבב 5 (זה) חוקר וסוגר את הפער הזה במלואו:**

- **שורש:** commit `30ebd6ebe` ("complete decision engine production integration", **לפני** תחילת המעורבות הזו) שינה כיצד `build-parent-report-engine-decision-contract.js`/`build-subject-engine-decision-contract.js` קוראים איתות `riskFlags` וסמכות ADC V2 (`canonicalState`) — שינוי production **נכון ומכוון**, מאומת ישירות מול שני קוראי-production אמיתיים (`utils/topic-next-step-engine.js`, `build-learning-pattern-decision.js`) — אך קובץ הבדיקה מעולם לא עודכן לשקף את הצורה החדשה. **STALE FIXTURE בלבד, בכל 12 הכשלים** (סעיף 11.3) — לא PRODUCT REGRESSION, לא CONTRACT DRIFT, לא COPY DRIFT.
- **התיקון:** רק `tests/learning/parent-output-final-closure-contract.test.mjs` שונה (fixtures, לא assertions) — הוזרק `canonicalState`/`topicEngineRowSignals.riskFlags` אמיתיים לקלטי הבדיקה. **0 שינוי לקוד production.** תוצאה: 38/38.
- **הוחזר ל-CI:** npm script חדש + שלב CI חדש שחוסם build עתידי (סעיף 11.7).

- **`practice_more` כעת משפיע בפועל על בחירת התוכן**: `lib/learning/practice-more-budget.js`'s `resolvePracticeMoreTopicOverride` היא פונקציית resolver משותפת יחידה שכל 7 ה-masters קוראים לה בלולאת יצירת השאלה שלהם — כל עוד נותר budget, היא **דורסת** את הבחירה האקראית של מצב "mixed"/practice-focus ומחזירה את נושא ההחלטה בלבד; לאחר N תשובות כשירות היא משחררת אוטומטית (reevaluation).
- **`strengthen_prerequisite` (exact_skill) כעת חסום נכון בכל מקום שאין לו consumer אמיתי**: `lib/learning/prerequisite-content-source.js`'s `EXACT_SKILL_CONSUMER_SUBJECTS`/`hasExactSkillConsumer` (כרגע: `geometry` בלבד) — עברית ומדעים **לעולם לא** יכולים לקבל `precision:"exact_skill"` יותר, ונופלים תמיד ל-`grade_foundation_area`.

כל תנאי הסיום מתקיימים: אין שינוי עיצובי, אין refetch loop, אין סמכות מקבילה, rollback תקין, modes לא-אבחוניים נשארים זמן בלבד, וכל הבדיקות וה-build עוברים כולל `parent-output-final-closure-contract.test.mjs` (סעיף 9, 11).

---

## 1. מצב כל פער (טבלה מרכזת)

| # | פער | סטטוס | פירוט |
|---|---|---|---|
| BLOCKER-1 | סמכות כפולה לרמת קושי | **✅ סגור** | ראו סעיף 2. |
| BLOCKER-2 | Rollback לא מיושם | **✅ סגור (וחוזק בסבב 3 — תוקן באג createdAt)** | ראו סעיף 2 + סעיף 8. |
| BLOCKER-3 | Benchmark עוקף צינור אמיתי | **✅ סגור** | ראו סעיף 2. |
| 2 | `practice_more` — השפעה אמיתית על בחירת תוכן (לא רק מונה) | **✅ סגור (סבב 4)** | ראו סעיף 4.2. |
| 3 | `strengthen_prerequisite` — exact_skill רק כשיש consumer אמיתי | **✅ סגור (סבב 4, gating מלא; geometry=consumer, עברית/מדעים/מתמטיקה=fallback מאומת)** | ראו סעיף 4.3. |
| 4 | מדעים/היסטוריה — probe/targeted practice | **✅ נבדק, topic-level בטוח מאומת** | נבדק ישירות: אין מנגנון kind-forcing אמיתי בגנרטורים של מדעים/היסטוריה (`probeKind` גנרי בלבד: `"science_mcq"`/`"history_mcq"`, לא ספציפי-שאלה). ההתנהגות הנוכחית (topic-level, עם subskill מדויק כשקיים — מאומת ב-benchmark: hasmonaeans) היא הבטוחה הנכונה per "אחרת topic-level בלבד". לא בוצע שינוי קוד מסוכן. |
| 5 | דוח הורה — fallback מקבל סמכות | **✅ סגור** | ראו סעיף 3. |
| 6 | Taxonomy — triangles/circles/environment | **✅ סגור, מתואם, ללא revert** | ראו סעיף 5. |
| 7 | חוזה כיול — שדות מתים | **✅ סגור (אפשרות ב׳)** | ראו סעיף 6. |
| 8 | Mapper legacy כפול | **✅ סגור** | ראו סעיף 7. |
| 9 | `parent-output-final-closure-contract.test.mjs` — שער חוזה שבור (38/38→26/38→38/38) | **✅ סגור (סבב 5)** | ראו סעיף 11. |

---

## 2. שלושת ה-BLOCKERs — trace אמיתי לכל תיקון (מאומת מחדש בסבב זה)

### BLOCKER-1 — מקור סמכות אחד לרמת קושי
- **קוד:** `lib/learning/regular-internal-adaptive.js`, `lib/learning/science-internal-adaptive.js`, `hooks/useStudentDisplayLevelPractice.js`, `pages/learning/math-master.js` (ותיקוני context ב-6 masters נוספים).
- **Trace:** `grep -n "setSourceDifficulty(sd)\|setLevel(regularAdaptiveRef"` על כל 7 ה-masters + ה-hook המשותף מחזיר תוצאה אחת בלבד — `syncSourceDifficulty` (toggle מפורש של המשתמש, לגיטימי). 0 קריאות מתוך בלוק ה-streak.
- **מנגנון eligibility אמיתי:** `lib/learning/adaptive-streak-mode-eligibility.js` עוטף את `isIndependentRecurrenceEvidence` הקיים (`utils/diagnostic-evidence-eligibility.js`) — לא allowlist חדש.

### BLOCKER-2 — Rollback אמיתי
- **קוד:** `hooks/useActionDecisionRouteSync.js` (helper משותף חדש), מחובר בכל 7 ה-masters.
- **Trace אמיתי (benchmark, לא רק unit test):** `tests/learning/decision-engine-e2e-benchmark.test.mjs` → `E2E benchmark: expiry` — לוקח contract אמיתי (subtraction, M-09), מיישם אותו, מדמה expiry לפי activities **וגם** לפי זמן, ומוודא `active:false`, `action:"none"`, ו-`rollback.behavior === contract.rollbackBehavior`. עבר.

### BLOCKER-3 — Benchmark אמיתי מקצה לקצה
- **קוד:** `tests/learning/decision-engine-e2e-benchmark.test.mjs` (21 תרחישים, כולם דרך `runDiagnosticEngineV2`/`V3`/`buildLearningPatternDecision`/`buildActionDecisionContractV2`/`executeActionDecisionContractV2` האמיתיים, לא ליטרלים).
- **הקובץ הישן** שונה שם ל-`tests/learning/action-decision-contract-unit-p4.test.mjs` עם תיעוד מפורש שהוא unit test, לא benchmark.
- **תוצאה:** 21 + 3 = 24 בדיקות, 0 כשלים.

---

## 3. דוח ההורה — כל ה-consumers ותיקון סמכות ה-fallback

### רשימת consumers מלאה (אומתה ב-grep, לא בהנחה)
כל אלה קוראים **לאותה** פונקציה `enrichPayloadWithParentFacing`/`buildParentFacingBlocks` (`lib/parent-server/parent-report-parent-facing.server.js`):

| Consumer | קובץ | הערה |
|---|---|---|
| דוח הורה רגיל/מפורט | `pages/api/parent/students/[studentId]/report-data.js` | הנתיב הראשי |
| Guardian report | `lib/guardian-server/guardian-report.server.js:152` | אותה פונקציה בדיוק |
| Teacher report (פרטני) | `lib/teacher-server/teacher-report.server.js:536` | אותה פונקציה בדיוק |
| Demo parent | `lib/demo/parent-demo-data/report-payload-builder.server.js:160` | `buildParentFacingBlocks` ישירות |
| PDF/export | — | משתמשים באותו payload (לא נמצא נתיב ייצוא נפרד שעוקף) |

**לא בהיקף:** `lib/teacher-server/teacher-recommendations.server.js` מגדיר `rankWeakTopics` **מקומי משלו**, בלתי-תלוי — זהו דומיין החלטה נפרד לגמרי (הנחיית מורה ברמת כיתה, לא מסלול למידה של ילד בודד), כפי שכבר סווג במפורש בביקורת המקורית כ-`separate_decision_domain`. לא נגעתי בו.

### הממצא המדויק שאומת ותוקן
`buildLpdSafeTopicInsightFromWeakTopic` (`utils/learning-pattern-decision/lpd-parent-facing-copy.js:171`) **כבר** קורא ל-`resolveOrBuildLpdOnRow` → `buildLearningPatternDecision` (**אותה** פונקציה אמיתית שה-benchmark החדש משתמש בה) — כלומר תובנת-הנושא הבודדת ("מה לתרגל") **כבר** הייתה מגובה ADC/LPD אמיתי, לא סף accuracy גולמי. **הפרה בפועל נמצאה רק ב-`buildHomeRecommendationsHe`** (`lib/parent-server/parent-report-parent-facing.server.js`): כאשר אין תובנה מגובה-LPD (`actionFromInsights` ריק), הפונקציה הייתה ממליצה על מקצוע ספציפי (`homeBySubjectHe(weakest.subject)`) **ישירות מ-`rankSubjectsByAccuracy`/`rankWeakTopics`** — סף accuracy גולמי, ללא שום בדיקת taxonomy/recurrence/guided-exclusion/subskill-safety.

**התיקון:** הוסרו הענפים המבוססים-accuracy; כעת כשאין פעולה מגובת-LPD, מוצג **תמיד** `homeFallbackHe()` — הודעה ניטרלית קיימת בקוד ("מומלץ לבצע תרגול קצר וקבוע, ולבדוק בדוח הבא אם כבר נוצר דפוס ברור יותר") — לא recommendation ספציפית.

**אומת:** `test:parent-report-phase1`, `test:parent-report-phase6`, `test:truth-gates:offline`, `test:minimal-safe-scope`, 6 בדיקות `parent-copilot-*` — כולן exit 0 אחרי התיקון.

---

## 4. סבב 3+4 — חיבור אמיתי בפועל של `practice_more` ו-`strengthen_prerequisite`

**הערה חשובה:** סבב 3 חיבר bookkeeping אמיתי (מונה יורד, זהות החלטה, expiry/rollback) אך **לא** חיבר השפעה על מה שבפועל מוצג לתלמיד — verdict נכון היה `NOT APPROVED` כפי שנקבע. הטקסט מתחת מתאר את המצב **הסופי, אחרי סבב 4**, כולל שני התיקונים המהותיים (4.2, 4.3) שסוגרים את הפער.

### 4.1 ממצא מקדים (כנדרש, לפני קוד): מנגנון סיום פעילות בפועל בכל 7 ה-masters
נבדק ישירות בקוד (`grep` על `setGameActive(false)`, `gameActive`, חיפוש `sessionProgress`/`completed`/`finished`/מונה שאלות בכל 7 קבצי ה-master): **אין בשום master מונה שאלות, `sessionProgress`, `completed/finished`, או מסך סיום המבוסס על מספר שאלות.** `gameActive` הופך `false` אך ורק משלושה מקורות, זהים בכל 7 המקצועות: (1) `stopGame()` — יציאה מפורשת של המשתמש, (2) `handleTimeUp()` — טיימר נגמר, רק במצבי challenge/speed, (3) שינוי הגדרות (כיתה/רמה/מקצוע). **המשחק פתוח-קצה במהותו.** לפי ההנחיה המפורשת ("אל תמציא session length"), `practice_more` מומש כחלון זמני של N פעילויות כשירות באותו topic — לא כמסך/UI חדש.

### 4.2 `practice_more` — משפיע בפועל על בחירת התוכן, לא רק bookkeeping (תיקון סבב 4)
**מה שהיה עד סבב 3 (הפער שהדוחה הצביע עליו בצדק):** ה-helper עקב ואפס את ה-budget, אבל שום קוד לא קרא אליו כדי לשנות מה נבחר בפועל. הדוח עצמו הודה: "אינו משנה topic... רק עוקב" — bookkeeping בלבד, לא מימוש.

**התיקון:** `lib/learning/practice-more-budget.js` מקבל שדה `topic` חדש ב-state (מ-`directive.topic`, הנושא שעליו ADC *כן* החליט — `contract.target.topic`), ופונקציית resolver משותפת חדשה:
```js
resolvePracticeMoreTopicOverride(budget, allowedTopics)
```
מחזירה את הנושא לכפות רק אם `remaining > 0` **וגם** הנושא חבר ב-`allowedTopics` של הקורא (הגנה מפני נושא זר/מיושן) — אחרת `null`. זו הפונקציה **היחידה** שכל 7 ה-masters קוראים לה; אין מימוש כפול.

**המנגנון שנדרס בפועל בכל master (המנגנון היחיד שנמצא ב-4.1 שיכול להזיז נושא):**
| Master | מנגנון הבחירה האקראית שנדרס | איפה |
|---|---|---|
| math, hebrew, moledet-geography | "mixed" רנדומלי + coin-flip word_problems | `opForQuestion` בלולאת `do{...}` נדרס לפני קריאה ל-`generateQuestion` |
| english | "mixed"/translation coin-flip | `topicForState` נדרס לפני הלולאה, `mixedConfig` מנוטרל |
| geometry | בחירה אקראית inline מתוך `mixedTopics` (`Math.random()`) | `selectedTopics` נכפה למערך של פריט אחד; גם ה-fallback "נסה נושא אחר" מנוטרל בזמן נעילה |
| science, history | pool מכל הנושאים (`topicsList = allowedTopicsForGrade`) | `topicsList` נכפה למערך של נושא אחד לפני בניית ה-pool |

**חוזה מלא, מאומת בבדיקות (`tests/learning/decision-engine-runtime-consumption.test.mjs`):**
- מקבל את `directive.questionPolicy.additionalQuestions` (מהexecutor האמיתי) + `directive.topic` (הנושא שההחלטה עוסקת בו).
- Budget+topic נשמרים לפי decision identity (`sourceContractVersion:lifecycle.createdAt`) — **לא** levelKey.
- מקטין פעם אחת בדיוק לכל תשובה כשירה (`isEligibleAdaptiveStreakEvent`).
- guided/learning/books/step-by-step **אינם** צורכים budget.
- **בחירת התוכן נשארת על נושא ההחלטה לאורך כל N התשובות** (מוכח ישירות — test #11: מדמה N בחירות "mixed" אקראיות ומוודא שכולן נדרסו לנושא הנעול, לא רק שהמונה יורד).
- לאחר N — הנעילה משתחררת אוטומטית (reevaluation), הבחירה חוזרת להיות אמיתית.
- resolver לעולם לא כופה נושא שאינו חבר ברשימת הנושאים המותרת של הקורא (test #11b).
- `useRef` (לא state) → re-render לא מכפיל/מאפס; שינוי level לא מאפס.
- expiry מבטל יתרה שלא נוצלה; החלטה חדשה מקבלת budget+topic עצמאיים, לא merge.
- לא נוגע ב-`operation`/`topic` state עצמו של ADC/ה-hook (רק בבחירת השאלה הבודדת שנוצרת) ולא ב-level/grade.
- לא הוסיף UI חדש — אין מסך/הודעה חדשים.

**חובר בכל 7 ה-masters:** `practiceMoreBudget.consume(...)` ב-`handleAnswer` (כבר היה מסבב 3) + קריאה חדשה ל-`resolvePracticeMoreTopicOverride(practiceMoreBudget, <allowedTopics>)` בלולאת יצירת השאלה של כל master, ממש לפני שהנושא בפועל נבחר.

### 4.3 `strengthen_prerequisite` (exact_skill) — resolver משותף + gating אמיתי (תיקון סבב 4, "דרך ב׳")
**מה שהיה עד סבב 3 (הפער שהדוחה הצביע עליו בצדק):** ה-resolver תמך רק ב-geometry; עברית ומדעים (שיש להם registry + תוכן אמיתי) יכלו עדיין לקבל `precision:"exact_skill"` מהחוזה למרות שאין להם consumer בקוד — הבטחה שאין לה מימוש בפועל, בדיוק מה שהמשתמש אסר ("אסור ל-contract להבטיח פעולה שאין לה runtime consumer").

**החלטה בין שתי האפשרויות שהוצגו:** נבחרה **דרך ב׳ — חסימה מדויקת**, לא דרך א׳ (חיבור מלא לעברית/מדעים). הסיבה: ל-hebrew-master.js ו-science-master.js יש ארכיטקטורת בחירת-שאלה שונה לחלוטין מ-geometry (עברית: `generateQuestion` עם retry loop מורכב + probe-bias + G1/G2 quality-retry; מדעים: pool סטטי מסונן, לא per-question generator call) — חיבור אמיתי ובטוח לשתיהן דורש מעקב UI מורכב שלא ניתן לאמת ללא רינדור בהיקף הזמן שניתן. חסימה מדויקת סוגרת את הפער **המיידי** (הבטחה כוזבת) בלי לגעת ב-UI, ומשאירה נתיב שדרוג נקי לעתיד.

**המימוש (`lib/learning/prerequisite-content-source.js`):**
```js
export const EXACT_SKILL_CONSUMER_SUBJECTS = new Set(["geometry"]);
export function hasExactSkillConsumer(subjectId) { ... }
```
allowlist משותף יחיד — לא נבדק בכל מקצוע בנפרד. `utils/action-decision-contract/prerequisite-precision.js`'s `exactSkillCandidate` בודק אותו **ראשון**, לפני רישום/תוכן:
```js
function exactSkillCandidate(ids, subjectId) {
  if (!hasExactSkillConsumer(subjectId)) return null;   // ← השורה שנוספה בסבב 4
  for (const raw of ids) { ... isRegisteredCurriculumSkill && hasContentForSkill ... }
}
```
כלומר: skill רשום + תוכן אמיתי **אינם מספיקים** יותר — נדרש גם consumer רשום. עברית (`he_comp_explicit_detail`) ומדעים (`sci_body_fact_recall`) נופלים כעת תמיד ל-`grade_foundation_area`, **גם כשיש להם תוכן אמיתי** — מוכח ישירות בבדיקות (tests #12, #13; וגם כלל הבדיקות הישנות ב-`prerequisite-registry-p3b.test.mjs`/`taxonomy-targeting-p3.test.mjs`/`decision-engine-e2e-benchmark.test.mjs` עודכנו לדרוש זאת, לא רק "לא לשבור").

**ממצא נוסף מתוך התיקון:** אפילו בתוך geometry, `tri_sum_180` (רשום, מוצהר כ-prerequisite ע"י שאלת `geo_angle_measure`) **אין לו** שום שאלה בבנק המתויגת ב-`diagnosticSkillId="tri_sum_180"` בעצמה — כלומר `hasContentForSkill` היה כבר נכון דוחה אותו לפני סבב זה, אך אף בדיקה לא בדקה זאת עד עכשיו. תוקן test אחד (`prerequisite-registry-p3b.test.mjs`) לחשב את הציפייה מהנתונים האמיתיים (`hasExactSkillConsumer && hasContentForSkill`) ולא מהנחה גורפת לפי subject.

**הפרדת decisionTopic/contentOverrideTarget (ללא שינוי מסבב 3, עדיין מאומתת):**
- `contentOverrideTarget` נגזר **רק** מ-`directive.routePolicy.prerequisite` (המאומת, exact_skill בלבד — כעת גם מסונן ב-consumer gating).
- `usePrerequisiteContentOverride` **אינו** מייבא/קורא ל-`useStudentActionDecision`/`fetchStudentActionDecisions`.
- לא נוגע ב-`operation`/`topic` state של ה-master (`decisionTopic` בבדיקות נשאר קבוע).
- מוגבל ל-lifecycle ההחלטה, נמחק בדיוק פעם אחת ב-rollback, מוחלף (לא merge) בהחלטה חדשה.

**חובר ב-geometry-master.js (המקצוע היחיד עם consumer, מקצוע מבוסס bank):** ב-`generateNewQuestion`, לפני ה-fallback ל-`generateQuestion(...)` הרגיל, בדיקה: אם `prerequisiteContentOverride` פעיל, השאלה נבחרת מ-`pickQuestionForSkill` — `currentTopic`/`validTopic` **לא** משתנים. מתמטיקה, עברית ומדעים מוכחים ליפול נכון ל-fallback דרך בדיקות ישירות על ה-resolver+gate (סעיף 9, items 10a, 12, 13).

### 4.4 ממצא נוסף שנתפס בהרצת בדיקות רחבה יותר: פער כיסוי ב-topicLevelOnly (לא קשור ל-practice_more/exact_skill)
בסבב זה הורצה גם `node --test tests/learning/*.test.mjs` (סריקה רחבה יותר משהיה בסבבים קודמים) כדי לוודא שאין regression חבוי. נמצא כשל אמיתי ב-`tests/learning/topic-raw-action-p3b.test.mjs` (קובץ שלא היה ברשימת ה-P3/P3B שהורצה בסבבים קודמים ולכן לא נתפס): הבדיקה דרשה `result.de2.recurrence.full === true` וגם `taxonomyId === closureProducer.ruleId` **גם** עבור producers עם `topicLevelOnly:true` (triangles/circles, מסבב 2) — אך אלה בעלי `ruleId:null` **במכוון** (אין להם כלל תיוג distractor אמיתי, ראו סעיף 5). שני הסקריפטים האחרים (`decision-engine-33-topic-coverage-closure.mjs`, `decision-engine-p3b-coverage-audit.mjs`) כבר טופלו נכון לכך בסבב 2 — קובץ הבדיקה הזה פשוט לא עודכן איתם. תוקן: נוסף ענף `topicLevelOnly` זהה לזה שכבר קיים ב-`decision-engine-p3b-coverage-audit.mjs` (דורש `taxonomyId===null` + נשאר על ה-topic הנכון + אין תביעת subskill, במקום recurrence.full). אומת: 0 regression, שאר הבדיקות בקובץ ממשיכות לעבור.

### 4.5 ממצא נוסף שנתפס בבדיקות: באג אמיתי ב-BLOCKER-2 (סבב 1) שתוקן
בבניית הבדיקה "החלטה חדשה מחליפה את הישנה" התגלה: `hooks/useActionDecisionRouteSync.js` (מ-BLOCKER-2, סבב 1) חישב זהות החלטה מ-`directive?.createdAt` — שדה **שלא קיים כלל** בעצם הfmt (השדה האמיתי הוא `directive.lifecycle.createdAt`, ראו `lib/learning/action-decision-executor.js`'s `baseDirective`). המשמעות: זיהוי "החלטה חדשה" תמיד חישב אותו מפתח (`"2.0.0:undefined"`), כך שההחלטה שהחליפה החלטה קודמת פעילה **לא הייתה מזוהה כחדשה**. באג זה שרד את כל הבדיקות הקודמות כי אף בדיקה לא בדקה רצף של שתי החלטות שונות תוך כדי שהראשונה פעילה. תוקן זהה בשלושת הקבצים (`useActionDecisionRouteSync.js`, `practice-more-budget.js`, `prerequisite-content-source.js`) ל-`directive?.lifecycle?.createdAt`. אומת מחדש: 47 בדיקות executor/consumer-migration/subject-e2e + full-engine-audit (846/846) — 0 regressions.

### מדעים/היסטוריה — נבדק, לא תוקן (ותקין שלא תוקן)
נבדק ישירות: `utils/geometry-question-generator.js`/`data/science-questions.js`/`data/history-questions/g6-generated.js` — אין תיוג `distractorFamily` פר-אפשרות עבור תבניות "kind" ספציפיות במדעים/היסטוריה; `primaryProducerForRule` מחזיר `probeKind` גנרי בלבד (`"science_mcq"`/`"history_mcq"`) שאינו מספק מיקוד תוכן אמיתי. ניסיון "לחבר" `preferKind` כאן היה יוצר תחושת דיוק מזויפת. ה-target ברמת subskill **כן** מחושב נכון (`hasmonaeans_subskill` ב-benchmark מוכיח subskill מדויק "סיבה ותוצאה") — רק ההצגה בפועל לא מסוננת לפי kind. תואם במדויק את "אחרת topic-level בלבד".

---

## 5. תיקון Taxonomy — מתואם, מלא, ללא revert

### triangles
- **אומת:** G-01 הוא "תכונות מלבן/מקבילית" (`utils/diagnostic-engine-v2/taxonomy-geometry.js:4-9`) — לא קשור למשולשים. נבדק ישירות ב-`utils/geometry-question-generator.js` (case `"triangles"`, שורה 1599) — **אין תיוג distractorFamily אמיתי בכלל** לאפשרויות התשובה. G-08 (שטח משולש) ו-G-09 (פיתגורס) הם שורות טקסונומיה אמיתיות אך כבר ממופות נכון למילות-מפתח נושא נפרדות (`area`, `pythagoras`).
- **תיקון:** `triangles: []` ב-`utils/diagnostic-engine-v2/topic-taxonomy-bridge.js`.

### circles
- **אומת:** אין שורת טקסונומיה כלשהי על מעגלים (רדיוס/קוטר/פאי). G-03/G-06 הם קירובים (גובה מקבילית / המרת יחידות היקף). נבדק ישירות — אין תיוג distractorFamily אמיתי בשום case של מעגל בגנרטור.
- **תיקון:** `circles: []`.

### environment
- **אומת בקוד השאלות בפועל:** `env_1` (מיחזור, `data/science-questions.js:1747`) **אין לו** `expectedErrorTags` בכלל. `env_2` (מהי מערכת אקולוגית, שם:1810) **כן** נושא `expectedErrorTags: ["ecosystem_confusion","concept_confusion"]` — בדיוק התגים ש-S-07 דורש (`taxonomy-evidence-rules.js:385`). כלומר S-07 **כבר** לא יכול להיפתח משאלות מיחזור — רק משאלות אקולוגיה אמיתיות. הסרת S-07 מ-`environment` לגמרי **הייתה מייתמת** כלל טקסונומיה רשום (נבדק: אין topicKey אחר שמצביע ל-S-07 — `orphanRequiredTags` בסקריפט ה-P3 מטפל בדיוק במקרה הזה ותפס את זה בפועל).
- **תיקון:** לא הוסר המיפוי (היה שובר invariant אמיתי של המערכת). במקום זאת, **תוקנה התווית עצמה** ב-`utils/diagnostic-engine-v2/taxonomy-science.js` מ-"רשת מזון" (צר מדי, לא תואם) ל-"מערכת אקולוגית ויחסים בין יצורים" (תואם בדיוק את `env_2` ואת מה שה-tag בפועל יכול להיווצר ממנו).

### תיאום מלא בכל הקבצים התלויים (ללא revert הפעם)
| קובץ | שינוי |
|---|---|
| `utils/diagnostic-engine-v2/topic-taxonomy-bridge.js` | `triangles:[]`, `circles:[]` |
| `utils/diagnostic-engine-v2/taxonomy-science.js` | S-07 relabel |
| `lib/learning/p3b-topic-closure-producers.js` | producer חדש `topicLevelOnly:true` ל-triangles/circles (במקום `ruleId` שגוי); helper חדש `generatedPlainWrongAttempt` (ללא חיפוש תג שלא קיים) |
| `scripts/decision-engine-33-topic-coverage-closure.mjs` | `nearMissResult`/`randomErrorResult`/`wrongTopicResult` מטפלים ב-`topicLevelOnly` — topic-level passed = passed |
| `scripts/decision-engine-p3b-coverage-audit.mjs` | `buildTopicProof` — ענף חדש ל-`topicLevelOnly`, נכנס ל-`rawToActionPassed` לא ל-`failed` |
| `tests/learning/topic-coverage-closure-p3c.test.mjs` | 3 בדיקות עודכנו עם exception מפורש ל-triangles/circles, מתועד מדוע |

### תוצאות (מספרים אמיתיים אחרי התיקון, לא לפני)
```
scripts/decision-engine-33-topic-coverage-closure.mjs → exit 0
{ topics:33, rawToActionPassed:33, randomErrorPassed:33, wrongTopicPassed:33,
  gradeRelationSafetyPassed:33, guidedOnlyPassed:33, sameSessionPassed:33, crossTopicTargets:0 }

scripts/decision-engine-p3b-coverage-audit.mjs → exit 0
{ total:79, rawToActionPassed:72, mixedSafeFallback:7, explicitlyUnsupported:0,
  failed:0, wrongTopicPassed:79, withDeclaredGradeEvidence:78 }

scripts/decision-engine-p3-coverage-audit.mjs → exit 0 (falsification 76/76+76/76, אין orphan rules)
```
שים לב: המספרים (72/7/0/0/79/78) **זהים** למספרים בדוח המקורי — אך כעת הם **נכונים באמת** (triangles/circles עוברים כי הם topic-level-only בצדק, לא כי מופו בטעות לכלל לא-קשור). "0 semantic cross-topic mappings" מאומת: 0 subskill claims עם שם נושא אחר.

---

## 6. חוזה הכיול — מקור האכיפה האמיתי של כל כלל

**נבחרה אפשרות ב׳** (הסרת שדות מתים + הפניה מפורשת למקור אכיפה אמיתי), לא רה-ארכיטקטורה.

| שדה שהוסר מ-`decision-calibration-contract-v1.js` | מקור האכיפה האמיתי (מאומת, לא הונח) |
|---|---|
| `minWrongEvents`, `minSessions` (ל-subskill) | `utils/subskill-candidate-safety.js` (`MIN_WRONG_EVENTS_FOR_SAFE_SUBSKILL`) + `utils/diagnostic-engine-v2/taxonomy-recurrence-policy.js` (`minSessionsForSubskill`) |
| `allows`/`blocks` (cross-session) | `utils/learning-pattern-decision/build-unified-decision-context.js` — `sessionSnapshot()` → `signals.sessions.consistency` |
| `trendPolicy` | `utils/action-decision-contract/action-decision-contract-v2.js:546-554` — ענף `trend.eligible && direction==="improving"` |
| `guidedPolicy` | `action-decision-contract-v2.js` — ענפי `assistance.evidenceMode==="guided"` (מוזנים מ-`GUIDED_MODES` ב-build-unified-decision-context.js) |
| `timingPolicy` | `action-decision-contract-v2.js` — `supportedSpeedPressure` |
| `gradePolicy` | `action-decision-contract-v2.js` — `aboveGradeCaveat`/`foundationEvidence` + `utils/action-decision-contract/prerequisite-precision.js` |

**שדות שנשארו** (מאומת שהם כן נצרכים): `family`, `maxIntensity` (ב-`capIntensityByCalibrationV1`), `reevaluateAfterActivities`/`maxAgeHours` (ב-`buildDecisionLifecycleV1`), `transitionWhen` (מועתק ל-lifecycle). **אין יותר שני מקורות אמת סותרים** — הקובץ עצמו מתעד בפירוש (header comment) איפה האכיפה האמיתית חיה.
**אומת:** `tests/learning/recurrence-policy-p3b.test.mjs` (בודק מקור אכיפה אמיתי נפרד, לא נגעתי בו) + 51 בדיקות P4/P3B + full-engine-audit (846/846) — כולן עברו ללא שינוי.

---

## 7. Mapper Legacy יחיד

**לפני:** שתי טבלאות בלתי-תלויות: `legacyRecommendedActionFromContractV2` (`action-decision-contract-v2.js`) ו-`LEGACY_NEXT_ACTION_BY_ADC` (`lib/learning-client/scheduleAdaptivePlannerRecommendation.js`) — אוצרות מילים **שונות** (EDC-legacy vs. planner UI), כך שאי אפשר פשוט לאחד ערך-פלט אחד (ניסיון כזה היה מאבד גרנולריות אמיתית — למשל planner מבדיל `collect_more_evidence` מ-`give_probe_questions` מ-`maintain`, וה-EDC-legacy מקבץ את כולם ל-`maintain_current_path`).

**אחרי:** מקור יחיד — `LEGACY_ACTION_PROJECTIONS_V2` ב-`action-decision-contract-v2.js`, מגדיר את **שתי** ההשלכות (edcStep + plannerTarget) יחד, פר-action, פעם אחת. `legacyRecommendedActionFromContractV2` ו-`legacyPlannerTargetFromContractV2` (חדש) שתיהן נגזרות מהטבלה היחידה. `scheduleAdaptivePlannerRecommendation.js` מייבא ומשתמש ב-`legacyPlannerTargetFromContractV2` — הטבלה המקומית הישנה נמחקה לגמרי.
**אומת:** ערכי הפלט זהים לגמרי לטבלה הישנה (הושוו ידנית שורה-שורה לפני המחיקה) + 47 בדיקות executor/consumer-migration/subject-e2e + full-engine-audit — עברו ללא שינוי.

---

## 8. כל הקבצים ששונו (ארבעת הסבבים יחד)

**חדשים (סבב 1-2):**
- `lib/learning/adaptive-streak-mode-eligibility.js`
- `hooks/useActionDecisionRouteSync.js`
- `tests/learning/decision-engine-e2e-benchmark.test.mjs`

**חדשים (סבב 3, מורחבים בסבב 4):**
- `lib/learning/practice-more-budget.js` — state machine טהור + `resolvePracticeMoreTopicOverride` (חדש בסבב 4, סעיף 4.2)
- `hooks/usePracticeMoreBudget.js` — עטיפת React דקה (מחזיר גם `topic`, חדש בסבב 4)
- `lib/learning/prerequisite-content-source.js` — resolver משותף + `EXACT_SKILL_CONSUMER_SUBJECTS`/`hasExactSkillConsumer` (חדש בסבב 4, סעיף 4.3)
- `hooks/usePrerequisiteContentOverride.js` — עטיפת React דקה
- `tests/learning/decision-engine-runtime-consumption.test.mjs` — 17 בדיקות (10 נדרשות + 7 נוספות: 2 מסבב 3, 5 חדשות בסבב 4 — topic-lock effect, hebrew/science gating, geometry consumer sanity), ראו סעיף 9

**שונו (סבב 1 — BLOCKERs):**
- `lib/learning/regular-internal-adaptive.js`, `lib/learning/science-internal-adaptive.js`
- `hooks/useStudentDisplayLevelPractice.js`, `hooks/useStudentActionDecision.js`
- `pages/learning/{math,geometry,english,hebrew,science,history,moledet-geography}-master.js`
- `utils/action-decision-contract/decision-consumer-registry-v1.js`
- `utils/contracts/assert-contract-step-consistency.js`
- `utils/topic-next-step-engine.js`

**שונו (סבב 2 — פערי מוצר):**
- `utils/action-decision-contract/action-decision-contract-v2.js` (mapper יחיד)
- `lib/learning-client/scheduleAdaptivePlannerRecommendation.js` (mapper יחיד)
- `utils/action-decision-contract/decision-calibration-contract-v1.js` (שדות מתים הוסרו)
- `lib/parent-server/parent-report-parent-facing.server.js` (fallback authority)
- `utils/action-decision-contract/prerequisite-precision.js` (topicKey חדש)
- `lib/learning/action-decision-executor.js` (תיקון באג prerequisiteTopic)
- `utils/diagnostic-engine-v2/topic-taxonomy-bridge.js` (triangles/circles)
- `utils/diagnostic-engine-v2/taxonomy-science.js` (S-07 relabel)
- `lib/learning/p3b-topic-closure-producers.js`
- `scripts/decision-engine-33-topic-coverage-closure.mjs`
- `scripts/decision-engine-p3b-coverage-audit.mjs`
- `tests/learning/topic-coverage-closure-p3c.test.mjs`

**שונו (סבב 3 — bookkeeping):**
- `hooks/useActionDecisionRouteSync.js` (תיקון באג `directive.lifecycle.createdAt`, סעיף 4.5)
- `utils/action-decision-contract/prerequisite-precision.js` (אכיפת `hasContentForSkill` לפני `exact_skill`)
- `pages/learning/{math,geometry,english,hebrew,science,history,moledet-geography}-master.js` — חיבור `usePracticeMoreBudget` + קריאת `consume()` ב-`handleAnswer`; `geometry-master.js` בנוסף חובר ל-`usePrerequisiteContentOverride`

**שונו (סבב 4 — השפעה אמיתית + gating, זה):**
- `lib/learning/practice-more-budget.js` — `topic` ב-state + `resolvePracticeMoreTopicOverride` (סעיף 4.2)
- `hooks/usePracticeMoreBudget.js` — חושף `topic`
- `pages/learning/{math,geometry,english,hebrew,science,history,moledet-geography}-master.js` — **כל 7** קוראים ל-`resolvePracticeMoreTopicOverride` בלולאת יצירת השאלה שלהם (טבלת המיפוי המדויקת בסעיף 4.2)
- `lib/learning/prerequisite-content-source.js` — `EXACT_SKILL_CONSUMER_SUBJECTS`/`hasExactSkillConsumer` (סעיף 4.3)
- `utils/action-decision-contract/prerequisite-precision.js` — `exactSkillCandidate` בודק `hasExactSkillConsumer` ראשון
- `tests/learning/prerequisite-registry-p3b.test.mjs`, `tests/learning/taxonomy-targeting-p3.test.mjs`, `tests/learning/decision-engine-e2e-benchmark.test.mjs` — עודכנו לצפות ל-gating (עברית/מדעים ← `grade_foundation_area`, לא `exact_skill`)
- `tests/learning/topic-raw-action-p3b.test.mjs` — תוקן פער כיסוי לא-קשור ב-`topicLevelOnly` (סעיף 4.4)
- `tests/learning/decision-engine-runtime-consumption.test.mjs` — 5 בדיקות חדשות (11, 11b, 12, 13, 14)

**שונה שם:**
- `tests/learning/decision-calibration-benchmark-p4.test.mjs` → `tests/learning/action-decision-contract-unit-p4.test.mjs`

**שונו (סבב 5 — חקירת parent-output-final-closure-contract, סעיף 11):**
- `tests/learning/parent-output-final-closure-contract.test.mjs` — fixtures בלבד, 0 שינוי ל-assert/expected (סעיף 11.4)
- `package.json` — script חדש `test:parent-output-final-closure-contract`
- `.github/workflows/parent-report-tests.yml` — שלב CI חדש
- **שום קובץ production לא שונה בסבב 5**

**אין שינוי עיצוב/CSS/layout/כרטיסים/badges/סדר אזורים/מבנה דוח ההורה בשום קובץ, באף אחד מחמשת הסבבים.**

---

## 9. כל הבדיקות ותוצאותיהן (הרצה סופית, לאחר כל התיקונים כולל סבב 5)

| Command | Exit | תוצאה |
|---|---|---|
| `node --test` (contract-unit-p4, executors-p4, consumer-migration-p4, subject-e2e-p4, e2e-benchmark, coverage-artifact-p3b, topic-coverage-closure-p3c, recurrence-policy-p3b, runtime-consumption, prerequisite-registry-p3b, taxonomy-targeting-p3, topic-raw-action-p3b, **parent-output-final-closure-contract, subject-engine-decision-contract, parent-report-engine-decision-contract, parent-report-topic-card-parent-facing [כולם חדשים בסבב 5]**) | 0 | **128/128 pass** |
| `node tests/engine-decision-audit/full-engine-audit.mjs` | 0 | 846/846 assertions, 57/57 branches |
| `node scripts/decision-engine-p3-coverage-audit.mjs` | 0 | falsification 76/76+76/76 |
| `node scripts/decision-engine-p3b-coverage-audit.mjs` | 0 | 72/7/0/0/79/78 — אמיתי (ראו סעיף 5) |
| `node scripts/decision-engine-33-topic-coverage-closure.mjs` | 0 | 33/33/33/33/33/33/0 |
| `npm run test:parent-report-phase1/phase6/topic-next-step-phase2/topic-next-step-engine-scenarios/diagnostic-engine-v2-harness/ai-hybrid-harness/truth-gates:offline/minimal-safe-scope` | 0 (כולם) | |
| `npm run test:parent-output-final-closure-contract` **[חדש בסבב 5]** | 0 | 38/38 |
| `npm run test:parent-copilot-phaseA/B/C/executive-answer-safe-matrix/recommendation-semantic/parent-language-semantic/async-llm-gate/telemetry-trace` | 0 (כולם) | |
| `npm run "test:parent-rollout-stage:s2-classifier/s2-hebrew-drift/s3-observability"` | 0 (כולם) | |
| `npm run test:oracle-conformance` | 0 | |
| `npm run test:canonical-state-e2e` | 0 | 10/10 |
| `PARENT_RELEASE_STAGE=s3 PARENT_SIGNOFF_*=true npm run test:parent-rollout-release-matrix` | 0 | GO |
| `.github/workflows/parent-report-tests.yml` — כל 24 שלבי ה-workflow (23 בדיקות + `npx next build`, לא כולל `npm ci`) | 0 בכולם | |
| `npx next build` (הורץ שוב בנפרד, בסוף סבב 5) | 0 | 0 warnings, 0 errors |

**סה"כ: אפס regressions בחמשת הסבבים יחד.** ה-17 בדיקות ב-`decision-engine-runtime-consumption.test.mjs` מוכיחות **התנהגות נצרכת בפועל**, לא רק שדות אובייקט:
1. `practice_more` צורך בדיוק N פעולות כשירות ומפסיק.
2. guided/learning/books/step-by-step לא צורכים budget.
3. רענון/re-render לא מכפילים/מאפסים.
4. expiry מבטל budget שלא נוצל.
5. exact prerequisite בוחר שאלה אמיתית מהישות הרשומה (geometry).
6. `decisionTopic` לא משתנה לאורך כל התהליך.
7. אין refetch loop (structural — אין import ל-hook ה-fetch).
8. rollback מנקה את ה-content override בדיוק פעם אחת.
9. fallback ללא producer אמיתי לא מתחזה ל-exact_skill.
10. אינטגרציה קצה-לקצה: geometry (bank-based) + מתמטיקה (fallback מאומת, אין producer).
11. **[סבב 4]** `practice_more` באמת נועל בחירת תוכן ל-N תשובות ואז משחרר (test #11, #11b).
12. **[סבב 4]** עברית: registry+תוכן אמיתי, אך ללא consumer ← לעולם לא `exact_skill` (test #12).
13. **[סבב 4]** מדעים: אותו דבר (test #13).
14. **[סבב 4]** geometry נשארת ה-consumer היחיד המוגדר נכון (test #14).
בנוסף: החלטה חדשה מקבלת budget/topic עצמאי, לא merge; החלטה חדשה מחליפה content override ישן ללא נפילה חזרה לישן — שתיהן תפסו את באג ה-`createdAt` (סעיף 4.5).

---

## 10. היקף שנותר מכוון (לא פער חוסם) + ממצא שקוף שלא תוקן (מחוץ להיקף)

שני הפערים שגרמו ל-`NOT APPROVED` בתום סבב 3 (`practice_more` ללא השפעה על תוכן, `exact_skill` ללא gating) **נסגרו במלואם בסבב 4** — ראו סעיף 4.2, 4.3. מה שנותר:

**היקף מכוון (לא פער):**
- עברית ומדעים **חסומים** מ-`exact_skill` (לא "עדיין לא מומשו בסתר") — זו החלטת "דרך ב׳" מפורשת, מתועדת ומאומתת בבדיקות (סעיף 4.3). שדרוג עתידי ל"דרך א׳" (חיבור מלא) יעבור דרך אותו resolver+allowlist משותפים, לא מימוש מקביל.
- מתמטיקה: אין ישות `exact_skill` רשומה כלל — נופלת ל-fallback גם ללא צורך ב-gating.
- מדעים/היסטוריה (probe/targeted practice ברמת kind): topic-level (עם subskill מדויק כשקיים) הוא הבטוח הנכון, לא באג — ראו סעיף 4 סוף.

**ממצא שדווח בשקיפות בסבב 4, נחקר וסגר במלואו בסבב 5:**
`tests/learning/parent-output-final-closure-contract.test.mjs` — שער חוזה רשמי לדוח ההורה שעבר 38/38 ב-2026-07-23 — נמצא נכשל (12/38) בסבב 4. בסבב 4 זה תויג בטעות כ"מחוץ להיקף/לא קשור" ולא תוקן — קביעה **שגויה**, שתוקנה. ראו סעיף 11 לחקירה המלאה, שורש הבעיה, התיקון, וההוכחה שהבדיקה כעת חלק קבוע מה-CI.

**לא פער — כבר תקין:**
- כל שאר סעיפי הביקורת: סגורים, מאומתים, ללא regression.

---

## 11. סבב 5 — חקירת `parent-output-final-closure-contract.test.mjs` (38/38 → 26/38 → 38/38)

### 11.0 רקע
בסבב 4 דווח שקובץ זה נכשל (12/38), סווג כ"לא קשור למה ששונה" ולא נחקר לעומק — קביעה שגויה. הבדיקה **היא** שער חוזה רשמי (ה-header של הקובץ עצמו: "These gates fail the build when..."), עברה 38/38 ב-2026-07-23, ואי אפשר לאשר `APPROVED` כשהיא שבורה. סבב זה מבטל את ה-`APPROVED` הקודם, חוקר לעומק, ומתקן.

### 11.1 המקור המדויק — לא סבבים 1-4, אלא commit `30ebd6ebe`
כל 11 הקבצים שברשימת התלות (`git status --porcelain`) **נקיים לחלוטין** — אף אחד מהם לא שונה בעץ העבודה, לא בסבב זה ולא בסבבים 1-4. `git log` על שני הקבצים המרכזיים חושף את המקור: commit `30ebd6ebe` ("feat(learning): complete decision engine production integration", **24 שעות לפני** תחילת סבב 1 של המעורבות הזו) — קומיט ענק ("Make ADC V2 the sole bounded action authority across calibration, runtime executors, APIs, and parent reporting") ששינה גם את `build-parent-report-engine-decision-contract.js` וגם את `build-subject-engine-decision-contract.js`, **בלי לעדכן את קובץ הבדיקה** (הבדיקה עצמה שונתה לאחרונה ב-commit ישן יותר, `44e711a25`, כ-30 קומיטים לפני `30ebd6ebe`).

### 11.2 שני שורשי בעיה אמיתיים, שניהם ב-`30ebd6ebe` (לא regression מסבבים 1-4)

**שורש א׳ — riskFlags: מיקום קלט שונה**
```diff
- riskFlags: unit?.riskFlags || {},
+ riskFlags: rowRiskFlags,  // = row?.topicEngineRowSignals?.riskFlags
```
עם הערת קוד מפורשת בקומיט: *"DE2 units do not produce riskFlags. The active producer attaches them to the topic row under topicEngineRowSignals; do not read a fictional DE2 field."* אומת ישירות: `utils/topic-next-step-engine.js:1913` (ה-producer האמיתי היחיד ב-production שמאכלס `topicEngineRowSignals`) אכן שם `riskFlags: rec.riskFlags` שם — כלומר הקוד החדש **נכון** ותואם למקור האמת האמיתי בפרודקשן; `unit.riskFlags` היה שדה שאף קוד production אמיתי לא היה ממלא. הבדיקה בנתה fixtures לפי הצורה הישנה (`unit.riskFlags`) — **STALE FIXTURE**.

**שורש ב׳ — isActionableGapTopic: נדרש ADC V2 אמיתי, לא recommendedAction גולמי**
```diff
- REMEDIATE_ACTIONS.has(topic.recommendedAction) || topic.recommendedAction !== "watch"
+ topic.actionDecisionContract?.eligible === true && topic.actionDecisionContract?.intervention === true
```
`actionDecisionContract` נבנה מ-`unit.canonicalState` (`canonicalState = unit?.canonicalState || null` ב-`build-parent-report-engine-decision-contract.js`). אומת: קורא ה-production האמיתי, `utils/learning-pattern-decision/build-learning-pattern-decision.js:103-122`, **תמיד** בונה `unifiedDecisionContext` אמיתי מ-`unit`/`row`/ראיות אמיתיות ומעביר אותו + `unit.canonicalState` האמיתי (מגיע מ-DE2). הבדיקה בנתה fixtures מינימליים בלי `canonicalState` בכלל — ADC V2 נופל-סגור נכון ל-`collect_more_evidence`/`intervention:false` (זו התנהגות בטוחה ונכונה כשאין הרשאה אמיתית) — אך זה אומר שאף topic fixture לא נחשב "gap" יותר. **STALE FIXTURE**, לא regression בקוד production.

### 11.3 טבלת 12 הכשלים — שם, expected/actual, decisionKey, סיווג

| # | שם הבדיקה | expected | actual | decisionKey | סיווג |
|---|---|---|---|---|---|
| 1 | every active topic-engine decisionKey is reachable | `engineDecision="speed_pressure_pattern"` | `"topic_needs_strengthening"` | speed_pressure_pattern | STALE FIXTURE (שורש א׳) |
| 2 | speed_pressure_pattern uses the single approved sentence | טקסט מכיל "בתרגול המהיר" | טקסט חסר את זה (טקסט של topic_needs_strengthening) | speed_pressure_pattern | STALE FIXTURE (שורש א׳) |
| 3 | speed_pressure_pattern is NOT counted as a subject-level gap | `speedCheckTopics` כולל את הנושא | ריק (הנושא לא סווג כ-speed_pressure_pattern) | speed_pressure_pattern | STALE FIXTURE (שורש א׳) |
| 4 | speed_check_only_subject (0 gaps, 0 stable, 1 speedCheckTopic) reachable | `subjectDecision="speed_check_only_subject"` | `"insufficient_subject_data"` | speed_check_only_subject | STALE FIXTURE (שורש א׳) |
| 5 | speed_check_only_subject never produces knowledge-gap claim | summary לא ריק, נוסח מאושר | summary ריק (subjectDecision שגוי) | speed_check_only_subject | STALE FIXTURE (שורש א׳) |
| 6 | multiple speedCheckTopics: שם רק את הנושא בעדיפות עליונה | `subjectDecision="speed_check_only_subject"` | `"insufficient_subject_data"` | speed_check_only_subject | STALE FIXTURE (שורש א׳) |
| 7 | clear_topic_gap under very-low-accuracy speed mode → focused_strengthening_needed | `"focused_strengthening_needed"` | `"insufficient_subject_data"` | clear_topic_gap (subject level) | STALE FIXTURE (שורש א׳+ב׳ יחד) |
| 8 | mixed_subject_profile (1 gap + 1 stable) | `"mixed_subject_profile"` | `"insufficient_subject_data"` | mixed_subject_profile | STALE FIXTURE (שורש ב׳) |
| 9 | mixed_subject_profile (1 gap + 5 stable) | `"mixed_subject_profile"` | `"insufficient_subject_data"` | mixed_subject_profile | STALE FIXTURE (שורש ב׳) |
| 10 | multiple_topic_gaps (2 gaps + 1 stable) | `"multiple_topic_gaps"` | `"insufficient_subject_data"` | multiple_topic_gaps | STALE FIXTURE (שורש ב׳) |
| 11 | multiple_topic_gaps (5 gaps + 1 stable) | `"multiple_topic_gaps"` | `"insufficient_subject_data"` | multiple_topic_gaps | STALE FIXTURE (שורש ב׳) |
| 12 | no unsupported claims in any topic-engine fixture text | `[]` (אין claim אסור) | `["knowledge_gap"]` בטקסט של speed_pressure_pattern | speed_pressure_pattern | STALE FIXTURE (שורש א׳, קסקייד) |

כל 12 הכשלים הם **runtime behavior דרך fixture לא-מעודכן** (לא contract registry, לא copy drift, לא stale assertion) — ה-fixtures עצמם בנו קלט בצורה שקוד production כבר לא קורא, מאז `30ebd6ebe`. **לא בוצע שום שינוי ל-expected בשום assert.** כל תיקון היה בבניית הקלט (fixtures) בלבד, כדי לשקף את הצורה האמיתית שקוד production אכן קורא — מאומת ישירות מול שני מקורות production אמיתיים (`utils/topic-next-step-engine.js`, `utils/learning-pattern-decision/build-learning-pattern-decision.js`), לא בהנחה.

### 11.4 מה תוקן בפועל — רק `tests/learning/parent-output-final-closure-contract.test.mjs` (0 שינויי קוד production)
- נוסף `GAP_AUTHORIZED_CANONICAL_STATE` / `MAINTAIN_CANONICAL_STATE` — שתי קבועי canonicalState מינימליים תואמי-production, מוזרקים דרך `unit.canonicalState` (בדיוק השדה ש-production קורא).
- `clear_topic_gap`, `topic_needs_strengthening` — קיבלו `GAP_AUTHORIZED_CANONICAL_STATE`.
- `mastery_stable` — קיבל `MAINTAIN_CANONICAL_STATE`.
- כל fixture של `speed_pressure_pattern` (topicEngineFixtures, `speedTopicFixture()`, שני מופעי `veryLowAccSpeed`) — `riskFlags` הועבר מ-`unit.riskFlags` ל-`row.topicEngineRowSignals.riskFlags` (הצורה האמיתית).
- `veryLowAccSpeed` בבדיקת ה-subject-level קיבל גם `GAP_AUTHORIZED_CANONICAL_STATE` (כדי ש-`isActionableGapTopic` יזהה אותו כ-gap אמיתי, לא רק ש-`engineDecision` יהיה נכון).
- **אין שינוי ל-`build-parent-report-engine-decision-contract.js`, `build-subject-engine-decision-contract.js`, או לכל קובץ production אחר** — הקוד היה נכון; רק ה-fixtures עודכנו לשקף קלט אמיתי.

### 11.5 לפני/אחרי — שלושת תרחישי speed pressure

**תרחיש 1 — תרגול מהיר, דיוק בינוני (28 שאלות, 12 שגיאות, 58% דיוק), ללא הוכחת פער ידע:**
| | לפני (שבור) | אחרי (מתוקן) |
|---|---|---|
| topic `engineDecision` | `topic_needs_strengthening` ❌ | `speed_pressure_pattern` ✅ |
| טקסט ברמת נושא | *"בנושא סדרות יש נקודת חיזוק שכדאי לעבוד עליה (28 שאלות, 57% דיוק). כדאי חיזוק ממוקד. מבוסס על 28 שאלות שנפתרו בנושא."* — טוען **פער ידע** ללא בסיס | **"בנושא סדרות, בתרגול המהיר נרשמו 12 שגיאות מתוך 28 שאלות (57% דיוק). כדאי לבדוק את הנושא גם בתרגול ללא הגבלת זמן, לפני שמחליטים אם נדרש חיזוק בידע."** |
| `subjectDecision` | `insufficient_subject_data` ❌ | `speed_check_only_subject` ✅ |
| `mainGaps` | — (לא הגיע לכאן) | `[]` — לא נספר כפער |
| `speedCheckTopics` | `[]` ❌ | `["sequences::g5"]` ✅ |
| טקסט ברמת מקצוע | ריק/שגוי | **"בחשבון עדיין נדרש לבדוק את הביצוע ללא הגבלת זמן. בנושא סדרות הטעויות הופיעו בתרגול מהיר, ולכן עדיין מוקדם לקבוע אם נדרש חיזוק בידע."** |

**תרחיש 2 — תרגול מהיר עם דיוק נמוך מאוד (28 שאלות, 20 שגיאות, 29% דיוק) וראיה אמיתית לפער:**
| | לפני (שבור) | אחרי (מתוקן) |
|---|---|---|
| topic `engineDecision` | `clear_topic_gap` ✅ (זה כבר עבד — accuracyBand="clear_gap" עוקף speed) | `clear_topic_gap` ✅ (ללא שינוי) |
| `subjectDecision` | `insufficient_subject_data` ❌ (speed לא ביטל פער אמיתי בכוונה, אבל ADC V2 חסר-הרשאה מנע את הסיווג כ-gap) | `focused_strengthening_needed` ✅ — פער אמיתי מנצח |

**תרחיש 3 — אותם נתונים (28 שאלות, 12 שגיאות, 58%) בתרגול רגיל (לא speed):**
| | לפני | אחרי |
|---|---|---|
| topic `engineDecision` | `topic_needs_strengthening` ✅ | `topic_needs_strengthening` ✅ (ללא שינוי — לא נגעתי בזה, כבר עבר) |

### 11.6 תוצאת בדיקה סופית
```
node tests/learning/parent-output-final-closure-contract.test.mjs
→ parent-output-final-closure-contract.test.mjs - 38/38 checks passed
→ Active decision keys covered: 22
```

### 11.7 הבדיקה הוחזרה למשטח הרשמי
- **npm script חדש:** `"test:parent-output-final-closure-contract": "node tests/learning/parent-output-final-closure-contract.test.mjs"` (נבדק: `npm run test:parent-output-final-closure-contract` → exit 0).
- **CI:** נוסף שלב חדש ל-`.github/workflows/parent-report-tests.yml`, מיד אחרי `test:parent-report-phase1` — `- run: npm run test:parent-output-final-closure-contract`. כשל עתידי בשלב הזה **יחסום את ה-CI** (כמו כל שלב אחר ב-job היחיד `parent-report-scripts`) — אין job נפרד, אין `continue-on-error`.
- לא נוצרה בדיקה כפולה — זו אותה בדיקה שכבר הייתה קיימת, רק תוקנה וחוברה.

### 11.8 קבצים ששונו בסבב 5
- `tests/learning/parent-output-final-closure-contract.test.mjs` — fixtures בלבד (סעיף 11.4), **0 שינוי ל-assert/expected**.
- `package.json` — script חדש `test:parent-output-final-closure-contract`.
- `.github/workflows/parent-report-tests.yml` — שלב CI חדש.
- `docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md` — סעיף זה + ביטול/החזרת ה-verdict.
**שום קובץ production (`utils/`, `lib/`, `pages/`) לא שונה בסבב זה.**

### 11.9 אימות סופי ממוקד (לפי בקשת המשתמש)
| Command | Exit |
|---|---|
| `node tests/learning/parent-output-final-closure-contract.test.mjs` | 0 — 38/38 |
| `node --test tests/learning/subject-engine-decision-contract.test.mjs` | 0 |
| `node --test tests/learning/parent-report-engine-decision-contract.test.mjs` | 0 |
| `node --test tests/learning/parent-report-topic-card-parent-facing.test.mjs` | 0 |
| כל 24 שלבי `parent-report-scripts` (23 בדיקות + `npx next build`) | 0 בכולם |
| `node tests/engine-decision-audit/full-engine-audit.mjs` | 0 — 846/846 |
| `npx next build` | 0 — 0 warnings, 0 errors |
| בונוס: בדיקת regression מלאה — 128 בדיקות node --test (bucket הסבב 4 + closure + 3 קבצים תלויים) | 0 — 128/128 |

---

## 12. פסק דין סופי מעודכן

APPROVED, ועכשיו בצדק: כל התנאים שהמשתמש קבע מתקיימים בו-זמנית —
`practice_more` משנה בפועל את התנהגות בחירת התוכן (סעיף 4.2) • `strengthen_prerequisite` exact_skill חסום נכון בכל מקום שאין consumer, ומופק רק ב-geometry (סעיף 4.3) • כל 8 המקצועות מכוסים דרך 7 דפי master • `parent-output-final-closure-contract.test.mjs` חזר ל-38/38 ונמצא קבוע ב-CI (סעיף 11) • כל הבדיקות וה-build עוברים • אין שינוי עיצובי בשום קובץ, באף אחד מחמשת הסבבים.

---

*הדוח הופק במצב read-only מבחינת commit/push/deploy. כל שינוי קוד בוצע בפועל בעץ העבודה בלבד. לא בוצע שינוי עיצובי בשום שלב, בחמשת הסבבים.*
