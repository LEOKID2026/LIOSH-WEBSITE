/**
 * Thin adapter: real diagnostic / report facets → Adaptive Planner `PlannerInput`.
 * Does not modify engine output; only normalizes fields the planner already understands.
 */

/** @typedef {import("./adaptive-planner.js").PlannerInput} PlannerInput */

import { ENGINE_DECISIONS } from "./adaptive-planner-contract.js";
import { resolveDiagnosticUnitSkillAlignment } from "./diagnostic-unit-skill-alignment.js";
import { getAvailableQuestionMetadataForPlanner } from "./adaptive-planner-metadata-context.js";

const ENGINE_SET = new Set(ENGINE_DECISIONS);

/**
 * @param {unknown} v
 */
export function normalizeEngineDecisionString(v) {
  const s = String(v || "").toLowerCase().trim();
  return ENGINE_SET.has(s) ? s : null;
}

/**
 * Map Diagnostic Engine V2 `canonicalAction` (and similar) → planner `engineDecision`.
 * @param {string} canonical
 */
export function mapCanonicalActionToEngineDecision(canonical) {
  const c = String(canonical || "").toLowerCase();
  if (c === "intervene") return "remediate";
  if (c === "diagnose_only") return "remediate";
  if (c === "probe_only") return "review";
  if (c === "withhold") return "maintain";
  return "maintain";
}

/**
 * Map topic-next-step style `recommendedNextStep` when present on a unit or row.
 * @param {string} step
 */
export function mapRecommendedNextStepToEngineDecision(step) {
  const s = String(step || "").toLowerCase();
  if (s === "advance_level" || s === "advance_grade_topic_only") return "advance";
  if (s === "maintain_and_strengthen") return "maintain";
  if (
    s === "remediate_same_level" ||
    s === "drop_one_level_topic_only" ||
    s === "drop_one_grade_topic_only"
  ) {
    return "remediate";
  }
  return null;
}

/**
 * Map flat recommendation vocabulary (engine / QA strings) → planner `engineDecision`.
 * @param {string} rec
 */
export function mapVocabularyRecommendationToEngineDecision(rec) {
  const s = String(rec || "").toLowerCase().trim();
  if (s === "advance" || s === "advance_strength") return "advance";
  if (s === "maintain") return "maintain";
  if (s === "remediate" || s === "intervene") return "remediate";
  if (s === "review" || s === "probe" || s === "probe_only") return "review";
  if (s === "insufficient_data" || s === "insufficient data") return "insufficient_data";
  return null;
}

/**
 * @param {string} level
 */
export function mapPositiveAuthorityToMastery(level) {
  const x = String(level || "").toLowerCase();
  if (x === "very_good") return 0.88;
  if (x === "good") return 0.7;
  if (x === "fair" || x === "ok") return 0.52;
  if (x === "none") return 0.36;
  return 0.5;
}

/**
 * @param {object} ctx
 * @param {number} ctx.evidenceQuestions
 * @param {boolean} ctx.topThinDowngraded
 */
export function inferConfidenceNumeric({ evidenceQuestions, topThinDowngraded }) {
  if (topThinDowngraded) return 0.42;
  const n = Number(evidenceQuestions) || 0;
  if (n >= 120) return 0.82;
  if (n >= 40) return 0.62;
  if (n >= 15) return 0.52;
  return 0.38;
}

/**
 * @param {object} ctx
 * @param {boolean} ctx.topThinDowngraded
 * @param {number} ctx.evidenceQuestions
 * @param {string|null} [ctx.dataQualityNoteHe]
 */
export function inferDataQuality({ topThinDowngraded, evidenceQuestions, dataQualityNoteHe }) {
  if (topThinDowngraded) return "thin";
  const n = Number(evidenceQuestions) || 0;
  if (n < 12) return "thin";
  if (dataQualityNoteHe && String(dataQualityNoteHe).trim().length > 0) return "moderate";
  if (n < 40) return "moderate";
  return "strong";
}

/**
 * @param {object} report
 * @param {number} unitIndex
 */
