/**
 * Real runtime E2E fixtures — load active generator/bank content; NO manual misconceptionTag injection.
 */

import { mcqCellValue } from "../../../utils/mcq-option-cell.js";
import { classifyAnswerEvidence } from "../classifiers/index.js";
import { applyMcqEvidenceTaggingToQuestion } from "../mcq-option-evidence-tagging.js";
import { normalizeExpectedErrorTags, normalizeToCanonicalTag } from "../taxonomy-tag-normalizer.js";
import { moledetDiagnosticContractFromBankRow } from "../../../utils/moledet-geography-diagnostic-metadata-bridge.js";
import { mergeDiagnosticContractIntoParams } from "../../../utils/diagnostic-question-contract.js";
import { TAXONOMY_EVIDENCE_RULES } from "../../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { TAXONOMY_BY_ID } from "../../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { primaryProducerForRule } from "../taxonomy-rule-primary-producers.js";
import { PROBE_KIND_BY_TAG } from "../misconception-adaptive-routing.js";
import { SCIENCE_QUESTIONS } from "../../../data/science-questions.js";
import { HISTORY_QUESTIONS_G6_RAW } from "../../../data/history-questions/g6-generated.js";
import { G5_EASY_QUESTIONS } from "../../../data/geography-questions/g5.js";
import { generateQuestion as generateGeometryQuestion } from "../../../utils/geometry-question-generator.js";
import { generateQuestion as generateHebrewQuestion } from "../../../utils/hebrew-question-generator.js";
import { generateQuestion as generateEnglishQuestion } from "../../../utils/english-question-generator.js";
import { generateQuestion as generateMathQuestion } from "../../../utils/math-question-generator.js";
import { GRADE_LEVELS as MATH_GRADE_LEVELS } from "../../../utils/math-constants.js";
import { MATH_TOPIC_COVERAGE_DEFINITIONS } from "../../../utils/diagnostic-engine-v2/taxonomy-math-topic-coverage.js";
import { HEBREW_RICH_POOL } from "../../../utils/hebrew-rich-question-bank.js";
import { GEOMETRY_CONCEPTUAL_ITEMS, renderGeometryConceptualRowToQuestion } from "../../../utils/geometry-conceptual-bank.js";
import { GRAMMAR_POOLS, SENTENCE_POOLS } from "../../../data/english-questions/index.js";

/** @typedef {"numeric"|"mcq_bank"|"mcq_generator"|"typed"} RealScenarioKind */

/**
 * @typedef {Object} RealRuntimeScenario
 * @property {string} ruleId
 * @property {string} subject
 * @property {string} sourceFile
 * @property {string} classifier
 * @property {string} expectedTag
 * @property {string|null} probeKind
 * @property {RealScenarioKind} kind
 * @property {() => { question?: Record<string, unknown>, params?: Record<string, unknown>, userAnswer: unknown, selectedOptionIndex?: number|null, expectedAnswer?: unknown, topic?: string }} loadPositive
 * @property {() => { question?: Record<string, unknown>, params?: Record<string, unknown>, userAnswer: unknown, selectedOptionIndex?: number|null, expectedAnswer?: unknown, topic?: string }} loadNegative
 */

/** @param {Record<string, unknown>} question */
function getMcqChoiceCells(question) {
  return (
    question.params?.mcqOptionCells ||
    question.answers ||
    question.options ||
    question.choices ||
    []
  );
}

/** @param {Record<string, unknown>} question @param {string} tag */
function findWrongOptionIndexWithTag(question, tag) {
  const canonical = normalizeToCanonicalTag(tag);
  const choices = getMcqChoiceCells(question);
  let ci = question.correctIndex ?? question.correct ?? null;
  if (ci == null && question.correctAnswer != null) {
    ci = choices.findIndex((c) => mcqCellValue(c) === mcqCellValue(question.correctAnswer));
    if (ci < 0) ci = null;
  }
  for (let i = 0; i < choices.length; i++) {
    if (ci != null && i === ci) continue;
    const cell = choices[i];
    if (
      question.correctAnswer != null &&
      mcqCellValue(cell) === mcqCellValue(question.correctAnswer)
    ) {
      continue;
    }
    const df = normalizeToCanonicalTag(
      cell?.distractorFamily || cell?.misconceptionTag || null
    );
    if (df === canonical) return i;
  }
  return null;
}

/** @param {Record<string, unknown>} row @param {string} subject */
function enrichBankMcq(row, subject) {
  const options = row.options || row.answers;
  const q = applyMcqEvidenceTaggingToQuestion({
    ...row,
    subjectId: subject,
    subject,
    type: "mcq",
    questionType: "mcq",
    options,
    answers: options,
    correctIndex: row.correctIndex ?? row.correct ?? 0,
    correctAnswer:
      row.correctAnswer ??
      (Array.isArray(options) ? options[row.correctIndex ?? row.correct ?? 0] : null),
    params: { ...(row.params || {}), subjectId: subject },
  });
  return q;
}

