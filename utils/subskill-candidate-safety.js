/**
 * Stage 4C — safety gate for subskillCandidate (engine-only, no parent copy).
 * Technical subskillCandidate may exist; safeToShowSubskill requires evidence-backed selection.
 */

import { TAXONOMY_BY_ID } from "./diagnostic-engine-v2/taxonomy-registry.js";
import { passesRecurrenceRules } from "./diagnostic-engine-v2/recurrence.js";

/** Align with existing engine v1 guardrails (T1 = q≥10); not a recurrence threshold change. */
export const MIN_Q_FOR_SAFE_SUBSKILL = 10;

/** Minimum wrong events with metadata for safe subskill display. */
export const MIN_WRONG_EVENTS_FOR_SAFE_SUBSKILL = 3;

/**
 * Mirror of parent-report-engine-v1-signals computeAccuracyBand (avoid circular import).
 * @param {number} acc
 * @param {number} q
 */
function computeAccuracyBandLocal(acc, q) {
  const a = Math.round(Number(acc) || 0);
  const n = Number(q) || 0;
  if (n < 5) return "insufficient_data";
  if (a >= 90) return "mastery";
  if (a >= 70) return "partial_good";
  if (a >= 50) return "needs_strengthening";
  return "clear_gap";
}

/**
 * @param {string[]|null|undefined} a
 * @param {string[]|null|undefined} b
 */
function candidateListsEqual(a, b) {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  return left.length === right.length && left.every((id, i) => id === right[i]);
}

/**
 * @param {unknown[]} wrongs
 */
function distinctDayCount(wrongs) {
  const days = new Set();
  for (const e of wrongs) {
    if (!e || typeof e !== "object") continue;
    const t = /** @type {{ timestamp?: number|null }} */ (e).timestamp;
    if (t == null || !Number.isFinite(t)) continue;
    days.add(new Date(t).toISOString().slice(0, 10));
  }
  return days.size;
}

/**
 * @param {unknown[]} wrongs
 */
function metadataSourceBreakdown(wrongs) {
  let questionMeta = 0;
  let taxonomyOnly = 0;
  let other = 0;
  for (const e of wrongs) {
    const src =
      e && typeof e === "object" && e.metadata && typeof e.metadata === "object"
        ? String(e.metadata.metadataSource || "")
        : "";
    if (src === "question_metadata_normalizer") questionMeta += 1;
    else if (src === "taxonomy_topic_enrichment" || src === "taxonomy_missing") taxonomyOnly += 1;
    else if (src) other += 1;
  }
  return { questionMeta, taxonomyOnly, other };
}

/**
 * @param {object} ctx
 * @param {string} ctx.subjectId
 * @param {Record<string, unknown>|null|undefined} ctx.row
 * @param {unknown[]} ctx.wrongs
 * @param {ReturnType<import("./parent-report-engine-taxonomy-bridge.js").resolveRowTaxonomyMatch>|null|undefined} ctx.taxonomyMatch
 * @param {string[]} ctx.candidateIdsRaw
 * @param {string[]} ctx.candidateIdsOrdered
 * @param {string|null|undefined} ctx.chosenId
 * @param {boolean} ctx.recurrenceMatched
 * @param {boolean} [ctx.disambiguationApplied]
 * @param {string|null|undefined} [ctx.disambiguationWinnerId]
 * @param {boolean} [ctx.geographyDefinitionOnly]
 */
