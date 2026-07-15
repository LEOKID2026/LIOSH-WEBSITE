/**
 * Unified Parent AI context builder (Phase B — infrastructure alignment only).
 *
 * Single canonical entry point that produces, for a given parent-report payload + scope:
 *   - `truthPacket`           - the same `TruthPacketV1` already used by the Parent Copilot Q&A engine
 *                               (`utils/parent-copilot/truth-packet-v1.js`). Source of grounding for the Q&A path.
 *   - `strictExplainerInput`  - the strict allowlisted input consumed by `buildParentReportAIExplanation`
 *                               (`utils/parent-report-ai/parent-report-ai-explainer.js`). Source of grounding
 *                               for the Parent AI summary insight ("תובנה להורה") path.
 *
 * Why both fields:
 *   The Parent Copilot Q&A and the Parent AI summary insight previously lived on parallel grounding paths.
 *   This helper formalizes a single shared canonical projection: both products of one (payload, scope)
 *   normalization. The Q&A engine continues to call `buildTruthPacketV1` directly inside its runtime
 *   (per Phase B brief: "Parent Copilot should continue using TruthPacketV1"); the summary insight path
 *   now goes through this helper. Future phases may converge the runtime callsites further.
 *
 * Constraints honored:
 *   - No behavior change for the short report's existing "תובנה להורה" rendering.
 *   - No changes to TruthPacketV1 internals, validators, guardrails, banks, taxonomies, or engines.
 *   - The strict-input projection function is *injected* by the caller (the adapter), so this module
 *     does not import from `utils/parent-report-ai/*` and there is no circular dependency.
 */

import { buildTruthPacketV1 } from "../parent-copilot/truth-packet-v1.js";

/** Default Hebrew label used for the executive (report-wide) scope when no caller-provided label exists. */
export const DEFAULT_EXECUTIVE_SCOPE_LABEL_HE = "סיכום תקופתי";

/** Default canonical intent for the report-wide summary insight surface. */
export const DEFAULT_PARENT_AI_CANONICAL_INTENT = "explain_report";

/** Allowed scope types accepted by both `buildTruthPacketV1` and downstream Parent AI consumers. */
const ALLOWED_SCOPE_TYPES = new Set(["topic", "subject", "executive"]);

/**
 * @returns {{ scopeType: "executive"; scopeId: "executive"; scopeLabel: string; canonicalIntent: string }}
 */
export function buildDefaultExecutiveScope() {
  return {
    scopeType: "executive",
    scopeId: "executive",
    scopeLabel: DEFAULT_EXECUTIVE_SCOPE_LABEL_HE,
    canonicalIntent: DEFAULT_PARENT_AI_CANONICAL_INTENT,
  };
}

/**
 * Coerce an arbitrary scope-like value into the canonical shape accepted by `buildTruthPacketV1`.
 * Falls back to a default executive scope when the input is missing, malformed, or carries an
 * unsupported `scopeType`. Caller-supplied `canonicalIntent` (function arg) wins over `scope.canonicalIntent`.
 *
 * @param {unknown} scope
 * @param {string} [canonicalIntentOverride]
 * @returns {{ scopeType: "topic"|"subject"|"executive"; scopeId: string; scopeLabel: string; canonicalIntent: string }}
 */
export function normalizeParentAiScope(scope, canonicalIntentOverride) {
  const fallback = buildDefaultExecutiveScope();
  const s = scope && typeof scope === "object" ? /** @type {Record<string, unknown>} */ (scope) : null;
  const rawType = s ? String(s.scopeType || "").trim().toLowerCase() : "";
  const scopeType = ALLOWED_SCOPE_TYPES.has(rawType)
    ? /** @type {"topic"|"subject"|"executive"} */ (rawType)
    : fallback.scopeType;
  const scopeId = s && s.scopeId != null ? String(s.scopeId).trim() : "";
  const scopeLabel = s && s.scopeLabel != null ? String(s.scopeLabel).trim() : "";
  const intent =
    typeof canonicalIntentOverride === "string" && canonicalIntentOverride.trim().length > 0
      ? canonicalIntentOverride.trim()
      : s && typeof s.canonicalIntent === "string" && s.canonicalIntent.trim().length > 0
        ? s.canonicalIntent.trim()
        : fallback.canonicalIntent;
  return {
    scopeType,
    scopeId: scopeId || (scopeType === "executive" ? fallback.scopeId : scopeId),
    scopeLabel: scopeLabel || (scopeType === "executive" ? fallback.scopeLabel : scopeLabel || ""),
    canonicalIntent: intent,
  };
}

