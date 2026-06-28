---
name: 2-Level Migration Plan Final
version: final
status: locked-pending-owner-signoff
overview: "Plan Final — מעבר מ-3 רמות ל-2 רמות (רגיל/מתקדם). התוכנית הקובעת היחידה. mapping בלבד, sourceDifficulty, adaptive פנימי, מדעים regular-only, בלי שינוי בנקים/DB."
todos:
  - id: phase0-mapping
    content: "Phase 0: grep מלא + level-migration-impact.json + copy inventory (מתחיל רק אחרי אישור Plan Final)"
    status: pending
  - id: phase1-ssot
    content: "Phase 1: display-level.js + regular-internal-adaptive.js + science-internal-adaptive.js + unit tests"
    status: pending
  - id: phase2-generators
    content: "Phase 2: 6 generators + activity client (תיקון mixed→medium!) + probe script"
    status: pending
  - id: phase3-evidence
    content: "Phase 3: session/answer API + diagnostic-evidence + aggregate + resume compat"
    status: pending
  - id: phase4-student-ui
    content: "Phase 4: 6 masters + curriculum — רגיל/מתקדם בכל מקצוע חוץ ממדעים (regular-only)"
    status: pending
  - id: phase5-activities
    content: "Phase 5: parent/teacher activities + backward compat mapper"
    status: pending
  - id: phase6-reports
    content: "Phase 6: parent report + topic-next-step (עדכון מנוע קיים) + copy guards + truth regen"
    status: pending
  - id: phase7-qa
    content: "Phase 7: tests + visual QA + six-subject smoke + inventory matrix"
    status: pending
  - id: phase8-readiness
    content: "Phase 8: nightly full + daily-gate READY + owner closure signoff"
    status: pending
isProject: false
---

# Plan Final — מעבר מ-3 רמות ל-2 רמות (רגיל / מתקדם)

> **התוכנית הקובעת היחידה.**
>
> **סטטוס:** נעול — ממתין לאישור בעלים אחד (§20) לפני Phase 0.
>
> **לא לבצע קוד עד אישור Plan Final.**

---

## 1. Executive Summary

הפרויקט משנה **רק** שכבת תצוגה, מיפוי, בחירת שאלות, evidence, דוחות, פעילויות ו-UI סביב רמות.

| מה המשתמש רואה | `displayLevel` | `sourceDifficulty` (פנימי) |
|---|---|---|
| רגיל | `regular` | `easy` + `medium` — adaptive פנימי |
| מתקדם | `advanced` | `hard` בלבד |
| רגיל (מדעים בלבד) | `regular` | `easy` + `medium` + `hard` — adaptive פנימי |

**Copy סופי בכל UI ודוחות:** **רגיל** / **מתקדם** (לא "תרגול רגיל", לא "אתגר מתקדם").

**גישה:** mapping בלבד — SSOT חדש, mappers, adaptive modules, עדכון מנוע המלצות קיים (לא מנוע חדש).

**חריג יחיד:** מדעים = רגיל בלבד. **כל שאר המקצועות** — רגיל + מתקדם, **כולל אנגלית א׳–ב׳**. לא מסתירים רמות או נושאים בגלל כמות שאלות.

**היקף:** ~55–70 קבצי production + ~25 QA/tests. 8 phases.

**באג קритי לתיקון:** [`generate-activity-questions-client.js`](lib/classroom-activities/generate-activity-questions-client.js) שורה 205 — `mixed→medium` חייב להפוך ל-mapping החדש.

---

## 2. החלטות בעלים סופיות

כל הסעיפים הבאים **סגורים**. אין שאלות פתוחות.