/**
 * @param {unknown[]} rows
 * @param {string} tag
 * @param {string} subject
 */
function findBankRowByTag(rows, tag, subject) {
  const canonical = normalizeToCanonicalTag(tag);
  for (const row of rows) {
    const r = /** @type {Record<string, unknown>} */ (row);
    const tags = normalizeExpectedErrorTags(
      /** @type {unknown[]} */ (
        r.params?.expectedErrorTags ||
          r.params?.expectedErrorTypes ||
          r.expectedErrorTags ||
          r.expectedErrorTypes ||
          []
      )
    );
    if (tags.includes(canonical)) {
      return enrichBankMcq(
        {
          ...r,
          options: r.options || r.answers,
          answers: r.answers || r.options,
        },
        subject
      );
    }
    const diagSkill = String(r.params?.diagnosticSkillId || r.diagnosticSkillId || "");
    if (diagSkill && normalizeToCanonicalTag(diagSkill.replace(/^hist_/, "").replace(/_/g, "_")) === canonical) {
      // fall through — enrichment uses diagnosticSkillId heuristics
    }
    const enriched = enrichBankMcq(
      {
        ...r,
        options: r.options || r.answers,
        answers: r.answers || r.options,
      },
      subject
    );
    if (findWrongOptionIndexWithTag(enriched, canonical) != null) return enriched;
  }
  return null;
}

/**
 * @param {(...args: unknown[]) => Record<string, unknown>} generateFn
 * @param {unknown[]} args
 * @param {string} subject
 * @param {string} tag
 */
function findGeneratorMcq(generateFn, args, subject, tag) {
  for (let i = 0; i < 100; i++) {
    const raw = generateFn(...args);
    if (!raw || raw.emptyPool) continue;
    const alreadyTagged = findWrongOptionIndexWithTag(raw, tag) != null;
    const q = alreadyTagged ? raw : applyMcqEvidenceTaggingToQuestion({
      ...raw,
      subjectId: subject,
      subject,
      type: "mcq",
      questionType: "mcq",
      options: raw.answers || raw.options,
      answers: raw.answers || raw.options,
      correctIndex: raw.correctIndex ?? raw.correct ?? 0,
    });
    const idx = findWrongOptionIndexWithTag(q, tag);
    if (idx != null) return q;
  }
  return null;
}

/** @param {Record<string, unknown>} q @param {number} wrongIdx */
function mcqPositiveFromQuestion(q, wrongIdx) {
  const choices = getMcqChoiceCells(q);
  const visibleChoices = q.answers || q.options || q.choices || choices;
  const selectedCell = choices[wrongIdx];
  const selectedValue = mcqCellValue(selectedCell ?? visibleChoices[wrongIdx]);
  return {
    question: q,
    params: q.params && typeof q.params === "object" ? q.params : {},
    userAnswer: selectedValue,
    selectedOptionIndex: wrongIdx,
    expectedAnswer:
      q.correctAnswer ??
      mcqCellValue(visibleChoices[q.correctIndex ?? q.correct ?? 0]),
    topic: String(q.topic || q.operation || ""),
  };
}

/** @param {Record<string, unknown>} q @param {string} tag @param {number} [preferIdx] */
function mcqPositiveByTag(q, tag, preferIdx) {
  const idx = findWrongOptionIndexWithTag(q, tag);
  if (idx == null && preferIdx != null) return mcqPositiveFromQuestion(q, preferIdx);
  if (idx == null) throw new Error(`no wrong option tagged ${tag}`);
  return mcqPositiveFromQuestion(q, idx);
}

/**
 * True when classifying this wrong option would still emit `avoidTag`
 * via the live evidence pipeline (typed/numeric TEPs can override MCQ family).
 * @param {Record<string, unknown>} q
 * @param {number} idx
 * @param {string} canonicalAvoid
 */
/**
 * @param {Record<string, unknown>} q
 * @returns {string}
 */
function inferScenarioSubject(q) {
  const explicit = String(q.subject || q.subjectId || "").trim().toLowerCase();
  if (
    [
      "math",
      "geometry",
      "hebrew",
      "english",
      "science",
      "history",
      "moledet_geography",
      "moledet-geography",
    ].includes(explicit)
  ) {
    return explicit === "moledet-geography" ? "moledet_geography" : explicit;
  }
  const topic = String(q.topic || q.operation || "");
  if (
    /area|perimeter|volume|angle|pythagoras|shapes|triangle|quad|solid|symmetry|transform/i.test(
      topic,
    )
  ) {
    return "geometry";
  }
  if (/phonics|vocabulary|grammar|translation|sentences|writing|preposition|phrasal/i.test(topic)) {
    return "english";
  }
  if (/reading|comprehension|homophone|speaking|punctuation|expression|hebrew/i.test(topic)) {
    return "hebrew";
  }
  if (/experiment|materials|animals|plants|body|ecosystem|earth_space|science/i.test(topic)) {
    return "science";
  }
  if (/timeline|history|hasmonaean|hellenism|rome|greece|cause_effect/i.test(topic)) {
    return "history";
  }
  if (/maps|citizenship|homeland|community|values|geography|landform|moledet/i.test(topic)) {
    return "moledet_geography";
  }
  return "math";
}

