/**
 * Geometry-only enrichment review pack (aggregates geometry suggestions).
 * Does not modify question banks.
 */
import { GEOMETRY_SKILL_IDS } from "./question-metadata-taxonomy.js";

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record — scan record
 * @param {{ ids: string[], confidence: string, reason: string }} prereq
 */
export function classifyGeometryConfidenceAndReview(raw, record, prereq) {
  const skill = record.skillId || "";
  const skillOk = GEOMETRY_SKILL_IDS.has(skill);
  const tags = Array.isArray(raw.expectedErrorTags) ? raw.expectedErrorTags.map(String) : [];
  const hasDiag = !!String(raw.diagnosticSkillId || "").trim();
  const structured =
    hasDiag || tags.length > 0 || !!String(raw.distractorFamily || "").trim() || !!String(raw.patternFamily || "").trim();

  /** @type {string[]} */
  const confidenceReasons = [];

  if (prereq.confidence === "medium" && prereq.ids.length > 0) {
    confidenceReasons.push(prereq.reason);
  }

  if (structured && skillOk && hasDiag) {
    confidenceReasons.push("Row carries diagnosticSkillId and taxonomy-known scanner skillId.");
    if (tags.length > 0) confidenceReasons.push("expectedErrorTags present on template.");
    if (raw.distractorFamily) confidenceReasons.push("distractorFamily supports misconception routing.");
    return finalize("high", confidenceReasons);
  }

  if (structured && skillOk) {
    confidenceReasons.push("Pattern/subtype/concept metadata present with known skill id.");
    return finalize("medium", confidenceReasons);
  }

  if (!skillOk) {
    confidenceReasons.push("skillId from scanner is outside geometry allowlist - needs expert mapping.");
  }
  if (!structured) {
    confidenceReasons.push("Sparse diagnostic metadata on template - suggestion is heuristic.");
  }
  return finalize("low", confidenceReasons);
}

/**
 * @param {"high"|"medium"|"low"} confidence
 * @param {string[]} confidenceReasons
 */
function finalize(confidence, confidenceReasons) {
  /** @type {"low"|"medium"|"high"} */
  let reviewPriority = "medium";
  if (confidence === "low") reviewPriority = "high";
  else if (confidence === "high") reviewPriority = "low";

  return {
    confidence,
    confidenceReasons: [...new Set(confidenceReasons)],
    reviewPriority,
  };
}

/**
 * @param {object[]} suggestions
 * @param {(s: object) => string} keyFn
 */
export function summarizeByKey(suggestions, keyFn) {
  /** @type {Map<string, object[]>} */
  const m = new Map();
  for (const s of suggestions) {
    const k = keyFn(s) || "__unknown__";
    const arr = m.get(k) || [];
    arr.push(s);
    m.set(k, arr);
  }
  return Object.fromEntries([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function mapGroupStats(/** @type {Record<string, object[]>} */ byKey) {
  /** @type {Record<string, { count: number, exampleQuestionIds: string[] }>} */
  const out = {};
  for (const [k, arr] of Object.entries(byKey)) {
    out[k] = {
      count: arr.length,
      exampleQuestionIds: arr.slice(0, 6).map((x) => x.questionId),
    };
  }
  return out;
}

function sortHist(/** @type {Record<string, number>} */ h) {
  return Object.entries(h)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern, count]) => ({ pattern, count }));
}

function countConfidences(suggestions) {
  const o = { high: 0, medium: 0, low: 0 };
  for (const s of suggestions) {
    const c = s.confidence;
    if (o[c] !== undefined) o[c] += 1;
  }
  return o;
}

function countReviewPriorities(suggestions) {
  const o = { high: 0, medium: 0, low: 0 };
  for (const s of suggestions) {
    const c = s.reviewPriority;
    if (o[c] !== undefined) o[c] += 1;
  }
  return o;
}

/**
 * @param {object} enrichmentPayload
 */
