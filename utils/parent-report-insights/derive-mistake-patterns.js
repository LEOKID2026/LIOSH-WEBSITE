/**
 * Detects repeated mistake patterns over `recentMistakes`. Two kinds:
 *  - `same_question_recurrence`: the same `questionId` (fingerprint) appears multiple times.
 *  - `topic_recurrence`: the same `(subject, topic)` pair appears multiple times.
 *
 * Output items are deterministic-sorted (occurrences DESC, topicDisplayHe ASC), capped to 6.
 * Raw `prompt` / `expectedAnswer` / `userAnswer` text is NEVER carried forward - only Hebrew topic
 * labels and counts.
 */

import { getTopicDisplayNameHe, getSubjectDisplayNameHe, safeHebrewLabel } from "./normalize-parent-facing-labels.js";

const MIN_OCCURRENCES = 2;
const MAX_PATTERNS = 6;

export function deriveMistakePatterns(aggregate) {
  const recent = Array.isArray(aggregate?.recentMistakes) ? aggregate.recentMistakes : [];
  if (!recent.length) return [];

  const topicCounts = new Map();
  const fingerprintCounts = new Map();

  for (const m of recent) {
    if (!m || typeof m !== "object") continue;
    const subjectKey = String(m.subject || "").trim().toLowerCase();
    const topicKey = String(m.topic || "").trim().toLowerCase();
    if (!subjectKey || !topicKey) continue;
    const tk = `${subjectKey}|${topicKey}`;
    topicCounts.set(tk, (topicCounts.get(tk) || 0) + 1);
    const qid = String(m.questionId || "").trim();
    if (qid) {
      const fk = `${subjectKey}|${topicKey}|${qid}`;
      fingerprintCounts.set(fk, (fingerprintCounts.get(fk) || 0) + 1);
    }
  }

  const out = [];
  for (const [k, n] of fingerprintCounts.entries()) {
    if (n < MIN_OCCURRENCES) continue;
    const [subjectKey, topicKey] = k.split("|");
    const subjectLabel = getSubjectDisplayNameHe(subjectKey);
    const topicLabel = getTopicDisplayNameHe(subjectKey, topicKey);
    const display = topicLabel ? `${subjectLabel} - ${safeHebrewLabel(topicLabel, subjectLabel)}` : subjectLabel;
    out.push({ topicDisplayHe: display, subjectKey, occurrences: n, kind: "same_question_recurrence" });
  }
  for (const [k, n] of topicCounts.entries()) {
    if (n < MIN_OCCURRENCES) continue;
    const [subjectKey, topicKey] = k.split("|");
    const subjectLabel = getSubjectDisplayNameHe(subjectKey);
    const topicLabel = getTopicDisplayNameHe(subjectKey, topicKey);
    const display = topicLabel ? `${subjectLabel} - ${safeHebrewLabel(topicLabel, subjectLabel)}` : subjectLabel;
    out.push({ topicDisplayHe: display, subjectKey, occurrences: n, kind: "topic_recurrence" });
  }

  out.sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return a.topicDisplayHe.localeCompare(b.topicDisplayHe, "he");
  });

  return out.slice(0, MAX_PATTERNS);
}
