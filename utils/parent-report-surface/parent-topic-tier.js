/**
 * Parent report surface — unified topic tier (display/placement only; no engine changes).
 */

/** @typedef {'strong'|'monitor'|'strengthen'|'needs_guidance'|'clear_gap'|'low_evidence'} ParentTopicTier */

export const PARENT_TOPIC_TIER = Object.freeze({
  STRONG: "strong",
  MONITOR: "monitor",
  STRENGTHEN: "strengthen",
  NEEDS_GUIDANCE: "needs_guidance",
  CLEAR_GAP: "clear_gap",
  LOW_EVIDENCE: "low_evidence",
});

const TIER_LABEL_HE = Object.freeze({
  strong: "חזק",
  monitor: "במעקב",
  strengthen: "לחיזוק",
  needs_guidance: "כדאי ללוות",
  clear_gap: "כדאי לחזק",
  low_evidence: "מעט דוגמאות",
});

const TIER_SECTION_TITLE_HE = Object.freeze({
  strong: "נושאים חזקים",
  monitor: "נושאים במעקב",
  strengthen: "נושאים לחיזוק",
  needs_guidance: "נושאים שכדאי ללוות",
  clear_gap: "נושאים שכדאי לחזק",
  low_evidence: "נושאים עם מעט נתונים",
});

const TIER_PLACEMENT_KIND = Object.freeze({
  strong: "strength",
  monitor: "neutral",
  strengthen: "focus",
  needs_guidance: "focus",
  clear_gap: "focus",
  low_evidence: "neutral",
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

  if (q < 12) return PARENT_TOPIC_TIER.LOW_EVIDENCE;

  if (acc >= 90 && q >= 10) return PARENT_TOPIC_TIER.STRONG;
  if (acc >= 78 && q >= 20) return PARENT_TOPIC_TIER.MONITOR;
  if (acc >= 60 && acc < 78) return PARENT_TOPIC_TIER.STRENGTHEN;
  if (acc < 55 && q >= 12) return PARENT_TOPIC_TIER.CLEAR_GAP;

  switch (engineDecision) {
    case "mastery_stable":
      return PARENT_TOPIC_TIER.STRONG;
    case "partial_stable":
      return acc >= 72 ? PARENT_TOPIC_TIER.MONITOR : PARENT_TOPIC_TIER.STRENGTHEN;
    case "topic_needs_strengthening":
      return PARENT_TOPIC_TIER.STRENGTHEN;
    case "clear_topic_gap":
      return PARENT_TOPIC_TIER.CLEAR_GAP;
    case "early_direction_only":
    case "insufficient_data":
      return PARENT_TOPIC_TIER.LOW_EVIDENCE;
    default:
      return acc >= 72 ? PARENT_TOPIC_TIER.MONITOR : PARENT_TOPIC_TIER.STRENGTHEN;
  }
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
    tier === PARENT_TOPIC_TIER.CLEAR_GAP
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
  };
  for (const row of Array.isArray(rows) ? rows : []) {
    const t = String(row?.parentTier || "");
    if (out[t]) out[t].push(row);
  }
  return out;
}
