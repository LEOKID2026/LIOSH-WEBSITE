# Teacher Activity Report — PDF v2 Redesign Plan

**Date:** 2026-05-29  
**Status:** Planning only — no implementation until owner approves approach  
**Context:** PDF v1 (jsPDF + autotable) is **not approved**. Hebrew rendering was fixed, but layout is too dense/table-heavy for a teacher-facing summary. Excel remains the **approved detailed export**.

---

## Why v1 is not shippable

| Issue | Detail |
|---|---|
| Wrong product shape | Wide autotable sections mirror Excel sheets squeezed into A4 |
| Visual density | Too many columns; empty or low-value cells in PDF context |
| Student summary | Full Excel column set (timestamps, analytics columns) — not a summary |
| Questions on SIM data | Placeholder `question_set` makes the section look broken even when extractor is correct |
| Overall feel | Technical dump, not a professional teacher record |

**Rule confirmed:** Long student × question audit trail stays in **Excel only**.

---

## PDF v2 product goal

A **readable teacher summary document** — printable, shareable, archivable — not a second Excel.

Same data contract as today: enriched payload from `/api/teacher/activities/[activityId]/report-export` only. No question-bank re-query. No AI recommendations. Teacher-only.

---

## Proposed v2 content (summary layout)

### 1. Header card
- דוח פעילות מורה
- שם פעילות · כיתה · מורה · מקצוע · נושא · סוג פעילות · תאריך (activated/closed)

### 2. Summary cards (not a table)
- מספר תלמידים · הגישו · לא התחילו · בתהליך · דיוק כיתתי · מספר שאלות

### 3. Questions — compact numbered list
- שאלה N → טקסט · אפשרויות (if stored) · תשובה נכונה  
- No wide table; skip or shorten placeholder-only SIM rows gracefully

### 4. Student summary — narrow table only
| תלמיד | סטטוס | נכונות | (optional: תשובות) |
- No timestamps, no score-% as primary (X/N first)

### 5. Question analytics — simple list or 3–4 column table
- שאלה · נכונות מתוך כלל התשובות · מיומנות · תלמידים שטעו

### 6. Skill analytics — cards/list
- מיומנות · נכונות מתוך כלל התשובות · האם דורש חיזוק

### 7. Follow-up
- Factual counts only; blank `הצעות לפעולה` for teacher handwriting/typing later

---

## Approach comparison

### Option A — HTML print / save-to-PDF (preferred)

**How:** Dedicated print-friendly view (route or modal) rendered with normal React + CSS (`dir="rtl"`, Hebrew fonts via existing site stack). Teacher clicks **ייצוא PDF** → opens print layout → `window.print()` / browser Save as PDF.

| Pros | Cons |
|---|---|
| Browser RTL/Hebrew is reliable (proven elsewhere in repo: parent report print) | Requires owner approval for new route/modal + minimal CSS |
| Cards, grids, typography controlled with familiar CSS | Print CSS needs QA across Chrome/Edge |
| Reuses enriched payload + existing label helpers | Slightly different from “instant download blob” UX |
| Easier to iterate on visual design | Hidden iframe/print window edge cases on mobile |

**Complexity:** Medium (3–5 days)  
**Risk:** Low–medium (layout/print CSS, not font encoding)

**Reuse from v1:** Section builders in `teacher-activity-report-pdf.js` (payload → structured sections) can feed HTML components; jsPDF rendering layer can be retired or kept behind a flag.

---

### Option B — jsPDF redesigned (cards/lists, minimal tables)

**How:** Keep jsPDF but abandon autotable-heavy layout; draw cards with `doc.text`, small manual tables (≤4 columns), page-break rules.

| Pros | Cons |
|---|---|
| No new route; stays client-side blob download | Layout code is verbose and hard to maintain |
| Hebrew fix (setR2L + Noto) already in place | Professional visual design still slow to achieve in imperative API |
| | Every design tweak = code change, not CSS |
| | Hard to match “product-ready” without repeated visual iteration |

**Complexity:** Medium–high (5–8 days including visual polish)  
**Risk:** Medium–high (product quality may still lag HTML)

**Recommendation:** Only if blob download without print dialog is a hard requirement.

---

### Option C — Keep PDF disabled; Excel only

**How:** `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED = false` (current state). v1 code kept for reference.

| Pros | Cons |
|---|---|
| Zero risk of shipping bad PDF | Teachers lack printable summary until v2 |
| Focus on Excel + real-activity validation | |

**Complexity:** None  
**Risk:** None

---

## Recommendation

**Proceed with Option A (HTML print / save-to-PDF)** after owner approves this plan.

**Rationale:**
1. Product goal is **readable summary**, not programmatic PDF tables — CSS is the right tool.
2. Repo already uses browser print for parent reports; pattern is known.
3. v1 proved enriched payload + label helpers are sufficient; failure was **rendering/layout layer**, not data.
4. Lower risk of another “technically works but ugly” release.

**Suggested implementation phases (after approval):**
1. Extract shared `buildTeacherActivityReportSummaryViewModel(payload)` from v1 section builders (pure data, testable).
2. Add print-only layout component (or `/teacher/class/.../report/print` route) — no change to main report screen styling.
3. Wire **ייצוא PDF** to open print layout + `window.print()` when `TEACHER_ACTIVITY_PDF_EXPORT_ENABLED` is true again.
4. Visual QA checklist (same Hebrew labels as Excel export); optional Playwright print smoke test.
5. Retire or archive jsPDF download path.

---

## What stays unchanged

- Enriched Excel (7 sheets) — **approved**
- CSV — unchanged
- `/report-export` API — single source of truth for Excel and future PDF
- No parent/student PDF, no DB schema changes, no AI text

---

## v1 code disposition

| File | Disposition |
|---|---|
| `lib/teacher-portal/teacher-activity-report-pdf.js` | Keep — section/view-model builders reusable for v2 |
| `lib/teacher-portal/teacher-activity-report-pdf-he.js` | Keep — reference if Option B ever revisited; export flag **false** |
| `scripts/teacher-portal/activity-report-pdf-visual-verify.mjs` | Keep — regression harness for any future PDF renderer |
| Report page PDF button | **Removed** — no import of `teacher-activity-report-pdf.js`; zero bundle impact |

---

## Open decisions for owner

1. **Print UX:** New tab vs modal vs hidden iframe?
2. **Filename:** Can browser print prompt set Hebrew filename, or is “Save as PDF” manual naming acceptable?
3. **SIM placeholder questions:** Omit section, show one-line notice, or show compact placeholders?
4. **Score %:** Omit entirely in PDF v2 student table, or small secondary column?

**Do not implement until owner picks Option A/B/C and answers open decisions.**
