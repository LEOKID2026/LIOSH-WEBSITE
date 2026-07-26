# Parent Engine Final Rules Audit

Generated: 2026-07-26T14:46:03.027Z
Worktree: LIOSH-CLEAN-MAIN-PUSH
Mode: READ-ONLY (no code/threshold changes)

---

## חלק א — ההתנהגות הקיימת בפועל

### 1. צינור סמכות (authority chain)

| שלב | קובץ | פונקציה |
|---|---|---|
| answer→classifier | `lib/learning/classifiers/classify-answer-evidence.js` | `classifyAnswerEvidence / buildWriteTimeAnswerEvidenceFields` |
| mistake event | `utils/mistake-event.js` | `normalizeMistakeEvent / mistakePatternClusterKey` |
| repeated mistake pattern | `utils/learning-pattern-decision/resolve-repeated-mistake-patterns.js` | `resolveRepeatedMistakePatterns / resolveObservedPatternLevelFromPatterns` |
| LPD | `utils/learning-pattern-decision/build-learning-pattern-decision.js` | `buildLearningPatternDecision` |
| canonical topic state | `utils/canonical-topic-state/build-canonical-state.js` | `buildCanonicalState / evaluateDecisionTable` |
| DE2 | `utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js` | `runDiagnosticEngineV2` |
| EDC | `utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js` | `buildParentReportEngineDecisionContract` |
| ADC | `utils/action-decision-contract/action-decision-contract-v2.js` | `buildActionDecisionContractV2` |
| parent-safe finding | `utils/learning-pattern-decision/build-parent-visible-finding.js + enrich-parent-finding-with-factual-pattern.js` | `buildParentVisibleFinding / enrichParentFindingWithConsistentStrongTag` |
| parent report contract | `utils/contracts/parent-product-contract-v1.js` | `buildParentProductContractV1` |
| reports | `utils/parent-report-v2.js / detailed-parent-report.js / short-report surfaces` | `generateParentReportV2 / buildDetailedParentReportFromBaseReport` |
| badge/color/variant | `utils/parent-report-surface/parent-topic-display-chrome.js` | `parentTopicDisplayChromeFromRow / FromDecision` |

**הערה על מקצועות:** DE2 משתמש ב-`moledet-geography` כמקצוע אחד (מולדת+גאוגרפיה). אין subject נפרד ל-geography בלבד.

### 2. Thresholds מדויקים מהקוד

#### Repeated mistake patterns
- Authority: `utils/learning-pattern-decision/resolve-repeated-mistake-patterns.js`
- Include cluster: `(count >= 2) AND (ratioAmongWrongs >= 0.4)`
- MIN_WRONGS_FOR_REPEAT = **2**
- MIN_REPEAT_RATIO = **0.4** (מכלל השגיאות באירוע, לא מכלל השאלות)
- observedPatternLevel (first match):
  - IF !patterns.length OR q===0 → none
  - ELSE IF q>=40 AND top.ratio>=0.5 → strong
  - ELSE IF q>=12 AND top.ratio>=0.4 → consistent
  - ELSE IF q>=5 AND top.count>=2 → repeated
  - ELSE IF top.count>=2 → observed
  - ELSE → none

#### Evidence strength
- Authority: `utils/evidence-strength-policy.js + parent-evidence-matrix.js`
- q===0 → none
- q<=4 → small_sample
- 5<=q<8 → emerging
- 8<=q<12 → supported
- q>=12 → strong

#### Engine decision (EDC base)
- Authority: `utils/parent-report-engine-v1-signals.js#buildEngineDiagnosticDecision`
- Tiers: n<5→T0; n<10→T1; n<20→T2; n<50→T3; else T4
- Accuracy bands: n<5→insufficient_data; a>=90→mastery; a>=70→partial_good; a>=50→needs_strengthening; else clear_gap
- Decision:
  - IF tier===T0 → insufficient_data
  - ELSE IF mastery → (q>=10 ? mastery_stable : early_direction_only)
  - ELSE IF partial_good → (tier>=T2 ? partial_stable : early_direction_only)
  - ELSE IF needs_strengthening → topic_needs_strengthening
  - ELSE IF clear_gap → (tier>=T1 ? clear_topic_gap : insufficient_data)
  - THEN IF speedOnlyRisk AND mode===speed AND band!==clear_gap AND decision in gap/strengthen → speed_pressure_pattern

#### Factual parent pattern enrich (ללא taxonomy)
- Authority: `utils/learning-pattern-decision/enrich-parent-finding-with-factual-pattern.js`
- Condition: `observedPatternLevel IN {consistent,strong} AND evidenceStrength==='strong' AND engineDecision IN {clear_topic_gap,topic_needs_strengthening} AND parentFacingErrorPatternLabelHe(pattern.key) non-empty`
- `pattern.key` נשאר פנימי; `pattern.label` = עברית מאושרת או `unknown` בלבד.

