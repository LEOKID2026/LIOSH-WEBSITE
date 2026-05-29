# Parent Report Hebrew UX / Copy Review
## Audit Date: 2026-05-29
## Scope: `/learning/parent-report`, `/learning/parent-report-detailed`, parent-facing surfaces
## Status: Audit/Planning Only — No Code Changes

---

## Executive Summary

The current parent report has grown organically through multiple phases (V2, detailed, contracts, AI insight). The Hebrew copy now shows signs of **systemic UX debt**: overlapping sections, inconsistent terminology, generic/AI-sounding phrases, and a structure that prioritizes data exhaust over parent comprehension.

**Core Problem:** The report tries to say everything instead of guiding the parent to the one thing that matters this week.

---

## 1. Parent Comprehension Issues

### 1.1 Time-to-Insight: ~90+ Seconds (Target: 20–30s)

**Current first-view experience:**
1. Header with stats (time, questions, accuracy, level)
2. Short contract preview box
3. "Where results were good" section
4. "What's most prominent now" diagnostic box
5. Subject summary cards (6 subjects)
6. Parent sections (insights, home recommendations, teacher messages)
7. AI insight box
8. Detailed tables per subject

**Problem:** A parent must scroll through 3+ screens before understanding what to do this week.

### 1.2 Unclear Visual Hierarchy

**Current hierarchy (weak):**
- Everything is a card/box with similar visual weight
- No clear distinction between "what to know" vs "what to do"
- Tables mix operational data ("15 questions") with diagnostic conclusions

**Severity:** High

### 1.3 Dense Paragraph-Style Insights

**Example from `ParentReportParentSections.jsx`:**
- Insights appear as bullet points, but each bullet is often a full sentence or paragraph
- No clear distinction between observation vs recommendation vs action

**Severity:** Medium

---

## 2. Repetition and Overlap (Critical)

### 2.1 Multiple "Home Action" Channels (Severity: Critical)

| Source | Location | Purpose |
|--------|----------|---------|
| `homeRecommendations` | `ParentReportParentSections.jsx` | "מה מומלץ לעשות בבית" |
| `shortContractTop.doNowHe` | `parent-report-short-contract-preview.jsx` | "מה עושים עכשיו" |
| `payload.homePlan.itemsHe` | `parent-report-detailed.js` | "פעולות לבית" |
| `SubjectParentLetter.homeAction` | `detailed-report-parent-letter-he.js` | מכתב מקצועי — פעולה ביתית |
| `sp.recommendedHomeMethodHe` | `parent-report-detailed-surface.jsx` | "מה לעשות בבית (מבנה)" |
| `es.homeFocusHe` | Executive summary | "מילה על הבית" |
| `ParentTopContractSummaryBlock` | `parent-report-contract-ui-blocks.jsx` | "מה עושים עכשיו" (top-level contract) |

**Problem:** Same recommendation can appear in 4–6 different UI sections with different wording.

**Example scenario:**
- Contract says: "להמשיך בתרגול קצר באותה רמת קושי"
- Home recommendations says: "כדאי להמשיך בתרגול קצר"
- Subject letter says: "מומלץ להמשיך עם תרגול קצר בנושא X באותה רמת קושי"
- AI insight says: "הילד מתקדם טוב — כדאי להמשיך בתרגול קצר"

**Parent perception:** "Why are they telling me the same thing over and over?"

### 2.2 Duplicate "Priority" Concepts (Severity: High)

**Overlapping ideas:**
- "מה חשוב קודם" (contract)
- "דורש תשומת לב כעת" (diagnostic overview)
- "מוקד חירום" (legacy terminology in normalizers)
- "עדיפות ראשונה" / "עדיפות שנייה" (phase labels)
- "מה לעשות קודם" (rewritten phrase)
- "עכשיו (מקצוע)" (subject-level action)

### 2.3 Cross-Subject Insights vs Executive Summary (Severity: High)

**In `parent-report-detailed-surface.jsx` `ExecutiveSummarySection`:**
- "טעויות חוזרות ושימור מה שלומדים"
- "מה עוזר עכשיו ומה כדאי לשנות"
- "איך ההתקדמות נראית לאורך זמן"
- "מה ניסינו לאחרונה — האם עזר?"
- "לפני שמשנים משהו"
- "האם הקושי רחב או מצומצם?"

**Plus `crossSubjectBulletsHe`:**
- "במבט על כל המקצועות יחד: X נושאים"
- "Y נושאים שכדאי לעקוב אחריהם"

