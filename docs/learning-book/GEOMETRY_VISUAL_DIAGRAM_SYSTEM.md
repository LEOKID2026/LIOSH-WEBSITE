# Geometry / גאומטריה — Visual Diagram System

**Date:** June 2026  
**Status:** Infrastructure ready for all Geometry learning books (grades 1–6).

---

## Why Geometry needs diagrams

Math / חשבון pages can often work with text + equations + numeric examples.

Geometry / **גאומטריה** cannot be text-only. Children must **see** shapes, labels, sides, vertices, angles, perimeter paths, area grids, symmetry lines, and simple 3D forms. Without this layer, the book becomes “text about shapes” instead of a real learning book.

This system adds **structured SVG diagrams** inside the existing locked book reader — no new layout, HUD, or navigation.

---

## Terminology

| Context | Label |
|---------|--------|
| Child-facing UI | **גאומטריה** |
| Book titles | `ספר גאומטריה — כיתה X` |
| Internal IDs / routes | `geometry`, `/learning/book/geometry/...` |

Do **not** show **גאומטריה** in child-facing UI.

---

## Architecture

| File | Role |
|------|------|
| `lib/learning-book/geometry-diagram-page-map.js` | **Authoritative** page → diagram mapping (G1–G6) |
| `lib/learning-book/geometry-diagram-registry.js` | Diagram type IDs, Hebrew labels, directive parser |
| `components/learning-book/GeometryDiagram.js` | SVG renderers + grade-themed panel |
| `lib/learning-book/book-markdown-blocks.js` | Parses `:::geometry-diagram` fences into blocks |
| `components/learning-book/LearningMarkdown.js` | Renders `geometry_diagram` blocks in sections |

Math code-fence diagrams (`BookDiagram`) are unchanged.

---

## Supported diagram types

| Type | Purpose |
|------|---------|
| `triangle_parts` | Triangle — צלעות + קודקודים |
| `triangle_perimeter` | Triangle — היקף (קו מקווקו מסביב, **ללא חץ**) |
| `triangle_height` | Triangle — קו **גובה** + **בסיס** |
| `right_triangle` | משולש ישר זווית (פיתגורס) |
| `quadrilateral_parts` | מרובע — צלעות + קודקודים |
| `rectangle_sides` | מלבן — אורך / רוחב |
| `rectangle_diagonal` | מלבן + אלכסון |
| `square_sides` | ריבוע — צלעות |
| `square_perimeter` | ריבוע — היקף |
| `square_diagonal` | ריבוע + אלכסון |
| `square_area_grid` | ריבוע — ריבועי יחידה |
| `parallelogram_height` | מקבילית — **גובה** |
| `parallelogram_area` | מקבילית — בסיס + גובה + שטח |
| `parallelogram_diagonal` | מקבילית + אלכסון |
| `trapezoid_height` | טרפז — **גובה** |
| `trapezoid_area` | טרפז — בסיס + גובה + שטח |
| `right_angle` | זווית ישרה |
| `angle_basic` | זווית — קרניים + קודקוד |
| `symmetry_line` | קו סימטריה |
| `parallel_lines` | קווים מקבילים |
| `circle_radius` | מעגל — **רדיוס** |
| `cube_basic` | קובייה |
| `box_basic` | תיבה / מנסרה מלבנית |

**Deprecated (do not use in new pages):** `perimeter_path` (generic rectangle + arrow), `area_grid` (use `square_area_grid`).

Unknown types: **no crash**. Dev-only dashed placeholder; production renders nothing.

---

## How markdown requests a diagram

Inside any section body (especially §2–§4, §6):

```md
:::geometry-diagram
type: triangle_parts
:::
```

Optional keys (future use):

```md
:::geometry-diagram
type: rectangle_sides
caption: true
label: מלבן באורך 4 ס״מ
:::
```

Rules:

- Fences use `:::geometry-diagram` … `:::` — **not** triple backticks (those remain for Math).
- Raw markers are **never** shown in the reader UI.
- Prefer one diagram per section unless the lesson needs more.

### Examples by topic

**משולשים (§2):**

```md
:::geometry-diagram
type: triangle_parts
:::
```

**זווית ישרה (§3):**

```md
:::geometry-diagram
type: right_angle
:::
```

**היקף משולש (§2):**

```md
:::geometry-diagram
type: triangle_perimeter
:::
```

**היקף ריבוע (§2):**

```md
:::geometry-diagram
type: square_perimeter
:::
```

