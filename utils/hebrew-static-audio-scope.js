/**
 * Hebrew static audio — first pass envelope (Core v1).
 * g1–g2 × reading/comprehension × listen_and_choose | oral_comprehension_mcq | phonological_discrimination_he (קריאה g1–g2 בלבד במצורף)
 * קבצי שמע נוצרים לפי hash על `narration_plaintext` - ראו `hebrew-audio-narration-binding.js` ו `/api/hebrew-audio-ensure`.
 */

/** @type {ReadonlySet<string>} */
export const HE_STATIC_CORE_V1_GRADES = new Set(["g1", "g2"]);

/** @type {ReadonlySet<string>} */
export const HE_STATIC_CORE_V1_TOPICS = new Set(["reading", "comprehension"]);

/** @type {ReadonlySet<string>} */
export const HE_STATIC_CORE_V1_MODES = new Set([
  "listen_and_choose",
  "oral_comprehension_mcq",
  "phonological_discrimination_he",
]);

/**
 * @param {{ gradeKey: string, topic: string, task_mode: string }} opts
 */
export function isHebrewStaticCoreV1FirstPass(opts) {
  const g = String(opts.gradeKey || "").toLowerCase();
  const t = String(opts.topic || "");
  const m = String(opts.task_mode || "");
  return HE_STATIC_CORE_V1_GRADES.has(g) && HE_STATIC_CORE_V1_TOPICS.has(t) && HE_STATIC_CORE_V1_MODES.has(m);
}
