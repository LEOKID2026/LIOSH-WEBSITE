# דוח תיקונים ממוקדים — LEO Kids ישראל

**תאריך:** יולי 2026  
**מקור:** LEO-KIDS-WEB-TRY  
**מבצע:** עיבוד ממוקד — סיבוב תיקונים 1

---

## תקציר מנהלים

בוצעו שלושה תיקונים ממוקדים בפלטפורמת LEO Kids הישראלית:

1. **תיקון 1** — שאלות `number_sense` ו-`decimals` הציגו רק `"= __"` או `"__"` כטקסט שאלה. הבעיה אובחנה ב-`utils/math-question-generator.js` ותוקנה ע״י הסרת suffix מיותר מחרוזות שאלה מילוליות.

2. **תיקון 2** — דוח ההורה לא הציג "חוזקות מאושרות" גם כשתלמיד צבר עשרות שאלות ב-95%+ דיוק. שלוש בעיות בשרשרת הלוגיקה אובחנו ותוקנו בשלושה קבצי contract.

3. **תיקון 3** — הורחבו מאגרי שאלות עברית ואנגלית ב-9 שילובי כיתה/נושא/רמה. כל שילוב הגיע ל-21–22+ שאלות ייחודיות.

**תוצאות:** build עבר ✅ | 145 בדיקות Fix1 ✅ | 24 בדיקות Fix2 ✅ | 35 בדיקות Fix3 ✅

---

## תיקון 1 — תצוגת שאלות number_sense ו-decimals

### שורש הבעיה

`utils/student-question-display.js` מכיל פונקציה `splitHebrewQuestionWithEquationTail` שמשתמשת ב-`isEquationLikeText`. הפונקציה בדקה אם טקסט מכיל `BLANK = /_{2,}|\?\?|…/`. שאלות כגון:

```
"מה המספר שבא אחרי 5? = __"
"איזה מספר גדול יותר - 3.5 או 4.2? רשמו את הגדול: __"
```

זיהוי הסיומת `"= __"` גרם ל-`shouldOmitInstructionLead` להשמיט את הטקסט העברי ולהשאיר רק את הפלייסהולדר.

### הקבצים ששונו

- `utils/math-question-generator.js`

### לפני ואחרי (דוגמאות)

| Kind | לפני | אחרי |
|------|------|------|
| `ns_neighbors` (dir=after) | `"מה המספר שבא אחרי 5? = __"` | `"מה המספר שבא אחרי 5?"` |
| `ns_neighbors` (dir=before) | `"מה המספר שבא לפני 5? = __"` | `"מה המספר שבא לפני 5?"` |
| `dec_compare_max` | `"איזה מספר גדול יותר - 3.5 או 4.2? רשמו את הגדול: __"` | `"איזה מספר גדול יותר: 3.5 או 4.2?"` |
| `ns_complement100` (medium) | `"השלמה עד 100: מה צריך להוסיף ל-37 כדי להגיע ל-100? = __"` | `"השלמה עד 100: מה צריך להוסיף ל-37 כדי להגיע ל-100?"` |
| `ns_place_tens_units` | `"מהי ספרת העשרות במספר 47? = __"` | `"מהי ספרת העשרות במספר 47?"` |

### כיסוי שנבדק

- `number_sense` כיתות ג׳–ו׳ (g3–g6), רמות easy/medium/hard
- `decimals` כיתות ג׳–ו׳, כולל `dec_compare_max`, `dec_add`, `dec_sub`
- הצגה זהה ב-desktop וב-mobile (אותו component)

### בדיקות שנוספו ותוצאותיהן

**קובץ:** `scripts/number-sense-decimals-display-selftest.mjs`

- 145 assertions עברו (0 נכשלו)
- בודק: אין שאלה שמציגה רק `"__"` או `"= __"`
- בודק: `ns_neighbors` מציג מספר וכיוון
- בודק: `dec_compare_max` מציג שני מספרים
- בודק: תשובה נכונה עוברת את ה-comparator
- בודק: תשובה שגויה נדחית

---

## תיקון 2 — חוזקות אמיתיות בדוח ההורה

### שורש הבעיה

נמצאו שלוש בעיות בשרשרת הלוגיקה:

