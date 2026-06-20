# PARENT REPORT PRODUCT ORACLE

Final specification of expected visible product behavior.
Every test, QA pass, and review must conform to this document.

---

## 1. Canonical Scenario Matrix

For each `actionState`, the table below defines the complete expected product output.

### 1.1 `withhold`

**Evidence pattern:** Contradictory results, counter-evidence, weak evidence, insufficient data, or early signal invalidated by hints. `cannotConcludeYet = true`.

| Surface | Expected output |
|---------|----------------|
| **Regular summary** | Topic does NOT appear as strength. No positive wording. `summaryHe` mentions the topic only if it is the highest-priority monitoring topic; otherwise omitted. |
| **Detailed explanation** | `summaryHe` = `"אין מספיק נתונים בתקופה הנבחנת."` (if entire subject empty) or the topic is excluded from strengths/excellence lists. `confidenceSummaryHe` = one of: `"כרגע התוצאות בנושא הזה לא אחידות, ולכן עוד מוקדם לקבוע כיוון ברור."` / `"בתקופה שנבחרה עדיין מעט חומר לנושא — עוד קצת תרגול ייצר תמונה ברורה יותר."` |
| **Home action** | `resolveUnitParentActionHe` returns `null`. No home recommendation. |
| **Executive block** | Topic appears in `monitoringOnlyAreasHe` list as `"{displayName} ({subjectLabel})"`. Does NOT appear in `topStrengthsAcrossHe` or `transferReadyAreasHe`. |
| **AI Copilot — "Explain the report"** | Hybrid is **suppressed** (`canonical_action_blocked`). Copilot truth packet has `cannotConcludeYet=true`, `readiness="insufficient"`, `confidenceBand="low"`. Answer uses uncertainty template: `"לפי מה שנאסף עד עכשיו, עדיין אין מספיק בסיס לקבוע כיוון ברור בנושא הזה."` |
| **AI Copilot — "What should we work on at home?"** | `recommendationEligible=false`. Answer: no actionable recommendation. Follow-ups limited to `uncertainty_boundary`, `explain_to_child`, `ask_teacher`. |
| **AI Copilot — "Why is this not yet a strength?"** | Answer cites insufficient/contradictory data. Must include uncertainty marker. |
| **AI Copilot — "What is going well?"** | Topic is NOT mentioned as going well. |
| **Forbidden wording** | `"חוזקה עקבית"`, `"שליטה טובה"`, `"מומלץ להמשיך"`, `"מומלץ להרחיב"`, `"ביצועים גבוהים"`, `"מוכן להתקדם"`, `"נקודת חוזק"`, `"דפוס לימודי פעיל"` |
| **Forbidden recommendation types** | `maintain`, `expand_cautiously`, `intervene`, `diagnose_only` |

---

### 1.2 `probe_only`

**Evidence pattern:** Low confidence with taxonomy match; OR no taxonomy match; OR early signal only; OR fallback (no rule matched). `cannotConcludeYet = false`. `recommendation.allowed = false`.

| Surface | Expected output |
|---------|----------------|
| **Regular summary** | Topic does NOT appear as strength. If it is the action anchor (no diagnosed topics), `summaryHe` uses: `"בנושא {name}: עדיף עוד קצת תרגול לפני שקובעים כיוון."` |
| **Detailed explanation** | `confidenceSummaryHe` = `"עדיין מוקדם לקבוע בנושא הזה, ועוד תרגול יעזור להבין את התמונה."` (low) or `"זה סימן ראשוני בלבד, ולכן עדיין לא קובעים כיוון סופי בנושא הזה."` (early signal). No strengths/excellence entries for this topic. |
| **Home action** | `resolveUnitParentActionHe` returns `null`. No home recommendation for probe_only. |
| **Executive block** | Topic appears in `monitoringOnlyAreasHe`. Does NOT appear in `topStrengthsAcrossHe` or `transferReadyAreasHe`. |
| **AI Copilot — "Explain the report"** | Hybrid is **suppressed** (`canonical_action_blocked`). Copilot answer uses probe/uncertainty framing. |
| **AI Copilot — "What should we work on at home?"** | `recommendationEligible=false`. No actionable recommendation. |
| **AI Copilot — "Why is this not yet a strength?"** | Answer explains insufficient evidence/confidence. |
| **AI Copilot — "What is going well?"** | Topic is NOT mentioned. |
| **Forbidden wording** | `"חוזקה עקבית"`, `"שליטה טובה"`, `"מומלץ להמשיך"`, `"מומלץ להרחיב"`, `"ביצועים גבוהים"`, `"מוכן להתקדם"`, `"נקודת חוזק"`, `"דפוס לימודי פעיל"` |
| **Forbidden recommendation types** | `maintain`, `expand_cautiously`, `intervene` |

---

### 1.3 `diagnose_only`

**Evidence pattern:** Taxonomy match + recurrence confirmed + moderate/high confidence + priority P1/P2 (not high enough for intervention). `recommendation.allowed = true`.

