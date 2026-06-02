#!/usr/bin/env node
/**
 * Promote English draft manifests → runtime registry files G1–G6.
 */
import fs from "node:fs";
import path from "node:path";

const GRADE_LABELS = {
  g1: "א׳",
  g2: "ב׳",
  g3: "ג׳",
  g4: "ד׳",
  g5: "ה׳",
  g6: "ו׳",
};

const MANIFESTS = {
  g1: "./lib/english-g1-draft-manifest.mjs",
  g2: "./lib/english-g2-draft-manifest.mjs",
  g3: "./lib/english-g3-draft-manifest.mjs",
  g4: "./lib/english-g4-draft-manifest.mjs",
  g5: "./lib/english-g5-draft-manifest.mjs",
  g6: "./lib/english-g6-draft-manifest.mjs",
};

const ROOT = process.cwd();

for (const [grade, importPath] of Object.entries(MANIFESTS)) {
  const mod = await import(importPath);
  const upper = grade.toUpperCase();
  const num = grade.replace("g", "");
  const pascal = `G${num}`;
  const batches = mod[`ENGLISH_${upper}_BOOK_BATCHES`];
  const batchesStr = JSON.stringify(batches, null, 2);
  const pageCount = batches.flatMap((b) => b.pages).length;
  const label = GRADE_LABELS[grade];

  const content = `/**
 * Grade ${num} English Learning Book — internal TOC registry.
 * Content files: docs/learning-book/english/${grade}/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} English${pascal}Batch */

/** @type {English${pascal}Batch[]} */
export const ENGLISH_${upper}_BOOK_BATCHES = ${batchesStr};

export const ENGLISH_${upper}_PAGE_ORDER = ENGLISH_${upper}_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const ENGLISH_${upper}_BOOK_META = Object.freeze({
  subject: "english",
  grade: "${grade}",
  routeBase: "/learning/book/english/${grade}",
  bookTitleHe: "ספר אנגלית — כיתה ${label}",
  gradeShortLabel: "כיתה ${label}",
  draftsDir: "docs/learning-book/english/${grade}/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getEnglish${pascal}PageNeighbors(pageId) {
  const index = ENGLISH_${upper}_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? ENGLISH_${upper}_PAGE_ORDER[index - 1] : null,
    next:
      index < ENGLISH_${upper}_PAGE_ORDER.length - 1
        ? ENGLISH_${upper}_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidEnglish${pascal}PageId(pageId) {
  return ENGLISH_${upper}_PAGE_ORDER.includes(pageId);
}
`;

  const outPath = path.join(ROOT, `lib/learning-book/english-${grade}-registry.js`);
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Wrote ${outPath} (${pageCount} pages, ${batches.length} batches)`);
}
