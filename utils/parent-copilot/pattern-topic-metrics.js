/**
 * Shared topic row metrics for approved pattern answer composers.
 */

import {
  findTopicRowByKey,
  listCopilotAnchoredTopicRows,
  normalizeSubjectId,
  subjectLabelHe,
  SUBJECT_ORDER,
} from "./contract-reader.js";
import { parentFacingTopicRowLabelHe } from "../parent-report-topic-evidence.js";

const STRONG_ACC_MIN = 75;
const STRONG_Q_MIN = 8;
const WEAK_ACC_MAX = 54;

/**
 * @param {unknown} tr
 */
export function rowMetricsFromTopicRow(tr, subjectIdOverride = "") {
  const q = Math.max(0, Number(tr?.questions ?? tr?.questionCount) || 0);
  const acc = Math.max(0, Math.min(100, Math.round(Number(tr?.accuracy) || 0)));
  const sid = normalizeSubjectId(subjectIdOverride || tr?.subjectId || tr?.contractsV1?.evidence?.subjectId || "");
  const topicRowKey = String(tr?.topicRowKey || tr?.topicKey || "").trim();
  const displayName = String(tr?.displayName || "נושא").trim();
  const riv = tr?.rowIdentityV1 && typeof tr.rowIdentityV1 === "object" ? tr.rowIdentityV1 : {};
  return {
    q,
    acc,
    sid,
    topicRowKey,
    displayName,
    label: parentFacingTopicRowLabelHe({
      displayName,
      contentGradeKey: riv.contentGradeKey ?? null,
      gradeRelation: riv.gradeRelation ?? null,
      topicRowKey,
      registeredGradeKey: null,
    }),
  };
}

/**
 * @param {unknown} payload
 */
export function collectTopicMetrics(payload) {
  const profiles = Array.isArray(payload?.subjectProfiles) ? payload.subjectProfiles : [];
  /** @type {ReturnType<typeof rowMetricsFromTopicRow>[]} */
  const metas = [];
  for (const sp of profiles) {
    const sid = normalizeSubjectId(sp?.subject);
    const list = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];
    for (const tr of list) {
      const m = rowMetricsFromTopicRow({ ...tr, subjectId: sid }, sid);
      if (m.q > 0) metas.push(m);
    }
  }
  if (metas.length) return metas;
  for (const { subject, tr } of listCopilotAnchoredTopicRows(payload)) {
    const m = rowMetricsFromTopicRow({ ...tr, subjectId: subject }, subject);
    if (m.q > 0) metas.push(m);
  }
  return metas;
}

/**
 * @param {ReturnType<typeof rowMetricsFromTopicRow>[]} rows
 */
export function pickWeakestTopic(rows) {
  const withQ = rows.filter((r) => r.q > 0);
  if (!withQ.length) return null;
  const stable = withQ.filter((r) => r.q >= STRONG_Q_MIN);
  const pool = stable.length ? stable : withQ;
  return [...pool].sort((a, b) => a.acc - b.acc || b.q - a.q)[0];
}

/**
 * @param {ReturnType<typeof rowMetricsFromTopicRow>[]} rows
 * @param {number} [limit]
 */
