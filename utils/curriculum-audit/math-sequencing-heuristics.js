/**
 * Advisory Math sequencing flags (Phase 4B-1 / 4B-2). Not syllabus certification.
 */

/**
 * @param {object} invRecord inventory row (topic, subtopic, gradeMin, difficulty, …)
 * @param {string} normKey normalized topic key
 * @returns {Array<{ code: string, severity: string, note: string }>}
 */
export function mathSequencingSuspicions(invRecord, normKey) {
  const gmin = Number(invRecord.gradeMin);
  const g = Number.isFinite(gmin) ? gmin : null;
  /** @type {Array<{ code: string, severity: string, note: string }>} */
  const flags = [];
  if (!Number.isFinite(g) || g < 1 || g > 6) return flags;

  const diff = String(invRecord.difficulty || "").toLowerCase();
  const isHard = diff.includes("hard");
  const topic = String(invRecord.topic || "").toLowerCase();
  const sub = String(invRecord.subtopic || "").toLowerCase();

  if (normKey.includes("percentages") && g <= 4) {
    flags.push({
      code: "percentages_possibly_early",
      severity: "review",
      note: "אחוזים לפני כיתות העליונות - לאמת מול מסמך הכיתה והוראת המוסד.",
    });
  }
  // Grade 3 decimal work is common in programmes; flag only grades 1–2 unless inventory is refreshed.
  if (normKey.includes("decimals") && g <= 2) {
    flags.push({
      code: "decimals_possibly_early",
      severity: "review",
      note: "עשרוניים בכיתות א׳–ב׳ - לוודא מול תוכנית הכיתה (בדגימות ישנות ייתכן נושא לא מעודכן).",
    });
  }
  const introUnitFracKind =
    sub === "frac_half" ||
    sub === "frac_half_reverse" ||
    sub === "frac_quarter" ||
    sub === "frac_quarter_reverse";
  if (normKey.includes("fractions") && g <= 2 && !introUnitFracKind) {
    flags.push({
      code: "fractions_depth_unclear_low_grade",
      severity: "review",
      note: "שברים בכיתה א׳–ב׳ - בדוק עומק צפוי לפי מסמך הכיתה.",
    });
  }
  if (
    (normKey.includes("multiplication_division") || topic.includes("division")) &&
    (sub.includes("remainder") || topic.includes("remainder")) &&
    g <= 2
  ) {
    flags.push({
      code: "division_with_remainder_possibly_early",
      severity: "review",
      note: "חילוק עם שארית בכיתות נמוכות - לאמת רצף.",
    });
  }
  const simpleMissingNumberEq = sub === "eq_add_simple" || sub === "eq_sub_simple";
  /** Order-of-operations kinds share `equations_and_expressions` with formal algebra but grade 3+ placement is typically appropriate. */
  const isOrderOfOperationsKind =
    topic.includes("order_of_operations") || /^order_/.test(sub);
  if (normKey.includes("equations_and_expressions") && g <= 3) {
    if (isOrderOfOperationsKind && g >= 3) {
      // no flag — not “algebra too early”; differs from formal unknown-x equations
    } else if (simpleMissingNumberEq) {
      flags.push({
        code: "missing_number_intro_review",
        severity: "review",
        note: "איזון קצר / מספר חסר בטרום אלגברה - לא משוואות פורמליות; לאמת מול המוסד רק אם נדרש.",
      });
    } else {
      flags.push({
        code: "equations_expressions_possibly_early",
        severity: "review",
        note: "משוואות/ביטויים מוקדם - השווה למסמך הכיתה.",
      });
    }
  }
  /** Harness samples every difficulty label; early single-step story kinds stay simple even when labelled hard. */
  const earlySimpleWordProblemKind = new Set([
    "wp_simple_add",
    "wp_simple_add_g2",
    "wp_simple_sub",
    "wp_simple_sub_g2",
    "wp_pocket_money",
    "wp_pocket_money_g2",
    "wp_coins",
    "wp_coins_spent",
    "wp_time_days",
    "wp_time_date",
    "wp_division_simple",
    "wp_groups_g2",
  ]);
  if (normKey.includes("word_problems") && isHard && g <= 2 && !earlySimpleWordProblemKind.has(sub)) {
    flags.push({
      code: "word_problem_difficulty_mismatch_low_grade",
      severity: "review",
      note: "שאלה מילולית מסומנת קשה בכיתה נמוכה - לבדוק התאמת קושי.",
    });
  }
  if (normKey.includes("powers_and_scaling") && g <= 3) {
    flags.push({
      code: "powers_scaling_possibly_early",
      severity: "review",
      note: "חזקות/קנה מידה - לאמת מול תוכנית הכיתה.",
    });
  }
  if (normKey.includes("ratio_and_scale") && g <= 3) {
    flags.push({
      code: "ratio_scale_possibly_early",
      severity: "review",
      note: "יחס וקנה מידה בכיתות נמוכות - לאמת.",
    });
  }
  /** Generator emits formal divisibility stems from grade 3; grade-2 rows are legacy until inventory rescan. */
  if (normKey.includes("divisibility_factors") && g === 2) {
    flags.push({
      code: "divisibility_factors_grade2_inventory_review",
      severity: "review",
      note: "כיתה ב׳: הגנרטור לא משגר סימני התחלקות פורמליים; לרענן דגימות מאגר או לאמת שורות סטטיות ישנות.",
    });
  }

  return flags;
}
