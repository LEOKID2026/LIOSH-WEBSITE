/**
 * Compose parent-facing finding text: topic-state sentence + factual observations.
 * Works for all engineDecision values including mastery_stable / partial_stable.
 * Does not write into detectedPattern / blockPatternClaim.
 */
import {
  formatFactualObservationSentenceHe,
} from "./build-factual-observations.js";
import {
  parentFacingErrorPatternLabelHe,
  isApprovedFactualObservationTag,
} from "./parent-facing-error-pattern-he.js";

/**
 * Topic-state base sentence (without observations).
 * @param {object} p
 * @param {string} p.topicName
 * @param {string} p.engineDecision
 * @param {number} p.questions
 * @param {number} p.wrong
 * @param {number} p.accuracy
 */
export function topicStateFindingBaseHe(p) {
  const name = String(p.topicName || "הנושא").trim() || "הנושא";
  const q = Math.max(0, Math.floor(Number(p.questions) || 0));
  const wrong = Math.max(0, Math.floor(Number(p.wrong) || 0));
  const acc = Math.round(Number(p.accuracy) || 0);
  const decision = String(p.engineDecision || "");
  const suffix = q > 0 ? ` מבוסס על ${q} שאלות שנפתרו בנושא.` : "";

  if (q <= 0) return "";

  if (decision === "clear_topic_gap") {
    return `בנושא ${name} נראה קושי ברור.${wrong > 0 && q > 0 ? ` ${wrong} שגיאות מתוך ${q} שאלות (${acc}% דיוק).` : ""} כדאי לחזור ולתרגל את הנושא לפני שממשיכים.${suffix}`;
  }
  if (decision === "topic_needs_strengthening") {
    return `בנושא ${name} יש חלק שדורש חיזוק (${q} שאלות, ${acc}% דיוק). כדאי חיזוק ממוקד.${suffix}`;
  }
  if (decision === "partial_stable") {
    return `יש הבנה חלקית בנושא ${name}.${suffix}`;
  }
  if (decision === "mastery_stable") {
    return `נראית שליטה יציבה בנושא ${name}.${suffix}`;
  }
  if (decision === "early_direction_only") {
    if (q <= 4) return `בנושא ${name} יש כיוון ראשוני בלבד.${suffix}`;
    return `בנושא ${name} נראית הצלחה טובה, אך עדיין מוקדם לקבוע שליטה יציבה.${suffix}`;
  }
  if (decision === "insufficient_data") {
    return `עדיין אין מספיק מידע בנושא ${name}.${suffix}`;
  }
  if (decision === "speed_pressure_pattern") {
    return `בנושא ${name} חלק מהטעויות הופיעו בעבודה מהירה.${suffix}`;
  }
  return String(p.existingFinding || "").trim();
}

/**
 * Integrate factual observation sentences with topic-state finding.
 * Positive accuracy never suppresses observations.
 *
 * @param {object} p
 * @param {string} [p.finding] existing finding (optional)
 * @param {string} p.topicName
 * @param {string} p.engineDecision
 * @param {number} p.questions
 * @param {number} p.wrong
 * @param {number} p.accuracy
 * @param {object[]} p.factualObservations
 */
export function composeParentFindingWithFactualObservations(p) {
  const observations = Array.isArray(p.factualObservations) ? p.factualObservations : [];
  const obsSentences = observations
    .map((o) => formatFactualObservationSentenceHe(o))
    .filter(Boolean);

  const decision = String(p.engineDecision || "");
  const q = Math.max(0, Math.floor(Number(p.questions) || 0));
  const name = String(p.topicName || "הנושא").trim() || "הנושא";
  const suffix = q > 0 ? ` מבוסס על ${q} שאלות שנפתרו בנושא.` : "";

  // Prefer composed base + observations for positive / gap states
  if (decision === "mastery_stable" && obsSentences.length) {
    const first = obsSentences[0].replace(/\.$/, "");
    const rest = obsSentences.slice(1).join(" ");
    return `נראית הצלחה טובה ויציבה בנושא ${name}. לצד ההצלחה, ${first}.${rest ? ` ${rest}` : ""}${suffix}`.replace(
      /\.\./g,
      ".",
    );
  }

  if (decision === "partial_stable" && obsSentences.length) {
    const body = obsSentences.join(" ");
    return `יש הבנה חלקית בנושא ${name}. ${body}${suffix}`.replace(/\s+/g, " ").trim();
  }

  let base = String(p.finding || "").trim();
  // Prefer existing finding text when present; only rebuild if empty.
  if (!base) {
    base = topicStateFindingBaseHe({
      topicName: name,
      engineDecision: decision,
      questions: q,
      wrong: p.wrong,
      accuracy: p.accuracy,
      existingFinding: "",
    });
  }

  // Strip trailing suffix so we can re-append once after observations
  const baseCore = base.replace(/\s*מבוסס על \d+ שאלות שנפתרו בנושא\.?\s*$/u, "").trim();

  if (!obsSentences.length) {
    return base || baseCore;
  }

  // Avoid duplicating observation text already present
  const missing = obsSentences.filter((s) => {
    const labelMatch = s.match(/חזרה (.+)\.$|הופיעה (.+)\.$/);
    const label = labelMatch?.[1] || labelMatch?.[2] || "";
    return !label || !baseCore.includes(label);
  });

  if (!missing.length) return base;

  const combined = `${baseCore} ${missing.join(" ")}${suffix}`
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
  return combined;
}

/**
 * Backward-compatible wrapper used by buildLearningPatternDecision and older tests.
 * Always surfaces factual observations when labels exist — ignores old enrich gates.
 * Accepts either factualObservations[] or repeatedMistakePatterns[].
 */
export function enrichParentFindingWithConsistentStrongTag(p) {
  let observations = Array.isArray(p.factualObservations) ? [...p.factualObservations] : [];
  if (!observations.length && Array.isArray(p.repeatedMistakePatterns)) {
    const q = Math.max(0, Math.floor(Number(p.questions) || 0));
    const wrong = Math.max(
      0,
      Math.floor(
        Number(
          p.wrong != null
            ? p.wrong
            : p.repeatedMistakePatterns.reduce((s, x) => s + (Number(x.count) || 0), 0),
        ) || 0,
      ),
    );
    for (const pat of p.repeatedMistakePatterns) {
      const key = String(pat?.key || "");
      const canon = key.replace(/^(mt|pf|st|ct|k|to):/i, "");
      if (!isApprovedFactualObservationTag(canon)) continue;
      const labelHe = parentFacingErrorPatternLabelHe(key);
      if (!labelHe) continue;
      const count = Math.max(0, Math.floor(Number(pat.count) || 0));
      if (count < 1) continue;
      observations.push({
        key,
        canonicalKey: canon,
        labelHe,
        count,
        totalQuestions: q,
        totalErrors: wrong || count,
        ratioOfQuestions: q > 0 ? count / q : 0,
        ratioOfErrors: (wrong || count) > 0 ? count / (wrong || count) : 0,
        distinctSessions: 0,
        distinctDays: 0,
        firstSeenAt: null,
        lastSeenAt: null,
        recurrenceLevel: "repeated",
      });
    }
  }
  return composeParentFindingWithFactualObservations({
    finding: p.finding,
    topicName: p.topicName,
    engineDecision: p.engineDecision,
    questions: p.questions,
    wrong: p.wrong,
    accuracy: p.accuracy,
    factualObservations: observations,
  });
}