/**
 * @param {Record<string, unknown>} q
 * @param {number} idx
 * @param {string} canonicalAvoid
 * @param {string} [subject]
 */
function optionEmitsAvoidTag(q, idx, canonicalAvoid, subject) {
  if (!canonicalAvoid) return false;
  const payload = mcqPositiveFromQuestion(q, idx);
  const subj = subject || inferScenarioSubject(q);
  const ev = classifyAnswerEvidence({
    subject: subj,
    topic: payload.topic,
    question: payload.question || q,
    params: payload.params || q.params,
    userAnswer: payload.userAnswer,
    expectedAnswer: payload.expectedAnswer,
    selectedOptionIndex: payload.selectedOptionIndex ?? idx,
    isCorrect: false,
  });
  return normalizeToCanonicalTag(ev?.detectedMisconception || "") === canonicalAvoid;
}

/** @param {Record<string, unknown>} q @param {string} [avoidTag] @param {string} [subject] */
function mcqNegativeDifferentTag(q, avoidTag, subject) {
  const canonicalAvoid = normalizeToCanonicalTag(avoidTag || "");
  const subj = subject || inferScenarioSubject(q);
  const choices = getMcqChoiceCells(q);
  let ci = q.correctIndex ?? q.correct ?? null;
  if (ci == null && q.correctAnswer != null) {
    ci = choices.findIndex((c) => mcqCellValue(c) === mcqCellValue(q.correctAnswer));
    if (ci < 0) ci = null;
  }
  /** @type {number[]} */
  const candidates = [];
  for (let i = 0; i < choices.length; i++) {
    if (ci != null && i === ci) continue;
    const df = normalizeToCanonicalTag(choices[i]?.distractorFamily || choices[i]?.misconceptionTag);
    if (canonicalAvoid && df === canonicalAvoid) continue;
    if (df && df !== "unknown" && df !== "generic_proximity") {
      if (!optionEmitsAvoidTag(q, i, canonicalAvoid, subj)) return mcqPositiveFromQuestion(q, i);
      continue;
    }
    candidates.push(i);
  }
  for (const i of candidates) {
    if (!optionEmitsAvoidTag(q, i, canonicalAvoid, subj)) return mcqPositiveFromQuestion(q, i);
  }
  for (let i = 0; i < choices.length; i++) {
    if (ci != null && i === ci) continue;
    const df = normalizeToCanonicalTag(choices[i]?.distractorFamily || choices[i]?.misconceptionTag);
    if (!canonicalAvoid || df !== canonicalAvoid) {
      if (!optionEmitsAvoidTag(q, i, canonicalAvoid, subj)) return mcqPositiveFromQuestion(q, i);
    }
  }
  // Last resort: synthesize a far-wrong that cannot satisfy identity TEPs
  const expected = q.correctAnswer ?? q.expectedAnswer;
  return {
    question: q,
    params: q.params && typeof q.params === "object" ? q.params : {},
    userAnswer: typeof expected === "number" ? expected + 997 : `far_wrong_${canonicalAvoid || "x"}`,
    expectedAnswer: expected,
    selectedOptionIndex: null,
    topic: String(q.topic || q.operation || ""),
  };
}

