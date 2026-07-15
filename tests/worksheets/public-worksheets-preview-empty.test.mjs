/**
 * Public preview empty state — Hebrew copy and noindex.
 * Run: node --test tests/worksheets/public-worksheets-preview-empty.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("public-worksheets-preview-empty", () => {
  test("preview route shows empty state instead of redirect", () => {
    const src = readFileSync(join(ROOT, "pages/practice/worksheets/preview.js"), "utf8");
    assert.match(src, /publicPreviewLost/);
    assert.match(src, /publicPreviewLostCta/);
    assert.match(src, /\/practice\/worksheets/);
    assert.doesNotMatch(src, /router\.replace/);
  });

  test("preview and answers use noindex PageSeo", () => {
    for (const rel of [
      "pages/practice/worksheets/preview.js",
      "pages/practice/worksheets/preview/answers.js",
    ]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.match(src, /noindex/);
      assert.match(src, /PageSeo/);
    }
  });

  test("public preview uses separate session storage key", () => {
    const src = readFileSync(
      join(ROOT, "lib/worksheets/worksheet-public-preview-session.client.js"),
      "utf8"
    );
    assert.match(src, /leo_worksheet_public_preview_v1/);
    assert.doesNotMatch(src, /leo_worksheet_preview_v1[^_]/);
  });

  test("empty state strings are Hebrew", () => {
    assert.ok(WORKSHEET_UI_HE.publicPreviewLost.length > 10);
    assert.ok(WORKSHEET_UI_HE.publicPreviewLostCta.length > 3);
    assert.match(WORKSHEET_UI_HE.publicPreviewLost, /דפי עבודה|תצוגה|חזר/);
  });
});
