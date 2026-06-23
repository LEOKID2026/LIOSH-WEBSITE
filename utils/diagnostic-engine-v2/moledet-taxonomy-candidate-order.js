/**
 * Phase 5-C2 / Stage 4D — moledet-geography conflict buckets only: reorder taxonomy candidates from wrong-event
 * evidence. Never removes candidates. Requires question corroboration for geography bucket (not enrichment-only).
 *
 * Bridge preserve order when evidence is missing, tied, or ambiguous:
 * - maps: MG-01, MG-02, MG-08
 * - geography: MG-01, MG-02, MG-05
 * - homeland: MG-04, MG-06
 */

import {
  routingHaystackForWrongEvent,
  routingRowGradeLevelHaystack,
  countRoutingIndicatorHits,
} from "./diagnostic-routing-haystack.js";
import {
  taxonomyPatternRoutingScores,
  reorderCandidatesByScores,
} from "./taxonomy-pattern-routing-scores.js";

/** @type {readonly string[]} */
const BRIDGE_MAPS = ["MG-01", "MG-02", "MG-08"];

/** @type {readonly string[]} */
const BRIDGE_GEOGRAPHY = ["MG-01", "MG-02", "MG-05"];

/** @type {readonly string[]} */
const BRIDGE_HOMELAND = ["MG-04", "MG-06"];

const MG01_MAPS_GEO_INDICATORS = [
  "compare distances",
  "measuring distance",
  "relative distance",
  "units on map",
  "map units",
  "map scale",
  "scale bar",
  "distance",
  "scale",
  "ruler",
  "map_distance",
  "read_scale",
  "סולם",
  "מרחק",
];

const MG02_MAPS_GEO_INDICATORS = [
  "absolute north",
  "spatial reference",
  "map rotation",
  "rotated map",
  "direction choice",
  "left/right",
  "orientation",
  "compass",
  "direction",
  "north",
  "כיוון",
  "צפון",
  "compass_rose",
];

const MG08_MAPS_INDICATORS = [
  "matching symbol to meaning",
  "landscape symbol",
  "map signs",
  "key reading",
  "map key",
  "symbols",
  "legend",
  "symbol",
  "icon",
  "map_legend",
  "מפתח",
  "סמל",
];

const MG05_GEOGRAPHY_INDICATORS = [
  "geographic region",
  "climate zone",
  "climate map",
  "map key for climate",
  "zone reading",
  "color key",
  "climate",
  "region",
  "area on map",
  "אקלים",
  "אזור",
  "מפת אקלים",
];

const MG04_HOMELAND_INDICATORS = [
  "sequence cards",
  "historical sequence",
  "order of events",
  "event order",
  "chronology",
  "before/after",
  "before_after",
  "timeline",
  "ציר",
  "סדר אירועים",
];

const MG06_HOMELAND_INDICATORS = [
  "two explanations",
  "cause_effect",
  "inference from text/map",
  "inference_from_text",
  "inference",
  "settlement",
  "population",
  "explanation",
  "evidence",
  "reason",
  "סיבה",
  "תוצאה",
];

const MG01_GEO_DEFINITION_BLOCK = [
  "geography:",
  "מה זה",
  "מה הוא",
  "מה היא",
  "מהם",
  "פירוש",
  "definition",
  "concept_recall",
];

/**
 * @param {string} hay
 * @returns {boolean}
 */
function isGeographyDefinitionOnlyHaystack(hay) {
  const hasDefinition = MG01_GEO_DEFINITION_BLOCK.some((ph) => hay.includes(ph));
  const hasMapEvidence =
    countRoutingIndicatorHits(hay, MG01_MAPS_GEO_INDICATORS) > 0 ||
    countRoutingIndicatorHits(hay, MG02_MAPS_GEO_INDICATORS) > 0 ||
    countRoutingIndicatorHits(hay, MG05_GEOGRAPHY_INDICATORS) > 0 ||
    /map|מפה/.test(hay);
  return hasDefinition && !hasMapEvidence;
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ "MG-01": number; "MG-02": number; "MG-08": number }}
 */
export function moledetMapsRoutingScores(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  let s01 = 0;
  let s02 = 0;
  let s08 = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  const tax = taxonomyPatternRoutingScores(["MG-01", "MG-02", "MG-08"], list, row);
  s01 += tax["MG-01"] || 0;
  s02 += tax["MG-02"] || 0;
  s08 += tax["MG-08"] || 0;

  for (const ev of list) {
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev)}`.trim().toLowerCase();
    s01 += countRoutingIndicatorHits(wh, MG01_MAPS_GEO_INDICATORS);
    s02 += countRoutingIndicatorHits(wh, MG02_MAPS_GEO_INDICATORS);
    s08 += countRoutingIndicatorHits(wh, MG08_MAPS_INDICATORS);
  }
  return { "MG-01": s01, "MG-02": s02, "MG-08": s08 };
}

/**
 * @param {unknown} ev
 * @returns {boolean}
 */
function isGeographyDefinitionRecallEvent(ev) {
  const ql = String(
    (ev && typeof ev === "object" ? ev.questionLabel || ev.exerciseText : "") || "",
  ).trim();
  return /geography:|מה זה|מה הוא|מה היא|מהם|פירוש/i.test(ql);
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {boolean}
 */
export function moledetGeographyRowHasMapEvidence(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  const nativeOpts = { excludeEnrichmentPatterns: true };
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  for (const ev of list) {
    if (isGeographyDefinitionRecallEvent(ev)) continue;
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev, nativeOpts)}`.trim().toLowerCase();
    if (countRoutingIndicatorHits(wh, MG01_MAPS_GEO_INDICATORS) > 0) return true;
    if (countRoutingIndicatorHits(wh, MG02_MAPS_GEO_INDICATORS) > 0) return true;
    if (countRoutingIndicatorHits(wh, MG05_GEOGRAPHY_INDICATORS) > 0) return true;
    if (/\bmap\b/.test(wh) && !isGeographyDefinitionOnlyHaystack(wh)) return true;
    if (/מפה\b|מפת\s|map_scale|map_key|map_legend/.test(wh) && !isGeographyDefinitionOnlyHaystack(wh)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ "MG-01": number; "MG-02": number; "MG-05": number; definitionOnly: boolean }}
 */
