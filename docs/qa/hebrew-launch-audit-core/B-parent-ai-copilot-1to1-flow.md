# B - Parent AI/Copilot 1:1 Flow Audit

תאריך: 2026-06-15  
תחום: Parent Copilot, Parent Report AI/copy, prompts, composers, recommendation/diagnostic/evidence gates, fallback, sanitizer.

## תקציר מנהלים

מסקנת הבדיקה: **NOT PASS**.

המערכת כוללת שכבות הגנה משמעותיות: classifier מוקדם לשאלות לא קשורות/אבחוניות, TruthPacket שמרכז `derivedLimits`, validator שחוסם `next_step` כשאין זכאות המלצה, ומסנן payload ציבורי. עם זאת, במיפוי 1:1 נמצאו פערים שחוסמים השקה: ספי ראיות שונים בין שכבות, פלט fallback שמציע תרגול גם כש-`recommendationIntensityCap=RI0`, ניסוחים מרגיעים מדי בשאלות דאגה, ומספר שדות internal/debug שנשארים קרובים או גלויים ל-payload parent-facing.

הסיכון המרכזי אינו “AI כותב משהו מקרי” בלבד, אלא mismatch בין שכבות: מנוע אחד אומר “אין מספיק ראיות”, composer אחר עדיין נותן צעד ביתי, ו-report deterministic מוסיף המלצות כלליות גם עם מעט/אפס נתונים. לכן הורה עלול להבין שהמערכת יודעת יותר ממה שהנתונים מאפשרים.

## מסקנת השקה: NOT PASS

לא מוכן להשקה עבור Parent AI/Copilot עד תיקון BLOCKERS. אין כאן PASS כללי: קיימים flows שבהם פלט גלוי יכול להיות לא מספיק מגודר ביחס לראיות, להישמע אבחוני/מרגיע מדי, או להציג שדות/labels פנימיים בנתיבי report/debug.

## חוסמי השקה

1. **Fallback ללא anchors מחזיק `RI0` אבל מכיל פעולה ביתית גלויה**  
   מקור: `utils/parent-copilot/truth-packet-v1.js`, `buildTruthPacketV1NoAnchoredFallback`, שורות 855, 881-888, 942-944.  
   נתון: אין anchors ואין aggregate practice. Gate: `recommendationEligible=false`, `recommendationIntensityCap=RI0`. Template: `textSlots.uncertainty`. משפט אפשרי: “כדאי לצבור עוד תרגול קצר לפני מסקנה: 10 דקות חזרה... 5-8 שאלות...”.  
   סיכון: הורה מקבל תכנית פעולה למרות שהחוזה אומר אין זכאות המלצה. **BLOCKER**.

2. **שאלת “יש סיבה לדאגה?” יכולה לקבל הרגעה רחבה מדי**  
   מקור: `utils/parent-copilot/truth-packet-v1.js`, `buildExecutiveIntentNarrativeSlots`, שורות 695-712; `utils/parent-copilot/answer-composer.js`, שורות 298-315.  
   נתון: `fragile=0` או `cannotConcludeYet=false`. Gate: לא clinical, intent `is_intervention_needed`. משפט אפשרי: “לא נראה שיש סיבה לדאגה גדולה — רוב הנושאים נראים יציבים יחסית בתרגול.”  
   סיכון: הרגעה רחבה מדי כי היא נשענת על מספר שורות/יחידות ולא על בדיקה רפואית/חינוכית מלאה. **BLOCKER**.

3. **ספי ראיות שונים בין שכבות יוצרים החלטות שונות לאותו evidence_count**  
   מקורות: `parent-evidence-matrix.js` שורות 12-29; `intent-answer-composers.js` שורות 35-40; `confidence-policy.js` שורות 23-27; `parent-report-parent-facing.server.js` שורות 30-33; `detailed-parent-report.js` שורות 1974-2031.  
   דוגמא: 8 שאלות = “insight” במטריצה ו-Copilot strength/weak threshold, אבל diagnostic confidence עדיין לא `moderate` אלא תלוי recurrence/wrongs; 12 שאלות = strong recommendation במטריצה אבל רק `moderate` ב-diagnostic confidence אם יש 2 טעויות; 24 שאלות מפעיל reallocation hint ב-Copilot בלבד.  
   סיכון: הורה מקבל “חיזוק/חוזק/התקדמות” בשכבה אחת ו-“מוקדם לקבוע” בשכבה אחרת. **BLOCKER**.

