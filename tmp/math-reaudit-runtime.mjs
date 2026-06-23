import assert from "node:assert/strict";
import { generateQuestion } from "../utils/math-question-generator.js";
import { getLevelConfig } from "../utils/math-storage.js";
import { GRADES } from "../utils/math-constants.js";
import { listVisibleTopicsForSelfPractice, listVisibleTopicsForAssign } from "../lib/launch-readiness/topic-launch-policy.js";
import { getLearningBookTileTitle } from "../lib/learning-book/learning-book-catalog-meta.js";
import { getSolutionSteps, getHint } from "../utils/math-explanations.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";
import { stripQuestionSetForStudent } from "../lib/classroom-activities/classroom-activities-shared.server.js";
import { assignedActivityUsesNumericKeyboard } from "../lib/classroom-activities/student-activity-question-ui.client.js";
import {
  MATH_G1_BOOK_META,
  MATH_G1_BOOK_BATCHES,
} from "../lib/learning-book/math-g1-registry.js";
import {
  MATH_G2_BOOK_META,
  MATH_G2_BOOK_BATCHES,
} from "../lib/learning-book/math-g2-registry.js";
import {
  MATH_G3_BOOK_META,
  MATH_G3_BOOK_BATCHES,
} from "../lib/learning-book/math-g3-registry.js";
import {
  MATH_G4_BOOK_META,
  MATH_G4_BOOK_BATCHES,
} from "../lib/learning-book/math-g4-registry.js";
import {
  MATH_G5_BOOK_META,
  MATH_G5_BOOK_BATCHES,
} from "../lib/learning-book/math-g5-registry.js";
import {
  MATH_G6_BOOK_META,
  MATH_G6_BOOK_BATCHES,
} from "../lib/learning-book/math-g6-registry.js";

const GRADES_LIST = ["g1", "g2", "g3", "g4", "g5", "g6"];
const LEVELS = ["easy", "medium", "hard"];
const SENSITIVE = [
  "fractions",
  "ratio",
  "scale",
  "order_of_operations",
  "percentages",
  "word_problems",
  "division_with_remainder",
];
const BAD_TEXT = /\b(undefined|null|NaN)\b|[{}]|math_[a-z0-9_]+|g[1-6]\b/i;
const SUBJECT_BAD_LABEL = /חשבון/;
const books = {
  g1: { meta: MATH_G1_BOOK_META, chapters: MATH_G1_BOOK_BATCHES },
  g2: { meta: MATH_G2_BOOK_META, chapters: MATH_G2_BOOK_BATCHES },
  g3: { meta: MATH_G3_BOOK_META, chapters: MATH_G3_BOOK_BATCHES },
  g4: { meta: MATH_G4_BOOK_META, chapters: MATH_G4_BOOK_BATCHES },
  g5: { meta: MATH_G5_BOOK_META, chapters: MATH_G5_BOOK_BATCHES },
  g6: { meta: MATH_G6_BOOK_META, chapters: MATH_G6_BOOK_BATCHES },
};

const failures = [];
const warnings = [];
const manualByGrade = Object.fromEntries(GRADES_LIST.map((g) => [g, 0]));
const manualByTopic = Object.fromEntries(SENSITIVE.map((t) => [t, 0]));
const activeTopicsByGrade = {};
const samples = [];

function fail(label, detail) {
  failures.push(`${label}: ${detail}`);
}

function warn(label, detail) {
  warnings.push(`${label}: ${detail}`);
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object" && "props" in value) return textOf(value.props?.children);
  return String(value);
}