export function moledetGeographyRoutingScores(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  let s01 = 0;
  let s02 = 0;
  let s05 = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  const nativeOpts = { excludeEnrichmentPatterns: true };

  if (list.length > 0 && !moledetGeographyRowHasMapEvidence(list, row)) {
    return { "MG-01": 0, "MG-02": 0, "MG-05": 0, definitionOnly: true };
  }

  const tax = taxonomyPatternRoutingScores(["MG-01", "MG-02", "MG-05"], list, row, {
    requireQuestionCorroboration: true,
  });
  s01 += tax["MG-01"] || 0;
  s02 += tax["MG-02"] || 0;
  s05 += tax["MG-05"] || 0;

  for (const ev of list) {
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev, nativeOpts)}`.trim().toLowerCase();
    s01 += countRoutingIndicatorHits(wh, MG01_MAPS_GEO_INDICATORS);
    s02 += countRoutingIndicatorHits(wh, MG02_MAPS_GEO_INDICATORS);
    s05 += countRoutingIndicatorHits(wh, MG05_GEOGRAPHY_INDICATORS);
  }
  return { "MG-01": s01, "MG-02": s02, "MG-05": s05, definitionOnly: false };
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ "MG-04": number; "MG-06": number }}
 */
export function moledetHomelandRoutingScores(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  let s04 = 0;
  let s06 = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  const tax = taxonomyPatternRoutingScores(["MG-04", "MG-06"], list, row);
  s04 += tax["MG-04"] || 0;
  s06 += tax["MG-06"] || 0;

  for (const ev of list) {
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev)}`.trim().toLowerCase();
    s04 += countRoutingIndicatorHits(wh, MG04_HOMELAND_INDICATORS);
    if (/\bdates\b/.test(wh)) s04 += 1;
    s06 += countRoutingIndicatorHits(wh, MG06_HOMELAND_INDICATORS);
    if (/\bcause\b/.test(wh)) s06 += 1;
    if (/\beffect\b/.test(wh)) s06 += 1;
    if (/\bwhy\b/.test(wh)) s06 += 1;
  }
  return { "MG-04": s04, "MG-06": s06 };
}

/**
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string }} [ctx]
 * @returns {{ orderedIds: string[]; disambiguationApplied: boolean; winnerId: string|null; scores?: Record<string, number> }}
 */
export function orderMoledetTaxonomyCandidatesWithMeta(candidateIds, wrongEvents, ctx = {}) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return { orderedIds: candidateIds ? [...candidateIds] : [], disambiguationApplied: false, winnerId: null };
  }
  const bk = String(ctx.bucketKey || "").trim().toLowerCase();
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  if (bk === "maps") {
    const need = ["MG-01", "MG-02", "MG-08"];
    if (need.every((id) => candidateIds.includes(id))) {
      const scores = moledetMapsRoutingScores(list, ctx.row);
      return { ...reorderCandidatesByScores(candidateIds, BRIDGE_MAPS, scores), scores };
    }
    return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
  }

  if (bk === "geography") {
    const need = ["MG-01", "MG-02", "MG-05"];
    if (need.every((id) => candidateIds.includes(id))) {
      const geo = moledetGeographyRoutingScores(list, ctx.row);
      if (geo.definitionOnly) {
        return {
          orderedIds: [...candidateIds],
          disambiguationApplied: false,
          winnerId: null,
          scores: { "MG-01": 0, "MG-02": 0, "MG-05": 0 },
          geographyDefinitionOnly: true,
        };
      }
      const scores = { "MG-01": geo["MG-01"], "MG-02": geo["MG-02"], "MG-05": geo["MG-05"] };
      return { ...reorderCandidatesByScores(candidateIds, BRIDGE_GEOGRAPHY, scores), scores };
    }
    return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
  }

  if (bk === "homeland") {
    if (candidateIds.includes("MG-04") && candidateIds.includes("MG-06")) {
      const scores = moledetHomelandRoutingScores(list, ctx.row);
      return { ...reorderCandidatesByScores(candidateIds, BRIDGE_HOMELAND, scores), scores };
    }
    return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
  }

  return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
}

/**
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string }} [ctx]
 * @returns {string[]}
 */
export function orderMoledetTaxonomyCandidates(candidateIds, wrongEvents, ctx = {}) {
  return orderMoledetTaxonomyCandidatesWithMeta(candidateIds, wrongEvents, ctx).orderedIds;
}