**Plus `SubjectPhase3Insights` per subject:**
- "אילו טעויות חוזרות כאן"
- "מה נראה חזק כאן"
- "מגמה"
- "עד כמה המסקנה הזו מבוססת"
- "מה קורה בדרך כלל בזמן התרגול"
- "מה לעשות בבית (מבנה)"
- "מה להימנע ממנו"
- "עכשיו (מקצוע)"
- "לפני שמעלים רמה"
- "האם זה מצליח גם בשאלה חדשה"

**Problem:** The same insight (e.g., "child makes careless errors under time pressure") can appear in:
1. Cross-subject mistake pattern section
2. Subject-specific "אילו טעויות חוזרות כאן"
3. Executive summary "טעויות חוזרות"
4. AI insight summary

### 2.4 Data Sufficiency Warnings Everywhere (Severity: Medium)

**Thin-data messages appear in:**
- `practicedSubjectsSummaryLineHe`: "המקצועות שתורגלו בתקופה: X"
- `notPracticedSubjectsSummaryLineHe`: "מקצועות שלא תורגלו בתקופה: X"
- `thinEvidenceSubjectLineHe`: "X שאלות — עדיין מעט נתון"
- `v2ShortOverviewCannotConcludeHe`: "הנתונים עדיין חלקיים"
- `zeroEvidenceSubjectLineHe`: "לא תורגל בתקופה זו"
- `crossSubjectV2DataQualityNoteHe`: "מספר הנושאים שנבדקו נמוך"
- `executiveV2ReportReadinessHe`: "התרגול בתקופה עדיין מצומצם"
- `executiveV2OverallConfidenceHe`: "עדיין אין מספיק נושאים"

**Problem:** Thin-data warnings are scattered rather than consolidated into a single, clear "data health" indicator.

---

## 3. Tone and Trust Issues

### 3.1 Generic/AI-Sounding Phrases (Severity: High)

**Phrases that sound system-generated rather than human-written:**

| Location | Phrase | Problem |
|----------|--------|---------|
| `v2-parent-copy.js` | "מבט כולל: ב־X מתוך Y נושאים שנבדקו יש בסיס ראשוני לשיחה בבית על כיוון ממוקד" | Robotic, overly complex |
| `v2-parent-copy.js` | "נקודות שממשיכות להישמר בצורה טובה: X; נושאים שכדאי לחזק או ללמוד עליהם עוד לפני מסקנה חדה: Y" | Run-on sentence, bureaucratic |
| `parent-report-ui-explain-he.js` | "הצלחה בעיקר כשיש ליד — עדיין לא עצמאות מלאה" | Technical phrasing |
| `parent-report-ui-explain-he.js` | "תגובה מעורבת — חלק מתקדם, חלק עדיין תלוי" | Vague, non-actionable |
| `detailed-report-parent-letter-he.js` | "ב{subject} עדיין מוקדם מדי לסגור מסקנה חזקה מהתרגול" | Overly cautious to the point of being unhelpful |

### 3.2 Inconsistent "We" vs System Voice (Severity: Medium)

**Mixed voices in the same report:**
- "ראינו ש..." (we/system observed)
- "המערכת מזהה..." (the system identifies — but being normalized out)
- "אפשר לראות ש..." (passive)
- "הילד מצליח ב..." (direct child observation)

**Should standardize on:** Calm, direct, parent-as-partner voice: "נראה ש..." / "כדאי ל..."

### 3.3 Excessive Hedging (Severity: Medium)

**Examples of over-caution that reduces usefulness:**
- "עדיין מוקדם לסגור סופית, אבל..." (appears in multiple templates)
- "לא לנעול על משהו חד משמעי" (too vague)
- "אי אפשר להסיק מסקנה מהדוח הנוכחי" (better to say: "עדיין אין מספיק נתונים")

### 3.4 Fake Technical Precision (Severity: Low-Medium)

- "ביטחון בנתונים: בינוני" — parents don't know what this means
- "סיכון שימור: נמוך" — technical term without clear parent-friendly explanation
- "מוכנות להעברה: מתחילה" — jargon from learning science

---

## 4. Thin-Data Safety Assessment

### 4.1 Current State: Adequate but Scattered

**Strengths:**
- `ZERO_EVIDENCE_FORBIDDEN_RE` prevents dangerous conclusions when no data exists
- `zeroEvidenceSubjectLineHe` clearly states: "לא תורגל בתקופה זו — אין שאלות בטווח"
- `thinEvidenceSubjectLineHe` quantifies: "X שאלות — עדיין מעט נתון"
- Multiple fallback messages prevent empty states from being confusing