1. **UI בכל האתר:** רגיל / מתקדם (במקום קל / בינוני / קשה).
2. **רגיל** = `easy` + `medium` — adaptive פנימי, לא ערבוב אקראי.
3. **מתקדם** = `hard` בלבד.
4. **מדעים** = רגיל בלבד; פנימית `easy` + `medium` + `hard`; adaptive easy→medium→hard.
5. **אנגלית א׳–ב׳:** רגיל / מתקדם — **לא** מסתירים מתקדם.
6. **לא מסתירים** רמות, נושאים, או מתקדם בגלל מעט שאלות. תאים דלים → רישום בדוח מיפוי/QA בלבד.
7. **בנקי שאלות:** zero change — `easy`/`medium`/`hard` נשארים בבנק.
8. **DB schema:** לא משתנה. אין migration.
9. **פעילויות חדשות:** `regular`→`mixed`, `advanced`→`hard`, מדעים `regular`→`mixed`.
10. **`mixed`/`regular`:** לא מושך `medium` בלבד — `easy+medium` (מדעים: `easy+medium+hard`).
11. **Evidence:** `displayLevel` + `sourceDifficulty` בכל תשובה/session/resume/aggregate.
12. **מנוע המלצות:** עדכון [`topic-next-step-engine.js`](utils/topic-next-step-engine.js) הקיים — progression `רגיל→מתקדם`; לא בונים מנוע חדש.
13. **Adaptive פנימי:** 3 תשובות נכונות רצופות → עלייה; 2 טעויות רצופות → ירידה.
14. **המלצה למתקדם:** רק אחרי הצלחה יציבה ברגיל **כולל** הצלחה בשאלות `medium` פנימיות. קבועים: accuracy ≥75%, ≥20 שאלות ברגיל, ≥60% מהראיות מ-`medium`.
15. **כישלון במתקדם:** לא "פער יסוד"; ניסוח "אתגר גבוה" + המלצה לחזור לרגיל; אין grade drop מ-advanced בלבד.
16. **Copy:** רגיל / מתקדם בלבד. בדוח — ניסוח הסברי סביב כישלון במתקדם מותר ("האתגר היה גבוה"), שם הרמה נשאר "מתקדם".
17. **סגירת פרויקט:** nightly full / בדיקה רחבה מלאה **חובה** לפני אישור סגירה (§17, §19).
18. **Scope:** רמות בלבד — לא נושאים, לא שאלות, לא ספרים, לא משחקים.

---

## 3. מה לא עושים

- לא משנים `difficulty` / `levelKey` בקבצי בנק שאלות
- לא מוסיפים / מוחקים / מאחדים / מסתירים / משנים שמות נושאים
- לא משנים ספרים, משחקים, prototypes, arcade, תוכן לימודי
- לא DB migration / ALTER TABLE / enum change
- לא מסתירים מתקדם בגלל מעט שאלות (כולל אנגלית א׳–ב׳)
- נושא/תא דל → רישום ב-`level-migration-impact.json` בלבד

**הפרויקט =** איחוד רמות / מיפוי / תצוגה / שמירת מקור קושי / דוחות / פעילויות סביב רמות.

---

## 4. ארכיטקטורת רמות חדשה

### 4.1 שני מישורים

```mermaid
flowchart TB
  subgraph display [DisplayLayer]
    DL["displayLevel: regular | advanced"]
    LabelHe["UI: רגיל | מתקדם"]
  end
  subgraph internal [InternalLayer]
    RIS["regularInternalState: easy | medium"]
    SIS["scienceInternalState: easy | medium | hard"]
    SD["sourceDifficulty per question"]
    Bank["Banks: easy medium hard unchanged"]
  end
  subgraph persist [Persistence]
    Session["session.metadata"]
    Answer["answer_payload"]
    LS["localStorage snap"]
    Activity["activity difficulty_level DB"]
  end
  DL --> RIS
  DL --> SIS
  RIS --> SD
  SIS --> SD
  SD --> Bank
  SD --> Answer
  DL --> Session
  RIS --> Session
  DL --> LS
```

### 4.2 SSOT — [`lib/learning/display-level.js`](lib/learning/display-level.js) (חדש)

```javascript
displayLevelToSourceDifficulties(displayLevel, subjectId)
sourceDifficultyToDisplayLevel(sourceDifficulty)
displayLevelLabelHe(displayLevel)              // "רגיל" | "מתקדם"
isDisplayLevelAllowedForSubject(displayLevel, subjectId)  // science: advanced=false
normalizeLegacyLevelToDisplayLevel(legacy)
displayLevelToActivityDbEnum(displayLevel)       // regular→mixed; advanced→hard
activityDbEnumToDisplayLevel(dbEnum)
resolveActivitySourceDifficulties(dbEnum, subjectId)  // mixed mapping — NOT medium-only
resolveSessionLevels({ level, displayLevel, sourceDifficulty, regularInternalState, subjectId })
```

