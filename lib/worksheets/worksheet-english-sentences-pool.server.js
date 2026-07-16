/**
 * English sentences pool for worksheet generation — all grade-allowed SENTENCE_POOLS rows.
 * @module lib/worksheets/worksheet-english-sentences-pool.server
 */

import { SENTENCE_POOLS } from "../../data/english-questions/sentence-pools.js";
import { ENGLISH_GRADES } from "../../data/english-curriculum.js";
import { englishPoolItemAllowedWithClassSplit } from "../../utils/grade-gating.js";
import { mergeDiagnosticContractIntoParams } from "../../utils/diagnostic-question-contract.js";

/** Mirrors utils/english-question-generator.js GRADE_PROFILES sentencePools + worksheet supplements. */
const WORKSHEET_SENTENCE_POOL_KEYS = {
  g1: ["base"],
  g2: ["base", "routine"],
  g3: ["routine", "descriptive", "assigned_sentence_mcq"],
  g4: ["descriptive", "narrative", "assigned_sentence_mcq"],
  g5: ["narrative", "advanced", "assigned_sentence_mcq"],
  g6: ["advanced", "assigned_sentence_mcq", "descriptive", "narrative"],
};

/**
 * @param {string} gradeKey
 * @returns {Array<Record<string, unknown>>}
 */
export function listEnglishWorksheetSentencePool(gradeKey) {
  const curriculumKeys = ENGLISH_GRADES[gradeKey]?.topics?.includes("sentences")
    ? WORKSHEET_SENTENCE_POOL_KEYS[gradeKey] || ["routine"]
    : [];
  const allKeys = [
    ...curriculumKeys,
    ...Object.keys(SENTENCE_POOLS).filter((key) => {
      const rows = SENTENCE_POOLS[key] || [];
      return rows.some((item) =>
        englishPoolItemAllowedWithClassSplit("sentence", key, item, gradeKey)
      );
    }),
  ];
  const seen = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const key of allKeys) {
    const rows = SENTENCE_POOLS[key] || [];
    for (const template of rows) {
      if (!englishPoolItemAllowedWithClassSplit("sentence", key, template, gradeKey)) continue;
      const fp = `${template.template}|${template.correct}|${template.patternFamily}`;
      if (seen.has(fp)) continue;
      seen.add(fp);
      out.push({ ...template, poolKey: key });
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} template
 * @param {string} gradeKey
 * @param {string} levelKey
 */
export function englishSentenceItemFromPoolRow(template, gradeKey, levelKey) {
  const question = `השלם את המשפט: "${template.template}"`;
  const params = mergeDiagnosticContractIntoParams(
    {
      template: template.template,
      explanation: template.explanation,
      patternFamily: template.patternFamily || "sentence_completion",
      distractorFamily: template.distractorFamily || "same_slot_forms",
      sentenceOptionSet: Array.isArray(template.options) ? template.options : null,
      difficulty: template.difficulty,
      cognitiveLevel: template.cognitiveLevel,
      englishPoolKey: template.poolKey,
      levelKey,
      gradeKey,
    },
    template
  );
  return {
    question,
    correctAnswer: String(template.correct),
    answers: Array.isArray(template.options) ? template.options.map(String) : undefined,
    choices: Array.isArray(template.options) ? template.options.map(String) : undefined,
    answerMode: "choice",
    subject: "english",
    topic: "sentences",
    operation: "sentences",
    gradeLevel: gradeKey,
    params,
  };
}
