/**
 * Grade-relation cert scenarios 17–23.
 */

import { RECOMMENDED_NEXT_STEP } from "../../../../../utils/diagnostic-engine-v3/next-action-v3.js";
import { result, whenDe2Unit, whenV3Field } from "./evaluators.mjs";
import { runGradeRelationScenario, relationMatchesAlias } from "./grade-relation-runner.mjs";

const STU_G6 = { id: "cert-g6", full_name: "ילד כיתה ו", grade_level: "g6", is_active: true };
const STU_G3 = { id: "cert-g3", full_name: "ילד כיתה ג", grade_level: "g3", is_active: true };
const STU_G4 = { id: "cert-g4", full_name: "ילד כיתה ד", grade_level: "g4", is_active: true };

/**
 * Shared checks for grade-relation engine scenarios.
 * @param {object} ctx
 * @param {object} opts
 */
function baseGradeChecks(ctx, opts) {
  const acc = Number(ctx.gradeSlice?.accuracy ?? ctx.topicRow?.accuracy ?? 0);
  const checks = [
    result(
      "not_blocked",
      "לא חסום — diagnosticAnswers>0",
      ctx.diagnosticAnswers > 0,
      `diagnosticAnswers=${ctx.diagnosticAnswers}`,
      "agg",
    ),
    result(
      "de2_output",
      "DE2: diagnostic output קיים",
      Array.isArray(ctx.de2?.units) && ctx.de2.units.length > 0,
      `units=${ctx.de2?.units?.length ?? 0}`,
      "de2",
    ),
    result(
      "v3_rollups",
      "V3: rollups קיימים",
      Array.isArray(ctx.rollups) && ctx.rollups.length > 0,
      `rollups=${ctx.rollups?.length ?? 0}`,
      "v3",
    ),
    result(
      "grade_relation",
      `gradeRelation ~ ${opts.relationAlias}`,
      relationMatchesAlias(opts.relationAlias, ctx.relation),
      `relation=${ctx.relation}, scope=${ctx.scope}`,
      "de2",
    ),
    result(
      "caveat_subline",
      "caveat/subline grade relation",
      Boolean(ctx.subline) || Boolean(ctx.caveat),
      `subline=${ctx.subline || "—"}; caveat=${(ctx.caveat || "").slice(0, 60)}`,
      "de2",
    ),
  ];

  if (opts.expectFoundation) {
    checks.push(
      result(
        "foundation_scope",
        "foundation/prerequisite scope",
        ctx.scope === "prerequisite_foundation" || ctx.relation === "lower",
        `scope=${ctx.scope}`,
        "de2",
      ),
    );
  }

  if (opts.expectNoAdvance) {
    const v3Next = ctx.rollups?.[0]?.recommendedNextStep;
    checks.push(
      result(
        "no_advance_v3",
        "V3: לא advance_cautiously",
        v3Next !== RECOMMENDED_NEXT_STEP.ADVANCE,
        `next=${v3Next}`,
        "v3",
      ),
      whenDe2Unit(
        ctx.unit,
        "de2_no_excellent_advance",
        "DE2: לא positiveAuthorityLevel=excellent",
        (u) => u.outputGating?.positiveAuthorityLevel !== "excellent",
        "DE2 דירג mastery למרות קושי below-grade",
      ),
    );
  }

  if (opts.expectNotWeakness) {
    checks.push(
      result(
        "not_weakness_flag",
        "לא weakness — accuracy>=70 או needsPractice=false",
        acc >= 70 || ctx.topicRow?.needsPractice !== true,
        `accuracy=${acc}, needsPractice=${ctx.topicRow?.needsPractice}`,
        "de2",
      ),
      result(
        "below_grade_success_caveat",
        "caveat על תרגול מתחת לכיתה (בסיס/הצלחה)",
        Boolean(ctx.caveat && (ctx.caveat.includes("מתחת") || ctx.caveat.includes("בסיס"))),
        ctx.caveat || "—",
        "de2",
      ),
    );
  }

  if (opts.expectAboveGradeCaveat) {
    checks.push(
      result(
        "above_grade_caveat",
        "caveat: מעל הכיתה הרשומה",
        ctx.subline === "מעל הכיתה הרשומה" ||
          (ctx.caveat && ctx.caveat.includes("מעל")),
        `subline=${ctx.subline}`,
        "de2",
      ),
      result(
        "not_regular_grade_weakness",
        "לא מוצג כקושי בחומר כיתה רגילה (accuracy context)",
        ctx.relation === "higher" || ctx.scope === "enrichment_stretch",
        `scope=${ctx.scope}`,
        "de2",
      ),
    );
  }

  if (opts.expectEnrichment) {
    checks.push(
      result(
        "enrichment_scope",
        "advanced/enrichment signal",
        ctx.scope === "enrichment_stretch" || acc >= 85,
        `scope=${ctx.scope}, acc=${acc}`,
        "de2",
      ),
      result(
        "enrichment_caveat",
        "caveat enrichment / מעל כיתה",
        ctx.subline === "מעל הכיתה הרשומה" || Boolean(ctx.caveat),
        ctx.caveat || ctx.subline || "—",
        "de2",
      ),
    );
  }

  return checks;
}

