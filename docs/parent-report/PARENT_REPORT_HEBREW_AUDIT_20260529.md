# Parent Report Hebrew Copy & Structure Audit

**Date:** May 29, 2026
**Scope:** Parent-facing report surfaces (`/learning/parent-report`, `/learning/parent-report-detailed`, `ParentReportParentSections`, server `parentFacing`, `homeRecommendations`, `insights`, etc.)
**Goal:** Map the current state of Hebrew copy, structure, duplication, and tone issues in the parent report to prepare for a copy rewrite.

---

## 1. Full Inventory of Hebrew Parent-Facing Strings

### 1.1. High-Level UI & Section Titles (`pages/learning/parent-report-detailed.js`)
*   **Static UI:** "דוח מקיף לתקופה", "תקציר להדפסה", "דוח מלא", "דוח הורים מקיף — מבוסס על התאריכים הנבחרים", "טווח תאריכים:", "מצב תקופה:", "תאריכים מותאמים", "חודש", "שבוע".
*   **Section Titles:** "סיכום להורה", "סיכום לתקופה", "מה עשינו בתקופה הזאת", "מקוצר: מילה לכל מקצוע", "מקצועות הלימוד", "תמונת מצב לפי נושאים", "נושאים שדורשים ליווי בטווח זה", "מה שחוזר בכמה מקצועות", "רעיונות קצרים לבית", "כיוון לימים הבאים".
*   **Metrics:** "זמן כולל", "שאלות", "דיוק כללי", "כיסוי לפי מקצוע".
*   **Empty States:** "מקצועות שלא נדגמו — אין מספיק נתונים", "אין מקצועות עם נפח נתונים להצגה בטווח הזה."
*   **Buttons/Navigation:** "חזרה לדוח מורה", "לוח בקרה", "כניסת הורה", "דשבורד הורים", "🖨️ הדפס מלא", "🖨️ הדפס תקציר", "חזרה ללמידה".

### 1.2. Parent Dashboard Preview (`components/parent/ParentReportParentSections.jsx`)
*   **Section Titles:** "הודעות מהמורה", "מה חשוב לדעת" (Insights), "מה מומלץ לעשות בבית" (Home Recommendations).
*   **Actions:** "הצג הודעות נוספות", "הצג פחות".

### 1.3. Server-Generated Insights & Recommendations (`lib/parent-server/parent-report-parent-facing.server.js`)
*   **Thin Data Insights:**
    *   "לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה."
    *   "לא הייתה פעילות לאחרונה — מומלץ לחזור לתרגול קצר כדי לשמור על רצף למידה."
    *   "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע."
*   **Performance Insights (Dynamic):**
    *   "נראה שיש קושי ב[מקצוע], בעיקר לפי התרגולים האחרונים."
    *   "כדאי לשים לב ל[נושא] — זה נושא שחוזר בתרגולים."
    *   "יש טעויות חוזרות ב[מקצוע] — שווה לחזור עליהן בקצב איטי."
    *   "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף."
    *   "יש התקדמות יחסית ב[מקצוע] — כדאי לשמר את הרצף."
    *   "נראה שיש שיפור ביחס לתרגולים קודמים — המשיכו בקצב הנוכחי."
*   **Home Recommendations:**
    *   "להקדיש 10 דקות ביום לתרגול קצר במתמטיקה, במקום תרגול ארוך פעם בשבוע."
    *   "לפתור כמה שאלות קלות לפני מעבר לשאלות קשות יותר."
    *   "לקרוא טקסט קצר ולבקש מהילד להסביר במילים שלו מה הבין."
    *   "לתרגל 5–10 דקות ביום אוצר מילים או משפט קצר — עדיף קצר וקבוע."
    *   "לחזור יחד על נושא אחד ב[מקצוע] בקצב איטי, בלי לחץ."
    *   "יש לשים לב לבעיות מילוליות — מומלץ לתרגל יחד לאט ולבדוק דרך פתרון."
    *   "לחזור יחד על טעויות אחרונות ולשאול את הילד איך חשב או למה בחר בתשובה."

