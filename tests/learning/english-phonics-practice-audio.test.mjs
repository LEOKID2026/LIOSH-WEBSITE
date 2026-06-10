/**
 * English G1/G2 phonics practice-question audio wiring.
 * Run: node --test tests/learning/english-phonics-practice-audio.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRuntimeEligiblePhonicsPool } from "../../data/english-questions/index.js";
import { generateQuestion } from "../../utils/english-question-generator.js";
import { validateAudioStemV1 } from "../../utils/audio-task-contract.js";
import {
  attachEnglishPhonicsPracticeAudio,
  buildPhonicsPracticeTtsSegments,
  speakableUsEnglishToken,
} from "../../utils/english-phonics-practice-audio.js";

describe("english phonics practice audio", () => {
  it("US letter-name policy uses zee, aitch, and see for C", () => {
    assert.equal(speakableUsEnglishToken("Z"), "zee");
    assert.equal(speakableUsEnglishToken("H"), "aitch");
    assert.equal(speakableUsEnglishToken("C"), "see");
    assert.equal(speakableUsEnglishToken("c", "letter_sound"), "kuh, as in cat");
  });

  it("runtime G1/G2 phonics questions attach valid listen_and_choose stems", () => {
    let withAudio = 0;
    for (const gradeKey of ["g1", "g2"]) {
      const pool = getRuntimeEligiblePhonicsPool(gradeKey);
      assert.ok(pool.length > 0, gradeKey);
      for (const row of pool.slice(0, 8)) {
        const pageId = row.bookPageRef.split(":")[2];
        const q = generateQuestion(1, "phonics", gradeKey, null, "easy", {
          forceKind: pageId,
          forceSkillId: `english:phonics:${gradeKey}:${pageId}`,
        });
        assert.equal(q.topic, "phonics");
        assert.equal(q.params?.requiresAudio, false);
        assert.ok(q.params?.audioStem, `${row.id} missing audioStem`);
        assert.equal(validateAudioStemV1(q.params.audioStem), true);
        assert.ok(Array.isArray(q.params.audioStem.tts_segments));
        assert.ok(q.params.audioStem.tts_segments.length >= 2);
        withAudio += 1;
      }
    }
    assert.ok(withAudio >= 10);
  });

  it("audio segments include Hebrew instruction, English target, and options", () => {
    const segments = buildPhonicsPracticeTtsSegments({
      instruction: "בחר/י את האות הגדולה שמתאימה לאות הקטנה שמוצגת",
      stimulus: "a",
      itemType: "choose_matching_letter",
      answers: ["A", "H", "N", "R"],
    });
    assert.match(segments[0].text, /בחרו/);
    assert.equal(segments[0].locale, "he-IL");
    assert.match(segments[1].text, /ay/i);
    assert.equal(segments[1].locale, "en-US");
    const joined = segments.map((s) => s.text).join(" ");
    assert.match(joined, /אפשרויות/);
    assert.match(joined, /bee|aitch|ar/i);
  });

  it("attach helper is idempotent-safe and skips non-phonics", () => {
    const q = {
      topic: "vocabulary",
      qType: "choice",
      answers: ["a", "b"],
      correctAnswer: "a",
      params: {},
    };
    assert.equal(attachEnglishPhonicsPracticeAudio(q, { gradeKey: "g1" }), false);
    assert.equal(q.params.audioStem, undefined);
  });
});
