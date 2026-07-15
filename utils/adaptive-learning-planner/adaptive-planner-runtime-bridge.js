/**
 * Runtime bridge: real practice / session-end stats → synthetic diagnostic-shaped payload
 * → existing adapter + deterministic planner + artifact safety assertions.
 * Does not mutate caller payloads (deep-clones the practice snapshot first).
 */

import { TOPICS } from "../geometry-constants.js";
import { SCIENCE_TOPIC_ORDER } from "../question-metadata-qa/question-metadata-taxonomy.js";
import { MOLEDET_GEOGRAPHY_STRAND_KEYS } from "../question-metadata-qa/question-metadata-taxonomy-geography.js";
import { buildPlannerInputFromDiagnosticPayload, normalizeEngineDecisionString } from "./adaptive-planner-input-adapter.js";
import { runArtifactSafetyAssertions } from "./adaptive-planner-artifact-runner.js";
import { planAdaptiveLearning } from "./adaptive-planner.js";

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function isAdaptivePlannerRecommendationEnabled(env = typeof process !== "undefined" ? process.env : {}) {
  const pub = String(env.NEXT_PUBLIC_ENABLE_ADAPTIVE_PLANNER_RECOMMENDATION || "").trim().toLowerCase();
  const srv = String(env.ENABLE_ADAPTIVE_PLANNER_RECOMMENDATION || "").trim().toLowerCase();
  const v = pub || srv;
  return v === "1" || v === "true" || v === "yes";
}

/**
 * @param {unknown} payload
 */
function clonePracticeResultPayload(payload) {
  try {
    return JSON.parse(JSON.stringify(payload && typeof payload === "object" ? payload : {}));
  } catch {
    return {};
  }
}

/**
 * @param {unknown} raw
 */
export function normalizePlannerSubject(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (s === "moledet") return "moledet-geography";
  return s;
}

/**
 * @param {unknown} grade
 * @returns {string} g1..g6 or ""
 */
export function gradeToScenarioFragment(grade) {
  if (grade == null || grade === "") return "";
  const g = String(grade).trim().toLowerCase();
  if (/^g[1-6]$/.test(g)) return g;
  const n = Number(grade);
  if (Number.isFinite(n) && n >= 1 && n <= 6) return `g${Math.floor(n)}`;
  return "";
}

/**
 * @param {number} accuracy 0–100
 */
function accuracyToPositiveAuthorityLevel(accuracy) {
  const a = Number(accuracy);
  if (!Number.isFinite(a)) return "none";
  if (a >= 85) return "very_good";
  if (a >= 68) return "good";
  if (a >= 45) return "fair";
  return "none";
}

/**
 * @param {Record<string, unknown>} p sanitized practice
 */
function inferEngineDecisionFromPractice(p) {
  const ovr = normalizeEngineDecisionString(p.engineDecision);
  if (ovr) return ovr;
  const n = Number(p.totalQuestions) || 0;
  const acc = Number(p.accuracy) || 0;
  if (n < 2) return "insufficient_data";
  if (acc < 38 && n >= 6) return "remediate";
  if (acc >= 88 && n >= 16) return "advance";
  if (acc >= 72) return "maintain";
  return "review";
}

/**
 * @param {string} normalizedSubject
 * @param {string} topic
 * @param {string[]|undefined} explicit
 * @returns {string[]}
 */
function inferDefaultTopicBucketKeys(normalizedSubject, topic, explicit) {
  if (Array.isArray(explicit) && explicit.length) {
    return explicit.map((x) => String(x || "").trim()).filter(Boolean);
  }
  const t = String(topic || "").trim().toLowerCase();
  if (normalizedSubject === "english") {
    const map = {
      grammar: "grammar",
      vocabulary: "vocabulary",
      writing: "writing",
      sentences: "sentences",
      translation: "sentences",
      mixed: "",
    };
    const b = map[t];
    return b ? [b] : [];
  }
  if (normalizedSubject === "geometry") {
    if (t && TOPICS[t]) return [t];
    return [];
  }
  if (normalizedSubject === "science") {
    if (SCIENCE_TOPIC_ORDER.includes(t)) return [t];
    return [];
  }
  if (normalizedSubject === "moledet-geography") {
    if (MOLEDET_GEOGRAPHY_STRAND_KEYS.includes(t)) return [t];
    return [];
  }
  return [];
}

