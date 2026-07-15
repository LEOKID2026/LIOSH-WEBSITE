/**
 * Per-topic and per-subject insight derivation. Produces stable arrays:
 *   - `topicInsights[]`  - one entry per (subject, topic) with measurable data.
 *   - `subjectInsights[]` - one entry per subject with at least one answer.
 *   - `strengths[]`      - subjects + topics flagged as strengths (subject-first).
 *   - `focusAreas[]`     - subjects + topics flagged as focus areas (subject-first).
 *
 * Strength threshold: total ≥ 4 questions AND accuracy ≥ 80%.
 * Focus    threshold: total ≥ 3 questions AND accuracy < 55%.
 *
 * Strength/Focus items always carry a stable `sourceId` so the AI narrative validator can verify
 * grounding via membership rather than substring matching.
 */

import { classifyDataConfidence } from "./derive-data-confidence.js";
import {
  getSubjectDisplayNameHe,
  getTopicDisplayNameHe,
  safeHebrewLabel,
} from "./normalize-parent-facing-labels.js";
import { buildSubjectSourceId, buildTopicRowSourceId } from "./source-ids.js";
import {
  cleanTopicLabelHe,
  narrativeTopicRowLabelHe,
} from "../parent-report-output-integrity/row-display-label-context.js";
import { parseCanonicalTopicFromRowKey } from "../parent-report-output-integrity/row-identity-v1.js";
import { isCoreParentReportRow, resolveRegisteredGradeKeyFromAggregate } from "../parent-report-core-grade-filter.js";

const STRENGTH_ACC_THRESHOLD = 80;
const FOCUS_ACC_THRESHOLD = 55;
const STRENGTH_MIN_Q = 4;
const FOCUS_MIN_Q = 3;
const MAX_STRENGTHS = 4;
const MAX_FOCUS = 4;

