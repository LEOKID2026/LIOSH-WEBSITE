import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import { generateActivityQuestionSetClient } from "../../classroom-activities/generate-activity-questions-client.js";
import {
  mathActivityKindMatchesOperation,
  normalizeHebrewTopic,
  normalizeMathActivityTopic,
  normalizeGeometryTopic,
} from "../../classroom-activities/generate-activity-questions-client.js";
import { normalizeAndFreezeQuestionSet } from "../../classroom-activities/assigned-activity-snapshot.server.js";
import { demoSeededRandom, demoStableQuestionKey } from "./seed.js";

/** @type {Map<string, Array<Record<string, unknown>>>} */
const questionSetCache = new Map();

/** @type {Promise<void>} */
let generationChain = Promise.resolve();

/**
 * Serialize demo question generation so Math.random patching stays isolated.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function withDemoGenerationLock(fn) {
  const run = generationChain.then(fn, fn);
  generationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * @param {...string} seedParts
 * @param {() => Promise<unknown>} fn
 */
async function withDemoSeededRandom(seedParts, fn) {
  const rnd = demoSeededRandom(...seedParts);
  const original = Math.random;
  Math.random = rnd;
  try {
    return await fn();
  } finally {
    Math.random = original;
  }
}

/**
 * Normalized dedupe fingerprint: question text + sorted choices + params.
 * @param {Record<string, unknown>} q
 */
export function demoQuestionDedupeFingerprint(q) {
  const text = String(q.question || "").trim();
  const choices = Array.isArray(q.choices)
    ? [...q.choices].map(String).sort()
    : [];
  const params =
    q.params && typeof q.params === "object" && !Array.isArray(q.params)
      ? q.params
      : {};
  return `${text}::${choices.join("\u001f")}::${JSON.stringify(params)}`;
}

const FORBIDDEN_STEM_PATTERNS = [
  /\(נושא\s*:/,
  /\bנושא\s*:/,
  /<<|>>|«|»/,
];

/**
 * @param {string} stem
 */
export function demoQuestionStemIsClean(stem) {
  const text = String(stem || "");
  return !FORBIDDEN_STEM_PATTERNS.some((re) => re.test(text));
}

/**
 * Verify generated questions align with activity subject/topic/grade.
 * @param {import("./activities-generator.js").DemoAssignedActivityDef} activity
 * @param {string} gradeLevel
 * @param {Array<Record<string, unknown>>} questionSet
 */
export function assertDemoQuestionSetTopicAlignment(activity, gradeLevel, questionSet) {
  const gradeKey = normalizeGradeLevelToKey(gradeLevel) || "g3";
  const subject = String(activity.subject || "").toLowerCase();
  const activityTopic = String(activity.topic || "").trim();

  for (const q of questionSet) {
    const stem = String(q.question || "");
    if (!demoQuestionStemIsClean(stem)) {
      throw new Error(
        `demo question stem contains forbidden placeholder text: ${stem.slice(0, 80)}`,
      );
    }

    const qTopic = String(q.topic || q.operation || "").trim().toLowerCase();
    if (subject === "math") {
      const operation = normalizeMathActivityTopic(activityTopic, gradeKey);
      if (qTopic !== operation) {
        throw new Error(
          `math topic mismatch for ${activity.activityId}: expected ${operation}, got ${qTopic}`,
        );
      }
      const kind = q.params && typeof q.params === "object" ? q.params.kind : null;
      if (!mathActivityKindMatchesOperation(operation, kind)) {
        throw new Error(
          `math kind ${String(kind)} does not match operation ${operation} in ${activity.activityId}`,
        );
      }
      continue;
    }

    if (subject === "hebrew") {
      const topicKey = normalizeHebrewTopic(activityTopic, gradeKey);
      if (qTopic !== topicKey) {
        throw new Error(
          `hebrew topic mismatch for ${activity.activityId}: expected ${topicKey}, got ${qTopic}`,
        );
      }
      continue;
    }

    if (subject === "geometry") {
      const topicKey = normalizeGeometryTopic(activityTopic, gradeKey);
      if (qTopic !== topicKey) {
        throw new Error(
          `geometry topic mismatch for ${activity.activityId}: expected ${topicKey}, got ${qTopic}`,
        );
      }
      continue;
    }

    if (subject === "science" || subject === "english") {
      const expected = activityTopic.toLowerCase();
      if (qTopic !== expected) {
        throw new Error(
          `${subject} topic mismatch for ${activity.activityId}: expected ${expected}, got ${qTopic}`,
        );
      }
    }
  }
}

/**
 * @param {Array<Record<string, unknown>>} questionSet
 */
export function assertDemoQuestionSetNoDuplicates(questionSet) {
  const seen = new Set();
  for (const q of questionSet) {
    const fp = demoQuestionDedupeFingerprint(q);
    if (seen.has(fp)) {
      throw new Error(`duplicate demo question in activity: ${String(q.question).slice(0, 60)}`);
    }
    seen.add(fp);
  }
}

/**
 * Generate frozen question_set rows via the real assigned-activity generator.
 * Retries with deterministic seed offsets until the set is full and duplicate-free.
 * @param {import("./activities-generator.js").DemoAssignedActivityDef} activity
 * @param {string} gradeLevel
 */
export async function buildDemoRealActivityQuestionSet(activity, gradeLevel) {
  const cacheKey = activity.activityId;
  const cached = questionSetCache.get(cacheKey);
  if (cached) return cached;

  return withDemoGenerationLock(async () => {
    const hit = questionSetCache.get(cacheKey);
    if (hit) return hit;

    const gradeKey = normalizeGradeLevelToKey(gradeLevel) || "g3";
    const targetCount = activity.questionCount;
    /** @type {Array<Record<string, unknown>>} */
    const merged = [];
    /** @type {Set<string>} */
    const seen = new Set();

    for (let seedAttempt = 0; seedAttempt < 24 && merged.length < targetCount; seedAttempt += 1) {
      const remaining = targetCount - merged.length;
      const batchCount = Math.min(50, remaining + 4);
      const raw = await withDemoSeededRandom(
        [activity.activityId, "real-question-set", String(seedAttempt)],
        () =>
          generateActivityQuestionSetClient({
            subject: activity.subject,
            gradeLevel: gradeKey,
            topic: activity.topic,
            difficulty: "regular",
            count: batchCount,
          }),
      );

      const frozenBatch = normalizeAndFreezeQuestionSet(raw, {
        subject: activity.subject,
        topic: activity.topic,
        gradeLevel: gradeKey,
        difficultyLevel: "regular",
      });

      for (const q of frozenBatch) {
        const fp = demoQuestionDedupeFingerprint(q);
        if (seen.has(fp)) continue;
        seen.add(fp);
        const index = merged.length;
        merged.push({
          ...q,
          qk: demoStableQuestionKey(activity.activityId, index),
          question_index: index,
        });
        if (merged.length >= targetCount) break;
      }
    }

    if (merged.length < targetCount) {
      throw new Error(
        `demo question set incomplete for ${activity.activityId}: got ${merged.length}/${targetCount}`,
      );
    }

    assertDemoQuestionSetNoDuplicates(merged);
    assertDemoQuestionSetTopicAlignment(activity, gradeLevel, merged);

    questionSetCache.set(cacheKey, merged);
    return merged;
  });
}

/** Test-only cache reset. */
export function resetDemoRealQuestionSetCacheForTests() {
  questionSetCache.clear();
  generationChain = Promise.resolve();
}
