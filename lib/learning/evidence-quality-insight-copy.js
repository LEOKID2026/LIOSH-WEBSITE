/**
 * Parent-facing insight copy semantics from evidence-quality tiers (wording only).
 * Does not change engine thresholds or V3 confidence.
 */

import {
  DATA_SUFFICIENCY,
  getParentEvidenceQuality,
} from "./evidence-quality.js";
import { PARENT_EVIDENCE_VOLUME } from "../../utils/parent-report-language/parent-evidence-matrix.js";

/** Copy-only band for slightly stronger recurrence wording (not an engine threshold). */
export const PARENT_INSIGHT_CAUTION_STRONG_MIN = 25;

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Student-level "מעט מדי תשובות" - only when truly insufficient (0–4 or no/pre-insight data).
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {boolean}
 */
export function shouldShowStudentThinDataInsight(payload) {
  const student = getParentEvidenceQuality(payload)?.student;
  if (!student) {
    const q = Math.max(0, Math.floor(safeNum(payload?.summary?.diagnosticAnswers ?? payload?.summary?.totalAnswers)));
    return q > 0 && q <= PARENT_EVIDENCE_VOLUME.INSUFFICIENT_MAX;
  }

  const suff = student.dataSufficiency;
  const q = Math.max(0, Math.floor(safeNum(student.rawDiagnosticCount)));

  if (suff === DATA_SUFFICIENCY.SUPPORTED) return false;
  if (suff === DATA_SUFFICIENCY.NO_DATA || suff === DATA_SUFFICIENCY.INSUFFICIENT) return true;
  if (q >= PARENT_EVIDENCE_VOLUME.PRELIMINARY_MIN) return false;
  return true;
}

/**
 * Topic-level rootCause / diagnosticType for parent insight lines (by volume + recurrence).
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {string} subject
 * @param {string} topicKey
 * @returns {{ rootCause: string, diagnosticType: string, patternId: string }}
 */
export function resolveTopicInsightCopySemantics(payload, subject, topicKey) {
  const entry = getParentEvidenceQuality(payload)?.byTopic?.[`${subject}::${topicKey}`];
  const q = Math.max(0, Math.floor(safeNum(entry?.rawDiagnosticCount ?? entry?.evidenceCount)));
  const recurrenceMet = entry?.recurrenceMet === true;
  const suff = entry?.dataSufficiency;

  if (q <= PARENT_EVIDENCE_VOLUME.INSUFFICIENT_MAX) {
    return {
      rootCause: "insufficient_evidence",
      diagnosticType: "insufficient_evidence",
      patternId: "insufficient_mistake_evidence",
    };
  }

  if (q >= PARENT_EVIDENCE_VOLUME.STRONG_MIN && suff === DATA_SUFFICIENCY.SUPPORTED && recurrenceMet) {
    return {
      rootCause:
        q >= PARENT_INSIGHT_CAUTION_STRONG_MIN ? "recurring_pattern_supported" : "recurring_pattern",
      diagnosticType: "knowledge_gap",
      patternId: "recurring_weakness",
    };
  }

  if (q >= PARENT_EVIDENCE_VOLUME.STRONG_MIN && !recurrenceMet) {
    return {
      rootCause: "no_consistent_pattern",
      diagnosticType: "undetermined",
      patternId: "insufficient_recurrence",
    };
  }

  return {
    rootCause: "preliminary_direction",
    diagnosticType: "undetermined",
    patternId: "early_signal",
  };
}

/** @param {string[]} insights */
export function insightsContainThinDataContradiction(insights) {
  const thinRe = /מעט מדי תשובות אבחוניות/u;
  return (insights || []).some((t) => thinRe.test(String(t || "")));
}

/** @param {string[]} insights */
export function insightsContainCautiousTopicSignal(insights) {
  const re =
    /כיוון ראשוני|דפוס שחוזר|עדיין לא מופיע דפוס|נקודת חיזוק|כדאי עוד|לחזק/u;
  return (insights || []).some((t) => re.test(String(t || "")));
}

/** @param {string[]} insights */
export function insightsContainStrongDiagnosisLeak(insights) {
  const re = /נראה שיש קושי|מסקנה ברורה ויציבה|פער ידע מובהק/u;
  return (insights || []).some((t) => re.test(String(t || "")));
}

/** @param {string[]} insights */
export function insightsContainTechnicalLeak(insights) {
  const re =
    /\b(diagnosticSkillId|expectedErrorTags|patternFamily|outputGating|contractsV1|::grade:)\b/i;
  return (insights || []).some((t) => re.test(String(t || "")));
}
