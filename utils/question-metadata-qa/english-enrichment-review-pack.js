/**
 * English static pools — enrichment review pack (aggregates suggestions only).
 */
import { ENGLISH_SKILL_IDS } from "./question-metadata-taxonomy-english.js";

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record
 * @param {{ ids: string[], confidence: string, reason: string }} prereq
 * @param {string} poolBucketKey
 */
export function classifyEnglishConfidenceAndReview(raw, record, prereq, poolBucketKey) {
  const skill = record.skillId || "";
  const skillOk = ENGLISH_SKILL_IDS.has(skill);
  const tags = Array.isArray(raw.expectedErrorTags)
    ? raw.expectedErrorTags.map(String)
    : Array.isArray(raw.expectedErrorTypes)
      ? raw.expectedErrorTypes.map(String)
      : [];
  const hasDiag = !!String(raw.diagnosticSkillId || "").trim();
  const structured =
    hasDiag ||
    tags.length > 0 ||
    !!String(raw.patternFamily || "").trim() ||
    !!String(raw.conceptTag || "").trim() ||
    !!poolBucketKey;

  /** @type {string[]} */
  const confidenceReasons = [];

  if (prereq.ids.length > 0) {
    confidenceReasons.push(prereq.reason);
  }

  if (structured && skillOk && hasDiag) {
    confidenceReasons.push("Row carries diagnosticSkillId and taxonomy-known scanner skillId.");
    if (tags.length > 0) confidenceReasons.push("expected error tags/types present.");
    if (raw.probePower) confidenceReasons.push("probePower supports cognitive mapping.");
    return finalize("high", confidenceReasons);
  }

  if (structured && skillOk) {
    confidenceReasons.push("Pattern / concept metadata present with known skill id (pool bucket or patternFamily).");
    return finalize("medium", confidenceReasons);
  }

  if (!skillOk) confidenceReasons.push("skillId outside English allowlist - needs expert mapping.");
  if (!structured) confidenceReasons.push("Sparse diagnostic metadata - heuristic suggestion.");
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
export function buildEnglishReviewPack(enrichmentPayload) {
  const suggestions = enrichmentPayload.suggestions || [];
  const conf = enrichmentPayload.summary?.confidenceBreakdown || countConfidences(suggestions);
  const rp = enrichmentPayload.summary?.reviewPriorityBreakdown || countReviewPriorities(suggestions);

  const bySkill = summarizeByKey(suggestions, (s) => s.suggested?.skillId || "__missing_skill__");
  const bySub = summarizeByKey(suggestions, (s) => s.suggested?.subskillId || "__missing_subskill__");

  const diffHist = {};
  const cogHist = {};
  const errHist = {};
  const prereqHist = {};
  const skillHist = {};
  const subHist = {};

  for (const s of suggestions) {
    const d = s.suggested?.difficulty || "(none)";
    diffHist[d] = (diffHist[d] || 0) + 1;
    const c = s.suggested?.cognitiveLevel || "(none)";
    cogHist[c] = (cogHist[c] || 0) + 1;
    const e = (s.suggested?.expectedErrorTypes || []).join(", ") || "(none)";
    errHist[e] = (errHist[e] || 0) + 1;
    const p = (s.suggested?.prerequisiteSkillIds || []).join(" > ") || "(empty)";
    prereqHist[p] = (prereqHist[p] || 0) + 1;
    const sk = s.suggested?.skillId || "(none)";
    skillHist[sk] = (skillHist[sk] || 0) + 1;
    const su = s.suggested?.subskillId || "(none)";
    subHist[su] = (subHist[su] || 0) + 1;
  }

  const lowConfidence = suggestions.filter((s) => s.confidence === "low");
  const highReviewPri = suggestions.filter((s) => s.reviewPriority === "high");

  const prerequisiteSuggestionCount = suggestions.filter(
    (s) => Array.isArray(s.suggested?.prerequisiteSkillIds) && s.suggested.prerequisiteSkillIds.length > 0
  ).length;

  const checklist = {
    approveAsIs:
      "Use only for rows with confidence **high**, reviewPriority **low**, after spot-checking English stem/options alignment.",
    editMetadata:
      "Adjust suggested metadata in the bank - **do not** change English wording, options, or correct answers without curriculum approval.",
    rejectSuggestion:
      "Discard when taxonomy mapping conflicts with classroom sequencing or diagnostic routing.",
    needsCurriculumExpert:
      "Required for **low** confidence rows and any prerequisite graph changes affecting reports.",
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      enrichmentPath: "reports/question-metadata-qa/english-enrichment-suggestions.json",
      enrichmentGeneratedAt: enrichmentPayload.generatedAt || null,
    },
    summary: {
      englishRowCount: suggestions.length,
      rowsBySourceFile: enrichmentPayload.scope?.rowsBySourceFile || {},
      prerequisiteSuggestionCount,
      confidenceBreakdown: conf,
      reviewPriorityBreakdown: rp,
      lowConfidenceCount: lowConfidence.length,
      highReviewPriorityCount: highReviewPri.length,
    },
    groupedBySuggestedSkillId: mapGroupStats(bySkill),
    groupedBySuggestedSubskillId: mapGroupStats(bySub),
    suggestedSkillIdSummary: sortHist(skillHist),
    suggestedSubskillIdSummary: sortHist(subHist),
    suggestedDifficultySummary: sortHist(diffHist),
    suggestedCognitiveLevelSummary: sortHist(cogHist),
    suggestedExpectedErrorTypesSummary: sortHist(errHist),
    prerequisiteSuggestionSummary: sortHist(prereqHist),
    examplesLowConfidence: lowConfidence.slice(0, 12).map((s) => s.questionId),
    examplesHighReviewPriority: highReviewPri.slice(0, 12).map((s) => s.questionId),
    checklist,
  };
}
