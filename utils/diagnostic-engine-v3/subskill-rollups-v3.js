/**
 * Diagnostic Engine V3 — subskill / topic rollups (internal payload).
 */

import { splitTopicRowKey } from "../parent-report-row-diagnostics.js";
import { normalizeDiagnosticSubjectId } from "../diagnostic-evidence.js";
import { ERROR_TYPE_V3 } from "./error-types-v3.js";
import { buildEvidenceContractsFromMistakes, buildDiagnosticEvidenceContractV3 } from "./evidence-contract-v3.js";
import {
  baseConfidenceScoreFromRollup,
  scoreToConfidenceBand,
  computeProbeConfidenceAdjustment,
} from "./probe-confidence-v3.js";
import { resolveDiagnosisStageV3, detectContradictorySignals } from "./early-stopping-v3.js";
import { resolveRecommendedNextStepV3 } from "./next-action-v3.js";
import { V3_WAVE1_SUBJECT_IDS } from "./types.js";
import { aggregateGradeContextForRollup } from "./grade-relation-v3.js";

const SLOW_MS = 60_000;
const FAST_MS = 6_000;

/**
 * @param {string} subjectId
 * @param {string} topic
 * @param {string|null} subskill
 */
export function rollupKey(subjectId, topic, subskill) {
  return `${subjectId}|${topic}|${subskill || "__unknown__"}`;
}

/**
 * @param {ReturnType<typeof buildDiagnosticEvidenceContractV3>[]} contracts
 */
function dominantErrorTypes(contracts) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const c of contracts) {
    if (c.isCorrect || !c.errorType) continue;
    const k = String(c.errorType);
    counts[k] = (counts[k] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    dominantErrorType: sorted[0]?.[0] || ERROR_TYPE_V3.UNKNOWN,
    dominantErrorTypes: sorted.slice(0, 4).map(([type, count]) => ({ type, count })),
  };
}

/**
 * @param {ReturnType<typeof buildDiagnosticEvidenceContractV3>[]} contracts
 */
function dominantMisconceptions(contracts) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const c of contracts) {
    if (!c.misconceptionTarget) continue;
    const k = String(c.misconceptionTarget);
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([target, count]) => ({ target, count }));
}

function evidenceStrengthFromAttempts(attempts, metadataRate) {
  if (attempts >= 15 && metadataRate >= 0.5) return "strong";
  if (attempts >= 8) return "moderate";
  if (attempts >= 3) return "thin";
  return "none";
}

/**
 * Build rollups for one subject from maps + mistakes + probes.
 * @param {string} subjectId
 * @param {Record<string, unknown>} topicMap
 * @param {unknown[]} rawMistakes
 * @param {number} startMs
 * @param {number} endMs
 * @param {unknown[]} probeEvidenceList
 */
