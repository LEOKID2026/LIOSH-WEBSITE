/**
 * Pattern-eligible evidence inclusion/exclusion — subject-agnostic.
 */
import { EVIDENCE_CATEGORIES } from "../../lib/learning/activity-classification.js";
import {
  assessDiagnosticEvidenceEligibility,
} from "../diagnostic-evidence-eligibility.js";
import { normalizeMistakeEvent } from "../mistake-event.js";

/**
 * @param {unknown[]} rawMistakes
 * @param {string} subjectId
 * @param {string} topicRowKey
 * @param {number} startMs
 * @param {number} endMs
 */
export function partitionPatternEligibleMistakes(rawMistakes, subjectId, topicRowKey, startMs, endMs) {
  /** @type {import("../mistake-event.js").MistakeEventV1[]} */
  const included = [];
  /** @type {import("../mistake-event.js").MistakeEventV1[]} */
  const diagnosticIncluded = [];
  /** @type {{ reason: string, mode: string|null, count: number, evidenceCategory: string }[]} */
  const excludedBuckets = [];
  /** @type {Map<string, { reason: string, mode: string|null, count: number, evidenceCategory: string }>} */
  const excludedMap = new Map();

  let independentCount = 0;
  let competitiveCount = 0;
  let guidedCount = 0;

  const bucketKeyFromRow = String(topicRowKey || "").split("\u0001")[0];

  for (const raw of Array.isArray(rawMistakes) ? rawMistakes : []) {
    const ev = normalizeMistakeEvent(raw, subjectId);
    if (raw && typeof raw === "object") {
      if (raw.evidenceSource != null) ev.evidenceSource = raw.evidenceSource;
      if (raw.evidenceSourceKey != null) ev.evidenceSourceKey = raw.evidenceSourceKey;
      if (raw.activitySource != null) ev.activitySource = raw.activitySource;
      if (raw.afterStepByStep === true) ev.afterStepByStep = true;
    }
    const ts = ev.timestamp;
    if (ts != null && (ts < startMs || ts > endMs)) continue;

    const evTopic = String(ev.bucketKey || ev.topicOrOperation || "");
    if (bucketKeyFromRow && evTopic && !topicRowKey.includes(evTopic) && evTopic !== bucketKeyFromRow) {
      if (!String(topicRowKey).startsWith(evTopic)) continue;
    }

    const eligibility = assessDiagnosticEvidenceEligibility({
      ...ev,
      ...(raw && typeof raw === "object" ? raw : {}),
    });
    const mode = eligibility.mode || "unclassified";
    const cat = eligibility.evidenceCategory;

    if (!eligibility.independentRecurrenceEligible) {
      const key = `${cat}|${mode}`;
      const prev = excludedMap.get(key) || {
        reason:
          eligibility.reasonCodes[0] ||
          exclusionReason(cat),
        mode,
        count: 0,
        evidenceCategory: cat,
      };
      prev.count += 1;
      excludedMap.set(key, prev);
    }

    if (eligibility.diagnosticEligible) {
      diagnosticIncluded.push(ev);
      if (cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) competitiveCount += 1;
      else if (cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED) guidedCount += 1;
      else if (eligibility.independentRecurrenceEligible) independentCount += 1;
    }
    if (eligibility.independentRecurrenceEligible) included.push(ev);
  }

  for (const v of excludedMap.values()) excludedBuckets.push(v);

  const competitiveBucketOnly =
    included.length > 0 && competitiveCount > 0 && independentCount === 0 && guidedCount === 0;

  return {
    included,
    diagnosticIncluded,
    excludedEvidence: excludedBuckets,
    competitiveBucketOnly,
    bucketCounts: { independentCount, competitiveCount, guidedCount },
  };
}

/**
 * @param {string} cat
 */
function exclusionReason(cat) {
  switch (cat) {
    case EVIDENCE_CATEGORIES.LEARNING_GUIDED:
      return "learning_or_guided_mode";
    case EVIDENCE_CATEGORIES.LEARNING_REVIEW:
      return "learning_review_mode";
    case EVIDENCE_CATEGORIES.LEARNING_BOOK:
      return "book_reading";
    case EVIDENCE_CATEGORIES.LEARNING_CONTEXT:
      return "discussion_context";
    default:
      return "not_pattern_eligible";
  }
}
