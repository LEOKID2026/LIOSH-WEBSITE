import { mcqCellValue } from "../../utils/mcq-option-cell.js";
import { generateQuestion as generateMathQuestion } from "../../utils/math-question-generator.js";
import { GRADE_LEVELS as MATH_GRADE_LEVELS } from "../../utils/math-constants.js";
import { MATH_TOPIC_COVERAGE_DEFINITIONS } from "../../utils/diagnostic-engine-v2/taxonomy-math-topic-coverage.js";
import { generateQuestion as generateGeometryQuestion } from "../../utils/geometry-question-generator.js";
import { LEVELS as GEOMETRY_LEVELS } from "../../utils/geometry-constants.js";
import {
  generateQuestion as generateEnglishQuestion,
  getLevelForGrade as getEnglishLevel,
} from "../../utils/english-question-generator.js";
import { applyMcqEvidenceTaggingToQuestion } from "./mcq-option-evidence-tagging.js";
import { SCIENCE_QUESTIONS } from "../../data/science-questions.js";
import { HISTORY_QUESTIONS_G6_RAW } from "../../data/history-questions/g6-generated.js";
import { HEBREW_RICH_POOL } from "../../utils/hebrew-rich-question-bank.js";
import { classifyAnswerEvidence } from "./classifiers/index.js";
import { normalizeToCanonicalTag } from "./taxonomy-tag-normalizer.js";

function value(valueOrCell) {
  return mcqCellValue(valueOrCell);
}

function cells(question) {
  return (
    question.params?.mcqOptionCells ||
    question.answers ||
    question.options ||
    question.choices ||
    []
  );
}

function tagOf(cell) {
  return String(cell?.distractorFamily || cell?.misconceptionTag || "");
}

function attemptFromQuestion(question, expectedTag, generator, questionId = null) {
  const optionCells = cells(question);
  const selectedOptionIndex = optionCells.findIndex(
    (cell) => tagOf(cell) === expectedTag
  );
  if (selectedOptionIndex < 0) return null;
  const visible = question.answers || question.options || question.choices || optionCells;
  return {
    question,
    questionId: questionId || question.id || null,
    generator,
    runtimeTopic: question.topic || question.operation || null,
    selectedOptionIndex,
    userAnswer: value(optionCells[selectedOptionIndex]),
    expectedAnswer:
      question.correctAnswer ??
      value(visible[question.correctIndex ?? question.correct ?? 0]),
  };
}

function generatedAttempt(generate, expectedTag, generator) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const question = generate();
    const payload = attemptFromQuestion(question, expectedTag, generator);
    if (payload) return payload;
  }
  throw new Error(`${generator}: no real question emitted ${expectedTag}`);
}

/**
 * docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (Part 6):
 * for a genuinely topic-level-only producer (no dedicated taxonomy row —
 * verified no real per-option distractorFamily/misconceptionTag evidence
 * exists for this content, e.g. triangles/circles) there is no expectedTag
 * to search for. Deterministically pick the first non-correct MCQ option
 * instead of searching for a tag match.
 */
function generatedPlainWrongAttempt(generate, generator) {
  const question = generate();
  const optionCells = cells(question);
  const visible = question.answers || question.options || question.choices || optionCells;
  const correctIndex = question.correctIndex ?? question.correct ?? 0;
  let selectedOptionIndex = optionCells.findIndex((_, index) => index !== correctIndex);
  if (selectedOptionIndex < 0) selectedOptionIndex = 0;
  return {
    question,
    questionId: question.id || null,
    generator,
    runtimeTopic: question.topic || question.operation || null,
    selectedOptionIndex,
    userAnswer: value(optionCells[selectedOptionIndex]),
    expectedAnswer:
      question.correctAnswer ?? value(visible[correctIndex]),
  };
}

