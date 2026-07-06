/**
 * Parent report surface — unified topic tier (display/placement only; no engine changes).
 */

import { resolveGradeAwareParentTopicTier } from "../parent-report-language/grade-context-parent-he.js";

/** @typedef {'strong'|'monitor'|'strengthen'|'needs_guidance'|'clear_gap'|'low_evidence'|'advanced_practice'|'foundation_practice'} ParentTopicTier */

export const PARENT_TOPIC_TIER = Object.freeze({
  STRONG: "strong",
  MONITOR: "monitor",
  STRENGTHEN: "strengthen",
  NEEDS_GUIDANCE: "needs_guidance",
  CLEAR_GAP: "clear_gap",
  LOW_EVIDENCE: "low_evidence",
  ADVANCED_PRACTICE: "advanced_practice",
  FOUNDATION_PRACTICE: "foundation_practice",
});

const TIER_LABEL_HE = Object.freeze({
  strong: "נראה חזק",
  monitor: "כדאי לעקוב",
  strengthen: "כדאי לחזק",
  needs_guidance: "כדאי ללוות",
  clear_gap: "דורש חיזוק",
  low_evidence: "מעט שאלות",
  advanced_practice: "מעל רמת הכיתה",
  foundation_practice: "יסודות קודמים",
});

const TIER_SECTION_TITLE_HE = Object.freeze({
  strong: "נושאים חזקים",
  monitor: "נושאים שכדאי לעקוב אחריהם",
  strengthen: "נושאים שכדאי לחזק",
  needs_guidance: "נושאים שכדאי ללוות בתרגול",
  clear_gap: "נושאים שכדאי לחזק",
  low_evidence: "נושאים עם מעט שאלות",
  advanced_practice: "תרגול מעל רמת הכיתה",
  foundation_practice: "תרגול יסודות קודמים",
});

const TIER_PLACEMENT_KIND = Object.freeze({
  strong: "strength",
  monitor: "neutral",
  strengthen: "focus",
  needs_guidance: "focus",
  clear_gap: "focus",
  low_evidence: "neutral",
  advanced_practice: "neutral",
  foundation_practice: "neutral",
});

