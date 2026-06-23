/**
 * Parent-report engine ↔ DE v2 taxonomy bridge (v1).
 * Reuses taxonomy resolution from diagnostic-engine-v2 without duplicating taxonomy data.
 */

import { splitTopicRowKey } from "./parent-report-row-diagnostics.js";
import { filterMistakesForRow } from "./parent-report-row-trend.js";
import { mathReportBaseOperationKey } from "./math-report-generator.js";
import { TAXONOMY_BY_ID } from "./diagnostic-engine-v2/taxonomy-registry.js";
import {
  normalizeReportBucketKey,
  taxonomyIdsForReportBucket,
} from "./diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { orderFractionTaxonomyCandidates } from "./diagnostic-engine-v2/fraction-taxonomy-candidate-order.js";
import { orderMultiplicationTaxonomyCandidates } from "./diagnostic-engine-v2/multiplication-taxonomy-candidate-order.js";
import { orderWordProblemsTaxonomyCandidates } from "./diagnostic-engine-v2/word-problems-taxonomy-candidate-order.js";
import { orderGeometryTaxonomyCandidatesWithMeta } from "./diagnostic-engine-v2/geometry-taxonomy-candidate-order.js";
import { orderEnglishTaxonomyCandidatesWithMeta } from "./diagnostic-engine-v2/english-taxonomy-candidate-order.js";
import { orderHebrewTaxonomyCandidates } from "./diagnostic-engine-v2/hebrew-taxonomy-candidate-order.js";
import { orderMoledetTaxonomyCandidatesWithMeta, moledetGeographyRowHasMapEvidence } from "./diagnostic-engine-v2/moledet-taxonomy-candidate-order.js";
import { passesRecurrenceRules } from "./diagnostic-engine-v2/recurrence.js";
import { assessSubskillCandidateSafety } from "./subskill-candidate-safety.js";

function computeEvidenceFlags(wrongs, rowWrongTotal) {
  const noRawMistakeEvents = wrongs.length === 0 && rowWrongTotal > 0;
  const metadataPresentRate =
    wrongs.length > 0
      ? wrongs.filter((e) => e.metadata && typeof e.metadata === "object").length / wrongs.length
      : 0;
  const possibleErrorPatternsConnected = wrongs.some(
    (e) => e.possibleErrorPatterns || e.metadata?.possibleErrorPatterns || e.errorPattern,
  );
  const missingMetadata =
    wrongs.length > 0 && metadataPresentRate < 0.25 && !possibleErrorPatternsConnected;
  return {
    noRawMistakeEvents,
    missingMetadata,
    metadataPresentRate: Math.round(metadataPresentRate * 100),
    possibleErrorPatternsConnected,
  };
}

function canEmitSubskillCandidate(matchStrength, evidenceFlags, wrongs) {
  if (matchStrength !== "strong") return false;
  if (evidenceFlags.noRawMistakeEvents) return false;
  if (wrongs.length === 0) return false;
  if (evidenceFlags.missingMetadata) return false;
  return true;
}

/**
 * @param {object} params
 * @param {string} params.subjectId
 * @param {string} params.topicRowKey
 * @param {Record<string, unknown>} params.row
 * @param {unknown[]} [params.rawMistakes]
 * @param {number} params.startMs
 * @param {number} params.endMs
 */
