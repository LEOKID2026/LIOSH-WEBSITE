/**
 * Adapter: parent-report V2 snapshot → strict allowlisted input for `buildParentReportAIExplanation`.
 * No raw banks, diagnostics blobs, or full history — only derived summary strings and counts.
 *
 * Phase B alignment: `enrichParentReportWithParentAi` routes through the unified Parent AI context
 * builder (`utils/parent-ai-context/build-parent-ai-context.js`) so the Parent AI summary insight and
 * the Parent Copilot Q&A both ground in the same canonical (payload, scope) projection. The strict
 * input projection itself (`buildStrictParentReportAIInputFromParentReportV2` and its internals
 * below) is unchanged and remains the canonical source of the strict explainer-input shape.
 */

import { mapPlannerNextActionToHebrew } from "../../lib/learning-client/adaptive-planner-recommendation-view-model.js";
import {
  buildParentReportAIExplanation,
  buildStrictParentReportAIInput,
  getDeterministicParentReportExplanation,
} from "./parent-report-ai-explainer.js";
import { buildParentAiContext } from "../parent-ai-context/build-parent-ai-context.js";
import { buildInsightPacketFromV2Snapshot } from "../parent-report-insights/build-packet-from-v2-snapshot.js";
import {
  buildParentReportAINarrative,
  buildDeterministicFallbackNarrative,
} from "../parent-report-ai-narrative/index.js";

const SUBJECT_KEYS = ["math", "geometry", "english", "science", "hebrew", "moledet-geography"];

const SUMMARY_Q = {
  math: "mathQuestions",
  geometry: "geometryQuestions",
  english: "englishQuestions",
  science: "scienceQuestions",
  hebrew: "hebrewQuestions",
  "moledet-geography": "moledetGeographyQuestions",
};

const SUMMARY_ACC = {
  math: "mathAccuracy",
  geometry: "geometryAccuracy",
  english: "englishAccuracy",
  science: "scienceAccuracy",
  hebrew: "hebrewAccuracy",
  "moledet-geography": "moledetGeographyAccuracy",
};

const MAP_FIELD = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

/** Maps detailed-report `overallSnapshot.subjectCoverage[].subject` → V2 `summary` question / accuracy keys. */
const DETAILED_COVERAGE_TO_SUMMARY = {
  math: { q: "mathQuestions", c: "mathCorrect", a: "mathAccuracy" },
  geometry: { q: "geometryQuestions", c: "geometryCorrect", a: "geometryAccuracy" },
  english: { q: "englishQuestions", c: "englishCorrect", a: "englishAccuracy" },
  science: { q: "scienceQuestions", c: "scienceCorrect", a: "scienceAccuracy" },
  hebrew: { q: "hebrewQuestions", c: "hebrewCorrect", a: "hebrewAccuracy" },
  "moledet-geography": {
    q: "moledetGeographyQuestions",
    c: "moledetGeographyCorrect",
    a: "moledetGeographyAccuracy",
  },
};

/**
 * Phase C: rebuild a minimal `generateParentReportV2`-shaped snapshot from a detailed-report payload so
 * `buildStrictParentReportAIInputFromParentReportV2` + `buildTruthPacketV1` see the same grounding shape
 * as the short report (summary aggregates + optional `subjectProfiles` / `hybridRuntime`).
 *
 * @param {Record<string, unknown>|null|undefined} detailedPayload
 * @returns {Record<string, unknown>|null}
 */
