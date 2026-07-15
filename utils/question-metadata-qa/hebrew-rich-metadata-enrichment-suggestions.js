/**
 * Proposal-only Hebrew rich pool metadata hints (does not write banks).
 */
import { HEBREW_RICH_POOL } from "../hebrew-rich-question-bank.js";

import { buildScanRecord } from "./question-metadata-scanner.js";
import { classifyHebrewRichConfidenceAndReview } from "./hebrew-rich-enrichment-review-pack.js";
import {
  EXTENDED_EXPECTED_ERROR_TYPES,
  inferHebrewRichCognitiveLevel,
  mapDifficultyToCanonical,
} from "./question-metadata-taxonomy.js";

const SOURCE_FILE = "utils/hebrew-rich-question-bank.js";

function pickTemplateDifficultyLabel(raw) {
  const lv = raw.levels;
  if (Array.isArray(lv) && lv.length > 0) return String(lv[0]);
  return "";
}

/**
 * @param {Record<string, unknown>} raw
 */
function normalizeHebrewRichErrorTags(raw) {
  const tags = Array.isArray(raw.expectedErrorTags) ? raw.expectedErrorTags.map(String) : [];
  /** @type {string[]} */
  const out = [];
  for (const t of tags) {
    const x = t.trim();
    if (!x) continue;
    if (EXTENDED_EXPECTED_ERROR_TYPES.has(x)) out.push(x);
    else out.push("concept_confusion");
  }

  const df = String(raw.distractorFamily || "");
  const topic = String(raw.topic || "");
  if (df.includes("orthography") || df.includes("spelling")) {
    out.push("vocabulary_confusion", "careless_error");
  }
  if (topic === "grammar") out.push("grammar_error", "concept_confusion");
  if (topic === "vocabulary") out.push("vocabulary_confusion");
  if (topic === "comprehension" || df.includes("passage") || df.includes("inference")) {
    out.push("reading_comprehension_error", "comprehension_gap");
  }

  const uniq = [...new Set(out)].filter(Boolean);
  return uniq.length ? uniq : ["reading_comprehension_error", "concept_confusion", "careless_error"];
}

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record
 */
function suggestPrerequisiteHebrewRich(raw, record) {
  const skill = record.skillId || "";
  if (skill === "he_comp_inference_intro") {
    return {
      ids: ["he_comp_explicit_detail"],
      confidence: "medium",
      reason: "Inference items build on explicit-detail comprehension - validate sequencing before enforcing.",
    };
  }
  return {
    ids: [],
    confidence: "medium",
    reason: "No automated prerequisite chain for this template.",
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record
 * @param {number} seqIndex
 */
export function buildHebrewRichEnrichmentSuggestion(raw, record, seqIndex) {
  const templateDiff = pickTemplateDifficultyLabel(raw);
  const baseDiff = templateDiff || String(record.difficulty || "");
  const difficultyCanon = mapDifficultyToCanonical(baseDiff || "medium");

  const cognitiveLevel = inferHebrewRichCognitiveLevel(raw, baseDiff || String(record.difficulty || ""));

  const expectedErrorTypes = normalizeHebrewRichErrorTags(raw);
  const prereq = suggestPrerequisiteHebrewRich(raw, record);
  const classification = classifyHebrewRichConfidenceAndReview(raw, record, prereq);

  const suggested = {
    difficulty: difficultyCanon,
    cognitiveLevel,
    expectedErrorTypes,
    prerequisiteSkillIds: prereq.ids,
  };

  const current = {
    skillId: record.skillId,
    subskillId: record.subskillId,
    difficulty: record.difficulty,
    cognitiveLevel: record.cognitiveLevel,
    expectedErrorTypes: record.expectedErrorTypes || [],
    prerequisiteSkillIds: record.prerequisiteSkillIds || [],
  };

  const questionId = record.declaredId || record.id;

  return {
    questionId,
    sourceFile: SOURCE_FILE,
    subject: "hebrew",
    objectPath: `${SOURCE_FILE}::HEBREW_RICH_POOL[${seqIndex}]`,
    current,
    suggested,
    confidence: classification.confidence,
    confidenceReasons: classification.confidenceReasons,
    reviewPriority: classification.reviewPriority,
    needsHumanReview: true,
  };
}

/**
 * @returns {{ suggestions: object[], hebrewRichCount: number, fieldHistogram: Record<string, number> }}
 */
export function generateHebrewRichSuggestions() {
  /** @type {object[]} */
  const suggestions = [];
  /** @type {Record<string, number>} */
  const fieldHistogram = {
    difficulty: 0,
    cognitiveLevel: 0,
    expectedErrorTypes: 0,
    prerequisiteSkillIds: 0,
  };

  let i = 0;
  for (const raw of HEBREW_RICH_POOL) {
    const record = buildScanRecord(
      /** @type {Record<string, unknown>} */ (raw),
      SOURCE_FILE,
      `HEBREW_RICH_POOL[${i}]`,
      "hebrew",
      i
    );
    const sug = buildHebrewRichEnrichmentSuggestion(/** @type {Record<string, unknown>} */ (raw), record, i);
    suggestions.push(sug);

    const cur = sug.current;
    const s = sug.suggested;
    if ((cur.difficulty || "") !== (s.difficulty || "")) fieldHistogram.difficulty += 1;
    if ((cur.cognitiveLevel || "") !== (s.cognitiveLevel || "")) fieldHistogram.cognitiveLevel += 1;
    if ((cur.expectedErrorTypes || []).join(",") !== (s.expectedErrorTypes || []).join(","))
      fieldHistogram.expectedErrorTypes += 1;
    if ((cur.prerequisiteSkillIds || []).join(",") !== (s.prerequisiteSkillIds || []).join(","))
      fieldHistogram.prerequisiteSkillIds += 1;
    i += 1;
  }

  return { suggestions, hebrewRichCount: HEBREW_RICH_POOL.length, fieldHistogram };
}
