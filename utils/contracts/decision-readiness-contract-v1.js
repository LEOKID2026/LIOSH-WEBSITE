/**
 * Phase 2 (approved scope): unified Decision / Readiness / Confidence contracts.
 * Additive contract metadata only. No wording/recommendation behavior changes.
 */

export const DECISION_READINESS_CONTRACT_VERSION = "v1";

export const DECISION_TIER = Object.freeze([0, 1, 2, 3, 4]);
export const CLAIM_CLASSES = Object.freeze([
  "no_claim",
  "descriptive_observation",
  "gentle_pattern",
  "stable_pattern",
  "actionable_guidance",
]);
export const READINESS_STATES = Object.freeze(["insufficient", "emerging", "unstable", "ready"]);
export const CONFIDENCE_BANDS = Object.freeze(["low", "medium", "high"]);
export const CONTRACT_GATE_READINESS = Object.freeze(["insufficient", "forming", "ready"]);
export const INTERNAL_GATE_READINESS_BANDS = Object.freeze(["insufficient", "low", "moderate", "high"]);

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function deriveEvidenceBand(q, ev, suff, cs, cannotConcludeYet) {
  if (cannotConcludeYet || q <= 0 || q < 4 || suff === "low") return 0;
  if (q < 8 || ev === "low" || cs === "withheld") return 1;
  if (cs === "tentative" || ev === "medium" || suff === "medium") return 2;
  if (cs === "strong" && q >= 14) return 4;
  if (cs === "moderate" || (ev === "strong" && q >= 12)) return 3;
  return 2;
}

function normalizeTopicKey(topicKey) {
  const t = String(topicKey ?? "").trim();
  return t || "__unknown_topic__";
}

function normalizeSubjectId(subjectId) {
  const s = String(subjectId ?? "").trim();
  return s || "__unknown_subject__";
}

function normalizeInternalGateReadinessBand(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (INTERNAL_GATE_READINESS_BANDS.includes(s)) return s;
  return "insufficient";
}

function toContractGateReadiness(internalBand, cannotConcludeYet) {
  if (cannotConcludeYet) return "insufficient";
  if (internalBand === "high") return "ready";
  if (internalBand === "moderate" || internalBand === "low") return "forming";
  return "insufficient";
}

function deriveTierFromEvidenceBand(band, cannotConcludeYet, weak) {
  let tier = Math.max(0, Math.min(4, toNumber(band, 0)));
  if (cannotConcludeYet) tier = Math.min(tier, 1);
  if (weak) tier = Math.min(tier, 1);
  return tier;
}

function allowedClaimClassesForTier(tier) {
  if (tier <= 0) return ["no_claim"];
  if (tier === 1) return ["descriptive_observation"];
  if (tier === 2) return ["descriptive_observation", "gentle_pattern"];
  if (tier === 3) return ["descriptive_observation", "gentle_pattern", "stable_pattern"];
  return ["descriptive_observation", "gentle_pattern", "stable_pattern", "actionable_guidance"];
}

function forbiddenClaimClassesForTier(tier) {
  const allowed = new Set(allowedClaimClassesForTier(tier));
  return CLAIM_CLASSES.filter((c) => !allowed.has(c));
}

function deriveReadinessState(gateReadiness, gateState, cannotConcludeYet) {
  if (cannotConcludeYet) return "insufficient";
  const gr = String(gateReadiness || "insufficient");
  const gs = String(gateState || "gates_not_ready");
  // gateReadiness:"high" already passed all evidence guards (weak, stale, low-volume).
  // Requiring gateState !== "gates_not_ready" also blocked first-time high-accuracy topics
  // that haven't been through outcome-tracking yet. The evidence quality check is sufficient.
  if (gr === "high") return "ready";
  if (gr === "moderate") return "emerging";
  if (gr === "low") return gs === "mixed_gate_state" ? "unstable" : "emerging";
  return "insufficient";
}

function maxTierFromReadiness(readiness) {
  if (readiness === "ready") return 4;
  if (readiness === "emerging") return 2;
  if (readiness === "unstable") return 2;
  return 1;
}

function deriveConfidenceBand(dev2ConfidenceLevel, fallbackConfidence) {
  const d = String(dev2ConfidenceLevel || "").toLowerCase();
  if (d === "high") return "high";
  if (d === "moderate") return "medium";
  if (d === "low" || d === "early_signal_only" || d === "insufficient_data" || d === "contradictory") {
    return "low";
  }
  const c = String(fallbackConfidence || "").toLowerCase();
  if (c === "high") return "high";
  if (c === "moderate" || c === "medium") return "medium";
  return "low";
}

function confidenceScoreFromBand(band) {
  if (band === "high") return 0.85;
  if (band === "medium") return 0.55;
  return 0.25;
}

/**
 * @param {object} input
 */