export function parentReportV2SnapshotFromDetailedPayload(detailedPayload) {
  if (!detailedPayload || typeof detailedPayload !== "object") return null;
  const os =
    detailedPayload.overallSnapshot && typeof detailedPayload.overallSnapshot === "object"
      ? detailedPayload.overallSnapshot
      : {};
  const cov = Array.isArray(os.subjectCoverage) ? os.subjectCoverage : [];

  /** @type {Record<string, unknown>} */
  const summary = {
    totalQuestions: Math.max(0, Math.round(Number(os.totalQuestions) || 0)),
    totalTimeMinutes: Math.max(0, Math.round(Number(os.totalTime) || 0)),
    overallAccuracy: Math.min(100, Math.max(0, Number(os.overallAccuracy) || 0)),
    mathQuestions: 0,
    mathCorrect: 0,
    mathAccuracy: 0,
    geometryQuestions: 0,
    geometryCorrect: 0,
    geometryAccuracy: 0,
    englishQuestions: 0,
    englishCorrect: 0,
    englishAccuracy: 0,
    scienceQuestions: 0,
    scienceCorrect: 0,
    scienceAccuracy: 0,
    hebrewQuestions: 0,
    hebrewCorrect: 0,
    hebrewAccuracy: 0,
    moledetGeographyQuestions: 0,
    moledetGeographyCorrect: 0,
    moledetGeographyAccuracy: 0,
    diagnosticOverviewHe: {
      strongestAreaLineHe: "",
      mainFocusAreaLineHe: "",
      requiresAttentionPreviewHe: [],
    },
  };

  for (const row of cov) {
    const sid = String(row?.subject || "").trim();
    const keys = DETAILED_COVERAGE_TO_SUMMARY[sid];
    if (!keys) continue;
    const q = Math.max(0, Math.round(Number(row.questionCount) || 0));
    const acc = Math.min(100, Math.max(0, Number(row.accuracy) || 0));
    const corr = Math.round((q * acc) / 100);
    summary[keys.q] = q;
    summary[keys.c] = corr;
    summary[keys.a] = acc;
  }

  const es =
    detailedPayload.executiveSummary && typeof detailedPayload.executiveSummary === "object"
      ? detailedPayload.executiveSummary
      : {};
  const topS = Array.isArray(es.topStrengthsAcrossHe) ? es.topStrengthsAcrossHe : [];
  const topF = Array.isArray(es.topFocusAreasHe) ? es.topFocusAreasHe : [];
  const ov = summary.diagnosticOverviewHe && typeof summary.diagnosticOverviewHe === "object" ? summary.diagnosticOverviewHe : {};
  ov.strongestAreaLineHe = topS[0] ? String(topS[0]).trim() : "";
  ov.mainFocusAreaLineHe = topF[0] ? String(topF[0]).trim() : "";
  ov.requiresAttentionPreviewHe = topF
    .slice(1, 4)
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  summary.diagnosticOverviewHe = ov;

  const rawMetricStrengthsHe = topS
    .slice(0, 2)
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return {
    generatedAt:
      typeof detailedPayload.generatedAt === "string" && detailedPayload.generatedAt
        ? detailedPayload.generatedAt
        : new Date().toISOString(),
    playerName:
      detailedPayload.periodInfo && typeof detailedPayload.periodInfo === "object"
        ? String(detailedPayload.periodInfo.playerName || "").trim()
        : "",
    period:
      detailedPayload.periodInfo && typeof detailedPayload.periodInfo === "object"
        ? detailedPayload.periodInfo.period
        : undefined,
    summary,
    rawMetricStrengthsHe,
    hybridRuntime: detailedPayload.hybridRuntime ?? null,
    diagnosticEngineV2: detailedPayload.diagnosticEngineV2 ?? null,
    subjectProfiles: Array.isArray(detailedPayload.subjectProfiles) ? detailedPayload.subjectProfiles : [],
    executiveSummary: detailedPayload.executiveSummary ?? null,
    mathOperations: {},
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    hebrewTopics: {},
    moledetGeographyTopics: {},
  };
}

/**
 * Same Parent AI summary pipeline as the short report, fed by a synthetic V2 snapshot derived from the
 * detailed-report payload (Phase C — detailed + print parity).
 *
 * Returns the same enriched shape as `enrichParentReportWithParentAi`: the legacy `text` (single
 * paragraph) is preserved for back-compat and a richer `structured` object (the new AI narrative
 * output: summary + strengths + focusAreas + homeTips + cautionNote) is added alongside it.
 *
 * @param {Record<string, unknown>|null|undefined} detailedPayload
 * @param {{ env?: Record<string, string | undefined>; preferDeterministicOnly?: boolean; scope?: unknown; canonicalIntent?: string; now?: string }} [options]
 * @returns {Promise<{ parentAiExplanation: { ok: true, text: string, source: "deterministic_fallback"|"ai", structured?: object | null } | null }>}
 */
