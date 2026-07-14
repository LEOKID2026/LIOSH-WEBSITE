/**
 * Ready catalog integrity — Wave F.
 * Run: node --test tests/worksheets/worksheet-ready-catalog-integrity.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  READY_WORKSHEET_CATALOG,
  countReadyCatalogBySubject,
} from "../../lib/worksheets/worksheet-ready-catalog.js";
import {
  validateReadyCatalogShape,
  validateReadyCatalogGeneratesAll,
  listReadyCatalogSummaryRows,
} from "../../lib/worksheets/worksheet-ready-catalog-integrity.server.js";
import { findForbiddenPublicLevelLabels } from "../../lib/worksheets/worksheet-level-display.js";

describe("worksheet-ready-catalog-integrity", () => {
  test("catalog has at least 30 entries with subject minimums", () => {
    assert.ok(READY_WORKSHEET_CATALOG.length >= 30);
    const counts = countReadyCatalogBySubject();
    assert.ok(counts.math >= 15);
    assert.ok(counts.geometry >= 5);
    assert.ok(counts.hebrew >= 5);
    assert.ok(counts.english >= 5);
  });

  test("catalog shape validation passes", () => {
    const shape = validateReadyCatalogShape();
    assert.equal(shape.pass, true, shape.errors.join("; "));
  });

  test("all slugs unique and use public levels only", () => {
    const slugs = new Set();
    for (const entry of READY_WORKSHEET_CATALOG) {
      assert.ok(!slugs.has(entry.slug), `duplicate ${entry.slug}`);
      slugs.add(entry.slug);
      assert.ok(entry.levelKey === "regular" || entry.levelKey === "advanced");
      assert.equal(findForbiddenPublicLevelLabels(JSON.stringify(entry)).length, 0);
    }
  });

  test("every catalog entry generates printable payload without leaks", async () => {
    const gen = await validateReadyCatalogGeneratesAll();
    assert.equal(gen.pass, true, gen.errors.join("; "));
  });

  test("summary rows have Hebrew labels only for levels", () => {
    const rows = listReadyCatalogSummaryRows();
    assert.equal(rows.length, READY_WORKSHEET_CATALOG.length);
    for (const row of rows) {
      assert.ok(row.levelHe === "רגיל" || row.levelHe === "מתקדם", row.slug);
      assert.equal(findForbiddenPublicLevelLabels(JSON.stringify(row)).length, 0);
    }
  });
});