export function buildDecisionContractV1(input) {
  const q = Math.max(0, toNumber(input?.q ?? input?.questions, 0));
  const ev = String(input?.evidenceStrength || "low");
  const suff = String(input?.dataSufficiencyLevel || "low");
  const cs = String(input?.conclusionStrength || "tentative");
  const cannotConcludeYet = !!input?.cannotConcludeYet;
  const weak = !!input?.weak;
  const topicKey = normalizeTopicKey(input?.topicKey);
  const subjectId = normalizeSubjectId(input?.subjectId);
  const internalGateReadinessBand = normalizeInternalGateReadinessBand(input?.internalGateReadinessBand ?? input?.gateReadiness);
  const gateReadiness = toContractGateReadiness(internalGateReadinessBand, cannotConcludeYet);
  const evidenceBand = deriveEvidenceBand(q, ev, suff, cs, cannotConcludeYet);
  const decisionTier = deriveTierFromEvidenceBand(evidenceBand, cannotConcludeYet, weak);

  /** @type {Array<"low_sample"|"contradictory_signals"|"high_variance"|"weak_evidence"|"stale_data"|"cross_mode_mismatch">} */
  const denialReasons = [];
  if (q < 4) denialReasons.push("low_sample");
  if (cannotConcludeYet) denialReasons.push("weak_evidence");
  if (String(input?.dev2ConfidenceLevel || "") === "contradictory") denialReasons.push("contradictory_signals");

  return {
    contractVersion: DECISION_READINESS_CONTRACT_VERSION,
    topicKey,
    subjectId,
    decisionTier,
    evidenceBand,
    allowedClaimClasses: allowedClaimClassesForTier(decisionTier),
    forbiddenClaimClasses: forbiddenClaimClassesForTier(decisionTier),
    cannotConcludeYet,
    gateReadiness,
    internalGateReadinessBand,
    denialReasons,
  };
}

/**
 * @param {object} input
 */
export function buildReadinessContractV1(input) {
  const topicKey = normalizeTopicKey(input?.topicKey);
  const subjectId = normalizeSubjectId(input?.subjectId);
  const internalGateReadinessBand = normalizeInternalGateReadinessBand(input?.internalGateReadinessBand ?? input?.gateReadiness);
  const readiness = deriveReadinessState(
    internalGateReadinessBand,
    String(input?.gateState || "gates_not_ready"),
    !!input?.cannotConcludeYet
  );
  return {
    contractVersion: DECISION_READINESS_CONTRACT_VERSION,
    topicKey,
    subjectId,
    readiness,
    readinessReasonCodes: [
      `gate_readiness:${internalGateReadinessBand}`,
      `gate_state:${String(input?.gateState || "gates_not_ready")}`,
      `cannot_conclude:${!!input?.cannotConcludeYet}`,
    ],
    maxAllowedTier: maxTierFromReadiness(readiness),
  };
}

/**
 * @param {object} input
 */
export function buildConfidenceContractV1(input) {
  const topicKey = normalizeTopicKey(input?.topicKey);
  const subjectId = normalizeSubjectId(input?.subjectId);
  const confidenceBand = deriveConfidenceBand(input?.dev2ConfidenceLevel, input?.confidence);
  return {
    contractVersion: DECISION_READINESS_CONTRACT_VERSION,
    topicKey,
    subjectId,
    confidenceBand,
    confidenceScore01: confidenceScoreFromBand(confidenceBand),
    confidenceDrivers: [
      "sample_size",
      "stability",
      "recency",
      "variance",
      "mode_alignment",
      "contradiction",
    ],
  };
}

/**
 * Canonical single-source input normalizer for Phase 2 contracts.
 * Every builder should consume this normalized source.
 * @param {object} input
 */
export function buildDecisionReadinessSourceV1(input) {
  const src = input && typeof input === "object" ? input : {};
  return {
    topicKey: normalizeTopicKey(src.topicKey),
    subjectId: normalizeSubjectId(src.subjectId),
    q: Math.max(0, toNumber(src.q ?? src.questions, 0)),
    evidenceStrength: String(src.evidenceStrength || "low"),
    dataSufficiencyLevel: String(src.dataSufficiencyLevel || "low"),
    conclusionStrength: String(src.conclusionStrength || "tentative"),
    cannotConcludeYet: !!src.cannotConcludeYet,
    weak: !!src.weak,
    internalGateReadinessBand: normalizeInternalGateReadinessBand(src.internalGateReadinessBand ?? src.gateReadiness),
    gateState: String(src.gateState || "gates_not_ready"),
    dev2ConfidenceLevel: String(src.dev2ConfidenceLevel || ""),
    confidence: String(src.confidence || ""),
  };
}

/**
 * Lightweight check for already-built bundle from an upstream source-of-truth.
 * @param {unknown} bundle
 */
