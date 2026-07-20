/**
 * Coloring pages pipeline smoke test.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getColoringCatalogEntries } from "../../lib/coloring/coloring-catalog.server.js";
import { generateColoringWorksheet } from "../../lib/coloring/coloring-generate.server.js";
import { invalidateColoringCatalogCache } from "../../lib/coloring/coloring-catalog.server.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG = path.join(ROOT, "data/coloring/coloring-pages-catalog.json");

function main() {
  assert.ok(fs.existsSync(CATALOG), "coloring-pages-catalog.json must exist");
  invalidateColoringCatalogCache();
  const entries = getColoringCatalogEntries();
  assert.ok(entries.length > 0, "catalog must not be empty");

  const keys = new Set();
  for (const entry of entries) {
    assert.ok(entry.cardKey, "cardKey required");
    assert.ok(!keys.has(entry.cardKey), `duplicate cardKey ${entry.cardKey}`);
    keys.add(entry.cardKey);
    assert.ok(entry.displayNameHe, "displayNameHe required");
    assert.ok(entry.a4Path?.startsWith("/assets/coloring-pages/"), "a4Path under public assets");
    assert.ok(entry.previewPath?.startsWith("/assets/coloring-pages/"), "previewPath under public assets");
    assert.ok(fs.existsSync(path.join(ROOT, "public", entry.a4Path.replace(/^\//, ""))), `missing a4 ${entry.cardKey}`);
    assert.ok(fs.existsSync(path.join(ROOT, "public", entry.previewPath.replace(/^\//, ""))), `missing preview ${entry.cardKey}`);
  }

  const sample = entries.find((e) => e.cardKey === "event_birthday") || entries[0];
  const generated = generateColoringWorksheet({ cardKey: sample.cardKey });
  assert.equal(generated.ok, true);
  assert.equal(generated.worksheetPayload.payloadKind, "coloring_worksheet");
  assert.equal(generated.worksheetPayload.displayNameHe, sample.displayNameHe);

  console.log(JSON.stringify({ ok: true, count: entries.length, sample: sample.cardKey }, null, 2));
}

main();
