/**
 * Pattern-eligible evidence inclusion/exclusion — subject-agnostic.
 */
import { classifyActivityEvidence, EVIDENCE_CATEGORIES } from "../../lib/learning/activity-classification.js";
import {
  EVIDENCE_SOURCE,
  normalizeEvidenceSourceKey,
} from "../../lib/learning-supabase/evidence-source.js";
import { normalizeMistakeEvent } from "../mistake-event.js";

/**
 * @param {import("../mistake-event.js").MistakeEventV1|Record<string, unknown>} ev
 * @returns {"free_practice"|"assigned_class"|"assigned_individual"|"assigned_parent"|"learning_book"}
 */
function activitySourceFromEvent(ev) {
  const raw =
    ev?.evidenceSource ??
    ev?.evidenceSourceKey ??
    ev?.activitySource ??
    (ev?.metadata && typeof ev.metadata === "object" ? ev.metadata.evidenceSource : null);
  const key = normalizeEvidenceSourceKey(raw);
  switch (key) {
    case EVIDENCE_SOURCE.PARENT_ASSIGNED:
      return "assigned_parent";
    case EVIDENCE_SOURCE.PRIVATE_TEACHER_ASSIGNED:
      return "assigned_individual";
    case EVIDENCE_SOURCE.CLASSROOM_ASSIGNED:
      return "assigned_class";
    case EVIDENCE_SOURCE.LEARNING_BOOK:
      return "learning_book";
    default:
      return "free_practice";
  }
}

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

    const mode = ev.mode || "unclassified";
    const activitySource = activitySourceFromEvent(ev);
    const afterStepByStep =
      ev.afterStepByStep === true ||
      (ev.metadata && typeof ev.metadata === "object" && ev.metadata.afterStepByStep === true);
    const hintsUsed =
      typeof ev.hintUsed === "boolean" && ev.hintUsed
        ? 1
        : typeof ev.hintsUsed === "number"
          ? ev.hintsUsed
          : 0;
    const classified = classifyActivityEvidence(mode, activitySource, {
      afterStepByStep,
      hintsUsed,
    });
    const cat = classified.evidenceCategory;

    if (
      cat === EVIDENCE_CATEGORIES.LEARNING_GUIDED ||
      cat === EVIDENCE_CATEGORIES.LEARNING_REVIEW ||
      cat === EVIDENCE_CATEGORIES.LEARNING_BOOK ||
      cat === EVIDENCE_CATEGORIES.LEARNING_CONTEXT ||
      cat === EVIDENCE_CATEGORIES.UNCLASSIFIED ||
      !classified.isDiagnosticEligible
    ) {
      const key = `${cat}|${mode}`;
      const prev = excludedMap.get(key) || {
        reason: exclusionReason(cat),
        mode,
        count: 0,
        evidenceCategory: cat,
      };
      prev.count += 1;
      excludedMap.set(key, prev);
      continue;
    }

    included.push(ev);
    if (cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) competitiveCount += 1;
    else if (cat === EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED) guidedCount += 1;
    else independentCount += 1;
  }

  for (const v of excludedMap.values()) excludedBuckets.push(v);

  const competitiveBucketOnly =
    included.length > 0 && competitiveCount > 0 && independentCount === 0 && guidedCount === 0;

  return {
    included,
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
