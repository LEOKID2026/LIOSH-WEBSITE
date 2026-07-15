/**
 * Reads per-topic fluency buckets from the extended aggregate (`correctSlowAnswers`,
 * `correctManyHintsAnswers`, `wrongFastAnswers`) and produces small Hebrew-labelled lists for the
 * AI narrative writer to mention as observations (never as diagnoses).
 */

import { getSubjectDisplayNameHe, getTopicDisplayNameHe, safeHebrewLabel } from "./normalize-parent-facing-labels.js";

const MIN_BUCKET_OCCURRENCES = 2;
const MAX_LIST_LENGTH = 6;

function collectFromBucket(aggregate, accessor) {
  const subjects = aggregate?.subjects && typeof aggregate.subjects === "object" ? aggregate.subjects : {};
  const subjectKeys = Object.keys(subjects).sort();
  const labels = [];
  for (const subjectKey of subjectKeys) {
    const s = subjects[subjectKey];
    const topics = s?.topics && typeof s.topics === "object" ? s.topics : {};
    const topicKeys = Object.keys(topics).sort();
    for (const topicKey of topicKeys) {
      const t = topics[topicKey];
      if (!t) continue;
      const count = Math.max(0, Math.round(Number(accessor(t)) || 0));
      if (count < MIN_BUCKET_OCCURRENCES) continue;
      const topicLabel = getTopicDisplayNameHe(subjectKey, topicKey);
      const subjectLabel = getSubjectDisplayNameHe(subjectKey);
      const label = topicLabel ? `${subjectLabel} - ${safeHebrewLabel(topicLabel, subjectLabel)}` : subjectLabel;
      labels.push(label);
    }
  }
  return labels.slice(0, MAX_LIST_LENGTH);
}

export function deriveFluencySignals(aggregate) {
  const thresholdsMs = aggregate?.meta?.fluencyThresholds || { slowMs: 60000, fastMs: 6000, manyHints: 3 };
  return {
    thresholds: {
      slowSecPerQuestion: Math.round((Number(thresholdsMs.slowMs) || 60000) / 1000),
      fastWrongSec: Math.round((Number(thresholdsMs.fastMs) || 6000) / 1000),
      manyHints: Math.max(1, Math.round(Number(thresholdsMs.manyHints) || 3)),
    },
    correctSlowTopicsHe: collectFromBucket(aggregate, (t) => t.correctSlowAnswers),
    correctManyHintsTopicsHe: collectFromBucket(aggregate, (t) => t.correctManyHintsAnswers),
    wrongFastTopicsHe: collectFromBucket(aggregate, (t) => t.wrongFastAnswers),
  };
}
