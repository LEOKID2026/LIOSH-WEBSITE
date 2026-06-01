# Grade 1 Math Learning Book — Implementation Plan

**Status:** Implementation plan for internal dev preview vertical slice  
**Date:** June 2026  
**Scope:** Grade 1 Math only — one complete book experience end-to-end  
**Content source:** `docs/learning-book/math/g1/drafts/` (19 markdown drafts)

---

## 1. Proposed Route

| Route | Purpose |
|-------|---------|
| `/learning/book/math/g1` | Table of contents (book home) |
| `/learning/book/math/g1/[pageId]` | Single learning page viewer |

**Why this route:** Matches the documented `learning_page_id` pattern (`math:g1:{pageId}`), mirrors the help-center `/help/subjects/[slug]` static-generation pattern, and lives under existing `/learning/*` immersive shell conventions.

**Alternative considered:** Modal overlay inside `math-master.js` — rejected for this slice because full-page routing supports bookmarking, TOC browsing, and prev/next without touching the 6k-line activity file beyond one entry button.

---

## 2. Source of Content

### Primary source (prototype)

Read markdown at **build time** from:

```
docs/learning-book/math/g1/drafts/*.md
```

No changes to draft content files unless a rendering bug requires a minimal fix.

### Internal registry

Small Grade-1-Math-only registry at:

```
lib/learning-book/math-g1-registry.js
```

Responsibilities:

- Batch A–D grouping and Hebrew section titles for TOC
- Flat page order for prev/next navigation
- `pageId` → filename mapping (`ns_counting_forward.md`, etc.)

Titles displayed in UI are parsed from each file's metadata table (`title_hebrew`), with draft marker stripped for display.

### Future migration

When moving beyond dev preview:

- Content may move to `data/learning-book/` or a database registry
- `approval_status` gating before student-facing release
- Activity-level resolver (`subject + grade + skill_id`)

This slice intentionally skips that workflow.

---

## 3. Page Ordering / Table of Contents

Grouped by authoring batches (Hebrew section labels):

### Batch A — יסודות ציר המספרים והמספרים

1. `ns_counting_forward`
2. `ns_counting_backward`
3. `ns_number_line`
4. `ns_neighbors`
5. `cmp`

### Batch B — עשרות, זוגיות וחיבור בסיסי

6. `ns_place_tens_units`
7. `ns_even_odd`
8. `ns_complement10`
9. `add_second_decade`
10. `add_tens_only`

### Batch C — פעולות חשבון בסיסיות

11. `add_two`
12. `sub_two`
13. `eq_add_simple`
14. `eq_sub_simple`
15. `mul`

### Batch D — שאלות מילוליות

16. `wp_coins`
17. `wp_coins_spent`
18. `wp_time_date`
19. `wp_time_days`

---

## 4. UI Structure

### Layout (`MathG1BookShell`)

| Area | Behavior |
|------|----------|
| **Header** | Book title, draft preview badge, back to Math (`/learning/math-master`) |
| **Table of contents** | Grouped by batch; sticky sidebar on `md+`; collapsible `<details>` on mobile |
| **Selected page** | Title + 7 learning sections |
| **Prev / next** | Flat order across all 19 pages |
| **Footer nav** | Back to TOC link |

### Page body

- Sections 1–7 rendered from markdown (skip Metadata block in main reading flow)
- Metadata shown as subtle dev-only line (`learning_page_id`, `approval_status: draft`)
- Code blocks / ASCII diagrams: **LTR**, horizontal scroll, monospace
- Prose: **RTL**, `unicode-bidi: plaintext` for mixed Hebrew + digits

### Mobile

- Single column; TOC in collapsible panel at top
- Prev/next as full-width buttons
- Safe-area padding; horizontal scroll on code blocks only

### Visual language

Reuse curriculum / learning dark gradient, emerald accents, existing `Layout` + immersive `/learning/` shell.

---

## 5. Entry Point

**One button** on the Math subject page only (`pages/learning/math-master.js`):

- Label: **`ספר מתמטיקה כיתה א׳`**
- Target: `/learning/book/math/g1`

No site-wide links. No activity-level explanation button in this slice.

---

## 6. Explicitly Out of Scope

| Item | Status |
|------|--------|
| Grade 2+ authoring or routes | ❌ |
| Other subjects (Geometry, Hebrew, …) | ❌ |
| Activity-level explanation button | ❌ |
| AI tutor / copilot integration | ❌ |
| Animations / videos | ❌ |
| SQL / database registry | ❌ |
| Content approval workflow UI | ❌ |
| Changing draft `approval_status` in source files | ❌ |
| Commit / push / deploy | ❌ (per task instructions) |

---

## 7. QA Checklist

- [ ] All **19** pages render without error
- [ ] TOC lists all pages in batch order with Hebrew titles
- [ ] TOC links navigate to correct `[pageId]`
- [ ] Prev/next walks all 19 pages in order (disabled at ends)
- [ ] RTL Hebrew prose displays correctly
- [ ] Code blocks / number-line diagrams readable (LTR, no layout break)
- [ ] Route reachable from Math subject page button
- [ ] Mobile: TOC usable, no horizontal page overflow
- [ ] `npm run build` succeeds
- [ ] Student route gate includes new paths in `_app.js`

---

## 8. Risk Notes

| Risk | Mitigation |
|------|------------|
| **Markdown rendering** | Custom parser scoped to draft format; code blocks isolated LTR |
| **RTL + code blocks** | `direction: ltr` on `<pre>` only; prose stays RTL |
| **Draft content in preview** | Dev banner: "תצוגת פיתוח — טיוטה" |
| **Reading from `docs/` at build** | `getStaticProps` + `fs`; paths documented for future move to `data/` |
| **No markdown library today** | Lightweight section parser avoids new dependency; can add `react-markdown` later |
| **Immersive layout hides site nav** | Intentional — matches other learning pages; header includes back link |
| **Dynamic route auth gate** | Register `/learning/book/math/g1` and `/learning/book/math/g1/[pageId]` in `_app.js` |

---

## 9. Implementation Files (planned)

| File | Role |
|------|------|
| `lib/learning-book/math-g1-registry.js` | TOC batches + page order |
| `lib/learning-book/parse-learning-page-markdown.js` | Parse draft `.md` → structured page |
| `lib/learning-book/load-math-g1-pages.js` | Build-time loader |
| `components/learning-book/MathG1BookShell.js` | Shell + TOC + nav |
| `components/learning-book/LearningPageBody.js` | Section renderer |
| `components/learning-book/LearningMarkdown.js` | Inline markdown subset |
| `pages/learning/book/math/g1/index.js` | TOC page |
| `pages/learning/book/math/g1/[pageId].js` | Page viewer |
| `pages/learning/math-master.js` | Entry button (one line block) |
| `pages/_app.js` | Protected routes |

---

## 10. Stop Rule (after this slice)

Complete Grade 1 Math book preview first. **Owner decides** whether to continue with Grade 2 authoring or broader implementation. Do not expand to other grades/subjects without explicit approval.