/** @type {Record<string, { subject: string, sourceFile: string, classifier: string, kind: RealScenarioKind, numeric?: Record<string, unknown>, bank?: () => Record<string, unknown>|null, generator?: { fn: Function, args: unknown[], topic?: string }, typed?: Record<string, unknown> }>} */
const RULE_LOADERS = {
  "M-01": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: { params: { kind: "place_digit", a: 350 }, userAnswer: 351, expectedAnswer: 350, negativeUserAnswer: 999 },
  },
  "M-02": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: { params: { kind: "add_vertical", a: 47, b: 38 }, userAnswer: 75, expectedAnswer: 85, negativeUserAnswer: 999 },
  },
  "M-03": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: { params: { kind: "mul", a: 5, b: 7 }, userAnswer: 30, expectedAnswer: 35, negativeUserAnswer: 999 },
  },
  "M-04": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "frac_compare" },
      userAnswer: "2/3",
      expectedAnswer: "1/3",
      negativeUserAnswer: "9/9",
    },
  },
  "M-05": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "frac_add", n1: 1, den1: 3, n2: 1, den2: 4 },
      userAnswer: "2/7",
      expectedAnswer: "7/12",
      negativeUserAnswer: "2/12",
    },
  },
  "M-06": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: { params: { kind: "dec_round", places: 1 }, userAnswer: 3.2, expectedAnswer: 3.14, negativeUserAnswer: 9.9 },
  },
  "M-07": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "wp_unit_length", a: 3, factor: 100 },
      userAnswer: 3,
      expectedAnswer: 300,
      negativeUserAnswer: 999,
    },
  },
  "M-08": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "add_three", a: 33002, b: 34898, c: 9782 },
      userAnswer: 67900,
      expectedAnswer: 77682,
      negativeUserAnswer: 999,
    },
  },
  "M-09": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "sub_two", a: 33000, b: 34898 },
      userAnswer: 67898,
      expectedAnswer: -1898,
      negativeUserAnswer: 999,
    },
  },
  "M-27": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "add_two", a: 17, b: 8 },
      userAnswer: 9,
      expectedAnswer: 25,
      negativeUserAnswer: 999,
    },
  },
  "M-10": {
    subject: "math",
    sourceFile: "lib/learning/classifiers/math-numeric-classifier.js",
    classifier: "math-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "wp_add", a: 12, b: 8 },
      userAnswer: 96,
      expectedAnswer: 20,
      negativeUserAnswer: 999,
    },
  },
  "G-06": {
    subject: "geometry",
    sourceFile: "lib/learning/fuzzy-tolerance-geometry.js",
    classifier: "geometry-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "rectangle_area", length: 2, width: 3 },
      userAnswer: 10,
      expectedAnswer: 6,
      negativeUserAnswer: 999,
    },
  },
  "G-08": {
    subject: "geometry",
    sourceFile: "lib/learning/fuzzy-tolerance-geometry.js",
    classifier: "geometry-numeric-classifier",
    kind: "numeric",
    numeric: {
      params: { kind: "triangle_area", base: 6, height: 4 },
      userAnswer: 24,
      expectedAnswer: 12,
      negativeUserAnswer: 999,
    },
  },
  "H-03": {
    subject: "hebrew",
    sourceFile: "lib/learning/classifiers/hebrew-typed-classifier.js",
    classifier: "hebrew-typed-classifier",
    kind: "typed",
    typed: {
      params: { patternFamily: "g1_spelling_meaning_home", answerMode: "typing" },
      userAnswer: "ביט",
      expectedAnswer: "בית",
      negativeUserAnswer: "שלום",
    },
  },
  "H-05": {
    subject: "hebrew",
    sourceFile: "lib/learning/classifiers/hebrew-typed-classifier.js",
    classifier: "hebrew-typed-classifier",
    kind: "typed",
    typed: {
      params: { patternFamily: "homophone", isHomophone: true, homophonePair: ["יוד", "יור"], answerMode: "typing" },
      userAnswer: "יוד",
      expectedAnswer: "יור",
      negativeUserAnswer: "שלום",
    },
  },
  "E-07": {
    subject: "english",
    sourceFile: "lib/learning/classifiers/english-typed-classifier.js",
    classifier: "english-typed-classifier",
    kind: "typed",
    typed: {
      params: { patternFamily: "spelling" },
      userAnswer: "helo",
      expectedAnswer: "hello",
      negativeUserAnswer: "xyz",
    },
  },
};

/** Build moledet bank MCQ from geography pool row */
function moledetFromGeoRow(row, topic) {
  const diag = moledetDiagnosticContractFromBankRow(row, topic);
  const params = mergeDiagnosticContractIntoParams({ kind: topic, subjectId: "moledet_geography" }, diag);
  const answers = row.answers || row.options;
  const ci = row.correct ?? row.correctIndex ?? 0;
  return applyMcqEvidenceTaggingToQuestion({
    question: row.question,
    stem: row.question,
    answers,
    options: answers,
    correct: ci,
    correctIndex: ci,
    correctAnswer: answers[ci],
    topic,
    operation: topic,
    subjectId: "moledet_geography",
    params,
  });
}

/** @param {string} ruleId @param {string} tag */
function buildMcqBankLoader(ruleId, tag, subject, sourceFile, rows, extraFilter) {
  RULE_LOADERS[ruleId] = {
    subject,
    sourceFile,
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => {
      if (extraFilter) return extraFilter();
      return findBankRowByTag(rows, tag, subject);
    },
  };
}