/**
 * @param {string} normalizedSubject
 * @param {string} topicKey
 * @param {string[]} topicBucketKeys
 */
function runtimeFacetDisplayName(normalizedSubject, topicKey, topicBucketKeys) {
  const t = String(topicKey || "").trim();
  if (normalizedSubject === "geometry" && t && TOPICS[t]?.name) {
    return String(TOPICS[t].name);
  }
  if (normalizedSubject === "english") {
    const bucket = (topicBucketKeys[0] || t).toLowerCase();
    if (bucket === "grammar") return "grammar";
    if (bucket === "vocabulary") return "vocabulary";
    if (bucket === "writing") return "writing";
    if (bucket === "sentences") return "sentence building";
  }
  if (normalizedSubject === "math") {
    return t || "math";
  }
  return t || normalizedSubject;
}

/**
 * @param {Record<string, unknown>} practice — cloned / sanitized
 * @param {string} normalizedSubject
 * @param {string} gradeFrag g1..g6
 * @param {string} scenarioId
 */
export function buildSyntheticDiagnosticReport(practice, normalizedSubject, gradeFrag, scenarioId) {
  const topic = String(practice.topic || "").trim();
  const topicBucketKeys = inferDefaultTopicBucketKeys(normalizedSubject, topic, practice.topicBucketKeys);
  const totalQuestions = Math.max(0, Number(practice.totalQuestions) || 0);
  const accuracy = Math.min(100, Math.max(0, Number(practice.accuracy) || 0));
  const topThinDowngraded = totalQuestions < 12;

  const displayName = runtimeFacetDisplayName(normalizedSubject, topic, topicBucketKeys);

  /** @type {Record<string, unknown>} */
  const unit = {
    subjectId: normalizedSubject,
    displayName,
    evidenceQuestions: totalQuestions,
    questionsFromTrace: totalQuestions,
    positiveAuthorityLevel: accuracyToPositiveAuthorityLevel(accuracy),
    engineDecision: inferEngineDecisionFromPractice(practice),
    patternHe: "",
    recentAttempts: Array.isArray(practice.recentAttempts) ? practice.recentAttempts : [],
  };

  if (normalizedSubject === "math" || normalizedSubject === "science" || normalizedSubject === "hebrew") {
    unit.bucketKey = topic;
  }
  if (normalizedSubject === "moledet-geography") {
    unit.bucketKey = topic;
  }

  /** @type {Record<string, unknown>} */
  const facets = {
    contract: {
      primarySubjectId: normalizedSubject,
      topThinDowngraded,
    },
    crossSubject: {},
    executive: {},
    diagnostic: {
      unitSummaries: [unit],
    },
  };

  if (topicBucketKeys.length) {
    facets.topicLayer = { topicBucketKeys };
  }

  return {
    scenarioId,
    playerName: practice.learningSessionId ? String(practice.learningSessionId) : scenarioId,
    diagnosticPrimarySource: "runtime_practice_session",
    generator: "adaptive-planner-runtime-bridge-v1",
    facets,
  };
}

/**
 * @param {object|null|undefined} resolution
 */
function computeMetadataExactMatch(resolution) {
  if (!resolution || typeof resolution !== "object") return false;
  const c = Number(resolution.candidateCount) || 0;
  if (c <= 0) return false;
  if (resolution.subjectFallback) return false;
  if (resolution.skillOnlyFallback) return false;
  return true;
}

/**
 * @param {string} subject
 * @param {string} gradeFrag
 * @param {object} sourceInfo
 * @param {number} safetyViolationCount
 * @param {object} input
 */