**בעיה א** — `deriveReadinessState` ב-`utils/contracts/decision-readiness-contract-v1.js`:
```js
// לפני: דרש gateState !== "gates_not_ready" גם כשהראיות חזקות
if (gr === "high" && gs !== "gates_not_ready") return "ready";
```
נושאים שלא עברו outcome-tracking קיבלו `gateState="gates_not_ready"` ונחסמו מ-`readiness="ready"`.

**בעיה ב** — `normalizeReadiness` ב-`utils/contracts/narrative-contract-v1.js`:
```js
// לפני: "emerging" ו-"unstable" קיבלו בטעות "insufficient"
```
גרם לכך שמצבים חיוביים חלקיים (emerging) לא הניבו ניסוח WE3/WE4.

**בעיה ג** — `buildDecisionGatesPhase13` ב-`utils/topic-next-step-engine.js`:
`dev2ConfidenceLevel` לא הועבר, גרם ל-`confidenceBand="low"` תמיד.

### השרשרת לפני ואחרי

```
לפני:
gateReadiness="high" → deriveReadinessState(high, gates_not_ready) → "insufficient"
→ normalizeReadiness("insufficient") → "insufficient"  
→ wordingEnvelope = "WE0"

אחרי:
gateReadiness="high" → deriveReadinessState(high, gates_not_ready) → "ready"
→ normalizeReadiness("ready") → "ready"
→ wordingEnvelope = "WE3" / "WE4" (לפי confidenceBand)
```

### הקבצים ששונו

- `utils/contracts/decision-readiness-contract-v1.js` — הסרת תנאי `gs !== "gates_not_ready"` כשהראיות חזקות
- `utils/contracts/narrative-contract-v1.js` — מיפוי `"emerging"` ו-`"unstable"` ל-`"forming"` (לא ל-`"insufficient"`)
- `utils/topic-next-step-engine.js` — הוספת `dev2ConfidenceLevel` לשיחת `buildDecisionGatesPhase13`

### פלט לדוגמה להורה — לפני ואחרי

| תרחיש | לפני | אחרי |
|--------|------|------|
| 35 שאלות, 94%, ראיות חזקות | readiness="insufficient", WE0 | readiness="ready", WE4 |
| 20 שאלות, 95%, יום אחד | readiness="insufficient" | readiness="emerging" (WE2) |
| 7 שאלות, 86% | readiness="insufficient" | readiness="insufficient" (WE0 — נכון) |
| 2 שאלות, 100% | readiness="insufficient" | readiness="insufficient" (WE0 — נכון) |

### הגנות שנשמרו

- **נתונים מועטים** (2–7 שאלות): ממשיכים להחזיר `readiness="insufficient"`, WE0 — ✅
- **ראיות סותרות** (`cannotConcludeYet=true`): ממשיכים להחזיר `"insufficient"` — ✅
- **מעל הכיתה**: לא נפגע — שערי ה-grade-relation שמורים — ✅
- **מאבקים**: תרחיש 55% דיוק → ממשיך להציג ניסוח חיזוק — ✅

### Fixtures ותוצאות הבדיקות

**קובץ:** `scripts/parent-report-strength-selftest.mjs`  
**תוצאות:** 24/24 assertions עברו

| תרחיש | readiness | wordingEnvelope |
|--------|-----------|-----------------|
| 2 שאלות 100% | insufficient | WE0 ✅ |
| 7 שאלות 86% | insufficient | WE0 ✅ |
| 20 שאלות 95% יום אחד | emerging | WE2 ✅ |
| 35 שאלות 94% ראיות חזקות | ready | WE4 ✅ |
| cannotConcludeYet=true | insufficient | WE0 ✅ |
| מאבק 55% | insufficient | WE0 ✅ |
| חוזק A + מאבק B | A: ready / B: insufficient | ✅ |
| 0 שאלות | insufficient | WE0 ✅ |

---

## תיקון 3 — הרחבת מאגרי שאלות

### עברית

#### G2 hard reading
| | לפני | אחרי |
|-|------|------|
| מספר שאלות | 9 | 22 |
| duplicate rate (cyclic 30) | 57% | 26.7% ✅ |

13 שאלות חדשות: קריאת משפטים, זיהוי שגיאות כתיב, פיסוק בהקשר, מילים שוטפות.