| Surface | Expected output |
|---------|----------------|
| **Regular summary** | Topic appears in `topWeaknesses` (if `diagnosis.allowed` and `taxonomy.patternHe` exists). `summaryHe` cites the pattern: `"בנושא {name}: {patternHe}"`. |
| **Detailed explanation** | `confidenceSummaryHe` = `"יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב."` (moderate) or `"כבר רואים כיוון עקבי בנושא הזה."` (high, ≥12 questions). `recommendedStepLabelHe` = `"חיזוק ממוקד לפני קידום"` or `"איסוף אות נוסף לפני החלטה"`. |
| **Home action** | `resolveUnitParentActionHe` returns engine intervention/probe text (`unit.intervention.immediateActionHe` or `unit.probe.specificationHe`). |
| **Executive block** | Topic appears in `topFocusAreasHe` (as `"{patternHe} ({subjectLabel})"`). Appears in `reviewBeforeAdvanceAreasHe` if `probe.objectiveHe` exists. Does NOT appear in `topStrengthsAcrossHe`. |
| **AI Copilot — "Explain the report"** | Hybrid mode = `rank_only` (moderate) or `assist` (high + recurrence). Explanation cites taxonomy pattern. |
| **AI Copilot — "What should we work on at home?"** | `recommendationEligible=true`, `recommendationIntensityCap="RI2"`. Answer provides targeted practice recommendation. |
| **AI Copilot — "Why is this not yet a strength?"** | Answer explains the diagnosed pattern. |
| **AI Copilot — "What is going well?"** | Topic is NOT mentioned as going well. |
| **Forbidden wording** | `"חוזקה עקבית"`, `"מומלץ להמשיך באותה רמה"`, `"שימור יציבות"` |
| **Forbidden recommendation types** | `maintain`, `expand_cautiously` |

---

### 1.4 `intervene`

**Evidence pattern:** Taxonomy match + recurrence confirmed + moderate/high confidence + priority P3/P4 (high priority). `recommendation.allowed = true`.

| Surface | Expected output |
|---------|----------------|
| **Regular summary** | Topic is the top weakness. `summaryHe` = `"בנושא {name}: {patternHe}"`. Appears in `topWeaknesses` with tier `"קושי חוזר"` (if ≥5 mistakes) or `"תחום לחיזוק"`. |
| **Detailed explanation** | `confidenceSummaryHe` = high or moderate level text. `recommendedStepLabelHe` = `"חיזוק ממוקד לפני קידום"`. `cautionLineHe` may be empty (not gated). |
| **Home action** | `resolveUnitParentActionHe` returns engine intervention text (`unit.intervention.immediateActionHe`). Executive `topImmediateParentActionHe` = `unit.intervention.immediateActionHe`. |
| **Executive block** | `topFocusAreasHe` = `["{patternHe} ({subjectLabel})"]`. `mainHomeRecommendationHe` = the intervention text. `cautionNoteHe` = `"יש נושאים שדורשים תשומת לב גבוהה השבוע — כדאי לתאם עם המורה או המטפל."` (if P4). |
| **AI Copilot — "Explain the report"** | Hybrid mode = `rank_only` or `assist`. Explanation cites taxonomy. Uncertainty line depends on confidence. |
| **AI Copilot — "What should we work on at home?"** | `recommendationEligible=true`, `intensityCap="RI2"` (moderate) or `"RI3"` (high). Provides concrete intervention plan. |
| **AI Copilot — "Why is this not yet a strength?"** | Answer details recurring error pattern and recommended intervention. |
| **AI Copilot — "What is going well?"** | Topic is NOT mentioned. |
| **Forbidden wording** | `"חוזקה עקבית"`, `"מומלץ להמשיך באותה רמה"`, `"שימור יציבות"`, `"מומלץ להרחיב"` |
| **Forbidden recommendation types** | `maintain`, `expand_cautiously` |

---

### 1.5 `maintain`

**Evidence pattern:** Stable mastery + ≥10 questions + ≥90% accuracy + moderate/high confidence + taxonomy match. Does NOT meet expand threshold (C≠high OR Q<20 OR A<95).

| Surface | Expected output |
|---------|----------------|
| **Regular summary** | Topic appears in `topStrengths` (very_good authority) or `maintain` list (good authority). Tier label = `"חוזקה עקבית"`. `summaryHe` = `"בנושא {name}: חוזקה עקבית"` (if strength lead). |
| **Detailed explanation** | Topic appears in strengths/maintain lists. `confidenceSummaryHe` = moderate or high text. |
| **Home action** | `resolveUnitParentActionHe` = `"ב{name} מומלץ להמשיך באותה רמה, ורק אם זה ממשיך להצליח באופן יציב — להוסיף מעט קושי."` |
| **Next goal** | `resolveUnitNextGoalHe` = `"לשבוע הקרוב ב{name}: להמשיך באותה רמה, ואם ההצלחה נשמרת — לנסות צעד אחד מעט מאתגר יותר."` |
| **Home method** | `resolveUnitHomeMethodHe` = `"ב{name} עדיף תרגול קצר וקבוע באותה רמה, בלי לקפוץ מהר קדימה."` |
| **Executive block** | Topic appears in `topStrengthsAcrossHe` and `transferReadyAreasHe`. Does NOT appear in `monitoringOnlyAreasHe`. |
| **AI Copilot — "Explain the report"** | Hybrid mode depends on diagnosis/recurrence. If no diagnosis: `explain_only` or `suppressed`. Answer acknowledges stable performance. |
| **AI Copilot — "What should we work on at home?"** | `recommendationEligible=true`, `intensityCap="RI1"`. Answer: continue at same level, maintain consistency. |
| **AI Copilot — "What is going well?"** | Topic IS mentioned as a strength. |
| **Forbidden wording** | `"אין מספיק נתונים"`, `"נדרש בירור נוסף"`, `"מעקב בלבד"`, `"קושי חוזר"`, `"תחום לחיזוק"` |
| **Forbidden recommendation types** | `withhold`, `probe_only`, `intervene` (in the parent-facing text for this topic) |

---

### 1.6 `expand_cautiously`

