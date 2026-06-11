/**
 * Hebrew + English G1/G2 practice runtime quality guards.
 * Run: node --test tests/learning/lower-grade-practice-runtime-quality.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  countRuntimeEligiblePhonicsItems,
  getRuntimeEligiblePhonicsPool,
} from "../../data/english-questions/index.js";
import { generateQuestion as generateEnglishQuestion } from "../../utils/english-question-generator.js";
import { generateQuestion as generateHebrewQuestion } from "../../utils/hebrew-question-generator.js";
import { attachHebrewAudioToQuestion } from "../../utils/hebrew-audio-attach.js";
import { sanitizeQuestionForStudentDisplay } from "../../utils/student-question-stem-sanitizer.js";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display.js";
import {
  collectChildVisibleSurfaces,
  hasInternalChildFacingLabel,
  hasMcqCopyAnswerLeak,
  hasValidLowerGradePracticeAudio,
  isEnglishPhonicsCopyLeakRow,
  isG1G2RuntimePracticeEligible,
  isHebrewReadAloudCopyLeakRaw,
  sanitizeLowerGradeChildFacingText,
} from "../../utils/lower-grade-practice-runtime-quality.js";

const HEBREW_TOPICS = ["reading", "comprehension", "grammar", "vocabulary"];
const INTERNAL_FORBIDDEN = [/משפט\s+\d+/u, /בחנה.{0,8}פונולוגית/u];
const BROKEN_SLASH_PROMPT = /\/\s+'\s|קרא\s+\/\s+'/u;

function visibleTextFromQuestion(q) {
  const parts = resolveStudentQuestionDisplayParts({
    question: q.question,
    questionLabel: q.questionLabel,
    exerciseText: q.exerciseText,
  });
  return [parts.leadText, parts.bodyText, q.question, q.exerciseText]
    .filter((s) => typeof s === "string" && s.trim())
    .join("\n");
}

function buildHebrewRuntimeQuestion(gradeKey, topic, seq) {
  const q = generateHebrewQuestion({ name: "קל" }, topic, gradeKey, null, {
    excludeFingerprints: new Set(),
  });
  attachHebrewAudioToQuestion(q, {
    gradeKey,
    topic: q.topic || topic,
    sequenceIndex: seq,
  });
  sanitizeLowerGradeChildFacingText(q);
  return sanitizeQuestionForStudentDisplay(q);
}

function buildEnglishPhonicsRuntime(gradeKey, pageId, seq = 1) {
  return generateEnglishQuestion(1, "phonics", gradeKey, null, "easy", {
    forceKind: pageId,
    forceSkillId: `english:phonics:${gradeKey}:${pageId}`,
    _runtimeQualityRetry: seq,
  });
}

describe("lower-grade practice runtime quality", () => {
  it("filters English early_word_reading copy-leak rows from runtime pool", () => {
    const counts = countRuntimeEligiblePhonicsItems();
    assert.equal(counts.g1, 15);
    assert.equal(counts.g2, 9);
    assert.equal(counts.total, 24);

    for (const gradeKey of ["g1", "g2"]) {
      const pool = getRuntimeEligiblePhonicsPool(gradeKey);
      for (const row of pool) {
        assert.equal(
          isEnglishPhonicsCopyLeakRow(row),
          false,
          `${row.id} must not copy-leak`
        );
      }
    }
  });

  it("Hebrew G1/G2 runtime samples have no copy-leak, internal labels, or missing audio", () => {
    for (const gradeKey of ["g1", "g2"]) {
      let built = 0;
      for (let i = 0; i < 48; i += 1) {
        const topic = HEBREW_TOPICS[i % HEBREW_TOPICS.length];
        const q = buildHebrewRuntimeQuestion(gradeKey, topic, i + 1);
        if (!isG1G2RuntimePracticeEligible(q, { gradeKey, subject: "hebrew" })) {
          continue;
        }
        built += 1;
        assert.equal(hasMcqCopyAnswerLeak(q), false, `${gradeKey}:${topic} leak`);
        const visible = collectChildVisibleSurfaces(q).join("\n");
        for (const re of INTERNAL_FORBIDDEN) {
          assert.equal(re.test(visible), false, `${gradeKey} internal label ${re}`);
        }
        assert.equal(hasValidLowerGradePracticeAudio(q), true, `${gradeKey} audio`);
      }
      assert.ok(built >= 20, `${gradeKey} built ${built} eligible samples`);
    }
  });

  it("English G1/G2 phonics runtime samples pass quality guards", () => {
    const pagesByGrade = {
      g1: ["letters_upper", "letters_lower", "letters_match", "letter_names"],
      g2: ["letters_review", "letters_order", "sound_letter_match", "phonics_sounds_review"],
    };

    for (const gradeKey of ["g1", "g2"]) {
      let built = 0;
      const positions = new Set();
      for (let i = 0; i < 48; i += 1) {
        const pageId = pagesByGrade[gradeKey][i % pagesByGrade[gradeKey].length];
        if (getRuntimeEligiblePhonicsPool(gradeKey, pageId).length === 0) continue;

        const q = buildEnglishPhonicsRuntime(gradeKey, pageId, i);
        assert.equal(q.topic, "phonics");
        assert.equal(
          isG1G2RuntimePracticeEligible(q, { gradeKey, subject: "english" }),
          true
        );
        assert.equal(hasMcqCopyAnswerLeak(q), false);
        const visible = visibleTextFromQuestion(q);
        for (const re of INTERNAL_FORBIDDEN) {
          assert.equal(re.test(visible), false);
        }
        assert.equal(BROKEN_SLASH_PROMPT.test(visible), false);
        assert.equal(hasValidLowerGradePracticeAudio(q), true);
        assert.ok(q.answers?.length >= 4);
        assert.ok(visible.trim().length > 0, "visual text remains");
        positions.add(q.answers.indexOf(q.correctAnswer));
        built += 1;
      }
      assert.ok(built >= 20, `${gradeKey} built ${built}`);
      assert.ok(positions.size >= 2, `${gradeKey} answer positions vary`);
    }
  });

  it("hasInternalChildFacingLabel catches generator suffixes", () => {
    assert.equal(hasInternalChildFacingLabel("קראו · משפט 21"), true);
    assert.equal(hasInternalChildFacingLabel("האזינו ובחרו לפי ההבחנה הפונולוגית"), true);
    assert.equal(hasInternalChildFacingLabel("האזינו ובחרו את התשובה הנכונה"), false);
  });

  it("rejects Hebrew G2 g2:q8 read_sentence copy-leak display shape", () => {
    const sentence = "הילד קורא ספר בכיתה";
    const prompt = `האזינו ובחרו את התשובה הנכונה.\n\nקרא את המשפט: '${sentence}'`;
    const leaky = {
      question: prompt,
      questionLabel: "האזינו ובחרו",
      exerciseText: prompt,
      answers: [
        sentence,
        "הילד קרא ספר בכיתה",
        "הילד קורא ספר בכתה",
        "הילד כורא ספר בכיתה",
      ],
      correctAnswer: sentence,
      correctIndex: 0,
      params: {
        patternFamily: "reading_passage_style",
        subtype: "sentence_in_context",
        subtopicId: "g2.short_sentence",
      },
    };

    attachHebrewAudioToQuestion(leaky, {
      gradeKey: "g2",
      topic: "reading",
      sequenceIndex: 8,
    });
    sanitizeLowerGradeChildFacingText(leaky);
    const display = sanitizeQuestionForStudentDisplay(leaky);

    assert.equal(isHebrewReadAloudCopyLeakRaw({
      question: `קרא את המשפט: '${sentence}'`,
      answers: leaky.answers,
      correct: 0,
    }), true);
    assert.equal(hasMcqCopyAnswerLeak(display), true);
    assert.equal(
      isG1G2RuntimePracticeEligible(display, { gradeKey: "g2", subject: "hebrew" }),
      false
    );
  });

  it("Hebrew G2 reading pool filters read-aloud copy-leak rows before runtime", () => {
    let leaks = 0;
    let eligible = 0;
    for (let i = 0; i < 120; i += 1) {
      const q = buildHebrewRuntimeQuestion("g2", "reading", i + 1);
      if (hasMcqCopyAnswerLeak(q)) leaks += 1;
      if (isG1G2RuntimePracticeEligible(q, { gradeKey: "g2", subject: "hebrew" })) {
        eligible += 1;
        assert.equal(hasMcqCopyAnswerLeak(q), false, `g2 sample ${i} leaked`);
      }
    }
    assert.equal(leaks, 0);
    assert.ok(eligible >= 40, `g2 eligible after filter: ${eligible}`);
  });
});
