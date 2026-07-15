/**
 * Worksheet preview must not contain answers in payload or HTML — Wave E.
 * Run: node --test tests/worksheets/worksheet-preview-no-answers.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateWorksheetForParent,
  publicWorksheetPayload,
} from "../../lib/worksheets/worksheet-generate.server.js";
import {
  auditWorksheetPayloadForAnswerLeaks,
  worksheetPayloadToPreviewHtml,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { WORKSHEET_FORBIDDEN_ANSWER_FIELDS } from "../../lib/worksheets/worksheet-question-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const SUBJECTS = [
  { subjectId: "math", gradeKey: "g2", topicKey: "addition", levelKey: "regular", seed: 90001 },
  {
    subjectId: "geometry",
    gradeKey: "g3",
    topicKey: "area",
    levelKey: "regular",
    seed: 90002,
  },
  { subjectId: "hebrew", gradeKey: "g2", topicKey: "reading", levelKey: "regular", seed: 90003 },
  {
    subjectId: "english",
    gradeKey: "g2",
    topicKey: "vocabulary",
    levelKey: "regular",
    seed: 90004,
  },
];

describe("worksheet-preview-no-answers", () => {
  for (const cfg of SUBJECTS) {
    test(`generate API payload for ${cfg.subjectId} has no answer leaks`, async () => {
      const result = await generateWorksheetForParent({ ...cfg, count: 5 });
      assert.equal(result.ok, true, result.ok ? "" : result.code);
      const pub = publicWorksheetPayload(result.worksheetPayload);
      const json = JSON.stringify(pub);
      for (const field of WORKSHEET_FORBIDDEN_ANSWER_FIELDS) {
        assert.equal(json.includes(`"${field}"`), false, `forbidden field ${field}`);
      }
      const audit = auditWorksheetPayloadForAnswerLeaks(result.worksheetPayload);
      assert.equal(audit.pass, true, audit.hits.join(", "));
      const html = worksheetPayloadToPreviewHtml(result.worksheetPayload);
      assert.equal(html.includes("answer-key-root"), false);
      assert.equal(html.includes("correctAnswer"), false);
    });
  }

  test("publicWorksheetPayload strips internal meta keys", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g2",
      topicKey: "addition",
      levelKey: "regular",
      count: 4,
      seed: 90005,
    });
    assert.equal(result.ok, true);
    const pub = publicWorksheetPayload(result.worksheetPayload);
    assert.equal(pub.meta.gradeKey, undefined);
    assert.equal(pub.meta.topicKey, undefined);
    assert.equal(pub.meta.levelKey, undefined);
  });

  test("preview page stores worksheet only - answer key fetched on separate route", () => {
    const previewSrc = readFileSync(
      join(ROOT, "pages/parent/worksheets/preview.js"),
      "utf8"
    );
    const previewPageSrc = readFileSync(
      join(ROOT, "components/worksheets/WorksheetPreviewPage.jsx"),
      "utf8"
    );
    assert.doesNotMatch(previewPageSrc, /correctAnswer/);
    assert.doesNotMatch(previewPageSrc, /answerKeyPayload/);
    assert.match(previewSrc, /loadWorksheetPreviewSession/);
    assert.match(previewSrc, /\/api\/parent\/worksheets\/answer-key/);
    assert.match(previewSrc, /preview\/answers/);
  });
});