function normalizeAnswer(v) {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

function visibleQuestionText(q) {
  const label = String(q.questionLabel ?? "").trim();
  const exercise = String(q.exerciseText ?? "").trim();
  if (label || exercise) {
    return [label, exercise]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return [q.question]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function expectedAnswer(q) {
  const p = q.params || {};
  const k = String(p.kind || "");
  const n = (v) => Number(v);
  const qText = visibleQuestionText(q);
  if (k === "add_two") return n(p.a) + n(p.b);
  if (k === "add_three") return n(p.a) + n(p.b) + n(p.c);
  if (k === "sub_two") return n(p.a) - n(p.b);
  if (k === "mul") return n(p.a) * n(p.b);
  if (k === "mul_tens") return n(p.tens) * n(p.multiplier);
  if (k === "mul_hundreds") return n(p.hundreds) * n(p.multiplier);
  if (k === "mul_vertical") return n(p.twoDigit) * n(p.oneDigit);
  if (k === "mul_groups_g1") return n(p.groups) * n(p.perGroup);
  if (k === "mul_skip_count_g1") return n(p.total);
  if (k === "div" || k === "div_long" || k === "div_two_digit") {
    if (Number.isFinite(n(p.quotient))) return n(p.quotient);
    if (Number.isFinite(n(p.dividend)) && Number.isFinite(n(p.divisor))) {
      return n(p.dividend) / n(p.divisor);
    }
  }
  if (k === "division_with_remainder" || k === "div_with_remainder") {
    const qn = n(p.quotient);
    const r = n(p.remainder);
    return r > 0 ? `${qn} ושארית ${r}` : qn;
  }
  if (k === "frac_half") return n(p.whole) / 2;
  if (k === "frac_quarter") return n(p.whole) / 4;
  if (k === "frac_half_reverse") return n(p.half) * 2;
  if (k === "frac_quarter_reverse") return n(p.quarter) * 4;
  if (k === "perc_part_of") return (n(p.p ?? p.percent) / 100) * n(p.base);
  if (k === "perc_discount") return n(p.base ?? p.price) - (n(p.p ?? p.percent) / 100) * n(p.base ?? p.price);
  if (k === "ratio_first") return n(p.firstNum);
  if (k === "ratio_second") return n(p.secondNum);
  if (k === "scale_find") return n(p.scale);
  if (k === "scale_map_to_real") return n(p.mapLength) * n(p.scale);
  if (k === "scale_real_to_map") return n(p.realLength) / n(p.scale);
  if (k === "power_calc") return Math.pow(n(p.base), n(p.exp));
  if (k === "power_base") return n(p.base);
  if (k === "zero_add") return n(p.a);
  if (k === "zero_sub") return n(p.a);
  if (k === "zero_mul") return 0;
  if (k === "one_mul") return n(p.a);
  if (k === "cmp") {
    const m = qText.match(/(-?\d+(?:\.\d+)?)\s*__\s*(-?\d+(?:\.\d+)?)/);
    const left = Number.isFinite(n(p.leftValue)) ? n(p.leftValue) : n(m?.[1]);
    const right = Number.isFinite(n(p.rightValue)) ? n(p.rightValue) : n(m?.[2]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return undefined;
    if (left > right) return ">";
    if (left < right) return "<";
    return "=";
  }
  return undefined;
}

function isChoiceQuestion(q) {
  return Array.isArray(q.answers) && q.answers.length >= 2;
}

function validateQuestion(q, grade, topic, level, source) {
  const label = `${source}/${grade}/${topic}/${level}/${q.params?.kind || "unknown"}`;
  const qText = visibleQuestionText(q);
  if (!qText) fail(label, "empty question");
  if (BAD_TEXT.test(qText)) fail(label, `bad visible text in question: ${qText}`);
  if (SUBJECT_BAD_LABEL.test(qText)) fail(label, `uses חשבון in visible question: ${qText}`);
  if (q.correctAnswer == null || normalizeAnswer(q.correctAnswer) === "") fail(label, "missing correctAnswer");
  if (BAD_TEXT.test(normalizeAnswer(q.correctAnswer))) fail(label, `bad correctAnswer: ${q.correctAnswer}`);
  if (qText.length > 180) warn(label, `long question ${qText.length} chars`);

  const expected = expectedAnswer(q);
  if (expected !== undefined) {
    const expN = Number(expected);
    const actualN = Number(q.correctAnswer);
    const numericClose =
      Number.isFinite(expN) &&
      Number.isFinite(actualN) &&
      Math.abs(expN - actualN) <= 0.051;
    if (!numericClose && normalizeAnswer(expected) !== normalizeAnswer(q.correctAnswer)) {
      fail(label, `answer mismatch expected=${expected} actual=${q.correctAnswer} question=${qText}`);
    }
  }

  if (isChoiceQuestion(q)) {
    const choices = q.answers.map(normalizeAnswer);
    if (!choices.includes(normalizeAnswer(q.correctAnswer))) {
      fail(label, `correctAnswer not in answers: ${q.correctAnswer} choices=${choices.join("|")}`);
    }
    if (new Set(choices).size !== choices.length) {
      fail(label, `duplicate answers: ${choices.join("|")}`);
    }
    const matches = choices.filter((c) => c === normalizeAnswer(q.correctAnswer)).length;
    if (matches !== 1) fail(label, `correct answer appears ${matches} times`);
  }

  if (/בחרו|נכון\/לא נכון/.test(qText) && !isChoiceQuestion(q) && topic !== "compare") {
    fail(label, "choice wording without choices");
  }

  const hint = getHint(q, topic, grade);
  if (!hint || BAD_TEXT.test(hint) || SUBJECT_BAD_LABEL.test(hint)) {
    fail(label, `bad hint: ${hint}`);
  }
  const steps = getSolutionSteps(q, topic, grade);
  const stepText = textOf(steps);
  if (!Array.isArray(steps) || steps.length === 0 || !stepText.trim()) {
    fail(label, "empty solution steps");
  }
  if (BAD_TEXT.test(stepText) || SUBJECT_BAD_LABEL.test(stepText)) {
    fail(label, `bad solution steps: ${stepText.slice(0, 180)}`);
  }
}

for (const grade of GRADES_LIST) {
  const gradeNum = Number(grade.slice(1));
  const topics = listVisibleTopicsForSelfPractice("math", grade, GRADES[grade].operations || []);
  activeTopicsByGrade[grade] = topics;
  for (const topic of topics) {
    for (const level of LEVELS) {
      const cfg = getLevelConfig(gradeNum, level);
      for (let i = 0; i < 12; i += 1) {
        const q = generateQuestion(cfg, topic, grade, null, {});
        validateQuestion(q, grade, topic, level, "self");
        if (manualByGrade[grade] < 30) {
          manualByGrade[grade] += 1;
          samples.push({ grade, topic, level, question: q.question, correctAnswer: q.correctAnswer, kind: q.params?.kind });
        }
        if (topic in manualByTopic && manualByTopic[topic] < 20) {
          manualByTopic[topic] += 1;
        }
      }
    }
  }
}

for (const topic of SENSITIVE) {
  for (const grade of GRADES_LIST) {
    if (manualByTopic[topic] >= 20) break;
    if (!activeTopicsByGrade[grade]?.includes(topic)) continue;
    const gradeNum = Number(grade.slice(1));
    const cfg = getLevelConfig(gradeNum, "medium");
    for (let i = 0; i < 80 && manualByTopic[topic] < 20; i += 1) {
      const q = generateQuestion(cfg, topic, grade, null, {});
      validateQuestion(q, grade, topic, "medium", "sensitive");
      manualByTopic[topic] += 1;
      samples.push({ grade, topic, level: "medium", question: q.question, correctAnswer: q.correctAnswer, kind: q.params?.kind });
    }
  }
}

for (const grade of GRADES_LIST) {
  const { meta, chapters } = books[grade];
  const tileTitle = getLearningBookTileTitle("math", grade);
  if (!meta) fail(`book/${grade}`, "missing book meta");
  if (!Array.isArray(chapters) || chapters.length === 0) fail(`book/${grade}`, "missing chapters");
  const metaText = JSON.stringify(meta);
  const visibleBookText = [
    tileTitle.line1,
    tileTitle.line2,
    meta.bookTitleHe,
    meta.gradeShortLabel,
    ...chapters.map((chapter) => chapter?.titleHe),
  ].join(" ");
  const chaptersText = JSON.stringify(chapters);
  if (!/מתמטיקה/.test(metaText)) fail(`book/${grade}`, "meta does not include מתמטיקה");
  if (SUBJECT_BAD_LABEL.test(metaText)) fail(`book/${grade}`, "meta uses חשבון");
  if (BAD_TEXT.test(visibleBookText) || SUBJECT_BAD_LABEL.test(visibleBookText)) fail(`book/${grade}`, "bad visible book text");
  if (!chaptersText || chaptersText.includes("undefined") || chaptersText.includes("null")) {
    fail(`book/${grade}`, "bad book registry data");
  }
}

for (const grade of GRADES_LIST) {
  const assignTopics = listVisibleTopicsForAssign("math", grade, GRADES[grade].operations || []);
  for (const topic of assignTopics) {
    const qs = await generateActivityQuestionSetClient({
      subject: "math",
      gradeLevel: grade,
      topic,
      difficulty: "medium",
      count: 5,
    });
    assert.equal(qs.length, 5);
    for (const q of qs) {
      validateQuestion(q, grade, topic, "medium", "parentAssign");
      if (q.choices !== undefined) fail(`parentAssign/${grade}/${topic}`, "math activity exposes choices");
      const stripped = stripQuestionSetForStudent([q], "guided_practice", {
        hideExplanation: true,
      })[0];
      if ("correctAnswer" in stripped || "correct_answer" in stripped || "answer" in stripped || "expectedAnswer" in stripped) {
        fail(`parentAssign/${grade}/${topic}`, "student stripped payload exposes answer field");
      }
      if ("explanation" in stripped) {
        fail(`parentAssign/${grade}/${topic}`, "student stripped payload exposes explanation before answer");
      }
      if (!assignedActivityUsesNumericKeyboard(stripped)) {
        fail(`parentAssign/${grade}/${topic}`, "math activity does not use numeric keyboard");
      }
    }
  }
}

console.log(JSON.stringify({
  status: failures.length ? "NOT_READY" : "READY",
  activeTopicsByGrade,
  manualByGrade,
  manualByTopic,
  sampleCount: samples.length,
  firstSamples: samples.slice(0, 24),
  failures,
  warnings,
}, null, 2));

if (failures.length) process.exitCode = 1;