export function buildGeometryReviewPack(enrichmentPayload) {
  const suggestions = enrichmentPayload.suggestions || [];
  const conf = enrichmentPayload.summary?.confidenceBreakdown || countConfidences(suggestions);
  const rp = enrichmentPayload.summary?.reviewPriorityBreakdown || countReviewPriorities(suggestions);

  const bySkill = summarizeByKey(suggestions, (s) => s.current?.skillId || "__missing_skill__");
  const bySub = summarizeByKey(suggestions, (s) => s.current?.subskillId || "__missing_subskill__");

  const diffHist = {};
  const cogHist = {};
  const errHist = {};
  const prereqHist = {};

  for (const s of suggestions) {
    const d = s.suggested?.difficulty || "(none)";
    diffHist[d] = (diffHist[d] || 0) + 1;
    const c = s.suggested?.cognitiveLevel || "(none)";
    cogHist[c] = (cogHist[c] || 0) + 1;
    const e = (s.suggested?.expectedErrorTypes || []).join(", ") || "(none)";
    errHist[e] = (errHist[e] || 0) + 1;
    const p = (s.suggested?.prerequisiteSkillIds || []).join(" > ") || "(empty)";
    prereqHist[p] = (prereqHist[p] || 0) + 1;
  }

  const lowConfidence = suggestions.filter((/** @type {{ confidence: string }} */ s) => s.confidence === "low");
  const highReviewPri = suggestions.filter((/** @type {{ reviewPriority: string }} */ s) => s.reviewPriority === "high");

  const prerequisiteSuggestionCount = suggestions.filter(
    (s) => Array.isArray(s.suggested?.prerequisiteSkillIds) && s.suggested.prerequisiteSkillIds.length > 0
  ).length;

  const checklist = {
    approveAsIs:
      "Use only for rows with confidence **high**, reviewPriority **low**, after verifying Hebrew stem alignment and classroom sequencing.",
    editMetadata:
      "Adjust suggested difficulty / cognitive / error / prerequisite ids in the bank JSON - **do not** change stems or answers without curriculum approval.",
    rejectSuggestion:
      "Discard automated suggestion when taxonomy mapping conflicts with geometry progression or engine routing.",
    needsCurriculumExpert:
      "Required for **low** confidence rows, prerequisite graph changes, and any edits affecting diagnostic interpretation.",
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      enrichmentPath: "reports/question-metadata-qa/geometry-enrichment-suggestions.json",
      enrichmentGeneratedAt: enrichmentPayload.generatedAt || null,
    },
    summary: {
      geometryRowCount: suggestions.length,
      prerequisiteSuggestionCount,
      confidenceBreakdown: conf,
      reviewPriorityBreakdown: rp,
      lowConfidenceCount: lowConfidence.length,
      highReviewPriorityCount: highReviewPri.length,
    },
    groupedBySkillId: mapGroupStats(bySkill),
    groupedBySubskillId: mapGroupStats(bySub),
    suggestedDifficultySummary: sortHist(diffHist),
    suggestedCognitiveLevelSummary: sortHist(cogHist),
    suggestedExpectedErrorTypesSummary: sortHist(errHist),
    prerequisiteSuggestionSummary: sortHist(prereqHist),
    examplesBySkillId: Object.fromEntries(
      Object.entries(mapGroupStats(bySkill)).map(([k, v]) => [k, v.exampleQuestionIds])
    ),
    examplesBySubskillId: Object.fromEntries(
      Object.entries(mapGroupStats(bySub)).map(([k, v]) => [k, v.exampleQuestionIds])
    ),
    lowConfidenceSuggestions: lowConfidence.map((s) => ({
      questionId: s.questionId,
      confidence: s.confidence,
      reviewPriority: s.reviewPriority,
      confidenceReasons: s.confidenceReasons,
    })),
    highReviewPrioritySuggestions: highReviewPri.map((s) => ({
      questionId: s.questionId,
      confidence: s.confidence,
      reviewPriority: s.reviewPriority,
      confidenceReasons: s.confidenceReasons,
    })),
    needsHumanReviewNote: "All suggestions keep needsHumanReview=true until bank edits are approved.",
    checklist,
  };
}