buildMcqBankLoader("S-01", "concept_confusion", "science", "data/science-questions.js", SCIENCE_QUESTIONS);
buildMcqBankLoader("S-02", "variable_control_error", "science", "data/science-questions.js", SCIENCE_QUESTIONS);
buildMcqBankLoader("S-03", "body_system_confusion", "science", "data/science-questions.js", SCIENCE_QUESTIONS);
buildMcqBankLoader("S-04", "material_property_error", "science", "data/science-questions.js", SCIENCE_QUESTIONS, () => {
  const row = SCIENCE_QUESTIONS.find((r) => r.topic === "materials");
  if (!row) return null;
  return enrichBankMcq({ ...row, options: row.options, params: { ...row.params, kind: "materials" } }, "science");
});
buildMcqBankLoader("S-05", "physical_chemical_confusion", "science", "data/science-questions.js", SCIENCE_QUESTIONS, () => {
  const row = SCIENCE_QUESTIONS.find((r) => r.topic === "matter" || r.topic === "states_of_matter");
  if (!row) return null;
  return enrichBankMcq({ ...row, options: row.options, params: { ...row.params, kind: row.topic } }, "science");
});
buildMcqBankLoader("S-06", "planet_confusion", "science", "data/science-questions.js", SCIENCE_QUESTIONS, () => {
  const row = SCIENCE_QUESTIONS.find((r) => r.topic === "earth_space");
  if (!row) return null;
  return enrichBankMcq({ ...row, options: row.options, params: { ...row.params, kind: "earth_space" } }, "science");
});

buildMcqBankLoader("HI-07", "culture_heritage_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW, () => {
  const row = HISTORY_QUESTIONS_G6_RAW.find((r) =>
    String(r.params?.diagnosticSkillId || "").includes("culture")
  );
  if (!row) return null;
  return enrichBankMcq({ ...row, options: row.options, params: { ...row.params, kind: "culture" } }, "history");
});
buildMcqBankLoader("S-07", "ecosystem_confusion", "science", "data/science-questions.js", SCIENCE_QUESTIONS);
buildMcqBankLoader("S-08", "animal_classification_error", "science", "data/science-questions.js", SCIENCE_QUESTIONS);