#### DE2 pattern layers
- Authority: `utils/diagnostic-engine-v2/evidence-recurrence.js`
- Default minOccurrenceRatio: **0.6**
- primary_dominant: confirmed OR state===CONFIRMED
- secondary_observed: (distinctDays>=2) AND (evidenceCount>=3) AND (RECURRING OR low_occurrence_ratio OR recurrenceMet)
- same_session_observed: (evidenceCount>=3) AND tagCheck.ok AND same-session cluster (sessionId OR span<=3600000ms)
- Taxonomy minWrong טיפוסי: **3** (חלק מהשורות **4**)

### 3. מתי ההורה רואה משהו? (קטגוריות)

#### א. אין מספיק מידע
- `engineDecision = insufficient_data` כאשר `q < 5` (T0), או clear_gap עם T0.
- Badge: `מעט שאלות - עדיין אין מספיק נתונים`; variant: `neutral`.
- דוגמת מטריצה: q1_w0_allSame (q=1, acc=100).

#### ב. כיוון ראשוני
- `early_direction_only`: mastery עם `q < 10`, או partial_good עם tier T1 (5≤q<10).
- Pattern level `observed`/`repeated` אינו מספיק לבדו לממצא עובדתי ספציפי.
- מותר: ניסוח זהיר / מעט נתונים. אסור: טענת דפוס חוזר חזק.
- דוגמה: q5_w0_allSame.

#### ג. ממצא עובדתי חוזר
- נדרש: `observedPatternLevel ∈ {consistent,strong}` AND `evidenceStrength==='strong'` AND `engineDecision ∈ {clear_topic_gap,topic_needs_strengthening}` AND מיפוי parent-safe ל-`pattern.key`.
- consistent דורש גם: `q>=12` AND `top.ratio>=0.4` (יחס מכלל השגיאות) AND cluster עם `count>=2`.
- strong דורש: `q>=40` AND `top.ratio>=0.5`.
- **taxonomy אינו נדרש** למסלול enrich העובדתי; כן נדרש ל-`detectedPattern` / primary DE2 claim (`blockPatternClaim` נשאר true כשאין taxonomy).
- דוגמה ראשונה במטריצה: q12_w4_allSame → «בנושא audit_topic יש חלק שדורש חיזוק. ב-4 תשובות חזרה טעות חישוב של סטייה ב-1. מבוסס על 12 שאלות שנפתרו בנושא.…»

#### ד. קושי בנושא
- `topic_needs_strengthening`: `q>=5` AND `50<=acc<70`.
- `clear_topic_gap`: `q>=5` AND `acc<50` (T1+).
- תלוי **בעיקר בדיוק הכללי** (accuracy band), לא בדפוס. הדפוס יכול להעשיר את הנוסח כשמתקיימים תנאי ג.
- Chrome: strengthen → amber `כדאי לחזק`; gap → yellow `כדאי לתרגל עוד`.

#### ה. חוזקה / שליטה
- `mastery_stable`: `acc>=90` AND `q>=10`.
- `partial_stable`: `70<=acc<90` AND `q>=10` (tier≥T2).
- הוכחת מטריצה: 50% לעולם לא mastery: **true**
- acc≥90 עם q<10 לא mastery: **true**

### 4. האם thresholds אחידים בין מקצועות?

- **כן ברמת EDC/LPD/chrome:** אותם מספרי שאלות ואחוזי דיוק לכל המקצועות.
- **לא ברמת DE2 taxonomy:** `minWrong` / `minOccurrenceRatio` / `requiredTags` / candidate order שונים לפי מקצוע ו-taxonomyId.
- מולדת וגאוגרפיה מאוחדים תחת `moledet-geography`.

### 5. Tags coverage (סיכום)

- סה״כ tags ייחודיים במערכת (registry+rules+labels): **194**
- ללא תווית עברית parent-safe: **169**
- taxonomy בלי producer פעיל: **50**
- producer בלי taxonomy rule: **3**
- פירוט מלא: `parent-engine-tags-coverage.csv`

### 6. לפי מקצוע

#### מתמטיקה (`math`)
- שורות taxonomy: **27** (M-01, M-02, M-03, M-04, M-05, M-06, M-07, M-08, M-09, M-27, M-10, M-11, M-12, M-13, M-14, M-15, M-16, M-17, M-18, M-19, M-20, M-21, M-22, M-23, M-24, M-25, M-26)
- tags מקושרים: **58** | מגיעים להורה (primary או factual): **50** | כלליים בלבד: **56** | חסומים/ללא producer: **8**
- דוגמת קושי חזק (dossier): AAA1/addition::grade:g1 → clear_topic_gap
- דוגמת חיזוק: AAA1/subtraction::grade:g1
- דוגמת דפוס ספציפי: AAA1/addition::grade:g1 (engine:קושי בנשיאה בחיבור)
- דוגמת mastery: AAA11/fractions::grade:g6
- דוגמת מעט נתונים: AAA1/subtraction::grade:g1

