/**
 * Enrich demo wrong-answer payloads so the real report / DE2 pipeline receives
 * the same misconception evidence shape as production answers (not generic procedural_error).
 */
import { classifyAnswerEvidence } from "../../learning/classifiers/index.js";
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";

/** @typedef {{ params: Record<string, unknown>, expectedAnswer: number|string, userAnswer: number|string, prompt: string, taxonomyIds?: string[], forceTag?: string }} DemoWrongScenario */

/** @type {Record<string, DemoWrongScenario>} */
const DEMO_MATH_WRONG_BY_TOPIC = Object.freeze({
  addition: {
    params: { kind: "add_three", a: 12, b: 8, c: 5 },
    expectedAnswer: 25,
    userAnswer: 20,
    prompt: "12 + 8 + 5 = ?",
    taxonomyIds: ["M-08"],
  },
  subtraction: {
    params: { kind: "sub_two", a: 34, b: 9 },
    expectedAnswer: 25,
    userAnswer: 43,
    prompt: "34 − 9 = ?",
    taxonomyIds: ["M-09"],
  },
  multiplication: {
    params: { kind: "mul", a: 7, b: 8 },
    expectedAnswer: 56,
    userAnswer: 54,
    prompt: "7 × 8 = ?",
    taxonomyIds: ["M-03"],
  },
  division: {
    params: { kind: "div", a: 48, b: 6 },
    expectedAnswer: 8,
    userAnswer: 288,
    prompt: "48 ÷ 6 = ?",
    taxonomyIds: ["M-10"],
    forceTag: "mul_instead_of_div",
  },
  fractions: {
    params: { kind: "frac_compare" },
    expectedAnswer: "2/5",
    userAnswer: "3/5",
    prompt: "איזה שבר גדול יותר?",
    taxonomyIds: ["M-04"],
    forceTag: "numerator_only_compare",
  },
  compare: {
    params: { kind: "compare", a: 15, b: 22 },
    expectedAnswer: 22,
    userAnswer: 15,
    prompt: "מה המספר הגדול יותר?",
    taxonomyIds: ["M-01"],
  },
  number_sense: {
    params: { kind: "place", a: 47 },
    expectedAnswer: 40,
    userAnswer: 47,
    prompt: "מה עשרות במספר 47?",
    taxonomyIds: ["M-01"],
  },
});

/**
 * @param {string} subject
 * @param {string} topic
 * @param {number} qIndex
 * @returns {DemoWrongScenario|null}
 */
function resolveDemoWrongScenario(subject, topic, qIndex) {
  if (subject === "math") {
    const base = DEMO_MATH_WRONG_BY_TOPIC[topic];
    if (!base) return null;
    const offset = Math.max(0, Math.floor(qIndex));
    if (topic === "addition" && base.params.kind === "add_three") {
      const a = 10 + offset;
      const b = 6 + (offset % 3);
      const c = 4 + (offset % 2);
      return {
        ...base,
        params: { kind: "add_three", a, b, c },
        expectedAnswer: a + b + c,
        userAnswer: a + b,
        prompt: `${a} + ${b} + ${c} = ?`,
      };
    }
    if (topic === "subtraction" && base.params.kind === "sub_two") {
      const a = 30 + offset * 2;
      const b = 5 + (offset % 4);
      return {
        ...base,
        params: { kind: "sub_two", a, b },
        expectedAnswer: a - b,
        userAnswer: a + b,
        prompt: `${a} − ${b} = ?`,
      };
    }
    if (topic === "multiplication" && base.params.kind === "mul") {
      const a = 6 + (offset % 4);
      const b = 7 + (offset % 3);
      const product = a * b;
      return {
        ...base,
        params: { kind: "mul", a, b },
        expectedAnswer: product,
        userAnswer: product - 2,
        prompt: `${a} × ${b} = ?`,
      };
    }
    if (topic === "division" && base.params.kind === "div") {
      const b = 6;
      const quotient = 7 + (offset % 3);
      const a = b * quotient;
      return {
        ...base,
        params: { kind: "div", a, b },
        expectedAnswer: quotient,
        userAnswer: a * b,
        prompt: `${a} ÷ ${b} = ?`,
        forceTag: "mul_instead_of_div",
      };
    }
    if (topic === "fractions") {
      const pairs = [
        ["1/4", "3/4"],
        ["2/5", "3/5"],
        ["1/3", "2/3"],
        ["3/8", "5/8"],
      ];
      const [expectedAnswer, userAnswer] = pairs[offset % pairs.length];
      return {
        ...base,
        expectedAnswer,
        userAnswer,
        prompt: `השווה ${expectedAnswer} ו-${userAnswer}`,
      };
    }
    return { ...base };
  }
  return null;
}

/**
 * @param {{
 *   subject: string,
 *   topic: string,
 *   qIndex: number,
 *   gradeLevel: string,
 *   basePayload: Record<string, unknown>,
 * }} input
 * @returns {Record<string, unknown>}
 */
export function enrichDemoWrongAnswerPayload(input) {
  const scenario = resolveDemoWrongScenario(input.subject, input.topic, input.qIndex);
  if (!scenario) return input.basePayload;

  const gradeKey = normalizeGradeLevelToKey(input.gradeLevel) || "g2";
  const evidence = classifyAnswerEvidence({
    subject: input.subject,
    topic: input.topic,
    userAnswer: scenario.userAnswer,
    expectedAnswer: scenario.expectedAnswer,
    isCorrect: false,
    params: scenario.params,
    questionEngine: { questionType: "numeric" },
  });

  const tag =
    scenario.forceTag ||
    (evidence.detectedMisconception && evidence.detectedMisconception !== "unknown"
      ? evidence.detectedMisconception
      : null);

  /** @type {Record<string, unknown>} */
  const diagnosticMetadata = {
    subject: input.subject,
    topicKey: input.topic,
    grade: gradeKey,
    questionType: "numeric",
    metadataPresent: true,
    metadataSource: "demo_enriched",
    ...(tag ? { distractorFamily: tag, patternFamily: tag } : {}),
    ...(Array.isArray(scenario.taxonomyIds) ? { taxonomyIds: scenario.taxonomyIds } : {}),
    ...(tag ? { possibleErrorPatterns: [tag] } : {}),
  };

  return {
    ...input.basePayload,
    subject: input.subject,
    topic: input.topic,
    gameMode: "practice",
    mode: "practice",
    level: "medium",
    contentGradeLevel: gradeKey,
    gradeLevel: gradeKey,
    isDiagnosticEligible: true,
    evidenceCategory: "diagnostic_independent",
    prompt: scenario.prompt,
    expectedAnswer: scenario.expectedAnswer,
    userAnswer: scenario.userAnswer,
    correctAnswer: scenario.expectedAnswer,
    params: scenario.params,
    questionEngine: {
      questionType: "numeric",
      params: scenario.params,
    },
    answerEvidence: evidence,
    misconceptionTag: tag,
    patternFamily: tag,
    distractorFamily: tag,
    diagnosticMetadata,
  };
}
