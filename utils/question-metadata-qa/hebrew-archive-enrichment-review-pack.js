/**
 * Hebrew archive banks — enrichment review pack builder (does not modify banks).
 */

/**
 * @param {object[]} suggestions
 * @param {(s: object) => string} keyFn
 */
export function summarizeArchiveByKey(suggestions, keyFn) {
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
 * @param {{ loadErrors?: { path: string, error: string }[] }} opts
 */
export function buildHebrewArchiveReviewPack(enrichmentPayload, opts = {}) {
  const suggestions = enrichmentPayload.suggestions || [];
  const loadErrors = opts.loadErrors || [];
  const conf = enrichmentPayload.summary?.confidenceBreakdown || countConfidences(suggestions);
  const rp = enrichmentPayload.summary?.reviewPriorityBreakdown || countReviewPriorities(suggestions);

  const bySkill = summarizeArchiveByKey(suggestions, (s) => s.suggested?.skillId || "__missing_skill__");
  const bySub = summarizeArchiveByKey(suggestions, (s) => s.suggested?.subskillId || "__missing_subskill__");

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

  const lowConfidence = suggestions.filter((s) => s.confidence === "low");
  const highReviewPri = suggestions.filter((s) => s.reviewPriority === "high");

  const prerequisiteSuggestionCount = suggestions.filter(
    (s) => Array.isArray(s.suggested?.prerequisiteSkillIds) && s.suggested.prerequisiteSkillIds.length > 0
  ).length;

  const rowsByGradeFile = enrichmentPayload.scope?.rowCountByFile || {};

  const checklist = {
    approveAsIs:
      "Use for rows with confidence **high** and reviewPriority **low** after spot-checking suggested skill/category alignment.",
    editMetadata:
      "Adjust suggested difficulty / cognitive / error families in the bank - **do not** change Hebrew stems, options, or correct indices without curriculum approval.",
    rejectSuggestion:
      "Discard when domain mapping conflicts with intended literacy strand or report routing.",
    needsCurriculumExpert:
      "Required for **low** confidence rows, load errors, or prerequisite policy changes.",
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      enrichmentPath: "reports/question-metadata-qa/hebrew-archive-enrichment-suggestions.json",
      enrichmentGeneratedAt: enrichmentPayload.generatedAt || null,
    },
    summary: {
      archiveRowTotal: suggestions.length,
      rowsByGradeFile,
      prerequisiteSuggestionCount,
      confidenceBreakdown: conf,
      reviewPriorityBreakdown: rp,
      lowConfidenceCount: lowConfidence.length,
      highReviewPriorityCount: highReviewPri.length,
      loadErrorsCount: loadErrors.length,
    },
    loadErrors,
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
      objectPath: s.objectPath,
    })),
    highReviewPrioritySuggestions: highReviewPri.map((s) => ({
      questionId: s.questionId,
      confidence: s.confidence,
      reviewPriority: s.reviewPriority,
      confidenceReasons: s.confidenceReasons,
      objectPath: s.objectPath,
    })),
    needsHumanReviewNote: "All suggestions keep needsHumanReview=true until bank edits are approved.",
    checklist,
  };
}