**Evidence pattern:** Stable mastery + ≥20 questions + ≥95% accuracy + high confidence + taxonomy match.

| Surface | Expected output |
|---------|----------------|
| **Regular summary** | Topic appears in `stableExcellence` list. Tier = `"חוזקה עקבית"`. If it's the strength lead: `summaryHe` = `"בנושא {name}: חוזקה עקבית"`. |
| **Detailed explanation** | Topic appears in `excellence` list with `excellent: true`. `confidenceSummaryHe` = `"כבר רואים כיוון עקבי בנושא הזה."` |
| **Home action** | `resolveUnitParentActionHe` = `"ב{name} מומלץ להישאר בינתיים באותה רמה, ורק אם ההצלחה נמשכת גם בהמשך — להוסיף קושי קטן ומדוד."` |
| **Next goal** | Same as maintain: `"לשבוע הקרוב ב{name}: להמשיך באותה רמה, ואם ההצלחה נשמרת — לנסות צעד אחד מעט מאתגר יותר."` |
| **Home method** | Same as maintain: `"ב{name} עדיף תרגול קצר וקבוע באותה רמה, בלי לקפוץ מהר קדימה."` |
| **Executive block** | Topic in `topStrengthsAcrossHe` and `transferReadyAreasHe`. `dominantCrossSubjectSuccessPatternLabelHe` = `"התקדמות יציבה וטובה ב{name}"`. |
| **AI Copilot — "What is going well?"** | Topic IS mentioned as a strength with high confidence. |
| **Forbidden wording** | `"אין מספיק נתונים"`, `"נדרש בירור נוסף"`, `"מעקב בלבד"`, `"קושי חוזר"`, `"תחום לחיזוק"`, `"מורכבות מופחתת"` |
| **Forbidden recommendation types** | `withhold`, `probe_only`, `intervene` |

---

## 2. Recommendation Contract

### 2.1 Family: `withhold`

| Field | Value |
|-------|-------|
| **Trigger (Hebrew)** | תוצאות סותרות, ראיות נגדיות, ראיות חלשות, מידע לא מספיק, או אות מוקדם שנפסל |
| **Meaning for parent** | אין מספיק מידע כדי לומר משהו מוגדר על הנושא הזה |
| **Allowed actions** | המשך תרגול רגיל; אין שינוי |
| **Forbidden actions** | שינוי רמה, קפיצה לנושא חדש, הצהרה על חוזקה או חולשה |
| **Urgency** | אין — ממתינים לנתונים נוספים |
| **Good examples** | (1) "כרגע אין מספיק נתונים כדי לקבוע כיוון עקבי בנושא הזה." (2) "התוצאות לא מסתדרות זו עם זו — עוד קצת תרגול לפני כיוון." |
| **Bad examples** | (1) ~~"הילד מצליח יפה בנושא הזה!"~~ (2) ~~"מומלץ להרחיב לנושא הבא"~~ |

### 2.2 Family: `probe_only`

| Field | Value |
|-------|-------|
| **Trigger (Hebrew)** | ביטחון נמוך, אין התאמה טקסונומית, אות מוקדם בלבד, או אף כלל לא התקיים |
| **Meaning for parent** | יש אות ראשוני אבל לא מספיק כדי להחליט — צריך עוד תרגול ממוקד |
| **Allowed actions** | תרגול ממוקד באותו נושא; מעקב |
| **Forbidden actions** | הכרזה על חוזקה, התערבות אינטנסיבית, שינוי כיוון |
| **Urgency** | נמוכה — המשך איסוף ראיות |
| **Good examples** | (1) "עדיף עוד קצת תרגול לפני שקובעים כיוון." (2) "זה עדיין אות מוקדם — לא נמהרים לכיוון ברור." |
| **Bad examples** | (1) ~~"שליטה טובה בנושא"~~ (2) ~~"יש בעיה חמורה שדורשת טיפול מיידי"~~ |

### 2.3 Family: `diagnose_only`

| Field | Value |
|-------|-------|
| **Trigger (Hebrew)** | התאמה טקסונומית + חזרתיות + ביטחון בינוני/גבוה + עדיפות לא קריטית (P1/P2) |
| **Meaning for parent** | זוהה דפוס שטוב לעקוב אחריו — עדיין לא ברמת התערבות |
| **Allowed actions** | חיזוק ממוקד באותו נושא, תרגול מכוון, מעקב |
| **Forbidden actions** | שינוי דרמטי, הכרזה על הצלחה, התערבות אינטנסיבית |
| **Urgency** | בינונית — שווה לשים לב השבוע |
| **Good examples** | (1) "חיזוק ממוקד לפני קידום" (2) "איסוף אות נוסף לפני החלטה" |
| **Bad examples** | (1) ~~"חוזקה עקבית"~~ (2) ~~"דורש טיפול מיידי"~~ |

### 2.4 Family: `intervene`

| Field | Value |
|-------|-------|
| **Trigger (Hebrew)** | התאמה טקסונומית + חזרתיות + ביטחון בינוני/גבוה + עדיפות גבוהה (P3/P4) |
| **Meaning for parent** | יש דפוס ברור שחוזר — כדאי לטפל בו בצורה ממוקדת השבוע |
| **Allowed actions** | תרגול ממוקד, תיאום עם מורה, שינוי גישה, התערבות פעילה |
| **Forbidden actions** | הכרזה על הצלחה, התעלמות, "להמשיך כרגיל" |
| **Urgency** | גבוהה — פעולה השבוע |
| **Good examples** | (1) "בנושא כפל: זוהה דפוס של שגיאות חוזרות בלוח הכפל של 7 ו-8. מומלץ תרגול ממוקד." (2) "כדאי לתאם עם המורה — יש נושא שדורש תשומת לב גבוהה." |
| **Bad examples** | (1) ~~"הכל בסדר, להמשיך כרגיל"~~ (2) ~~"שליטה טובה ועקבית"~~ |

