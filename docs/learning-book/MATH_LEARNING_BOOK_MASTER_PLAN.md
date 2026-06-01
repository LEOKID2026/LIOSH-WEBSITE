# Math Learning Book — Master Plan

**Status:** Documentation / mapping only. No code implemented. No SQL executed. No commits made.
**Date:** June 2026
**Scope:** Math subject, grades 1–6
**Language:** English. All Hebrew display labels are draft suggestions and must be marked
`[DRAFT — not owner-approved]` until explicitly approved by the product owner.

---

## Table of Contents

1. [Product Goal](#1-product-goal)
2. [Definition: Grade-Based Learning Book](#2-definition-grade-based-learning-book)
3. [Why This Layer Is Needed](#3-why-this-layer-is-needed)
4. [Future UX Concept](#4-future-ux-concept)
5. [Hard Rules](#5-hard-rules)
6. [Age-Band Structure for Explanation Style](#6-age-band-structure-for-explanation-style)
7. [Proposed Content Model Fields](#7-proposed-content-model-fields)
8. [Phased Rollout Plan](#8-phased-rollout-plan)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Out-of-Scope Items](#10-out-of-scope-items)
11. [Related Documents](#11-related-documents)

---

## 1. Product Goal

The Math Learning Book is a grade-appropriate explanation layer that sits alongside the existing
question/activity system. When a student encounters a math topic in a learning or practice flow,
they will eventually be able to open a short, age-appropriate explanation page for that specific
topic at their specific grade level.

The goal is NOT to replace practice. The goal is to give students a reliable, curriculum-aligned
reference that explains the concept in the language and scope appropriate for their grade.

---

## 2. Definition: Grade-Based Learning Book

This is **not** one generic Math textbook.
This is a **grade-based learning book**.

Each grade has its own set of explanation pages. A Grade 1 explanation for addition is
fundamentally different from a Grade 4 explanation for addition, even though the underlying
`skill_id` may overlap.

### What this means in practice

| Grade | Scope example for "addition" |
|-------|------------------------------|
| Grade 1 | Counting on, sums up to 30, basic number sentences with missing numbers |
| Grade 2 | Vertical addition, carrying (regrouping), sums up to 1,000 |
| Grade 3 | Multi-digit addition, connection to order of operations |
| Grade 4 | Addition in the context of equations, estimation, multi-step problems |
| Grade 5 | Addition applied to fractions, mixed numbers, decimals |
| Grade 6 | Addition in ratio, scale, and multi-step word problems |

The explanation content, worked examples, vocabulary, and complexity level must all be
calibrated for the child's age, language level, and what they have already learned.

---

## 3. Why This Layer Is Needed

The current site generates and presents practice questions per subject, grade, topic, and
subtopic. This is the diagnostic and practice layer. Students practice and get assessed.

What is missing is a **learning reference layer**: a short, readable page a student can
open before or during practice that explains the concept they are working on.

Without this layer:
- Students who encounter an unfamiliar question have no in-product explanation to turn to
- Teachers and parents cannot point to a specific in-product resource for a topic
- The product cannot grow toward a tutoring or remediation experience

The Learning Book layer fills this gap by providing pre-authored, owner-approved explanation
pages that are tied to specific `skill_id` entries in the curriculum spine.

---

## 4. Future UX Concept

> **Important:** The button placement described here is **not** part of this documentation task.
> This section describes the intended future behavior only, to give context for the content design.

In a future release, a student in a learning or activity flow may see a small "explanation" or
"learn this" button near a question. Pressing it would open a learning page.

The learning page could be:
- A **modal** overlay (for quick reference without leaving the activity)
- A **full page** (for deeper reading, linked from parent/teacher reports or assignments)

The system resolves the correct page using three keys:
- `subject` (always "math" for this document)
- `grade` (the student's current assigned grade)
- `skill_id` (the skill being practiced at that moment)

If no approved learning page exists for that exact combination, the button is hidden entirely.
There is no fallback to another grade's page.

---

## 5. Hard Rules

These rules are non-negotiable and must be enforced in any future implementation.

### Rule 1 — Grade-appropriate content only

Every learning page is authored for a specific grade. A Grade 1 page must not contain
concepts from Grade 3. A Grade 5 page may reference prior knowledge from Grade 4, but
only in a brief, accessible way.

### Rule 2 — No fallback to other grades

> **If no approved learning page exists for `subject + grade + skill_id`, the system must
> hide the explanation button. It must NOT open a page from a different grade.**

This rule exists because showing a Grade 3 explanation to a Grade 1 student is potentially
confusing or misleading. It is better to show nothing than to show the wrong thing.

### Rule 3 — Approved content only

> **No freeform AI-generated explanation may be shown directly to children at this stage.**

AI generation may be used internally for drafting content, but every page shown to a student
must have been reviewed and explicitly approved by the product owner before it reaches
`approval_status: "approved"` or `"active"`.

AI can be considered in the future as a layer ON TOP of approved reference content (e.g., to
answer follow-up questions grounded in an approved explanation). It is not a substitute for
authored and reviewed learning pages at this stage.

### Rule 4 — Content tied to existing skill IDs

Every learning page must be linked to an existing `skill_id` from
`data/curriculum-spine/v1/skills.json`. New skill IDs must go through the spine governance
process before they can have a learning page. This ensures content cannot drift from the
actual curriculum the product covers.

### Rule 5 — Content scope matches grade operations list

The content of a learning page must stay within the operations allowed for that grade in
`utils/math-constants.js` (`GRADES[gN].operations[]`). If an operation is not in the grade's
allowed list, it must not appear in that grade's learning page.

---

## 6. Age-Band Structure for Explanation Style

Learning pages are authored within three age bands. Within each band, the language register,
example complexity, and page structure differ. See `MATH_LEARNING_PAGE_TEMPLATE.md` for
the detailed section-by-section template for each band.

### Grades 1–2 — Concrete and visual

- Short sentences, active verbs, very limited technical vocabulary
- Always anchor the concept to a real-world or visual object (blocks, fingers, number line)
- One concept per page; do not combine two rules
- Maximum one "special case" or "watch out" note
- Hebrew label target: simple, child-familiar language [DRAFT — not owner-approved]

### Grades 3–4 — Procedural and step-by-step

- Introduce the formal procedure name (e.g., "vertical addition", "long division")
- Show numbered steps clearly
- At least one fully worked example
- One "common mistake" note
- May reference previously learned skills (e.g., "remember the multiplication table")
- Hebrew label target: classroom-style language [DRAFT — not owner-approved]

### Grades 5–6 — Strategic and multi-step

- Begin with "how do you know which method to use?"
- Show strategy selection, not just steps
- Include a reasonableness check step
- May include more than one method where multiple approaches exist
- Connect to earlier learning explicitly
- Hebrew label target: more formal/academic language [DRAFT — not owner-approved]

---

## 7. Proposed Content Model Fields

The following fields define a learning page record. This is a documentation model only.
No database schema or runtime file is created by this document.

```
learning_page_id    string   Unique stable ID. Format: "math:{grade}:{skill_id}"
                             Example: "math:g1:add_second_decade"
skill_id            string   Required. Must match an entry in curriculum-spine/v1/skills.json
                             Example: "math:kind:add_second_decade"
grade               string   Required. One of: g1, g2, g3, g4, g5, g6
subject             string   Always "math" for this document
title_hebrew        string   Draft title in Hebrew. Must be marked [DRAFT — not owner-approved]
                             until explicitly approved.
page_type           enum     One of:
                               concept_foundation
                               visual_intuition
                               step_by_step_procedure
                               word_problem_strategy
                               practice_bridge
                               mixed
                               needs_review
age_band            enum     One of: grades_1_2 | grades_3_4 | grades_5_6
approval_status     enum     One of: draft | review | approved | active
                             Only "active" pages may be shown to students.
sections            array    Ordered list of content sections (see template)
last_reviewed_by    string   Owner identifier (not AI handle)
last_reviewed_at    date     ISO date of last owner review
```

---

## 8. Phased Rollout Plan

### Phase 0 — Map (current task)
- Audit all 91 Math skills in the curriculum spine
- Identify which skills appear in which grades
- For wide-span skills (e.g., `add_two` g1–g6), document that each grade needs a
  separate explanation page
- Produce `MATH_LEARNING_BOOK_CURRICULUM_MAP.md` (this document set)
- Produce Grade 1 deep-dive coverage document
- No content authored yet

### Phase 1 — Author Grade 1
- Write draft learning pages for all 19 Grade 1 math skills
- Owner review and approval per page
- Mark pages as `approval_status: "approved"` only after owner sign-off
- No UI wired yet

### Phase 2 — Author Grade 2
- Write draft learning pages for Grade 2 scope (new skills + grade-specific versions
  of wide-span skills)
- Owner review cycle

### Phase 3 — Author Grades 3–4
- Larger volume; includes order of operations, long division, fractions intro,
  powers, estimation
- Author and review

### Phase 4 — Author Grades 5–6
- Fractions (add/subtract/reduce/expand), percentages, decimals (multiply/divide),
  ratio, scale
- Author and review

### Phase 5 — Connect to UI (separate project)
- Wire the explanation button in learning/activity flows
- Implement the subject + grade + skill_id resolution logic
- Implement "no approved page → hide button" rule
- Launch with Grade 1 content only, expand by grade

---

## 9. Acceptance Criteria

A learning page is acceptable for `approval_status: "active"` when:

- [ ] It is linked to a valid `skill_id` in `data/curriculum-spine/v1/skills.json`
- [ ] The grade matches the `minGrade`–`maxGrade` range of that skill
- [ ] The content scope stays within the grade's allowed operations (`utils/math-constants.js`)
- [ ] The Hebrew title is marked as approved by the product owner
- [ ] At least one worked example is present
- [ ] A "common mistake" or "watch out" note is present
- [ ] The page has been reviewed by the product owner (not just by AI)
- [ ] `approval_status` has been explicitly set to `"approved"` or `"active"` by a human

---

## 10. Out-of-Scope Items

The following are explicitly out of scope for this documentation package and for
Phase 0 of the learning book project:

- Any UI implementation (buttons, modals, pages in React)
- Any changes to app code or existing logic
- Any changes to Hebrew product copy in the app
- Geometry (separate subject in the curriculum spine; adjacent, noted in curriculum map)
- English, Science, Hebrew language, or Geography learning books
- AI-generated content shown directly to students
- Parent Report or Teacher Report integration
- Any SQL, Supabase migrations, or database schema changes
- Commits, pushes, or deployments

---

## 11. Related Documents

| Document | Location | Relationship |
|----------|----------|--------------|
| Curriculum Spine Skills Registry | `data/curriculum-spine/v1/skills.json` | Primary source for all 91 Math skill IDs |
| Math Constants (per-grade operations) | `utils/math-constants.js` | Defines which operations are allowed per grade and per level |
| Math Question Generator | `utils/math-question-generator.js` | Procedural generator; confirms which skill kinds are actually used at runtime |
| Curriculum Spine Schema | `data/curriculum-spine/v1/schema.json` | JSON Schema for spine rows |
| Subtopic Diagnostic Layer Master Plan | `docs/subtopics/SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md` | Related May 2026 plan; confirms Math has no dedicated content-map files yet (unlike Hebrew) |
| Curriculum Audit | `docs/curriculum-audit.md` | Earlier audit of subject coverage |
| Math Curriculum Map | `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Grade-by-grade tables of all 91 skills |
| Grade 1 Deep Dive | `docs/learning-book/MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md` | Full coverage of Grade 1 math skills |
| Learning Page Template | `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Reusable section structure per age band |
| Implementation Notes | `docs/learning-book/MATH_LEARNING_BOOK_IMPLEMENTATION_NOTES.md` | Future technical considerations |