function clean(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Surface-only engineDecision inference (mirrors copy builder; does not mutate engine).
 * @param {{ q: number, acc: number, engineDecisionFromSig?: string|null|undefined }} p
 */
export function inferSurfaceEngineDecision(p) {
  const q = Math.max(0, Math.round(Number(p.q) || 0));
  const acc = Math.max(0, Math.min(100, Math.round(Number(p.acc) || 0)));
  let d = clean(p.engineDecisionFromSig);
  if (!d && q < 5) d = "insufficient_data";
  if (!d && acc >= 90 && q >= 10) d = "mastery_stable";
  if (!d) d = acc < 55 ? "clear_topic_gap" : acc < 72 ? "topic_needs_strengthening" : "partial_stable";
  if (d === "insufficient_data" && q >= 5) {
    d = acc < 55 ? "clear_topic_gap" : acc < 72 ? "topic_needs_strengthening" : "partial_stable";
  }
  return d;
}

function gradeRelationFromMapRow(mapRow) {
  if (!mapRow || typeof mapRow !== "object") return "unknown";
  return String(
    mapRow.gradeRelation || mapRow.rowIdentityV1?.gradeRelation || "unknown"
  ).trim();
}

/**
 * @param {unknown} u — diagnosticEngineV2 unit
 * @param {object|null|undefined} mapRow
 * @returns {ParentTopicTier}
 */
export function parentTopicTierFromUnit(u, mapRow) {
  const traces = Array.isArray(u?.evidenceTrace) ? u.evidenceTrace : [];
  const volume = traces.find((t) => String(t?.type || "") === "volume")?.value || {};
  let q = Number(volume?.questions) || 0;
  let acc = Number(volume?.accuracy) || 0;
  if (mapRow && typeof mapRow === "object") {
    const qc = Number(mapRow.questions);
    const ap = Number(mapRow.accuracy);
    if (Number.isFinite(qc) && qc >= 0) q = Math.round(qc);
    if (Number.isFinite(ap)) acc = Math.max(0, Math.min(100, Math.round(ap)));
  }

  const sig =
    mapRow?.topicEngineRowSignals && typeof mapRow.topicEngineRowSignals === "object"
      ? mapRow.topicEngineRowSignals
      : null;
  const ed =
    sig?.engineDiagnosticDecision && typeof sig.engineDiagnosticDecision === "object"
      ? sig.engineDiagnosticDecision
      : null;
  const engineDecision = inferSurfaceEngineDecision({
    q,
    acc,
    engineDecisionFromSig: ed?.engineDecision,
  });

  let baseTier;
  if (q < 5) {
    baseTier = PARENT_TOPIC_TIER.LOW_EVIDENCE;
  } else if (acc < 55) {
    baseTier = PARENT_TOPIC_TIER.CLEAR_GAP;
  } else if (acc >= 90 && q >= 10) {
    baseTier = PARENT_TOPIC_TIER.STRONG;
  } else if (acc >= 78 && q >= 20) {
    baseTier = PARENT_TOPIC_TIER.MONITOR;
  } else if (acc >= 60 && acc < 78) {
    baseTier = PARENT_TOPIC_TIER.STRENGTHEN;
  } else {
    switch (engineDecision) {
      case "mastery_stable":
        baseTier = PARENT_TOPIC_TIER.STRONG;
        break;
      case "partial_stable":
        baseTier = acc >= 72 ? PARENT_TOPIC_TIER.MONITOR : PARENT_TOPIC_TIER.STRENGTHEN;
        break;
      case "topic_needs_strengthening":
        baseTier = PARENT_TOPIC_TIER.STRENGTHEN;
        break;
      case "clear_topic_gap":
        baseTier = PARENT_TOPIC_TIER.CLEAR_GAP;
        break;
      case "early_direction_only":
      case "insufficient_data":
        baseTier = PARENT_TOPIC_TIER.LOW_EVIDENCE;
        break;
      default:
        baseTier = acc >= 72 ? PARENT_TOPIC_TIER.MONITOR : PARENT_TOPIC_TIER.STRENGTHEN;
    }
  }

  return resolveGradeAwareParentTopicTier(baseTier, gradeRelationFromMapRow(mapRow), q);
}

/** @param {ParentTopicTier} tier */
export function parentTopicTierLabelHe(tier) {
  return TIER_LABEL_HE[String(tier || "")] || "במעקב";
}

/** @param {ParentTopicTier} tier */
export function parentTopicTierSectionTitleHe(tier) {
  return TIER_SECTION_TITLE_HE[String(tier || "")] || "נושאים";
}

/** @param {ParentTopicTier} tier */
export function parentTopicTierPlacementKind(tier) {
  return TIER_PLACEMENT_KIND[String(tier || "")] || "neutral";
}

/**
 * Topics that belong in actionable recommendation cards (not monitor/strong).
 * @param {ParentTopicTier} tier
 */
export function parentTopicTierShowsRecommendationCard(tier) {
  return (
    tier === PARENT_TOPIC_TIER.STRENGTHEN ||
    tier === PARENT_TOPIC_TIER.NEEDS_GUIDANCE ||
    tier === PARENT_TOPIC_TIER.CLEAR_GAP ||
    tier === PARENT_TOPIC_TIER.ADVANCED_PRACTICE ||
    tier === PARENT_TOPIC_TIER.FOUNDATION_PRACTICE
  );
}

/**
 * @param {ParentTopicTier} tier
 */
export function parentTopicTierUsesGuidanceSectionTitle(tier) {
  return tier === PARENT_TOPIC_TIER.NEEDS_GUIDANCE || tier === PARENT_TOPIC_TIER.CLEAR_GAP;
}

/**
 * @param {object[]} rows — topic overview rows with parentTier
 * @returns {Record<string, object[]>}
 */
export function groupTopicRowsByParentTier(rows) {
  /** @type {Record<string, object[]>} */
  const out = {
    strong: [],
    monitor: [],
    strengthen: [],
    needs_guidance: [],
    clear_gap: [],
    low_evidence: [],
    advanced_practice: [],
    foundation_practice: [],
  };
  for (const row of Array.isArray(rows) ? rows : []) {
    const t = String(row?.parentTier || "");
    if (out[t]) out[t].push(row);
  }
  return out;
}
