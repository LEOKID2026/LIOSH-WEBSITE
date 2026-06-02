/**
 * Verify Geometry / גאומטריה visual diagram system.
 * Run: node scripts/verify-learning-book-geometry-diagrams.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GEOMETRY_G1_PAGE_ORDER } from "../lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "../lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_PAGE_ORDER } from "../lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "../lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_PAGE_ORDER } from "../lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_PAGE_ORDER } from "../lib/learning-book/geometry-g6-registry.js";
import { GEOMETRY_G1_BOOK_META } from "../lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_BOOK_META } from "../lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_BOOK_META } from "../lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_BOOK_META } from "../lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_BOOK_META } from "../lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_BOOK_META } from "../lib/learning-book/geometry-g6-registry.js";
import { splitBookMarkdownBlocks, simulateBookDisplayLines } from "../lib/learning-book/book-markdown-blocks.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  FORBIDDEN_ENGLISH_DIAGRAM_LABELS,
  GEOMETRY_DIAGRAM_LABELS,
  GEOMETRY_DIAGRAM_TYPE_IDS,
  isDeprecatedGeometryDiagramType,
  isKnownGeometryDiagramType,
  parseGeometryDiagramDirective,
} from "../lib/learning-book/geometry-diagram-registry.js";
import {
  GEOMETRY_PAGE_DIAGRAM_BY_GRADE,
  isDiagramShapeMismatch,
} from "../lib/learning-book/geometry-diagram-page-map.js";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const BOOKS = [
  ["g1", GEOMETRY_G1_PAGE_ORDER, GEOMETRY_G1_BOOK_META],
  ["g2", GEOMETRY_G2_PAGE_ORDER, GEOMETRY_G2_BOOK_META],
  ["g3", GEOMETRY_G3_PAGE_ORDER, GEOMETRY_G3_BOOK_META],
  ["g4", GEOMETRY_G4_PAGE_ORDER, GEOMETRY_G4_BOOK_META],
  ["g5", GEOMETRY_G5_PAGE_ORDER, GEOMETRY_G5_BOOK_META],
  ["g6", GEOMETRY_G6_PAGE_ORDER, GEOMETRY_G6_BOOK_META],
];

const errors = [];

function pushError(msg) {
  errors.push(msg);
}

for (const typeId of GEOMETRY_DIAGRAM_TYPE_IDS) {
  if (!isKnownGeometryDiagramType(typeId)) {
    pushError(`registry missing type: ${typeId}`);
  }
}

for (const label of Object.values(GEOMETRY_DIAGRAM_LABELS)) {
  if (!/[\u0590-\u05FF]/.test(label)) {
    pushError(`diagram label not Hebrew: ${label}`);
  }
  for (const forbidden of FORBIDDEN_ENGLISH_DIAGRAM_LABELS) {
    if (label.toLowerCase() === forbidden) {
      pushError(`English label leaked: ${label}`);
    }
  }
}

const sampleBody = `טקסט\n\n:::geometry-diagram\ntype: triangle_perimeter\n:::\n\nעוד טקסט`;
const blocks = splitBookMarkdownBlocks(sampleBody);
const geoBlock = blocks.find((b) => b.type === "geometry_diagram");
if (!geoBlock || geoBlock.diagramType !== "triangle_perimeter") {
  pushError("splitBookMarkdownBlocks failed to parse geometry-diagram fence");
}

const displayLines = simulateBookDisplayLines(sampleBody);
if (displayLines.join("\n").includes(":::geometry-diagram")) {
  pushError("simulateBookDisplayLines leaked raw diagram marker");
}

for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
  const entry = getLearningBookEntry("geometry", grade);
  if (!entry?.meta?.bookTitleHe?.includes("גאומטריה")) {
    pushError(`geometry/${grade} book title must use גאומטריה`);
  }
  if (entry?.meta?.bookTitleHe?.includes("הנדסה")) {
    pushError(`geometry/${grade} book title must not use הנדסה`);
  }
}

let totalPages = 0;

for (const [grade, order, meta] of BOOKS) {
  const map = GEOMETRY_PAGE_DIAGRAM_BY_GRADE[grade] || {};
  const draftsDir = path.join(ROOT, "docs/learning-book/geometry", grade, "drafts");

  for (const pageId of order) {
    totalPages += 1;
    const spec = map[pageId];
    if (!spec) {
      pushError(`missing page map entry: ${grade}/${pageId}`);
      continue;
    }

    const filePath = path.join(draftsDir, `${pageId}.md`);
    if (!fs.existsSync(filePath)) {
      pushError(`missing draft: geometry/${grade}/${pageId}.md`);
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
    const page = parseLearningPageMarkdown(raw, pageId);

    if (page.sections.length !== 7) {
      pushError(`${grade}/${pageId}: expected 7 sections, got ${page.sections?.length}`);
    }

    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (childFacing.includes("הנדסה")) {
      pushError(`${grade}/${pageId}: child-facing body contains forbidden הנדסה`);
    }

    const fenceMatch = raw.match(/:::geometry-diagram\n([\s\S]*?):::/);
    const currentType = fenceMatch?.[1]?.match(/type:\s*(\S+)/)?.[1] || null;
    const requiredType = spec.diagramType;

    if (requiredType && !currentType) {
      pushError(`${grade}/${pageId}: missing required diagram ${requiredType}`);
    }
    if (!requiredType && currentType) {
      pushError(`${grade}/${pageId}: unexpected diagram ${currentType} (should be text-only)`);
    }
    if (requiredType && currentType && currentType !== requiredType) {
      pushError(`${grade}/${pageId}: diagram ${currentType} != required ${requiredType}`);
    }
    if (currentType && isDeprecatedGeometryDiagramType(currentType)) {
      pushError(`${grade}/${pageId}: deprecated diagram type ${currentType}`);
    }
    if (currentType && isDiagramShapeMismatch(pageId, currentType)) {
      pushError(`${grade}/${pageId}: shape mismatch for ${currentType}`);
    }
    if (currentType && !isKnownGeometryDiagramType(currentType)) {
      pushError(`${grade}/${pageId}: unknown diagram type ${currentType}`);
    }

    for (const section of page.sections) {
      const sectionBlocks = splitBookMarkdownBlocks(section.body);
      const lines = simulateBookDisplayLines(section.body);
      const text = lines.join("\n");
      if (/type:\s*\w+/.test(text) || text.includes(":::geometry-diagram")) {
        pushError(`${grade}/${pageId}: diagram marker leaked into display lines §${section.number}`);
      }
    }

    void meta;
  }
}

if (errors.length) {
  console.error(
    "Geometry diagram verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log("Geometry diagram verification PASSED.");
console.log(`- ${totalPages} geometry pages checked (G1–G6)`);
console.log(`- ${GEOMETRY_DIAGRAM_TYPE_IDS.length} registered diagram types`);
console.log("- page map + draft markers aligned");
console.log("- Hebrew labels; book titles use גאומטריה");
console.log("- no deprecated perimeter_path on mapped pages");
console.log("- no shape/topic mismatches detected");
