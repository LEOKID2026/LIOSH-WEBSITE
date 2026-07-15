/**
 * Regression guard: the Parent Copilot truth-packet step text must not use the harsher
 * "דורש ליווי" phrasing - must use the softer, already-established "כדאי ללוות" wording.
 * Run: node --test tests/parent-report-language/truth-packet-no-doresh-livuy.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

test("truth-packet-v1.js does not contain the harsher 'דורש ליווי' phrasing", () => {
  const src = readFileSync(join(ROOT, "utils/parent-copilot/truth-packet-v1.js"), "utf8");
  assert.doesNotMatch(src, /דורש ליווי/);
  assert.match(src, /כדאי ללוות/);
});