4. **Report deterministic מוסיף המלצות כלליות גם באפס/מעט נתונים**  
   מקור: `lib/parent-server/parent-report-parent-facing.server.js`, `buildParentInsightsHe` שורות 170-176, 243-245; `buildHomeRecommendationsHe` שורות 307-315.  
   נתון: אפס פעילות או מעט תרגול. Gate: אין זכאות ספציפית לפי נושא. משפטים גלויים: “להתחיל מתרגול קצר של 5–10 דקות...”, “מומלץ לשמור על תרגול קצר וקבוע...”.  
   סיכון: המלצה אינה מסוכנת כשלעצמה, אבל אינה ממופה לראיות מספיקות ועלולה להיתפס כהמלצה מותאמת אישית. **BLOCKER**.

5. **Internal labels ושדות engine עדיין קיימים במבני parent-facing/report**  
   מקורות: `utils/parent-report-v2.js` שורות 1017-1088; `utils/detailed-parent-report.js` שורות 2135-2145; `lib/parent-server/report-payload-public-sanitize.js` שורות 7-33.  
   נתון: diagnostic card מחזיק `label` כ-taxonomy id או `topic:${bucketKey}`, `source.unitId`, `source.rowKey`, ו-`topicEngineRowSignals.gating`. Sanitizer מסיר רשימת keys חלקית ולא את כל השדות האלה.  
   סיכון: leak של labels פנימיים/debug/gating ללקוח או PDF/API אם המסלול לא מסנן אותם. **BLOCKER**.

6. **Sanitizer ערכי taxonomy חלקי בלבד**  
   מקור: `report-payload-public-sanitize.js`, שורות 35-47, 92-104.  
   Regex מכסה `english:phonics`, `english:pool`, `math_`, `frac_`, אבל לא בהכרח `topic:*`, `dc:*`, `M-07`, `G-03`, `semanticFamily`, `bucketKey` או labels אחרים. **BLOCKER**.

7. **Prompt ל-LLM כולל `recommendationIntensityCap` raw בתוך FACTS_JSON**  
   מקור: `utils/parent-copilot/llm-orchestrator.js`, `buildGroundedPrompt`, שורות 107-127, 214-230.  
   validator אמור לחסום `RI0` בפלט, אבל prompt עצמו מעביר raw enum למודל. אם validator/fallback route מפספס, leakage אפשרי. **BLOCKER**.

8. **Parent report insight packet משתמש בספי 3-4 שאלות להפקת strength/focus**  
   מקור: `utils/parent-report-insights/derive-topic-insights.js`, `deriveTopicInsights` / `pickStrengths`, סביב שורות 28-31 ו-104-131.  
   נתון: strength אפשרי כבר ב-4 שאלות ו-80% דיוק; focus אפשרי כבר ב-3 שאלות ודיוק מתחת 55%. Gate זה נמוך ממטריצת הראיות הרשמית (`INSIGHT_MIN=8`, `STRONG_MIN=12`).  
   סיכון: AI narrative/fallback יכול לנסח “יציב” או “מוקד” לפני שיש ראיות מספיקות. **BLOCKER**.

9. **Grade-aware recommendation templates כוללות defaults ללא עברית מאושרת ומפנות ל-engine fallback**  
   מקור: `utils/parent-report-language/grade-aware-recommendation-templates.js`, entries רבים עם `actionTextHe:null`, `goalTextHe:null`, ו-`intentDescriptionEn` שמצהיר “use bucketOverrides or engine fallback”.  
   סיכון: הורה עלול לקבל ניסוח המלצה ממנוע fallback לא מאושר עברית/השקה עבור taxonomy/grade מסוים. **BLOCKER**.

10. **Short report ו-detailed report לא תמיד משתמשים באותו `summaryHe` fallback**  
   מקורות: `utils/parent-report-v2.js` `summarizeV2UnitsForSubject`; `utils/detailed-parent-report.js` `buildSubjectProfilesFromV2`.  
   דוגמא: short surface עשוי להגיד “עדיף עוד קצת תרגול לפני שקובעים כיוון סופי”, בעוד detailed surface אומר “צריך בירור נוסף”.  
   סיכון: אותו נתון יכול להישמע להורה בדרגות חומרה שונות בין מסכים. **BLOCKER** כאשר מוצג באזורים מרכזיים לפני השקה.

