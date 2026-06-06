/**
 * Evidence Quality Layer — sufficiency, confidence, traceability (Phase Q1).
 * Parent context only for product gating; no cross-context merge or hints.
 */

import { passesRecurrenceRules } from "../../utils/diagnostic-engine-v2/recurrence.js";

const REPORT_AGG_SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "moledet_geography"];
import { PARENT_CONTEXT_ALLOWED_SOURCES } from "./diagnostic-evidence-contract.js";

export const DATA_SUFFICIENCY = Object.freeze({
  NO_DATA: "no_data",
  INSUFFICIENT: "insufficient_data",
  PRELIMINARY: "preliminary_signal",
  SUPPORTED: "supported_diagnosis",
});

const SUPPORTED_MIN_DIAGNOSTIC = 12;
const PRELIMINARY_MIN_DIAGNOSTIC = 5;
const TRACE_ID_CAP = 50;

const RECURRENCE_RULES = Object.freeze({
  minWrong: 2,
  minDistinctDays: 2,
  minDistinctPatternFamilies: 0,
});

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Owner thresholds:
 * 0 = no_data, 1–4 = insufficient, 5–11 = preliminary, 12+ + recurrence = supported
 * @param {number} rawDiagnosticCount
 * @param {boolean} recurrenceMet
 * @returns {string}
 */
export function resolveDataSufficiency(rawDiagnosticCount, recurrenceMet) {
  const n = Math.max(0, Math.floor(safeNum(rawDiagnosticCount)));
  if (n === 0) return DATA_SUFFICIENCY.NO_DATA;
  if (n <= 4) return DATA_SUFFICIENCY.INSUFFICIENT;
  if (n <= 11) return DATA_SUFFICIENCY.PRELIMINARY;
  if (n >= SUPPORTED_MIN_DIAGNOSTIC && recurrenceMet) return DATA_SUFFICIENCY.SUPPORTED;
  return DATA_SUFFICIENCY.PRELIMINARY;
}

/**
 * @param {string} dataSufficiency
 * @returns {string}
 */
export function confidenceLevelFromSufficiency(dataSufficiency) {
  switch (dataSufficiency) {
    case DATA_SUFFICIENCY.SUPPORTED:
      return "moderate";
    case DATA_SUFFICIENCY.PRELIMINARY:
      return "low";
    case DATA_SUFFICIENCY.INSUFFICIENT:
      return "insufficient_data";
    default:
      return "insufficient_data";
  }
}

/**
 * @param {string} dataSufficiency
 * @param {boolean} recurrenceMet
 * @returns {string}
 */
export function confidenceReasonFromSufficiency(dataSufficiency, recurrenceMet) {
  if (dataSufficiency === DATA_SUFFICIENCY.NO_DATA) return "no_diagnostic_evidence";
  if (dataSufficiency === DATA_SUFFICIENCY.INSUFFICIENT) return "too_few_questions";
  if (dataSufficiency === DATA_SUFFICIENCY.PRELIMINARY && !recurrenceMet) return "no_recurrence";
  if (dataSufficiency === DATA_SUFFICIENCY.PRELIMINARY) return "below_supported_threshold";
  if (dataSufficiency === DATA_SUFFICIENCY.SUPPORTED) return "supported";
  return "unknown";
}

/**
 * @param {Array<{ timestamp?: number, isCorrect?: boolean, answeredAt?: string }>} wrongRows
 * @returns {boolean}
 */
export function meetsDiagnosticRecurrence(wrongRows) {
  const wrongs = (wrongRows || []).filter((r) => r && r.isCorrect === false);
  if (wrongs.length < RECURRENCE_RULES.minWrong) return false;

  const events = wrongs.map((r) => {
    let ts = r.timestamp;
    if (!Number.isFinite(ts) && r.answeredAt) {
      ts = Date.parse(String(r.answeredAt));
    }
    return { timestamp: Number.isFinite(ts) ? ts : null, isCorrect: false };
  });

  return passesRecurrenceRules(events, RECURRENCE_RULES);
}

