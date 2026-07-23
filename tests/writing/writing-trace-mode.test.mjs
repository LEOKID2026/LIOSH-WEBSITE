/**
 * Trace mode resolution — trace rows must use full_trace, not faint_model.
 * Run: node tests/writing/writing-trace-mode.test.mjs
 */

import assert from "node:assert/strict";
import { generateWritingForParent } from "../../lib/writing/writing-generate.server.js";
import { buildReadyWritingPayload } from "../../lib/writing/writing-payload-build.server.js";
import { getReadyWritingBySlug } from "../../lib/writing/writing-ready-catalog.js";

function collectTraceItems(payload) {
  /** @type {import("../../lib/writing/writing-worksheet-types.js").WritingItem[]} */
  const items = [];
  for (const page of payload.pages) {
    for (const block of page.blocks) {
      if (block.blockType !== "practice" && block.blockType !== "answer_area") continue;
      for (const row of block.rows) {
        for (const item of row.items) {
          if (item.taskType === "trace") items.push(item);
        }
      }
    }
  }
  return items;
}

const traceOnly = generateWritingForParent({
  worksheetType: "writing",
  writingCategory: "hebrew_letters",
  characters: ["א"],
  scriptStyle: "print",
  tracingMode: "trace",
  traceRenderMode: "faint_model",
  nikudMode: "none",
  lineTemplate: "trace_row",
  lineCount: 4,
  itemsPerLine: 2,
  repeatsPerLine: 1,
  fontSize: "md",
  strokeStyle: "dashed",
  includeExample: false,
  includeCopyRows: false,
  includeIndependentRows: false,
  includeImage: false,
  includeNameField: true,
  includeDateField: false,
  pageOrientation: "portrait",
  pageDensity: "comfortable",
  inkSave: false,
});

assert.equal(traceOnly.ok, true);
const traceItems = collectTraceItems(traceOnly.worksheetPayload);
assert.ok(traceItems.length > 0, "expected trace items");
for (const item of traceItems) {
  assert.equal(item.traceRenderMode, "full_trace", "trace row must use full_trace");
  assert.ok(item.svgAssetId?.includes("/full-trace/he-print/aleph.svg"), `trace svg must use ASCII slug: ${item.svgAssetId}`);
  assert.ok(!item.svgAssetId?.includes("%"), "trace svg URL must not be encoded");
  assert.notEqual(item.traceRenderMode, "faint_model");
}

const copyPayload = generateWritingForParent({
  worksheetType: "writing",
  writingCategory: "numbers",
  numberRange: { min: 2, max: 2 },
  numberMode: "digit",
  tracingMode: "copy",
  traceRenderMode: "faint_model",
  nikudMode: "none",
  lineTemplate: "number_cell",
  lineCount: 3,
  itemsPerLine: 1,
  repeatsPerLine: 1,
  fontSize: "md",
  strokeStyle: "dashed",
  includeExample: false,
  includeCopyRows: true,
  includeIndependentRows: false,
  includeImage: false,
  includeNameField: false,
  includeDateField: false,
  pageOrientation: "portrait",
  pageDensity: "comfortable",
  inkSave: false,
});

assert.equal(copyPayload.ok, true);
for (const page of copyPayload.worksheetPayload.pages) {
  for (const block of page.blocks) {
    if (block.blockType !== "practice") continue;
    for (const row of block.rows) {
      for (const item of row.items) {
        if (item.taskType === "copy") {
          assert.equal(item.traceRenderMode, "faint_model");
        }
      }
    }
  }
}

const ready = getReadyWritingBySlug("writing-he-aleph-trace-standard");
assert.ok(ready);
const readyPayload = buildReadyWritingPayload(ready);
const readyTrace = collectTraceItems(readyPayload).filter((i) => i.itemType === "glyph");
assert.ok(readyTrace.length > 0);
assert.equal(readyTrace[0].traceRenderMode, "full_trace");

const mixed = generateWritingForParent({
  worksheetType: "writing",
  writingCategory: "hebrew_letters",
  characters: ["א", "ב"],
  scriptStyle: "print",
  tracingMode: "trace_and_copy",
  traceRenderMode: "full_trace",
  nikudMode: "none",
  lineTemplate: "trace_row",
  lineCount: 4,
  itemsPerLine: 2,
  repeatsPerLine: 1,
  fontSize: "md",
  strokeStyle: "dashed",
  includeExample: true,
  includeCopyRows: true,
  includeIndependentRows: true,
  includeImage: false,
  includeNameField: false,
  includeDateField: false,
  pageOrientation: "portrait",
  pageDensity: "comfortable",
  inkSave: false,
});
assert.equal(mixed.ok, true);
const rowTypes = mixed.worksheetPayload.pages[0].blocks
  .filter((b) => b.blockType === "practice")[0]
  .rows.map((r) => r.items[0]?.taskType);
assert.deepEqual(rowTypes, ["copy", "trace", "copy", "independent_write"], "graduated trace_and_copy rows");

console.log("writing-trace-mode.test.mjs OK");
