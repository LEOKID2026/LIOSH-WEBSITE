# Learning Book — Full Structure Expansion

**Date:** June 2026  
**Status:** Dev infrastructure — placeholder books active on dev site (no feature flags).

---

## Books and routes

| Subject | Grade | Route | Title | Content status |
|---------|-------|-------|-------|----------------|
| Math | g1 | `/learning/book/math/g1` | ספר חשבון — כיתה א׳ | **Authored** (19 pages) |
| Math | g2 | `/learning/book/math/g2` | ספר חשבון — כיתה ב׳ | **Authored** (22 pages) |
| Math | g3 | `/learning/book/math/g3` | ספר חשבון — כיתה ג׳ | Placeholder |
| Math | g4 | `/learning/book/math/g4` | ספר חשבון — כיתה ד׳ | Placeholder |
| Math | g5 | `/learning/book/math/g5` | ספר חשבון — כיתה ה׳ | Placeholder |
| Math | g6 | `/learning/book/math/g6` | ספר חשבון — כיתה ו׳ | Placeholder |
| גאומטריה | g1 | `/learning/book/geometry/g1` | ספר גאומטריה — כיתה א׳ | **Authored** (3 pages) |
| גאומטריה | g2 | `/learning/book/geometry/g2` | ספר גאומטריה — כיתה ב׳ | **Authored** (3 pages) |
| גאומטריה | g3 | `/learning/book/geometry/g3` | ספר גאומטריה — כיתה ג׳ | **Authored** (9 pages) |
| גאומטריה | g4 | `/learning/book/geometry/g4` | ספר גאומטריה — כיתה ד׳ | **Authored** (14 pages) |
| גאומטריה | g5 | `/learning/book/geometry/g5` | ספר גאומטריה — כיתה ה׳ | **Authored** (17 pages) |
| גאומטריה | g6 | `/learning/book/geometry/g6` | ספר גאומטריה — כיתה ו׳ | **Authored** (19 pages) |

**Terminology:** Child-facing UI uses **גאומטריה** (not הנדסה). Internal IDs remain `geometry`.

**Routing:** Math G1/G2 keep explicit routes. All other books use dynamic routes:

- `pages/learning/book/[subject]/[grade]/index.js`
- `pages/learning/book/[subject]/[grade]/[pageId].js`

---

## Grade themes (G1–G6)

Config: `lib/learning-book/book-grade-themes.js`

| Grade | Theme | Applies to |
|-------|--------|------------|
| g1 | Purple/violet + emerald accents | Math G1, גאומטריה G1, … |
| g2 | Blue/cyan/teal | Math G2, גאומטריה G2, … |
| g3 | Green/emerald | All G3 books |
| g4 | Amber/gold | All G4 books |
| g5 | Rose/pink | All G5 books |
| g6 | Indigo/slate | All G6 books |

Same grade → same theme across subjects.

---

## Infrastructure files

| File | Role |
|------|------|
| `lib/learning-book/learning-book-catalog-meta.js` | Client-safe metadata, tiles, route bases |
| `lib/learning-book/learning-book-catalog.js` | Server catalog + loaders (SSG only) |
| `lib/learning-book/load-learning-book-pages.js` | Generic page loader |
| `lib/learning-book/learning-book-nav.js` | Generic nav / session snapshots |
| `lib/learning-book/learning-book-placeholders.js` | Placeholder markdown builder |
| `lib/learning-book/create-placeholder-book-registry.js` | Single-page placeholder registry |
| `components/learning-book/LearningBookShell.js` | Shared reader shell |
| `components/learning-book/LearningBookIndexTile.js` | Master page book tile |

| `components/learning-book/GeometryDiagram.js` | SVG diagrams for גאומטריה pages |
| `lib/learning-book/geometry-diagram-registry.js` | Diagram types + markdown directive parser |

Math G1/G2 keep dedicated registries, loaders, nav, and shells (unchanged behavior).

---

## Geometry visual diagrams

Geometry / **גאומטריה** pages must **not** be text-only. Relevant drafts should include `:::geometry-diagram` blocks (see `docs/learning-book/GEOMETRY_VISUAL_DIAGRAM_SYSTEM.md`).

Placeholder geometry pages include a sample diagram in §3.

---

## Placeholder content

**Folder convention:** `docs/learning-book/{subject}/{grade}/drafts/`

**Page ID:** `book_placeholder` (one page per placeholder book)

**Sections:** 7 (same reader UX as authored books)

**Copy (Hebrew only):**

- תוכן יתווסף בהמשך.
- הדף הזה מוכן לתוכן הלימודי.
- בקרוב נוסיף הסבר, דוגמה ותרגול לנושא הזה.

No visible `[DRAFT]` in child UI.

---

## Adding real content later

1. Add `{pageId}.md` under the grade drafts folder.
2. Register `pageId` in a subject/grade registry (replace placeholder registry or extend catalog).
3. Add topic/skill → pageId resolver when mappings are confident.
4. Add practice reverse-map only when Section 7 CTA should link to Math/Geometry Master.

To replace a placeholder book: expand registry batches/page order and add draft files; remove or demote `book_placeholder`.

---

## Master page buttons

### Book index tile (📖)

- **Math Master:** visible for **all grades g1–g6** when grade is selected.
- **Geometry Master (גאומטריה):** visible for **all grades g1–g6**.
- Label: `ספר חשבון` / `ספר גאומטריה` + `כיתה X`.

### Topic `📖 הסבר בספר`

- **Math G1/G2:** unchanged (confident skill/page mapping).
- **Placeholder books:** hidden (no resolver).

### In-learning `📖 הסבר`

- **Math G1/G2:** unchanged (learning mode only).
- **Placeholder books:** hidden.

### Section 7 practice CTA

- **Math G1/G2:** unchanged.
- **Placeholder books:** hidden (no fake practice mappings).

---

## Verification

```bash
node scripts/verify-learning-book-geometry-diagrams.mjs
node scripts/verify-learning-book-structure.mjs
node scripts/verify-math-g1-book.mjs
node scripts/verify-math-g2-book.mjs
node scripts/tests/verify-learning-book-bidi-rendering.mjs
npm run build
```

---

## Manual QA checklist

- [ ] Math G1 book unchanged (content, theme, practice, הסבר)
- [ ] Math G2 book unchanged
- [ ] `/learning/book/math/g3` … `/learning/book/math/g6` open placeholder
- [ ] `/learning/book/geometry/g1` … `/learning/book/geometry/g6` — title **ספר גאומטריה**, diagrams on relevant pages
- [ ] Grade theme changes by grade; same grade matches across Math/גאומטריה
- [ ] No visible **גאומטריה** on book UI
- [ ] No visible `[DRAFT]`
- [ ] Math Master / Geometry Master tiles — no layout shift
- [ ] Section swiper, TOC, prev/next work on placeholder pages

---

## Known limitations

- Placeholder books have a single TOC page (`ספר בהכנה`).
- No geometry topic → page resolver yet.
- No Math G3–G6 topic/practice book integration yet.
- Final per-topic page lists may expand registries beyond `book_placeholder`.
