/**
 * Generate Geometry visual diagram audit markdown.
 * Run: node scripts/lib/build-geometry-visual-diagram-audit.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GEOMETRY_G1_PAGE_ORDER } from "../../lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "../../lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_PAGE_ORDER } from "../../lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "../../lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_PAGE_ORDER } from "../../lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_PAGE_ORDER } from "../../lib/learning-book/geometry-g6-registry.js";
import { GEOMETRY_G1_BOOK_META } from "../../lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_BOOK_META } from "../../lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_BOOK_META } from "../../lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_BOOK_META } from "../../lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_BOOK_META } from "../../lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_BOOK_META } from "../../lib/learning-book/geometry-g6-registry.js";
import { parseLearningPageMarkdown } from "../../lib/learning-book/parse-learning-page-markdown.js";
import {
  GEOMETRY_PAGE_DIAGRAM_BY_GRADE,
  isDiagramShapeMismatch,
} from "../../lib/learning-book/geometry-diagram-page-map.js";
import {
  isDeprecatedGeometryDiagramType,
} from "../../lib/learning-book/geometry-diagram-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const OUT = path.join(ROOT, "docs/learning-book/GEOMETRY_VISUAL_DIAGRAM_AUDIT.md");

const BOOKS = [
  ["g1", GEOMETRY_G1_PAGE_ORDER, GEOMETRY_G1_BOOK_META],
  ["g2", GEOMETRY_G2_PAGE_ORDER, GEOMETRY_G2_BOOK_META],
  ["g3", GEOMETRY_G3_PAGE_ORDER, GEOMETRY_G3_BOOK_META],
  ["g4", GEOMETRY_G4_PAGE_ORDER, GEOMETRY_G4_BOOK_META],
  ["g5", GEOMETRY_G5_PAGE_ORDER, GEOMETRY_G5_BOOK_META],
  ["g6", GEOMETRY_G6_PAGE_ORDER, GEOMETRY_G6_BOOK_META],
];

/** @type {string[]} */
const rows = [];
let total = 0;
let withDiagram = 0;
let withoutDiagram = 0;

for (const [grade, order, meta] of BOOKS) {
  const map = GEOMETRY_PAGE_DIAGRAM_BY_GRADE[grade] || {};
  for (const pageId of order) {
    total += 1;
    const fp = path.join(ROOT, "docs/learning-book/geometry", grade, "drafts", `${pageId}.md`);
    const raw = fs.readFileSync(fp, "utf8").replace(/\r\n/g, "\n");
    const page = parseLearningPageMarkdown(raw, pageId);
    const spec = map[pageId];
    const currentMatch = raw.match(/:::geometry-diagram\n([\s\S]*?):::/);
    const currentType = currentMatch?.[1]?.match(/type:\s*(\S+)/)?.[1] || "none";
    const requiredType = spec?.diagramType ?? null;

    let problem = "—";
    let action = "keep";

    if (requiredType && currentType === "none") {
      problem = "missing diagram";
      action = "add diagram";
    } else if (!requiredType && currentType !== "none") {
      problem = "misleading / forced diagram";
      action = "remove misleading diagram";
    } else if (requiredType && currentType !== requiredType) {
      problem = `wrong type (${currentType})`;
      action = "replace diagram";
    } else if (isDeprecatedGeometryDiagramType(currentType)) {
      problem = "deprecated generic diagram";
      action = "replace diagram";
    } else if (isDiagramShapeMismatch(pageId, currentType)) {
      problem = "shape/topic mismatch";
      action = "replace diagram";
    } else if (!requiredType) {
      problem = "no safe diagram yet";
      action = "no safe diagram yet";
    }

    if (raw.includes("הנדסה")) {
      problem = problem === "—" ? "visible הנדסה" : `${problem}; הנדסה`;
      action = "replace wording";
    }

    if (requiredType) withDiagram += 1;
    else withoutDiagram += 1;

    if (currentType === requiredType || (!requiredType && currentType === "none")) {
      if (problem === "—") action = requiredType ? "keep" : "no safe diagram yet";
    }

    rows.push(
      `| ${grade} | ${pageId} | ${page.displayTitle} | ${spec?.conceptHe || "—"} | ${currentType} | ${problem} | ${requiredType || "—"} | ${action} |`
    );
  }

  void meta;
}

const body = `# Geometry / גאומטריה — Visual Diagram Audit

**Date:** June 2026  
**Status:** Generated from \`geometry-diagram-page-map.js\` + draft scan  
**Book title (UI):** ${GEOMETRY_G1_BOOK_META.bookTitleHe.replace("א׳", "X")} — all grades use **גאומטריה**

---

## Summary

| Metric | Count |
|--------|------:|
| Total Geometry pages (G1–G6) | ${total} |
| Pages with required diagram | ${withDiagram} |
| Pages intentionally without diagram | ${withoutDiagram} |

---

## Rules applied

1. Triangle perimeter pages → \`triangle_perimeter\`, never generic rectangle.
2. Square perimeter / area pages → square-specific diagrams.
3. Height pages → shape with visible height line + labels **גובה** / **בסיס**.
4. Trapezoid / parallelogram area → matching shape with base + height.
5. Circle pages → \`circle_radius\`.
6. Transformations, rotation, tiling, advanced volume topics → no forced diagram.
7. Deprecated \`perimeter_path\` / generic \`area_grid\` replaced where mapped.
8. No unexplained arrows — perimeter uses dashed outline only.

---

## Page audit table

| Grade | Page ID | Page title | Topic/concept | Current diagram | Problem | Required diagram type | Action |
| ----- | ------- | ---------- | ------------- | --------------- | ------- | --------------------- | ------ |
${rows.join("\n")}

---

## Intentionally text-only pages

These topics are too vague or lack a single safe visual:

- **transformations** (G1, G2) — הזזה / שיקוף
- **rotation** (G3)
- **tiling** (G5)
- **g6/solids** — multiple body types (גליל, חרוט, כדור…)
- **advanced volume** (pyramid, cylinder, cone, sphere, triangular prism base)

---

## Related files

- \`lib/learning-book/geometry-diagram-page-map.js\` — authoritative mapping
- \`components/learning-book/GeometryDiagram.js\` — SVG renderers
- \`docs/learning-book/GEOMETRY_VISUAL_DIAGRAM_SYSTEM.md\` — author guide
- \`scripts/lib/sync-geometry-page-diagrams.mjs\` — sync draft markers
`;

fs.writeFileSync(OUT, body);
console.log(`Wrote ${OUT} (${total} pages)`);
