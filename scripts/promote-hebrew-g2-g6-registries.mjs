#!/usr/bin/env node
/**
 * One-shot: promote draft manifests → runtime registry files for Hebrew G2–G6.
 */
import fs from "node:fs";
import path from "node:path";

const GRADE_LABELS = {
  g2: "ב׳",
  g3: "ג׳",
  g4: "ד׳",
  g5: "ה׳",
  g6: "ו׳",
};

const MANIFESTS = {
  g2: "./lib/hebrew-g2-draft-manifest.mjs",
  g3: "./lib/hebrew-g3-draft-manifest.mjs",
  g4: "./lib/hebrew-g4-draft-manifest.mjs",
  g5: "./lib/hebrew-g5-draft-manifest.mjs",
  g6: "./lib/hebrew-g6-draft-manifest.mjs",
};

const ROOT = process.cwd();

for (const [grade, importPath] of Object.entries(MANIFESTS)) {
  const mod = await import(importPath);
  const batches = mod[`HEBREW_${grade.toUpperCase()}_BOOK_BATCHES`];
  const label = GRADE_LABELS[grade];
  const upper = grade.toUpperCase();
  const num = grade.replace("g", "");
  const pascal = `G${num}`;

  const batchesStr = JSON.stringify(batches, null, 2);
  const pageCount = batches.flatMap((b) => b.pages).length;

  const content = `/**
 * Grade ${num} Hebrew Learning Book — internal TOC registry.
 * Content files: docs/learning-book/hebrew/${grade}/drafts/{pageId}.md
 */

/** @typedef {{ id: string, titleHe: string, pages: string[] }} Hebrew${pascal}Batch */

/** @type {Hebrew${pascal}Batch[]} */
export const HEBREW_${upper}_BOOK_BATCHES = ${batchesStr};

export const HEBREW_${upper}_PAGE_ORDER = HEBREW_${upper}_BOOK_BATCHES.flatMap(
  (batch) => batch.pages
);

export const HEBREW_${upper}_BOOK_META = Object.freeze({
  subject: "hebrew",
  grade: "${grade}",
  routeBase: "/learning/book/hebrew/${grade}",
  bookTitleHe: "ספר עברית — כיתה ${label}",
  gradeShortLabel: "כיתה ${label}",
  draftsDir: "docs/learning-book/hebrew/${grade}/drafts",
});

/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getHebrew${pascal}PageNeighbors(pageId) {
  const index = HEBREW_${upper}_PAGE_ORDER.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? HEBREW_${upper}_PAGE_ORDER[index - 1] : null,
    next:
      index < HEBREW_${upper}_PAGE_ORDER.length - 1
        ? HEBREW_${upper}_PAGE_ORDER[index + 1]
        : null,
    index,
  };
}

export function isValidHebrew${pascal}PageId(pageId) {
  return HEBREW_${upper}_PAGE_ORDER.includes(pageId);
}
`;

  const outPath = path.join(ROOT, `lib/learning-book/hebrew-${grade}-registry.js`);
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Wrote ${outPath} (${pageCount} pages, ${batches.length} batches)`);
}