### 2.5 Family: `maintain`

| Field | Value |
|-------|-------|
| **Trigger (Hebrew)** | שליטה יציבה + ≥10 שאלות + ≥90% דיוק + ביטחון בינוני/גבוה |
| **Meaning for parent** | הילד מראה שליטה טובה — כדאי לשמר ולא לקפוץ |
| **Allowed actions** | שימור באותה רמה, תרגול קצר ועקבי, הרחבה עדינה בלבד |
| **Forbidden actions** | קפיצת רמה, "מורכבות מופחתת", "מעקב בלבד", "איסוף אות" |
| **Urgency** | נמוכה — להמשיך באותו כיוון |
| **Good examples** | (1) "בכפל מומלץ להמשיך באותה רמה, ורק אם זה ממשיך להצליח באופן יציב — להוסיף מעט קושי." (2) "עדיף תרגול קצר וקבוע באותה רמה, בלי לקפוץ מהר קדימה." |
| **Bad examples** | (1) ~~"נדרש בירור נוסף"~~ (2) ~~"מומלץ לחזק את הבסיס"~~ |

### 2.6 Family: `expand_cautiously`

| Field | Value |
|-------|-------|
| **Trigger (Hebrew)** | שליטה יציבה + ≥20 שאלות + ≥95% דיוק + ביטחון גבוה |
| **Meaning for parent** | הילד מצוין בנושא הזה — אפשר בזהירות לנסות הרחבה קלה |
| **Allowed actions** | שימור + הרחבה זהירה ומדודה אם העקביות נשמרת |
| **Forbidden actions** | קפיצה חופשית, "מעקב בלבד", "מורכבות מופחתת", "חיזוק בסיס" |
| **Urgency** | נמוכה — שימור עם אפשרות הרחבה |
| **Good examples** | (1) "בכפל מומלץ להישאר בינתיים באותה רמה, ורק אם ההצלחה נמשכת גם בהמשך — להוסיף קושי קטן ומדוד." (2) "חוזקה עקבית — אפשר בזהירות לנסות משהו חדש באותו עיקרון." |
| **Bad examples** | (1) ~~"נדרש בירור נוסף"~~ (2) ~~"יש בעיה שצריך לטפל בה"~~ |

---

## 3. Parent Copy Contract

### 3.1 Regular Report Summary (`summaryHe`)

| Field | Value |
|-------|-------|
| **Target audience** | הורה |
| **Purpose** | משפט סיכום אחד למקצוע |
| **Max length** | 120 תווים (משפט אחד) |
| **Tone** | ברור, מאופק, עובדתי |
| **Mandatory structure** | `"בנושא {name}: {תיאור}"` |
| **Allowed terms** | חוזקה עקבית, קושי חוזר, תחום לחיזוק, עוד תרגול, כיוון |
| **Forbidden terms** | שום מונח מערכתי (ראו §5) |
| **Before** | ~~"ברמת כפל: נדרש בירור נוסף"~~ |
| **After** | "בנושא כפל: חוזקה עקבית" |

### 3.2 Confidence Summary (`confidenceSummaryHe`)

| Field | Value |
|-------|-------|
| **Target audience** | הורה |
| **Purpose** | רמת הביטחון של הממצאים |
| **Max length** | 80 תווים |
| **Tone** | זהיר, ישיר |
| **Mandatory structure** | Short parent-facing sentence, no system terminology |
| **Allowed terms** | כיוון, כיוון עקבי, כיוון סופי, תרגול, נתונים, סימן ראשוני, לא אחידות |
| **Forbidden terms** | confidence, band, level, tier, engine, נשמור על ניסוח, אפשר לנסח, נשאר עם כיוונים, במערכת, מסקנה (when data is insufficient or contradictory) |
| **Exact values (by level)** | `high` (≥12 questions): "כבר רואים כיוון עקבי בנושא הזה." · `high` (<12 questions): moderate text · `moderate`: "יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב." · `low`: "עדיין מוקדם לקבוע בנושא הזה, ועוד תרגול יעזור להבין את התמונה." · `early_signal_only`: "זה סימן ראשוני בלבד, ולכן עדיין לא קובעים כיוון סופי בנושא הזה." · `insufficient_data`: "בתקופה שנבחרה עדיין מעט חומר לנושא — עוד קצת תרגול ייצר תמונה ברורה יותר." · `contradictory`: "כרגע התוצאות בנושא הזה לא אחידות, ולכן עוד מוקדם לקבוע כיוון ברור." · `default` (null/unknown): "עדיין לא ברור מה אפשר לקבוע בנושא הזה — נכון לעכשיו עדיף תרגול קצר ולבדוק שוב בהמשך." |

### 3.3 Home Action (`parentActionHe`)

| Field | Value |
|-------|-------|
| **Target audience** | הורה |
| **Purpose** | פעולה קונקרטית אחת לבית |
| **Max length** | 150 תווים |
| **Tone** | מכוון, מעשי, לא פקודתי |
| **Mandatory structure (strength)** | `"ב{name} מומלץ {פעולה}."` |
| **Mandatory structure (weakness)** | Engine text from `intervention.immediateActionHe` or `probe.specificationHe` |
| **Forbidden terms** | probe, gating, canonical, output, engine, threshold |

### 3.4 Executive Summary (`executiveSummary`)