function buildDiagnostics(subject, gradeFrag, sourceInfo, safetyViolationCount, input) {
  const res = sourceInfo?.metadataResolution;
  return {
    subject: String(input?.subject || subject || ""),
    grade: gradeFrag,
    metadataExactMatch: computeMetadataExactMatch(res),
    metadataSubjectFallback: !!(res && res.subjectFallback),
    safetyViolationCount,
    skillAlignmentSource: sourceInfo?.skillAlignmentSource != null ? String(sourceInfo.skillAlignmentSource) : null,
  };
}

/**
 * @param {unknown} payload — practice / session-end snapshot (not mutated)
 * @param {object} [options]
 * @param {object} [options.metadataIndex] - snapshot index `{ entries: [...] }`
 * @param {number} [options.metadataQueryLimit]
 * @param {string} [options.currentDifficultyHint]
 */
export function buildRuntimePlannerRecommendationFromPracticeResult(payload, options = {}) {
  /** @type {Record<string, unknown>} */
  const diagnosticsFallback = {
    subject: "",
    grade: "",
    metadataExactMatch: false,
    metadataSubjectFallback: false,
    safetyViolationCount: 0,
    skillAlignmentSource: null,
  };

  try {
    const practice = clonePracticeResultPayload(payload);
    const subject = normalizePlannerSubject(practice.subject);
    const gradeFrag = gradeToScenarioFragment(practice.grade);
    diagnosticsFallback.subject = subject;
    diagnosticsFallback.grade = gradeFrag;

    if (!subject) {
      return {
        ok: false,
        source: "adaptive_planner",
        reason: "missing_subject",
        diagnostics: { ...diagnosticsFallback },
      };
    }
    if (!gradeFrag) {
      return {
        ok: false,
        source: "adaptive_planner",
        reason: "missing_or_invalid_grade",
        diagnostics: { ...diagnosticsFallback },
      };
    }

    const metadataIndex = options.metadataIndex;
    if (!metadataIndex || !Array.isArray(metadataIndex.entries) || metadataIndex.entries.length === 0) {
      return {
        ok: false,
        source: "adaptive_planner",
        reason: "metadata_index_unavailable",
        diagnostics: { ...diagnosticsFallback },
      };
    }

    /** Dev/QA only (scenario simulator): stable id enables risk-flag inference from scenario label (e.g. guessing). */
    const scenarioId =
      String(practice.scenarioSimulatorId || "").trim() ||
      `runtime_${subject.replace(/-/g, "_")}_${gradeFrag}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const report = buildSyntheticDiagnosticReport(practice, subject, gradeFrag, scenarioId);

    const adapterOptions = {
      metadataIndex,
      metadataQueryLimit: Number(options.metadataQueryLimit) > 0 ? Number(options.metadataQueryLimit) : 12,
      currentDifficultyHint: String(options.currentDifficultyHint || "standard"),
    };

    const { input, sourceInfo } = buildPlannerInputFromDiagnosticPayload(report, adapterOptions);
    const planOut = planAdaptiveLearning(input);
    const violations = runArtifactSafetyAssertions(input, planOut);

    const diagnostics = buildDiagnostics(subject, gradeFrag, sourceInfo, violations.length, input);

    if (violations.length) {
      return {
        ok: false,
        source: "adaptive_planner",
        reason: "safety_assertion_failed",
        diagnostics: {
          ...diagnostics,
          safetyViolationCount: violations.length,
          safetyViolations: violations,
        },
      };
    }

    return {
      ok: true,
      source: "adaptive_planner",
      recommendation: {
        nextAction: planOut.nextAction,
        targetDifficulty: planOut.targetDifficulty,
        questionCount: planOut.questionCount,
        reasonCodes: planOut.reasonCodes,
        mustNotSay: planOut.mustNotSay,
      },
      diagnostics,
    };
  } catch (err) {
    return {
      ok: false,
      source: "adaptive_planner",
      reason: String(err?.message || err || "unknown_error"),
      diagnostics: { ...diagnosticsFallback },
    };
  }
}