## מפת flows מרכזיים

| id | Flow | נתון → gate → prompt/template → משפט גלוי → סיכון |
|---|---|---|
| F01 | Off-topic parent question | שאלה כמו “מה מזג האוויר?” → classifier bucket `off_topic` לפי `CLASSIFIER_THRESHOLDS.offTopic=0.4` → `OFF_TOPIC_RESPONSE_HE` / `composeAnswerDraft` off-topic → “אפשר לשאול כאן שאלות על הדוח...” → תקין עקרונית, אך bucket פנימי חייב לא להיחשף. |
| F02 | Diagnostic sensitive | שאלה על ADHD/דיסלקציה → `diagnosticSignal>=0.7` → clinical boundary template → “אי אפשר לקבוע אבחנה...” → טוב, אך יש כפילות נוסחים בין classifier/answer-composer. |
| F03 | Ambiguous/unclear | שאלה קצרה/לא ברורה → ambiguity → `AMBIGUOUS_RESPONSE_HE` → “לא הבנתי בדיוק...” → תקין, אבל אין הסבר על איזה נתונים קיימים. |
| F04 | No data at all | אין anchors ואין aggregate → fallback truth packet → `RI0` + `cannotConcludeYet=true` → uncertainty עם 10 דקות ו-5-8 שאלות → המלצה למרות RI0. |
| F05 | Subject no questions | subject q=0 → `zero_evidence` contract → `zeroEvidenceSubjectCopilotHe` → “לא נאספו נתוני תרגול...” → תקין, כל עוד אינו נעקף ל-executive fallback. |
| F06 | Thin topic 1-3 questions | q 1-3 + cannotConclude → `unitRequiresShortThinOverviewHedge` → “מוקדם לסגור מסקנה” / hedge → תקין יחסית. |
| F07 | 3 questions in Copilot topic | `classifyPracticePolarity` likely thin, `composeMistakePattern` returns “עדיין מעט נתון” → next_step “לאסוף עוד תרגול” → תקין, אך עדיין פעולה כללית. |
| F08 | 8 questions low accuracy | `STRONG_Q_MIN=8`, `WEAK_ACC_MAX=54` → `composeTopicProblem`/`composeReportExplanation` → “דורש תשומת לב” / “קושי חוזר” → סיכון: 8 הוא insight, לא strong. |
| F09 | 12 questions low accuracy | matrix strong, diagnostic confidence moderate if `w>=2` → intervention/recommendation possible → “חיזוק ממוקד” → תקין אם recurrence אמיתית; אחרת אבחוני מדי. |
| F10 | 24 questions high accuracy | `MASTERY_REALLOCATION_Q_MIN=24` → `masteryReallocationHe` → “להפנות חלק מזמן התרגול לנושא אחר” → סיכון: החלטת allocation קיימת רק בקומפוזר, לא במטריצה. |
| F11 | Activity source self-practice | `primaryEvidenceSource=self_practice` → `evidenceSourcePhraseHe` → “בתרגול עצמאי” → טבעי, מגובה. |
| F12 | Activity source learning book | `learning_book` → “לאחר עבודה בספר” → טבעי, מגובה. |
| F13 | Parent-assigned activity | `parent_assigned_activity` → phrase empty → אין מקור גלוי → הורה לא יודע שהראיה מפעילות אישית/הורה. |
| F14 | Mixed evidence | `gradeSplitNarrativeHe` + `evidenceSources` → “בכמה רמות כיתה...” → טוב, אך עלול להיות ארוך/טכני. |
| F15 | “הילד שלי חלש?” | weakness regex → topic_problem → “הדבר המרכזי שדורש תשומת לב...” או “קושי חוזר” → סיכון אבחוני אם q=8 בלבד. |
| F16 | “מה לעשות השבוע?” | home_practice → `recommendationEligible` checked in composer; but LLM guidance may allow meaning-level plan even if no next_step → סיכון recommendation בלי חוזה מלא. |
| F17 | Asked subject with no data | subject q=0 → zero evidence → “אי אפשר לקבוע” → תקין. |
| F18 | Internal labels returned | diagnostic card `label`, `topicEngineRowSignals`, `source` → payload/report → label leak possible. |
| F19 | Fallback activated | no anchors → fallback packet → action-like uncertainty → BLOCKER. |
| F20 | Sanitizer expected to clean | sanitizer strips known keys/regex only → unknown ids remain → BLOCKER. |

