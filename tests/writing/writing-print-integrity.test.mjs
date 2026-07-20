/**
 * Print DOM integrity — no empty pages, page count matches payload.
 * Run: node tests/writing/writing-print-integrity.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { READY_WRITING_CATALOG } from "../../lib/writing/writing-ready-catalog.js";
import { buildReadyWritingPayload } from "../../lib/writing/writing-payload-build.server.js";
import { writingPageHasContent } from "../../lib/writing/writing-page-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cssPortrait = fs.readFileSync(
  path.join(__dirname, "../../styles/worksheet-writing-print-portrait.css"),
  "utf8"
);
const cssMain = fs.readFileSync(
  path.join(__dirname, "../../styles/worksheet-writing-print.css"),
  "utf8"
);

assert.ok(!cssPortrait.includes("min-height: 273mm"), "portrait print must not force 273mm min-height");
assert.ok(
  !/body\.worksheet-writing-print-mode[\s\S]*?writing-print-document\[data-print-orientation="portrait"\][\s\S]*?page:\s*writing-portrait/.test(
    cssPortrait
  ),
  "must not assign named page on print document root (causes blank first page)"
);
assert.ok(cssMain.includes("writing-print-page--empty"), "must hide empty print pages");
assert.ok(cssMain.includes("writing-print-header"), "header must be inside print page flow");
assert.ok(
  cssPortrait.includes(".writing-print-page + .writing-page--portrait.writing-print-page") ||
    cssPortrait.includes("+ .writing-page--portrait.writing-print-page"),
  "portrait print must page-break only before a following page"
);
assert.ok(
  cssPortrait.includes("break-after: avoid") || cssPortrait.includes("page-break-after: avoid"),
  "portrait print must not break after a page"
);
assert.ok(
  !cssPortrait.includes("page: writing-portrait") ||
    cssPortrait.indexOf("page: writing-portrait") > cssPortrait.indexOf("Do not set page"),
  "portrait sections must not use named page (trailing blank sheet)"
);

let emptyPages = 0;
let totalPages = 0;

for (const entry of READY_WRITING_CATALOG) {
  const payload = buildReadyWritingPayload(entry);
  totalPages += payload.pages.length;
  for (const page of payload.pages) {
    const has = writingPageHasContent(page);
    if (!has) emptyPages += 1;
    assert.ok(has, `${entry.slug} page ${page.pageId} must have content`);
    const practiceBlocks = page.blocks.filter(
      (b) => b.blockType === "practice" || b.blockType === "answer_area"
    );
    if (practiceBlocks.length) {
      const itemCount = practiceBlocks.reduce(
        (n, b) => n + b.rows.reduce((rn, r) => rn + r.items.length, 0),
        0
      );
      assert.ok(itemCount > 0, `${entry.slug} must have practice items`);
    }
  }
}

assert.equal(emptyPages, 0);
assert.equal(totalPages, 270);

console.log(`writing-print-integrity.test.mjs OK (${totalPages} pages, 0 empty)`);
