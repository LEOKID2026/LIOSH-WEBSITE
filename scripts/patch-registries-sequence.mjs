#!/usr/bin/env node
/**
 * Patch learning-book registries to use createSequencedBookExports.
 * Run: node scripts/patch-registries-sequence.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REG_DIR = path.join(ROOT, "lib/learning-book");

const files = fs
  .readdirSync(REG_DIR)
  .filter(
    (f) =>
      f.endsWith("-registry.js") &&
      !f.includes("placeholder") &&
      !f.includes("diagram") &&
      /^(math|geometry|science|hebrew|english)-g[1-6]-registry\.js$/.test(f)
  );

for (const file of files) {
  const m = /^(math|geometry|science|hebrew|english)-g([1-6])-registry\.js$/.exec(file);
  if (!m) continue;
  const subject = m[1];
  const grade = `g${m[2]}`;
  const prefix = subject.toUpperCase();
  const gUpper = grade.toUpperCase();
  const pascal = `${prefix}_${gUpper}`;
  const filePath = path.join(REG_DIR, file);
  let src = fs.readFileSync(filePath, "utf8");

  if (src.includes("createSequencedBookExports")) {
    console.log(`skip (already patched): ${file}`);
    continue;
  }

  // Rename exported batches to _RAW
  src = src.replace(
    new RegExp(`export const ${pascal}_BOOK_BATCHES`),
    `const ${pascal}_BOOK_BATCHES_RAW`
  );

  const importLine = `import { createSequencedBookExports } from "./learning-book-sequence.js";\n`;

  // Insert import after block comment header
  if (!src.includes("learning-book-sequence.js")) {
    const insertAt = src.indexOf("\n\n/** @typedef");
    if (insertAt === -1) {
      const firstImport = src.indexOf("\nimport ");
      if (firstImport !== -1) {
        src = src.slice(0, firstImport + 1) + importLine + src.slice(firstImport + 1);
      } else {
        src = importLine + src;
      }
    } else {
      src = src.slice(0, insertAt + 2) + importLine + src.slice(insertAt + 2);
    }
  }

  const seqVar = `_${pascal}_SEQUENCE`;
  const isGeoG6 = subject === "geometry" && grade === "g6";

  let seqBlock;
  if (isGeoG6) {
    seqBlock = `
const ${seqVar} = createSequencedBookExports("${subject}", "${grade}", ${pascal}_BOOK_BATCHES_RAW);
export const ${pascal}_PAGE_ORDER = ${seqVar}.pageOrder;
export const ${pascal}_BOOK_BATCHES = ${seqVar}.batches;

/** Pages reachable in product while teach-path gates apply. */
export function getGeometryG6AccessiblePageOrder() {
  if (isPrismVolumeTriangleAllowed()) return ${pascal}_PAGE_ORDER;
  return ${pascal}_PAGE_ORDER.filter((pageId) => pageId !== "prism_volume_triangle");
}

/** TOC batches with gated pages removed from navigation. */
export function getGeometryG6AccessibleBookBatches() {
  const allowed = new Set(getGeometryG6AccessiblePageOrder());
  return ${pascal}_BOOK_BATCHES.map((batch) => ({
    ...batch,
    pages: batch.pages.filter((pageId) => allowed.has(pageId)),
  })).filter((batch) => batch.pages.length > 0);
}
`;
  } else {
    seqBlock = `
const ${seqVar} = createSequencedBookExports("${subject}", "${grade}", ${pascal}_BOOK_BATCHES_RAW);
export const ${pascal}_PAGE_ORDER = ${seqVar}.pageOrder;
export const ${pascal}_BOOK_BATCHES = ${seqVar}.batches;
`;
  }

  // Remove old PAGE_ORDER flatMap
  src = src.replace(
    new RegExp(
      `\\/\\*\\* Flat reading order[\\s\\S]*?\\*\\/\\s*\\nexport const ${pascal}_PAGE_ORDER = ${pascal}_BOOK_BATCHES(?:_RAW)?\\.flatMap\\([\\s\\S]*?\\);\\s*\\n`,
      "m"
    ),
    ""
  );
  src = src.replace(
    new RegExp(
      `export const ${pascal}_PAGE_ORDER = ${pascal}_BOOK_BATCHES(?:_RAW)?\\.flatMap\\([\\s\\S]*?\\);\\s*\\n`,
      "m"
    ),
    ""
  );

  // Remove geometry g6 accessible block if present (will re-add)
  if (isGeoG6) {
    src = src.replace(
      /\/\*\* Pages reachable in product[\s\S]*?export function getGeometryG6AccessibleBookBatches\(\) \{[\s\S]*?\}\s*\n/m,
      ""
    );
  }

  // Remove old neighbor functions
  src = src.replace(
    new RegExp(
      `/\\*\\*\\s*\\n \\* @param \\{string\\} pageId[\\s\\S]*?export function get${capitalize(subject)}G${m[2]}PageNeighbors\\([\\s\\S]*?\\}\\s*\\n\\s*\\nexport function isValid${capitalize(subject)}G${m[2]}PageId\\([\\s\\S]*?\\}\\s*\\n`,
      "m"
    ),
    ""
  );
  src = src.replace(
    new RegExp(
      `export function get${capitalize(subject)}G${m[2]}PageNeighbors\\([\\s\\S]*?\\}\\s*\\n\\s*\\nexport function isValid${capitalize(subject)}G${m[2]}PageId\\([\\s\\S]*?\\}\\s*\\n`,
      "m"
    ),
    ""
  );

  // Insert sequence block before BOOK_META
  const metaMarker = `export const ${pascal}_BOOK_META`;
  const metaIdx = src.indexOf(metaMarker);
  if (metaIdx === -1) {
    console.error(`Could not find BOOK_META in ${file}`);
    continue;
  }

  let neighborBlock;
  if (isGeoG6) {
    neighborBlock = `
/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function getGeometryG6PageNeighbors(pageId) {
  const order = getGeometryG6AccessiblePageOrder();
  const index = order.indexOf(pageId);
  if (index === -1) {
    return { prev: null, next: null, index: -1 };
  }
  return {
    prev: index > 0 ? order[index - 1] : null,
    next: index < order.length - 1 ? order[index + 1] : null,
    index,
  };
}

export function isValidGeometryG6PageId(pageId) {
  return getGeometryG6AccessiblePageOrder().includes(pageId);
}
`;
  } else {
    neighborBlock = `
/**
 * @param {string} pageId
 * @returns {{ prev: string | null, next: string | null, index: number }}
 */
export function get${capitalize(subject)}G${m[2]}PageNeighbors(pageId) {
  return ${seqVar}.getPageNeighbors(pageId);
}

export function isValid${capitalize(subject)}G${m[2]}PageId(pageId) {
  return ${seqVar}.isValidPageId(pageId);
}
`;
  }

  src = src.slice(0, metaIdx) + seqBlock + neighborBlock + "\n" + src.slice(metaIdx);

  fs.writeFileSync(filePath, src, "utf8");
  console.log(`patched: ${file}`);
}

function capitalize(s) {
  if (s === "math") return "Math";
  if (s === "geometry") return "Geometry";
  if (s === "science") return "Science";
  if (s === "hebrew") return "Hebrew";
  if (s === "english") return "English";
  return s;
}
