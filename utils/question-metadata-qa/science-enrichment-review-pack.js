/**
 * Science-only enrichment review pack (aggregates suggestions + QA artifacts).
 * Does not modify question banks.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXTENDED_EXPECTED_ERROR_TYPES,
  SCIENCE_SKILL_IDS,
  SCIENCE_TOPIC_ORDER,
} from "./question-metadata-taxonomy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

/**
 * @param {Record<string, unknown>} params
 */
export function hasStructuredScienceParams(params) {
  return !!(
    params.diagnosticSkillId ||
    params.conceptTag ||
    params.patternFamily ||
    params.expectedErrorTags ||
    params.probePower
  );
}

/**
 * Sequential-topic prerequisite heuristic (pedagogically unverified).
 * @param {{ confidence: string, ids: string[] }} prereq
 */
export function isSequentialTopicPrerequisite(prereq) {
  return prereq.confidence === "low" && prereq.ids.length > 0;
}

/**
 * @typedef {{
 *   confidence: "high"|"medium"|"low",
 *   confidenceReasons: string[],
 *   reviewPriority: "low"|"medium"|"high",
 *   sequentialPrereqHeuristic: boolean
 * }} Classification
 */

/**
 * @param {Record<string, unknown>} raw
 * @param {object} record — scan record
 * @param {{ ids: string[], confidence: string, reason: string }} prereq
 */
export function classifyScienceConfidenceAndReview(raw, record, prereq) {
  const params =
    raw.params && typeof raw.params === "object" ? /** @type {Record<string, unknown>} */ (raw.params) : {};
  const topic = String(raw.topic || "").trim();
  const skill = record.skillId || "";

  const rawErrTags =
    (Array.isArray(params.expectedErrorTags) && params.expectedErrorTags) ||
    (Array.isArray(raw.expectedErrorTags) && raw.expectedErrorTags) ||
    [];

  /** @type {string[]} */
  const confidenceReasons = [];

  const sequential = isSequentialTopicPrerequisite(prereq);
  if (sequential) {
    confidenceReasons.push(
      "Prerequisite suggestion uses sequential-topic heuristic (SCIENCE_TOPIC_ORDER); treat as unverified pedagogy."
    );
  }

  const structuredCore = !!(params.diagnosticSkillId || params.conceptTag || params.patternFamily);
  const structuredTags = rawErrTags.length > 0;
  const structured = structuredCore || structuredTags;

  const topicDeterministic = SCIENCE_TOPIC_ORDER.includes(topic);
  const skillOk = SCIENCE_SKILL_IDS.has(skill);

  const hasCoreRowQuality = !!(record.difficulty && record.hasCorrectAnswer && record.hasExplanation);

  /** LOW: sequential heuristic dominates */
  if (sequential) {
    confidenceReasons.push(
      "Overall confidence capped at low because inferred prerequisites are sequential guesses, not curriculum-approved links."
    );
    return finalize("low", confidenceReasons, sequential);
  }

  /** HIGH: explicit structured metadata drives the suggestion */
  if (structured && skillOk) {
    if (params.diagnosticSkillId) confidenceReasons.push("Row params include diagnosticSkillId.");
    if (params.conceptTag) confidenceReasons.push("Row params include conceptTag.");
    if (params.patternFamily) confidenceReasons.push("Row params include patternFamily.");
    if (rawErrTags.length > 0) confidenceReasons.push("Row params include expectedErrorTags.");
    if (params.probePower) confidenceReasons.push("Row params include probePower (supports cognitive mapping).");
    if (prereq.confidence === "high" && prereq.ids.length > 0) {
      confidenceReasons.push("Prerequisite uses explicit high-confidence curriculum link (e.g. respiration → body recall).");
    }
    return finalize("high", confidenceReasons, false);
  }

  /** MEDIUM: deterministic topic + solid stem metadata, no risky prereq chain */
  if (topicDeterministic && skillOk && hasCoreRowQuality) {
    confidenceReasons.push(`Topic "${topic}" maps deterministically to skillId "${skill}".`);
    confidenceReasons.push("Difficulty, correct answer, and explanation are present on the row.");
    if (prereq.ids.length === 0) {
      confidenceReasons.push("Prerequisite list empty or explicitly non-sequential - subskill/cognitive/error fills are template-driven.");
    } else if (prereq.confidence === "medium") {
      confidenceReasons.push("Prerequisite slot deferred to authors (no sequential heuristic applied).");
    }
    confidenceReasons.push(
      "Suggested subskill/cognitive/error families use topic templates - review wording against Hebrew stems if applying."
    );
    return finalize("medium", confidenceReasons, false);
  }

  /** LOW: weak or incomplete signals */
  if (!topicDeterministic || !skillOk) {
    confidenceReasons.push("Topic or skillId mapping is outside the standard science topic/diagnostic allowlist - needs expert mapping.");
  }
  if (!record.difficulty) confidenceReasons.push("Missing normalized difficulty on scanned row.");
  if (!record.hasCorrectAnswer) confidenceReasons.push("Missing detectable correct answer metadata.");
  if (!record.hasExplanation) confidenceReasons.push("Missing explanation / theory lines - harder to validate misconception routing.");
  return finalize("low", confidenceReasons, false);
}