#### גאומטריה (`geometry`)
- שורות taxonomy: **9** (G-01, G-02, G-03, G-04, G-05, G-06, G-07, G-08, G-09)
- tags מקושרים: **26** | מגיעים להורה (primary או factual): **22** | כלליים בלבד: **26** | חסומים/ללא producer: **4**
- דוגמת קושי חזק (dossier): AAA5/area::grade:g3 → clear_topic_gap
- דוגמת חיזוק: AAA10/area::grade:g5
- דוגמת דפוס ספציפי: AAA10/volume::grade:g5 (engine:התעלמות מממד העומק)
- דוגמת mastery: AAA11/area::grade:g6
- דוגמת מעט נתונים: AAA11/area::grade:g6

#### עברית (`hebrew`)
- שורות taxonomy: **8** (H-01, H-02, H-03, H-04, H-05, H-06, H-07, H-08)
- tags מקושרים: **18** | מגיעים להורה (primary או factual): **11** | כלליים בלבד: **18** | חסומים/ללא producer: **7**
- דוגמת קושי חזק (dossier): AAA12/grammar::grade:g6 → clear_topic_gap
- דוגמת חיזוק: AAA12/grammar::grade:g6
- דוגמת דפוס ספציפי: AAA12/grammar::grade:g6 (engine:חוסר התאמה במין או במספר במשפט)
- דוגמת mastery: AAA1/reading::grade:g1
- דוגמת מעט נתונים: AAA1/reading::grade:g1

#### אנגלית (`english`)
- שורות taxonomy: **8** (E-01, E-02, E-03, E-04, E-05, E-06, E-07, E-08)
- tags מקושרים: **16** | מגיעים להורה (primary או factual): **11** | כלליים בלבד: **16** | חסומים/ללא producer: **5**
- דוגמת קושי חזק (dossier): AAA6/vocabulary::grade:g3 → clear_topic_gap
- דוגמת חיזוק: AAA10/sentences::grade:g5
- דוגמת דפוס ספציפי: AAA3/grammar::grade:g2 (engine:בלבול בין זמן עבר לזמן הווה באנגלית)
- דוגמת mastery: AAA1/vocabulary::grade:g1
- דוגמת מעט נתונים: AAA1/vocabulary::grade:g1

#### מדעים (`science`)
- שורות taxonomy: **8** (S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08)
- tags מקושרים: **17** | מגיעים להורה (primary או factual): **8** | כלליים בלבד: **17** | חסומים/ללא producer: **9**
- דוגמת קושי חזק (dossier): AAA10/experiments::grade:g5 → clear_topic_gap
- דוגמת חיזוק: AAA11/environment::grade:g6
- דוגמת דפוס ספציפי: AAA10/experiments::grade:g5 (engine:שינוי של יותר ממשתנה אחד בניסוי)
- דוגמת mastery: אין
- דוגמת מעט נתונים: AAA10/experiments::grade:g5

#### מולדת / גאוגרפיה (`moledet-geography`)
- שורות taxonomy: **8** (MG-01, MG-02, MG-03, MG-04, MG-05, MG-06, MG-07, MG-08)
- tags מקושרים: **17** | מגיעים להורה (primary או factual): **9** | כלליים בלבד: **17** | חסומים/ללא producer: **8**
- דוגמת קושי חזק (dossier): אין ב-60
- דוגמת חיזוק: AAA12/homeland::grade:g6
- דוגמת דפוס ספציפי: AAA6/homeland::grade:g3 (engine:סידור אירועים בסדר הפוך)
- דוגמת mastery: אין
- דוגמת מעט נתונים: AAA5/community::grade:g3

#### היסטוריה (`history`)
- שורות taxonomy: **9** (HI-01, HI-02, HI-03, HI-04, HI-05, HI-06, HI-07, HI-08, HI-09)
- tags מקושרים: **19** | מגיעים להורה (primary או factual): **10** | כלליים בלבד: **19** | חסומים/ללא producer: **9**
- דוגמת קושי חזק (dossier): AAA11/classical_greece::grade:g6 → clear_topic_gap
- דוגמת חיזוק: AAA11/rome_jews::grade:g6
- דוגמת דפוס ספציפי: אין ב-snapshot
- דוגמת mastery: אין
- דוגמת מעט נתונים: AAA11/rome_jews::grade:g6

### 7. שלושת הדוחות