function safeNumber(value, defaultValue = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function classifyTopicFluency(t, isStrength, isFocusArea) {
  const totalQ = safeNumber(t?.answers);
  if (totalQ < STRENGTH_MIN_Q) return "insufficient";
  if (isFocusArea) return "struggling";
  if (isStrength) {
    const slow = safeNumber(t?.correctSlowAnswers);
    const manyHints = safeNumber(t?.correctManyHintsAnswers);
    return slow === 0 && manyHints === 0 ? "fluent" : "effortful";
  }
  return "effortful";
}

function topicEvidenceHe(t) {
  const totalQ = Math.max(0, Math.round(safeNumber(t?.answers)));
  const acc = Math.max(0, Math.min(100, safeNumber(t?.accuracy)));
  return `${totalQ} שאלות, דיוק ${Math.round(acc)}%`;
}

function subjectEvidenceHe(s) {
  const totalQ = Math.max(0, Math.round(safeNumber(s?.answers)));
  const acc = Math.max(0, Math.min(100, safeNumber(s?.accuracy)));
  return `${totalQ} שאלות, דיוק ${Math.round(acc)}%`;
}

function buildDuplicateCanonicalKeysFromAggregate(subjectsObj) {
  /** @type {Map<string, Set<string>>} */
  const gradesByCanon = new Map();
  for (const [subjectKey, s] of Object.entries(subjectsObj || {})) {
    const topics = s?.topics && typeof s.topics === "object" ? s.topics : {};
    for (const topicKey of Object.keys(topics)) {
      const t = topics[topicKey];
      const parsed = parseCanonicalTopicFromRowKey(topicKey);
      const canon = parsed.canonicalTopicKey || topicKey;
      const gk =
        (t?.contentGradeLevel && String(t.contentGradeLevel).trim()) || parsed.contentGradeKey || null;
      const mapKey = `${subjectKey}|${canon}`;
      if (!gradesByCanon.has(mapKey)) gradesByCanon.set(mapKey, new Set());
      if (gk) gradesByCanon.get(mapKey).add(String(gk));
    }
  }
  const dup = new Set();
  for (const [k, grades] of gradesByCanon) {
    if (grades.size >= 2) dup.add(k);
  }
  return dup;
}

function coreSubjectStatsFromTopics(s, registeredGradeKey) {
  const topics = s?.topics && typeof s.topics === "object" ? s.topics : {};
  let answers = 0;
  let correct = 0;
  for (const t of Object.values(topics)) {
    if (!t) continue;
    const totalQ = Math.max(0, Math.round(safeNumber(t.answers)));
    if (totalQ === 0) continue;
    const isCore = isCoreParentReportRow(
      {
        gradeRelation: t.gradeRelation,
        contentGradeKey: t.contentGradeLevel,
        registeredGradeKey: t.registeredGradeLevel || registeredGradeKey,
        questions: totalQ,
      },
      registeredGradeKey,
    );
    if (!isCore) continue;
    answers += totalQ;
    correct += Math.round((safeNumber(t.accuracy) / 100) * totalQ);
  }
  const accuracy = answers > 0 ? Number(((correct / answers) * 100).toFixed(2)) : 0;
  return { answers, correct, accuracy };
}

export function deriveTopicInsights(aggregate) {
  const subjectsObj = aggregate?.subjects && typeof aggregate.subjects === "object" ? aggregate.subjects : {};
  const registeredGradeKey = resolveRegisteredGradeKeyFromAggregate(aggregate);
  const duplicateCanonicalKeys = buildDuplicateCanonicalKeysFromAggregate(subjectsObj);
  const out = [];
  for (const subjectKey of Object.keys(subjectsObj).sort()) {
    const s = subjectsObj[subjectKey];
    const topics = s?.topics && typeof s.topics === "object" ? s.topics : {};
    for (const topicKey of Object.keys(topics).sort()) {
      const t = topics[topicKey];
      if (!t) continue;
      const totalQ = Math.max(0, Math.round(safeNumber(t.answers)));
      if (totalQ === 0) continue;
      const acc = Math.max(0, Math.min(100, safeNumber(t.accuracy)));
      const contentGradeLevel =
        typeof t.contentGradeLevel === "string" && t.contentGradeLevel.trim()
          ? t.contentGradeLevel.trim().toLowerCase()
          : null;
      const sourceId = buildTopicRowSourceId(subjectKey, topicKey, contentGradeLevel);
      if (!sourceId) continue;
      const baseLabel = safeHebrewLabel(
        getTopicDisplayNameHe(subjectKey, topicKey),
        getSubjectDisplayNameHe(subjectKey),
      );
      const parsedTopic = parseCanonicalTopicFromRowKey(topicKey);
      const requiresGradeContext = duplicateCanonicalKeys.has(
        `${subjectKey}|${parsedTopic.canonicalTopicKey || topicKey}`,
      );
      const labelHe = narrativeTopicRowLabelHe({
        displayName: cleanTopicLabelHe(baseLabel),
        contentGradeKey: contentGradeLevel,
        registeredGradeKey:
          typeof t.registeredGradeLevel === "string" && t.registeredGradeLevel.trim()
            ? t.registeredGradeLevel.trim().toLowerCase()
            : null,
        gradeRelation:
          typeof t.gradeRelation === "string" && t.gradeRelation.trim() ? t.gradeRelation.trim() : null,
        topicRowKey: topicKey,
        requiresGradeContext,
      });
      const isCore = isCoreParentReportRow(
        {
          gradeRelation: t.gradeRelation,
          contentGradeKey: contentGradeLevel,
          registeredGradeKey:
            typeof t.registeredGradeLevel === "string" && t.registeredGradeLevel.trim()
              ? t.registeredGradeLevel.trim().toLowerCase()
              : registeredGradeKey,
          questions: totalQ,
        },
        registeredGradeKey,
      );
      const isStrength = isCore && totalQ >= STRENGTH_MIN_Q && acc >= STRENGTH_ACC_THRESHOLD;
      const isFocusArea = isCore && totalQ >= FOCUS_MIN_Q && acc < FOCUS_ACC_THRESHOLD;
      out.push({
        key: String(topicKey),
        subjectKey: String(subjectKey),
        sourceId,
        displayNameHe: labelHe,
        contentGradeLevel:
          typeof t.contentGradeLevel === "string" && t.contentGradeLevel.trim()
            ? t.contentGradeLevel.trim().toLowerCase()
            : null,
        registeredGradeLevel:
          typeof t.registeredGradeLevel === "string" && t.registeredGradeLevel.trim()
            ? t.registeredGradeLevel.trim().toLowerCase()
            : null,
        gradeRelation:
          typeof t.gradeRelation === "string" && t.gradeRelation.trim() ? t.gradeRelation.trim() : "unknown",
        gradeDelta: t.gradeDelta != null && Number.isFinite(Number(t.gradeDelta)) ? Number(t.gradeDelta) : null,
        totalQuestions: totalQ,
        accuracyPct: Number(acc.toFixed(2)),
        avgTimePerQuestionSec:
          typeof t.avgTimePerQuestionSec === "number" && Number.isFinite(t.avgTimePerQuestionSec)
            ? Number(t.avgTimePerQuestionSec.toFixed(2))
            : null,
        avgHintsPerQuestion:
          typeof t.avgHintsPerQuestion === "number" && Number.isFinite(t.avgHintsPerQuestion)
            ? Number(t.avgHintsPerQuestion.toFixed(2))
            : null,
        fluency: classifyTopicFluency(t, isStrength, isFocusArea),
        isStrength,
        isFocusArea,
        dataConfidence: classifyDataConfidence(totalQ),
      });
    }
  }
  return out;
}

export function deriveSubjectInsights(aggregate, subjectTrends) {
  const subjectsObj = aggregate?.subjects && typeof aggregate.subjects === "object" ? aggregate.subjects : {};
  const registeredGradeKey = resolveRegisteredGradeKeyFromAggregate(aggregate);
  const trendMap = new Map();
  for (const t of Array.isArray(subjectTrends) ? subjectTrends : []) {
    if (t && t.subjectKey && t.trend) trendMap.set(t.subjectKey, t.trend);
  }
  const out = [];
  for (const subjectKey of Object.keys(subjectsObj).sort()) {
    const s = subjectsObj[subjectKey];
    if (!s) continue;
    const coreStats = registeredGradeKey ? coreSubjectStatsFromTopics(s, registeredGradeKey) : null;
    if (registeredGradeKey) {
      if (!coreStats || coreStats.answers <= 0) continue;
    }
    const totalQ =
      coreStats && coreStats.answers > 0
        ? coreStats.answers
        : Math.max(0, Math.round(safeNumber(s.answers)));
    if (totalQ === 0) continue;
    const acc =
      coreStats && coreStats.answers > 0
        ? coreStats.accuracy
        : Math.max(0, Math.min(100, safeNumber(s.accuracy)));
    const dataConfidence = classifyDataConfidence(totalQ);
    const isStrength = totalQ >= STRENGTH_MIN_Q && acc >= STRENGTH_ACC_THRESHOLD;
    const isFocusArea = totalQ >= FOCUS_MIN_Q && acc < FOCUS_ACC_THRESHOLD;
    const sourceId = buildSubjectSourceId(subjectKey);
    if (!sourceId) continue;
    out.push({
      key: subjectKey,
      sourceId,
      displayNameHe: getSubjectDisplayNameHe(subjectKey),
      totalQuestions: totalQ,
      accuracyPct: Number(acc.toFixed(2)),
      totalTimeMinutes: Math.round(safeNumber(s.durationSeconds) / 60),
      avgTimePerQuestionSec:
        typeof s.avgTimePerQuestionSec === "number" && Number.isFinite(s.avgTimePerQuestionSec)
          ? Number(s.avgTimePerQuestionSec.toFixed(2))
          : null,
      avgHintsPerQuestion:
        typeof s.avgHintsPerQuestion === "number" && Number.isFinite(s.avgHintsPerQuestion)
          ? Number(s.avgHintsPerQuestion.toFixed(2))
          : null,
      trend: trendMap.get(subjectKey) || (dataConfidence === "thin" ? "insufficient_data" : "stable"),
      dataConfidence,
      isStrength,
      isFocusArea,
      evidenceHe: subjectEvidenceHe({ answers: totalQ, accuracy: acc }),
      modeCounts: { ...(s.modeCounts || {}) },
      levelCounts: { ...(s.levelCounts || {}) },
    });
  }
  return out;
}

export function pickStrengths(topicInsights, subjectInsights) {
  const out = [];
  const seenKeys = new Set();
  const safe = (sourceId) => {
    if (!sourceId) return false;
    if (seenKeys.has(sourceId)) return false;
    seenKeys.add(sourceId);
    return true;
  };
  for (const sub of subjectInsights) {
    if (!sub.isStrength) continue;
    if (!safe(sub.sourceId)) continue;
    out.push({
      sourceId: sub.sourceId,
      scope: "subject",
      displayNameHe: sub.displayNameHe,
      evidenceHe: sub.evidenceHe,
    });
    if (out.length >= MAX_STRENGTHS) return out;
  }
  const topicStrengths = topicInsights
    .filter((t) => t.isStrength)
    .sort((a, b) => b.accuracyPct - a.accuracyPct || b.totalQuestions - a.totalQuestions);
  for (const t of topicStrengths) {
    if (!safe(t.sourceId)) continue;
    out.push({
      sourceId: t.sourceId,
      scope: "topic",
      displayNameHe: t.displayNameHe,
      evidenceHe: topicEvidenceHe({ answers: t.totalQuestions, accuracy: t.accuracyPct }),
    });
    if (out.length >= MAX_STRENGTHS) break;
  }
  return out;
}

export function pickFocusAreas(topicInsights, subjectInsights) {
  const out = [];
  const seenKeys = new Set();
  const safe = (sourceId) => {
    if (!sourceId) return false;
    if (seenKeys.has(sourceId)) return false;
    seenKeys.add(sourceId);
    return true;
  };
  for (const sub of subjectInsights) {
    if (!sub.isFocusArea) continue;
    if (!safe(sub.sourceId)) continue;
    out.push({
      sourceId: sub.sourceId,
      scope: "subject",
      displayNameHe: sub.displayNameHe,
      evidenceHe: sub.evidenceHe,
      thinData:
        (sub.dataConfidence === "thin" || sub.dataConfidence === "low") &&
        sub.totalQuestions < 12,
    });
    if (out.length >= MAX_FOCUS) return out;
  }
  const topicFocus = topicInsights
    .filter((t) => t.isFocusArea)
    .sort((a, b) => a.accuracyPct - b.accuracyPct || b.totalQuestions - a.totalQuestions);
  for (const t of topicFocus) {
    if (!safe(t.sourceId)) continue;
    out.push({
      sourceId: t.sourceId,
      scope: "topic",
      displayNameHe: t.displayNameHe,
      evidenceHe: topicEvidenceHe({ answers: t.totalQuestions, accuracy: t.accuracyPct }),
      thinData:
        (t.dataConfidence === "thin" || t.dataConfidence === "low") && t.totalQuestions < 12,
    });
    if (out.length >= MAX_FOCUS) break;
  }
  return out;
}

export const INSIGHT_TOPIC_THRESHOLDS_FOR_TESTS = Object.freeze({
  STRENGTH_ACC_THRESHOLD,
  FOCUS_ACC_THRESHOLD,
  STRENGTH_MIN_Q,
  FOCUS_MIN_Q,
});
