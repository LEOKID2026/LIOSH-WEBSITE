/**
 * Public ready worksheets — original entry.count unchanged.
 * Run: node --test tests/worksheets/public-worksheets-ready-unchanged.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { READY_WORKSHEET_CATALOG } from "../../lib/worksheets/worksheet-ready-catalog.js";
import { buildReadyWorksheetCatalogItems } from "../../lib/worksheets/worksheet-public-catalog.server.js";
import { generateWorksheetForParent } from "../../lib/worksheets/worksheet-generate.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("public-worksheets-ready-unchanged", () => {
  test("catalog has exactly 35 entries", () => {
    assert.equal(READY_WORKSHEET_CATALOG.length, 35);
    assert.equal(buildReadyWorksheetCatalogItems().length, 35);
  });

  test("catalog items preserve entry.count from source", () => {
    for (const entry of READY_WORKSHEET_CATALOG) {
      const item = buildReadyWorksheetCatalogItems().find((i) => i.slug === entry.slug);
      assert.ok(item, entry.slug);
      assert.equal(item.count, entry.count, entry.slug);
    }
  });

  test("every ready entry generates with original count", async () => {
    for (const entry of READY_WORKSHEET_CATALOG) {
      const gen = await generateWorksheetForParent({
        subjectId: entry.subjectId,
        gradeKey: entry.gradeKey,
        topicKey: entry.topicKey,
        levelKey: entry.levelKey,
        count: entry.count,
        seed: entry.seed,
        inkSave: entry.inkSave,
        mathPracticeFormat: entry.mathPracticeFormat,
      });
      assert.equal(gen.ok, true, `${entry.slug}: ${gen.ok ? "" : gen.code}`);
      assert.equal(
        gen.worksheetPayload.questions.length,
        entry.count,
        `${entry.slug} expected ${entry.count}`
      );
    }
  });

  test("parent API files unchanged - no public demo count in parent generate", () => {
    const src = readFileSync(
      join(ROOT, "pages/api/parent/worksheets/generate.js"),
      "utf8"
    );
    assert.doesNotMatch(src, /validatePublicDemoGenerationParams/);
    assert.doesNotMatch(src, /PUBLIC_DEMO_COUNT/);
  });
});
