/**
 * Render all 270 writing catalog pages + verify payload assets exist.
 * Run: node tests/writing/writing-render-all.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { READY_WRITING_CATALOG } from "../../lib/writing/writing-ready-catalog.js";
import { buildReadyWritingPayload } from "../../lib/writing/writing-payload-build.server.js";
import { PUBLIC_ACCESS_SLUGS } from "../../data/writing/catalog-builders/_builder-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_ROOT = path.join(ROOT, "public");

/** @param {string} assetId */
function resolvePublicAsset(assetId) {
  if (!assetId || !assetId.startsWith("/")) return null;
  return path.join(PUBLIC_ROOT, assetId.replace(/^\//, "").replace(/\//g, path.sep));
}

/** @param {import("../../lib/writing/writing-worksheet-types.js").WritingWorksheetPayload} payload */
function collectAssetIds(payload) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const page of payload.pages) {
    for (const block of page.blocks) {
      if (block.blockType === "image") ids.add(block.image.assetId);
      if (block.blockType !== "practice" && block.blockType !== "answer_area") continue;
      for (const row of block.rows) {
        for (const item of row.items) {
          if (item.svgAssetId) ids.add(item.svgAssetId);
          if (item.pathAssetId) ids.add(item.pathAssetId);
          if (item.strokeOrderAssetId) ids.add(item.strokeOrderAssetId);
          if (item.image?.assetId) ids.add(item.image.assetId);
        }
      }
    }
  }
  return ids;
}

assert.equal(READY_WRITING_CATALOG.length, 270);

let publicCount = 0;
let lockedCount = 0;
/** @type {Set<string>} */
const allAssets = new Set();

for (const entry of READY_WRITING_CATALOG) {
  const payload = buildReadyWritingPayload(entry);
  assert.equal(payload.payloadKind, "writing_worksheet");
  assert.ok(payload.pages.length >= 1, `${entry.slug} must render at least one page`);

  for (const assetId of collectAssetIds(payload)) {
    allAssets.add(assetId);
    const filePath = resolvePublicAsset(assetId);
    assert.ok(filePath && fs.existsSync(filePath), `${entry.slug} missing asset ${assetId}`);
  }

  if (entry.publicAccess) {
    publicCount += 1;
    assert.ok(PUBLIC_ACCESS_SLUGS.has(entry.slug), `${entry.slug} marked public`);
  } else {
    lockedCount += 1;
    assert.ok(!PUBLIC_ACCESS_SLUGS.has(entry.slug), `${entry.slug} must not be in public set`);
    assert.ok(!entry.publicAccess, `${entry.slug} publicAccess must be false`);
  }
}

assert.equal(publicCount, 25);
assert.equal(lockedCount, 245);

console.log(
  `writing-render-all.test.mjs OK (270 pages, ${allAssets.size} unique assets, 25 public / 245 locked)`
);
