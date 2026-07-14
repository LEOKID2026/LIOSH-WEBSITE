/**
 * Answer key fingerprint — must match current worksheet only.
 * Run: node --test tests/worksheets/worksheet-answer-key-fingerprint.test.mjs
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
  buildWorksheetSessionFingerprint,
  validateStoredAnswerKeyForWorksheet,
  worksheetFingerprintsMatch,
} from "../../lib/worksheets/worksheet-fingerprint.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const BASE = {
  subjectId: "math",
  gradeKey: "g3",
  topicKey: "addition",
  levelKey: "regular",
  count: 6,
  seed: 42001,
  mathPracticeFormat: "horizontal_add_sub",
};

describe("worksheet-answer-key-fingerprint", () => {
  test("answer key fingerprint matches current worksheet", async () => {
    const ws = await generateWorksheetForParent({ ...BASE, preferMcq: false });
    const ak = await generateAnswerKeyForParent({ ...BASE, preferMcq: false });
    assert.equal(ws.ok, true);
    assert.equal(ak.ok, true);

    const fp = buildWorksheetSessionFingerprint(ws.worksheetPayload, ws.generation);
    assert.ok(ak.answerKeyPayload.worksheetFingerprint);
    assert.ok(
      worksheetFingerprintsMatch(fp, ak.answerKeyPayload.worksheetFingerprint)
    );
    assert.equal(
      validateStoredAnswerKeyForWorksheet(
        ws.worksheetPayload,
        ws.generation,
        ak.answerKeyPayload
      ).ok,
      true
    );
  });

  test("answer count equals question count and order matches", async () => {
    const ws = await generateWorksheetForParent({ ...BASE, preferMcq: true });
    const ak = await generateAnswerKeyForParent({ ...BASE, preferMcq: true });
    assert.equal(ws.ok, true);
    assert.equal(ak.ok, true);
    assert.equal(
      ws.worksheetPayload.questions.length,
      ak.answerKeyPayload.answers.length
    );
    for (let i = 0; i < ws.worksheetPayload.questions.length; i += 1) {
      assert.equal(
        ws.worksheetPayload.questions[i].displayIndex,
        ak.answerKeyPayload.answers[i].displayIndex
      );
    }
  });

  test("stale answer key is rejected when seed changes", async () => {
    const ws = await generateWorksheetForParent({ ...BASE, seed: 111 });
    const ak = await generateAnswerKeyForParent({ ...BASE, seed: 222 });
    assert.equal(ws.ok, true);
    assert.equal(ak.ok, true);

    const validation = validateStoredAnswerKeyForWorksheet(
      ws.worksheetPayload,
      ws.generation,
      ak.answerKeyPayload
    );
    assert.equal(validation.ok, false);
    assert.equal(validation.reason, "fingerprint_mismatch");
  });

  test("preferMcq change produces different fingerprint and mismatched stored key", async () => {
    const openWs = await generateWorksheetForParent({ ...BASE, preferMcq: false });
    const mcqAk = await generateAnswerKeyForParent({ ...BASE, preferMcq: true });
    assert.equal(openWs.ok, true);
    assert.equal(mcqAk.ok, true);

    const validation = validateStoredAnswerKeyForWorksheet(
      openWs.worksheetPayload,
      openWs.generation,
      mcqAk.answerKeyPayload
    );
    assert.equal(validation.ok, false);
  });

  test("generated MCQ answers match current questions", async () => {
    const ws = await generateWorksheetForParent({ ...BASE, preferMcq: true });
    const ak = await generateAnswerKeyForParent({ ...BASE, preferMcq: true });
    assert.equal(ws.ok, true);
    assert.equal(ak.ok, true);
    assert.ok(ws.worksheetPayload.questions.every((q) => q.questionType === "mcq"));
    assert.ok(
      validateStoredAnswerKeyForWorksheet(
        ws.worksheetPayload,
        ws.generation,
        ak.answerKeyPayload
      ).ok
    );
  });

  test("open questions answers match current questions", async () => {
    const ws = await generateWorksheetForParent({ ...BASE, preferMcq: false });
    const ak = await generateAnswerKeyForParent({ ...BASE, preferMcq: false });
    assert.equal(ws.ok, true);
    assert.equal(ak.ok, true);
    assert.ok(ws.worksheetPayload.questions.every((q) => q.questionType !== "mcq"));
    assert.ok(
      validateStoredAnswerKeyForWorksheet(
        ws.worksheetPayload,
        ws.generation,
        ak.answerKeyPayload
      ).ok
    );
  });

  test("server rejects answer key when expected fingerprint mismatches", async () => {
    const ws = await generateWorksheetForParent({ ...BASE, seed: 555 });
    assert.equal(ws.ok, true);
    const wrongFp = buildWorksheetSessionFingerprint(ws.worksheetPayload, {
      ...ws.generation,
      seed: 999,
    });
    const ak = await generateAnswerKeyForParent({
      ...BASE,
      seed: 555,
      expectedWorksheetFingerprint: wrongFp,
    });
    assert.equal(ak.ok, false);
    assert.equal(ak.code, "worksheet_fingerprint_mismatch");
  });

  test("public answer key includes worksheet fingerprint", async () => {
    const ak = await generateAnswerKeyForParent({ ...BASE });
    assert.equal(ak.ok, true);
    const pub = publicAnswerKeyPayload(ak.answerKeyPayload);
    assert.ok(pub.worksheetFingerprint);
    assert.ok(pub.worksheetFingerprint.content?.questionKeys?.length);
  });

  test("preview clears answer key on new worksheet and refresh", () => {
    const hubSrc = readFileSync(
      join(ROOT, "components/worksheets/ParentWorksheetsHub.jsx"),
      "utf8"
    );
    const previewSrc = readFileSync(
      join(ROOT, "pages/parent/worksheets/preview.js"),
      "utf8"
    );
    const answersSrc = readFileSync(
      join(ROOT, "pages/parent/worksheets/preview/answers.js"),
      "utf8"
    );

    assert.match(hubSrc, /clearWorksheetAnswerKeySession/);
    assert.match(previewSrc, /clearWorksheetAnswerKeySession/);
    assert.match(previewSrc, /expectedWorksheetFingerprint/);
    assert.match(answersSrc, /validateStoredAnswerKeyForWorksheet/);
    assert.match(answersSrc, /answerKeyStale/);
  });

  test("answer-key API passes mathPracticeFormat and preferMcq", () => {
    const apiSrc = readFileSync(
      join(ROOT, "pages/api/parent/worksheets/answer-key.js"),
      "utf8"
    );
    assert.match(apiSrc, /mathPracticeFormat/);
    assert.match(apiSrc, /preferMcq/);
    assert.match(apiSrc, /expectedWorksheetFingerprint/);
  });
});
