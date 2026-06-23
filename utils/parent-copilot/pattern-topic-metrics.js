/**
 * Shared topic row metrics for approved pattern answer composers.
 */

import {
  findTopicRowByKey,
  listCopilotAnchoredTopicRows,
  normalizeSubjectId,
  subjectLabelHe,
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
 * @param {unknown} payload
 * @param {object} conv
 */
export function resolveLastTopicMetrics(payload, conv) {
  const topicKey = String(conv?.lastResolvedTopic || "").trim();
  const subjectId = String(conv?.lastResolvedSubject || "").trim();
  if (topicKey) {
    const hit = findTopicRowByKey(payload, topicKey, subjectId || undefined);
    if (hit?.tr) return rowMetricsFromTopicRow({ ...hit.tr, subjectId: hit.subject || subjectId });
  }
  const scopes = Array.isArray(conv?.priorScopes) ? conv.priorScopes : [];
  if (scopes.length) {
    const last = String(scopes[scopes.length - 1] || "");
    const colon = last.indexOf(":");
    if (colon > 0) {
      const st = last.slice(0, colon);
      const sid = last.slice(colon + 1);
      if (st === "topic" && sid) {
        const hit = findTopicRowByKey(payload, sid);
        if (hit?.tr) return rowMetricsFromTopicRow({ ...hit.tr, subjectId: hit.subject });
      }
    }
  }
  return pickWeakestTopic(collectTopicMetrics(payload));
}

export { STRONG_ACC_MIN, STRONG_Q_MIN, WEAK_ACC_MAX };