## מפת thresholds

| Layer | Source | Threshold | Meaning | Risk |
|---|---|---:|---|---|
| Parent evidence matrix | `utils/parent-report-language/parent-evidence-matrix.js:12` | 0 | none | תקין. |
| Parent evidence matrix | `parent-evidence-matrix.js:15` | 1-4 | insufficient | תואם diagnostic thin, אבל report יכול לתת habit recommendation. |
| Parent evidence matrix | `parent-evidence-matrix.js:17` | 5-7 | preliminary | Copilot thin logic לא תמיד מציג בשם tier. |
| Parent evidence matrix | `parent-evidence-matrix.js:20` | 8-11 | insight | Copilot משתמש ב-8 גם ל-strength/weak candidates. |
| Parent evidence matrix | `parent-evidence-matrix.js:23` | 12+ | strong recommendation | Diagnostic confidence עדיין דורש טעויות/recurrence. |
| Parent evidence matrix | `parent-evidence-matrix.js:27` | 40+ | high-volume | LLM prompt משתמש גם ב-global 100 לאיסור scarcity. |
| AI insight packet | `derive-topic-insights.js` | strength >=4 q + >=80%; focus >=3 q + <55% | AI narrative strength/focus | נמוך משמעותית ממטריצת `8/12`; BLOCKER. |
| AI data confidence | `derive-data-confidence.js` | thin <6; moderate <12; strong >=40 | deterministic AI fallback confidence | לא תואם מטריצה 5-7 preliminary, 8-11 insight, 12+ strong. |
| Parent Copilot composer | `intent-answer-composers.js:35` | acc >=75, q>=8 | strong | נמוך יותר מ-report strong accuracy 80. |
| Parent Copilot composer | `intent-answer-composers.js:37` | acc <=54, q>=8 | weak | שונה מ-report low accuracy 60. |
| Parent Copilot composer | `intent-answer-composers.js:40` | q>=24 | reallocation | לא קיים במטריצה הרשמית. |
| Report parent-facing | `parent-report-parent-facing.server.js:30` | acc<60 | low accuracy | שונה מ-Copilot weak 54. |
| Report parent-facing | `parent-report-parent-facing.server.js:31` | acc>=80 | strong | שונה מ-Copilot 75. |
| Grade-aware templates | `grade-aware-recommendation-templates.js` | many null `actionTextHe`/`goalTextHe` defaults | engine fallback | אין הבטחת עברית מאושרת לכל taxonomy/grade. |
| Short/detailed summary | `parent-report-v2.js` / `detailed-parent-report.js` | fallback-specific | `summaryHe` | אותו נתון מקבל ניסוח שונה בין surfaces. |
| Diagnostic confidence | `confidence-policy.js:23` | q>=40 | high | גבוה בהרבה מ-Copilot strong q>=8. |
| Diagnostic confidence | `confidence-policy.js:24` | q>=12 + wrong>=2 | moderate | strong matrix רק לפי q לא מספיק. |
| Diagnostic confidence | `confidence-policy.js:25-26` | q<2/q<4 | insufficient | תואם thin אך לא תמיד report copy. |
| Decision gates | `parent-report-decision-gates.js:39` | q<12 or low ev | weak | תואם matrix strong min. |
| Decision gates | `parent-report-decision-gates.js:64` | q>=16 | release forming | threshold נפרד נוסף. |
| LLM prompt global volume | `llm-orchestrator.js:223` | global >=100 | forbid global scarcity | שונה מ-high volume topic 40 ומ-report sparse 80/90. |
| TruthPacket executive | `truth-packet-v1.js:629` | globalQ<90 thin plan | thin plan | threshold עצמאי. |

## Prompt/Template Risk Analysis

### Deterministic composers

`composeReportExplanation`, `composeTopicProblem`, `composeMistakePattern`, `composeHomePractice`, `composeStrength`, ו-`composeProgression` ב-`utils/parent-copilot/intent-answer-composers.js` מייצרים עברית לרוב טבעית. הבעיה היא לא עברית גרועה, אלא semantic strength: ב-8 שאלות בלבד אפשר לקבל “הדבר המרכזי שדורש תשומת לב” או “מה שעובד יחסית טוב”, אף שהמטריצה מגדירה 8-11 כ-insight ולא strong.