**אין** `isAdvancedAvailableForSubjectGrade` — לא מסתירים מתקדם לפי grade/topic.

### 4.3 Modules adaptive (חדשים)

| Module | שימוש |
|---|---|
| [`lib/learning/regular-internal-adaptive.js`](lib/learning/regular-internal-adaptive.js) | regular בכל מקצוע **חוץ ממדעים** — `["easy","medium"]` |
| [`lib/learning/science-internal-adaptive.js`](lib/learning/science-internal-adaptive.js) | מדעים — `["easy","medium","hard"]` — refactor מ-[`science-master.js`](pages/learning/science-master.js) |

**מקור:** `applyAdaptiveDifficulty()` — 3↑ / 2↓; לא פעיל ב-`mistakes`/`graded`.

---

## 5. displayLevel / sourceDifficulty — איפה נשמרים

| שכבה | שדות חדשים | legacy compat | מיקום |
|---|---|---|---|
| React state/refs | `displayLevel`, `regularInternalStateRef`, streaks | `level` → mapped on read | 6 × `*-master.js` |
| Session start | `metadata.displayLevel`, `metadata.regularInternalState` | `metadata.level` = displayLevel | [`session/start.js`](pages/api/learning/session/start.js) |
| Answer payload | `displayLevel`, `sourceDifficulty` | `clientMeta.level` = sourceDifficulty | [`answer.js`](pages/api/learning/answer.js) |
| answer_payload DB | top-level both fields | `questionEngine.difficulty` unchanged | insertAnswerRow |
| diagnostic-evidence | both explicit | `questionLevel` = sourceDifficulty | [`diagnostic-evidence.js`](utils/diagnostic-evidence.js) |
| diagnosticMetadata | both | engine fields unchanged | [`diagnostic-canonical-metadata.js`](lib/learning/diagnostic-canonical-metadata.js) |
| localStorage snap | both + streaks + internalState | `snap.level` via `resolveSessionLevels` | per-master `STORAGE_KEY` |
| learning profile / scores | `${displayLevel}_${topic}` | fallback `${oldLevel}_${topic}` | math-master etc. |
| Activity DB | — | `difficulty_level` enum unchanged | Supabase |
| Activity play metadata | `displayLevel` | from DB mapper | [`assigned-activity-play-metadata.server.js`](lib/classroom-activities/assigned-activity-play-metadata.server.js) |
| Parent aggregate | `dominantDisplayLevel` | `_sourceDifficultyBreakdown` internal | [`report-data-aggregate.server.js`](lib/parent-server/report-data-aggregate.server.js) |
| Mistakes events | `sourceDifficulty` | `level` → sourceDifficulty | `mleo_mistakes` |
| parentReportTruth | regular/advanced strings | regenerate fixtures | launch-readiness |

**Per answer (חובה):**
```javascript
{ displayLevel: "regular"|"advanced", sourceDifficulty: "easy"|"medium"|"hard" }
```

**Per session regular (חובה):**
```javascript
{ displayLevel: "regular", regularInternalState: "easy"|"medium" }
// science: scienceInternalState: "easy"|"medium"|"hard"
```

---

## 6. Adaptive בתוך רגיל — פירוט מלא

### 6.1 אלגוריתם (סגור)

| פרמטר | ערך |
|---|---|
| `startState` | `"easy"` |
| `advanceStreak` | 3 תשובות נכונות רצופות |
| `dropStreak` | 2 תשובות שגויות רצופות |
| `INTERNAL_ORDER` (רגיל) | `["easy","medium"]` |
| `INTERNAL_ORDER` (מדעים) | `["easy","medium","hard"]` |
| modes ללא adaptive | `mistakes`, `graded`, assigned fixed |

Streak-based step הוא SSOT. Weighted fallback רק אם pool ריק ב-level הנוכחי.

