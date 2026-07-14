/**
 * Parent worksheet levels — רגיל/מתקדם only in public UI, HTML, and API payloads.
 * Run: node --test tests/worksheets/worksheet-public-level-labels.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORKSHEET_LEVEL_OPTIONS,
  findForbiddenPublicLevelLabels,
  worksheetPublicLevelLabelHe,
} from "../../lib/worksheets/worksheet-level-display.js";
import {
  mapPublicLevelToInternal,
  validateWorksheetPublicGenerationParams,
} from "../../lib/worksheets/worksheet-level-map.server.js";
import {
  generateWorksheetForParent,
  publicWorksheetPayload,
} from "../../lib/worksheets/worksheet-generate.server.js";
import { worksheetPayloadToPreviewHtml } from "../../lib/worksheets/worksheet-payload-build.server.js";
import { READY_WORKSHEET_CATALOG } from "../../lib/worksheets/worksheet-ready-catalog.js";
import { buildWorksheetRecommendationsFromReport } from "../../lib/worksheets/worksheet-recommendation-engine.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const UI_FILES = [
  "components/worksheets/CreateWorksheetTab.jsx",
  "components/worksheets/ReadyWorksheetsTab.jsx",
  "components/worksheets/RecommendationsTab.jsx",
  "components/worksheets/WorksheetPreviewPage.jsx",
  "components/worksheets/ParentWorksheetsHub.jsx",
  "lib/worksheets/worksheet-ui.he.js",
];

describe("worksheet-public-level-labels", () => {
  test("level options are רגיל and מתקדם only", () => {
    assert.deepEqual(
      WORKSHEET_LEVEL_OPTIONS.map((o) => o.labelHe),
      ["רגיל", "מתקדם"]
    );
    assert.deepEqual(
      WORKSHEET_LEVEL_OPTIONS.map((o) => o.key),
      ["regular", "advanced"]
    );
  });

  test("internal mapping: regular→medium, advanced→hard", () => {
    assert.equal(mapPublicLevelToInternal("regular"), "medium");
    assert.equal(mapPublicLevelToInternal("advanced"), "hard");
  });

  test("public generation rejects legacy easy/medium/hard keys", () => {
    for (const legacy of ["easy", "medium", "hard"]) {
      const res = validateWorksheetPublicGenerationParams({
        subjectId: "math",
        gradeKey: "g2",
        topicKey: "addition",
        levelKey: legacy,
        count: 5,
      });
      assert.equal(res.ok, false, legacy);
      assert.equal(res.error, "INVALID_LEVEL");
    }
  });

  test("generated public payload and HTML have no forbidden level labels", async () => {
    for (const levelKey of ["regular", "advanced"]) {
      const result = await generateWorksheetForParent({
        subjectId: "math",
        gradeKey: "g3",
        topicKey: "addition",
        levelKey,
        count: 5,
        seed: 92000 + (levelKey === "advanced" ? 1 : 0),
      });
      assert.equal(result.ok, true, levelKey);
      const pub = publicWorksheetPayload(result.worksheetPayload);
      const json = JSON.stringify(pub);
      const html = worksheetPayloadToPreviewHtml(result.worksheetPayload);
      assert.equal(findForbiddenPublicLevelLabels(json).length, 0);
      assert.equal(findForbiddenPublicLevelLabels(html).length, 0);
      assert.equal(pub.meta.levelHe, worksheetPublicLevelLabelHe(levelKey));
    }
  });

  test("ready catalog uses regular/advanced only", () => {
    for (const entry of READY_WORKSHEET_CATALOG) {
      assert.ok(entry.levelKey === "regular" || entry.levelKey === "advanced", entry.slug);
      assert.equal(findForbiddenPublicLevelLabels(entry.slug).length, 0);
    }
  });

  test("recommendations expose רגיל/מתקדם only", () => {
    const recs = buildWorksheetRecommendationsFromReport(
      {
        summary: { mathQuestions: 10 },
        subjects: {
          math: {
            topics: {
              addition: { answers: 10, correct: 4 },
            },
          },
        },
      },
      "g3"
    );
    assert.ok(recs.length >= 1);
    for (const rec of recs) {
      assert.ok(rec.levelKey === "regular" || rec.levelKey === "advanced");
      assert.equal(findForbiddenPublicLevelLabels(rec.levelHe).length, 0);
      assert.equal(findForbiddenPublicLevelLabels(JSON.stringify(rec)).length, 0);
    }
  });

  test("worksheet hub UI source has no קל/בינוני/קשה labels", () => {
    for (const rel of UI_FILES) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.equal(findForbiddenPublicLevelLabels(src).length, 0, rel);
    }
  });
});
