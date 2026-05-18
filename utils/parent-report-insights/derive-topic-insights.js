/**
 * Per-topic and per-subject insight derivation. Produces stable arrays:
 *   - `topicInsights[]`  — one entry per (subject, topic) with measurable data.
 *   - `subjectInsights[]` — one entry per subject with at least one answer.
 *   - `strengths[]`      — subjects + topics flagged as strengths (subject-first).
 *   - `focusAreas[]`     — subjects + topics flagged as focus areas (subject-first).
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
import { buildSubjectSourceId, buildTopicSourceId } from "./source-ids.js";

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

export function deriveTopicInsights(aggregate) {
  const subjectsObj = aggregate?.subjects && typeof aggregate.subjects === "object" ? aggregate.subjects : {};
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
      const sourceId = buildTopicSourceId(subjectKey, topicKey);
      if (!sourceId) continue;
      const labelHe = safeHebrewLabel(getTopicDisplayNameHe(subjectKey, topicKey), getSubjectDisplayNameHe(subjectKey));
      const isStrength = totalQ >= STRENGTH_MIN_Q && acc >= STRENGTH_ACC_THRESHOLD;
      const isFocusArea = totalQ >= FOCUS_MIN_Q && acc < FOCUS_ACC_THRESHOLD;
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
  const trendMap = new Map();
  for (const t of Array.isArray(subjectTrends) ? subjectTrends : []) {
    if (t && t.subjectKey && t.trend) trendMap.set(t.subjectKey, t.trend);
  }
  const out = [];
  for (const subjectKey of Object.keys(subjectsObj).sort()) {
    const s = subjectsObj[subjectKey];
    if (!s) continue;
    const totalQ = Math.max(0, Math.round(safeNumber(s.answers)));
    if (totalQ === 0) continue;
    const acc = Math.max(0, Math.min(100, safeNumber(s.accuracy)));
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
      evidenceHe: subjectEvidenceHe(s),
      modeCounts: { ...(s.modeCounts || {}) },
      levelCounts: { ...(s.levelCounts || {}) },
    });
  }
  return out;
}

export function pickStrengths(topicInsights, subjectInsights) {
  const out = [];
  const seenLabels = new Set();
  const safe = (label) => {
    if (!label) return false;
    if (seenLabels.has(label)) return false;
    seenLabels.add(label);
    return true;
  };
  for (const sub of subjectInsights) {
    if (!sub.isStrength) continue;
    if (!safe(sub.displayNameHe)) continue;
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
    if (!safe(t.displayNameHe)) continue;
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
  const seenLabels = new Set();
  const safe = (label) => {
    if (!label) return false;
    if (seenLabels.has(label)) return false;
    seenLabels.add(label);
    return true;
  };
  for (const sub of subjectInsights) {
    if (!sub.isFocusArea) continue;
    if (!safe(sub.displayNameHe)) continue;
    out.push({
      sourceId: sub.sourceId,
      scope: "subject",
      displayNameHe: sub.displayNameHe,
      evidenceHe: sub.evidenceHe,
      thinData: sub.dataConfidence === "thin" || sub.dataConfidence === "low",
    });
    if (out.length >= MAX_FOCUS) return out;
  }
  const topicFocus = topicInsights
    .filter((t) => t.isFocusArea)
    .sort((a, b) => a.accuracyPct - b.accuracyPct || b.totalQuestions - a.totalQuestions);
  for (const t of topicFocus) {
    if (!safe(t.displayNameHe)) continue;
    out.push({
      sourceId: t.sourceId,
      scope: "topic",
      displayNameHe: t.displayNameHe,
      evidenceHe: topicEvidenceHe({ answers: t.totalQuestions, accuracy: t.accuracyPct }),
      thinData: t.dataConfidence === "thin" || t.dataConfidence === "low",
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