### 6.2 איפה נשמר `regularInternalState`

1. React ref — runtime
2. localStorage snap — resume
3. session metadata — server
4. clientMeta per answer — audit (optional)

### 6.3 עדכון

```
onAnswer(isCorrect):
  if displayLevel !== "regular" → skip
  if mode in NO_ADAPTIVE_MODES → skip
  update streaks
  if correctStreak >= 3 → stepInternal(+1)
  if wrongStreak >= 2 → stepInternal(-1)
  pick question at current internal state
  tag sourceDifficulty on question
  persist ref + localStorage
```

### 6.4 לפי מקצוע

| מקצוע | UI | Adaptive | Pick |
|---|---|---|---|
| מתמטיקה | רגיל/מתקדם | easy↔medium | `getLevelConfig(grade, state)` → generate |
| גאומטריה | idem | idem | idem |
| עברית | idem | idem | static filter by state |
| **אנגלית (כולל א׳–ב׳)** | **רגיל/מתקדם** | easy↔medium | `ENGLISH_LEVELS[state]`; advanced=hard |
| **מדעים** | **רגיל בלבד** | easy↔medium↔hard | filter all 3 by internal state |
| מולדת | רגיל/מתקדם | easy↔medium | static filter |

### 6.5 Resume

1. Load snap → `resolveSessionLevels()`
2. Old `level:"easy"|"medium"` → regular + matching internalState
3. Old `level:"hard"` → advanced
4. Restore streaks or reset to 0
5. DB answers pre-migration: backfill displayLevel at aggregate **read** only

---

## 7. מתקדם — התנהגות, המלצות, כישלון

### 7.1 Selection
- `advanced` → `hard` only. ללא adaptive.

### 7.2 מנוע המלצות — עדכון קיים (לא חדש)

[`topic-next-step-engine.js`](utils/topic-next-step-engine.js):

**Progression חיצוני (במקום easy→medium→hard):**
```
רגיל → מתקדם
```

**Progression פנימי (בתוך regular בלבד):**
```
easy ↔ medium
```

**כללי המלצה (סגורים):**

| מצב | step |
|---|---|
| הצלחה יציבה ברגיל + medium evidence | `advance_to_advanced` |
| הצלחה רק ב-easy, חלש ב-medium | `maintain_regular_strengthen_medium` — נשאר רגיל |
| כישלון במתקדם | `suggest_return_to_regular` |
| כישלון במתקדם | **לא** `drop_one_level`, **לא** grade drop |

**קבועים להמלצה למתקדם:**
- accuracy ≥ 75%
- ≥ 20 שאלות ברגיל
- ≥ 60% מהראיות/שאלות מ-`sourceDifficulty: "medium"`

### 7.3 Copy כישלון במתקדם

- **מותר:** "האתגר היה גבוה", "מומלץ לחזור לתרגול רגיל"
- **אסור:** "פער יסודי", "חוסר הבנה בסיסית" (copy guard: `advanced_struggle_not_fundamental`)
- **שם רמה בדוח:** "מתקדם"

---

## 8. מדעים regular-only — פירוט מלא

### 8.1 כלל
- `displayLevel` תמיד `"regular"`
- פנימית: easy + medium + hard
- Adaptive: easy → medium → hard (3↑ / 2↓)
- כל תשובה: `sourceDifficulty` המקורי

### 8.2 Enforcement checklist

| Surface | Enforcement |
|---|---|
| Student UI | אין בוחר רמה; אין מתקדם | [`science-master.js`](pages/learning/science-master.js) |
| Parent activity | רגיל בלבד | [`AssignActivityModal.js`](components/parent/AssignActivityModal.js) |
| Teacher activity | רגיל בלבד | `pages/teacher/**/activities/new.js` |
| Generator | mixed/regular → E+M+H | [`generate-activity-questions-client.js`](lib/classroom-activities/generate-activity-questions-client.js) |
| DB write | `mixed` | parent/teacher server |
| Report | לא "מתקדם" | parent-report-* |
| next-step | לא `advance_to_advanced` | topic-next-step-engine.js |
| Evidence | displayLevel=regular always | diagnostic-evidence.js |
| QA matrix | regular column only | qa-question-inventory-matrix.mjs |
| QA probes | לא advanced | generator probe |
| Snapshots/truth | לא advanced strings | launch-readiness |
| copy guard | אין "מתקדם" + "מדעים" | forbidden-terms.js |
| curriculum | אין בחירת רמה | curriculum.js |
| `isDisplayLevelAllowedForSubject` | advanced+science=false | display-level.js |