/**
 * @param {Array<Record<string, unknown>>} recentMistakes
 * @param {string} [subject]
 * @param {string} [topic]
 * @returns {Array<Record<string, unknown>>}
 */
function filterMistakesForScope(recentMistakes, subject, topic) {
  if (!Array.isArray(recentMistakes)) return [];
  return recentMistakes.filter((m) => {
    if (!m || typeof m !== "object") return false;
    if (subject && String(m.subject || "") !== subject) return false;
    if (topic && String(m.topic || "") !== topic) return false;
    return true;
  });
}

/**
 * @param {number} diagnosticAnswers
 * @param {Array<Record<string, unknown>>} scopeMistakes
 * @param {string[]} supportingEvidenceIds
 * @param {Record<string, number>} [sourceBreakdown]
 * @returns {object}
 */
function buildScopeSnapshot(diagnosticAnswers, scopeMistakes, supportingEvidenceIds, sourceBreakdown = {}) {
  const rawDiagnosticCount = Math.max(0, Math.floor(safeNum(diagnosticAnswers)));
  const wrongMistakes = scopeMistakes.map((m) => ({
    isCorrect: false,
    answeredAt: m.answeredAt || m.answered_at || m.timestamp,
    timestamp: m.timestampMs || (m.answeredAt ? Date.parse(String(m.answeredAt)) : null),
  }));
  const recurrenceMet = meetsDiagnosticRecurrence(wrongMistakes);
  const dataSufficiency = resolveDataSufficiency(rawDiagnosticCount, recurrenceMet);
  const confidenceLevel = confidenceLevelFromSufficiency(dataSufficiency);

  return {
    evidenceCount: rawDiagnosticCount,
    rawDiagnosticCount,
    sourceBreakdown: { ...sourceBreakdown },
    recurrence: {
      met: recurrenceMet,
      wrongCount: wrongMistakes.length,
    },
    dataSufficiency,
    confidenceLevel,
    confidenceReason: confidenceReasonFromSufficiency(dataSufficiency, recurrenceMet),
    supportingEvidenceIds: supportingEvidenceIds.slice(0, TRACE_ID_CAP),
  };
}

/**
 * Parent-context evidence quality from aggregated report payload.
 * @param {Record<string, unknown>} payload
 * @returns {{ public: object, internal: object }}
 */
