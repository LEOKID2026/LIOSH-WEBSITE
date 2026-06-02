/**
 * Export child-facing visible text for all math + geometry learning book pages.
 * Run: node scripts/export-learning-book-visible-text.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../lib/learning-book/math-g2-registry.js";
import { MATH_G3_PAGE_ORDER } from "../lib/learning-book/math-g3-registry.js";
import { MATH_G4_PAGE_ORDER } from "../lib/learning-book/math-g4-registry.js";
import { MATH_G5_PAGE_ORDER } from "../lib/learning-book/math-g5-registry.js";
import { MATH_G6_PAGE_ORDER } from "../lib/learning-book/math-g6-registry.js";
import { GEOMETRY_G1_PAGE_ORDER } from "../lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "../lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_PAGE_ORDER } from "../lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "../lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_PAGE_ORDER } from "../lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_PAGE_ORDER } from "../lib/learning-book/geometry-g6-registry.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  flattenBookSectionVisibleLines,
  flattenMixedHebrewMathVisibleText,
} from "../lib/learning-book/book-visible-text-render.js";
import { stripStrayMarkdown } from "../lib/learning-book/parse-inline-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SUBJECT_LABEL = {
  math: "Math / חשבון",
  geometry: "Geometry / גאומטריה",
};

/** @type {{ subject: string, grade: string, order: string[] }[]} */
const CATALOG = [
  { subject: "math", grade: "g1", order: MATH_G1_PAGE_ORDER },
  { subject: "math", grade: "g2", order: MATH_G2_PAGE_ORDER },
  { subject: "math", grade: "g3", order: MATH_G3_PAGE_ORDER },
  { subject: "math", grade: "g4", order: MATH_G4_PAGE_ORDER },
  { subject: "math", grade: "g5", order: MATH_G5_PAGE_ORDER },
  { subject: "math", grade: "g6", order: MATH_G6_PAGE_ORDER },
  { subject: "geometry", grade: "g1", order: GEOMETRY_G1_PAGE_ORDER },
  { subject: "geometry", grade: "g2", order: GEOMETRY_G2_PAGE_ORDER },
  { subject: "geometry", grade: "g3", order: GEOMETRY_G3_PAGE_ORDER },
  { subject: "geometry", grade: "g4", order: GEOMETRY_G4_PAGE_ORDER },
  { subject: "geometry", grade: "g5", order: GEOMETRY_G5_PAGE_ORDER },
  { subject: "geometry", grade: "g6", order: GEOMETRY_G6_PAGE_ORDER },
];

function draftPath(subject, grade, pageId) {
  return path.join(
    ROOT,
    `docs/learning-book/${subject}/${grade}/drafts/${pageId}.md`
  );
}

/** @type {string[]} */
const out = [];
let totalFiles = 0;
let totalPages = 0;
let totalSections = 0;
let spacingMismatches = 0;

out.push("# Learning Book Visible Text Export");
out.push("");
out.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
out.push("");
out.push(
  "Each section lists **source-normalized** text (markdown stripped) and **renderer-normalized** visible text (MixedHebrewMathText simulation)."
);
out.push("");

for (const { subject, grade, order } of CATALOG) {
  out.push(`---`);
  out.push("");
  out.push(`## ${SUBJECT_LABEL[subject]} — ${grade.toUpperCase()}`);
  out.push("");

  for (const pageId of order) {
    const filePath = draftPath(subject, grade, pageId);
    if (!fs.existsSync(filePath)) {
      out.push(`### ${pageId} _(missing draft)_`);
      out.push("");
      continue;
    }

    totalFiles += 1;
    totalPages += 1;
    const raw = fs.readFileSync(filePath, "utf8");
    const page = parseLearningPageMarkdown(raw, pageId);
    const title = stripStrayMarkdown(page.title || pageId);

    out.push(`### ${pageId}`);
    out.push("");
    out.push(`| Field | Value |`);
    out.push(`|-------|-------|`);
    out.push(`| Subject | ${SUBJECT_LABEL[subject]} |`);
    out.push(`| Grade | ${grade} |`);
    out.push(`| Page ID | \`${subject}:${grade}:${pageId}\` |`);
    out.push(`| Page title | ${title} |`);
    out.push("");

    for (const section of page.sections) {
      totalSections += 1;
      const { lines, diagramLines } = flattenBookSectionVisibleLines(section.body);

      out.push(`#### Section ${section.number}: ${section.title}`);
      out.push("");

      for (const row of lines) {
        if (row.source !== row.rendered) {
          spacingMismatches += 1;
          out.push(`- **Source:** ${row.source}`);
          out.push(`- **Rendered:** ${row.rendered}`);
        } else {
          out.push(`- ${row.rendered}`);
        }
      }

      for (const dl of diagramLines) {
        out.push(`- _(diagram)_ ${dl}`);
      }

      if (!lines.length && !diagramLines.length) {
        out.push(`- _(empty section body)_`);
      }

      out.push("");
    }
  }
}

out.push("---");
out.push("");
out.push("## Export summary");
out.push("");
out.push(`| Metric | Count |`);
out.push(`|--------|------:|`);
out.push(`| Draft files exported | ${totalFiles} |`);
out.push(`| Pages | ${totalPages} |`);
out.push(`| Sections | ${totalSections} |`);
out.push(`| Source/render spacing mismatches flagged inline | ${spacingMismatches} |`);

const exportPath = path.join(
  ROOT,
  "docs/learning-book/LEARNING_BOOK_VISIBLE_TEXT_EXPORT.md"
);
fs.writeFileSync(exportPath, out.join("\n"), "utf8");

console.log(`Exported ${totalPages} pages, ${totalSections} sections → ${path.relative(ROOT, exportPath)}`);
console.log(`Spacing mismatches flagged: ${spacingMismatches}`);
