#!/usr/bin/env node
/**
 * Generate runtime learning-book registries for Moledet G2–G4 and Geography G5–G6.
 * Run: node scripts/generate-moledet-geography-registries.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

const GRADE_LABELS = {
  g2: "כיתה ב׳",
  g3: "כיתה ג׳",
  g4: "כיתה ד׳",
  g5: "כיתה ה׳",
  g6: "כיתה ו׳",
};

/** @type {{ grade: string, subject: "moledet"|"geography", manifest: string, exportPrefix: string }[]} */
const SPECS = [
  {
    grade: "g2",
    subject: "moledet",
    manifest: "scripts/lib/moledet-geography-g2-draft-manifest.mjs",
    exportPrefix: "MOLEDET_G2",
  },
  {
    grade: "g3",
    subject: "moledet",
    manifest: "scripts/lib/moledet-geography-g3-draft-manifest.mjs",
    exportPrefix: "MOLEDET_G3",
  },
  {
    grade: "g4",
    subject: "moledet",
    manifest: "scripts/lib/moledet-geography-g4-draft-manifest.mjs",
    exportPrefix: "MOLEDET_G4",
  },
  {
    grade: "g5",
    subject: "geography",
    manifest: "scripts/lib/moledet-geography-g5-draft-manifest.mjs",
    exportPrefix: "GEOGRAPHY_G5",
  },
  {
    grade: "g6",
    subject: "geography",
    manifest: "scripts/lib/moledet-geography-g6-draft-manifest.mjs",
    exportPrefix: "GEOGRAPHY_G6",
  },
];

for (const spec of SPECS) {
  const mod = await import(pathToFileURL(path.join(ROOT, spec.manifest)).href);
  const batchesKey = `MOLEDET_GEOGRAPHY_${spec.grade.toUpperCase()}_BOOK_BATCHES`;
  const batches = mod[batchesKey];
  if (!Array.isArray(batches)) {
    throw new Error(`missing ${batchesKey}`);
  }

  const bookTitleHe =
    spec.subject === "moledet"
      ? `ספר מולדת — ${GRADE_LABELS[spec.grade]}`
      : `ספר גאוגרפיה — ${GRADE_LABELS[spec.grade]}`;

  const registryFile = path.join(
    ROOT,
    `lib/learning-book/${spec.subject}-${spec.grade}-registry.js`
  );

  const fnBase =
    spec.subject === "moledet"
      ? `Moledet${spec.grade.toUpperCase()}`
      : `Geography${spec.grade.toUpperCase()}`;

  const content = `import { createSequencedBookExports } from "./learning-book-sequence.js";
/**
 * Grade ${spec.grade.replace("g", "")} ${spec.subject === "moledet" ? "Moledet" : "Geography"} Learning Book — internal TOC registry.
 * Content files: docs/learning-book/moledet-geography/${spec.grade}/drafts/{pageId}.md
 * Status: prepared (hidden until owner approval — not student-visible).
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} ${spec.exportPrefix}Batch */

/** @type {${spec.exportPrefix}Batch[]} */
const ${spec.exportPrefix}_BOOK_BATCHES_RAW = ${JSON.stringify(batches, null, 2)};

const _${spec.exportPrefix}_SEQUENCE = createSequencedBookExports("${spec.subject}", "${spec.grade}", ${spec.exportPrefix}_BOOK_BATCHES_RAW);
export const ${spec.exportPrefix}_PAGE_ORDER = _${spec.exportPrefix}_SEQUENCE.pageOrder;
export const ${spec.exportPrefix}_BOOK_BATCHES = _${spec.exportPrefix}_SEQUENCE.batches;

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function get${fnBase}PageNeighbors(pageId) {
  return _${spec.exportPrefix}_SEQUENCE.getPageNeighbors(pageId);
}

export function isValid${fnBase}PageId(pageId) {
  return _${spec.exportPrefix}_SEQUENCE.isValidPageId(pageId);
}

export const ${spec.exportPrefix}_BOOK_META = Object.freeze({
  subject: "${spec.subject}",
  grade: "${spec.grade}",
  routeBase: "/learning/book/${spec.subject}/${spec.grade}",
  bookTitleHe: "${bookTitleHe}",
  gradeShortLabel: "${GRADE_LABELS[spec.grade]}",
  draftsDir: "docs/learning-book/moledet-geography/${spec.grade}/drafts",
  subjectTitleHe: "${spec.subject === "moledet" ? "מולדת" : "גאוגרפיה"}",
});
`;

  fs.writeFileSync(registryFile, content, "utf8");
  console.log("wrote", path.relative(ROOT, registryFile));
}
