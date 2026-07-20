/**
 * Writing payload generation + itemRef integrity.
 * Run: node tests/writing/writing-payload-integrity.test.mjs
 */

import assert from "node:assert/strict";
import { generateWritingForParent } from "../../lib/writing/writing-generate.server.js";
import { buildReadyWritingPayload } from "../../lib/writing/writing-payload-build.server.js";
import { getReadyWritingBySlug } from "../../lib/writing/writing-ready-catalog.js";

const parentGen = generateWritingForParent({
  worksheetType: "writing",
  writingCategory: "hebrew_letters",
  characters: ["א", "ב"],
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
  includeExample: true,
  includeCopyRows: true,
  includeIndependentRows: false,
  includeImage: false,
  includeNameField: true,
  includeDateField: true,
  pageOrientation: "portrait",
  pageDensity: "comfortable",
  showStartPoint: false,
  showDirectionArrows: false,
  showStrokeNumbers: false,
  inkSave: false,
});

assert.equal(parentGen.ok, true);
assert.equal(parentGen.worksheetPayload.payloadKind, "writing_worksheet");
assert.ok(parentGen.worksheetPayload.pages.length > 0);

const reviewEntry = getReadyWritingBySlug("writing-num-group-before-after");
if (reviewEntry) {
  const readyPayload = buildReadyWritingPayload(reviewEntry);
  if (readyPayload.requiresAnswerKey && readyPayload.answers?.length) {
    const itemIds = new Set();
    for (const page of readyPayload.pages) {
      for (const block of page.blocks) {
        if (block.blockType !== "practice" && block.blockType !== "answer_area") continue;
        for (const row of block.rows) {
          for (const item of row.items) itemIds.add(item.itemId);
        }
      }
    }
    for (const ans of readyPayload.answers) {
      assert.ok(itemIds.has(ans.itemRef), `itemRef ${ans.itemRef} must match itemId`);
    }
  }
}

console.log("writing-payload-integrity.test.mjs OK");
