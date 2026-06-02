# Math Learning Book — Implementation Notes

**Status:** Partial implementation (G1 + G2 Math books live in dev). Documentation below includes future-phase notes.
**Date:** June 2026
**Purpose:** Technical considerations for a future implementation phase.
            Nothing in this document modifies any existing app code, database, or feature.
**Audience:** Future developers or the product owner when implementation begins.

---

## Table of Contents

1. [How Learning Page Resolution Should Work](#1-how-learning-page-resolution-should-work)
2. [Grade-Based Book Color Themes](#2-grade-based-book-color-themes)
3. [The No-Fallback Policy — Why and How](#3-the-no-fallback-policy--why-and-how)
3. [Modal vs. Full Page](#4-modal-vs-full-page)
4. [Approval Status Lifecycle](#5-approval-status-lifecycle)
5. [Relationship to Parent Report and Teacher Report](#6-relationship-to-parent-report-and-teacher-report)
6. [Relationship to AI Tutor / Parent Copilot](#7-relationship-to-ai-tutor--parent-copilot)
7. [Relationship to the Subtopic Diagnostic Layer](#8-relationship-to-the-subtopic-diagnostic-layer)
8. [Possible Content Storage Approaches](#9-possible-content-storage-approaches)
9. [Risks and Open Questions](#10-risks-and-open-questions)

---

## 1. How Learning Page Resolution Should Work

When the system needs to find the right learning page for a student, it must use three keys:

```
subject  →  "math"
grade    →  the student's currently assigned grade (e.g., "g1")
skill_id →  the skill being practiced at that moment
             (e.g., "math:kind:add_second_decade")
```

The resolution flow should be:

```
1. Look up (subject, grade, skill_id) in the learning page registry.
2. Check that the found page has approval_status = "active".
3. If found and active → show the explanation button / load the page.
4. If NOT found, or found but not active → hide the button entirely. Do not show anything.
```

This resolution is purely a lookup. It does not involve AI, inference, or fallback logic.

### What the lookup key looks like

A convenient compound key format:
```
learning_page_id = "math:{grade}:{subtopic}"
```
Example: `"math:g1:add_second_decade"`

This mirrors the `skill_id` format in the curriculum spine
(`"math:kind:add_second_decade"`) but scoped to a specific grade.

### Where the registry lives (future decision)

Options (to be decided in the implementation phase):
- A static JSON or JS file (similar to how `data/curriculum-spine/v1/skills.json` works)
- A Supabase table (allows runtime updates without a deploy)
- A hybrid: static file for approved pages, database for draft/review tracking

No decision is made here. The important constraint is that only pages with
`approval_status: "active"` should be returned by the lookup.

---

## 2. Grade-Based Book Color Themes

Each grade gets **one** consistent reader color theme across all subjects (Math, גאומטריה, etc.).

| Grade | Theme |
|-------|--------|
| **Grade 1 (`g1`)** | Purple/violet page gradient, violet nav accents, emerald progress/headings |
| **Grade 2 (`g2`)** | Deep navy → blue/cyan/teal gradient, cyan/teal accents |
| **Grade 3 (`g3`)** | Calm green/emerald |
| **Grade 4 (`g4`)** | Amber/gold |
| **Grade 5 (`g5`)** | Rose/pink |
| **Grade 6 (`g6`)** | Indigo/slate |
| **Future grades** | Add entries to `lib/learning-book/book-grade-themes.js` |

Implementation:

- Central config: `lib/learning-book/book-grade-themes.js` (`getBookGradeTheme(grade)`) — grades **g1–g6**
- Client catalog: `lib/learning-book/learning-book-catalog-meta.js`
- Server catalog: `lib/learning-book/learning-book-catalog.js`
- React context: `components/learning-book/BookGradeThemeContext.js`

**Full structure (June 2026):** Math G1–G6 and גאומטריה G1–G6 shells prepared; placeholder books allowed in dev. See `LEARNING_BOOK_FULL_STRUCTURE_EXPANSION.md`.

Do **not** assign subject-specific random colors when cloning books to new subjects — pass the student's grade key instead.

---

## 3. The No-Fallback Policy — Why and How

### The Rule

> If no approved learning page exists for a given `subject + grade + skill_id`,
> the explanation button must be hidden. The system must NOT open a page from a
> different grade, a parent topic, or any other approximation.

### Why This Rule Exists

The learning book is grade-based by design. A Grade 1 child who is working on
`add_second_decade` is cognitively and linguistically different from a Grade 4 child
working on the same skill ID. Showing a Grade 4 explanation to a Grade 1 student:

- Uses vocabulary the child has not yet encountered
- Introduces concepts that are out of their current curriculum scope
- Potentially confuses the child rather than helping them
- Undermines teacher trust in the product

A missing page should be invisible to the student — not replaced with the wrong content.

### How to Enforce This

The resolution function should have no fallback parameter. Its signature should make
the fallback behavior impossible by design, not just by convention.

Pseudocode:
```
function resolveLearningPage(subject, grade, skillId) {
  const page = registry.find(subject, grade, skillId);
  if (!page || page.approvalStatus !== "active") {
    return null;   // caller must handle null by hiding the button
  }
  return page;
}
```

The calling code must check for `null` and hide the UI affordance:
```
const page = resolveLearningPage("math", student.grade, currentSkillId);
if (page === null) {
  // do not render the explanation button at all
}
```

### What "hiding the button" means in practice

The button does not render. The student does not see a disabled button, a grayed-out
button, or any indication that a page could exist. The experience is identical to a flow
that never had a learning book feature. The gap is invisible to the student.

---

## 4. Modal vs. Full Page

The learning page could be rendered in two ways. Both are valid. The choice should be
made when the UI is designed, not in this document. Notes for consideration:

### Option A — Modal Overlay

A modal opens over the current activity when the student presses the explanation button.
The student can close it and return to exactly where they were.

**Advantages:**
- Does not interrupt the session flow
- Student can refer back to the explanation multiple times without navigating away
- Simpler routing (no new URL)

**Disadvantages:**
- Limited screen real estate, especially on mobile
- Complex content (diagrams, worked examples) may feel cramped
- In an RTL layout, modal positioning needs careful design

### Option B — Full Learning Page

A new page is loaded. The student navigates to the learning page and then navigates back
to the activity.

**Advantages:**
- Full screen real estate for diagrams and worked examples
- Bookmarkable / shareable URL
- Can be assigned directly by a teacher ("read this page before tonight's homework")
- More natural reading experience

**Disadvantages:**
- Interrupts the session flow
- Back navigation must be reliable (student should return to the exact same point)
- Requires URL routing for each `learning_page_id`

### Recommendation for later consideration

For the initial Grade 1 release, a modal may be simpler to ship. A full page experience
can be introduced in Phase 5 when the teacher portal can assign learning pages directly.

---

## 5. Approval Status Lifecycle

Each learning page moves through the following states. Only `active` pages are shown
to students.

```
draft
  ↓  (author completes all sections and self-reviews)
review
  ↓  (product owner reads the page in Hebrew and explicitly approves)
approved
  ↓  (page is wired to a deployed registry / release)
active
  ↓  (if content needs update or is temporarily removed)
archived
```

### State definitions

| Status | Meaning | Can be shown to students? |
|--------|---------|--------------------------|
| `draft` | Being written; incomplete or unreviewed | No |
| `review` | Complete draft; awaiting owner review | No |
| `approved` | Owner has reviewed and approved; not yet in a deployed release | No |
| `active` | Deployed and live; the resolution function returns this page | Yes |
| `archived` | Previously active but removed or replaced | No |

### Who can approve

Only a human product owner (not an AI process) can move a page from `review` to `approved`.
The `last_reviewed_by` field must contain a human identifier, and `last_reviewed_at` must
be a real date.

---

## 6. Relationship to Parent Report and Teacher Report

The learning book is a student-facing feature at its core, but it can integrate with
parent and teacher surfaces in the future.

### Parent Report

A parent report currently shows topic-level performance data. In the future:
- A parent could see "your child has learning pages available for these topics" as a
  signal of curriculum coverage
- A parent could receive a link to a specific learning page to review alongside their child
- The parent copilot could reference an approved learning page when explaining a concept
  ("here is how it is explained to your child at their grade level")

### Teacher Report / Teacher Portal

A teacher currently assigns activities by topic. In the future:
- A teacher could assign a specific learning page ("read this explanation before the quiz")
- A teacher could see which topics have active learning pages vs. which are still pending
- A teacher could flag a learning page for owner review if they notice a curriculum mismatch

None of these integrations are in scope for the current documentation phase.
They require the core learning page system (Phase 5) to be built first.

---

## 7. Relationship to AI Tutor / Parent Copilot

The current system includes a Parent Copilot (AI-powered) that answers parent questions
about their child's progress. The learning book is intentionally separate from this AI layer.

### Current policy

No freeform AI-generated explanation is shown directly to students at this stage.

### Future potential

Once approved learning pages exist, an AI tutor or copilot could:
- Use the approved learning page content as its grounding document ("answer based on
  this approved explanation, do not introduce new concepts")
- Generate practice questions grounded in the explanation level of that grade's page
- Summarize or simplify an approved page at the student's request (only if owner-approved
  simplification guidelines exist)

The key principle: **AI is a downstream layer on top of approved content**, not a replacement
for it. The approved learning page must always be the canonical source. AI can adapt its
presentation but cannot introduce content that contradicts or extends beyond the approved page.

---

## 8. Relationship to the Subtopic Diagnostic Layer

The Subtopic Diagnostic Layer plan (`docs/subtopics/SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md`,
May 2026) introduced a concept of subtopic-level diagnostic conclusions — knowing not just
that a student struggles with "addition" but that they specifically struggle with
"addition with regrouping."

The Learning Book layer is complementary:

| Layer | Purpose | Granularity |
|-------|---------|-------------|
| Diagnostic Layer | Identify what the student does not know | `subject + grade + subtopic_id` |
| Learning Book | Explain what the student should know | `subject + grade + skill_id` |

In the future, these two layers can be connected:
- A diagnostic conclusion ("student is weak on `add_vertical`") can trigger a recommendation
  to open the learning page for that skill at their grade
- A teacher assigning remediation can link a diagnostic finding directly to a learning page

### Note on skill ID alignment

The curriculum spine `skill_id` format (`math:kind:add_vertical`) is used by both the
diagnostic layer and the learning book. This is intentional — the `skill_id` is the shared
key that connects practice questions, diagnostic conclusions, and learning explanations.

Any future learning page ID (`math:g2:add_vertical`) maps back to the spine `skill_id`
by the formula: `skill_id = "math:kind:" + subtopic`.

---

## 9. Possible Content Storage Approaches

Three approaches for where learning page content lives. No decision is made in this document.

### Approach 1 — Static Markdown Files

Content lives in files like `data/learning-book/math/g1/add_two.md`.
The registry is a static JS/JSON file listing all active pages and their metadata.

**Pros:** Simple, version-controlled, no database needed, easy to review diffs
**Cons:** Requires a deploy for any content update; no runtime approval workflow

### Approach 2 — Supabase Table

A `learning_pages` table stores metadata (approval_status, grade, skill_id, title_hebrew).
Content (sections) lives in a `jsonb` column or linked content rows.

**Pros:** Owner can update approval status without a deploy; analytics are easy
**Cons:** Content is not in version control; review workflow is UI-dependent

### Approach 3 — Hybrid

Metadata and approval status in Supabase. Content (the actual explanation text) in
static Markdown files referenced by the database row. The database provides the
approval gate; the file provides the content.

**Pros:** Combines auditability (git diff shows content changes) with runtime control
**Cons:** Two sources of truth require synchronization discipline

---

## 10. Risks and Open Questions

| # | Risk / Question | Priority | Notes |
|---|-----------------|----------|-------|
| 1 | **Wide-span skills** — `add_two` is g1–g6. Authoring 6 separate pages for one skill_id is correct but labor-intensive. Who decides when each grade's page is good enough? | High | The no-fallback rule means the skill is invisible to students in grades without an active page. Phase the authoring grade by grade. |
| 2 | **Hebrew title approval** — all 91 math skills × up to 6 grades each could mean ~200+ Hebrew titles that need owner review. | High | Batch approval by grade cohort; owner reviews Grade 1 titles first as a group. |
| 3 | **Curriculum drift** — if `utils/math-constants.js` or `skills.json` is updated to add or remove skills, existing learning pages may become orphaned or miss new skills. | Medium | When spine is updated, run a cross-check against the learning page registry to flag orphaned or missing pages. |
| 4 | **`sequence` skill scope** — the spine shows `sequence` as g3–g6 but does not specify what types of sequences (arithmetic only? geometric? mixed?) are in scope per grade. | Medium | Owner should clarify before authoring sequence pages for g5–g6. |
| 5 | **Grade assignment accuracy** — a student may be assigned to a different grade than their actual school grade (e.g., remediation). Should the learning page shown follow the assigned grade or the school grade? | Medium | Current system uses assigned grade throughout. Recommend consistent behavior: learning pages follow the same grade as the practice session. |
| 6 | **Mobile layout** — the learning page must render correctly in RTL Hebrew on small screens (320px and up). Diagrams and number lines are particularly risky. | Medium | Must be part of Phase 5 UX requirements, not an afterthought. |
| 7 | **Geometry adjacency** — geometry skills for g1 include basic shapes and transformations, which students encounter alongside math. Should the math learning page reference geometric shapes? | Low | Currently out of scope. Do not mix subjects. If a math explanation naturally references a shape, use a brief inline description without linking to a geometry page. |
| 8 | **`wp_multi_step` is g5 only in spine** — Grade 6 also involves multi-step word problems but there is no dedicated g6 entry. Is this intentional? | Low | Confirm with owner. May need a g6 `wp_multi_step` spine entry before authoring a g6 page. |
| 9 | **Estimation skills end at g5** — `est_add`, `est_mul`, `est_quantity` are listed g4–g5 only. Grade 6 uses estimation implicitly (scale, ratio). Should estimation have a g6 page? | Low | Document as a gap. Owner to decide. |
| 10 | **Order of operations beyond g3** — `order_add_mul`, `order_parentheses` are g3 only in the spine. Higher-grade expressions implicitly require these rules. No learning page exists for g4–g6 on this topic under the current spine. | Low | Flag as potential spine gap. A future spine addition would be required before authoring higher-grade order-of-operations pages. |
