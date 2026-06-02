/**
 * Sync Geometry draft markdown diagram markers to authoritative page map.
 * Run: node scripts/lib/sync-geometry-page-diagrams.mjs
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
import { GEOMETRY_PAGE_DIAGRAM_BY_GRADE } from "../../lib/learning-book/geometry-diagram-page-map.js";
import { replaceGeometryDiagramInBody } from "../../lib/learning-book/geometry-diagram-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const BOOKS = [
  ["g1", GEOMETRY_G1_PAGE_ORDER],
  ["g2", GEOMETRY_G2_PAGE_ORDER],
  ["g3", GEOMETRY_G3_PAGE_ORDER],
  ["g4", GEOMETRY_G4_PAGE_ORDER],
  ["g5", GEOMETRY_G5_PAGE_ORDER],
  ["g6", GEOMETRY_G6_PAGE_ORDER],
];

let updated = 0;
let removed = 0;

for (const [grade, order] of BOOKS) {
  const map = GEOMETRY_PAGE_DIAGRAM_BY_GRADE[grade] || {};
  for (const pageId of order) {
    const spec = map[pageId];
    if (!spec) continue;
    const fp = path.join(ROOT, "docs/learning-book/geometry", grade, "drafts", `${pageId}.md`);
    if (!fs.existsSync(fp)) continue;

    const raw = fs.readFileSync(fp, "utf8").replace(/\r\n/g, "\n");
    const hadDiagram = /:::geometry-diagram/.test(raw);
    const next = replaceGeometryDiagramInBody(raw, spec.diagramType);

    if (next !== raw) {
      fs.writeFileSync(fp, next);
      updated += 1;
      if (hadDiagram && !spec.diagramType) removed += 1;
    }
  }
}

console.log(`Synced geometry diagrams: ${updated} files updated, ${removed} diagrams removed.`);