### 1.4. Subject Letters & Topic Narratives (`utils/detailed-report-parent-letter-he.js`)
*   **Subject Opening:** "ב[מקצוע] אפשר לנוח קצת על הגז...", "ב[מקצוע] עדיין מוקדם מדי לסגור מסקנה חזקה מהתרגול...", "הנושא הבולט כרגע ב[מקצוע] הוא [נושא]."
*   **Subject Diagnosis:** "מה שבולט כרגע: [שורש קושי].", "המיקוד המעשי כרגע: [נושא] — חזרה עקבית — כדאי לשים על זה דגש."
*   **Subject Home Action:** "ב[מקצוע]: פעמיים בשבוע תרגול קצר, עם דגש על קריאת המשימה לפני התשובה."
*   **Subject Closing:** "ב[מקצוע] עדיף עקביות בתרגולים קצרים מאשר מפגש ארוך אחד."
*   **Topic Narrative:** "ב[נושא] היו X שאלות, עם דיוק של כ־Y% ו־Z טעויות מצטברות."

### 1.5. Diagnostic Engine Translations (`utils/parent-report-ui-explain-he.js` & `utils/parent-report-v2.js`)
*   **Raw Engine Output:** "אירועי טעות רלוונטיים: X (מתוך Y אירועים).", "מגמת דיוק: שיפור לעומת חלון קודם.", "בגלל מגמת ירידה בדיוק, ההמלצה כרגע זהירה יותר."
*   **Translated Jargon:** "פער ידע", "לחץ מהירות", "הצלחה שבירה", "רגעים של חוסר ריכוז שחוזרים", "בלבול מושגי חוזר", "טעות שנובעת ממהירות".

---

## 2. Duplication Map

The current structure suffers from heavy redundancy, displaying the same ideas across multiple components:

1.  **Insights vs. Subject Letters:** `parentFacing.insights` (from the server) often repeats the exact same diagnosis shown in the `SubjectParentLetter` (from the client generator). For example, "נראה שיש קושי ב[מקצוע]" appears in the top insights, and then the subject card says "הנושא הבולט כרגע ב[מקצוע] הוא...".
2.  **Home Recommendations vs. Subject Home Actions vs. Next Goals:**
    *   `parentFacing.homeRecommendations` (Top level)
    *   `SubjectParentLetter.homeAction` (Inside each subject)
    *   `Topic Recommendations` (Inside each subject, has a `homeLine`)
    *   "רעיונות קצרים לבית" (Bottom of detailed report)
    *   "כיוון לימים הבאים" (Bottom of detailed report)
    *   *Result:* A parent might read "להקדיש 10 דקות ביום לתרגול קצר" in 3 or 4 different places on the same page.
3.  **Data vs. Diagnosis:** The phrase "עדיף עוד קצת תרגול לפני שמקבעים מסקנה" (or variations like "עדיין מוקדם מדי לסגור מסקנה") is repeated for *every single subject* and *every single topic* that lacks data, creating a wall of repetitive disclaimers.

---

## 3. Tone & Clarity Problems

*   **Too Technical / Developer Jargon:**
    *   "אירועי טעות רלוונטיים: X (מתוך Y אירועים)" - Sounds like a system log, not a parent report.
    *   "מגמת הדיוק: בשיפור; העצמאות בפתרון: לא ברורה מספיק" - Robotic phrasing.
    *   "רמת הוודאות של הנתונים עוזרת לקבוע עד כמה להתקדם בצעד הבא" - Exposes internal engine logic (`suppressAggressiveStep`).
*   **AI / Robotic Tone:**
    *   "נראה שיש קושי ב...", "התמונה המרכזית נוגעת ל...", "יש תמונה אמצעית", "מבט זהיר על...". These phrases feel generated and lack a natural human touch.