/**
 * Safely build the truth packet for a given (payload, scope). Returns null if `buildTruthPacketV1`
 * throws or if the payload is missing — callers must handle null without crashing.
 *
 * @param {unknown} payload
 * @param {{ scopeType: "topic"|"subject"|"executive"; scopeId: string; scopeLabel: string; canonicalIntent?: string }} scope
 */
function safeBuildTruthPacket(payload, scope) {
  if (!payload) return null;
  try {
    return buildTruthPacketV1(payload, scope) || null;
  } catch {
    return null;
  }
}

/**
 * Safely run an injected strict-explainer-input projection. Returns null when no projection function
 * was supplied or when the projection throws. Never raises — Parent AI surfaces must degrade silently.
 *
 * @param {unknown} payload
 * @param {((payload: unknown, ctx: { truthPacket: object|null, scope: object }) => unknown) | undefined | null} projection
 * @param {{ truthPacket: object|null; scope: object }} ctx
 */
function safeRunStrictInputProjection(payload, projection, ctx) {
  if (typeof projection !== "function") return null;
  if (!payload) return null;
  try {
    const out = projection(payload, ctx);
    return out || null;
  } catch {
    return null;
  }
}

/**
 * Build the unified Parent AI context for a payload + scope.
 *
 * @param {object} args
 * @param {unknown} args.payload
 *   The parent-report payload (e.g. the result of `generateParentReportV2`). Must be the same payload
 *   shape both the short report and the Parent Copilot already consume.
 * @param {unknown} [args.scope]
 *   Optional scope object. Defaults to a report-wide executive scope when omitted, malformed, or
 *   carrying an unsupported `scopeType`.
 * @param {string} [args.canonicalIntent]
 *   Optional canonical intent override (e.g. "explain_report"). Wins over `scope.canonicalIntent`
 *   when both are supplied. Defaults to `DEFAULT_PARENT_AI_CANONICAL_INTENT` ("explain_report").
 * @param {((payload: unknown, ctx: { truthPacket: object|null; scope: object }) => unknown)} [args.strictExplainerInputBuilder]
 *   Optional projection function. The adapter that owns the strict-input shape injects its existing
 *   projection here so this module does not depend on `utils/parent-report-ai/*` (no circular import).
 *   When omitted, `strictExplainerInput` is `null` - the truth packet is still produced.
 * @returns {{
 *   payload: unknown;
 *   scope: { scopeType: "topic"|"subject"|"executive"; scopeId: string; scopeLabel: string; canonicalIntent: string };
 *   truthPacket: object | null;
 *   strictExplainerInput: object | null;
 * }}
 */
export function buildParentAiContext({ payload, scope, canonicalIntent, strictExplainerInputBuilder } = /** @type {any} */ ({})) {
  const normalizedScope = normalizeParentAiScope(scope, canonicalIntent);
  const truthPacket = safeBuildTruthPacket(payload, normalizedScope);
  const strictExplainerInput = safeRunStrictInputProjection(payload, strictExplainerInputBuilder, {
    truthPacket,
    scope: normalizedScope,
  });
  return {
    payload,
    scope: normalizedScope,
    truthPacket,
    strictExplainerInput,
  };
}

/* -------------------------------------------------------------------------- */
/*  Phase B.1 — Consistency layer                                              */
/* -------------------------------------------------------------------------- */
/*
 * Phase B.1 — Anti-divergence layer between Parent AI summary insight and Parent Copilot.
 *
 * Background:
 *   Phase B unified both Parent AI surfaces under `buildParentAiContext`, but the strict
 *   explainer input is still produced by its own projection (`buildStrictParentReportAIInputFromParentReportV2`)
 *   while the truth packet comes from `buildTruthPacketV1`. The two projections legitimately
 *   read different parts of the payload (truth packet anchors on `subjectProfiles[*].topicRecommendations[*].contractsV1`;
 *   the strict projection reads `summary.{subject}Questions/Accuracy`, `hybridRuntime`, etc.). They cannot be
 *   collapsed into one without losing fields the strict input needs (grade, consistencyBand,
 *   mainStrengths/mainPracticeNeeds, plannerQuestionCount). So pure derivation (Option A) is
 *   structurally infeasible without behavior change.
 *
 *   Instead, this layer (Option B in the Phase B.1 brief) verifies that both projections agree on
 *   the *core grounding semantics* the user listed:
 *     - scope / subject
 *     - confidence / data sufficiency
 *     - recommendation eligibility / decision band
 *     - next-step / planner action meaning
 *     - strengths / needs source meaning
 *
 *   When they disagree silently, `verifyParentAiContextConsistency` flags it. A focused test
 *   (`scripts/parent-ai-context-consistency.mjs`) calls this layer over representative payloads
 *   and fails CI on silent disagreement.
 *
 * Secondary-source mode:
 *   `buildTruthPacketV1` falls back to `buildTruthPacketV1NoAnchoredFallback` when the payload has no
 *   anchored `topicRecommendations` rows. In that case the truth packet carries no per-topic grounding
 *   and the strict projection legitimately uses raw aggregates as a documented secondary source.
 *   The consistency layer detects this via `truthPacket.contracts.narrative.subjectId === "__no_anchor__"`
 *   and reports `secondarySource: true`. In secondary-source mode, content-level rules are downgraded
 *   from issues to informational notes — there is nothing for the truth packet to disagree about.
 */