export function resolveRowTaxonomyMatch({ subjectId, topicRowKey, row, rawMistakes, startMs, endMs }) {
  const sid = String(subjectId || "").trim();
  const events = filterMistakesForRow(sid, topicRowKey, row, rawMistakes || [], startMs, endMs);
  const wrongs = events.filter((e) => !e.isCorrect);
  const rowWrongTotal = Math.max(0, Number(row?.wrong) || 0);
  const wrongCountForRules = Math.max(wrongs.length, rowWrongTotal);
  const { bucketKey } = splitTopicRowKey(topicRowKey);
  const bucketNorm = normalizeReportBucketKey(bucketKey);
  const normalizedBucketKey = bucketNorm.normalizedBucketKey;
  const gradeScope = bucketNorm.gradeScope || row?.gradeKey || null;

  const candidateIdsRaw = taxonomyIdsForReportBucket(sid, bucketKey);
  let candidateIds = [...candidateIdsRaw];
  let disambiguationApplied = false;
  let disambiguationWinnerId = null;
  let geographyDefinitionOnly = false;
  const mathBase = mathReportBaseOperationKey(bucketKey);
  const geoBase = normalizedBucketKey;
  const bk = String(normalizedBucketKey || "").trim().toLowerCase();

  if (
    sid === "math" &&
    mathBase === "fractions" &&
    candidateIdsRaw.includes("M-04") &&
    candidateIdsRaw.includes("M-05")
  ) {
    candidateIds = orderFractionTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey: normalizedBucketKey, topicRowKey });
  } else if (
    sid === "math" &&
    mathBase === "multiplication" &&
    candidateIdsRaw.includes("M-03") &&
    candidateIdsRaw.includes("M-10")
  ) {
    candidateIds = orderMultiplicationTaxonomyCandidates(candidateIdsRaw, wrongs, { row });
  } else if (
    sid === "math" &&
    mathBase === "word_problems" &&
    candidateIdsRaw.includes("M-07") &&
    candidateIdsRaw.includes("M-08")
  ) {
    candidateIds = orderWordProblemsTaxonomyCandidates(candidateIdsRaw, wrongs, { row });
  } else if (sid === "geometry" && (geoBase === "quadrilaterals" || geoBase === "area")) {
    const geoOrder = orderGeometryTaxonomyCandidatesWithMeta(candidateIdsRaw, wrongs, { row, bucketKey: geoBase });
    candidateIds = geoOrder.orderedIds;
    disambiguationApplied = geoOrder.disambiguationApplied === true;
    disambiguationWinnerId = geoOrder.winnerId || null;
  } else if (sid === "english") {
    if (bk === "vocabulary" || bk === "grammar") {
      const enOrder = orderEnglishTaxonomyCandidatesWithMeta(candidateIdsRaw, wrongs, { row, bucketKey: bk });
      candidateIds = enOrder.orderedIds;
      disambiguationApplied = enOrder.disambiguationApplied === true;
      disambiguationWinnerId = enOrder.winnerId || null;
    }
  } else if (sid === "hebrew") {
    if (
      (bk === "grammar" && candidateIdsRaw.includes("H-02") && candidateIdsRaw.includes("H-06")) ||
      (bk === "writing" && candidateIdsRaw.includes("H-03") && candidateIdsRaw.includes("H-07"))
    ) {
      candidateIds = orderHebrewTaxonomyCandidates(candidateIdsRaw, wrongs, { row, bucketKey: bk });
    }
  } else if (sid === "moledet-geography") {
    if (bk === "maps" && candidateIdsRaw.includes("MG-01") && candidateIdsRaw.includes("MG-02") && candidateIdsRaw.includes("MG-08")) {
      const mgOrder = orderMoledetTaxonomyCandidatesWithMeta(candidateIdsRaw, wrongs, { row, bucketKey: bk });
      candidateIds = mgOrder.orderedIds;
      disambiguationApplied = mgOrder.disambiguationApplied === true;
      disambiguationWinnerId = mgOrder.winnerId || null;
    } else if (bk === "geography" && candidateIdsRaw.includes("MG-01") && candidateIdsRaw.includes("MG-02") && candidateIdsRaw.includes("MG-05")) {
      geographyDefinitionOnly = wrongs.length > 0 && !moledetGeographyRowHasMapEvidence(wrongs, row);
      const mgOrder = orderMoledetTaxonomyCandidatesWithMeta(candidateIdsRaw, wrongs, { row, bucketKey: bk });
      candidateIds = mgOrder.orderedIds;
      disambiguationApplied = geographyDefinitionOnly ? false : mgOrder.disambiguationApplied === true;
      disambiguationWinnerId = geographyDefinitionOnly ? null : mgOrder.winnerId || null;
    } else if (bk === "homeland" && candidateIdsRaw.includes("MG-04") && candidateIdsRaw.includes("MG-06")) {
      const mgOrder = orderMoledetTaxonomyCandidatesWithMeta(candidateIdsRaw, wrongs, { row, bucketKey: bk });
      candidateIds = mgOrder.orderedIds;
      disambiguationApplied = mgOrder.disambiguationApplied === true;
      disambiguationWinnerId = mgOrder.winnerId || null;
    }
  }

  /** @type {string|null} */
  let chosenId = null;
  let recurrenceMatched = false;
  for (const tid of candidateIds) {
    const trow = TAXONOMY_BY_ID[tid];
    if (!trow) continue;
    if (passesRecurrenceRules(wrongs, trow)) {
      chosenId = tid;
      recurrenceMatched = wrongs.length > 0;
      break;
    }
    if (
      wrongs.length === 0 &&
      wrongCountForRules >= trow.minWrong &&
      !(trow.minDistinctDays > 0) &&
      !(trow.minDistinctPatternFamilies > 0)
    ) {
      chosenId = tid;
      break;
    }
  }

  const evidenceFlags = computeEvidenceFlags(wrongs, rowWrongTotal);
  const weakTaxonomyFallbackBlocked = !chosenId && candidateIdsRaw.length > 0 && wrongCountForRules >= 2;
  const classificationState = !candidateIdsRaw.length
    ? "unclassified_no_taxonomy_match"
    : weakTaxonomyFallbackBlocked
      ? "unclassified_weak_evidence"
      : chosenId
        ? "classified"
        : "unclassified_no_taxonomy_match";
  const classificationReasonCode = !candidateIdsRaw.length
    ? "no_taxonomy_mapping"
    : weakTaxonomyFallbackBlocked
      ? "weak_taxonomy_fallback_blocked"
      : !chosenId
        ? "taxonomy_not_matched"
        : null;

  const recurrenceFull = !!(() => {
    if (!chosenId) return false;
    const trow = TAXONOMY_BY_ID[chosenId];
    if (!trow) return false;
    if (passesRecurrenceRules(wrongs, trow)) return true;
    return (
      wrongs.length === 0 &&
      wrongCountForRules >= trow.minWrong &&
      !(trow.minDistinctDays > 0) &&
      !(trow.minDistinctPatternFamilies > 0)
    );
  })();

  /** @type {"none"|"weak"|"moderate"|"strong"} */
  let matchStrength = "none";
  if (chosenId && recurrenceFull && wrongs.length > 0) matchStrength = "strong";
  else if (chosenId && recurrenceFull) matchStrength = "moderate";
  else if (weakTaxonomyFallbackBlocked) matchStrength = "weak";

  const trow = chosenId ? TAXONOMY_BY_ID[chosenId] : null;
  const emitSubskill = canEmitSubskillCandidate(matchStrength, evidenceFlags, wrongs);
  const subskillCandidateTechnical =
    emitSubskill && trow
      ? {
          taxonomyId: chosenId,
          subskillHe: trow.subskillHe,
          topicHe: trow.topicHe,
          domainHe: trow.domainHe,
          confidence: 0.78,
        }
      : null;

  const subskillSafety = assessSubskillCandidateSafety({
    subjectId: sid,
    row,
    wrongs,
    taxonomyMatch: {
      subskillCandidate: subskillCandidateTechnical,
      normalizedBucketKey,
      matchStrength,
    },
    candidateIdsRaw,
    candidateIdsOrdered: candidateIds,
    chosenId,
    recurrenceMatched,
    disambiguationApplied,
    disambiguationWinnerId,
    geographyDefinitionOnly,
  });

  return {
    version: 2,
    taxonomyId: chosenId,
    classificationState,
    classificationReasonCode,
    matchStrength,
    taxonomyMatch: !!chosenId && matchStrength !== "weak",
    candidateIds: candidateIdsRaw,
    rawBucketKey: bucketNorm.rawBucketKey,
    normalizedBucketKey,
    gradeScope,
    wrongEventCount: wrongs.length,
    wrongCountForRules,
    evidenceFlags,
    subskillCandidate: subskillCandidateTechnical,
    subskillCandidateTechnical,
    subskillSafety,
    safeSubskillToShow: subskillSafety.safeToShowSubskill === true,
    patternCandidate: trow && matchStrength !== "none" && matchStrength !== "weak"
      ? {
          taxonomyId: chosenId,
          patternHe: trow.patternHe,
          confidence: matchStrength === "strong" ? 0.76 : 0.6,
        }
      : null,
    interventionActionCandidate: emitSubskill && trow && subskillSafety.safeToShowSubskill
      ? {
          taxonomyId: chosenId,
          interventionHe: trow.interventionHe,
          probeHe: trow.probeHe,
          confidence: 0.74,
        }
      : null,
  };
}

/**
 * Map taxonomy metadata to mistake-pattern family (technical keys only).
 * @param {ReturnType<typeof resolveRowTaxonomyMatch>|null|undefined} taxonomyMatch
 * @param {number} acc
 * @param {number} wrongRatio
 */
export function mapTaxonomyToMistakePatternFamily(taxonomyMatch, acc, wrongRatio) {
  if (!taxonomyMatch?.taxonomyMatch || !taxonomyMatch.taxonomyId) return null;
  const trow = TAXONOMY_BY_ID[taxonomyMatch.taxonomyId];
  if (!trow) return null;
  const patternHe = String(trow.patternHe || "");
  const competitors = Array.isArray(trow.competitorsHe) ? trow.competitorsHe : [];
  if (/בלבול|הבנה|מושג|משמעות/.test(patternHe)) return "concept_confusion";
  if (competitors.some((c) => /רשלנות|מהירות|לחץ/.test(String(c))) && acc >= 68 && wrongRatio < 0.35) {
    return "careless_flip";
  }
  return "procedure_break";
}
