/**
 * Proposal-only enrichment hints for question rows (does not write banks).
 */
import { SCIENCE_QUESTIONS } from "../../data/science-questions.js";

import { buildScanRecord } from "./question-metadata-scanner.js";
import { classifyScienceConfidenceAndReview } from "./science-enrichment-review-pack.js";
import {
  EXTENDED_EXPECTED_ERROR_TYPES,
  inferScienceCognitiveLevel,
  mapDifficultyToCanonical,
  SCIENCE_TOPIC_ORDER,
} from "./question-metadata-taxonomy.js";

const SOURCE_FILE = "data/science-questions.js";

/**
 * @param {string} tag
 */
function slugTag(tag) {
  return String(tag)
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

/**
 * Normalize non-generic tags toward taxonomy buckets without renaming stems.
 * @param {string[]} tags
 */
function normalizeErrorTags(tags) {
  const out = [];
  for (const t of tags) {
    const x = String(t).trim();
    if (!x) continue;
    if (EXTENDED_EXPECTED_ERROR_TYPES.has(x)) out.push(x);
    else if (/fact|recall/i.test(x)) out.push("fact_recall_gap");
    else if (/classif|categor/i.test(x)) out.push("classification_error");
    else if (/cause|effect/i.test(x)) out.push("cause_effect_gap");
    else out.push("concept_confusion");
  }
  if (out.length === 0) return ["misconception", "concept_confusion"];
  return [...new Set(out)];
}

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record
 */
function suggestPrerequisiteScience(raw, record) {
  const skill = record.skillId || "";
  if (skill === "sci_respiration_concept") {
    return {
      ids: ["sci_body_fact_recall"],
      confidence: "high",
      reason:
        "Respiration builds on basic body-system vocabulary; link formally while editors verify curriculum order.",
    };
  }
  const idx = SCIENCE_TOPIC_ORDER.indexOf(skill);
  if (idx > 0) {
    const prev = SCIENCE_TOPIC_ORDER[idx - 1];
    return {
      ids: [prev],
      confidence: "low",
      reason:
        "Heuristic sequential topic link from SCIENCE_TOPIC_ORDER - validate pedagogically before enforcing prerequisites.",
    };
  }
  return {
    ids: [],
    confidence: "medium",
    reason:
      "No automated prerequisite chain for this skillId in taxonomy v1 - curriculum authors should map explicitly.",
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record
 */
export function buildScienceEnrichmentSuggestion(raw, record, seqIndex) {
  const params = raw.params && typeof raw.params === "object" ? /** @type {Record<string, unknown>} */ (raw.params) : {};
  const topic = String(raw.topic || "general");
  const declaredId = raw.id != null ? String(raw.id) : "";
  const questionId = declaredId || record.id;

  const difficultyCanon = mapDifficultyToCanonical(
    String(record.difficulty || params.difficulty || raw.minLevel || raw.maxLevel || "")
  );

  let suggestedSubskill = record.subskillId;
  if (!suggestedSubskill) {
    if (params.conceptTag) suggestedSubskill = `sci_sub_${slugTag(String(params.conceptTag))}`;
    else suggestedSubskill = `sci_${slugTag(topic)}_general`;
  }

  const cognitiveLevel = inferScienceCognitiveLevel(params, String(record.difficulty || ""));

  /** @type {string[]} */
  let expectedErrorTypes = [];
  const rawTags =
    (Array.isArray(params.expectedErrorTags) && params.expectedErrorTags) ||
    (Array.isArray(raw.expectedErrorTags) && raw.expectedErrorTags) ||
    [];
  if (rawTags.length > 0) {
    expectedErrorTypes = normalizeErrorTags(rawTags.map(String));
  } else if (topic === "experiments") {
    expectedErrorTypes = ["strategy_error", "reading_comprehension_error", "concept_confusion"];
  } else if (topic === "earth_space" || topic === "environment") {
    expectedErrorTypes = ["concept_confusion", "vocabulary_confusion", "misconception"];
  } else {
    expectedErrorTypes = ["misconception", "concept_confusion", "careless_error"];
  }

  const prereq = suggestPrerequisiteScience(raw, record);
  const classification = classifyScienceConfidenceAndReview(raw, record, prereq);

  const suggested = {
    skillId: record.skillId,
    subskillId: suggestedSubskill,
    difficulty: difficultyCanon,
    cognitiveLevel,
    expectedErrorTypes,
    prerequisiteSkillIds: prereq.ids,
  };

  const current = {
    skillId: record.skillId,
    subskillId: record.subskillId || null,
    difficulty: record.difficulty,
    cognitiveLevel: record.cognitiveLevel,
    expectedErrorTypes: record.expectedErrorTypes || [],
    prerequisiteSkillIds: record.prerequisiteSkillIds || [],
  };

  const narrativeReason = [
    `Topic ${topic}; scanner skill ${record.skillId}.`,
    prereq.reason,
    params.probePower ? `probePower=${params.probePower} mapped to cognitive tier.` : "No probePower - cognitive tier inferred from difficulty.",
  ].join(" ");

  return {
    questionId,
    sourceFile: SOURCE_FILE,
    subject: "science",
    topic,
    objectPath: `${SOURCE_FILE}::${declaredId || `#${seqIndex}`}`,
    current,
    suggested,
    confidence: classification.confidence,
    confidenceReasons: classification.confidenceReasons,
    reviewPriority: classification.reviewPriority,
    sequentialPrereqHeuristic: classification.sequentialPrereqHeuristic,
    reason: narrativeReason,
    needsHumanReview: true,
  };
}

/**
 * @returns {{ suggestions: object[], scienceCount: number, fieldHistogram: Record<string, number> }}
 */
export function generateScienceSuggestions() {
  /** @type {object[]} */
  const suggestions = [];
  /** @type {Record<string, number>} */
  const fieldHistogram = {
    subskillId: 0,
    cognitiveLevel: 0,
    expectedErrorTypes: 0,
    prerequisiteSkillIds: 0,
    difficulty: 0,
  };

  let i = 0;
  for (const raw of SCIENCE_QUESTIONS) {
    const record = buildScanRecord(
      /** @type {Record<string, unknown>} */ (raw),
      SOURCE_FILE,
      String(raw.id || `row_${i}`),
      "science",
      i
    );
    const sug = buildScienceEnrichmentSuggestion(
      /** @type {Record<string, unknown>} */ (raw),
      record,
      i
    );
    suggestions.push(sug);

    const cur = sug.current;
    const s = sug.suggested;
    if ((cur.subskillId || "") !== (s.subskillId || "")) fieldHistogram.subskillId += 1;
    if ((cur.cognitiveLevel || "") !== (s.cognitiveLevel || "")) fieldHistogram.cognitiveLevel += 1;
    if ((cur.expectedErrorTypes || []).join(",") !== (s.expectedErrorTypes || []).join(","))
      fieldHistogram.expectedErrorTypes += 1;
    if ((cur.prerequisiteSkillIds || []).join(",") !== (s.prerequisiteSkillIds || []).join(","))
      fieldHistogram.prerequisiteSkillIds += 1;
    if ((cur.difficulty || "") !== (s.difficulty || "")) fieldHistogram.difficulty += 1;
    i += 1;
  }

  return { suggestions, scienceCount: SCIENCE_QUESTIONS.length, fieldHistogram };
}