| Field | Value |
|-------|-------|
| **Target audience** | הורה |
| **Purpose** | מבט-על על כל המקצועות |
| **Max length** | `majorTrendsHe`: 2 שורות, ~100 תווים כל אחת · `mainHomeRecommendationHe`: 150 תווים · `overallConfidenceHe`: 100 תווים |
| **Tone** | מקצועי, מאוזן |
| **Mandatory structure** | Trends → Confidence → Home recommendation → Caution (if applicable) |
| **Allowed terms** | נושאים, תקופה, חוזקה עקבית, תשומת לב, תרגול, כיוון |
| **Forbidden terms** | כל מונח מערכתי (ראו §5) |

### 3.5 Empty Subject Stub

| Field | Value |
|-------|-------|
| **Target audience** | הורה |
| **Purpose** | תחליף כשאין נתונים במקצוע |
| **Exact text** | `summaryHe` = "אין מספיק נתונים בתקופה הנבחנת." · `confidenceSummaryHe` = "עדיין לא הצטבר מספיק מידע לכיוון ברור." · all recommendation fields = `null` |
| **Forbidden** | כל ניסוח שמציע מגמה, חוזקה, חולשה, או המלצה |

### 3.6 Strength Tier Label

| Field | Value |
|-------|-------|
| **Exact text** | `"חוזקה עקבית"` (all tiers use this) |
| **Usage** | `topStrengths`, `maintain`, `stableExcellence` entries |
| **Never** | `"חוזקה יציבה"` (old variant — eliminated) |

### 3.7 Evidence Success Body

| Field | Value |
|-------|-------|
| **Exact text** | `"ביצועים גבוהים ועקביים — נראה שליטה טובה בנושא."` |
| **Usage** | `evidenceExamples` with `type: "success"` |

---

## 4. AI Copilot Response Contract

### 4.1 Broad request: "תסביר את הדוח" / "Explain the report"

| Aspect | Expected behavior |
|--------|-------------------|
| **Intent resolved** | `understand_meaning` (or `understand_observation` if phrased as "מה רואים") |
| **Scope** | Executive (if no specific context selected) |
| **Answer structure** | 2-3 `answerBlocks`: `observation` (what the data shows) + `meaning` (what it means) + optional `caution` (limitations) |
| **Answer length** | 2-4 short paragraphs, total ≤480 characters |
| **Summarize when** | Always — executive scope summarizes across subjects |
| **Follow-up** | Suggest one of: `action_today`, `action_week`, `advance_or_hold` |
| **Must never say** | Clinical terms (ADHD, דיסלקציה, אוטיזם), absolute claims ("תמיד ייכשל"), internal system terms |

### 4.2 Subject-level request: "מה עם חשבון?"

| Aspect | Expected behavior |
|--------|-------------------|
| **Scope** | Subject (math/geometry/english/etc.) |
| **Answer structure** | `observation` + `meaning`, possibly `next_step` if recommendation eligible |
| **Answer length** | 2-3 paragraphs |
| **Follow-up** | Topic-specific: `action_today` or `avoid_now` |

### 4.3 Topic-level request: "מה עם כפל?"

| Aspect | Expected behavior |
|--------|-------------------|
| **Scope** | Topic (specific topic row) |
| **Answer structure** | `observation` + `meaning` + `next_step` (if recommendation allowed) |
| **When insufficient data** | `observation` + `uncertainty_reason` only |

### 4.4 Recommendation request: "מה לעשות היום בבית?"

| Aspect | Expected behavior |
|--------|-------------------|
| **Intent** | `action_today` |
| **When `recommendationEligible=true`** | `next_step` block with concrete action text from contracts |
| **When `recommendationEligible=false`** | `uncertainty_reason` block. No action recommendation. Follow-up: `uncertainty_boundary` |
| **`intensityCap` enforcement** | `RI0`: no action. `RI1`: gentle continuation. `RI2`: targeted practice. `RI3`: full intervention plan. |

### 4.5 Insufficient-data request: "למה אין פה מידע?"

| Aspect | Expected behavior |
|--------|-------------------|
| **Answer** | `observation` explaining data quantity + `uncertainty_reason` |
| **Must include** | At least one uncertainty marker: "אין די נתונים" / "לא ניתן לקבוע" / "מידת הוודאות" |
| **Must never include** | Success markers, recommendation, strength language |

### 4.6 Ambiguous request: "מה?"

| Aspect | Expected behavior |
|--------|-------------------|
| **Resolution** | `clarification_required` |
| **Response** | `clarificationQuestionHe` = "כדי שאענה בצורה מדויקת על הדוח, כתבו אם אתם רוצים להבין מה רואים, מה זה אומר, או מה כדאי לעשות בבית." |
| **No answer blocks** | Only clarification question |

### 4.7 Contradiction/suppression case

| Aspect | Expected behavior |
|--------|-------------------|
| **When canonical state is probe_only/withhold but positive authority exists** | Hybrid suppressed with `incoherent_canonical_state` flag. Copilot falls through to deterministic path. |
| **Copilot answer** | Uses truth packet limits (conservative). Does NOT produce strength language for suppressed topics. |
| **Fallback chain** | (1) Deterministic composer → (2) validate → (3) if fails: fallback templates → (4) if fails: raw contract slots → (5) emergency fallback |

---

## 5. Surface Cleanup Contract

### Internal terms that MUST NOT appear in parent-facing UI

