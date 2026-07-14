/**
 * Worksheet refresh questions — generator preview flow.
 * Run: node --test tests/worksheets/worksheet-refresh-questions.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateWorksheetForParent } from "../../lib/worksheets/worksheet-generate.server.js";
import { getReadyWorksheetBySlug } from "../../lib/worksheets/worksheet-ready-catalog.js";
import {
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("worksheet-refresh-questions", () => {
  test("new seed produces different worksheet questions with same public params", async () => {
    const base = {
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 6,
      mathPracticeFormat: "horizontal_add_sub",
    };
    const a = await generateWorksheetForParent({ ...base, seed: 1001 });
    const b = await generateWorksheetForParent({ ...base, seed: 2002 });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(a.generation.levelKey, "regular");
    assert.equal(b.generation.levelKey, "regular");
    assert.equal(a.generation.topicKey, "addition");
    assert.equal(b.generation.topicKey, "addition");
    assert.notEqual(
      a.worksheetPayload.questions.map((q) => q.stemHe).join("|"),
      b.worksheetPayload.questions.map((q) => q.stemHe).join("|")
    );
  });

  test("refreshed worksheet has no answer or metadata leaks", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g2",
      topicKey: "multiplication",
      levelKey: "regular",
      count: 8,
      seed: 90909,
      mathPracticeFormat: "basic_multiplication",
    });
    assert.equal(result.ok, true);
    assert.equal(auditWorksheetPayloadForAnswerLeaks(result.worksheetPayload).pass, true);
    assert.equal(auditWorksheetPayloadForMetadataLeaks(result.worksheetPayload).pass, true);
    assert.equal(result.worksheetPayload.meta.levelHe, "רגיל");
  });

  test("ready catalog entry keeps fixed seed behavior", async () => {
    const entry = getReadyWorksheetBySlug("math-g1-addition-horizontal-regular");
    assert.ok(entry);
    const a = await generateWorksheetForParent({
      subjectId: entry.subjectId,
      gradeKey: entry.gradeKey,
      topicKey: entry.topicKey,
      levelKey: entry.levelKey,
      count: entry.count,
      seed: entry.seed,
      mathPracticeFormat: entry.mathPracticeFormat,
    });
    const b = await generateWorksheetForParent({
      subjectId: entry.subjectId,
      gradeKey: entry.gradeKey,
      topicKey: entry.topicKey,
      levelKey: entry.levelKey,
      count: entry.count,
      seed: entry.seed,
      mathPracticeFormat: entry.mathPracticeFormat,
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.deepEqual(
      a.worksheetPayload.questions.map((q) => q.stemHe),
      b.worksheetPayload.questions.map((q) => q.stemHe)
    );
  });

  test("preview route exposes refresh only for create source", () => {
    const previewSrc = readFileSync(
      join(ROOT, "pages/parent/worksheets/preview.js"),
      "utf8"
    );
    const actionsSrc = readFileSync(
      join(ROOT, "components/worksheets/WorksheetPreviewActions.jsx"),
      "utf8"
    );
    const sessionSrc = readFileSync(
      join(ROOT, "lib/worksheets/worksheet-preview-session.client.js"),
      "utf8"
    );

    assert.match(previewSrc, /source === "create"/);
    assert.match(previewSrc, /clearWorksheetAnswerKeySession/);
    assert.match(previewSrc, /expectedWorksheetFingerprint/);
    assert.match(previewSrc, /refreshQuestions/);
    assert.match(actionsSrc, /onRefresh/);
    assert.match(sessionSrc, /clearWorksheetAnswerKeySession/);
  });

  test("answer key remains separate payload kind", async () => {
    const result = await generateWorksheetForParent({
      subjectId: "math",
      gradeKey: "g1",
      topicKey: "addition",
      levelKey: "regular",
      count: 4,
      seed: 77,
      mathPracticeFormat: "horizontal_add_sub",
    });
    assert.equal(result.ok, true);
    assert.equal(result.worksheetPayload.payloadKind, "worksheet");
    assert.ok(!("answers" in result.worksheetPayload));
  });
});
