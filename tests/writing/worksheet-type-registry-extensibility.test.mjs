/**
 * Registry extensibility — coloring type accepted without API contract changes.
 * Run: node tests/writing/worksheet-type-registry-extensibility.test.mjs
 */

import assert from "node:assert/strict";
import {
  getTypeHandler,
  resolveWorksheetType,
  WORKSHEET_TYPES,
} from "../../lib/worksheets/worksheet-type-registry.js";
import { buildUnifiedWorksheetCatalogItems } from "../../lib/worksheets/worksheet-public-catalog.server.js";

assert.deepEqual(WORKSHEET_TYPES, ["questions", "writing", "coloring"]);
assert.equal(resolveWorksheetType({}), "questions");
assert.equal(resolveWorksheetType({ worksheetType: "writing" }), "writing");
assert.equal(resolveWorksheetType({ worksheetType: "coloring" }), "coloring");

const coloringHandler = getTypeHandler("coloring");
const coloringResult = await coloringHandler.generate({});
assert.equal(coloringResult.ok, false);
assert.equal(coloringResult.status, 501);

const catalog = buildUnifiedWorksheetCatalogItems();
assert.equal(catalog.length, 305, "unified catalog must expose 305 metadata rows");
assert.ok(catalog.every((item) => item.slug && item.worksheetType));
assert.equal(catalog.filter((i) => i.worksheetType === "questions").length, 35);
assert.equal(catalog.filter((i) => i.worksheetType === "writing").length, 270);

console.log("worksheet-type-registry-extensibility.test.mjs OK");
