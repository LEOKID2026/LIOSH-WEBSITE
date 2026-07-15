/**
 * Proposal-only geometry conceptual metadata hints (does not write banks).
 */
import { GEOMETRY_CONCEPTUAL_ITEMS } from "../geometry-conceptual-bank.js";

import { buildScanRecord } from "./question-metadata-scanner.js";
import { classifyGeometryConfidenceAndReview } from "./geometry-enrichment-review-pack.js";
import {
  EXTENDED_EXPECTED_ERROR_TYPES,
  inferGeometryCognitiveLevel,
  mapDifficultyToCanonical,
} from "./question-metadata-taxonomy.js";

const SOURCE_FILE = "utils/geometry-conceptual-bank.js";

/**
 * Pick a representative difficulty label from template row (conceptual bank uses `levels` bands).
 * @param {Record<string, unknown>} raw
 */
function pickTemplateDifficultyLabel(raw) {
  const lv = raw.levels;
  if (Array.isArray(lv) && lv.length > 0) return String(lv[0]);
  return "";
}

/**
 * @param {Record<string, unknown>} raw
 */
function normalizeGeometryErrorTags(raw) {
  const tags = Array.isArray(raw.expectedErrorTags) ? raw.expectedErrorTags.map(String) : [];
  const df = String(raw.distractorFamily || "");

  /** @type {string[]} */
  const out = [];
  for (const t of tags) {
    const x = t.trim();
    if (!x) continue;
    if (EXTENDED_EXPECTED_ERROR_TYPES.has(x)) out.push(x);
    else out.push("concept_confusion");
  }

  if (df.includes("measure")) {
    out.push("measurement_error", "concept_confusion");
  }
  if (df.includes("wrong_formula")) {
    out.push("formula_selection_error");
  }
  if (df.includes("comparison")) {
    out.push("visual_reasoning_error");
  }
  if (df.includes("angle")) {
    out.push("concept_confusion");
  }

  const uniq = [...new Set(out)].filter(Boolean);
  return uniq.length ? uniq : ["concept_confusion", "careless_error"];
}

/**
 * Conservative prerequisite hints — authors validate against curriculum.
 * @param {Record<string, unknown>} raw
 * @param {object} record
 */
function suggestPrerequisiteGeometry(raw, record) {
  const ds = String(raw.diagnosticSkillId || "").trim();
  const skill = String(record.skillId || "");

  if (ds === "geo_rect_area_plan" || skill === "geo_rect_area_plan") {
    return {
      ids: ["geo_pv_area_vs_perimeter"],
      confidence: "high",
      reason: "Rectangle area planning assumes distinguishing area vs perimeter in context.",
    };
  }

  if (skill === "tri_sum_180_late") {
    return {
      ids: ["tri_sum_180"],
      confidence: "medium",
      reason: "Late-band triangle angle-sum row extends the same principle - confirm sequencing before enforcing.",
    };
  }

  return {
    ids: [],
    confidence: "medium",
    reason: "No automated prerequisite chain for this template - curriculum authors map explicitly.",
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record
 * @param {number} seqIndex
 */
export function buildGeometryEnrichmentSuggestion(raw, record, seqIndex) {
  const templateDiff = pickTemplateDifficultyLabel(raw);
  const baseDiff = templateDiff || String(record.difficulty || "");
  const difficultyCanon = mapDifficultyToCanonical(baseDiff || "medium");

  const cognitiveLevel = inferGeometryCognitiveLevel(raw, baseDiff || String(record.difficulty || ""));

  const expectedErrorTypes = normalizeGeometryErrorTags(raw);
  const prereq = suggestPrerequisiteGeometry(raw, record);
  const classification = classifyGeometryConfidenceAndReview(raw, record, prereq);

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
    subject: "geometry",
    objectPath: `${SOURCE_FILE}::GEOMETRY_CONCEPTUAL_ITEMS[${seqIndex}]`,
    current,
    suggested,
    confidence: classification.confidence,
    confidenceReasons: classification.confidenceReasons,
    reviewPriority: classification.reviewPriority,
    needsHumanReview: true,
  };
}

/**
 * @returns {{ suggestions: object[], geometryCount: number, fieldHistogram: Record<string, number> }}
 */
export function generateGeometrySuggestions() {
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
  for (const raw of GEOMETRY_CONCEPTUAL_ITEMS) {
    const record = buildScanRecord(
      /** @type {Record<string, unknown>} */ (raw),
      SOURCE_FILE,
      `GEOMETRY_CONCEPTUAL_ITEMS[${i}]`,
      "geometry",
      i
    );
    const sug = buildGeometryEnrichmentSuggestion(/** @type {Record<string, unknown>} */ (raw), record, i);
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

  return { suggestions, geometryCount: GEOMETRY_CONCEPTUAL_ITEMS.length, fieldHistogram };
}
