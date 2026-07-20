/**
 * Writing catalog integrity tests — 270 entries, 25 public, en78.
 * Run: node tests/writing/writing-catalog-integrity.test.mjs
 */

import assert from "node:assert/strict";
import { WRITING_CATALOG_ENTRIES } from "../../data/writing/catalog-builders/index.js";
import { getReadyWritingCatalogStats } from "../../lib/writing/writing-ready-catalog.js";
import { PUBLIC_ACCESS_SLUGS } from "../../data/writing/catalog-builders/_builder-utils.js";

const counts = getReadyWritingCatalogStats();

assert.equal(counts.total, 270, "expected 270 writing catalog entries");
assert.equal(counts.public, 25, "expected 25 public writing entries");

assert.equal(new Set(WRITING_CATALOG_ENTRIES.map((e) => e.slug)).size, 270);
assert.equal(new Set(WRITING_CATALOG_ENTRIES.map((e) => e.catalogNumber)).size, 270);
const publicSlugs = WRITING_CATALOG_ENTRIES.filter((e) => e.publicAccess).map((e) => e.slug);
for (const slug of PUBLIC_ACCESS_SLUGS) {
  assert.ok(publicSlugs.includes(slug), `missing public slug ${slug}`);
}

const enSingles = WRITING_CATALOG_ENTRIES.filter(
  (e) =>
    e.writingCategory === "english_letters" &&
    e.catalogNumber >= "W-064" &&
    e.catalogNumber <= "W-141"
);
assert.equal(enSingles.length, 78, "expected 78 English single pages W-064–W-141");

console.log("writing-catalog-integrity.test.mjs OK");