export function pickDiagnosticUnit(report, unitIndex) {
  const units = report?.facets?.diagnostic?.unitSummaries;
  if (!Array.isArray(units) || !units.length) return null;
  const i = Math.max(0, Math.min(units.length - 1, Number(unitIndex) || 0));
  return units[i] || null;
}

/**
 * Build `doNotConclude` strings from report contract / cross-subject hints (English identifiers for planner only).
 * @param {object} facets
 */
export function extractDoNotConcludeFromFacets(facets) {
  const out = [];
  const contract = facets?.contract || {};
  if (contract.topThinDowngraded) {
    out.push("Report contract: topThinDowngraded - avoid strong conclusions until more practice.");
  }
  const exec = facets?.executive || {};
  const rr = String(exec.reportReadinessHe || "").trim();
  if (rr && rr.length > 10 && /מצומצם|עדיין|צריך עוד/i.test(rr)) {
    out.push("Report readiness: window practice may still be limited.");
  }
  return [...new Set(out)];
}

/**
 * @param {string} scenarioId
 */
export function inferRiskFlagsFromScenarioId(scenarioId) {
  const s = String(scenarioId || "").toLowerCase();
  /** @type {string[]} */
  const flags = [];
  if (s.includes("guessing") || s.includes("random_guessing")) flags.push("guessing");
  if (s.includes("inconsistent")) flags.push("inconsistency");
  return flags;
}

/**
 * @param {object} unit
 */
export function extractDetectedErrorTypesFromUnit(unit) {
  const pat = String(unit?.patternHe || "").trim();
  if (!pat) return [];
  return [pat];
}

/**
 * Resolve `engineDecision` from explicit fields, vocabulary, then canonical action.
 * @param {object} ctx
 * @param {object} ctx.report
 * @param {object|null} ctx.unit
 * @param {object} ctx.options
 */
export function resolveEngineDecision({ report, unit, options }) {
  const ovr = normalizeEngineDecisionString(options?.engineDecisionOverride);
  if (ovr) return ovr;
  const fromUnit = normalizeEngineDecisionString(unit?.engineDecision);
  if (fromUnit) return fromUnit;
  const fromReport = normalizeEngineDecisionString(report?.engineDecision);
  if (fromReport) return fromReport;
  const fromRec = mapVocabularyRecommendationToEngineDecision(
    unit?.recommendation ?? unit?.engineRecommendation ?? report?.recommendation
  );
  if (fromRec) return fromRec;
  const fromStep = mapRecommendedNextStepToEngineDecision(
    unit?.recommendedNextStep ?? unit?.diagnosticRecommendedNextStep ?? report?.recommendedNextStep
  );
  if (fromStep) return fromStep;
  if (unit?.canonicalAction) return mapCanonicalActionToEngineDecision(unit.canonicalAction);
  return "insufficient_data";
}

/**
 * @param {object} root - full report JSON or `{ report }` wrapper
 * @param {object} [options]
 * @param {number} [options.focusUnitIndex]
 * @param {boolean} [options.allowEnglishSkillRouting] — default false: English without explicit skill+subskill → skillTaggingIncomplete
 * @param {object[]} [options.availableQuestionMetadata] — optional pass-through (wins over index when non-empty)
 * @param {object} [options.metadataIndex] - from `buildPlannerQuestionMetadataIndex`
 * @param {(q: object) => object[]} [options.getAvailableQuestionMetadata] — custom resolver; receives query shape from adapter
 * @param {number} [options.metadataQueryLimit]
 * @param {boolean} [options.metadataSubjectFallback] — default true
 * @param {string} [options.engineDecisionOverride] — tests / manual override only; must be a valid engine decision
 */
