/**
 * Internal Adaptive Planner Preview Pack — summarizes artifact-runner output for human review.
 * Non-live; no question bodies; no student wiring.
 */

import { assertSerializedMetadataLeakFree } from "./adaptive-planner-metadata-context.js";

export const PREVIEW_PACK_VERSION = 1;

/**
 * @param {string} jsonStr
 * @param {string} mdStr
 * @returns {{ ok: boolean, hits?: string[] }}
 */
export function assertPreviewPackLeakFree(jsonStr, mdStr) {
  const blob = `${jsonStr}\n${mdStr}`;
  if (!assertSerializedMetadataLeakFree(jsonStr)) {
    return { ok: false, hits: ["json_failed_assertSerializedMetadataLeakFree"] };
  }
  /** Markdown-only checks (stems/options may appear in prose without JSON key shape) */
  const extra = [
    /\boptions\s*:\s*\[/i,
    /\bcorrectAnswer\b/i,
    /\bcorrectIndex\b/i,
    /\banswers\s*:\s*\[/i,
  ];
  const hits = [];
  for (const p of extra) {
    if (p.test(blob)) hits.push(String(p));
  }
  if (hits.length) return { ok: false, hits };
  return { ok: true };
}

/**
 * @param {object} row — artifact-summary row
 * @returns {object}
 */
function slimExampleRow(row) {
  const si = row?.sourceInfo || {};
  const inp = row?.inputSnapshot || {};
  const out = row?.output || {};
  const mr = si.metadataResolution || {};
  return {
    label: row?.label ?? "",
    relativePath: row?.relativePath ?? "",
    focusUnitIndex: row?.focusUnitIndex ?? 0,
    scenarioId: si.scenarioId ?? "",
    subject: inp.subject ?? "",
    unitDisplayName: si.unitDisplayName ?? "",
    currentSkillId: inp.currentSkillId ?? "",
    currentSubskillId: inp.currentSubskillId ?? "",
    skillAlignmentConfidence: si.skillAlignmentConfidence ?? "",
    skillAlignmentSource: si.skillAlignmentSource ?? "",
    skillAlignmentWarnings: Array.isArray(si.skillAlignmentWarnings) ? si.skillAlignmentWarnings : [],
    metadataResolutionSource: mr.source ?? "",
    metadataSubjectFallback: !!inp.metadataSubjectFallback,
    metadataSkillOnlyFallback: !!inp.metadataSkillOnlyFallback,
    metaLen: inp.metaLen ?? 0,
    skillTaggingIncomplete: !!inp.skillTaggingIncomplete,
    nextAction: out.nextAction ?? "",
    plannerStatus: out.plannerStatus ?? "",
    targetDifficulty: out.targetDifficulty ?? "",
    questionCount: out.questionCount ?? 0,
    targetSkillId: out.targetSkillId ?? "",
    targetSubskillId: out.targetSubskillId ?? "",
    requiresHumanReview: !!out.requiresHumanReview,
    reasonCodes: Array.isArray(out.reasonCodes) ? out.reasonCodes : [],
    warnings: Array.isArray(row?.warnings) ? row.warnings : [],
  };
}

/**
 * @param {object[]} rows
 * @param {(r: object) => boolean} pred
 * @param {number} limit
 */
function pickExamples(rows, pred, limit = 2) {
  const out = [];
  for (const r of rows || []) {
    if (pred(r)) {
      out.push(slimExampleRow(r));
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * @param {object} artifactSummary — parsed artifact-summary.json
 * @param {object} [options]
 * @param {string} [options.sourcePath] — display path of artifact summary
 * @param {number} [options.riskListMax] — cap list lengths
 */
export function buildAdaptivePlannerPreviewPack(artifactSummary, options = {}) {
  const sourcePath = String(options.sourcePath || "reports/adaptive-learning-planner/artifact-summary.json");
  const riskMax = Math.max(10, Math.min(200, Number(options.riskListMax) || 60));

  if (!artifactSummary || typeof artifactSummary !== "object") {
    throw new Error("buildAdaptivePlannerPreviewPack: artifactSummary required");
  }

  const rows = Array.isArray(artifactSummary.rows) ? artifactSummary.rows : [];
  const totalRuns = Number(artifactSummary.plannerInputsBuilt ?? artifactSummary.candidatePayloads ?? rows.length) || rows.length;

  /** Aggregate action table */
  /** @type {Map<string, { count: number }>} */
  const actionMap = new Map();
  for (const r of rows) {
    const out = r?.output || {};
    const inp = r?.inputSnapshot || {};
    const si = r?.sourceInfo || {};
    const mr = si?.metadataResolution || {};
    const key = [
      String(out.nextAction || ""),
      String(out.plannerStatus || ""),
      String(inp.subject || ""),
      String(si.skillAlignmentSource || "none"),
      String(mr.source || "none"),
    ].join("\t");
    if (!actionMap.has(key)) actionMap.set(key, { count: 0, nextAction: out.nextAction, plannerStatus: out.plannerStatus, subject: inp.subject, skillAlignmentSource: si.skillAlignmentSource || "none", metadataResolutionSource: mr.source || "none" });
    actionMap.get(key).count += 1;
  }
  const actionTable = [...actionMap.values()].sort((a, b) => b.count - a.count);

  /** Readiness by subject */
  /** @type {Map<string, { total: number, exactMatch: number, fallback: number, missingMeta: number, needsReview: number, ready: number, caution: number, insufficient: number, humanReviewStatus: number }>} */
  const subj = new Map();
  function ensureS(s) {
    const k = String(s || "unknown");
    if (!subj.has(k)) {
      subj.set(k, {
        total: 0,
        exactMatch: 0,
        fallback: 0,
        missingMeta: 0,
        needsReview: 0,
        ready: 0,
        caution: 0,
        insufficient: 0,
      });
    }
    return subj.get(k);
  }

  for (const r of rows) {
    const inp = r?.inputSnapshot || {};
    const out = r?.output || {};
    const w = r?.warnings || [];
    const s = ensureS(inp.subject);
    s.total += 1;
    const fb = !!inp.metadataSubjectFallback || !!inp.metadataSkillOnlyFallback;
    const metaLen = Number(inp.metaLen) || 0;
    const exact = metaLen > 0 && !inp.metadataSubjectFallback && !inp.metadataSkillOnlyFallback;
    if (exact) s.exactMatch += 1;
    if (fb) s.fallback += 1;
    if (metaLen === 0 || w.includes("availableQuestionMetadata_missing")) s.missingMeta += 1;
    if (out.plannerStatus === "needs_human_review") s.needsReview += 1;
    if (out.plannerStatus === "ready") s.ready += 1;
    if (out.plannerStatus === "caution") s.caution += 1;
    if (out.plannerStatus === "insufficient_data") s.insufficient += 1;
  }

  const readinessBySubject = [...subj.entries()].map(([subjectId, st]) => {
    const t = Math.max(1, st.total);
    const fallbackRate = st.fallback / t;
    const missingRate = st.missingMeta / t;
    const reviewRate = st.needsReview / t;
    /** @type {"ready_for_internal_preview"|"needs_more_alignment"|"blocked_for_live_routing"} */
    let recommendedReadiness = "ready_for_internal_preview";
    if (reviewRate > 0.2) {
      recommendedReadiness = "blocked_for_live_routing";
    } else if (fallbackRate > 0.35 || missingRate > 0.25) {
      recommendedReadiness = "needs_more_alignment";
    }
    return {
      subjectId,
      ...st,
      rates: {
        fallback: Math.round(fallbackRate * 1000) / 1000,
        missingMeta: Math.round(missingRate * 1000) / 1000,
        needsHumanReview: Math.round(reviewRate * 1000) / 1000,
      },
      recommendedReadiness,
    };
  });

  readinessBySubject.sort((a, b) => b.total - a.total);

  const exAdvance = pickExamples(rows, (r) => r?.output?.nextAction === "advance_skill");
  const exPractice = pickExamples(rows, (r) => r?.output?.nextAction === "practice_current");
  const exProbe = pickExamples(rows, (r) => r?.output?.nextAction === "probe_skill");
  const exPause = pickExamples(rows, (r) => r?.output?.nextAction === "pause_collect_more_data");
  const exHuman = pickExamples(rows, (r) => r?.output?.plannerStatus === "needs_human_review");
  const exExact = pickExamples(
    rows,
    (r) =>
      (r?.inputSnapshot?.metaLen || 0) > 0 &&
      !r?.inputSnapshot?.metadataSubjectFallback &&
      !r?.inputSnapshot?.metadataSkillOnlyFallback
  );
  const exFallback = pickExamples(rows, (r) => !!r?.inputSnapshot?.metadataSubjectFallback);
  const exEnglish = pickExamples(
    rows,
    (r) => String(r?.inputSnapshot?.subject || "").toLowerCase() === "english" && !!r?.inputSnapshot?.skillTaggingIncomplete
  );
  const exMissingMeta = pickExamples(
    rows,
    (r) => (r?.warnings || []).includes("availableQuestionMetadata_missing") || (r?.inputSnapshot?.metaLen || 0) === 0
  );

  const subjectFallbackRows = pickExamples(
    rows,
    (r) => !!r?.inputSnapshot?.metadataSubjectFallback,
    riskMax
  );
  const englishUntaggedRows = pickExamples(
    rows,
    (r) => String(r?.inputSnapshot?.subject || "").toLowerCase() === "english" && !!r?.inputSnapshot?.skillTaggingIncomplete,
    riskMax
  );
  const missingMetadataRows = pickExamples(
    rows,
    (r) => (r?.warnings || []).includes("availableQuestionMetadata_missing") || (r?.inputSnapshot?.metaLen || 0) === 0,
    riskMax
  );
  const needsHumanReviewRows = pickExamples(rows, (r) => r?.output?.plannerStatus === "needs_human_review", riskMax);
  const adapterWarningRows = rows.filter((r) => (r?.warnings || []).length > 0).slice(0, riskMax).map(slimExampleRow);

  const safetyViolationCount = Number(artifactSummary.safetyViolationCount ?? 0);
  const needsHumanReviewCount = Number(artifactSummary.needsHumanReviewCount ?? 0);
  const metadataExactMatchCount = Number(artifactSummary.metadataExactMatchCount ?? 0);
  const metadataSubjectFallbackCount = Number(artifactSummary.metadataSubjectFallbackCount ?? 0);
  const afterMissing = Number(artifactSummary.afterAvailableQuestionMetadataMissingCount ?? 0);

  const readyCount = Number(artifactSummary.byPlannerStatus?.ready ?? 0);
  const cautionCount = Number(artifactSummary.byPlannerStatus?.caution ?? 0);

  const recommendation = {
    internalPreviewNow: [
      "Use preview-pack.md to review planner nextAction / plannerStatus mixes on real simulator report artifacts.",
      "Safe to use for internal planning discussions: no live routing, no bank or engine changes.",
    ],
    notLiveYet: [
      "Do not expose planner output as student-facing or parent-facing Hebrew product copy without a dedicated copy layer.",
      "English and missing-metadata rows still require human review before any automated routing.",
    ],
    mustImproveBeforeLive: [
      "Reduce metadataSubjectFallback and availableQuestionMetadata_missing for subjects targeted for automation.",
      "Raise skillAlignmentCoverage for subjects where topic_mapping is insufficient.",
      "Keep safetyViolationCount at 0 in artifact runs before enabling any live integration.",
    ],
  };

  const executiveSummary = {
    totalPlannerRuns: totalRuns,
    safetyViolationCount,
    metadataExactMatchCount,
    metadataSkillSubskillMatchCount: Number(artifactSummary.metadataSkillSubskillMatchCount ?? metadataExactMatchCount),
    metadataSubjectFallbackCount,
    metadataSubjectFallbackBaselineCount: Number(artifactSummary.metadataSubjectFallbackBaselineCount ?? 0),
    afterAvailableQuestionMetadataMissingCount: afterMissing,
    needsHumanReviewCount,
    skillAlignmentCoverage: Number(artifactSummary.skillAlignmentCoverage ?? 0),
    skillAlignmentBySource: artifactSummary.skillAlignmentBySource || {},
    plannerReadyCount: readyCount,
    plannerCautionCount: cautionCount,
    plannerNeedsHumanReviewCount: needsHumanReviewCount,
    englishSkillTaggingIncompleteCount: Number(artifactSummary.englishSkillTaggingIncompleteCount ?? 0),
    generatedAtArtifactSummary: artifactSummary.generatedAt ?? null,
  };

  const pack = {
    version: PREVIEW_PACK_VERSION,
    generatedAt: new Date().toISOString(),
    sourceArtifactSummaryPath: sourcePath,
    executiveSummary,
    actionTable,
    examplesByCategory: {
      advance_skill: exAdvance,
      practice_current: exPractice,
      probe_skill: exProbe,
      pause_collect_more_data: exPause,
      needs_human_review: exHuman,
      exact_skill_subskill_metadata_match: exExact,
      subject_fallback: exFallback,
      english_skill_tagging_incomplete: exEnglish,
      missing_question_metadata: exMissingMeta,
    },
    readinessBySubject,
    riskList: {
      subjectFallbackRows,
      englishUntaggedRows,
      missingMetadataRows,
      needsHumanReviewRows,
      rowsWithAdapterWarnings: adapterWarningRows,
    },
    recommendation,
  };

  return { pack, markdown: buildPreviewMarkdown(pack) };
}

/**
 * @param {object} pack
 */
function buildPreviewMarkdown(pack) {
  const es = pack.executiveSummary;
  const lines = [
    `# Adaptive Planner - Internal Preview Pack`,
    ``,
    `_Non-live artifact. Not student-facing. Generated: **${pack.generatedAt}**_`,
    ``,
    `## A. Executive summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total planner runs | ${es.totalPlannerRuns} |`,
    `| safetyViolationCount | ${es.safetyViolationCount} |`,
    `| metadataExactMatchCount | ${es.metadataExactMatchCount} |`,
    `| metadataSkillSubskillMatchCount | ${es.metadataSkillSubskillMatchCount} |`,
    `| metadataSubjectFallbackCount | ${es.metadataSubjectFallbackCount} |`,
    `| metadataSubjectFallbackBaselineCount | ${es.metadataSubjectFallbackBaselineCount} |`,
    `| afterAvailableQuestionMetadataMissingCount | ${es.afterAvailableQuestionMetadataMissingCount} |`,
    `| needsHumanReviewCount | ${es.needsHumanReviewCount} |`,
    `| skillAlignmentCoverage | ${es.skillAlignmentCoverage} |`,
    `| Planner status - ready / caution | ${es.plannerReadyCount} / ${es.plannerCautionCount} |`,
    `| englishSkillTaggingIncompleteCount | ${es.englishSkillTaggingIncompleteCount} |`,
    ``,
    `### skillAlignmentBySource`,
    ``,
    "```json",
    JSON.stringify(es.skillAlignmentBySource, null, 2),
    "```",
    ``,
    `## B. Planner action table`,
    ``,
    `| Count | nextAction | plannerStatus | subject | skillAlignmentSource | metadataResolutionSource |`,
    `|------:|------------|---------------|---------|----------------------|--------------------------|`,
    ...pack.actionTable.map(
      (r) =>
        `| ${r.count} | ${r.nextAction} | ${r.plannerStatus} | ${r.subject} | ${r.skillAlignmentSource} | ${r.metadataResolutionSource} |`
    ),
    ``,
    `## C. Examples (slim rows - no question bodies)`,
    ``,
  ];

  for (const [title, key] of [
    ["advance_skill", "advance_skill"],
    ["practice_current", "practice_current"],
    ["probe_skill", "probe_skill"],
    ["pause_collect_more_data", "pause_collect_more_data"],
    ["needs_human_review", "needs_human_review"],
    ["Exact metadata match (no subject/skill-only fallback)", "exact_skill_subskill_metadata_match"],
    ["Subject metadata fallback", "subject_fallback"],
    ["English skillTaggingIncomplete", "english_skill_tagging_incomplete"],
    ["Missing question metadata", "missing_question_metadata"],
  ]) {
    const arr = pack.examplesByCategory[key] || [];
    lines.push(`### ${title}`, ``);
    if (!arr.length) lines.push(`_No matching rows in this artifact run._`, ``);
    else lines.push("```json", JSON.stringify(arr, null, 2), "```", ``);
  }

  lines.push(`## D. Readiness by subject`, ``, `| Subject | Runs | Exact | Fallback | Missing meta | needs_human_review | ready | caution | Recommended |`, `|---------|-----:|------:|---------:|-------------:|-------------------:|------:|--------:|-------------|`);
  for (const r of pack.readinessBySubject) {
    lines.push(
      `| ${r.subjectId} | ${r.total} | ${r.exactMatch} | ${r.fallback} | ${r.missingMeta} | ${r.needsReview} | ${r.ready} | ${r.caution} | **${r.recommendedReadiness}** |`
    );
  }
  lines.push(``);

  lines.push(`## E. Risk list (truncated)`, ``);
  lines.push(`### Subject fallback (sample)`, "```json", JSON.stringify(pack.riskList.subjectFallbackRows, null, 2), "```", ``);
  lines.push(`### English untagged (sample)`, "```json", JSON.stringify(pack.riskList.englishUntaggedRows, null, 2), "```", ``);
  lines.push(`### Missing metadata (sample)`, "```json", JSON.stringify(pack.riskList.missingMetadataRows, null, 2), "```", ``);
  lines.push(`### needs_human_review (sample)`, "```json", JSON.stringify(pack.riskList.needsHumanReviewRows, null, 2), "```", ``);
  lines.push(`### Rows with adapter warnings (sample)`, "```json", JSON.stringify(pack.riskList.rowsWithAdapterWarnings, null, 2), "```", ``);

  lines.push(`## F. Recommendation`, ``);
  lines.push(`**Can preview internally now**`, ...pack.recommendation.internalPreviewNow.map((x) => `- ${x}`), ``);
  lines.push(`**Should not go live yet**`, ...pack.recommendation.notLiveYet.map((x) => `- ${x}`), ``);
  lines.push(`**Must improve before live routing**`, ...pack.recommendation.mustImproveBeforeLive.map((x) => `- ${x}`), ``);

  return lines.join("\n");
}

/**
 * @param {object} pack
 */
export function validatePreviewPackSchema(pack) {
  const errs = [];
  if (!pack || typeof pack !== "object") return ["pack_not_object"];
  if (pack.version !== PREVIEW_PACK_VERSION) errs.push("bad_version");
  if (!pack.executiveSummary) errs.push("missing_executiveSummary");
  if (!Array.isArray(pack.actionTable)) errs.push("missing_actionTable");
  if (!pack.examplesByCategory || typeof pack.examplesByCategory !== "object") errs.push("missing_examplesByCategory");
  if (!Array.isArray(pack.readinessBySubject)) errs.push("missing_readinessBySubject");
  if (!pack.riskList || typeof pack.riskList !== "object") errs.push("missing_riskList");
  if (!pack.recommendation) errs.push("missing_recommendation");
  return errs;
}

const REQUIRED_MD_SECTIONS = [
  "## A. Executive summary",
  "## B. Planner action table",
  "## C. Examples",
  "## D. Readiness by subject",
  "## E. Risk list",
  "## F. Recommendation",
];

/**
 * @param {string} md
 * @returns {string[]}
 */
export function validatePreviewMarkdownSections(md) {
  const s = String(md || "");
  const missing = [];
  for (const h of REQUIRED_MD_SECTIONS) {
    if (!s.includes(h)) missing.push(`missing_section:${h}`);
  }
  return missing;
}
