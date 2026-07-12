/**
 * Regression guard: topic/operation-name resolvers in master/curriculum pages must never
 * fall back to the raw internal (English) key when no Hebrew label is mapped. They must
 * fall back to a safe generic Hebrew label instead (e.g. "נושא" / "צורה").
 * Run: node --test tests/learning/no-raw-topic-key-fallback.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const FILES = [
  "pages/learning/hebrew-master.js",
  "pages/learning/moledet-geography-master.js",
  "pages/learning/history-master.js",
  "pages/learning/science-master.js",
  "pages/learning/geometry-curriculum.js",
  "pages/learning/curriculum.js",
];

// Raw-key fallback patterns like `TOPICS[op]?.name || op` / `?.name || topicKey` /
// `?.name || tk` / `?.name || k` must not exist — the fallback must be a Hebrew literal.
const RAW_FALLBACK_PATTERN = /\.name\s*\|\|\s*(op|topicKey|tk|k)\s*[;)}\]]/;
const RAW_SHAPE_FALLBACK_PATTERN = /GEOMETRY_SHAPE_NAMES\[s\]\s*\|\|\s*s\b/;

describe("topic/operation name resolvers never fall back to a raw internal key", () => {
  for (const file of FILES) {
    test(`${file} has no raw key fallback`, () => {
      const src = readFileSync(join(ROOT, file), "utf8");
      assert.doesNotMatch(src, RAW_FALLBACK_PATTERN);
      assert.doesNotMatch(src, RAW_SHAPE_FALLBACK_PATTERN);
    });
  }
});
