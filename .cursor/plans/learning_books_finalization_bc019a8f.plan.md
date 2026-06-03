---
name: Learning Books Finalization
overview: Create `docs/learning-books/LEARNING_BOOKS_FINALIZATION_MASTER_PLAN.md` — a complete, staged, per-page implementation plan to bring all 602 registered pages across 35 books to final launch quality before any child sees them. No content is changed in this step; only the plan document is written.
todos:
  - id: write-master-plan
    content: Write docs/learning-books/LEARNING_BOOKS_FINALIZATION_MASTER_PLAN.md — the full 13-section plan document with 602-page inventory organized by wave
    status: completed
isProject: false
---

# Learning Books Finalization Master Plan

## What will be created

One markdown file: [`docs/learning-books/LEARNING_BOOKS_FINALIZATION_MASTER_PLAN.md`](docs/learning-books/LEARNING_BOOKS_FINALIZATION_MASTER_PLAN.md)

## Source data used

- [`docs/learning-books/BOOK_PEDAGOGY_RICHNESS_AUDIT.md`](docs/learning-books/BOOK_PEDAGOGY_RICHNESS_AUDIT.md) — 602-page audit with ratings, issues, and fix recommendations
- [`tmp/book-pedagogy-page-table.md`](tmp/book-pedagogy-page-table.md) — full 602-row page inventory
- [`tmp/book-pedagogy-audit.json`](tmp/book-pedagogy-audit.json) — machine-readable audit scores
- [`docs/learning-book/LEARNING_BOOK_CROSS_GRADE_CONTENT_AUDIT.md`](docs/learning-book/LEARNING_BOOK_CROSS_GRADE_CONTENT_AUDIT.md) — 22 cross-grade generic families for Math/Geometry

## Document structure (13 sections)

**Section 1 — Executive Decision**
All 35 books must reach final quality before any child accesses the site. Post-launch rewrites harm trust and continuity. The goal is zero C/D pages and all B pages enriched to A.

**Section 2 — Master Inventory (602 pages)**
Organized by implementation wave. Each wave has its own table with columns:
- Page ID / Title / Current Rating / Audit Issues / Required Fix Type / Priority / Verification Status

Priority tiers used throughout:
- P1 = C-rated (blocks launch — 44 pages)
- P2 = B-rated with ≥2 issues OR in cross-grade generic family (highest-impact enrichment — ~95 pages)
- P3 = B-rated with 1 minor issue OR A with improvement note (~83 pages)
- P4 = A-rated, clean — verify only (~380 pages)

**Section 3 — Subject-Specific Quality Standards**
Per-subject "final page" checklist for Math, Geometry, Science, Hebrew, English, Moledet/Geography, as specified in the request. These become the acceptance criteria that reviewers check page-by-page.

**Section 4 — Implementation Waves (9 waves)**
- Wave 1: English G1–G3 full rewrite/enrichment (44 pages, 26 C-rated)
- Wave 2: English G4–G6 enrichment of all B pages and final polish (57 pages, 30 B-rated)
- Wave 3: Math G5–G6 — all 17 C pages, all weak B pages, compressed examples, grade-level numbers, cross-grade families (84 pages)
- Wave 4: Math G3–G4 + G1–G2 — B pages, cross-grade generic families, bullet-list-to-table conversions (104 pages)
- Wave 5: Science G1–G6 — observation/mini-experiment/conclusion/table scaffolds (38 pages)
- Wave 6: Geometry G1–G6 — visual gaps, real-life anchors, grade differentiation, diagram descriptions (66 pages)
- Wave 7: Hebrew G1–G6 — all B pages, the 1 C page review, grammar examples where thin (172 pages)
- Wave 8: Moledet/Geography — place/map/civic polish, self-check additions (37 pages)
- Wave 9: Full re-audit, QA pass, freeze documentation

**Section 5 — Acceptance Criteria**
Zero-tolerance list (0 C, 0 D, no page missing simple/guided example, no English vocab-only word list, no Science page without inquiry hook, no Geometry visual page without diagram/description, no upper-grade Math with tiny numbers, no unresolved cross-grade generic families, all practice bridges valid, build and verifiers pass, RTL rendering intact).

**Section 6 — Hard Restrictions**
No route, CSS, design, practice-mapping, reader-component, or diagnostic changes. Content changes only inside `docs/learning-book/**/drafts/*.md`. No SQL. No commit/push until Wave 9 sign-off.

**Section 7 — Per-Wave Task Lists**
Actionable checklist format for each wave (e.g., "Wave 1 Task 1: Rewrite `english:g1/vocab_emotions` — add 2-sentence scene + mini-dialogue + guided fill-in + self-check").

**Section 8 — Per-Subject Style Guide / Content Checklist**
Authoring rules for each subject (derived from Section 3 standards), formatted as a writer's reference card.

**Section 9 — Cross-Grade Differentiation Reference (Math/Geometry)**
The 22 NEEDS_POLISH families with per-grade differentiation requirements: what numbers, strategy, or framing must change at each grade to avoid feel-generic pages.

**Section 10 — Verification Checklist**
Per-page sign-off form template and per-wave verification gate criteria.

**Section 11 — Final Freeze Checklist**
Launch readiness gate: all 9 waves complete, re-audit passes, verifiers green, owner spot-check confirmed, documentation frozen.

**Section 12 — Risk Register**
Known risks: English G1–G3 scale (44 pages × full rewrite), Hebrew false-positive C page, Math cross-grade generic families (99% similarity requires careful grade differentiation, not just number swaps).

**Section 13 — Reference**
Links to all related documents, audit files, and registry paths.