*   **Vague / Generic:**
    *   "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף." (Doesn't tell the parent *what* to strengthen).
*   **Confusing Section Titles:**
    *   "מה שחוזר בכמה מקצועות" (Cross-subject insights) is clunky.
    *   The distinction between "רעיונות קצרים לבית" and "כיוון לימים הבאים" is unclear to a non-professional.

---

## 4. Structural Problems

The detailed report is currently overwhelming due to too many nested and overlapping sections:

1.  Parent Copilot / AI Insight
2.  **סיכום להורה** (Top Contract)
3.  **סיכום לתקופה** (Executive Summary)
4.  **מה עשינו בתקופה הזאת** (Overall Snapshot / Metrics)
5.  **מקצועות הלימוד** (Subjects)
    *   Subject Header (Metrics)
    *   Subject Phase 3 Insights
    *   Subject Parent Letter (Opening, Diagnosis, Home Action, Closing)
    *   Examples from practice
    *   Topic Overview
    *   Topic Recommendations (Snapshot, Home Line, Caution Line)
6.  **מה שחוזר בכמה מקצועות** (Cross-subject)
7.  **רעיונות קצרים לבית** (Home Plan)
8.  **כיוון לימים הבאים** (Next Goals)

**Core Issue:** "What we saw" (Diagnosis/Data) and "What to do" (Recommendations) are mixed at every level (Global, Subject, Topic). The parent has to extract action items from 5 different visual blocks.

---

## 5. Thin-Data Safety

*   **Over-diagnosis on low volume:** The server `parentFacing` logic (`lib/parent-server/parent-report-parent-facing.server.js`) uses `MIN_SUBJECT_ANSWERS = 5` and `MIN_TOPIC_ANSWERS = 3`. This means a parent might see a definitive insight like "כדאי לשים לב ל[נושא] — זה נושא שחוזר בתרגולים" based on only 3 questions. This is too strong for thin data.
*   **Aggressive Hedges:** To counter thin data, the engine aggressively appends hedges like `v2ShortOverviewCannotConcludeHe` (" — עדיין אין מספיק מה שרואים בשורות כדי לסגור תמונה ברורה."). This creates messy, contradictory sentences where a diagnosis is immediately walked back in the same line.

---

## 6. Raw/Internal Language Check

The `utils/parent-report-ui-explain-he.js` file acts as a direct dictionary for internal engine keys, resulting in pedagogical/diagnostic jargon leaking to parents:
*   `knowledge_gap` -> "פער ידע"
*   `speed_pressure` -> "לחץ מהירות"
*   `fragile_success` -> "הצלחה שבירה"
*   `concept_confusion` -> "בלבול מושגי חוזר"
*   `careless_flip` -> "טעות קטנה כשנמהרים או מדלגים על צעד"
*   `good_fit` -> "התאמה טובה לתמיכה הנוכחית"

While accurate to the engine, these sound like a diagnostician's notes rather than a friendly parent update.

---

## 7. Recommended Target Structure

To fix the cognitive overload and duplication, the parent report should be restructured into clear, distinct roles. **No new wording is proposed here, only the structural roles:**

1.  **Summary (סיכום)**
    *   High-level metrics (Time, Questions, Accuracy).
    *   One clear, top-level sentence summarizing the period (e.g., "Great progress in Math, needs focus in Hebrew").
2.  **Subject Performance (ביצועים לפי מקצוע)**
    *   "What we saw" ONLY.
    *   Data summary and diagnosis per subject.
    *   *No recommendations here.*
3.  **What to Notice (נקודות לשימת לב)**
    *   Specific recurring mistakes, behavioral patterns (e.g., rushing), or cross-subject insights.
4.  **What to Do at Home (המלצות לבית)**
    *   Consolidated, deduplicated action items.
    *   Combines the current "Home Plan", "Next Goals", and "Subject Home Actions" into one clear checklist.
5.  **Data Sufficiency Note (הערת נתונים)**
    *   A single, global disclaimer if data is thin, removing the need to append "not enough data" to every single subject and topic.
6.  **Teacher/School Message Area (הודעות מהצוות)**
    *   If relevant/available.