### 8.3 מדעים G1–G2
- UI: רגיל בלבד (כמו כל מדעים)
- פנימית: adaptive על easy/medium/hard — **לא** מוגבל ל-easy בלבד (בניגוד למדיניות UI ישנה)

---

## 9. השפעה לפי מקצוע

| מקצוע | UI | Generator | Adaptive | תאים דלים |
|---|---|---|---|---|
| מתמטיקה | רגיל/מתקדם | regular:E+M; adv:H | easy↔medium | רישום בלבד |
| גאומטריה | idem | idem | idem | רישום בלבד |
| עברית | idem | idem | idem | רישום בלבד |
| **אנגלית (א׳–ו׳)** | **רגיל/מתקדם** | idem | idem | רישום בלבד — **UI מציג מתקדם** |
| **מדעים** | **רגיל בלבד** | regular:E+M+H | easy↔medium↔hard | רישום בלבד |
| מולדת | רגיל/מתקדם | idem | idem | רישום בלבד |

---

## 10. השפעה על בחירת שאלות / Generators

### 10.1 כלל

```
science → pick from [easy,medium,hard] via scienceInternalState
advanced → pick from [hard]
regular → pick from [easy,medium] via regularInternalState
```

### 10.2 באג קритי — mixed

```javascript
// TODAY (WRONG):
mixed → medium

// FINAL:
mixed/regular + non-science → ["easy","medium"] + adaptive
mixed/regular + science     → ["easy","medium","hard"] + adaptive
```

### 10.3 אנגלית א׳–ב׳

- **UI:** רגיל / מתקדם — כמו שאר המקצועות
- **מתקדם:** מושך `hard` (גם אם pool דל — UI עדיין מציג)
- **הסרה נדרשת בקוד:** `englishLevelKeysForGradeKey` שמגביל G1-G2 ל-easy/medium — יוחלף ב-displayLevel picker רגיל/מתקדם
- **תאים דלים:** רישום ב-`level-migration-impact.json` — לא שינוי מדיניות תצוגה

---

## 11. Sessions / answers / evidence / resume

(ראה §5 — ללא שינוי מהותי.)

**Session start payload (כל masters):**
```javascript
{ level: displayLevel, displayLevel, regularInternalState, clientMeta: { version: "level-v2" } }
```

**Per answer:**
```javascript
{ displayLevel, sourceDifficulty, regularInternalState }
```

---

## 12. דוחות הורים

### 12.1 Copy סופי

```javascript
PARENT_REPORT_LEVEL_LABELS_HE = {
  regular: "רגיל",
  advanced: "מתקדם",
  // legacy — mapped at read, never shown to parent:
  easy: "רגיל", medium: "רגיל", hard: "מתקדם",
}
```

### 12.2 Aggregation
- Parent-facing: `dominantDisplayLevel` → "רגיל"/"מתקדם"
- Internal: `_sourceDifficultyBreakdown` — לא ב-PDF
- Science: תמיד "רגיל"

### 12.3 קבצים
- [`parent-report-display-labels.he.js`](utils/parent-report-language/parent-report-display-labels.he.js)
- [`parent-report-v2.js`](utils/parent-report-v2.js)
- [`parent-facing-normalize-he.js`](utils/parent-report-language/parent-facing-normalize-he.js)
- [`forbidden-terms.js`](utils/parent-report-language/forbidden-terms.js)
- [`engine-decision-parent-copy-he.js`](utils/parent-report-language/engine-decision-parent-copy-he.js)
- [`topic-next-step-engine.js`](utils/topic-next-step-engine.js)
- [`components/parent-report-detailed-surface.jsx`](components/parent-report-detailed-surface.jsx)