דוגמא בעייתית: “הטעות הבולטת שחוזרת היא ...” ב-`composeMistakePattern` שורות 484-500. אם `patternHe` קיים אבל מקורו ב-diagnostic unit עם confidence שאינו high, הניסוח “הטעות הבולטת שחוזרת” נשמע ודאי מדי.

### LLM prompt

`buildGroundedPrompt` ב-`utils/parent-copilot/llm-orchestrator.js` מצמצם המצאות ומחייב JSON, אך מעביר raw facts: `recommendationIntensityCap`, `cannotConcludeYet`, `requiredHedges`, `forbiddenPhrases`, `reportQuestionTotalGlobal`. validator אמור לחסום leak, אבל prompt עדיין מכיל enums פנימיים. בנוסף, ההנחיה “אם cannotConcludeYet=false — הדגש שאין סיבה לדאגה גדולה” (שורה 186) עלולה ליצור הרגעה חזקה מדי.

### Fallback copy

`buildTruthPacketV1NoAnchoredFallback` מכיל טקסט טוב מבחינת זהירות, אך `textSlots.uncertainty` נותן תכנית תרגול קונקרטית בזמן ש-`recommendationEligible=false`. זהו mismatch חוזי.

### Report deterministic copy

`buildParentInsightsHe` ו-`buildHomeRecommendationsHe` מוסיפים המלצות שגרה כלליות. הן סבירות כהדרכת מוצר, אך אם מוצגות באזור AI/המלצות הן עלולות להיראות כהמלצה מבוססת נתוני ילד גם כשאין נתונים.

## דוגמאות ניסוח בעייתיות

| Source | Text | Problem | Severity |
|---|---|---|---|
| `truth-packet-v1.js:887` | “כדאי לצבור עוד תרגול קצר לפני מסקנה: 10 דקות חזרה...” | פעולה קונקרטית תחת `RI0` | BLOCKER |
| `truth-packet-v1.js:707` | “לא נראה שיש סיבה לדאגה גדולה...” | הרגעה רחבה מדי | BLOCKER |
| `intent-answer-composers.js:386` | “נראה קושי חוזר...” | אבחוני מדי ב-q=8/low evidence | HIGH |
| `intent-answer-composers.js:495` | “הטעות הבולטת שחוזרת היא...” | ודאות גבוהה מדי אם confidence אינו high | HIGH |
| `parent-report-parent-facing.server.js:185` | “נראה שיש קושי ב...” | אבחוני יחסית, תלוי strong gate חיצוני | MEDIUM |
| `parent-report-parent-facing.server.js:203` | “הביצועים הכלליים... מצביעים על צורך בחיזוק נוסף.” | כללי ויכול להישמע מסכם מדי | MEDIUM |
| `grade-insight-he.js:76` | “הילד הצליח גם מעל רמת הכיתה...” | יכול להישמע כהסקת יכולת גבוהה, תלוי evidence source | MEDIUM |
| `grade-insight-he.js:102` | “נראה שיש שליטה...” | reallocation ללא מקור threshold רשמי | MEDIUM |
| `parent-report-v2.js:915` | “ביצועים גבוהים ועקביים — נראה שליטה טובה בנושא.” | אם fallback ללא q, חסר evidence visible | MEDIUM |
| `detailed-parent-report.js:530-531` | “הביטחון בין המקצועות לא אחיד... חלק מהנתונים עם מה שרואים בהן רק חלקית.” | עברית לא טבעית/שגויה | HIGH |
| `derive-topic-insights.js` | “התרגול ב[נושא] נראה יציב — 4 שאלות, דיוק 80%.” | strength לפני `INSIGHT_MIN=8`; ניסוח יציב מדי | BLOCKER |
| `deterministic-fallback.js` | “כיוון ראשוני בלבד” בטווחי confidence עצמאיים | עלול להופיע מעל/מתחת לטייר הרשמי הלא נכון | HIGH |
| `grade-aware-recommendation-templates.js` | engine fallback כאשר אין `actionTextHe` מאושר | עברית/המלצה לא מאושרת באזור מרכזי | BLOCKER |

## דוגמאות שבהן AI עלול להטעות הורה