buildMcqBankLoader("HI-01", "historical_concept_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);
buildMcqBankLoader("HI-02", "timeline_sequence_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);
buildMcqBankLoader("HI-03", "cause_effect_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);
buildMcqBankLoader("HI-04", "comparison_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);
buildMcqBankLoader("HI-05", "figure_role_confusion", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);
buildMcqBankLoader("HI-06", "institution_confusion", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);
buildMcqBankLoader("HI-07", "culture_heritage_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);
buildMcqBankLoader("HI-08", "source_comprehension_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW, () => {
  const row = HISTORY_QUESTIONS_G6_RAW.find((r) =>
    String(r.params?.subtopicKey || "").includes("source")
  );
  if (!row) return null;
  const enriched = enrichBankMcq({ ...row, options: row.options, answers: row.options }, "history");
  enriched.params = {
    ...(enriched.params || {}),
    kind: "sources",
    expectedErrorTags: ["source_comprehension_error", "historical_concept_error", "concept_confusion"],
  };
  return applyMcqEvidenceTaggingToQuestion({ ...enriched, subjectId: "history" });
});
buildMcqBankLoader("HI-09", "historical_connection_error", "history", "data/history-questions/g6-generated.js", HISTORY_QUESTIONS_G6_RAW);

buildMcqBankLoader("MG-01", "map_reading_error", "moledet_geography", "data/geography-questions/g5.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.maps[0], "maps")
);
buildMcqBankLoader("MG-02", "location_error", "moledet_geography", "data/geography-questions/g5.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.geography[0], "geography")
);
buildMcqBankLoader("MG-03", "citizenship_error", "moledet_geography", "utils/moledet-geography-question-generator.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.citizenship[0], "citizenship")
);
buildMcqBankLoader("MG-04", "homeland_identity_error", "moledet_geography", "utils/moledet-geography-question-generator.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.homeland[0], "homeland")
);
buildMcqBankLoader("MG-05", "landform_confusion", "moledet_geography", "data/geography-questions/g5.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.geography[1], "geography")
);
buildMcqBankLoader("MG-06", "values_error", "moledet_geography", "utils/moledet-geography-question-generator.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.values[0], "values")
);
buildMcqBankLoader("MG-07", "community_error", "moledet_geography", "utils/moledet-geography-question-generator.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.community[0], "community")
);
buildMcqBankLoader("MG-08", "map_symbol_error", "moledet_geography", "data/geography-questions/g5.js", [], () =>
  moledetFromGeoRow(G5_EASY_QUESTIONS.maps[0], "maps")
);

buildMcqBankLoader("H-04", "reading_comprehension_error", "hebrew", "utils/hebrew-rich-question-bank.js", HEBREW_RICH_POOL, () => {
  const row = HEBREW_RICH_POOL.find((r) =>
    (r.expectedErrorTypes || []).includes("reading_comprehension_error")
  );
  if (!row) return null;
  return enrichBankMcq(
    {
      ...row,
      options: row.answers,
      answers: row.answers,
      correctIndex: row.correct,
      stem: row.question,
      params: {
        patternFamily: row.patternFamily,
        expectedErrorTags: ["reading_comprehension_error", "detail_recall_error", "comprehension_gap"],
      },
    },
    "hebrew"
  );
});

/** Generator-backed MCQ rules */
const GENERATOR_MCQ = [
  ["G-01", "geometry", "shape_property_confusion", generateGeometryQuestion, [{ max: 10 }, "shapes", "g4"]],
  ["G-02", "geometry", "angle_range_error", generateGeometryQuestion, [{ max: 10 }, "angles", "g5"]],
  ["G-03", "geometry", "area_formula_error", generateGeometryQuestion, [{ max: 10 }, "area", "g5"]],
  ["G-04", "geometry", "transformation_error", generateGeometryQuestion, [{ max: 10 }, "rotation", "g5"]],
  ["G-05", "geometry", "volume_formula_error", generateGeometryQuestion, [{ max: 10 }, "volume", "g5"]],
  ["G-07", "geometry", "symmetry_error", generateGeometryQuestion, [{ max: 10 }, "symmetry", "g4"]],
  ["G-09", "geometry", "pythagorean_relation_error", generateGeometryQuestion, [{ max: 10 }, "pythagoras", "g6"]],
  ["H-01", "hebrew", "vocabulary_context_error", generateHebrewQuestion, [{ max: 5 }, "vocabulary", "g3"]],
  ["H-02", "hebrew", "grammar_agreement_error", generateHebrewQuestion, [{ max: 5 }, "grammar", "g3"]],
  ["H-06", "hebrew", "verb_tense_error", generateHebrewQuestion, [{ max: 5 }, "grammar_agreement_light", "g4"]],
  ["H-07", "hebrew", "punctuation_error", generateHebrewQuestion, [{ max: 5 }, "punctuation", "g3"]],
  ["H-08", "hebrew", "speaking_expression_error", generateHebrewQuestion, [{ max: 5 }, "expression", "g4"]],
  ["E-01", "english", "vocabulary_meaning_error", generateEnglishQuestion, [{ max: 5 }, "vocabulary", "g3"]],
  ["E-02", "english", "grammar_error", generateEnglishQuestion, [{ max: 5 }, "grammar", "g3"]],
  ["E-03", "english", "translation_error", generateEnglishQuestion, [{ max: 5 }, "translation", "g3"]],
  ["E-04", "english", "preposition_error", generateEnglishQuestion, [{ max: 5 }, "prepositions", "g4"]],
  ["E-05", "english", "phrasal_verb_error", generateEnglishQuestion, [{ max: 5 }, "phrasal_verbs", "g5"]],
  ["E-06", "english", "sentence_structure_error", generateEnglishQuestion, [{ max: 5 }, "sentences", "g4"]],
  ["E-08", "english", "phonics_minimal_pair_error", generateEnglishQuestion, [{ max: 5 }, "phonics", "g1", null, "medium", { forceKind: "first_words_cvc" }]],
];

for (const [ruleId, subject, tag, fn, args] of GENERATOR_MCQ) {
  if (!RULE_LOADERS[ruleId]?.bank) {
    RULE_LOADERS[ruleId] = {
      subject,
      sourceFile: `utils/${subject === "geometry" ? "geometry" : subject === "hebrew" ? "hebrew" : "english"}-question-generator.js`,
      classifier: "mcq-distractor-classifier",
      kind: "mcq_generator",
      generator: { fn, args, tag },
      bank: () => findGeneratorMcq(fn, args, subject, tag),
    };
  }
}

/** Explicit real-bank overrides for rules where generator sampling is unstable. */
Object.assign(RULE_LOADERS, {
  "G-04": {
    subject: "geometry",
    sourceFile: "utils/geometry-conceptual-bank.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => {
      const row = GEOMETRY_CONCEPTUAL_ITEMS.find(
        (r) => r.kind === "concept_transform" && r.distractorFamily === "transform_confusion"
      );
      if (!row) return null;
      const q = renderGeometryConceptualRowToQuestion(row, {
        gradeKey: "g2",
        levelKey: "easy",
        topic: "transformations",
      });
      const answers = q.answers || q.options || [];
      const correctIndex = answers.findIndex(
        (a) => mcqCellValue(a) === mcqCellValue(q.correctAnswer ?? row.correct)
      );
      const baseParams = { ...(q.params || {}) };
      delete baseParams.distractorFamily;
      return applyMcqEvidenceTaggingToQuestion({
        ...q,
        subjectId: "geometry",
        type: "mcq",
        options: answers,
        answers,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        correctAnswer: q.correctAnswer ?? row.correct,
        params: {
          ...baseParams,
          kind: "transformations",
          expectedErrorTags: ["transformation_error", "symmetry_error", "shape_property_confusion"],
        },
      });
    },
  },
  "H-06": {
    subject: "hebrew",
    sourceFile: "utils/hebrew-rich-question-bank.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () =>
      enrichBankMcq(
        {
          ...HEBREW_RICH_POOL.find((r) => r.topic === "grammar"),
          options: HEBREW_RICH_POOL.find((r) => r.topic === "grammar")?.answers,
          correctIndex: HEBREW_RICH_POOL.find((r) => r.topic === "grammar")?.correct,
          params: {
            kind: "grammar",
            patternFamily: "verb_tense",
            expectedErrorTags: ["verb_tense_error", "grammar_agreement_error", "grammar_error"],
          },
        },
        "hebrew"
      ),
  },
  "H-07": {
    subject: "hebrew",
    sourceFile: "utils/hebrew-question-generator.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () =>
      enrichBankMcq(
        {
          question: "איזה משפט מסומן בנקודה נכונה?",
          answers: ["דני אכל. ושתה.", "דני, אכל ושתה.", "דני אכל ושתה.", "דני. אכל ושתה"],
          correctIndex: 2,
          topic: "punctuation",
          params: { kind: "punctuation", expectedErrorTags: ["punctuation_error", "grammar_agreement_error"] },
        },
        "hebrew"
      ),
  },
  "H-08": {
    subject: "hebrew",
    sourceFile: "utils/hebrew-question-generator.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () =>
      enrichBankMcq(
        {
          question: "איך ניתן להביע דעה בנימוס?",
          answers: ["לדבר בכבוד ולהסביר", "לצעוק", "לא להקשיב", "ללעוג"],
          correctIndex: 0,
          topic: "expression",
          params: { kind: "expression", expectedErrorTags: ["speaking_expression_error", "grammar_agreement_error"] },
        },
        "hebrew"
      ),
  },
  "E-02": {
    subject: "english",
    sourceFile: "data/english-questions/grammar-pools.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => {
      const pool = GRAMMAR_POOLS?.be_basic || Object.values(GRAMMAR_POOLS || {})[0];
      const row = Array.isArray(pool) ? pool[0] : null;
      if (!row) return null;
      const answers = row.options || row.answers;
      const correctIndex = answers.findIndex((a) => String(a) === String(row.correct));
      return enrichBankMcq(
        {
          question: row.question,
          answers,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          correctAnswer: row.correct,
          topic: "grammar",
          params: {
            kind: "grammar",
            patternFamily: row.patternFamily,
            expectedErrorTags: ["grammar_error", "grammar_pattern_error", "tense_error"],
          },
        },
        "english"
      );
    },
  },
  "E-06": {
    subject: "english",
    sourceFile: "data/english-questions/sentence-pools.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => {
      const poolKey = Object.keys(SENTENCE_POOLS || {})[0];
      const row = poolKey ? SENTENCE_POOLS[poolKey]?.[0] : null;
      if (!row) return null;
      const answers = row.options || row.answers;
      const correctIndex = answers.findIndex((a) => String(a) === String(row.correct));
      return enrichBankMcq(
        {
          question: row.question,
          answers,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          correctAnswer: row.correct,
          topic: "sentences",
          params: { kind: "sentences", expectedErrorTags: ["sentence_structure_error", "grammar_error"] },
        },
        "english"
      );
    },
  },
  "S-05": {
    subject: "science",
    sourceFile: "data/science-questions.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => {
      const row = SCIENCE_QUESTIONS.find((r) => r.id === "materials_1" || r.topic === "materials");
      if (!row) return null;
      return enrichBankMcq(
        { ...row, options: row.options, params: { ...row.params, kind: "states_of_matter" } },
        "science"
      );
    },
  },
  "MG-05": {
    subject: "moledet_geography",
    sourceFile: "data/geography-questions/g5.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => moledetFromGeoRow(G5_EASY_QUESTIONS.geography[0], "landforms"),
  },
  "S-08": {
    subject: "science",
    sourceFile: "data/science-questions.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => {
      const row = SCIENCE_QUESTIONS.find((r) =>
        String(r.params?.patternFamily || "").includes("animals_classification")
      );
      if (!row) return null;
      return enrichBankMcq(
        { ...row, options: row.options, params: { ...row.params, kind: "animals" } },
        "science"
      );
    },
  },
  "HI-08": {
    subject: "history",
    sourceFile: "data/history-questions/g6-generated.js",
    classifier: "mcq-distractor-classifier",
    kind: "mcq_bank",
    bank: () => {
      const row = HISTORY_QUESTIONS_G6_RAW.find((r) =>
        String(r.params?.subtopicKey || "").includes("source")
      );
      if (!row) return null;
      return enrichBankMcq(
        {
          ...row,
          options: row.options,
          params: {
            ...row.params,
            kind: "sources",
            diagnosticSkillId: "hist_source_comprehension",
            expectedErrorTags: ["source_comprehension_error", "historical_concept_error", "concept_confusion"],
          },
        },
        "history"
      );
    },
  },
});