/**
 * @param {"high"|"medium"|"low"} confidence
 * @param {string[]} confidenceReasons
 * @param {boolean} sequential
 */
function finalize(confidence, confidenceReasons, sequential) {
  /** @type {"low"|"medium"|"high"} */
  let reviewPriority = "medium";
  if (confidence === "low" || sequential) reviewPriority = "high";
  else if (confidence === "high") reviewPriority = "low";
  else reviewPriority = "medium";

  return {
    confidence,
    confidenceReasons: [...new Set(confidenceReasons)],
    reviewPriority,
    sequentialPrereqHeuristic: sequential,
  };
}

/**
 * Load enrichment JSON from disk (must match generator output shape).
 * @param {string} absPath
 */
export async function loadEnrichmentSuggestionsJson(absPath) {
  const txt = await readFile(absPath, "utf8");
  return JSON.parse(txt);
}

/**
 * Extract tokens present on rows that are not in EXTENDED_EXPECTED_ERROR_TYPES.
 * @param {object} questionsPayload — questions-with-issues.json parsed
 */
/** Rows with scanner flag taxonomy_unknown_expected_error_type (may share tokens). */
export function countTaxonomyUnknownExpectedErrorRows(questionsPayload) {
  const questions = questionsPayload.questions || [];
  return questions.filter((q) => (q.issues || []).includes("taxonomy_unknown_expected_error_type")).length;
}