const NO_ANCHOR_TOKEN = "__no_anchor__";

const SUBJECT_KEY_ALIASES = {
  math: "math",
  hebrew: "hebrew",
  english: "english",
  science: "science",
  geometry: "geometry",
  "moledet-geography": "moledet-geography",
  moledetgeography: "moledet-geography",
  moledet: "moledet-geography",
  geography: "moledet-geography",
};

function normalizeSubjectKey(raw) {
  const x = String(raw || "").trim().toLowerCase();
  if (!x) return "";
  return SUBJECT_KEY_ALIASES[x] || x;
}

/**
 * Project a `TruthPacketV1` into the canonical core-grounding shape used for cross-projection
 * consistency checks. Returns `null` when the truth packet is missing.
 *
 * @param {object|null|undefined} truthPacket
 * @returns {{
 *   scopeType: "topic"|"subject"|"executive";
 *   scopeId: string;
 *   subjectId: string;
 *   subjectKey: string;
 *   noAnchoredFallback: boolean;
 *   cannotConcludeYet: boolean;
 *   recommendationEligible: boolean;
 *   recommendationIntensityCap: "RI0"|"RI1"|"RI2"|"RI3";
 *   readiness: "insufficient"|"forming"|"emerging"|"ready";
 *   confidenceBand: "low"|"medium"|"high";
 *   decisionBand: "no_data"|"review"|"maintain"|"advance";
 *   hasAnchoredObservation: boolean;
 * } | null}
 */
export function deriveCoreGroundingFromTruthPacket(truthPacket) {
  if (!truthPacket || typeof truthPacket !== "object") return null;
  const tp = /** @type {Record<string, any>} */ (truthPacket);
  const contracts = tp.contracts && typeof tp.contracts === "object" ? tp.contracts : {};
  const narrative = contracts.narrative && typeof contracts.narrative === "object" ? contracts.narrative : {};
  const derivedLimits = tp.derivedLimits && typeof tp.derivedLimits === "object" ? tp.derivedLimits : {};

  const subjectId = String(narrative.subjectId || "").trim();
  const noAnchoredFallback = subjectId === NO_ANCHOR_TOKEN || String(narrative.topicKey || "") === NO_ANCHOR_TOKEN;
  const subjectKey = subjectId === "executive" || subjectId === NO_ANCHOR_TOKEN ? "" : normalizeSubjectKey(subjectId);

  const cannotConcludeYet = derivedLimits.cannotConcludeYet === true;
  const recommendationEligible = derivedLimits.recommendationEligible === true;
  const recommendationIntensityCap = (() => {
    const c = String(derivedLimits.recommendationIntensityCap || "RI0").toUpperCase();
    return c === "RI0" || c === "RI1" || c === "RI2" || c === "RI3" ? c : "RI0";
  })();
  const readiness = (() => {
    const r = String(derivedLimits.readiness || "insufficient").toLowerCase();
    return r === "ready" || r === "emerging" || r === "forming" ? r : "insufficient";
  })();
  const confidenceBand = (() => {
    const c = String(derivedLimits.confidenceBand || "low").toLowerCase();
    return c === "high" || c === "medium" ? c : "low";
  })();

  let decisionBand;
  if (cannotConcludeYet || noAnchoredFallback) decisionBand = "no_data";
  else if (recommendationEligible && (recommendationIntensityCap === "RI2" || recommendationIntensityCap === "RI3")) decisionBand = "advance";
  else if (recommendationEligible) decisionBand = "maintain";
  else decisionBand = "review";

  const obs = String(narrative?.textSlots?.observation || "").trim();

  return {
    scopeType: tp.scopeType,
    scopeId: String(tp.scopeId || ""),
    subjectId,
    subjectKey,
    noAnchoredFallback,
    cannotConcludeYet,
    recommendationEligible,
    recommendationIntensityCap,
    readiness,
    confidenceBand,
    decisionBand,
    hasAnchoredObservation: !noAnchoredFallback && obs.length >= 14,
  };
}

