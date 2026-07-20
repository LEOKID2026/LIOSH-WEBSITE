/**
 * Public writing demo allowlist enforcement.
 */
import assert from "node:assert/strict";
import { validatePublicWritingDemo } from "../../lib/writing/writing-validate.server.js";
import { PUBLIC_WRITING_DEMO_TASK_TYPES } from "../../data/writing/public-demo-allowlist.js";

assert.ok(PUBLIC_WRITING_DEMO_TASK_TYPES.has("trace"));
assert.ok(PUBLIC_WRITING_DEMO_TASK_TYPES.has("copy"));
assert.ok(!PUBLIC_WRITING_DEMO_TASK_TYPES.has("independent_write"));

const blocked = validatePublicWritingDemo({
  worksheetType: "writing",
  writingCategory: "numbers",
  numberRange: { min: 1, max: 5 },
  numberMode: "before_after",
  tracingMode: "trace",
  lineCount: 4,
  itemsPerLine: 1,
});
assert.equal(blocked.ok, false);

const allowed = validatePublicWritingDemo({
  worksheetType: "writing",
  writingCategory: "hebrew_letters",
  characters: ["א"],
  tracingMode: "trace",
  lineCount: 4,
  itemsPerLine: 1,
});
assert.equal(allowed.ok, true);

console.log("writing-public-demo-allowlist.test.mjs OK");