export function extractUnknownExpectedErrorTokens(questionsPayload) {
  const questions = questionsPayload.questions || [];
  /** @type {Map<string, { count: number, examples: { questionId: string, sourceFile: string, declaredId: string | null }[] }>} */
  const byToken = new Map();

  for (const q of questions) {
    const issues = q.issues || [];
    if (!issues.includes("taxonomy_unknown_expected_error_type")) continue;

    const types = q.expectedErrorTypes || [];
    const declaredId = q.declaredId || null;
    const syntheticId = q.id || "";
    const questionId = declaredId || syntheticId.split("::").pop()?.replace(/^#/, "") || syntheticId;
    const sourceFile = q.sourceFile || "";

    for (const t of types) {
      const tok = String(t).trim();
      if (!tok || EXTENDED_EXPECTED_ERROR_TYPES.has(tok)) continue;

      const cur = byToken.get(tok) || { count: 0, examples: [] };
      cur.count += 1;
      if (cur.examples.length < 8) {
        cur.examples.push({ questionId, sourceFile, declaredId });
      }
      byToken.set(tok, cur);
    }
  }

  return [...byToken.entries()]
    .map(([token, v]) => ({ token, count: v.count, examples: v.examples }))
    .sort((a, b) => b.count - a.count);
}

/**
 * @param {object[]} suggestions — enrichment suggestion rows
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

/**
 * @param {object} enrichmentPayload
 * @param {{ token: string, count: number, examples: object[] }[]} unknownTokens
 * @param {{ taxonomyUnknownIssueRowCount?: number|null, taxonomyUnknownIssueGlobalCount?: number|null }} meta
 */
export function buildScienceReviewPack(enrichmentPayload, unknownTokens, meta = {}) {
  const suggestions = enrichmentPayload.suggestions || [];
  const conf = enrichmentPayload.summary?.confidenceBreakdown || countConfidences(suggestions);
  const rp = countReviewPriorities(suggestions);

  const bySkill = summarizeByKey(suggestions, (s) => s.suggested?.skillId || s.current?.skillId);
  const byTopic = summarizeByKey(suggestions, (s) => (s.topic ? String(s.topic) : "__missing_topic__"));

  const bySubskill = summarizeByKey(suggestions, (s) => s.suggested?.subskillId || "__missing__");

  const prereqHist = {};
  for (const s of suggestions) {
    const k = (s.suggested?.prerequisiteSkillIds || []).join(" > ") || "(empty)";
    prereqHist[k] = (prereqHist[k] || 0) + 1;
  }

  const errHist = {};
  for (const s of suggestions) {
    const k = (s.suggested?.expectedErrorTypes || []).join(", ") || "(none)";
    errHist[k] = (errHist[k] || 0) + 1;
  }

  const lowConfidence = suggestions.filter((s) => s.confidence === "low");
  const highReviewPri = suggestions.filter((s) => s.reviewPriority === "high");

  /** Examples per group — capped */
  const examplesBySkill = {};
  for (const [k, arr] of Object.entries(bySkill)) {
    examplesBySkill[k] = arr.slice(0, 5).map((x) => x.questionId);
  }

  const checklist = {
    approveAsIs:
      "Use only for rows with confidence **high**, reviewPriority **low**, after spot-checking Hebrew stem alignment.",
    editMetadata:
      "Adjust suggested subskill/cognitive/error/prerequisite ids in the bank JSON - **do not** change stems without curriculum approval.",
    rejectSuggestion:
      "Discard automated suggestion when taxonomy mapping conflicts with classroom sequencing or engine routing.",
    needsCurriculumExpert:
      "Required for all **low** confidence rows, sequential prerequisite chains, and any prerequisite graph change affecting reports.",
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      enrichmentPath: "reports/question-metadata-qa/enrichment-suggestions.json",
      enrichmentGeneratedAt: enrichmentPayload.generatedAt || null,
    },
    summary: {
      scienceSuggestionCount: suggestions.length,
      confidenceBreakdown: conf,
      reviewPriorityBreakdown: rp,
      sequentialPrereqHeuristicCount: suggestions.filter((s) => s.sequentialPrereqHeuristic).length,
      lowConfidenceCount: lowConfidence.length,
      highReviewPriorityCount: highReviewPri.length,
    },
    groupedBySkillId: mapGroupStats(bySkill),
    groupedByTopic: mapGroupStats(byTopic),
    groupedBySuggestedSubskillId: mapGroupStats(bySubskill),
    prerequisiteSuggestionSummary: sortHist(prereqHist),
    expectedErrorTypesSuggestionSummary: sortHist(errHist),
    examplesBySkillId: examplesBySkill,
    lowConfidenceSuggestions: lowConfidence.map((s) => ({
      questionId: s.questionId,
      confidence: s.confidence,
      reviewPriority: s.reviewPriority,
      confidenceReasons: s.confidenceReasons,
      sequentialPrereqHeuristic: s.sequentialPrereqHeuristic,
    })),
    highReviewPrioritySuggestions: highReviewPri.map((s) => ({
      questionId: s.questionId,
      confidence: s.confidence,
      reviewPriority: s.reviewPriority,
      confidenceReasons: s.confidenceReasons,
    })),
    needsHumanReviewNote: "All suggestions keep needsHumanReview=true until bank edits are approved.",
    taxonomyUnknownExpectedErrorTokens: unknownTokens,
    taxonomyUnknownExpectedErrorIssueRowCount: meta.taxonomyUnknownIssueRowCount ?? null,
    taxonomyUnknownExpectedErrorIssueGlobalCount: meta.taxonomyUnknownIssueGlobalCount ?? null,
    checklist,
  };
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

export { ROOT };
