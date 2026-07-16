/**
 * Public worksheets APIs — no parent auth required.
 * Run: node --test tests/worksheets/public-worksheets-no-auth.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const PUBLIC_API_FILES = [
  "pages/api/public/worksheets/catalog.js",
  "pages/api/public/worksheets/generate.js",
  "pages/api/public/worksheets/answer-key.js",
  "pages/api/public/worksheets/ready/[slug].js",
];

describe("public-worksheets-no-auth", () => {
  test("public API handlers do not require parent context", () => {
    for (const rel of PUBLIC_API_FILES) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.doesNotMatch(src, /requireParentApiContext/);
      assert.doesNotMatch(src, /resolveParentBearerSession/);
      assert.doesNotMatch(src, /Authorization/);
    }
  });

  test("public preview routes have no auth", () => {
    const previewSrc = readFileSync(join(ROOT, "pages/practice/worksheets/preview.js"), "utf8");
    assert.doesNotMatch(previewSrc, /requireParentApiContext/);
    assert.doesNotMatch(previewSrc, /resolveParentBearerSession/);
    assert.match(previewSrc, /\/api\/public\/worksheets/);

    const answersSrc = readFileSync(
      join(ROOT, "pages/practice/worksheets/preview/answers.js"),
      "utf8"
    );
    assert.doesNotMatch(answersSrc, /requireParentApiContext/);
    assert.doesNotMatch(answersSrc, /resolveParentBearerSession/);
    assert.doesNotMatch(answersSrc, /\/api\/parent\/worksheets/);
  });

  test("PublicWorksheetsHub uses public APIs only", () => {
    const src = readFileSync(
      join(ROOT, "components/worksheets/PublicWorksheetsHub.client.jsx"),
      "utf8"
    );
    assert.match(src, /\/api\/public\/worksheets\/catalog/);
    assert.match(src, /\/api\/public\/worksheets\/generate/);
    assert.match(src, /\/api\/public\/worksheets\/ready/);
    assert.doesNotMatch(src, /\/api\/parent\/worksheets/);
    assert.match(src, /visitSessionId/);
    assert.match(src, /trackPublicWorksheetPageViewedOnce/);
  });
});
