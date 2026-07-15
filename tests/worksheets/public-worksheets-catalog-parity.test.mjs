/**
 * Public worksheets catalog parity — 35 items from shared builder.
 * Run: node --test tests/worksheets/public-worksheets-catalog-parity.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { READY_WORKSHEET_CATALOG } from "../../lib/worksheets/worksheet-ready-catalog.js";
import { buildReadyWorksheetCatalogItems } from "../../lib/worksheets/worksheet-public-catalog.server.js";

describe("public-worksheets-catalog-parity", () => {
  test("buildReadyWorksheetCatalogItems returns 35 slugs matching source", () => {
    const items = buildReadyWorksheetCatalogItems();
    assert.equal(items.length, 35);
    const sourceSlugs = READY_WORKSHEET_CATALOG.map((e) => e.slug).sort();
    const builtSlugs = items.map((i) => i.slug).sort();
    assert.deepEqual(builtSlugs, sourceSlugs);
  });

  test("each item has required public catalog fields", () => {
    for (const item of buildReadyWorksheetCatalogItems()) {
      assert.ok(item.slug);
      assert.ok(item.subjectId);
      assert.ok(item.subjectHe);
      assert.ok(item.gradeKey);
      assert.ok(item.gradeHe);
      assert.ok(item.topicHe);
      assert.ok(item.levelKey);
      assert.ok(item.levelHe);
      assert.equal(typeof item.count, "number");
      assert.ok(item.count > 0);
    }
  });
});