const STRICT_PLANNER_BAND = {
  pause_collect_more_data: "no_data",
  review_prerequisite: "review",
  probe_skill: "review",
  practice_current: "review",
  maintain_skill: "maintain",
  advance_skill: "advance",
};

const STRICT_DATA_CONFIDENCE_BAND = {
  thin: "low",
  low: "low",
  moderate: "medium",
  strong: "high",
};

/**
 * Project the strict explainer input into the canonical core-grounding shape.
 * Returns `null` when the strict input is missing - meaning the summary insight surface will
 * not render anyway and there is nothing to compare.
 *
 * @param {object|null|undefined} strictInput
 * @returns {{
 *   subjectKey: string;
 *   plannerNextAction: string;
 *   plannerNextActionBand: "no_data"|"review"|"maintain"|"advance"|"unknown";
 *   accuracyBand: string;
 *   dataConfidence: string;
 *   dataConfidenceBand: "low"|"medium"|"high"|"unknown";
 *   hasStrengthsText: boolean;
 *   hasNeedsText: boolean;
 *   recommendedNextStepText: string;
 * } | null}
 */
export function deriveCoreGroundingFromStrictExplainerInput(strictInput) {
  if (!strictInput || typeof strictInput !== "object") return null;
  const si = /** @type {Record<string, any>} */ (strictInput);

  const subjectKey = normalizeSubjectKey(si.subject);
  const plannerNextAction = String(si.plannerNextAction || "").toLowerCase();
  const plannerNextActionBand = STRICT_PLANNER_BAND[plannerNextAction] || "unknown";
  const accuracyBand = String(si.accuracyBand || "").toLowerCase();
  const dataConfidence = String(si.dataConfidence || "").toLowerCase();
  const dataConfidenceBand = STRICT_DATA_CONFIDENCE_BAND[dataConfidence] || "unknown";
  const hasStrengthsText = String(si.mainStrengths || "").trim().length > 0;
  const hasNeedsText = String(si.mainPracticeNeeds || "").trim().length > 0;
  const recommendedNextStepText = String(si.recommendedNextStep || "").trim();

  return {
    subjectKey,
    plannerNextAction,
    plannerNextActionBand,
    accuracyBand,
    dataConfidence,
    dataConfidenceBand,
    hasStrengthsText,
    hasNeedsText,
    recommendedNextStepText,
  };
}

/**
 * Verify that the strict explainer input and the truth packet agree on the user-listed
 * core grounding fields:
 *   - subject anchoring
 *   - confidence / data sufficiency
 *   - recommendation eligibility / decision band
 *   - next-step / planner action meaning
 *   - strengths / needs source presence
 *
 * Returns:
 *   - `ok`             - `true` when no hard issues are detected (strict mode) OR when running in
 *                        secondary-source mode (truth packet has no anchored data and content-level
 *                        rules are deferred to informational notes).
 *   - `secondarySource`- `true` when the truth packet uses the no-anchor fallback path. In this mode
 *                        the strict projection legitimately uses raw aggregates as a secondary source.
 *   - `issues`         - array of disagreement records, each `{ rule, severity: "issue"|"info", message }`.
 *                        A non-empty `issues` array with at least one `severity === "issue"` ⇒ `ok = false`.
 *   - `truthGrounding` - the projected core-grounding from the truth packet (or `null`).
 *   - `strictGrounding`- the projected core-grounding from the strict input (or `null`).
 *
 * The function never throws: malformed inputs degrade to a no-comparison result with `ok: true`.
 *
 * @param {{ truthPacket?: object|null; strictExplainerInput?: object|null; scope?: object|null } | null | undefined} context
 * @returns {{
 *   ok: boolean;
 *   secondarySource: boolean;
 *   issues: Array<{ rule: string; severity: "issue"|"info"; message: string }>;
 *   truthGrounding: ReturnType<typeof deriveCoreGroundingFromTruthPacket>;
 *   strictGrounding: ReturnType<typeof deriveCoreGroundingFromStrictExplainerInput>;
 * }}
 */