**Weaknesses:**
1. **No single "report health" indicator** — parent must piece together data sufficiency from scattered lines
2. **Inconsistent severity framing:** Some thin-data messages sound like mild warnings, others like blockers
3. **No clear next step for thin data:** Message should always include "כדאי להמשיך בתרגול קצר ולבדוק שוב"

### 4.2 Example of Good Thin-Data Handling

```javascript
// From subject-evidence-policy.js — GOOD
"מקצועות שלא תורגלו בתקופה: X, Y."  // Clear fact

// From v2-parent-copy.js — GOOD  
"בטווח התקופה טרם נאספו מספיק נושאים כדי להשוות ביניהם. תרגול קצר ועקבי יוסיף תמונה שאפשר לסמוך עליה."
// → States the situation + gives clear next step
```

### 4.3 Example of Weak Thin-Data Handling

```javascript
// From parent-facing-normalize-he.js — WEAK
"עדיין אין תמונה מספיק ברורה"
// → Doesn't say WHY (no data? partial data? contradictory data?)
// → Doesn't say what to do next
```

---

## 5. Recommended Target Structure

### 5.1 Proposed Simplified Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  AT A GLANCE (30-second scan)                           │
│  • One-line summary: "This week, focus on X"             │
│  • Data health indicator: "Based on Y questions"       │
│  • Confidence level: "Clear picture / Early signs"       │
├─────────────────────────────────────────────────────────┤
│  WHAT TO NOTICE (observations)                          │
│  • 2–3 bullets max, concrete, no jargon                  │
│  • "When solving geometry problems, child rushes..."   │
├─────────────────────────────────────────────────────────┤
│  WHAT TO DO AT HOME (actions)                           │
│  • ONE primary action (not 4–6 channels)                │
│  • Optional: "If you have 10 extra minutes this week"  │
├─────────────────────────────────────────────────────────┤
│  BY SUBJECT (expandable/collapsible)                    │
│  • Only subjects with sufficient data                   │
│  • "Not enough data yet" for thin subjects              │
├─────────────────────────────────────────────────────────┤
│  FULL DETAILS (tables, metrics — for the curious)       │
│  • Collapsed by default                                 │
│  • Preserves all current data for power users          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Section Roles (Hebrew Labels to Standardize)

| Role | Current (Multiple) | Proposed (Single) |
|------|-------------------|-------------------|
| Quick status | "סיכום קצר", "מצב", "מה הכי בולט" | **"סיכום השבוע"** |
| Data quality | Scattered across 6+ locations | **"מה הנתונים אומרים"** |
| Observations | "טעויות חוזרות", "מה חשוב לדעת", "מה חוזר בטעויות" | **"מה שכדאי לשים לב אליו"** |
| Actions | "מה מומלץ לעשות בבית", "מה עושים עכשיו", "כיוון לשבוע הבא" | **"מה כדאי לעשות"** |
| By subject | Tables + cards + letters | **"לפי מקצוע"** (collapsible) |

### 5.3 What Should Be Removed/Merged

**Remove entirely:**
- `SubjectPhase3Insights` as separate component — merge into subject letter or remove if redundant
- Multiple "home action" channels — consolidate to ONE source of truth
- `crossSubjectV2BulletsHe` when they overlap with executive summary
- Duplicate "what not to do" warnings (appears in contract + subject letter + insights)

**Merge:**
- Executive summary sections 2–7 into 2 coherent blocks: "what we see" + "what to do"
- All data-sufficiency warnings into a single, top-level indicator
- AI insight into the main summary (not a separate box)

**Shorten:**
- Subject letters: Max 3 short paragraphs (opening, observation, action)
- Bullets: Max 2 per section, each under 15 words
- Tables: Collapsed by default in mobile, optional in desktop

---

## 6. Specific Copy Issues by File

### 6.1 `utils/parent-report-language/v2-parent-copy.js`

| Line | Issue | Severity |
|------|-------|----------|
| 16 | "להתמקד קודם ב:" — presumes parent knows what "focus" means in learning context | Low |
| 43 | "כשנבדקים יחסית הרבה נושאים במקביל, לא תמיד נראית מיד «יציבות חזקה» באותה משמעות בכולם — זה נורמלי" — way too long, hedging, technical | High |
| 70 | "מבט כולל: ב־X מתוך Y נושאים שנבדקו יש בסיס ראשוני לשיחה בבית על כיוון ממוקד" — robotic | Medium |
| 78 | "נקודות שממשיכות להישמר בצורה טובה" — awkward phrasing | Medium |