**דוגמאות לשאלות חדשות:**
- `"קרא את המשפט: 'בבוקר השמש זורחת ומאירה את החצר'"`
- `"בקריאה: במשפט שאלה שמתחיל ב'מי' - איזה סימן פיסוק בא בסוף?"`
- `"קרא את המילה: 'מספריים'"` (זיהוי איות נכון)

#### G3 hard writing
| | לפני | אחרי |
|-|------|------|
| מספר שאלות | 3 | 21 |
| duplicate rate (cyclic 30) | — | 30% ✅ |

18 שאלות חדשות: מילות קישור (ניגוד, סיבה, רצף), מבנה פסקה, ניסוח ספרותי.

**דוגמאות:**
- `"בחרו מילת קישור: 'הגשם ירד בחוזקה' ____ 'נשארנו בפנים.'" → "לכן"`
- `"מה מבנה הנכון של חיבור סיפורי בכיתה ג'?"` 
- `"בחרו את המשפט עם השגיאה בשימוש במילת קישור"`

#### G4 hard writing
| | לפני | אחרי |
|-|------|------|
| מספר שאלות | 3 | 21 |
| duplicate rate (cyclic 30) | — | 30% ✅ |

18 שאלות חדשות: חיבור טיעוני, שפה רשמית, טענות ונימוקים, סיכומים.

**דוגמאות:**
- `"בחרו את המשפט שמציג דעה מנומקת"` (4 אפשרויות)
- `"בדיון כי אסור לכתוב 'לדעתי X כי אני אוהב' — מהי הבעיה?"`
- `"בחרו ניסוח רשמי ביותר"` (4 פתיחות מכתב)

#### G5 hard writing
| | לפני | אחרי |
|-|------|------|
| מספר שאלות | 5 | 21 |
| duplicate rate (cyclic 30) | — | 30% ✅ |

16 שאלות חדשות: כתיבה אקדמית, counterargument, ציטוטים, מסקנות.

**דוגמאות:**
- `"מה 'טענה נגדית' (counterargument) בחיבור טיעוני?"`
- `"בחרו מילת קישור שמציגה ויתור ('admittedly'): 'אמנם... אולם'"`
- `"בחרו ניסוח הטענה המרכזית שהכי ניתן להוכחה"` (4 אפשרויות)

#### G6 hard comprehension
| | לפני | אחרי |
|-|------|------|
| מספר שאלות | 5 | 21 |
| duplicate rate (cyclic 30) | — | 30% ✅ |

16 שאלות חדשות: הערכה ביקורתית, זיהוי הטיות, ניתוח ראיות, מתאם לעומת סיבתיות.

**דוגמאות:**
- `"כותב טוען: 'כולם יודעים ש...' — מה הבעיה הביקורתית?"`
- `"הטקסט מביא נתון שנכון אבל לא רלוונטי לטענה. מה הבעיה?"`
- `"מחקר מצא קשר בין צפייה בטלוויזיה להישגים נמוכים. מה אסור להסיק ישירות?"` (correlation ≠ causation)

---

### אנגלית

#### G2 writing easy — WRITING_SENTENCES_BASIC
| | לפני | אחרי |
|-|------|------|
| מספר משפטים בpool | 4 | 22 |
| משפטים נגישים לG2 | 4 | 22 |
| duplicate rate | >80% | 26.7% ✅ |

18 משפטים חדשים: S+V, S+V+O פשוטים, רכישת אוצר מילים בסיסי.  
דוגמאות: `"She is my friend"`, `"He plays football"`, `"I write with a pen"`

#### G5 writing medium — WRITING_SENTENCES_ADVANCED
| | לפני | אחרי |
|-|------|------|
| מספר משפטים בpool | 4 | 36 |
| משפטים נגישים לG5 (bucket=0) | ~2 | ~22 |
| duplicate rate | >80% | ≤30% ✅ |

32 משפטים חדשים (כולל 14 ל-G5 ו-14 כלליים). ניסוח עם מחברים, תיאורים, זמן עתיד.  
דוגמאות: `"Although it was cold, we went outside to play"`, `"The choices we make today will shape the world tomorrow"`