export async function enrichDetailedParentReportWithParentAi(detailedPayload, options = {}) {
  try {
    const snapshot = parentReportV2SnapshotFromDetailedPayload(detailedPayload);
    if (!snapshot) return { parentAiExplanation: null };
    return enrichParentReportWithParentAi(snapshot, options);
  } catch {
    return { parentAiExplanation: null };
  }
}

/** Mirrors runtime practice → engine decision (high level only; does not replace the adaptive planner). */
function inferEngineDecisionFromCounts(totalQuestions, accuracyPct) {
  const n = Math.max(0, Math.round(Number(totalQuestions) || 0));
  const acc = Math.min(100, Math.max(0, Number(accuracyPct) || 0));
  if (n < 2) return "insufficient_data";
  if (acc < 38 && n >= 6) return "remediate";
  if (acc >= 88 && n >= 16) return "advance";
  if (acc >= 72) return "maintain";
  return "review";
}

/**
 * @param {string} engineDecision
 * @returns {{ plannerNextAction: string, plannerTargetDifficulty: string, plannerQuestionCount: number }}
 */
function plannerShapeFromEngineDecision(engineDecision) {
  const e = String(engineDecision || "").toLowerCase();
  if (e === "insufficient_data") {
    return { plannerNextAction: "pause_collect_more_data", plannerTargetDifficulty: "standard", plannerQuestionCount: 3 };
  }
  if (e === "remediate") {
    return { plannerNextAction: "practice_current", plannerTargetDifficulty: "basic", plannerQuestionCount: 5 };
  }
  if (e === "advance") {
    return { plannerNextAction: "advance_skill", plannerTargetDifficulty: "advanced", plannerQuestionCount: 4 };
  }
  if (e === "maintain") {
    return { plannerNextAction: "maintain_skill", plannerTargetDifficulty: "standard", plannerQuestionCount: 4 };
  }
  if (e === "review") {
    return { plannerNextAction: "practice_current", plannerTargetDifficulty: "standard", plannerQuestionCount: 4 };
  }
  return { plannerNextAction: "maintain_skill", plannerTargetDifficulty: "standard", plannerQuestionCount: 4 };
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 */
function pickPrimarySubjectKey(report) {
  const s = report?.summary;
  if (!s || typeof s !== "object") return "math";
  let best = "math";
  let bestQ = -1;
  for (const sid of SUBJECT_KEYS) {
    const k = SUMMARY_Q[sid];
    const q = Number(s[k]) || 0;
    if (q > bestQ) {
      bestQ = q;
      best = sid;
    }
  }
  return best;
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 * @param {string} subjectKey
 */
function inferGradeFragment(report, subjectKey) {
  const mapName = MAP_FIELD[subjectKey];
  const m = mapName && report && typeof report === "object" ? report[mapName] : null;
  if (!m || typeof m !== "object") return "g3";
  const counts = {};
  for (const row of Object.values(m)) {
    if (!row || typeof row !== "object") continue;
    const g = String(row.gradeKey || "")
      .trim()
      .toLowerCase();
    if (!/^g[1-6]$/.test(g)) continue;
    const w = Number(row.questions) || 0;
    counts[g] = (counts[g] || 0) + w;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked.length ? ranked[0][0] : "g3";
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 */
function buildGradePracticeBreakdownFromV2(report) {
  const mapFields = Object.values(MAP_FIELD);
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  for (const mapName of mapFields) {
    const m = report && typeof report === "object" ? report[mapName] : null;
    if (!m || typeof m !== "object") continue;
    for (const [topicRowKey, row] of Object.entries(m)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;
      rows.push({
        topicRowKey,
        bucketKey: row.bucketKey || topicRowKey,
        displayName: row.displayName || topicRowKey,
        contentGradeKey: row.contentGradeKey || row.gradeKey || null,
        registeredGradeKey: row.registeredGradeKey || report.registeredGradeKey || null,
        gradeRelation: row.gradeRelation || "unknown",
        questions: q,
        accuracy: Number(row.accuracy) || 0,
      });
    }
  }
  return rows;
}

/**
 * @param {string} band
 */
function accuracyBandFromPct(band) {
  const a = Number(band) || 0;
  if (a >= 85) return "high";
  if (a >= 70) return "moderate";
  if (a >= 50) return "mixed";
  return "low";
}

/**
 * @param {number} n
 */
function dataConfidenceFromCount(n) {
  const q = Number(n) || 0;
  if (q >= 40) return "strong";
  if (q >= 12) return "moderate";
  if (q >= 6) return "low";
  return "thin";
}

/**
 * @param {Record<string, unknown>|null|undefined} report
 */
function inferConsistencyBand(report) {
  const hybrid = report?.hybridRuntime;
  if (hybrid && typeof hybrid === "object") {
    const g = hybrid.guessingLikelihoodHigh === true || hybrid.guessHeavy === true;
    if (g) return "possibly_fast";
  }
  return "stable";
}

/**
 * Build short Hebrew snippets already shown elsewhere on the report (no new diagnostics).
 * @param {Record<string, unknown>} report
 */
function buildStrengthAndNeedsLines(report) {
  const ov = report.summary?.diagnosticOverviewHe && typeof report.summary.diagnosticOverviewHe === "object"
    ? report.summary.diagnosticOverviewHe
    : {};
  const partsS = [];
  if (ov.strongestAreaLineHe) partsS.push(String(ov.strongestAreaLineHe).trim());
  const rms = Array.isArray(report.rawMetricStrengthsHe)
    ? report.rawMetricStrengthsHe
    : Array.isArray(report.summary?.rawMetricStrengthsHe)
      ? report.summary.rawMetricStrengthsHe
      : [];
  for (const line of rms) {
    const t = String(line || "").trim();
    if (t) partsS.push(t);
    if (partsS.length >= 2) break;
  }
  const partsN = [];
  if (ov.mainFocusAreaLineHe) partsN.push(String(ov.mainFocusAreaLineHe).trim());
  if (Array.isArray(ov.requiresAttentionPreviewHe)) {
    for (const x of ov.requiresAttentionPreviewHe) {
      const t = String(x || "").trim();
      if (t) partsN.push(t);
      if (partsN.length >= 2) break;
    }
  }
  return {
    mainStrengths: partsS.join(" · ").slice(0, 280),
    mainPracticeNeeds: partsN.join(" · ").slice(0, 280),
  };
}

/**
 * Maps a `generateParentReportV2` snapshot to strict explainer input, or null if insufficient.
 * @param {Record<string, unknown>|null|undefined} report
 */
export function buildStrictParentReportAIInputFromParentReportV2(report) {
  if (!report || typeof report !== "object") return null;
  const subject = pickPrimarySubjectKey(report);
  const qk = SUMMARY_Q[subject];
  const ak = SUMMARY_ACC[subject];
  const s = report.summary && typeof report.summary === "object" ? report.summary : {};
  const nSubject = Math.max(0, Math.round(Number(s[qk]) || 0));
  const accSubject = Math.min(100, Math.max(0, Number(s[ak]) || 0));
  const totalQ = Math.max(0, Math.round(Number(s.totalQuestions) || 0));
  if (nSubject <= 0 && totalQ <= 0) return null;

  const nForEngine = nSubject > 0 ? nSubject : totalQ;
  const accForEngine = nSubject > 0 ? accSubject : Math.min(100, Math.max(0, Number(s.overallAccuracy) || 0));
  const engine = inferEngineDecisionFromCounts(nForEngine, accForEngine);
  const { plannerNextAction, plannerTargetDifficulty, plannerQuestionCount } = plannerShapeFromEngineDecision(engine);
  const recommendedNextStep = mapPlannerNextActionToHebrew(plannerNextAction);
  const grade =
    (typeof report.registeredGradeKey === "string" && /^g[1-6]$/.test(report.registeredGradeKey.trim().toLowerCase())
      ? report.registeredGradeKey.trim().toLowerCase()
      : null) || inferGradeFragment(report, subject);
  const gradePracticeBreakdown = buildGradePracticeBreakdownFromV2(report);
  const mixedGradePractice =
    report?.gradePracticeMeta?.mixedGradePractice === true ||
    gradePracticeBreakdown.some((r) => r.gradeRelation === "lower" || r.gradeRelation === "higher");
  const { mainStrengths, mainPracticeNeeds } = buildStrengthAndNeedsLines(report);
  const nForConfidence = Math.max(nSubject, totalQ);
  const raw = {
    subject,
    grade,
    gradePracticeBreakdown,
    mixedGradePractice,
    mixedGradePracticeNoteHe:
      typeof report?.gradePracticeMeta?.mixedGradePracticeNoteHe === "string"
        ? report.gradePracticeMeta.mixedGradePracticeNoteHe
        : mixedGradePractice
        ? "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד."
        : null,
    plannerNextAction,
    plannerTargetDifficulty,
    plannerQuestionCount,
    accuracyBand: accuracyBandFromPct(nSubject > 0 ? accSubject : Number(s.overallAccuracy) || 0),
    consistencyBand: inferConsistencyBand(report),
    dataConfidence: dataConfidenceFromCount(nForConfidence),
    mainStrengths,
    mainPracticeNeeds,
    recommendedNextStep,
  };
  return buildStrictParentReportAIInput(raw);
}

/**
 * Builds the new structured AI narrative ("סיכום חכם להורה") from a V2 parent-report snapshot.
 * Internal helper used by both short and detailed enrichment paths. Always returns either a valid
 * structured object (AI or deterministic fallback) or `null` when the snapshot is unusable.
 *
 * @param {Record<string, unknown>|null|undefined} v2Snapshot
 * @param {{ env?: Record<string,string|undefined>; preferDeterministicOnly?: boolean; now?: string }} [options]
 * @returns {Promise<{ source: "ai" | "deterministic_fallback"; structured: object } | null>}
 */
async function buildStructuredNarrativeFromV2Snapshot(v2Snapshot, options = {}) {
  try {
    const packet = buildInsightPacketFromV2Snapshot(v2Snapshot, {
      now: typeof options?.now === "string" ? options.now : "",
    });
    if (!packet || packet.ok === false) return null;
    const result = await buildParentReportAINarrative(packet, {
      env: options?.env || (typeof process !== "undefined" ? process.env : {}),
      preferDeterministicOnly: options?.preferDeterministicOnly === true,
    });
    if (!result?.ok || !result.structured) return null;
    return { source: result.source, structured: result.structured };
  } catch {
    return null;
  }
}

/**
 * Produces validated parent-facing explanation for attachment to the V2 report object.
 *
 * Phase B: routes through `buildParentAiContext` so the strict explainer input is derived alongside
 * the canonical `TruthPacketV1` for the same payload + scope. The truth packet is not consumed by the
 * deterministic / LLM explainer in this phase (the explainer reads only `strictExplainerInput`),
 * but its presence in the context object guarantees both Parent AI surfaces share one grounding source.
 *
 * Insight Packet phase: in addition to the legacy `text` (single Hebrew paragraph), this function
 * also builds the structured narrative ("סיכום חכם להורה") via the Insight Packet pipeline. The
 * structured object is attached as `parentAiExplanation.structured`. The renderer prefers the
 * structured object when present; the legacy `text` remains as a back-compat field so any external
 * consumer that still reads it keeps working.
 *
 * @param {Record<string, unknown>} report
 * @param {{
 *   env?: Record<string, string | undefined>;
 *   preferDeterministicOnly?: boolean;
 *   scope?: unknown;
 *   canonicalIntent?: string;
 *   now?: string;
 * }} [options]
 * @returns {Promise<{ parentAiExplanation: { ok: true, text: string, source: "deterministic_fallback"|"ai", structured?: object | null } | null }>}
 */
export async function enrichParentReportWithParentAi(report, options = {}) {
  try {
    const context = buildParentAiContext({
      payload: report,
      scope: options.scope,
      canonicalIntent: options.canonicalIntent,
      strictExplainerInputBuilder: (payload) =>
        buildStrictParentReportAIInputFromParentReportV2(/** @type {Record<string, unknown>} */ (payload)),
    });
    const strict = context.strictExplainerInput;
    if (!strict) return { parentAiExplanation: null };
    const out = await buildParentReportAIExplanation(strict, {
      env: options.env || (typeof process !== "undefined" ? process.env : {}),
      preferDeterministicOnly: options.preferDeterministicOnly === true,
    });
    if (!out.ok || !out.text) return { parentAiExplanation: null };

    const structuredResult = await buildStructuredNarrativeFromV2Snapshot(report, {
      env: options.env,
      preferDeterministicOnly: options.preferDeterministicOnly === true,
      now: typeof options?.now === "string" ? options.now : "",
    });

    return {
      parentAiExplanation: {
        ok: true,
        text: out.text,
        source: out.source,
        structured: structuredResult?.structured || null,
        structuredSource: structuredResult?.source || null,
      },
    };
  } catch {
    return { parentAiExplanation: null };
  }
}

function buildSynchronousStructuredFallback(v2Snapshot) {
  try {
    const packet = buildInsightPacketFromV2Snapshot(v2Snapshot);
    if (!packet || packet.ok === false) return null;
    return buildDeterministicFallbackNarrative(packet);
  } catch {
    return null;
  }
}

/**
 * Deterministic Parent AI insight from a detailed-report payload **synchronously** (Phase C.1).
 * Matches the deterministic narrative used when the LLM path is skipped — safe for first paint before
 * `enrichDetailedParentReportWithParentAi` resolves (PDF / print snapshots).
 *
 * @param {Record<string, unknown>|null|undefined} detailedPayload
 * @returns {{ ok: true; text: string; source: "deterministic_fallback"; structured?: object | null; structuredSource?: "deterministic_fallback" | null } | null}
 */
export function getDeterministicDetailedParentAiExplanation(detailedPayload) {
  try {
    const snapshot = parentReportV2SnapshotFromDetailedPayload(detailedPayload);
    if (!snapshot) return null;
    const strict = buildStrictParentReportAIInputFromParentReportV2(snapshot);
    if (!strict) return null;
    const text = getDeterministicParentReportExplanation(strict);
    const structured = buildSynchronousStructuredFallback(snapshot);
    return {
      ok: true,
      text,
      source: "deterministic_fallback",
      structured: structured || null,
      structuredSource: structured ? "deterministic_fallback" : null,
    };
  } catch {
    return null;
  }
}

/**
 * Same deterministic baseline as detailed, for the short parent report object (`generateParentReportV2`).
 * Ensures first paint / PDF / Playwright sees תובנה להורה before async enrich resolves.
 *
 * @param {Record<string, unknown>|null|undefined} report
 * @returns {{ ok: true; text: string; source: "deterministic_fallback"; structured?: object | null; structuredSource?: "deterministic_fallback" | null } | null}
 */
export function getDeterministicParentAiExplanationFromParentReportV2(report) {
  try {
    if (!report || typeof report !== "object") return null;
    const strict = buildStrictParentReportAIInputFromParentReportV2(report);
    if (!strict) return null;
    const text = getDeterministicParentReportExplanation(strict);
    const structured = buildSynchronousStructuredFallback(report);
    return {
      ok: true,
      text,
      source: "deterministic_fallback",
      structured: structured || null,
      structuredSource: structured ? "deterministic_fallback" : null,
    };
  } catch {
    return null;
  }
}
