/**
 * Subject-agnostic repeated mistake pattern detection from wrong events.
 * Priority: patternFamily → subtype+kind → kind → conceptTag → topicOrOperation
 */
import { mistakePatternClusterKey } from "../mistake-event.js";

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
 * @param {import("../mistake-event.js").MistakeEventV1} ev
 * @param {string} key
 */
function patternLabelFromEvent(ev, key) {
  if (ev?.patternFamily) return String(ev.patternFamily);
  if (ev?.subtype) return String(ev.subtype);
  if (ev?.kind) return String(ev.kind);
  if (key.startsWith("pf:")) return key.slice(3);
  return "";
}

/**
 * @param {{ key: string, count: number, ratio: number, label: string }[]} patterns
 * @param {number} questionCount
 * @returns {"none"|"observed"|"repeated"|"consistent"|"strong"}
 */
export function resolveObservedPatternLevelFromPatterns(patterns, questionCount) {
  const q = Math.max(0, Number(questionCount) || 0);
  if (!patterns.length || q === 0) return "none";
  const top = patterns[0];
  if (q >= 40 && top.ratio >= 0.5) return "strong";
  if (q >= 12 && top.ratio >= 0.4) return "consistent";
  if (q >= 5 && top.count >= 2) return "repeated";
  if (top.count >= 2) return "observed";
  return "none";
}