export function pickWeakestTopics(rows, limit = 2) {
  const withQ = rows.filter((r) => r.q > 0);
  if (!withQ.length) return [];
  const stable = withQ.filter((r) => r.q >= STRONG_Q_MIN);
  const pool = stable.length ? stable : withQ;
  const sorted = [...pool].sort((a, b) => a.acc - b.acc || b.q - a.q);
  /** @type {ReturnType<typeof rowMetricsFromTopicRow>[]} */
  const out = [];
  for (const row of sorted) {
    if (out.some((x) => x.topicRowKey === row.topicRowKey)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * @param {ReturnType<typeof rowMetricsFromTopicRow>[]} rows
 */
export function pickStrongestTopic(rows) {
  const strong = rows.filter((r) => r.q >= STRONG_Q_MIN && r.acc >= STRONG_ACC_MIN);
  if (!strong.length) return null;
  return [...strong].sort((a, b) => b.acc - a.acc || b.q - a.q)[0];
}

/**
 * @param {ReturnType<typeof rowMetricsFromTopicRow>[]} rows
 */
export function pickWeakForThreeThings(rows) {
  const weak = rows.filter((r) => r.q >= STRONG_Q_MIN && r.acc <= WEAK_ACC_MAX);
  if (weak.length) return [...weak].sort((a, b) => a.acc - b.acc || b.q - a.q)[0];
  return pickWeakestTopic(rows);
}

/**
 * @param {ReturnType<typeof rowMetricsFromTopicRow>[]} rows
 */
export function pickStrongForThreeThings(rows) {
  return pickStrongestTopic(rows);
}

/**
 * Best stable topic/subject anchor for progress-without-trend answers.
 * @param {ReturnType<typeof rowMetricsFromTopicRow>[]} rows
 */
export function pickStableTopicForProgress(rows) {
  const strong = pickStrongestTopic(rows);
  if (strong) return strong;
  const withQ = rows.filter((r) => r.q > 0);
  if (!withQ.length) return null;
  return [...withQ].sort((a, b) => b.acc - a.acc || b.q - a.q)[0];
}

/**
 * Subject-level rollup when no topic anchor exists.
 * @param {unknown} payload
 */
export function pickStableSubjectForProgress(payload) {
  const metas = collectTopicMetrics(payload);
  if (!metas.length) return null;
  /** @type {Map<string, { sid: string; q: number; correct: number }>} */
  const bySid = new Map();
  for (const m of metas) {
    const prev = bySid.get(m.sid) || { sid: m.sid, q: 0, correct: 0 };
    prev.q += m.q;
    prev.correct += Math.round((m.q * m.acc) / 100);
    bySid.set(m.sid, prev);
  }
  const subjects = [...bySid.values()].map((s) => ({
    sid: s.sid,
    q: s.q,
    acc: s.q ? Math.round((s.correct / s.q) * 100) : 0,
  }));
  const stable = subjects.filter((s) => s.q >= STRONG_Q_MIN);
  const pool = stable.length ? stable : subjects;
  const best = [...pool].sort((a, b) => b.acc - a.acc || b.q - a.q)[0];
  if (!best) return null;
  return {
    subjectLabel: subjectLabelHe(best.sid),
    topicLabel: "",
    questionCount: best.q,
    accuracyPercent: best.acc,
    topicRowKey: "",
    subjectId: best.sid,
    displayName: subjectLabelHe(best.sid),
  };
}

/**
 * @param {ReturnType<typeof rowMetricsFromTopicRow>} m
 */
export function topicAnchorFields(m) {
  return {
    subjectLabel: subjectLabelHe(m.sid),
    topicLabel: m.label || m.displayName,
    questionCount: m.q,
    accuracyPercent: m.acc,
    topicRowKey: m.topicRowKey,
    subjectId: m.sid,
    displayName: m.displayName,
  };
}

/**
 * Resolve topic metrics for continuity / follow-ups.
 * When allowWeakestFallback is false, never jumps to a global weakest topic.
 *
 * @param {unknown} payload
 * @param {object} conv
 * @param {{ allowWeakestFallback?: boolean }} [opts]
 */
export function resolveContextTopicMetrics(payload, conv, opts = {}) {
  const allowWeakestFallback = opts.allowWeakestFallback !== false;
  let topicKey = String(conv?.lastResolvedTopic || "").trim();
  let subjectId = normalizeSubjectId(String(conv?.lastResolvedSubject || "").trim());

  const scopes = Array.isArray(conv?.priorScopes) ? conv.priorScopes : [];
  for (let i = scopes.length - 1; i >= 0; i -= 1) {
    const last = String(scopes[i] || "");
    const colon = last.indexOf(":");
    if (colon <= 0) continue;
    const st = last.slice(0, colon);
    const sid = last.slice(colon + 1);
    if (st === "topic" && sid && !topicKey) topicKey = sid;
    if (st === "subject" && sid && !subjectId) subjectId = normalizeSubjectId(sid);
  }

  if (topicKey) {
    const hit = findTopicRowByKey(payload, topicKey, subjectId || undefined);
    if (hit?.tr) return rowMetricsFromTopicRow({ ...hit.tr, subjectId: hit.subject || subjectId });
  }

  if (subjectId) {
    const within = collectTopicMetrics(payload).filter((m) => normalizeSubjectId(m.sid) === subjectId);
    if (within.length) {
      const picked = pickWeakestTopic(within) || [...within].sort((a, b) => b.q - a.q)[0];
      if (picked) return picked;
    }
  }

  const summary = String(conv?.lastAnswerSummary || conv?.lastAssistantAnswerDigestHe || "");
  if (summary.length > 8) {
    for (const sid of SUBJECT_ORDER) {
      const label = subjectLabelHe(sid);
      if (!summary.includes(label)) continue;
      const within = collectTopicMetrics(payload).filter((m) => normalizeSubjectId(m.sid) === sid);
      if (!within.length) continue;
      const picked = pickWeakestTopic(within) || [...within].sort((a, b) => b.q - a.q)[0];
      if (picked) return picked;
    }
    for (const m of collectTopicMetrics(payload)) {
      const name = m.label || m.displayName;
      if (name && summary.includes(name)) return m;
    }
  }

  if (allowWeakestFallback) return pickWeakestTopic(collectTopicMetrics(payload));
  return null;
}

/**
 * @param {unknown} payload
 * @param {object} conv
 * @param {{ allowWeakestFallback?: boolean }} [opts]
 */
export function resolveLastTopicMetrics(payload, conv, opts = {}) {
  return resolveContextTopicMetrics(payload, conv, { allowWeakestFallback: true, ...opts });
}

/**
 * @param {unknown} payload
 * @param {object} conv
 * @param {number} [limit]
 */
export function extractTopicAnchorsFromSummary(payload, conv, limit = 2) {
  const text = String(conv?.lastAnswerSummary || conv?.lastAssistantAnswerDigestHe || "");
  if (!text.trim()) return [];
  const metas = collectTopicMetrics(payload);
  /** @type {ReturnType<typeof topicAnchorFields>[]} */
  const found = [];
  const sorted = [...metas].sort((a, b) => {
    const pos = (m) => {
      const names = [m.label, m.displayName, String(m.displayName || "").split("(")[0].trim()].filter(Boolean);
      const hits = names.map((n) => text.indexOf(n)).filter((i) => i >= 0);
      return hits.length ? Math.min(...hits) : 99999;
    };
    return pos(a) - pos(b);
  });
  for (const m of sorted) {
    const names = [m.label, m.displayName, String(m.displayName || "").split("(")[0].trim()].filter(Boolean);
    if (!names.some((n) => n && text.includes(n))) continue;
    const a = topicAnchorFields(m);
    if (found.some((f) => f.topicRowKey === a.topicRowKey)) continue;
    found.push(a);
    if (found.length >= limit) break;
  }
  return found;
}

export { STRONG_ACC_MIN, STRONG_Q_MIN, WEAK_ACC_MAX };