function bankQuestion(row, subject, expectedTags) {
  const options = row.options || row.answers;
  return applyMcqEvidenceTaggingToQuestion({
    ...row,
    subject,
    subjectId: subject,
    topic: row.topic,
    type: "mcq",
    questionType: "mcq",
    question: row.question || row.stem,
    answers: options,
    options,
    correctIndex: row.correctIndex ?? row.correct ?? 0,
    correctAnswer: options[row.correctIndex ?? row.correct ?? 0],
    params: {
      ...(row.params || {}),
      expectedErrorTags: expectedTags,
    },
  });
}

const MATH_GRADES = {
  compare: 3, scale: 6, division: 3, division_with_remainder: 4,
  decimals: 4, sequences: 4, percentages: 5, ratio: 6,
  equations: 4, order_of_operations: 3, divisibility: 3,
  prime_composite: 4, powers: 4, zero_one_properties: 4,
  estimation: 4, factors_multiples: 4,
};

const mathConfigs = MATH_TOPIC_COVERAGE_DEFINITIONS.map((definition) => {
  const gradeNumber = MATH_GRADES[definition.topic];
  return {
    subjectId: "math",
    topicKey: definition.topic,
    canonicalTopic: definition.topic,
    grade: `g${gradeNumber}`,
    grades: [`g${gradeNumber}`],
    ruleId: definition.id,
    expectedTag: definition.tag,
    sourceFile: "utils/math-question-generator.js",
    generator: "generateQuestion(levelConfig, topic, gradeKey)",
    loadAttempt: () =>
      generatedAttempt(
        () =>
          generateMathQuestion(
            MATH_GRADE_LEVELS[gradeNumber].levels.medium,
            definition.topic,
            `g${gradeNumber}`
          ),
        definition.tag,
        "math-question-generator"
      ),
  };
});

const GEOMETRY = [
  ["quadrilaterals", "g3", "G-01", "shape_property_confusion"],
  ["perimeter", "g3", "G-06", "formula_selection_error"],
  ["parallel_perpendicular", "g3", "G-01", "shape_property_confusion"],
  ["rotation", "g3", "G-04", "transformation_error"],
  ["diagonal", "g4", "G-01", "rectangle_diagonal"],
  ["heights", "g5", "G-03", "area_formula_error"],
  ["tiling", "g5", "G-02", "angle_range_error"],
  ["solids", "g2", "G-01", "shape_property_confusion"],
  ["pythagoras", "g6", "G-09", "pythagorean_relation_error"],
];

const geometryConfigs = GEOMETRY.map(([topic, grade, ruleId, expectedTag]) => ({
  subjectId: "geometry",
  topicKey: topic,
  canonicalTopic: topic === "rotation" ? "rotation" : topic,
  grade,
  grades: [grade],
  ruleId,
  expectedTag,
  targetTags:
    ruleId === "G-06"
      ? [
          "perimeter_area_confusion",
          "unit_error",
          "perimeter_formula_error",
          "formula_selection_error",
          "square_perimeter_compute",
          "circle_perimeter_compute",
        ]
      : [expectedTag],
  sourceFile: "utils/geometry-question-generator.js",
  generator: "generateQuestion(level, topic, gradeKey)",
  loadAttempt: () =>
    generatedAttempt(
      () => generateGeometryQuestion(GEOMETRY_LEVELS.medium, topic, grade),
      expectedTag,
      "geometry-question-generator"
    ),
}));

/**
 * docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (Part 6):
 * triangles/circles verified to have NO real per-option
 * distractorFamily/misconceptionTag evidence in
 * utils/geometry-question-generator.js (checked directly — the "triangles"
 * classification case and every "circle" case build plain MCQ options with
 * no distractor tagging). utils/diagnostic-engine-v2/topic-taxonomy-bridge.js
 * correctly maps them to `[]` (topic-level only, never a subskill/rule
 * claim). These producers exist so the closure/coverage scripts can still
 * prove the SAFETY properties that do not depend on a taxonomy match
 * (wrong-topic rejection, grade-relation safety, guided-only exclusion,
 * same-session exclusion) for these two topics — `ruleId: null` and
 * `topicLevelOnly: true` tell the closure scripts not to require a
 * taxonomy/subskill match here.
 */