| Term | Type | Where it might leak |
|------|------|---------------------|
| `hybrid` | System label | No visible parent-facing header may contain English or version tags. If a copilot header is shown to parents, the exact text must be: "שאלו על הדוח". Raw `hybridRuntime` JSON or "hybrid" as a concept label must NOT appear. |
| `canonical` | Code concept | Variable `canonicalAction` in `parent-report-detailed-surface.jsx` — must not render as text |
| `probe_only` / `diagnose_only` / `withhold` / `expand_cautiously` | Enum values | Must never appear as parent-facing text |
| `actionState` | Field name | Must never appear in UI |
| `outputGating` | Field name | Must never appear in UI |
| `stateHash` / `topicStateId` | Debug identifiers | Must never appear in UI |
| `debug` / `[tracking debug]` | Dev labels | `TrackingDebugPanel.js` — must be disabled in production |
| `contractsV1` / `narrative` / `wording envelope` | Contract terms | Must never appear in UI |
| `WE0` / `WE1` / `WE2` / `WE3` / `WE4` | Wording envelopes | Internal only |
| `RI0` / `RI1` / `RI2` / `RI3` | Intensity caps | Internal only |
| `P1` / `P2` / `P3` / `P4` | Priority levels | Internal only |
| `decisionTier` / `confidenceBand` / `readiness` (as raw field) | Engine fields | Internal only |
| `positiveConclusionAllowed` / `_deprecated_positiveConclusionAllowed` | Deprecated flag | Must NEVER appear anywhere |
| `(תצוגה בטוחה מהחוזה)` | Copilot fallback indicator | Acceptable only as debug hint in copilot; must be removed before GA |
| `?reviewHybrid=1` | Query param | Internal reviewer panel — must not be accessible to parents |
| `mleo_internal_hybrid_reviewer` | localStorage key | Internal reviewer — must be disabled in production |
| `JSON.stringify(hybridRuntime)` | Raw JSON dump | Internal reviewer panel only |

### Allowed internal surfaces (NOT parent-facing)

- `ai-hybrid-internal-reviewer-panel.jsx` — gated behind `?reviewHybrid=1` + localStorage flag
- `TrackingDebugPanel.js` — gated behind `NODE_ENV === "development"`

---

## 6. Golden Examples

### Golden 1: `withhold` — Contradictory math topic

**Input evidence:** subject=math, topic=subtraction, Q=15, A=72, stableMastery=false, confidence=contradictory, taxonomyMatch=true, recurrenceFull=true, priority=P2, counterEvidenceStrong=false, weakEvidence=false

**Expected canonical state:** `actionState="withhold"`, `readiness="insufficient"`, `cannotConcludeYet=true`, `recommendation={family:"withhold", allowed:false}`, `hardDenyReason="contradictory"`

**Regular report:** Not in strengths. `summaryHe` does not mention as positive. If sole topic: `"בנושא חיסור: עדיף עוד קצת תרגול לפני שקובעים כיוון."`

**Detailed block:** `confidenceSummaryHe` = "כרגע התוצאות בנושא הזה לא אחידות, ולכן עוד מוקדם לקבוע כיוון ברור." · `parentActionHe` = null

**Executive:** In `monitoringOnlyAreasHe`: `"חיסור (חשבון)"`. NOT in `topStrengthsAcrossHe`.

**Copilot "Explain the report":** "לפי מה שנאסף עד עכשיו, עדיין מוקדם לקבוע כיוון ברור בנושא הזה."

**Home recommendation:** null (no recommendation)

---

### Golden 2: `withhold` — Insufficient data English

**Input evidence:** subject=english, topic=vocabulary, Q=3, A=100, stableMastery=false, confidence=insufficient_data, taxonomyMatch=true, priority=P2

**Expected canonical state:** `actionState="withhold"`, `readiness="insufficient"`, `cannotConcludeYet=true`, `hardDenyReason="insufficient_data"`

**Regular report:** Not in any list. Subject may show "עדיין נאספו מעט תרגולים בנושא הזה".

**Detailed block:** `confidenceSummaryHe` = "בתקופה שנבחרה עדיין מעט חומר לנושא — עוד קצת תרגול ייצר תמונה ברורה יותר."

**Executive:** In `monitoringOnlyAreasHe`.

**Copilot "Explain":** Uncertainty template. No positive claims.

**Home recommendation:** null

---

### Golden 3: `probe_only` — Low confidence math

**Input evidence:** subject=math, topic=fractions, Q=8, A=75, stableMastery=false, confidence=low, taxonomyMatch=true, recurrenceFull=false, priority=P2

**Expected canonical state:** `actionState="probe_only"`, `readiness="insufficient"`, `cannotConcludeYet=false`, `recommendation={family:"probe_only", allowed:false}`

**Regular report:** Not in strengths. `summaryHe` (if sole topic): `"בנושא שברים: עדיף עוד קצת תרגול לפני שקובעים כיוון."`

**Detailed block:** `confidenceSummaryHe` = "עדיין מוקדם לקבוע בנושא הזה, ועוד תרגול יעזור להבין את התמונה."

**Executive:** In `monitoringOnlyAreasHe`: `"שברים (חשבון)"`.

**Copilot "What to do at home?":** No recommendation. "כרגע אין המלצה ביתית ממוקדת בנושא הזה."

**Home recommendation:** null

---

### Golden 4: `probe_only` — No taxonomy match geometry

**Input evidence:** subject=geometry, topic=angles, Q=20, A=90, stableMastery=true, confidence=high, taxonomyMatch=false, priority=P2

**Expected canonical state:** `actionState="probe_only"`, `readiness="emerging"` (high→emerging for no-taxonomy), `taxonomyMismatchReason="taxonomy_not_matched"`