### 6.2 `utils/parent-report-ui-explain-he.js`

| Line | Issue | Severity |
|------|-------|----------|
| 16 | "עוזר לו יותר כשיש ליווי או הסבר ליד" — unclear who "עוזר" refers to | Medium |
| 20 | "עדיין מעט מידע — אי אפשר להסיק בוודאות" — passive voice | Low |
| 381 | "עדיין אין מספיק ניסיון כדי לדעת אם מה שניסינו באמת עוזר" — too wordy | Medium |
| 384 | "מרגישים שההתקדמות נתקעה" — who feels? Unclear agency | Medium |

### 6.3 `utils/parent-report-language/parent-facing-normalize-he.js`

This file contains **159 phrase replacement rules**, indicating systemic terminology drift.

**Problem:** The need for so many replacements suggests the source strings were not written parent-facing from the start.

**Key concerning patterns:**
- Multiple passes to clean up "מאסטרי", "נשיאה", "inference" (technical leaks)
- English terms like "moderate", "high", "low" need replacement
- Snake_case identifiers like `fragile_success_cluster` leak into display

**Recommendation:** Audit source string generation to reduce need for post-hoc normalization.

### 6.4 `components/parent-report-detailed-surface.jsx`

| Line Range | Issue |
|------------|-------|
| 205–244 | Section "טעויות חוזרות ושימור מה שלומדים" — title is too long and combines two concepts |
| 251–293 | Section "מה עוזר עכשיו ומה כדאי לשנות" — overlaps with subject-level recommendations |
| 299–334 | Section "איך ההתקדמות נראית לאורך זמן" — overlaps with "מגמה" in subject insights |
| 335–383 | Section "מה ניסינו לאחרונה — האם עזר?" — overlaps with outcome narrative and recalibration |

**Pattern:** Every Phase (7–14) gets its own section, creating **section proliferation**.

---

## 7. Priority Matrix

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| Consolidate home action channels (6→1) | Critical | Medium | P0 |
| Merge executive summary sections 2–7 | High | Medium | P0 |
| Remove/merge `SubjectPhase3Insights` | High | Low | P1 |
| Standardize terminology (159 normalizations) | High | High | P1 |
| Simplify thin-data messaging | Medium | Low | P1 |
| Collapse tables by default | Medium | Low | P2 |
| Rewrite generic AI-sounding phrases | Medium | High | P2 |
| Fix voice consistency (we/system/parent) | Low | Medium | P3 |

---

## 8. What Needs Owner-Approved Hebrew Copy

The following sections require **fresh Hebrew copy from product/content owner** — do not auto-generate or normalize:

1. **New "At a Glance" section** — the 30-second summary headline
2. **Data health indicator** — how we explain "based on X questions" in parent-friendly terms
3. **Consolidated home action format** — ONE template for what to do at home
4. **Subject letter templates** — 3 variations (strength, weakness, early-signal-only)
5. **Empty/thin state messages** — what to say when there's nothing actionable yet
6. **Disclaimer refresh** — shorter, warmer version of legal text

---

## 9. Appendix: Full List of Overlapping Concepts

| Concept | Appears In | Count |
|---------|------------|-------|
| Home action/recommendation | 6 components | 6 |
| Priority/focus/what to do first | 5 locations | 5 |
| Mistake patterns | 4 sections | 4 |
| Data sufficiency warning | 8 functions | 8 |
| Trend/momentum | 3 components | 3 |
| Support/next steps | 5 sections | 5 |
| What to avoid/not do | 4 locations | 4 |
| Confidence/trust in data | 4 indicators | 4 |

---

## 10. Conclusion

The parent report Hebrew UX suffers from **organizational complexity**, not individual copy failures. The solution is structural:

1. **Choose one source of truth** for each type of insight
2. **Collapse the hierarchy** — merge 12+ sections into 4–5 coherent blocks
3. **Standardize terminology** at the source, not via post-hoc normalization
4. **Write for the busy parent**, not for the learning science dashboard

**Next step:** Product owner review of proposed structure (Section 5), followed by fresh Hebrew copy for the consolidated sections.

---

*Report generated: 2026-05-29*
*Files reviewed: 25+
*Lines of copy analyzed: 1,200+*
*Overlap instances identified: 40+*