export function verifyParentAiContextConsistency(context) {
  const c = context && typeof context === "object" ? context : {};
  const truthGrounding = deriveCoreGroundingFromTruthPacket(c.truthPacket);
  const strictGrounding = deriveCoreGroundingFromStrictExplainerInput(c.strictExplainerInput);

  /** @type {Array<{ rule: string; severity: "issue"|"info"; message: string }>} */
  const issues = [];

  if (!truthGrounding || !strictGrounding) {
    return { ok: true, secondarySource: !!truthGrounding?.noAnchoredFallback, issues, truthGrounding, strictGrounding };
  }

  const secondarySource = truthGrounding.noAnchoredFallback === true;

  const push = (rule, severity, message) => issues.push({ rule, severity, message });
  const pushHardOrInfo = (rule, message) => push(rule, secondarySource ? "info" : "issue", message);

  if (truthGrounding.scopeType !== "executive" && !secondarySource) {
    if (truthGrounding.subjectKey && strictGrounding.subjectKey && truthGrounding.subjectKey !== strictGrounding.subjectKey) {
      push(
        "subject_alignment",
        "issue",
        `Truth packet subject "${truthGrounding.subjectKey}" disagrees with strict input subject "${strictGrounding.subjectKey}" for non-executive scope.`,
      );
    }
  }

  if (truthGrounding.cannotConcludeYet === true) {
    if (strictGrounding.plannerNextActionBand === "advance" || strictGrounding.plannerNextActionBand === "maintain") {
      pushHardOrInfo(
        "cannot_conclude_blocks_advance_or_maintain",
        `Truth packet says cannotConcludeYet=true but strict input plannerNextAction="${strictGrounding.plannerNextAction}" implies "${strictGrounding.plannerNextActionBand}". Should be a conservative review/probe/pause action.`,
      );
    }
  }

  if (truthGrounding.cannotConcludeYet === false && truthGrounding.recommendationEligible === true) {
    if (strictGrounding.plannerNextActionBand === "no_data") {
      pushHardOrInfo(
        "eligible_should_not_be_pause",
        `Truth packet says recommendationEligible=true (cannotConcludeYet=false) but strict input plannerNextAction="${strictGrounding.plannerNextAction}" implies "no_data" / pause.`,
      );
    }
  }

  if (truthGrounding.confidenceBand === "low") {
    if (strictGrounding.dataConfidenceBand === "high") {
      pushHardOrInfo(
        "confidence_low_disagreement",
        `Truth packet confidenceBand=low but strict input dataConfidence="${strictGrounding.dataConfidence}" projects to "high".`,
      );
    }
  }
  if (truthGrounding.confidenceBand === "high") {
    if (strictGrounding.dataConfidenceBand === "low") {
      pushHardOrInfo(
        "confidence_high_disagreement",
        `Truth packet confidenceBand=high but strict input dataConfidence="${strictGrounding.dataConfidence}" projects to "low".`,
      );
    }
  }

  if (truthGrounding.recommendationEligible === false) {
    if (strictGrounding.plannerNextActionBand === "advance") {
      pushHardOrInfo(
        "ineligible_should_not_advance",
        `Truth packet says recommendationEligible=false but strict input plannerNextAction="${strictGrounding.plannerNextAction}" advances.`,
      );
    }
  }
  if (truthGrounding.recommendationIntensityCap === "RI0") {
    if (strictGrounding.plannerNextActionBand === "advance") {
      pushHardOrInfo(
        "intensity_cap_ri0_should_not_advance",
        `Truth packet recommendationIntensityCap=RI0 but strict input plannerNextAction="${strictGrounding.plannerNextAction}" advances.`,
      );
    }
  }

  if (
    truthGrounding.recommendationEligible === true &&
    truthGrounding.confidenceBand !== "low" &&
    truthGrounding.cannotConcludeYet === false
  ) {
    if (!strictGrounding.hasStrengthsText && !strictGrounding.hasNeedsText) {
      pushHardOrInfo(
        "strengths_or_needs_required_when_eligible",
        "Truth packet has eligible recommendation with non-low confidence, but strict input has empty mainStrengths and empty mainPracticeNeeds - summary would lack any grounded narrative content.",
      );
    }
  }

  if (!strictGrounding.recommendedNextStepText) {
    pushHardOrInfo(
      "next_step_text_present",
      "Strict input has empty recommendedNextStep. Summary explainer will lack the planner-derived next-step line.",
    );
  }

  const hasHard = issues.some((i) => i.severity === "issue");
  return {
    ok: !hasHard,
    secondarySource,
    issues,
    truthGrounding,
    strictGrounding,
  };
}

export default {
  DEFAULT_EXECUTIVE_SCOPE_LABEL_HE,
  DEFAULT_PARENT_AI_CANONICAL_INTENT,
  buildDefaultExecutiveScope,
  normalizeParentAiScope,
  buildParentAiContext,
  deriveCoreGroundingFromTruthPacket,
  deriveCoreGroundingFromStrictExplainerInput,
  verifyParentAiContextConsistency,
};