export function isDecisionReadinessContractsBundleV1(bundle) {
  return !!(
    bundle &&
    typeof bundle === "object" &&
    bundle.version === DECISION_READINESS_CONTRACT_VERSION &&
    bundle.decision &&
    bundle.readiness &&
    bundle.confidence
  );
}

/**
 * Unified bundle helper for additive metadata.
 * @param {object} input
 */
export function buildDecisionReadinessContractsBundleV1(input) {
  if (isDecisionReadinessContractsBundleV1(input?.contractsV1)) return input.contractsV1;
  const source = buildDecisionReadinessSourceV1(input);
  const decision = buildDecisionContractV1(source);
  const readiness = buildReadinessContractV1(source);
  const confidence = buildConfidenceContractV1(source);
  return {
    version: DECISION_READINESS_CONTRACT_VERSION,
    sourceOfTruth: "decision-readiness-contract-v1",
    source,
    decision,
    readiness,
    confidence,
  };
}

/**
 * Build contracts as a pure mirror of a CanonicalTopicState.
 * Contracts become read-only projections — no independent derivation.
 * @param {import("../canonical-topic-state/schema.js").CanonicalTopicState} canonicalState
 */
export function buildContractsFromCanonicalState(canonicalState) {
  if (!canonicalState || typeof canonicalState !== "object") {
    throw new Error("buildContractsFromCanonicalState: canonicalState is required");
  }

  const cs = canonicalState;
  const confBand =
    cs.assessment.confidenceLevel === "high" ? "high" :
    cs.assessment.confidenceLevel === "moderate" ? "medium" :
    "low";

  return {
    version: DECISION_READINESS_CONTRACT_VERSION,
    sourceOfTruth: "canonical-topic-state",
    canonicalStateId: cs.topicStateId,
    canonicalStateHash: cs.stateHash,
    source: {
      topicKey: cs.topicKey,
      subjectId: cs.subjectId,
      q: cs.evidence.questions,
      evidenceStrength: cs.evidence.dataSufficiencyLevel,
      dataSufficiencyLevel: cs.evidence.dataSufficiencyLevel,
      conclusionStrength:
        cs.actionState === "withhold" ? "withheld" :
        cs.assessment.confidenceLevel === "high" ? "strong" :
        cs.assessment.confidenceLevel === "moderate" ? "moderate" :
        "tentative",
      cannotConcludeYet: cs.assessment.cannotConcludeYet,
      weak: cs.decisionInputs.weakEvidence || cs.decisionInputs.narrowSample,
      internalGateReadinessBand:
        cs.assessment.confidenceLevel === "high" ? "high" :
        cs.assessment.confidenceLevel === "moderate" ? "moderate" :
        "insufficient",
      gateState: cs.assessment.cannotConcludeYet ? "gates_not_ready" : "continue_gate_active",
      dev2ConfidenceLevel: cs.assessment.confidenceLevel,
      confidence: cs.assessment.confidenceLevel,
    },
    decision: {
      contractVersion: DECISION_READINESS_CONTRACT_VERSION,
      topicKey: cs.topicKey,
      subjectId: cs.subjectId,
      decisionTier: cs.assessment.decisionTier,
      evidenceBand: cs.assessment.decisionTier,
      allowedClaimClasses: CLAIM_CLASSES.slice(0, Math.max(1, cs.assessment.decisionTier + 1)),
      forbiddenClaimClasses: CLAIM_CLASSES.slice(Math.max(1, cs.assessment.decisionTier + 1)),
      cannotConcludeYet: cs.assessment.cannotConcludeYet,
      gateReadiness:
        cs.assessment.readiness === "ready" ? "ready" :
        cs.assessment.readiness === "emerging" || cs.assessment.readiness === "forming" ? "forming" :
        "insufficient",
      internalGateReadinessBand:
        cs.assessment.confidenceLevel === "high" ? "high" :
        cs.assessment.confidenceLevel === "moderate" ? "moderate" :
        "insufficient",
      denialReasons: cs.assessment.cannotConcludeYet ? ["weak_evidence"] : [],
    },
    readiness: {
      contractVersion: DECISION_READINESS_CONTRACT_VERSION,
      topicKey: cs.topicKey,
      subjectId: cs.subjectId,
      readiness: cs.assessment.readiness,
      readinessReasonCodes: [
        `canonical_action:${cs.actionState}`,
        `canonical_readiness:${cs.assessment.readiness}`,
      ],
      maxAllowedTier:
        cs.assessment.readiness === "ready" ? 4 :
        cs.assessment.readiness === "emerging" ? 2 :
        1,
    },
    confidence: {
      contractVersion: DECISION_READINESS_CONTRACT_VERSION,
      topicKey: cs.topicKey,
      subjectId: cs.subjectId,
      confidenceBand: confBand,
      confidenceScore01:
        confBand === "high" ? 0.85 :
        confBand === "medium" ? 0.55 :
        0.25,
      confidenceDrivers: ["canonical_state"],
    },
  };
}