export function assessSubskillCandidateSafety(ctx) {
  const wrongs = Array.isArray(ctx.wrongs) ? ctx.wrongs.filter((e) => e && !e.isCorrect) : [];
  const taxonomyMatch = ctx.taxonomyMatch && typeof ctx.taxonomyMatch === "object" ? ctx.taxonomyMatch : null;
  const candidateIdsRaw = Array.isArray(ctx.candidateIdsRaw) ? ctx.candidateIdsRaw : [];
  const candidateIdsOrdered = Array.isArray(ctx.candidateIdsOrdered) ? ctx.candidateIdsOrdered : candidateIdsRaw;
  const chosenId = ctx.chosenId ? String(ctx.chosenId) : null;
  const technical = taxonomyMatch?.subskillCandidate ?? null;

  /** @type {string[]} */
  const blockReasons = [];

  if (!technical || !chosenId) {
    return {
      safeToShowSubskill: false,
      fallbackUsed: false,
      sourceOfSubskill: "none",
      blockReasons: ["no_technical_subskill_candidate"],
      evidenceCount: wrongs.length,
      distinctDays: distinctDayCount(wrongs),
      possibleErrorPatternsPresent: false,
      questionMetadataRate: 0,
      falsePositiveRisk: "no_candidate",
      disambiguationApplied: false,
    };
  }

  const q = Math.max(0, Number(ctx.row?.questions ?? ctx.row?.total ?? ctx.row?.q) || 0);
  const acc = Math.round(Number(ctx.row?.accuracy) || 0);
  const band = computeAccuracyBandLocal(acc, q);
  const trow = TAXONOMY_BY_ID[chosenId] || null;
  const metaBreakdown = metadataSourceBreakdown(wrongs);
  const questionMetadataRate =
    wrongs.length > 0 ? Math.round((metaBreakdown.questionMeta / wrongs.length) * 100) : 0;

  const listDisambiguationApplied =
    candidateIdsRaw.length > 1 && !candidateListsEqual(candidateIdsRaw, candidateIdsOrdered);
  const disambiguationApplied =
    ctx.disambiguationApplied === true ||
    (ctx.disambiguationApplied !== false && listDisambiguationApplied);
  const multiCandidate = candidateIdsRaw.length > 1;
  const fallbackUsed =
    multiCandidate &&
    !disambiguationApplied &&
    chosenId === candidateIdsRaw[0] &&
    !(ctx.disambiguationWinnerId && ctx.disambiguationWinnerId === chosenId);

  const possibleErrorPatternsPresent = wrongs.some(
    (e) =>
      (Array.isArray(e?.possibleErrorPatterns) && e.possibleErrorPatterns.length > 0) ||
      (Array.isArray(e?.metadata?.possibleErrorPatterns) && e.metadata.possibleErrorPatterns.length > 0) ||
      (Array.isArray(e?.expectedErrorTags) && e.expectedErrorTags.length > 0),
  );

  const normBucket = String(taxonomyMatch?.normalizedBucketKey || "").trim().toLowerCase();

  if (fallbackUsed) blockReasons.push("first_candidate_without_disambiguation");
  if (
    ctx.subjectId === "moledet-geography" &&
    normBucket === "geography" &&
    multiCandidate &&
    (!disambiguationApplied || fallbackUsed || ctx.geographyDefinitionOnly === true)
  ) {
    blockReasons.push("geography_multi_candidate_unresolved");
  }
  if (multiCandidate && !disambiguationApplied && !ctx.recurrenceMatched) {
    blockReasons.push("multi_candidate_unresolved");
  }
  if (q < MIN_Q_FOR_SAFE_SUBSKILL) blockReasons.push("low_q");
  if (wrongs.length < MIN_WRONG_EVENTS_FOR_SAFE_SUBSKILL) blockReasons.push("insufficient_wrong_events");
  if (trow && wrongs.length < trow.minWrong) blockReasons.push("below_taxonomy_min_wrong");
  if (trow?.minDistinctDays > 0 && distinctDayCount(wrongs) < trow.minDistinctDays) {
    blockReasons.push("below_taxonomy_min_distinct_days");
  }
  if (band === "mastery") blockReasons.push("mastery_control_row");
  if (band === "partial_good" && acc >= 80 && wrongs.length < 6) {
    blockReasons.push("partial_good_insufficient_weakness");
  }
  if (questionMetadataRate < 25 && metaBreakdown.taxonomyOnly > 0 && metaBreakdown.questionMeta === 0) {
    blockReasons.push("taxonomy_fallback_metadata_only");
  }
  if (normBucket === "mixed" || normBucket === "general") blockReasons.push("general_bucket");

  /** @type {string} */
  let sourceOfSubskill = "unknown";
  if (ctx.recurrenceMatched && trow && passesRecurrenceRules(wrongs, trow)) {
    sourceOfSubskill = possibleErrorPatternsPresent
      ? "recurrence_with_error_patterns"
      : "recurrence_events";
  } else if (fallbackUsed) {
    sourceOfSubskill = "first_candidate_fallback";
  } else if (metaBreakdown.questionMeta > 0) {
    sourceOfSubskill = possibleErrorPatternsPresent
      ? "question_metadata_with_patterns"
      : "question_metadata";
  } else if (metaBreakdown.taxonomyOnly > 0) {
    sourceOfSubskill = "taxonomy_ids_only";
  } else if (possibleErrorPatternsPresent) {
    sourceOfSubskill = "possible_error_patterns";
  }

  const safeToShowSubskill = blockReasons.length === 0;

  return {
    safeToShowSubskill,
    fallbackUsed,
    sourceOfSubskill,
    blockReasons,
    evidenceCount: wrongs.length,
    distinctDays: distinctDayCount(wrongs),
    possibleErrorPatternsPresent,
    questionMetadataRate,
    falsePositiveRisk: safeToShowSubskill ? null : blockReasons[0] || "unsafe",
    disambiguationApplied,
    multiCandidate,
    chosenId,
    taxonomyMinWrong: trow?.minWrong ?? null,
    accuracyBand: band,
  };
}