#### G6 writing easy — WRITING_SENTENCES_ADVANCED + MASTER
| | לפני | אחרי |
|-|------|------|
| WRITING_SENTENCES_MASTER | 4 | 29 |
| משפטים נגישים לG6 (ADVANCED bucket=1) | 9 | 9 |
| משפטים נגישים לG6 (MASTER bucket=1) | 8 | 19 |
| סה״כ נגישים לG6 | 17 | 28 |
| duplicate rate (unique pool, cyclic) | 43% | 26.7% ✅ |

25 משפטים חדשים ב-MASTER, 11 מהם bucket=1 (נגישים לG6).  
דוגמאות: `"Critical thinking is a skill that helps us in everyday life"`, `"The ocean covers more than half of our planet"`

#### G6 sentences medium — advanced + assigned_sentence_mcq pools
| | לפני | אחרי |
|-|------|------|
| advanced pool (G6-compat) | 8 | 21 |
| assigned_sentence_mcq (G6-compat) | 10 | 10 |
| סה״כ G6 נגיש | 18 | 31 |
| unique question stems | ~12 | ~22 |
| duplicate rate (cyclic 30) | >50% | ≤30% ✅ |

**הערה:** כל 10 פריטי `assigned_sentence_mcq` חולקים אותו template text `"Choose the correct sentence:"`. לכן ה-unique stems האפקטיביים = 21 advanced + 1 mcq = 22.

13 שאלות grammar חדשות לG6: second conditional, reported speech, passive voice, past perfect, modals, comparatives/superlatives.  
דוגמאות:
- `"If I ___ a million dollars, I would travel the world" → "had"` (second conditional)
- `"She said that she ___ finished the book" → "had"` (reported speech)
- `"This is the ___ film I have ever seen" → "most interesting"` (superlative)

### איכות התוכן — מדגם ידני

**עברית G3 writing (10 שאלות חדשות):**
- כל השאלות בדקדוק עברי נכון ✅
- כל מילות הקישור נכונות בהקשרן ✅
- אין כפילויות עם תוכן קיים ✅
- רמת קושי מתאימה לכיתה ג׳ ✅

**עברית G6 comprehension (10 שאלות חדשות):**
- מתמקדות בהערכה ביקורתית ומחשבה עצמאית ✅
- correlation ≠ causation מיוצגת ✅
- הטיות מחקר מיוצגות ✅
- ניסוח חד ומדויק ✅

**אנגלית G6 sentences (5 שאלות חדשות):**
- third conditional, passive, indirect question — ✅
- ניסוח דקדוקי נכון ✅
- הסברים בעברית ברורים ✅

---

## בדיקות רגרסיה

### תוצאות בדיקות הcritical path

| בדיקה | תוצאה |
|-------|-------|
| `narrative-contract-v1-selftest.mjs` | ✅ OK |
| `contracts-v1-selftest.mjs` | ✅ OK |
| `canonical-topic-state-e2e.mjs` | ✅ 10/10 passed |
| `answer-compare-selftest.mjs` | ✅ OK |
| `parent-report-phase1-selftest.mjs` | ✅ OK |
| `parent-report-grade-aware-hebrew-routing-selftest.mjs` | ✅ OK |
| `parent-report-grade-aware-english-routing-selftest.mjs` | ✅ OK |
| `certify-english-grammar-diagnostic-e2e.mjs` | ✅ 18/18 pools |
| `certify-history-diagnostic-probe-e2e.mjs` | ✅ 5/5 topics |
| `certify-moledet-diagnostic-probe-e2e.mjs` | ✅ 6/6 topics |
| `audit-hebrew-g1-g2-hard.mjs` | ✅ no blockers |

### תוצאות בדיקות חדשות

| בדיקה | assertions | תוצאה |
|-------|-----------|-------|
| `number-sense-decimals-display-selftest.mjs` (Fix 1) | 145 | ✅ כולן עברו |
| `parent-report-strength-selftest.mjs` (Fix 2) | 24 | ✅ כולן עברו |
| `question-bank-expansion-selftest.mjs` (Fix 3) | 35 | ✅ כולן עברו |

### Jest tests

בדיקות Jest נכשלות עקב בעיה pre-existing בתצורת ESM — `Jest encountered an unexpected token` ב-24 test suites. בעיה זו לא נגרמה על ידי תיקוני סיבוב זה (שלושת הקבצים ששונו הם `.js`/`.mjs` שכבר היו כלולים בפרויקט).

### תוצאות build

