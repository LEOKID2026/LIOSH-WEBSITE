/**
 * Canonical parent-visible practice metrics (questions / correct / wrong / accuracy).
 * Single source of truth for all parent-facing report surfaces.
 */

/** @typedef {"aggregate"|"derived_accuracy"|"derived_from_correct"|"derived_from_wrong"|"reconciled"|"embedded"|"empty"|"questions_only"} ParentMetricsSource */

/**
 * @typedef {{
 *   questions: number,
 *   correct: number,
 *   wrong: number,
 *   accuracy: number,
 *   source: ParentMetricsSource,
 *   canShowCorrectWrongBreakdown: boolean,
 *   trace: string[],
 * }} ParentVisibleMetrics
 */

/**
 * @param {...unknown} values
 * @returns {number|undefined}
 */
function pickDefinedCount(...values) {
  for (const v of values) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) continue;
    return Math.floor(n);
  }
  return undefined;
}

/**
 * @param {Record<string, unknown>|null|undefined} raw
 * @param {Record<string, unknown>|null|undefined} [unit]
 */
function readQuestions(raw, unit) {
  return Math.max(
    0,
    Math.floor(
      Number(
        raw?.questions ??
          raw?.answers ??
          raw?.questionCount ??
          raw?.practicedQuestions ??
          unit?.questions ??
          unit?.answers ??
          unit?.total,
      ) || 0,
    ),
  );
}

/**
 * @param {ParentVisibleMetrics} metrics
 */
export function parentVisibleMetricsContradiction(metrics) {
  const q = metrics.questions;
  if (q <= 0) return false;
  if (metrics.correct + metrics.wrong !== q) return true;
  if (metrics.correct === 0 && metrics.wrong === q && metrics.accuracy > 0) return true;
  const accFromCounts = Math.round((metrics.correct / q) * 100);
  if (Math.abs(accFromCounts - metrics.accuracy) > 1 && metrics.source === "aggregate") return true;
  return false;
}

/**
 * @param {ParentVisibleMetrics} metrics
 */
export function isForbiddenZeroCorrectAllWrongCopy(metrics) {
  return (
    metrics.questions > 0 &&
    metrics.correct === 0 &&
    metrics.wrong === metrics.questions &&
    metrics.accuracy > 0
  );
}

/**
 * @param {Record<string, unknown>|null|undefined} raw
 * @param {Record<string, unknown>|null|undefined} [unit]
 * @returns {ParentVisibleMetrics}
 */