---

## 13. פעילויות הורה/מורה

### 13.1 DB — ללא שינוי
`difficulty_level`: `easy | medium | hard | mixed`

### 13.2 Read (display)
| DB | UI | Generator |
|---|---|---|
| easy | רגיל | easy+medium adaptive |
| medium | רגיל | easy+medium adaptive |
| mixed | רגיל | easy+medium adaptive (מדעים: +hard) |
| hard | מתקדם | hard |

### 13.3 Write (new)
| UI | DB |
|---|---|
| regular | `mixed` |
| advanced | `hard` |
| science regular | `mixed` |

---

## 14. UI תלמיד / הורה / מורה / admin

### Student
| File | Change |
|---|---|
| 6 × `*-master.js` | רגיל/מתקדם (מדעים: רגיל בלבד); adaptive; copy רגיל/מתקדם |
| [`english-master.js`](pages/learning/english-master.js) | **הסר** `englishLevelKeysForGradeKey` G1-G2 restriction |
| [`science-master.js`](pages/learning/science-master.js) | רגיל בלבד; הסר level picker |
| [`curriculum.js`](pages/learning/curriculum.js) | labels |

**Out of scope:** solo-games, educational-games, prototypes, arcade.

### Parent / Teacher / Admin
- AssignActivityModal, teacher activity new, monitor, export, admin analytics (debug only for sourceDifficulty)

---

## 15. כל הקבצים — רשימה מלאה

(ללא שינוי מ-V2 — ראה §15 בגרסה הקודמת; Phase 0 grep יאמת.)

**חדשים:** `display-level.js`, `regular-internal-adaptive.js`, `science-internal-adaptive.js`, `display-level-selftest.mjs`

**קריטיים:** 6 generators, `generate-activity-questions-client.js`, session/answer API, 6 masters, topic-next-step-engine, parent-report-*, AssignActivityModal, activity servers, ~25 QA files.

---

## 16. בדיקות לעדכון

| Test | Change |
|---|---|
| `display-level-selftest.mjs` | mappers; science-only exception |
| `regular-internal-adaptive-selftest.mjs` | streak machine |
| `parent-report-display-labels-selftest.mjs` | רגיל/מתקדם |
| `student-activities-unit.mjs` | mixed→E+M; science→E+M+H |
| activity/truth/aggregate tests | displayLevel + sourceDifficulty |
| `hebrew-copy-delta-gate-*.mjs` | forbid קל/בינוני/קשה |
| `qa-question-inventory-matrix.mjs` | regular/advanced; science regular-only |
| generator probe (new) | all subjects incl. english G1-G2 advanced |

---

## 17. QA plan — חובה לפני סגירה

### 17.1 סדר הרצה (כולם חובה)

1. mapping unit tests
2. adaptive unit tests
3. generator probes — **כולל english G1-G2 advanced=hard**
4. evidence round-trip
5. parent activity E2E
6. teacher activity E2E
7. backward compat old activities (easy/medium/mixed/hard)
8. parent report truth
9. advanced failure narrative fixture
10. resume session
11. copy inventory gate — zero קל/בינוני/קשה in user UI
12. Visual QA — 6 subjects + parent + teacher
13. six-subject smoke
14. `npm run qa:question-inventory-matrix`
15. daily-gate READY
16. **nightly full / בדיקה רחבה מלאה** — חובה לפני סגירת פרויקט

### 17.2 Generator probe matrix

| Subject | regular | advanced |
|---|---|---|
| math, geometry, hebrew, moledet | E+M tags only | H only |
| **english G1-G2** | E+M | **H only** |
| english G3-G6 | E+M | H |
| science | E+M+H | N/A (regular-only) |

### 17.3 Inventory thresholds

| Column | Rule |
|---|---|
| regular (non-science) | count(easy)+count(medium) ≥ 16 |
| advanced | count(hard) ≥ 16 |
| science | count(all) ≥ 16; no advanced column |

תאים מתחת לסף → **warning בדוח**, לא שינוי UI.

---

## 18. סיכונים ופתרונות