1. אין נתונים: TruthPacket מצהיר שאין המלצה, אך uncertainty נותן תכנית תרגול.
2. 8 שאלות עם דיוק נמוך: Copilot עשוי לדבר על “קושי חוזר”, אף שהראיה היא insight בלבד.
3. 12 שאלות עם שתי טעויות: diagnostic confidence moderate, אבל report/copy יכול להישמע כ-“חיזוק ממוקד” ודאי.
4. 24 שאלות עם דיוק גבוה: Copilot מציע להעביר זמן לנושא אחר, בלי owner threshold אחיד.
5. הורה שואל “יש סיבה לדאגה?”: prompt מכוון ל-“אין סיבה לדאגה גדולה” כש-`cannotConcludeYet=false`, לא בהכרח כשכלל הילד בטוח.
6. פעילות ספר בלבד: “לאחר עבודה בספר” גלוי, אבל לא תמיד ברור שזה מקור הראיה ולא מדד כללי.
7. פעילות parent-assigned: מקור מושתק (`""`), הורה לא יודע מה בסיס ההמלצה.
8. Internal labels: אם payload report מוצג/מודפס עם `label`, `source`, `topicEngineRowSignals`, הורה או QA עשוי לראות מזהי engine.
9. Sanitizer: ids שלא מכוסים regex עשויים להישאר.
10. LLM fallback: prompt מכיל enums פנימיים והגנה תלויה ב-validator.
11. AI insight packet: 3-4 שאלות יכולות להפוך ל-strength/focus ב-AI narrative, אף שהמטריצה הרשמית עדיין לא מאפשרת insight יציב.
12. Grade-aware fallback: taxonomy ללא template עברי מאושר עלול להגיע להורה דרך engine fallback.

## Leakage Risks

| Risk | Source | Why it matters | Severity |
|---|---|---|---|
| `label` raw taxonomy id | `parent-report-v2.js:1017-1021`, `1080` | parent card מחזיק id internal לצד `labelHe` | BLOCKER |
| `source.unitId` / `source.rowKey` | `parent-report-v2.js:1086-1088` | מזהים פנימיים ב-client payload | BLOCKER |
| `topicEngineRowSignals.gating` | `detailed-parent-report.js:2135-2145` | raw gating object סמוך ל-parent report | BLOCKER |
| `recommendationIntensityCap=RI0` in prompt | `llm-orchestrator.js:119`, `229` | enum פנימי נשלח למודל | HIGH |
| `truthPacket`, `contractsV1` forbidden only validator-side | `guardrail-validator.js:49-67` | הגנה קיימת אך לא payload sanitizer מלאה | HIGH |
| sanitizer regex partial | `report-payload-public-sanitize.js:35-47` | לא מכסה כל family/id | BLOCKER |

## החלטות בעלים נדרשות

1. להכריע owner יחיד לספי ראיות: האם 8/12/24/40/80/90/100 נשארים, ומה משמעות כל סף בכל שכבה.
2. להחליט האם “תרגול קצר” באפס נתונים הוא recommendation או generic onboarding. אם generic, להפריד ויזואלית ולא להציג כ-AI recommendation.
3. להחליט האם `parent_assigned_activity` צריך מקור גלוי בעברית או להישאר מושתק.
4. להחליט האם Copilot רשאי להגיד “אין סיבה לדאגה גדולה” או רק “הדוח לבדו לא מצביע על סיבה לדאגה”.
5. להסיר/לסנן משטח parent-facing את `label`, `source`, `topicEngineRowSignals`, raw `gating`, raw ids, ו-enums.
6. לאחד ניסוח “קושי חוזר” כך שיופיע רק עם recurrence/confidence מספיקים.
7. לקבוע האם LLM prompt יקבל raw enums או facts parent-safe בלבד.
8. להוסיף QA שמריץ את 20 התרחישים עם snapshot ומאמת פלט גלוי, לא רק validator status.
9. ליישר `derive-topic-insights.js` ו-`derive-data-confidence.js` למטריצת `PARENT_EVIDENCE_VOLUME`.
10. להחליט האם template ללא `actionTextHe`/`goalTextHe` מאושר נחסם, או מותר ל-engine fallback להגיע להורה.
11. לקבוע owner יחיד ל-`summaryHe` fallback בין short report ו-detailed report.