- מקור האמת לטקסט/החלטה הוא אותו LPD/EDC על שורת נושא (`generateParentReportV2` → detailed/short נגזרים).
- Chrome display מיושר דרך `parentTopicDisplayChromeFromRow` (display-only).
- מותר קיצור נוסח; אסור שינוי משמעות. חריגות שנמצאו ב-60 dossiers מפורטות למטה.

### 8. 60 דוסיירים

- קבצים: **60**
- חריגות שזוהו: **9**

| type | student | topic | detail |
|---|---|---|---|
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA10 | decimals::grade:g5 | pf:procedure_break |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA10 | decimals::grade:g5 | pf:procedure_break |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA12 | fractions::grade:g6 | mt:calculation_off_by_one |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA12 | fractions::grade:g6 | mt:calculation_off_by_one |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA12 | fractions::grade:g6 | mt:calculation_off_by_one |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA7 | comprehension::grade:g4 | pf:procedure_break |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA7 | comprehension::grade:g4 | pf:procedure_break |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA9 | comprehension::grade:g5 | pf:procedure_break |
| strong_mapped_pattern_still_generic_in_dossier_snapshot | AAA9 | comprehension::grade:g5 | pf:procedure_break |

### 9. מטריצת תרחישים

- תרחישים שהורצו בפונקציות פרודקשן: **236**
- התפלגות קטגוריות: {"A_insufficient_info":16,"B_early_direction":10,"D_topic_difficulty":62,"E_strength_or_mastery":66,"C_factual_repeated_pattern":82}
- פירוט שורה-שורה: `parent-engine-final-rules-matrix.csv`

---

## חלק ב — בעיות והצעה למדיניות סופית (לא ליישם)

### רבים מה-tags ללא תווית parent-safe
- **מצב קיים:** 169/194 tags ללא מיפוי ב-PARENT_ERROR_PATTERN_LABEL_HE
- **למה בעייתי:** גם כש-consistent+strong, ההורה מקבל רק קושי כללי בנושא; המנוע יודע יותר ממה שמוצג
- **כלל מוצע:** השלמת מיפוי עברית מאושר לכל tag פעיל שמיוצר בפועל, או מדיניות מפורשת 'תמיד כללי'
- **מקרים שישתנו:** תרחישי enrich נוספים יעברו מקושי כללי לממצא עובדתי
- **סוג שינוי:** מוצר + תצוגה (מיפוי), לא thresholds

### יחס הדפוס מחושב מכלל השגיאות, לא מכלל השאלות
- **מצב קיים:** MIN_REPEAT_RATIO=0.4 על wrongs; consistent דורש גם q>=12
- **למה בעייתי:** קל לבלבל בין '40% מהשגיאות' ל-'40% מהשאלות'; הורה עלול להבין אחרת
- **כלל מוצע:** להגדיר במדיניות מוצר האם הסף הוא מתוך שגיאות או מתוך שאלות, ולשקף בנוסח
- **מקרים שישתנו:** ייתכן שינוי סיווג observedPatternLevel אם יוחלף הבסיס
- **סוג שינוי:** מנוע (אם משנים חישוב) או מוצר/הסבר בלבד

### ממצא עובדתי דורש evidenceStrength=strong (q>=12) בנוסף ל-consistent
- **מצב קיים:** consistent כבר דורש q>=12; החפיפה כפולה אבל clear
- **למה בעייתי:** אין מסלול factual ב-q=10-11 גם אם יש חזרתיות חזקה יחסית
- **כלל מוצע:** להחליט אם factual מותר גם ב-supported (8-11) או רק strong
- **מקרים שישתנו:** נושאים עם 8-11 שאלות
- **סוג שינוי:** מוצר + enricher (לא DE2)

### blockPatternClaim נשאר true בלי taxonomy גם כשיש enrich
- **מצב קיים:** detectedPattern=null, blockPatternClaim=true, אבל parentSafeFinding יכול להיות ספציפי
- **למה בעייתי:** שדות מנוע אומרים 'חסום' בעוד שההורה רואה דפוס — עלול לבלבל מעקב פנימי
- **כלל מוצע:** להפריד במפורש factualParentObservation משדה detectedPattern, או לתעד את ההפרדה
- **מקרים שישתנו:** תיעוד/חוזה; לא בהכרח שינוי תצוגה
- **סוג שינוי:** חוזה/מוצר

### מולדת וגאוגרפיה מאוחדים
- **מצב קיים:** subjectId אחד: moledet-geography
- **למה בעייתי:** בדיקת 'כל מקצוע בנפרד' לא משקפת את מודל הנתונים
- **כלל מוצע:** להשאיר מאוחד או לפצל במוצר בלבד בשכבת תצוגה
- **מקרים שישתנו:** סיכומי מקצוע בדוח
- **סוג שינוי:** מוצר/תצוגה

---

## נקודת עצירה

אין תיקון קוד בשלב זה. ממתינים לאישור מדיניות מוצר מרוכז.