**Regular report:** NOT a strength (despite 90% accuracy and stableMastery). No positive tier.

**Detailed block:** Topic not in strengths. `cautionLineHe` = "בנושא הזה עדיין לא קובעים כיוון חזק — קודם עוד תרגול ממוקד באותו נושא."

**Copilot:** Suppressed. Uses probe framing.

**Home recommendation:** null

---

### Golden 5: `diagnose_only` — Moderate confidence, P2 math

**Input evidence:** subject=math, topic=division, Q=18, A=72, stableMastery=false, confidence=moderate, taxonomyMatch=true, recurrenceFull=true, priority=P2

**Expected canonical state:** `actionState="diagnose_only"`, `readiness="emerging"`, `recommendation={family:"diagnose_only", allowed:true, intensityCap:"RI2"}`

**Regular report:** In `topWeaknesses` with pattern text. `summaryHe`: `"בנושא חילוק: {patternHe}"`

**Detailed block:** `confidenceSummaryHe` = "יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב." · `recommendedStepLabelHe` = "איסוף אות נוסף לפני החלטה"

**Executive:** In `topFocusAreasHe`. In `reviewBeforeAdvanceAreasHe`.

**Copilot "What to do?":** Provides targeted practice from `intervention.immediateActionHe`.

**Home recommendation:** Engine intervention text.

---

### Golden 6: `diagnose_only` — High confidence, P1 science

**Input evidence:** subject=science, topic=energy, Q=22, A=68, stableMastery=false, confidence=high, taxonomyMatch=true, recurrenceFull=true, priority=P1

**Expected canonical state:** `actionState="diagnose_only"`, `readiness="ready"`, `intensityCap="RI2"`

**Regular report:** In `topWeaknesses`.

**Detailed block:** `confidenceSummaryHe` = "כבר רואים כיוון עקבי בנושא הזה."

**Home recommendation:** Engine intervention text.

---

### Golden 7: `intervene` — High confidence, P4 math

**Input evidence:** subject=math, topic=multiplication, Q=25, A=60, stableMastery=false, confidence=high, taxonomyMatch=true, recurrenceFull=true, priority=P4

**Expected canonical state:** `actionState="intervene"`, `readiness="ready"`, `recommendation={family:"intervene", allowed:true, intensityCap:"RI3"}`

**Regular report:** Top weakness. `summaryHe`: `"בנושא כפל: {patternHe}"`

**Detailed block:** `cautionNoteHe` = "יש נושאים שדורשים תשומת לב גבוהה השבוע — כדאי לתאם עם המורה או המטפל."

**Executive:** `topFocusAreasHe` first entry. `topImmediateParentActionHe` = intervention text.

**Copilot "What to do?":** Full intervention plan from contracts.

**Home recommendation:** Urgent intervention text from engine.

---

### Golden 8: `intervene` — Moderate confidence, P3 geometry

**Input evidence:** subject=geometry, topic=area, Q=20, A=65, stableMastery=false, confidence=moderate, taxonomyMatch=true, recurrenceFull=true, priority=P3

**Expected canonical state:** `actionState="intervene"`, `readiness="emerging"`, `intensityCap="RI2"`

**Regular report:** In `topWeaknesses`. `summaryHe`: `"בנושא שטח: {patternHe}"`

**Executive:** In `topFocusAreasHe`.

**Copilot:** `rank_only` mode. Provides intervention guidance.

**Home recommendation:** Engine intervention text.

---

### Golden 9: `maintain` — Moderate confidence, stable mastery

**Input evidence:** subject=math, topic=addition, Q=15, A=93, stableMastery=true, confidence=moderate, taxonomyMatch=true, priority=P2

**Expected canonical state:** `actionState="maintain"`, `readiness="emerging"`, `recommendation={family:"maintain", allowed:true, intensityCap:"RI1"}`

**Regular report:** In `topStrengths` (if authority=very_good) or `maintain` (if authority=good). Tier = "חוזקה עקבית".

**Detailed block:** `confidenceSummaryHe` = "יש כיוון ראשוני בנושא הזה, אבל צריך עוד תרגולים כדי לוודא שהוא יציב."

**Home action:** "בחיבור מומלץ להמשיך באותה רמה, ורק אם זה ממשיך להצליח באופן יציב — להוסיף מעט קושי."

**Executive:** In `topStrengthsAcrossHe` and `transferReadyAreasHe`.

**Home recommendation:** Maintain template.

---

### Golden 10: `maintain` — High confidence, good authority

**Input evidence:** subject=english, topic=reading, Q=18, A=91, stableMastery=true, confidence=high, taxonomyMatch=true, priority=P2, positiveAuthorityLevel=good

**Expected canonical state:** `actionState="maintain"`, `readiness="ready"`

**Regular report:** In `maintain` list. Tier = "חוזקה עקבית".

**Home action:** Maintain template text.

**Executive:** In `topStrengthsAcrossHe`.

---

### Golden 11: `expand_cautiously` — High confidence, excellent authority

**Input evidence:** subject=math, topic=addition, Q=25, A=97, stableMastery=true, confidence=high, taxonomyMatch=true, priority=P2, positiveAuthorityLevel=excellent

**Expected canonical state:** `actionState="expand_cautiously"`, `readiness="ready"`, `recommendation={family:"expand_cautiously", allowed:true, intensityCap:"RI1"}`

**Regular report:** In `stableExcellence`. Tier = "חוזקה עקבית". If strength lead: `summaryHe` = "בנושא חיבור: חוזקה עקבית"

**Detailed block:** `confidenceSummaryHe` = "כבר רואים כיוון עקבי בנושא הזה."

