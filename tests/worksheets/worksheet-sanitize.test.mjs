/**
 * Worksheet sanitize tests — Wave A.
 * Run: node --test tests/worksheets/worksheet-sanitize.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  toPrintableWorksheetQuestion,
  toAnswerKeyEntry,
  scanPrintableQuestionForForbiddenKeys,
  scanWorksheetTextForMetadataLeaks,
  scanWorksheetStemForMetadataLeaks,
  INTERNAL_WORKSHEET_KEYS,
} from "../../lib/worksheets/worksheet-question-sanitize.server.js";

const RAW_WITH_INTERNAL = {
  id: "body_42",
  seedId: 991234,
  skillId: "math_add_g3",
  diagnosticSkillId: "diag_mul_frac",
  patternFamily: "vertical_carry",
  conceptTag: "fraction_compare",
  generatorKind: "math_v2",
  subSkill: "carry",
  params: { topicKey: "multiplication", gradeKey: "g3" },
  question: "כיתה ג׳ · נושא multiplication - כמה זה 3 + 4?",
  answers: ["6", "7", "8", "9"],
  correctIndex: 1,
  explanation: "3+4=7",
};

describe("worksheet-question-sanitize", () => {
  test("toPrintableWorksheetQuestion strips internal keys", () => {
    const q = toPrintableWorksheetQuestion(RAW_WITH_INTERNAL, {
      displayIndex: 1,
      subject: "math",
    });
    const scan = scanPrintableQuestionForForbiddenKeys(q);
    assert.equal(scan.pass, true, `forbidden keys: ${scan.hits.join(", ")}`);
    assert.ok(q.stemHe.length > 0);
    assert.equal(q.displayIndex, 1);
    assert.equal(q.subject, "math");
    assert.ok(Array.isArray(q.optionsHe));
    assert.equal(q.optionsHe?.length, 4);
    assert.equal("correctIndex" in q, false);
    assert.equal("skillId" in q, false);
    assert.equal("seedId" in q, false);
  });

  test("stem metadata patterns removed or absent from stemHe", () => {
    const q = toPrintableWorksheetQuestion(RAW_WITH_INTERNAL, {
      displayIndex: 1,
      subject: "math",
    });
    const leak = scanWorksheetStemForMetadataLeaks(q.stemHe);
    assert.equal(leak.pass, true, `stem leaks: ${leak.hits.join(", ")}`);
  });

  test("toAnswerKeyEntry is separate from printable question", () => {
    const printable = toPrintableWorksheetQuestion(RAW_WITH_INTERNAL, {
      displayIndex: 1,
      subject: "math",
    });
    const answer = toAnswerKeyEntry(RAW_WITH_INTERNAL, { displayIndex: 1 });
    assert.equal(answer.correctAnswerHe, "7");
    assert.equal(answer.explanationHe, "3+4=7");
    assert.equal("correctAnswerHe" in printable, false);
    assert.equal("explanationHe" in printable, false);
  });

  test("INTERNAL_WORKSHEET_KEYS includes parent report keys", () => {
    assert.ok(INTERNAL_WORKSHEET_KEYS.has("skillId"));
    assert.ok(INTERNAL_WORKSHEET_KEYS.has("diagnosticSkillId"));
    assert.ok(INTERNAL_WORKSHEET_KEYS.has("patternFamily"));
    assert.ok(INTERNAL_WORKSHEET_KEYS.has("seedId"));
  });

  test("blocked_audio question gets printability flag", () => {
    const q = toPrintableWorksheetQuestion(
      { question: "האזן", requiresAudio: true, answers: ["a", "b"] },
      { displayIndex: 1, subject: "english" }
    );
    assert.equal(q.printability, "blocked_audio");
  });
});