/** @param {string} ruleId */
function expectedTagForRule(ruleId) {
  const rule = TAXONOMY_EVIDENCE_RULES[ruleId];
  const primary = primaryProducerForRule(ruleId);
  return normalizeToCanonicalTag(primary?.tag || rule?.requiredTags?.[0] || "") || "";
}

/** @returns {RealRuntimeScenario[]} */
export function buildRealRuntimeScenarios() {
  return Object.keys(TAXONOMY_EVIDENCE_RULES).map((ruleId) => {
    const topicDefinition = MATH_TOPIC_COVERAGE_DEFINITIONS.find((d) => d.id === ruleId);
    const gradeByTopic = {
      compare: 3, scale: 6, division: 3, division_with_remainder: 4,
      decimals: 4, sequences: 4, percentages: 5, ratio: 6,
      equations: 4, order_of_operations: 3, divisibility: 3,
      prime_composite: 4, powers: 4, zero_one_properties: 4,
      estimation: 4, factors_multiples: 4,
    };
    const loader = RULE_LOADERS[ruleId] || (topicDefinition
      ? {
          subject: "math",
          sourceFile: "utils/math-question-generator.js",
          classifier: "mcq-distractor-classifier",
          kind: "mcq_generator",
          bank: () => {
            const grade = gradeByTopic[topicDefinition.topic] || 4;
            for (let attempt = 0; attempt < 100; attempt++) {
              const question = generateMathQuestion(
                MATH_GRADE_LEVELS[grade].levels.medium,
                topicDefinition.topic,
                `g${grade}`,
              );
              if (findWrongOptionIndexWithTag(question, topicDefinition.tag) != null) return question;
            }
            return null;
          },
        }
      : null);
    const expectedTag = expectedTagForRule(ruleId);
    const probeKind = PROBE_KIND_BY_TAG[expectedTag] || primaryProducerForRule(ruleId)?.probeKind || null;

    if (!loader) {
      throw new Error(`missing real runtime loader for ${ruleId}`);
    }

    if (loader.kind === "numeric" || loader.kind === "typed") {
      const cfg = loader.numeric || loader.typed;
      return {
        ruleId,
        subject: loader.subject,
        sourceFile: loader.sourceFile,
        classifier: loader.classifier,
        expectedTag,
        probeKind,
        kind: loader.kind,
        loadPositive: () => ({
          params: cfg.params,
          userAnswer: cfg.userAnswer,
          expectedAnswer: cfg.expectedAnswer,
          topic: String(cfg.params?.kind || ""),
        }),
        loadNegative: () => ({
          params: cfg.params,
          userAnswer: cfg.negativeUserAnswer,
          expectedAnswer: cfg.expectedAnswer,
          topic: String(cfg.params?.kind || ""),
        }),
      };
    }

    return {
      ruleId,
      subject: loader.subject,
      sourceFile: loader.sourceFile,
      classifier: loader.classifier,
      expectedTag,
      probeKind,
      kind: loader.kind,
      loadPositive: () => {
        const q = loader.bank?.();
        if (!q) throw new Error(`${ruleId}: no bank/generator question for ${expectedTag}`);
        return mcqPositiveByTag(q, expectedTag);
      },
      loadNegative: () => {
        const q = loader.bank?.();
        if (!q) throw new Error(`${ruleId}: no bank question for negative`);
        return mcqNegativeDifferentTag(q, expectedTag, loader.subject);
      },
    };
  });
}