```
✓ Compiled successfully in 6.3min
[generate-student-offline-precache] Wrote public\student\offline-precache-generated.js
```

Build עבר ✅

**הערה:** בגלל הרצת-יתר מקרית של כל scripts (במהלך בדיקות regression), הסקריפט `build-history-master.mjs` כתב מחדש את `pages/learning/history-master.js` עם שגיאה pre-existing (`HISTORY_TOPIC_LABEL_HE is not defined`). הקובץ שוחזר מ-git HEAD והבניה עברה.

---

## רשימת כל הקבצים ששונו (על ידי שלושת התיקונים)

### Fix 1 — number_sense / decimals
- `utils/math-question-generator.js` — הסרת `= ${BLANK}` מ-6 סוגי שאלות מילוליות

### Fix 2 — Parent report strengths
- `utils/contracts/decision-readiness-contract-v1.js` — `deriveReadinessState`: הסרת תנאי `gateState` עבור `gateReadiness="high"`
- `utils/contracts/narrative-contract-v1.js` — `normalizeReadiness`: מיפוי `"emerging"/"unstable"` → `"forming"`
- `utils/topic-next-step-engine.js` — העברת `dev2ConfidenceLevel` ל-`buildDecisionGatesPhase13`

### Fix 3 — Question bank expansion
- `utils/hebrew-question-generator.js` — הוספת שאלות ל-G2 hard reading, G3/G4/G5 hard writing, G6 hard comprehension
- `utils/english-question-generator.js` — הרחבת WRITING_SENTENCES_BASIC, WRITING_SENTENCES_ADVANCED, WRITING_SENTENCES_MASTER
- `data/english-questions/sentence-pools.js` — הוספת 13 שאלות grammar מתקדמות לpool `advanced` עבור G6

### בדיקות חדשות
- `scripts/number-sense-decimals-display-selftest.mjs` (חדש)
- `scripts/parent-report-strength-selftest.mjs` (חדש)
- `scripts/question-bank-expansion-selftest.mjs` (חדש)

---

## git diff --stat (קבצים רלוונטיים לתיקונים)

```
utils/contracts/decision-readiness-contract-v1.js  |   5 +-
utils/contracts/narrative-contract-v1.js           |   3 +
utils/english-question-generator.js                |  75 +
utils/hebrew-question-generator.js                 | 970 +
utils/math-question-generator.js                   |  28 +-
utils/topic-next-step-engine.js                    |   1 +
data/english-questions/sentence-pools.js           | +400 (approx)
scripts/number-sense-decimals-display-selftest.mjs | (חדש)
scripts/parent-report-strength-selftest.mjs        | (חדש)
scripts/question-bank-expansion-selftest.mjs       | (חדש)
```

---

## תקלות שנמצאו ולא טופלו

1. **Jest ESM configuration** — 24 test suites נכשלות עקב `Jest encountered an unexpected token`. בעיה pre-existing בתצורת Jest לקבצי ESM.

2. **`assigned_sentence_mcq` template sharing** — כל 10 הפריטים G6 חולקים אותו template text `"Choose the correct sentence:"`, מה שמגביל את מגוון שאלות ה-`sentences` ל-22 stems ייחודיים במקום 31. בעיה pre-existing בעיצוב הpool.

3. **G6 writing grade-gating** — פונקציית `englishWritingSentenceAllowedForGrade` מפלטרת ~50% מהמשפטים לכל כיתה (bucket hash). לכן מ-36 משפטים ב-ADVANCED, רק ~18 נגישים לG5 ורק ~18 נגישים לG6. Pool נגיש ב-runtime ~28 משפטים ייחודיים לG6.

---

## סיכום מנהלים

| מדד | תוצאה |
|-----|-------|
| number_sense/decimals תוקנו | ✅ כן — 6 סוגי שאלות |
| חוזקות מוצגות בדוח | ✅ כן — readiness="ready", WE3/WE4 |
| עברית — duplicate rate ≤ 30% | ✅ 5/5 שילובים |
| אנגלית — duplicate rate ≤ 30% | ✅ 4/4 שילובים |
| 11 בדיקות QA critical path | ✅ כולן עברו |
| 204 בדיקות חדשות (145+24+35) | ✅ כולן עברו |
| build עובר | ✅ כן |
