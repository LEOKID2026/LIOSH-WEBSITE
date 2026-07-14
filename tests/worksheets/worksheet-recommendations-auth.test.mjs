/**
 * Worksheet recommendations API — parent auth + child ownership — Wave E.
 * Run: node --test tests/worksheets/worksheet-recommendations-auth.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("worksheet-recommendations-auth", () => {
  test("recommendations API requires parent context", () => {
    const src = readFileSync(
      join(ROOT, "pages/api/parent/worksheets/recommendations.js"),
      "utf8"
    );
    assert.match(src, /requireParentApiContext/);
    assert.match(src, /verifyParentOwnsStudent/);
    assert.match(src, /isUuid/);
  });

  test("from-recommendation API verifies child ownership", () => {
    const src = readFileSync(
      join(ROOT, "pages/api/parent/worksheets/from-recommendation.js"),
      "utf8"
    );
    assert.match(src, /requireParentApiContext/);
    assert.match(src, /verifyParentOwnsStudent/);
    assert.doesNotMatch(src, /correctAnswer/);
    assert.doesNotMatch(src, /correctIndex/);
  });

  test("recommendations tab does not link to parent report", () => {
    const src = readFileSync(
      join(ROOT, "components/worksheets/RecommendationsTab.jsx"),
      "utf8"
    );
    assert.doesNotMatch(src, /parent-report/);
    assert.doesNotMatch(src, /\/parent\/parent-report/);
  });

  test("recommendation engine imports report aggregate server-side only", () => {
    const src = readFileSync(
      join(ROOT, "lib/worksheets/worksheet-recommendation-engine.server.js"),
      "utf8"
    );
    assert.match(src, /aggregateParentReportPayload/);
    assert.doesNotMatch(src, /pages\/parent/);
  });
});