/** @type {import("./scenarios.mjs").SCENARIO_DEFS extends infer _ ? object[] : never} */
export const GRADE_SCENARIO_DEFS = [
  {
    id: "17_g6_practice_g3_struggling",
    titleHe: "כיתה ו מתרגל ג ומתקשה",
    category: "grade-relation",
    run: () =>
      runGradeRelationScenario(STU_G6, {
        subject: "math",
        topic: "fractions",
        contentGrade: "g3",
        total: 12,
        correct: 3,
      }),
    checks: (ctx) =>
      baseGradeChecks(ctx, {
        relationAlias: "below_registered_grade",
        expectFoundation: true,
        expectNoAdvance: true,
      }),
  },
  {
    id: "18_g6_practice_g3_succeeding",
    titleHe: "כיתה ו מתרגל ג ומצליח",
    category: "grade-relation",
    run: () =>
      runGradeRelationScenario(STU_G6, {
        subject: "math",
        topic: "addition",
        contentGrade: "g3",
        total: 12,
        correct: 11,
      }),
    checks: (ctx) =>
      baseGradeChecks(ctx, {
        relationAlias: "below_registered_grade",
        expectNotWeakness: true,
      }),
  },
  {
    id: "19_g3_practice_g6_struggling",
    titleHe: "כיתה ג מתרגל ו ומתקשה",
    category: "grade-relation",
    run: () =>
      runGradeRelationScenario(STU_G3, {
        subject: "math",
        topic: "fractions",
        contentGrade: "g6",
        total: 12,
        correct: 3,
      }),
    checks: (ctx) =>
      baseGradeChecks(ctx, {
        relationAlias: "above_registered_grade",
        expectAboveGradeCaveat: true,
        expectNoAdvance: true,
      }),
  },
  {
    id: "20_g3_practice_g6_succeeding",
    titleHe: "כיתה ג מתרגל ו ומצליח",
    category: "grade-relation",
    run: () =>
      runGradeRelationScenario(STU_G3, {
        subject: "math",
        topic: "multiplication",
        contentGrade: "g6",
        total: 12,
        correct: 11,
      }),
    checks: (ctx) =>
      baseGradeChecks(ctx, {
        relationAlias: "above_registered_grade",
        expectEnrichment: true,
      }),
  },
  {
    id: "21_history_g4_student",
    titleHe: "היסטוריה לילד כיתה ד",
    category: "grade-relation",
    run: () =>
      runGradeRelationScenario(STU_G4, {
        subject: "history",
        topic: "rome_jews",
        contentGrade: "g6",
        total: 10,
        correct: 4,
      }),
    checks: (ctx) => [
      ...baseGradeChecks(ctx, {
        relationAlias: "outside_regular_grade_band",
        expectAboveGradeCaveat: true,
      }),
      result(
        "history_in_total",
        "history נספר ב-totalQuestions",
        Number(ctx.v2?.summary?.totalQuestions || 0) >= 10,
        `totalQuestions=${ctx.v2?.summary?.totalQuestions}`,
        "agg",
      ),
      result(
        "history_questions_consistent",
        "historyQuestions עקבי",
        Number(ctx.v2?.summary?.historyQuestions || 0) >= 10,
        `historyQuestions=${ctx.v2?.summary?.historyQuestions}`,
        "agg",
      ),
    ],
  },
  {
    id: "22_geography_g3_student",
    titleHe: "גיאוגרפיה לילד כיתה ג",
    category: "grade-relation",
    run: () =>
      runGradeRelationScenario(STU_G3, {
        subject: "moledet-geography",
        topic: "geography",
        contentGrade: "g5",
        total: 10,
        correct: 5,
      }),
    checks: (ctx) => [
      ...baseGradeChecks(ctx, {
        relationAlias: "above_registered_grade",
        expectAboveGradeCaveat: true,
      }),
      result(
        "geography_not_moledet",
        "מופיע כגיאוגרפיה, לא כמולדת",
        Object.keys(ctx.mgSplit?.geographyTopics || {}).length > 0 &&
          Object.keys(ctx.mgSplit?.moledetTopics || {}).length === 0,
        `geo=${Object.keys(ctx.mgSplit?.geographyTopics || {}).join(",")}; moledet=${Object.keys(ctx.mgSplit?.moledetTopics || {}).join(",")}`,
        "agg",
      ),
    ],
  },
  {
    id: "23_moledet_g6_student",
    titleHe: "מולדת לילד כיתה ו",
    category: "grade-relation",
    run: () =>
      runGradeRelationScenario(STU_G6, {
        subject: "moledet-geography",
        topic: "homeland",
        contentGrade: "g3",
        total: 10,
        correct: 3,
      }),
    checks: (ctx) => [
      ...baseGradeChecks(ctx, {
        relationAlias: "below_registered_grade",
        expectFoundation: true,
      }),
      result(
        "moledet_not_geography",
        "מופיע כמולדת, לא כגיאוגרפיה",
        Object.keys(ctx.mgSplit?.moledetTopics || {}).length > 0 &&
          Object.keys(ctx.mgSplit?.geographyTopics || {}).length === 0,
        `moledet=${Object.keys(ctx.mgSplit?.moledetTopics || {}).join(",")}; geo=${Object.keys(ctx.mgSplit?.geographyTopics || {}).join(",")}`,
        "agg",
      ),
      whenV3Field(
        ctx.rollups[0],
        "recommendedNextStep",
        "v3_foundation_next",
        "V3: לא advance (foundation/practice/probe)",
        (v) => v !== RECOMMENDED_NEXT_STEP.ADVANCE,
        (v) => `next=${v}`,
      ),
    ],
  },
];
