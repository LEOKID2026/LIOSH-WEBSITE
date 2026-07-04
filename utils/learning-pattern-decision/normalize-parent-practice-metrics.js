/**
 * Normalize parent-visible practice counts for LPD (questions / correct / wrong / accuracy).
 * Reconciles inconsistent row fields so q=10, acc=20% never behaves like q=10, wrong=0.
 */

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {Record<string, unknown>|null|undefined} [unit]
 */
export function normalizeParentPracticeMetrics(row = {}, unit = null) {
  const q = Math.max(
    0,
    Number(row?.questions ?? row?.answers ?? unit?.questions ?? unit?.answers) || 0,
  );
  let c = Math.max(0, Number(row?.correct ?? unit?.correct) || 0);
  const accRaw = Number(row?.accuracy ?? unit?.accuracy);
  let accuracy = Number.isFinite(accRaw) ? accRaw : q > 0 ? (c / q) * 100 : 0;

  const wrongRaw = Number(row?.wrong ?? unit?.wrong);
  let w =
    Number.isFinite(wrongRaw) && wrongRaw >= 0 ? Math.max(0, Math.floor(wrongRaw)) : NaN;

  if (q > 0) {
    const correctFromAcc = Math.max(0, Math.min(q, Math.round((q * Math.min(100, accuracy)) / 100)));
    const wrongFromAcc = Math.max(0, q - correctFromAcc);

    if (!Number.isFinite(w) || w + c > q) {
      w = Math.max(0, q - c);
    }

    if (w === 0 && wrongFromAcc >= 2 && accuracy < 70) {
      w = wrongFromAcc;
      if (c > q - w) c = Math.max(0, q - w);
    }

    if (c + w !== q && wrongFromAcc + correctFromAcc === q) {
      c = correctFromAcc;
      w = wrongFromAcc;
    }

    if (c + w > q) c = Math.max(0, q - w);
    if (c + w < q && w === 0 && accuracy < 70) w = Math.max(0, q - c);
  }

  c = Math.min(c, q);
  w = Math.min(w, Math.max(0, q - c));
  accuracy = q > 0 ? (c / q) * 100 : Number.isFinite(accRaw) ? accRaw : 0;

  return {
    questions: q,
    correct: c,
    wrong: w,
    accuracy,
  };
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape|null|undefined} lpd
 * @param {{ questions: number, correct: number, wrong: number, accuracy: number }} metrics
 */
export function lpdFindingNeedsRebuild(lpd, metrics) {
  if (!lpd || typeof lpd !== "object") return true;

  const q = metrics.questions;
  const w = metrics.wrong;
  const acc = metrics.accuracy;
  const ts = String(lpd.topicStatus || "");
  const ft = String(lpd.findingType || "");
  const finding = String(lpd.parentVisibleFinding || "").trim();

  if (q <= 0) return false;

  if (
    Number(lpd.practicedQuestions) !== q ||
    Number(lpd.correctCount) !== metrics.correct ||
    Number(lpd.wrongCount) !== w
  ) {
    return true;
  }

  if (q <= 2) return ts !== "initial_data" || ft !== "initial_topic_data";

  if (q > 2 && (ts === "initial_data" || ft === "initial_topic_data")) return true;

  const clearDifficulty = q >= 5 && w >= 2 && acc < 70;
  const clearStrength = q >= 5 && acc >= 80 && w === 0;

  if (clearDifficulty) {
    if (ts === "no_clear_pattern" || ft === "none" || ts === "positive_observed") return true;
    if (!finding) return true;
    if (ft === "initial_topic_data") return true;
  }

  if (ts === "no_clear_pattern" && q >= 5 && !clearStrength) return true;

  return false;
}