export function buildPlannerInputFromDiagnosticPayload(root, options = {}) {
  const report = root?.report && typeof root.report === "object" ? root.report : root;
  const scenarioId = String(report?.scenarioId || "");
  const facets = report?.facets || {};
  const contract = facets.contract || {};
  const cross = facets.crossSubject || {};
  const unit = pickDiagnosticUnit(report, options.focusUnitIndex ?? 0);

  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const missingFields = [];
  /** @type {Record<string, unknown>} */
  const sourceInfo = {
    scenarioId,
    focusUnitIndex: options.focusUnitIndex ?? 0,
    generator: report?.generator,
    diagnosticPrimarySource: report?.diagnosticPrimarySource,
    unitDisplayName: unit?.displayName ?? null,
    canonicalAction: unit?.canonicalAction ?? null,
    skillAlignmentConfidence: unit?.skillAlignmentConfidence ?? null,
    skillAlignmentSource: unit?.skillAlignmentSource ?? null,
    skillAlignmentWarnings: Array.isArray(unit?.skillAlignmentWarnings) ? unit.skillAlignmentWarnings : [],
    metadataResolution: /** @type {Record<string, unknown>|null} */ (null),
  };

  if (!unit) {
    missingFields.push("facets.diagnostic.unitSummaries");
    sourceInfo.metadataResolution = null;
    const input = {
      subject: String(contract.primarySubjectId || "").trim() || "unknown",
      engineDecision: "insufficient_data",
      mastery: 0,
      confidence: 0,
      dataQuality: "thin",
      riskFlags: inferRiskFlagsFromScenarioId(scenarioId),
      doNotConclude: extractDoNotConcludeFromFacets(facets),
      detectedErrorTypes: [],
      prerequisiteSkillIds: [],
      recentAttempts: [],
      availableQuestionMetadata: Array.isArray(options.availableQuestionMetadata)
        ? options.availableQuestionMetadata
        : [],
    };
    if (!input.availableQuestionMetadata.length) warnings.push("availableQuestionMetadata_missing");
    return { input, warnings, missingFields, sourceInfo };
  }

  const subject = String(unit.subjectId || contract.primarySubjectId || "").trim();
  if (!subject) missingFields.push("subjectId");

  const topThin = !!contract.topThinDowngraded;
  const evidenceQ = Number(unit.evidenceQuestions ?? unit.questionsFromTrace) || 0;
  const dataQuality = inferDataQuality({
    topThinDowngraded: topThin,
    evidenceQuestions: evidenceQ,
    dataQualityNoteHe: cross.dataQualityNoteHe,
  });
  const mastery = mapPositiveAuthorityToMastery(unit.positiveAuthorityLevel);
  const confidence = inferConfidenceNumeric({ evidenceQuestions: evidenceQ, topThinDowngraded: topThin });
  const engineDecision = resolveEngineDecision({ report, unit, options });
  const doNotConclude = extractDoNotConcludeFromFacets(facets);
  const riskFlags = [...inferRiskFlagsFromScenarioId(scenarioId)];
  const detectedErrorTypes = extractDetectedErrorTypesFromUnit(unit);
  const prerequisiteSkillIds = Array.isArray(unit.prerequisiteSkillIds)
    ? unit.prerequisiteSkillIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];

  let skillFromUnit = String(unit.skillId || unit.taxonomySkillId || "").trim();
  let subFromUnit = String(unit.subskillId || unit.taxonomySubskillId || "").trim();

  const plannerAlignmentSubjects = new Set([
    "english",
    "geometry",
    "math",
    "hebrew",
    "science",
    "moledet-geography",
  ]);
  if (
    plannerAlignmentSubjects.has(subject.toLowerCase()) &&
    (!skillFromUnit || !subFromUnit) &&
    options.metadataIndex &&
    typeof options.metadataIndex === "object"
  ) {
    const topicBucketKeys = facets?.topicLayer?.topicBucketKeys;
    const aligned = resolveDiagnosticUnitSkillAlignment(
      { ...unit, subjectId: subject },
      {
        scenarioId,
        metadataIndex: options.metadataIndex,
        topicBucketKeys,
        allowEnglishSkillRouting: subject.toLowerCase() === "english",
      }
    );
    if (
      (aligned.confidence === "exact" || aligned.confidence === "inferred_safe") &&
      aligned.skillId &&
      aligned.subskillId
    ) {
      skillFromUnit = aligned.skillId;
      subFromUnit = aligned.subskillId;
      sourceInfo.skillAlignmentConfidence = aligned.confidence;
      sourceInfo.skillAlignmentSource = aligned.source;
      if (Array.isArray(aligned.warnings) && aligned.warnings.length) {
        sourceInfo.skillAlignmentWarnings = aligned.warnings;
      }
    }
  }

  const alignConf = String(unit.skillAlignmentConfidence || "").toLowerCase();
  const alignTrusted = alignConf === "exact" || alignConf === "inferred_safe";

  let skillTaggingIncomplete = false;
  if (subject.toLowerCase() === "english" && !options.allowEnglishSkillRouting) {
    if (!skillFromUnit || !subFromUnit) skillTaggingIncomplete = true;
    if (alignTrusted && skillFromUnit && subFromUnit) skillTaggingIncomplete = false;
  }

  /** @type {object[]} */
  let availableQuestionMetadata = Array.isArray(options.availableQuestionMetadata)
    ? [...options.availableQuestionMetadata]
    : [];
  const hasExplicitMetadata = availableQuestionMetadata.length > 0;

  const difficultyHint = String(options.currentDifficultyHint || "standard");
  const metaLimit = Number(options.metadataQueryLimit) > 0 ? Number(options.metadataQueryLimit) : 12;
  const allowSubjectFallback = options.metadataSubjectFallback !== false;

  if (!skillTaggingIncomplete && !hasExplicitMetadata) {
    if (typeof options.getAvailableQuestionMetadata === "function") {
      const custom = options.getAvailableQuestionMetadata({
        subject,
        skillId: skillFromUnit,
        subskillId: subFromUnit,
        difficulty: difficultyHint,
        detectedErrorTypes,
        limit: metaLimit,
        allowSubjectFallback,
      });
      if (Array.isArray(custom) && custom.length) {
        availableQuestionMetadata = custom;
        sourceInfo.metadataResolution = {
          source: "getAvailableQuestionMetadata",
          candidateCount: custom.length,
          subjectFallback: false,
          skillOnlyFallback: false,
          warnings: [],
        };
      }
    } else if (options.metadataIndex && typeof options.metadataIndex === "object") {
      const res = getAvailableQuestionMetadataForPlanner(options.metadataIndex, {
        subject,
        skillId: skillFromUnit,
        subskillId: subFromUnit,
        difficulty: difficultyHint,
        detectedErrorTypes,
        limit: metaLimit,
        allowSubjectFallback,
      });
      for (const w of res.warnings || []) warnings.push(w);
      if (res.candidates?.length) {
        availableQuestionMetadata = res.candidates;
      }
      sourceInfo.metadataResolution = {
        source: "metadataIndex",
        candidateCount: res.candidates?.length || 0,
        subjectFallback: !!res.subjectFallback,
        skillOnlyFallback: !!res.skillOnlyFallback,
        warnings: res.warnings || [],
      };
    }
  } else if (hasExplicitMetadata) {
    sourceInfo.metadataResolution = {
      source: "explicit_availableQuestionMetadata",
      candidateCount: availableQuestionMetadata.length,
      subjectFallback: false,
      skillOnlyFallback: false,
      warnings: [],
    };
  }

  if (!availableQuestionMetadata.length) warnings.push("availableQuestionMetadata_missing");

  /** @type {PlannerInput} */
  const input = {
    studentId: String(report?.playerName || scenarioId || ""),
    subject,
    currentSkillId: skillFromUnit || undefined,
    currentSubskillId: subFromUnit || undefined,
    engineDecision,
    mastery,
    confidence,
    dataQuality,
    riskFlags,
    doNotConclude,
    detectedErrorTypes,
    prerequisiteSkillIds,
    recentAttempts: Array.isArray(unit.recentAttempts) ? unit.recentAttempts : [],
    availableQuestionMetadata,
    skillTaggingIncomplete,
    currentDifficultyHint: String(options.currentDifficultyHint || "standard"),
    prerequisiteSubskillIdHint: options.prerequisiteSubskillIdHint,
  };

  return { input, warnings, missingFields, sourceInfo };
}