export function normalizeParentVisibleMetrics(raw = {}, unit = null) {
  /** @type {string[]} */
  const trace = [];

  const pre = raw?.parentVisibleMetrics;
  if (pre && typeof pre === "object" && !Array.isArray(pre)) {
    const embedded = normalizeParentVisibleMetrics(
      {
        questions: pre.questions,
        correct: pre.correct,
        wrong: pre.wrong,
        accuracy: pre.accuracy,
      },
      null,
    );
    if (!parentVisibleMetricsContradiction(embedded)) {
      return {
        ...embedded,
        source: /** @type {ParentMetricsSource} */ (pre.source || "embedded"),
        trace: [...(Array.isArray(pre.trace) ? pre.trace : []), "embedded"],
      };
    }
    trace.push("embedded:contradiction_rebuild");
  }

  const q = readQuestions(raw, unit);
  const accInput = Number(raw?.accuracy ?? unit?.accuracy);
  const hasAccInput = Number.isFinite(accInput);

  if (q <= 0) {
    return {
      questions: 0,
      correct: 0,
      wrong: 0,
      accuracy: hasAccInput ? Math.round(accInput) : 0,
      source: "empty",
      canShowCorrectWrongBreakdown: false,
      trace,
    };
  }

  let c = pickDefinedCount(raw?.correct, raw?.correctCount, unit?.correct);
  let w = pickDefinedCount(raw?.wrong, raw?.wrongCount, unit?.wrong);
  /** @type {ParentMetricsSource} */
  let source = "aggregate";

  if (c !== undefined && w !== undefined) {
    c = Math.min(c, q);
    w = Math.min(w, q);
    if (c + w !== q) {
      trace.push("reconcile:counts_to_q");
      if (hasAccInput) {
        const cAcc = Math.max(0, Math.min(q, Math.round((q * accInput) / 100)));
        c = cAcc;
        w = q - cAcc;
        source = "reconciled";
      } else if (w <= q) {
        c = Math.max(0, q - w);
      } else {
        w = Math.max(0, q - c);
        c = q - w;
      }
    }
  } else if (c === undefined && w === undefined && hasAccInput) {
    c = Math.max(0, Math.min(q, Math.round((q * accInput) / 100)));
    w = q - c;
    source = "derived_accuracy";
    trace.push("derive:accuracy");
  } else if (c === undefined && w !== undefined) {
    w = Math.min(w, q);
    c = q - w;
    source = "derived_from_wrong";
    trace.push("derive:from_wrong");
  } else if (w === undefined && c !== undefined) {
    c = Math.min(c, q);
    w = q - c;
    source = "derived_from_correct";
    trace.push("derive:from_correct");
  } else {
    c = 0;
    w = 0;
    source = "questions_only";
    trace.push("missing:counts_and_accuracy");
  }

  if (c === 0 && w === q && hasAccInput && accInput > 0) {
    c = Math.max(0, Math.min(q, Math.round((q * accInput) / 100)));
    w = q - c;
    source = "derived_accuracy";
    trace.push("fix:zero_correct_with_positive_accuracy");
  }

  c = Math.max(0, Math.min(c, q));
  w = Math.max(0, Math.min(w, q - c));
  if (c + w !== q) {
    w = q - c;
    trace.push("reconcile:final_sum");
  }

  const accuracy =
    q > 0
      ? Math.round((c / q) * 100)
      : hasAccInput
        ? Math.round(accInput)
        : 0;

  /** @type {ParentVisibleMetrics} */
  const out = {
    questions: q,
    correct: c,
    wrong: w,
    accuracy,
    source,
    canShowCorrectWrongBreakdown: source !== "questions_only",
    trace,
  };

  if (parentVisibleMetricsContradiction(out)) {
    out.canShowCorrectWrongBreakdown = false;
    trace.push("contradiction:suppress_breakdown");
  }
  if (isForbiddenZeroCorrectAllWrongCopy(out)) {
    out.canShowCorrectWrongBreakdown = false;
    trace.push("forbidden:zero_correct_all_wrong");
  }

  out.trace = trace;
  return out;
}

/**
 * Public Hebrew count-pluralization helpers — single source of truth for
 * "N שאלות/תשובות" style phrases anywhere in the parent report engine or
 * renderers. Every surface MUST reuse these instead of inline `${q} שאלות`
 * interpolation, which breaks Hebrew grammar at q=1 / wrong=1 ("1 שאלות").
 * @param {ParentVisibleMetrics} metrics
 * @param {string} topicName
 */
export function formatQuestionsTextHe(n) {
  const q = Math.max(0, Math.round(Number(n) || 0));
  if (q === 1) return "שאלה אחת";
  return `${q} שאלות`;
}

export function formatCorrectTextHe(n) {
  const c = Math.max(0, Math.round(Number(n) || 0));
  if (c === 1) return "תשובה אחת נכונה";
  return `${c} תשובות נכונות`;
}

export function formatWrongTextHe(n) {
  const w = Math.max(0, Math.round(Number(n) || 0));
  if (w === 1) return "תשובה אחת שגויה";
  return `${w} תשובות שגויות`;
}