export function computeParentContextEvidenceQuality(payload) {
  const summary = payload?.summary && typeof payload.summary === "object" ? payload.summary : {};
  const subjects = payload?.subjects && typeof payload.subjects === "object" ? payload.subjects : {};
  const recentMistakes = Array.isArray(payload?.recentMistakes) ? payload.recentMistakes : [];

  const studentDiagnostic = safeNum(summary.diagnosticAnswers);
  const studentSourceBreakdown = {
    free_practice: studentDiagnostic,
  };

  const studentIds = [];
  for (const m of recentMistakes) {
    if (m?.id) studentIds.push(String(m.id));
    else if (m?.answerId) studentIds.push(String(m.answerId));
  }

  const student = buildScopeSnapshot(
    studentDiagnostic,
    recentMistakes,
    studentIds,
    studentSourceBreakdown
  );

  const byTopic = {};
  const bySubject = {};

  for (const subjectKey of REPORT_AGG_SUBJECTS) {
    const subj = subjects[subjectKey];
    if (!subj || typeof subj !== "object") continue;
    const subjDiag = safeNum(subj.diagnosticAnswers);
    if (subjDiag <= 0) continue;

    const subjMistakes = filterMistakesForScope(recentMistakes, subjectKey);
    const subjIds = subjMistakes
      .map((m) => (m?.id ? String(m.id) : m?.answerId ? String(m.answerId) : null))
      .filter(Boolean);

    bySubject[subjectKey] = buildScopeSnapshot(subjDiag, subjMistakes, subjIds, {
      free_practice: subjDiag,
    });

    for (const [topicKey, topic] of Object.entries(subj.topics || {})) {
      if (!topic || typeof topic !== "object") continue;
      const topicDiag = safeNum(topic.diagnosticAnswers);
      if (topicDiag <= 0) continue;
      const topicMistakes = filterMistakesForScope(recentMistakes, subjectKey, topicKey);
      const topicIds = topicMistakes
        .map((m) => (m?.id ? String(m.id) : m?.answerId ? String(m.answerId) : null))
        .filter(Boolean);
      byTopic[`${subjectKey}::${topicKey}`] = buildScopeSnapshot(topicDiag, topicMistakes, topicIds, {
        free_practice: topicDiag,
      });
    }
  }

  const internal = {
    context: "parent",
    student,
    bySubject,
    byTopic,
  };

  const publicView = {
    context: "parent",
    student: {
      evidenceCount: student.evidenceCount,
      rawDiagnosticCount: student.rawDiagnosticCount,
      dataSufficiency: student.dataSufficiency,
      confidenceLevel: student.confidenceLevel,
      confidenceReason: student.confidenceReason,
      recurrenceMet: student.recurrence.met,
    },
    bySubject: Object.fromEntries(
      Object.entries(bySubject).map(([k, v]) => [
        k,
        {
          dataSufficiency: v.dataSufficiency,
          confidenceLevel: v.confidenceLevel,
          evidenceCount: v.evidenceCount,
          recurrenceMet: v.recurrence.met,
        },
      ])
    ),
    byTopic: Object.fromEntries(
      Object.entries(byTopic).map(([k, v]) => [
        k,
        {
          dataSufficiency: v.dataSufficiency,
          confidenceLevel: v.confidenceLevel,
          evidenceCount: v.evidenceCount,
          recurrenceMet: v.recurrence.met,
        },
      ])
    ),
  };

  return { public: publicView, internal };
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {object|null}
 */
export function getParentEvidenceQuality(payload) {
  const eq = payload?.meta?.evidenceQuality;
  return eq && typeof eq === "object" ? eq : null;
}

/**
 * Strong parent-facing diagnosis allowed at student scope.
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {boolean}
 */
export function allowsStrongParentDiagnosisAtStudent(payload) {
  const suff = getParentEvidenceQuality(payload)?.student?.dataSufficiency;
  return (
    suff === DATA_SUFFICIENCY.PRELIMINARY || suff === DATA_SUFFICIENCY.SUPPORTED
  );
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {string} subject
 * @param {string} topicKey
 * @returns {boolean}
 */
export function allowsStrongParentDiagnosisAtTopic(payload, subject, topicKey) {
  const map = getParentEvidenceQuality(payload)?.byTopic;
  const entry = map?.[`${subject}::${topicKey}`];
  const suff = entry?.dataSufficiency;
  return (
    suff === DATA_SUFFICIENCY.PRELIMINARY || suff === DATA_SUFFICIENCY.SUPPORTED
  );
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {boolean}
 */
export function shouldSuppressClientPatternDiagnostics(payload) {
  const suff = getParentEvidenceQuality(payload)?.student?.dataSufficiency;
  if (suff === DATA_SUFFICIENCY.NO_DATA || suff === DATA_SUFFICIENCY.INSUFFICIENT) {
    return true;
  }
  return false;
}

/**
 * Attach parent-context evidence quality to payload meta (parent path only).
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
export function attachParentContextEvidenceQuality(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const { public: publicView, internal } = computeParentContextEvidenceQuality(payload);
  return {
    ...payload,
    meta: {
      ...(payload.meta && typeof payload.meta === "object" ? payload.meta : {}),
      evidenceQuality: publicView,
      _evidenceQuality: internal,
    },
  };
}

export { SUPPORTED_MIN_DIAGNOSTIC, PRELIMINARY_MIN_DIAGNOSTIC };