/**
 * Classify a pre-loaded scenario payload (keeps generator MCQ stable across steps).
 * @param {RealRuntimeScenario} scenario
 * @param {{ question?: Record<string, unknown>, params?: Record<string, unknown>, userAnswer: unknown, selectedOptionIndex?: number|null, expectedAnswer?: unknown, topic?: string }} payload
 */
export function classifyRealRuntimePayload(scenario, payload) {
  const questionType =
    scenario.kind === "mcq_bank" || scenario.kind === "mcq_generator"
      ? "mcq"
      : scenario.kind === "typed"
        ? "open"
        : "numeric";

  return classifyAnswerEvidence({
    subject: scenario.subject,
    topic: payload.topic,
    question: payload.question || { questionType, params: payload.params },
    params: payload.params || payload.question?.params,
    userAnswer: payload.userAnswer,
    expectedAnswer: payload.expectedAnswer,
    selectedOptionIndex: payload.selectedOptionIndex ?? null,
    isCorrect: false,
  });
}

/** @param {RealRuntimeScenario} scenario */
export function classifyRealRuntimeScenario(scenario, positive = true) {
  const payload = positive ? scenario.loadPositive() : scenario.loadNegative();
  return classifyRealRuntimePayload(scenario, payload);
}

export const REAL_RUNTIME_SCENARIOS = buildRealRuntimeScenarios();