/**
 * "N שגיאות מתוך M שאלות" style phrase used by engine-decision copy.
 * Uses "שגיאה/שגיאות" (mistake/mistakes), not "שגויה/שגויות" (wrong-fem.
 * adjective without a noun, which is not standalone-grammatical in Hebrew).
 * Does not touch the unrelated, pre-existing `formatWrongTextHe` wording
 * ("תשובה שגויה" / "תשובות שגויות"), which is untouched by this fix.
 */
export function formatWrongOfQuestionsTextHe(w, q) {
  const wrong = Math.max(0, Math.round(Number(w) || 0));
  const questions = Math.max(0, Math.round(Number(q) || 0));
  const wrongText = wrong === 1 ? "שגיאה אחת" : `${wrong} שגיאות`;
  return `${wrongText} מתוך ${formatQuestionsTextHe(questions)}`;
}

/** "פתר N שאלות" style phrase (verb-first) used by topic-decision copy. */
export function formatSolvedQuestionsTextHe(n) {
  const q = Math.max(0, Math.round(Number(n) || 0));
  if (q === 1) return "פתר שאלה אחת";
  return `פתר ${q} שאלות`;
}

/**
 * SINGLE canonical parent-facing sentence for the `speed_pressure_pattern` engine
 * decision. Every surface that renders this decisionKey MUST call this function
 * instead of writing its own wording (product-owner-approved copy — do not edit
 * without explicit approval). This decision must never be presented as proof that
 * the problem is speed, nor as proof of a knowledge gap — it only flags a pattern
 * worth double-checking without a time limit.
 * @param {{ topicName: string, wrong: number, questions: number, accuracy: number }} p
 */
export function buildSpeedPressurePatternFindingHe({ topicName, wrong, questions, accuracy }) {
  const name = String(topicName || "הנושא").trim() || "הנושא";
  const acc = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 0)));
  return (
    `בנושא ${name}, בתרגול המהיר נרשמו ${formatWrongOfQuestionsTextHe(wrong, questions)} (${acc}% דיוק). ` +
    "כדאי לבדוק את הנושא גם בתרגול ללא הגבלת זמן, לפני שמחליטים אם נדרש חיזוק בידע."
  );
}

function hasReliableAccuracyHe(metrics) {
  const q = Math.max(0, Math.round(Number(metrics?.questions) || 0));
  if (q <= 0) return false;
  const acc = Math.round(Number(metrics?.accuracy) || 0);
  const c = Math.max(0, Math.round(Number(metrics?.correct) || 0));
  const w = Math.max(0, Math.round(Number(metrics?.wrong) || 0));
  if (acc <= 0 && c === 0 && w === q) return false;
  return Number.isFinite(acc);
}

export function buildParentMetricsDataLineHe(metrics, topicName) {
  const q = metrics.questions;
  const topic = String(topicName || "הנושא").trim() || "הנושא";
  const acc = metrics.accuracy;

  if (q <= 0) return "";

  const qText = formatQuestionsTextHe(q);

  if (metrics.canShowCorrectWrongBreakdown) {
    const { correct: c, wrong: w } = metrics;
    let line = `הנתונים: נפתרו ${qText} בנושא ${topic}, מתוכן ${formatCorrectTextHe(c)} ו-${formatWrongTextHe(w)}.`;
    if (hasReliableAccuracyHe(metrics) && acc > 0) {
      line += ` הדיוק הוא ${acc}%.`;
    }
    return line;
  }

  if (hasReliableAccuracyHe(metrics) && acc > 0) {
    return `הנתונים: נפתרו ${qText} בנושא ${topic}, והדיוק הוא ${acc}%.`;
  }
  return `הנתונים: נפתרו ${qText} בנושא ${topic}.`;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {Record<string, unknown>|null|undefined} [unit]
 * @returns {ParentVisibleMetrics}
 */
export function normalizeParentPracticeMetrics(row = {}, unit = null) {
  return normalizeParentVisibleMetrics(row, unit);
}

/**
 * @param {import("./schema.js").LearningPatternDecisionShape|null|undefined} lpd
 * @param {ParentVisibleMetrics} metrics
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