**שטח ריבוע (§3):**

```md
:::geometry-diagram
type: square_area_grid
:::
```

**שטח מקבילית (§2):**

```md
:::geometry-diagram
type: parallelogram_area
:::
```

**שטח טרפז (§2):**

```md
:::geometry-diagram
type: trapezoid_area
:::
```

**Choosing the right type (do not copy deprecated examples):**

- Use `triangle_perimeter` for **היקף משולש**.
- Use `square_perimeter` for **היקף ריבוע**.
- Use `square_area_grid` for **שטח ריבוע**.
- Use `parallelogram_area` for **שטח מקבילית**.
- Use `trapezoid_area` for **שטח טרפז**.
- **Do not** use deprecated `perimeter_path` or `area_grid` in new pages — they were generic (rectangle-only) and caused shape/topic mismatches.
- If no approved type fits, add one in `geometry-diagram-page-map.js` + `GeometryDiagram.js`, or leave the page text-only until a safe visual exists.

**Backward compatibility (code only):** `perimeter_path` and `area_grid` may still exist in `geometry-diagram-registry.js` / `GeometryDiagram.js` for legacy fences, but **no active geometry draft page** should use them. The verifier rejects them on mapped pages.

**סימטריה (§2):**

```md
:::geometry-diagram
type: symmetry_line
:::
```

---

## Hebrew labels

All diagram labels use Hebrew from `GEOMETRY_DIAGRAM_LABELS`:

- צלע, קודקוד, זווית, זווית ישרה
- אורך, רוחב, **בסיס**, **גובה**
- היקף, שטח
- קו סימטריה, קווים מקבילים
- **רדיוס**, **קוטר**

No English labels in child-facing diagram UI.

---

## RTL / math rules

- Hebrew labels: `dir="rtl"` on SVG text where needed.
- Measurements (`4 ס״מ`, `3 × 4 = 12`): isolated LTR via `bookMathIsolateStyle` / `MathMeasure`.
- Spacing between numbers and Hebrew units is preserved.
- Reuse `MixedHebrewMathText` for optional captions with mixed content.

---

## Grade themes

Diagrams sit inside the same panel classes as Math diagrams (`theme.diagramPanel`, `diagramAccent`, etc.) from `BookGradeThemeContext` / `book-grade-themes.js`:

| Grade | Theme |
|-------|--------|
| g1 | Purple/violet + emerald |
| g2 | Blue/cyan/teal |
| g3–g6 | Each grade’s existing palette |

Same grade → same diagram colors across Math and גאומטריה.

---

## Page → diagram mapping

Authoritative map: `lib/learning-book/geometry-diagram-page-map.js`  
Audit table: `docs/learning-book/GEOMETRY_VISUAL_DIAGRAM_AUDIT.md` (65 pages)

Sync draft markers after map changes:

```bash
node scripts/lib/sync-geometry-page-diagrams.mjs
node scripts/lib/build-geometry-visual-diagram-audit.mjs
```

---

## Adding a new diagram type

1. Add the type ID to `GEOMETRY_DIAGRAM_TYPE_IDS` in `geometry-diagram-registry.js`.
2. Add Hebrew labels if needed (extend `GEOMETRY_DIAGRAM_LABELS`).
3. Implement an SVG sub-component in `GeometryDiagram.js` and register it in `DIAGRAM_RENDERERS`.
4. Register the page mapping in `geometry-diagram-page-map.js` when a standard topic applies.
5. Run `node scripts/verify-learning-book-geometry-diagrams.mjs`.

---

## Verification

```bash
node scripts/verify-learning-book-geometry-diagrams.mjs
node scripts/verify-learning-book-structure.mjs
node scripts/verify-geometry-g1-book-content.mjs   # … g2–g6 as needed
node scripts/tests/verify-learning-book-bidi-rendering.mjs
npm run build
```

Manual QA:

- `/learning/book/geometry/g1` and a topic page (e.g. `shapes_basic_square`)
- `/learning/book/geometry/g6` and a topic page (e.g. `square_area`)
- Title: **ספר גאומטריה**
- Diagram visible, Hebrew labels, fits mobile width, grade theme applied
- No **גאומטריה**, no raw `:::geometry-diagram` in UI

---

## Related docs

- `docs/learning-book/LEARNING_BOOK_FULL_STRUCTURE_EXPANSION.md` — catalog + placeholder rules (Geometry pages must include diagrams where relevant)
