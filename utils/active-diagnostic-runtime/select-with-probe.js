import { bankQuestionProbeMatch } from "./probe-match.js";
import { str } from "./str-utils.js";

/**
 * @param {object} p
 * @param {Record<string, unknown>[]} p.items — eligible pool (already filtered by grade/topic where applicable)
 * @param {import("./build-pending-probe.js").PendingDiagnosticProbe|null} p.pendingProbe
 * @param {Set<string>|string[]} p.recentIds — ids or keys to avoid repeating
 * @param {string} p.currentTopic - "mixed" or concrete topic id
 * @param {() => Record<string, unknown>|null|undefined} p.fallbackPick
 * @param {() => number} [p.randomFn]
 * @param {(item: Record<string, unknown>) => string} [p.getItemTopic] - defaults to `item.topic`
 * @param {(item: Record<string, unknown>) => string} [p.getItemId] - defaults to `item.id`
 */
export function selectQuestionWithProbe({
  items,
  pendingProbe,
  recentIds,
  currentTopic,
  fallbackPick,
  randomFn = Math.random,
  getItemTopic = (q) => str(q.topic),
  getItemId = (q) => str(q.id),
}) {
  const recentSet =
    recentIds instanceof Set ? recentIds : new Set(Array.isArray(recentIds) ? recentIds : []);

  if (!pendingProbe || pendingProbe.expiresAfterQuestions <= 0) {
    const fb = fallbackPick();
    return {
      question: fb,
      usedProbe: false,
      reason: "no_active_probe",
    };
  }

  const inTopicScope = (q) => {
    if (currentTopic !== "mixed") return true;
    return getItemTopic(q) === str(pendingProbe.topicId);
  };

  /** @type {{ q: Record<string, unknown>, reason: string }[]} */
  const matched = [];
  for (const q of items || []) {
    if (!inTopicScope(q)) continue;
    const m = bankQuestionProbeMatch(q, pendingProbe);
    if (m.matches) matched.push({ q, reason: m.reason });
  }

  if (matched.length === 0) {
    const fb = fallbackPick();
    return { question: fb, usedProbe: false, reason: "fallback_no_match" };
  }

  let candidates = matched.map((x) => x.q);
  const avoidKey =
    pendingProbe.wrongAvoidKey != null && pendingProbe.wrongAvoidKey !== ""
      ? String(pendingProbe.wrongAvoidKey)
      : pendingProbe.wrongQuestionId != null && pendingProbe.wrongQuestionId !== ""
        ? String(pendingProbe.wrongQuestionId)
        : "";
  if (avoidKey) {
    const nonWrong = candidates.filter((q) => str(getItemId(q)) !== avoidKey);
    if (nonWrong.length > 0) candidates = nonWrong;
  }

  let pickPool = candidates.filter((q) => !recentSet.has(str(getItemId(q))));
  if (pickPool.length === 0) pickPool = candidates;

  const idx = Math.floor(randomFn() * pickPool.length);
  const question = pickPool[idx];
  const reasonRow = matched.find((x) => str(getItemId(x.q)) === str(getItemId(question)));
  return {
    question,
    usedProbe: true,
    reason: reasonRow?.reason || "matched",
  };
}
