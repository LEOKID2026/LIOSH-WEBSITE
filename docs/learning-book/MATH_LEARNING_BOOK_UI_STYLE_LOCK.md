# Math Learning Book — UI Style Lock

**Status:** Owner-approved style lock (documentation only)  
**Date:** June 2026  
**Reference implementation:** Grade 1 Math Learning Book reader (`/learning/book/math/g1`)

---

## 1. Approved Reference

The **Grade 1 Math Learning Book reader** is the approved reference style for all future learning books in this product.

That implementation defines the canonical UX for:

- Paged section reader (one section visible at a time)
- Book shell layout (top HUD, content card, bottom HUD)
- Table of contents modal
- Topic and section navigation
- Section 7 practice call-to-action
- Topic-specific entry from Math Master (`הסבר בספר`)
- General book entry (TOC index → topic page)

Future books must **reuse this exact pattern**. Do not redesign the reader unless the product owner explicitly requests a redesign.

---

## 2. Locked UX Patterns

All future Math (and other subject) learning books must reuse the same:

| Pattern | Description |
|---------|-------------|
| **One section/page at a time** | Each learning topic is split into ordered sections; the reader shows one section at a time inside a single content card. Swipe or buttons move between sections. |
| **7-section learning flow** | Where applicable, use the Grades 1–2 (or age-band) 7-section template from `MATH_LEARNING_PAGE_TEMPLATE.md`. Section 7 is always the practice bridge. |
| **Top HUD** | Sticky header: return/close control, TOC button (`📑 תוכן עניינים`), back-to-book link on topic pages, book title, active topic title. |
| **Bottom HUD** | Fixed footer on topic pages: section prev/next, section counter, topic prev/next links. |
| **TOC modal** | Batch-grouped table of contents opened from the top HUD; links preserve return context when applicable. |
| **Previous/next section navigation** | Within a topic page, navigate sections without leaving the page. |
| **Previous/next topic navigation** | At section boundaries, jump to the prior or next topic in registry reading order. |
| **Section 7 practice CTA** | On the final section only: `בואו נתרגל!` with a button that routes to the matching practice preset (e.g. Math Master learning mode for that topic). No CTA on sections 1–6. |
| **Topic-specific “הסבר בספר” entry** | From Math Master (or equivalent activity), open the book at the topic matching the current skill when an approved page exists. Preserve return context (`fromBook` / close behavior). |
| **General book entry** | TOC index lists all topics for the grade; student picks a topic and reads section by section. |
| **Clean Hebrew-only child-facing UI** | Child-facing copy in Hebrew; inline math with correct bidi; no English instructional chrome in the reader body. |

### Code reference (Grade 1 — do not change for Grade 2 content work)

| Area | Location |
|------|----------|
| Book shell + top HUD | `components/learning-book/MathG1BookShell.js` |
| Section body + bottom HUD + Section 7 CTA | `components/learning-book/LearningPageBody.js` |
| TOC modal | `components/learning-book/BookTocModal.js` |
| Markdown / math rendering | `components/learning-book/LearningMarkdown.js`, `MixedHebrewMathText.js` |
| G1 registry / reading order | `lib/learning-book/math-g1-registry.js` |
| Practice preset + return nav | `lib/learning-book/math-g1-book-nav.js`, `resolve-math-g1-practice-target.js` |
| Math Master book entry | `pages/learning/math-master.js` (`הסבר בספר`) |

Grade 2 and later grades should **mirror** these patterns (new registry/route/content only), not introduce alternate reader layouts.

---

## 3. Do Not Redesign

Unless the owner **explicitly** requests a redesign:

- Do **not** change the paged-reader interaction model
- Do **not** change HUD placement, controls, or navigation semantics
- Do **not** change the TOC modal pattern
- Do **not** change section or topic navigation behavior
- Do **not** change the Section 7 practice CTA pattern
- Do **not** change the topic-specific explanation entry flow
- Do **not** change Math Master layout as part of grade-level book content work
- Do **not** merge multiple sections onto one screen for “simplicity”
- Do **not** add grade-specific reader skins that alter structure

Content authoring, topic lists, page counts, and practice mappings may change per grade. The **reader chrome and flow may not**.

---

## 4. Allowed Future Differences

Future books may differ only in non-structural dimensions:

| Dimension | Allowed |
|-----------|---------|
| **Subject** | math, geometry (separate book), hebrew, etc. |
| **Grade** | g1, g2, … — separate registry and draft folders per grade |
| **Page count** | Number of topics/pages per grade |
| **Topic list** | Which `skill_id` pages exist for that grade |
| **Content** | Hebrew prose, examples, diagrams described in markdown |
| **Practice mappings** | Grade/topic-specific preset targets for Section 7 CTA |
| **Background / color theme** | Optional, non-critical visual theme per book (e.g. slightly different gradient). **Not required now.** Must not change layout or HUD structure. |

### Explicitly not allowed without owner redesign approval

- New navigation paradigms (scroll-all-sections, tabs, accordion TOC replacing modal, etc.)
- Removing or relocating top/bottom HUD
- Showing practice CTA on every section
- Fallback UI that shows another grade’s page
- Mixed-grade single book view

---

## 5. Content vs. Chrome

| Layer | Grade 2+ work |
|-------|----------------|
| **Chrome (locked)** | Reuse G1 reader components and patterns |
| **Content (variable)** | New markdown drafts under `docs/learning-book/math/g2/drafts/`, new registry entries, new practice resolver mappings |
| **Routes (when approved)** | Parallel routes such as `/learning/book/math/g2` — same shell behavior as G1 |

---

## 6. Related Documents

| Document | Role |
|----------|------|
| `MATH_GRADE_1_LEARNING_BOOK_SIGNOFF.md` | Grade 1 draft phase record; UX now closed |
| `MATH_LEARNING_PAGE_TEMPLATE.md` | Section structure inside each topic page |
| `MATH_GRADE_2_LEARNING_BOOK_PLAN.md` | Grade 2 content scope (separate from UI) |
| `MATH_LEARNING_BOOK_MASTER_PLAN.md` | Product rules (no fallback, approved content only) |

---

## 7. Confirmations

- Grade 1 book reader design is **closed** and is the style reference.
- This document is **documentation only** — no code changes required to adopt the lock.
- Grade 2 planning and authoring must **not** redesign the reader.