const GEOMETRY_TOPIC_LEVEL_ONLY = [
  ["triangles", "g3"],
  ["circles", "g6"],
];

const geometryTopicLevelOnlyConfigs = GEOMETRY_TOPIC_LEVEL_ONLY.map(([topic, grade]) => ({
  subjectId: "geometry",
  topicKey: topic,
  canonicalTopic: topic,
  grade,
  grades: [grade],
  ruleId: null,
  expectedTag: null,
  topicLevelOnly: true,
  targetTags: [],
  sourceFile: "utils/geometry-question-generator.js",
  generator: "generateQuestion(level, topic, gradeKey)",
  loadAttempt: () =>
    generatedPlainWrongAttempt(
      () => generateGeometryQuestion(GEOMETRY_LEVELS.medium, topic, grade),
      "geometry-question-generator"
    ),
}));

const englishConfigs = [
  {
    subjectId: "english",
    topicKey: "sentences",
    legacyTopicKey: "sentence",
    canonicalTopic: "sentences",
    grade: "g3",
    grades: ["g3", "g4", "g5", "g6"],
    ruleId: "E-06",
    expectedTag: "sentence_structure_error",
    sourceFile: "data/english-questions/sentence-pools.js",
    generator: "english generateQuestion(..., sentences, ...)",
    loadAttempt: () =>
      generatedAttempt(
        () =>
          generateEnglishQuestion(
            getEnglishLevel("medium", "g3"),
            "sentences",
            "g3",
            null,
            "medium"
          ),
        "sentence_structure_error",
        "english-question-generator:sentences"
      ),
  },
  {
    subjectId: "english",
    topicKey: "phonics",
    legacyTopicKey: "listening",
    canonicalTopic: "phonics",
    grade: "g1",
    grades: ["g1", "g2"],
    ruleId: "E-08",
    expectedTag: "phonics_minimal_pair_error",
    sourceFile: "data/english-questions/phonics-g1.js",
    generator: "english generateQuestion(..., phonics, ...)",
    loadAttempt: () =>
      generatedAttempt(
        () =>
          generateEnglishQuestion(
            getEnglishLevel("medium", "g1"),
            "phonics",
            "g1",
            null,
            "medium",
            { forceKind: "first_words_cvc" }
          ),
        "phonics_minimal_pair_error",
        "english-question-generator:phonics"
      ),
  },
];

const readingRow = HEBREW_RICH_POOL.find(
  (row) =>
    row.topic === "reading" &&
    (row.expectedErrorTypes || []).includes("reading_comprehension_error")
);
const sciencePlantsRow = SCIENCE_QUESTIONS.find((row) => row.id === "plants_2");
const scienceEnvironmentRow = SCIENCE_QUESTIONS.find((row) => row.id === "env_2");
const hasmonaeansRow = HISTORY_QUESTIONS_G6_RAW.find(
  (row) =>
    row.id === "hist_g6_hist_sub_hasmonaean_kingdom_easy_05" &&
    (row.params?.expectedErrorTags || []).includes("institution_confusion")
);

