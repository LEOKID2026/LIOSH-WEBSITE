/**
 * Subject-agnostic repeated mistake pattern detection from wrong events.
 * Priority: patternFamily → subtype+kind → kind → conceptTag → topicOrOperation
 *
 * Parent-facing recurrence levels follow the final product ladder (2026-07-26).
 * Cluster inclusion for repeatedMistakePatterns still requires count>=2 among wrongs
 * (DE2-oriented). Factual observations (count>=1) are built separately.
 */
import { mistakePatternClusterKey } from "../mistake-event.js";
import { parentFacingErrorPatternLabelHe } from "./parent-facing-error-pattern-he.js";
import { resolveFactualRecurrenceLevel } from "./build-factual-observations.js";

const MIN_WRONGS_FOR_REPEAT = 2;
const MIN_REPEAT_RATIO = 0.4;

/**
 * @param {import("../mistake-event.js").MistakeEventV1[]} wrongEvents
 * @returns {{ key: string, count: number, ratio: number, label: string }[]}
 */
export function resolveRepeatedMistakePatterns(wrongEvents) {
  const wrongs = Array.isArray(wrongEvents) ? wrongEvents.filter((e) => e && !e.isCorrect) : [];
  if (wrongs.length < MIN_WRONGS_FOR_REPEAT) return [];

  /** @type {Map<string, { count: number, label: string }>} */
  const clusters = new Map();
  for (const ev of wrongs) {
    const key = mistakePatternClusterKey(ev);
    const prev = clusters.get(key) || { count: 0, label: patternLabelFromEvent(ev, key) };
    prev.count += 1;
    clusters.set(key, prev);
  }

  const total = wrongs.length;
  const out = [];
  for (const [key, { count, label }] of clusters) {
    const ratio = total > 0 ? count / total : 0;
    if (count >= MIN_WRONGS_FOR_REPEAT && ratio >= MIN_REPEAT_RATIO) {
      out.push({ key, count, ratio, label });
    }
  }
  out.sort((a, b) => b.count - a.count || b.ratio - a.ratio);
  return out;
}

/**
 * Parent-facing label only: approved Hebrew from parentFacingErrorPatternLabelHe,
 * otherwise "unknown". Never expose the internal cluster key as label.
 * @param {import("../mistake-event.js").MistakeEventV1} ev
 * @param {string} key
 */
function patternLabelFromEvent(ev, key) {
  const fromKey = parentFacingErrorPatternLabelHe(key);
  if (fromKey) return fromKey;
  for (const candidate of [ev?.patternFamily, ev?.subtype, ev?.kind]) {
    const mapped = parentFacingErrorPatternLabelHe(candidate);
    if (mapped) return mapped;
  }
  return "unknown";
}

/**
 * Final product ladder for observedPatternLevel (from top repeated cluster).
 * Uses ratio among wrongs as ratioOfErrors; ratioOfQuestions = count/q.
 *
 * @param {{ key: string, count: number, ratio: number, label: string }[]} patterns
 * @param {number} questionCount
 * @returns {"none"|"observed"|"repeated"|"consistent"|"strong"}
 */
export function resolveObservedPatternLevelFromPatterns(patterns, questionCount) {
  const q = Math.max(0, Number(questionCount) || 0);
  if (!patterns.length || q === 0) return "none";
  const top = patterns[0];
  const count = Math.max(0, Math.floor(Number(top.count) || 0));
  // top.ratio is count/wrongs — treat as ratioOfErrors; derive errors from ratio when possible
  const ratioAmongWrongs = Number(top.ratio) || 0;
  const totalErrors =
    ratioAmongWrongs > 0 ? Math.max(count, Math.round(count / ratioAmongWrongs)) : count;
  return resolveFactualRecurrenceLevel({
    count,
    totalQuestions: q,
    totalErrors,
  });
}

export { resolveFactualRecurrenceLevel };
