/**
 * Public worksheet payloads — no student/parent PII.
 * Run: node --test tests/worksheets/public-worksheets-no-pii.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validatePublicDemoGenerationParams } from "../../lib/worksheets/worksheet-public-demo-allowlist.server.js";
import {
  generateWorksheetForParent,
  generateAnswerKeyForParent,
  publicWorksheetPayload,
  publicAnswerKeyPayload,
} from "../../lib/worksheets/worksheet-generate.server.js";
import { READY_WORKSHEET_CATALOG } from "../../lib/worksheets/worksheet-ready-catalog.js";

const PII_PATTERNS = [
  /studentId/i,
  /parentId/i,
  /access_token/i,
  /full_name/i,
  /email/i,
  /recommendation/i,
];

function assertNoPii(json) {
  for (const pattern of PII_PATTERNS) {
    assert.doesNotMatch(json, pattern, `found ${pattern}`);
  }
}

describe("public-worksheets-no-pii", () => {
  test("public worksheet payload strips internal keys", async () => {
    const validated = validatePublicDemoGenerationParams({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      seed: 86001,
    });
    const gen = await generateWorksheetForParent(validated.normalized);
    assert.equal(gen.ok, true);
    const pub = publicWorksheetPayload(gen.worksheetPayload);
    const json = JSON.stringify(pub);
    assertNoPii(json);
    assert.equal(pub.meta.gradeKey, undefined);
    assert.equal(pub.meta.topicKey, undefined);
  });

  test("public answer key payload has no PII", async () => {
    const entry = READY_WORKSHEET_CATALOG[0];
    const gen = await generateWorksheetForParent({
      subjectId: entry.subjectId,
      gradeKey: entry.gradeKey,
      topicKey: entry.topicKey,
      levelKey: entry.levelKey,
      count: entry.count,
      seed: entry.seed,
      mathPracticeFormat: entry.mathPracticeFormat,
    });
    assert.equal(gen.ok, true);
    const ak = await generateAnswerKeyForParent({
      subjectId: entry.subjectId,
      gradeKey: entry.gradeKey,
      topicKey: entry.topicKey,
      levelKey: entry.levelKey,
      count: entry.count,
      seed: entry.seed,
      includeAnswers: true,
      mathPracticeFormat: entry.mathPracticeFormat,
    });
    assert.equal(ak.ok, true);
    const pub = publicAnswerKeyPayload(ak.answerKeyPayload);
    assertNoPii(JSON.stringify(pub));
  });
});
