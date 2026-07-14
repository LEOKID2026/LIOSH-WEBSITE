/**
 * Answer key route — separate payload only when explicitly requested — Wave E.
 * Run: node --test tests/worksheets/worksheet-answer-key-route.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateWorksheetForParent,
  generateAnswerKeyForParent,
  publicAnswerKeyPayload,
} from "../../lib/worksheets/worksheet-generate.server.js";
import {
  ANSWER_KEY_PAYLOAD_KIND,
  WORKSHEET_PAYLOAD_KIND,
} from "../../lib/worksheets/worksheet-question-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const GEN_PARAMS = {
  subjectId: "math",
  gradeKey: "g3",
  topicKey: "addition",
  levelKey: "regular",
  count: 6,
  seed: 91001,
};

describe("worksheet-answer-key-route", () => {
  test("worksheet and answer key payloads use different kinds", async () => {
    const ws = await generateWorksheetForParent(GEN_PARAMS);
    const ak = await generateAnswerKeyForParent(GEN_PARAMS);
    assert.equal(ws.ok, true);
    assert.equal(ak.ok, true);
    assert.equal(ws.worksheetPayload.payloadKind, WORKSHEET_PAYLOAD_KIND);
    assert.equal(ak.answerKeyPayload.payloadKind, ANSWER_KEY_PAYLOAD_KIND);
    assert.ok(ak.answerKeyPayload.answers.length > 0);
    assert.equal(ws.worksheetPayload.questions.length, ak.answerKeyPayload.answers.length);
    assert.ok(ak.answerKeyPayload.worksheetFingerprint);
  });

  test("answer-key API handler requires includeAnswers flag", () => {
    const src = readFileSync(
      join(ROOT, "pages/api/parent/worksheets/answer-key.js"),
      "utf8"
    );
    assert.match(src, /includeAnswers !== true/);
    assert.match(src, /generateAnswerKeyForParent/);
    assert.match(src, /publicAnswerKeyPayload/);
  });

  test("answers route is separate from preview route", () => {
    const answersPage = readFileSync(
      join(ROOT, "pages/parent/worksheets/preview/answers.js"),
      "utf8"
    );
    assert.match(answersPage, /loadWorksheetAnswerKeySession/);
    assert.match(answersPage, /includeAnswers/);
    assert.doesNotMatch(
      readFileSync(join(ROOT, "components/worksheets/WorksheetPreviewPage.jsx"), "utf8"),
      /AnswerKeyEntry/
    );
  });

  test("public answer key payload has answers array only on answer route", async () => {
    const ak = await generateAnswerKeyForParent(GEN_PARAMS);
    assert.equal(ak.ok, true);
    const pub = publicAnswerKeyPayload(ak.answerKeyPayload);
    assert.ok(Array.isArray(pub.answers));
    assert.equal(pub.meta.gradeKey, undefined);
    assert.ok(pub.worksheetFingerprint);
    const ws = await generateWorksheetForParent(GEN_PARAMS);
    assert.equal(ws.ok, true);
    assert.equal("answers" in ws.worksheetPayload, false);
  });
});