**Home action:** "בחיבור מומלץ להישאר בינתיים באותה רמה, ורק אם ההצלחה נמשכת גם בהמשך — להוסיף קושי קטן ומדוד."

**Executive:** In `topStrengthsAcrossHe` and `transferReadyAreasHe`. `dominantCrossSubjectSuccessPatternLabelHe` = "התקדמות יציבה וטובה בחיבור".

**Copilot "What is going well?":** Mentions addition as a clear strength with high confidence.

---

### Golden 12: `expand_cautiously` — High volume, high accuracy science

**Input evidence:** subject=science, topic=plants, Q=30, A=96, stableMastery=true, confidence=high, taxonomyMatch=true, priority=P2, positiveAuthorityLevel=excellent

**Expected canonical state:** `actionState="expand_cautiously"`, `readiness="ready"`

**Regular report:** In `stableExcellence`.

**Home action:** Expand cautiously template.

**Executive:** In `topStrengthsAcrossHe`.

---

## 7. Product Acceptance Checklist

### Engine correctness

- [ ] Every real topic produces a non-null `canonicalState`
- [ ] `canonicalState` is frozen (`Object.isFrozen()`)
- [ ] `recommendation.family === actionState` always
- [ ] No `__unknown_subject__` or `__unknown_topic__` in any payload
- [ ] No composite `topicKey` (no `\u0001`) after collapsing

### Cross-surface consistency

- [ ] Same topic has same `topicStateId` and `stateHash` in: engine unit, regular payload, detailed row, executive entry, hybrid snapshot, truth packet
- [ ] Same topic has same `readiness`, `confidenceLevel`, `actionState`, `recommendation.family` across all surfaces
- [ ] No topic appears as strength on one surface and weakness on another

### Forbidden output

- [ ] `probe_only` topic never renders with strength language (חוזקה עקבית, שליטה טובה, מומלץ להמשיך, etc.)
- [ ] `withhold` topic never renders with any recommendation text
- [ ] `maintain`/`expand_cautiously` topic never renders with weakness language (קושי חוזר, תחום לחיזוק, etc.)
- [ ] No internal enum value (probe_only, diagnose_only, withhold, expand_cautiously) appears as parent-facing text
- [ ] No system field name (actionState, outputGating, stateHash, etc.) appears in parent-facing UI
- [ ] `positiveConclusionAllowed` is not referenced in any production decision path

### Recommendation coherence

- [ ] Every `maintain`/`expand_cautiously` topic produces the exact Hebrew template from §1.5/§1.6
- [ ] Every `probe_only`/`withhold` topic produces NO strength template text
- [ ] Every `intervene`/`diagnose_only` topic produces engine-sourced intervention/probe text, not strength template
- [ ] `parentActionHe`, `nextWeekGoalHe`, `recommendedHomeMethodHe` are all consistent with canonical family
- [ ] `diagnose_only` must never expose `intensityCap` `RI3` in any parent-facing surface

### Executive block

- [ ] `topStrengthsAcrossHe` contains ONLY topics with `actionState` = maintain/expand_cautiously
- [ ] `monitoringOnlyAreasHe` contains ONLY topics with `actionState` = withhold/probe_only
- [ ] `transferReadyAreasHe` contains ONLY strength topics
- [ ] If at least one recommendation-eligible topic exists, `mainHomeRecommendationHe` must be non-empty. If no recommendation-eligible topic exists, exact fallback text is: "כרגע אין המלצה ביתית אחת מרכזית, כי עדיין צריך עוד מידע."

### AI Copilot

- [ ] Hybrid is suppressed for `withhold`/`probe_only` topics (canonical_action_blocked)
- [ ] Explanation validator catches success markers for probe/withhold topics
- [ ] Copilot never produces strength language for topics with `recommendationEligible=false`
- [ ] Copilot answer length ≤480 characters
- [ ] Copilot answer contains at least one uncertainty marker when `cannotConcludeYet=true` or `confidenceBand="low"`
- [ ] No clinical terms (ADHD, אוטיזם, דיסלקציה, etc.) in any copilot answer
- [ ] No absolute claims ("תמיד ייכשל", "אין לו סיכוי") in any copilot answer

### Empty/insufficient data

- [ ] Empty subject produces stub: summaryHe="אין מספיק נתונים בתקופה הנבחנת.", all recommendations=null
- [ ] Near-zero subject (≤3 questions) produces "עדיין מעט לסיכום מלא" and no trend/recommendation
- [ ] No fake trend or readiness for empty subjects

### Surface cleanup

- [ ] `?reviewHybrid=1` panel is NOT accessible in production
- [ ] `TrackingDebugPanel` does not render in production
- [ ] No `JSON.stringify(hybridRuntime)` visible to parents
- [ ] "(תצוגה בטוחה מהחוזה)" copilot note is removed before GA

### Hebrew quality

- [ ] "חוזקה עקבית" (not "חוזקה יציבה") everywhere
- [ ] "בנושא" (not "ברמת") in all summary texts
- [ ] No French guillemets (« ») in any text
- [ ] No "כיוון סופי" overclaim — use "כיוון ברור" or "לפני שקובעים כיוון"
- [ ] Confidence text matches exactly one of the 6 templates in §3.2
- [ ] Evidence success body = "ביצועים גבוהים ועקביים — נראה שליטה טובה בנושא." (not "חוזקה עקבית")

### PDF/Print

- [ ] All visible blocks match screen report content
- [ ] No debug panels, tracking panels, or review panels in print layout
- [ ] No English labels in printed Hebrew report
