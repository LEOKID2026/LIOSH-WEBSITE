/**
 * Parent-facing grade-context labels and copy (display only).
 * Consumes pre-computed gradeRelation — never computes grades.
 */

/** @param {string|null|undefined} gradeRelation */
export function gradeContextShortLabelHe(gradeRelation) {
  const rel = String(gradeRelation || "").trim();
  if (rel === "higher") return "תרגול מתקדם";
  if (rel === "lower") return "יסודות קודמים";
  return "";
}

/**
 * @param {{ gradeRelation?: string|null, isStrength?: boolean, needsSupport?: boolean }} args
 */
export function gradeContextExplanationHe(args) {
  const rel = String(args?.gradeRelation || "").trim();
  const isStrength = args?.isStrength === true;
  const needsSupport = args?.needsSupport === true;

  if (rel === "higher") {
    if (isStrength) return "הילד מתמודד יפה עם חומר מתקדם.";
    if (needsSupport) {
      return "זהו חומר מתקדם מעל הכיתה הרשומה, ולכן כדאי להתקדם בו בהדרגה.";
    }
    return "זהו חומר מתקדם מעל הכיתה הרשומה, ולכן כדאי להתקדם בו בהדרגה.";
  }

  if (rel === "lower") {
    if (isStrength) return "יסודות קודמים נראים יציבים.";
    if (needsSupport) return "כדאי לחזור על יסודות מכיתות קודמות.";
    return "התרגול בוצע מתחת לכיתה הרשומה - כדאי לקרוא את התוצאה כתמונת בסיס.";
  }

  return "";
}

/**
 * @param {{ gradeRelation?: string|null, isStrength?: boolean, needsSupport?: boolean }} args
 */
export function gradeContextActionHe(args) {
  const rel = String(args?.gradeRelation || "").trim();
  const isStrength = args?.isStrength === true;

  if (rel === "higher") {
    return isStrength
      ? "אפשר להמשיך בהדרגה, אחרי שמוודאים שהחומר של הכיתה הרשומה יציב."
      : "אפשר להמשיך בהדרגה, אחרי שמוודאים שהחומר של הכיתה הרשומה יציב.";
  }

  if (rel === "lower") {
    return "לתרגל כמה שאלות קצרות של יסודות קודמים לפני שממשיכים קדימה.";
  }

  return "";
}

/**
 * @param {string|null|undefined} gradeRelation
 * @param {number} accuracy
 */
export function gradeContextNeedsSupport(gradeRelation, accuracy) {
  const rel = String(gradeRelation || "").trim();
  const acc = Number(accuracy) || 0;
  if (rel === "higher" || rel === "lower") return acc < 72;
  return acc < 55;
}

/**
 * @param {string|null|undefined} gradeRelation
 * @param {number} accuracy
 * @param {number} questions
 */
export function gradeContextIsStrength(gradeRelation, accuracy, questions) {
  const rel = String(gradeRelation || "").trim();
  const acc = Number(accuracy) || 0;
  const q = Number(questions) || 0;
  if (rel === "higher") return acc >= 78 && q >= 8;
  if (rel === "lower") return acc >= 85 && q >= 10;
  return acc >= 90 && q >= 10;
}

/**
 * Map base tier to grade-aware tier for parent display.
 * @param {string} baseTier
 * @param {string|null|undefined} gradeRelation
 * @param {number} questions
 */
export function resolveGradeAwareParentTopicTier(baseTier, gradeRelation, questions) {
  const rel = String(gradeRelation || "").trim();
  const q = Number(questions) || 0;
  if (q <= 0) return baseTier;
  if (rel === "higher") {
    if (baseTier === "low_evidence" && q < 12) return baseTier;
    return "advanced_practice";
  }
  if (rel === "lower") {
    if (baseTier === "low_evidence" && q < 12) return baseTier;
    return "foundation_practice";
  }
  return baseTier;
}

/**
 * @param {string|null|undefined} gradeRelation
 * @param {string} labelHe
 */
export function resolveGradeAwareRecommendationStepLabelHe(gradeRelation, labelHe) {
  const rel = String(gradeRelation || "").trim();
  const raw = String(labelHe || "").trim();
  if (!rel || rel === "same" || rel === "unknown") return raw;
  if (rel === "higher") return gradeContextShortLabelHe(rel);
  if (rel === "lower") return gradeContextShortLabelHe(rel);
  return raw;
}

/**
 * Returns true when standard strengthen/gap copy must not be shown.
 * @param {string|null|undefined} gradeRelation
 */
export function suppressRegisteredGradeStrengthenCopy(gradeRelation) {
  const rel = String(gradeRelation || "").trim();
  return rel === "higher" || rel === "lower";
}