const bankConfigs = [
  {
    subjectId: "hebrew", topicKey: "reading", canonicalTopic: "reading",
    grade: "g3", grades: ["g3"], ruleId: "H-04",
    expectedTag: "reading_comprehension_error",
    sourceFile: "utils/hebrew-rich-question-bank.js",
    generator: "HEBREW_RICH_POOL:reading",
    row: readingRow,
    tags: ["reading_comprehension_error", "detail_recall_error"],
  },
  {
    subjectId: "science", topicKey: "plants", canonicalTopic: "plants",
    grade: "g3", grades: ["g3"], ruleId: "S-01",
    expectedTag: "concept_confusion",
    sourceFile: "data/science-questions.js",
    generator: "SCIENCE_QUESTIONS:plants_2",
    row: sciencePlantsRow,
    tags: ["concept_confusion", "vocabulary_confusion"],
  },
  {
    subjectId: "science", topicKey: "environment", canonicalTopic: "environment",
    grade: "g3", grades: ["g3", "g4", "g5", "g6"], ruleId: "S-07",
    expectedTag: "ecosystem_confusion",
    sourceFile: "data/science-questions.js",
    generator: "SCIENCE_QUESTIONS:env_2",
    row: scienceEnvironmentRow,
    tags: ["ecosystem_confusion", "concept_confusion"],
  },
  {
    subjectId: "history", topicKey: "hasmonaeans", canonicalTopic: "hasmonaeans",
    grade: "g6", grades: ["g6"], ruleId: "HI-06",
    expectedTag: "institution_confusion",
    sourceFile: "data/history-questions/g6-generated.js",
    generator: "HISTORY_QUESTIONS_G6_RAW:hasmonaeans",
    row: hasmonaeansRow,
    tags: ["institution_confusion", "concept_confusion"],
  },
].map((config) => ({
  ...config,
  loadAttempt: () => {
    if (!config.row) throw new Error(`${config.subjectId}::${config.topicKey}: bank row missing`);
    const question = bankQuestion(config.row, config.subjectId, config.tags);
    const payload = attemptFromQuestion(
      question,
      config.expectedTag,
      config.generator,
      config.row.id || config.row.patternFamily
    );
    if (!payload) throw new Error(`${config.subjectId}::${config.topicKey}: tagged option missing`);
    return payload;
  },
}));

export const P3B_TOPIC_CLOSURE_PRODUCERS = Object.freeze([
  ...mathConfigs,
  ...geometryConfigs,
  ...geometryTopicLevelOnlyConfigs,
  ...englishConfigs,
  ...bankConfigs,
]);

export function getP3BTopicClosureProducer(subjectId, topicKey) {
  return (
    P3B_TOPIC_CLOSURE_PRODUCERS.find(
      (config) =>
        config.subjectId === subjectId &&
        (config.topicKey === topicKey || config.legacyTopicKey === topicKey)
    ) || null
  );
}

export function randomWrongProducer(config) {
  return {
    ...config,
    loadAttempt: (index) => {
      const targetTags = new Set(
        (config.targetTags || [config.expectedTag]).map((t) => normalizeToCanonicalTag(t)),
      );
      for (let attempt = 0; attempt < 100; attempt++) {
        const positive = config.loadAttempt(index + attempt);
        const question = positive.question;
        const optionCells = cells(question);
        const correct = String(positive.expectedAnswer ?? "");
        for (let randomIndex = 0; randomIndex < optionCells.length; randomIndex++) {
          const cell = optionCells[randomIndex];
          const selected = String(value(cell) ?? "");
          const tag = normalizeToCanonicalTag(tagOf(cell));
          if (selected === correct || targetTags.has(tag) || tag === "unknown") continue;
          const ev = classifyAnswerEvidence({
            subject: config.subjectId,
            topic: positive.runtimeTopic || config.canonicalTopic || config.topicKey,
            question,
            params: question?.params,
            userAnswer: value(cell),
            expectedAnswer: positive.expectedAnswer,
            selectedOptionIndex: randomIndex,
            isCorrect: false,
          });
          const liveTag = normalizeToCanonicalTag(ev?.detectedMisconception || "");
          if (liveTag && targetTags.has(liveTag)) continue;
          return {
            ...positive,
            selectedOptionIndex: randomIndex,
            userAnswer: value(cell),
          };
        }
        // All wrong options still prove the target TEP (e.g. remainder identity) —
        // use a far-wrong synthetic that cannot activate the topic rule.
        return {
          ...positive,
          selectedOptionIndex: null,
          userAnswer:
            typeof positive.expectedAnswer === "number"
              ? positive.expectedAnswer + 997
              : `far_wrong_${config.topicKey}`,
        };
      }
      throw new Error(`${config.subjectId}::${config.topicKey}: random wrong option missing`);
    },
  };
}