| # | סיכון | Mitigation |
|---|---|---|
| 1 | איבוד sourceDifficulty | Phase 3 לפני UI; resolveSessionLevels |
| 2 | mixed→medium | תיקון Phase 2 — resolveActivitySourceDifficulties |
| 3 | regular = random | adaptive module + tests |
| 4 | advanced → פער יסוד | next-step + copy guard |
| 5 | science shows מתקדם | isDisplayLevelAllowedForSubject |
| 6 | old activities break | read mapper |
| 7 | english G1-G2 thin hard pool | UI מציג מתקדם; generator fallback + רישום QA — **לא** הסתרה |
| 8 | parentReportTruth regen | Phase 6 batch |

---

## 19. Definition of Done

### UI
- [ ] אין קל/בינוני/קשה לילד/הורה/מורה
- [ ] רגיל/מתקדם בכל מקצוע **חוץ ממדעים**
- [ ] **אנגלית א׳–ב׳:** רגיל/מתקדם
- [ ] מדעים: רגיל בלבד
- [ ] copy: "רגיל"/"מתקדם" בלבד

### בנקים
- [ ] zero diff בבנקי שאלות
- [ ] easy/medium/hard פנימי

### Selection
- [ ] regular → easy+medium adaptive (starts easy)
- [ ] advanced → hard
- [ ] science regular → easy+medium+hard adaptive
- [ ] mixed/regular ≠ medium-only

### Evidence
- [ ] displayLevel + sourceDifficulty on every answer
- [ ] resume preserves both + internalState
- [ ] aggregate preserves sourceDifficulty internally

### Reports
- [ ] parent: רגיל/מתקדם only
- [ ] science: no מתקדם
- [ ] advanced failure: אתגר גבוה, not פער יסוד

### Activities
- [ ] new: regular→mixed, advanced→hard
- [ ] old: easy/medium/mixed→רגיל, hard→מתקדם
- [ ] science: regular only

### QA (כולם חובה)
- [ ] mapping tests pass
- [ ] generator probes pass (incl. english G1-G2 advanced)
- [ ] evidence round-trip pass
- [ ] parent activity E2E pass
- [ ] teacher activity E2E pass
- [ ] parent report truth pass
- [ ] Visual QA pass
- [ ] copy inventory clean
- [ ] six-subject smoke pass
- [ ] daily-gate READY
- [ ] **nightly full / בדיקה רחבה מלאה pass**

---

## 20. אישור לפני קוד

**נדרש אישור בעלים אחד:**

> **Plan Final מאושר — מתחילים Phase 0.**

כל שאר ההחלטות (§2) סגורות במסמך זה.

---

## Appendix A — Phases

| Phase | ימים | Deliverable |
|---|---|---|
| 0 Mapping | 2 | impact.json, copy inventory |
| 1 SSOT | 2 | display-level + adaptive modules + tests |
| 2 Generators | 4 | 6 generators + mixed fix + probes |
| 3 Evidence | 3 | session/answer/resume |
| 4 Student UI | 4 | 6 masters; english G1-G2 רגיל/מתקדם |
| 5 Activities | 3 | parent/teacher + compat |
| 6 Reports | 4 | labels + next-step update + truth |
| 7 QA | 4 | all §17 tests |
| 8 Readiness | 2 | nightly full + daily-gate + owner signoff |

**Critical path:** 0 → 1 → (2 ∥ 3) → 4 → 6 → 7 → 8

---

## Appendix B — Phase 0 (post-approval, read-only)

```bash
rg -n "קל|בינוני|קשה" pages components lib utils --glob "*.{js,jsx,mjs}"
rg -n "\beasy\b|\bmedium\b|\bhard\b|difficulty" pages components lib --glob "*.{js,jsx}"
rg -n "LEVELS|LEVEL_ORDER|DIFFICULTY" utils pages lib
rg -n "metadata\.level|questionLevel|sourceDifficulty|displayLevel" pages/api utils lib
```

Output: `reports/level-migration-impact.json`, `reports/level-migration-copy-inventory.json`

---

*Plan Final — 2026-06-23 — Locked. Awaiting single owner signoff (§20).*