export function buildSubskillRollupsForSubject(
  subjectId,
  topicMap,
  rawMistakes,
  startMs,
  endMs,
  probeEvidenceList = [],
) {
  const sid = normalizeDiagnosticSubjectId(subjectId);
  const contracts = buildEvidenceContractsFromMistakes(
    sid,
    rawMistakes,
    startMs,
    endMs,
    probeEvidenceList,
  );

  /** @type {Map<string, ReturnType<typeof buildDiagnosticEvidenceContractV3>[]>} */
  const byKey = new Map();

  for (const c of contracts) {
    const key = rollupKey(sid, c.topic, c.subskill);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(c);
  }

  /** @type {object[]} */
  const rollups = [];

  for (const [topicRowKey, row] of Object.entries(topicMap || {})) {
    if (!row || typeof row !== "object") continue;
    const { bucketKey } = splitTopicRowKey(topicRowKey);
    const topic = bucketKey || "general";
    const q = Math.max(0, Number(row.questions) || 0);
    if (q <= 0) continue;

    const correct = Math.max(0, Number(row.correct) || 0);
    const wrong = Math.max(0, Number(row.wrong) || q - correct);
    const acc = q > 0 ? Math.round((correct / q) * 100) : 0;

    const topicContracts = contracts.filter(
      (c) => c.topic === topic || String(c.topic).startsWith(topic),
    );
    const subskills = new Set(
      topicContracts.map((c) => c.subskill).filter(Boolean),
    );
    if (subskills.size === 0) subskills.add(null);

    for (const subskill of subskills) {
      const key = rollupKey(sid, topic, subskill);
      const group = byKey.get(key) || topicContracts.filter((c) => (c.subskill || null) === subskill);
      const wrongN = Math.max(wrong, group.length);
      const attempts = q;
      const estCorrect = correct;
      const accuracy = acc;

      const times = group.map((c) => c.responseTimeMs).filter((t) => t != null);
      const avgTime =
        times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
      const slowCount = times.filter((t) => t >= SLOW_MS).length;
      const fastWrongCount = group.filter(
        (c) => c.responseTimeMs != null && c.responseTimeMs < FAST_MS,
      ).length;

      const errStats = dominantErrorTypes(group);
      const metaRate =
        group.length > 0
          ? group.filter((c) => c.metadataPresent).length / group.length
          : row.metadataPresent === true
            ? 1
            : 0;

      const contradictory = detectContradictorySignals(group, row);
      const gradeContext = aggregateGradeContextForRollup(
        group,
        {
          registeredGrade: row.registeredGradeKey || row.registeredGrade,
          contentGrade: row.contentGradeKey || row.gradeKey || row.grade,
          gradeRelation: row.gradeRelation,
          gradeDelta: row.gradeDelta,
        },
        attempts,
        estCorrect,
        wrongN,
      );
      const probeAdj = computeProbeConfidenceAdjustment({
        probeEvidenceList,
        subjectId: sid,
        topic,
        skill: group[0]?.skill || null,
        subskill,
        attempts,
        wrongCount: wrongN,
        dominantErrorType: errStats.dominantErrorType,
        contradictorySignals: contradictory,
        gradeContext,
      });
      const hasProbeSupport = probeAdj.reasons.includes("probe_supported");
      const hasProbeWeaken = probeAdj.reasons.includes("probe_weakened");

      /** @type {object} */
      const rollup = {
        subjectId: sid,
        topic,
        topicRowKey,
        subskill: subskill || null,
        skill: group[0]?.skill || null,
        prerequisiteSkill: group.find((c) => c.prerequisiteSkill)?.prerequisiteSkill || null,
        attempts,
        correct: estCorrect,
        accuracy,
        avgTimeMs: avgTime,
        slowCount,
        fastWrongCount,
        dominantErrorType: errStats.dominantErrorType,
        dominantErrorTypes: errStats.dominantErrorTypes,
        dominantMisconceptions: dominantMisconceptions(group),
        evidenceStrength: evidenceStrengthFromAttempts(attempts, metaRate),
        probeAdjustment: probeAdj,
        contradictorySignals: contradictory,
        wave1Enriched: V3_WAVE1_SUBJECT_IDS.includes(sid),
        gradeContext,
        registeredGrade: gradeContext.registeredGrade,
        contentGrade: gradeContext.contentGrade,
        contentGradeBand: gradeContext.contentGradeBand,
        gradeDelta: gradeContext.gradeDelta,
        gradeRelation: gradeContext.dominantRelation || gradeContext.relation,
        caveatNeeded: gradeContext.caveatNeeded,
        foundationRisk: gradeContext.foundationRisk,
        enrichmentSignal: gradeContext.enrichmentSignal,
        parentFacing: false,
      };

      const baseScore = baseConfidenceScoreFromRollup(rollup);
      rollup.confidence = scoreToConfidenceBand(baseScore, {
        probeEvidenceList,
        subjectId: sid,
        topic,
        skill: rollup.skill,
        subskill,
        attempts,
        wrongCount: wrongN,
        dominantErrorType: errStats.dominantErrorType,
        contradictorySignals: contradictory,
        gradeContext,
      });

      rollup.diagnosisStage = resolveDiagnosisStageV3(rollup, {
        contradictorySignals: contradictory,
        hasProbeSupport,
        hasProbeWeaken,
        gradeContext,
      });

      rollup.recommendedNextStep = resolveRecommendedNextStepV3(rollup, rollup.diagnosisStage);
      rollups.push(rollup);
    }
  }

  for (const [key, group] of byKey.entries()) {
    if (rollups.some((r) => rollupKey(r.subjectId, r.topic, r.subskill) === key)) continue;
    const first = group[0];
    if (!first) continue;
    const wrongN = group.length;
    const errStats = dominantErrorTypes(group);
    const contradictory = detectContradictorySignals(group, null);
    const attempts = wrongN;
    const gradeContext = aggregateGradeContextForRollup(
      group,
      {
        registeredGrade: first.registeredGrade,
        contentGrade: first.contentGrade || first.grade,
        gradeRelation: first.gradeContext?.legacyGradeRelation,
        gradeDelta: first.gradeContext?.gradeDelta,
      },
      attempts,
      0,
      wrongN,
    );
    const rollup = {
      subjectId: sid,
      topic: first.topic,
      topicRowKey: null,
      subskill: first.subskill || null,
      skill: first.skill || null,
      prerequisiteSkill: first.prerequisiteSkill || null,
      attempts: wrongN,
      correct: 0,
      accuracy: 0,
      avgTimeMs: null,
      slowCount: 0,
      fastWrongCount: group.filter((c) => c.responseTimeMs != null && c.responseTimeMs < FAST_MS).length,
      dominantErrorType: errStats.dominantErrorType,
      dominantErrorTypes: errStats.dominantErrorTypes,
      dominantMisconceptions: dominantMisconceptions(group),
      evidenceStrength: evidenceStrengthFromAttempts(wrongN, 0.5),
      contradictorySignals: contradictory,
      wave1Enriched: V3_WAVE1_SUBJECT_IDS.includes(sid),
      gradeContext,
      registeredGrade: gradeContext.registeredGrade,
      contentGrade: gradeContext.contentGrade,
      contentGradeBand: gradeContext.contentGradeBand,
      gradeDelta: gradeContext.gradeDelta,
      gradeRelation: gradeContext.dominantRelation || gradeContext.relation,
      caveatNeeded: gradeContext.caveatNeeded,
      foundationRisk: gradeContext.foundationRisk,
      enrichmentSignal: gradeContext.enrichmentSignal,
      parentFacing: false,
    };
    rollup.confidence = scoreToConfidenceBand(0.25, {
      probeEvidenceList,
      subjectId: sid,
      topic: first.topic,
      skill: first.skill,
      subskill: first.subskill,
      attempts: wrongN,
      wrongCount: wrongN,
      dominantErrorType: errStats.dominantErrorType,
      contradictorySignals: contradictory,
      gradeContext,
    });
    rollup.diagnosisStage = resolveDiagnosisStageV3(rollup, {
      contradictorySignals: contradictory,
      hasProbeSupport: false,
      hasProbeWeaken: false,
      gradeContext,
    });
    rollup.recommendedNextStep = resolveRecommendedNextStepV3(rollup, rollup.diagnosisStage);
    rollups.push(rollup);
  }

  return rollups.sort((a, b) => {
    const aw = a.attempts - a.correct;
    const bw = b.attempts - b.correct;
    return bw - aw || b.attempts - a.attempts;
  });
}

/**
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, unknown[]>} rawMistakesBySubject
 * @param {number} startMs
 * @param {number} endMs
 * @param {unknown[]} probeEvidenceList
 */
export function buildAllSubskillRollupsV3(maps, rawMistakesBySubject, startMs, endMs, probeEvidenceList) {
  /** @type {Record<string, object[]>} */
  const bySubject = {};
  for (const [subjectId, topicMap] of Object.entries(maps || {})) {
    if (subjectId.endsWith("Subtopics") || subjectId.includes("Subtopic")) continue;
    if (!topicMap || typeof topicMap !== "object") continue;
    const sid = normalizeDiagnosticSubjectId(subjectId);
    bySubject[sid] = buildSubskillRollupsForSubject(
      sid,
      topicMap,
      rawMistakesBySubject[sid] || rawMistakesBySubject[subjectId] || [],
      startMs,
      endMs,
      probeEvidenceList,
    );
  }
  return bySubject;
}
