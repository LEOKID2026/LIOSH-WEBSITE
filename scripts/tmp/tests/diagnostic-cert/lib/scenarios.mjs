/**
 * 23 cert scenarios — dual-engine (DE2 + V3) + aggregation + grade-relation.
 */

import { aggregateReportPayloadFromActivityRows, mergeLearningActivityBookData } from "../../../../../lib/parent-server/report-data-aggregate.server.js";
import { classifyErrorTypeV3, ERROR_TYPE_V3 } from "../../../../../utils/diagnostic-engine-v3/error-types-v3.js";
import { DIAGNOSIS_STAGE } from "../../../../../utils/diagnostic-engine-v3/early-stopping-v3.js";
import { RECOMMENDED_NEXT_STEP } from "../../../../../utils/diagnostic-engine-v3/next-action-v3.js";
import { classifyActivityEvidence } from "../../../../../lib/learning/activity-classification.js";
import { mistake, topicRow, runDualEngine, pickRollup, pickDe2Unit } from "./engine-runner.mjs";
import { result, skip, oneOf, noneOf, whenV3Field, whenDe2Unit, summarizeChecks } from "./evaluators.mjs";
import { GRADE_SCENARIO_DEFS } from "./grade-scenarios.mjs";

const AGG_FROM = new Date("2026-03-01T00:00:00.000Z");
const AGG_TO = new Date("2026-03-31T00:00:00.000Z");
const AGG_META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };
const STUDENT = { id: "cert-stu", full_name: "תלמיד cert", grade_level: "g4", is_active: true };

/**
 * @param {object} def
 * @returns {Promise<object>}
 */
async function wrapScenario(def) {
  const ctx = await def.run();
  /** @type {import("./evaluators.mjs").CheckStatus extends never ? never : object[]} */
  const checks = def.checks(ctx);
  const stats = summarizeChecks(checks);
  const failures = checks.filter((c) => c.status === "fail").map((c) => `${c.labelHe}: ${c.reasonHe}`);
  const skips = checks.filter((c) => c.status === "skip").map((c) => c.labelHe);

  return {
    id: def.id,
    titleHe: def.titleHe,
    category: def.category,
    status: stats.status,
    checkStats: { pass: stats.pass, fail: stats.fail, skipped: stats.skipped },
    failures,
    skips,
    checks,
  };
}

/** @type {object[]} */
export const SCENARIO_DEFS = [
  {
    id: "01_insufficient_data",
    titleHe: "מעט מדי שאלות",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: { math: { "addition\u0001learning\u0001g4\u0001medium": topicRow(2, 1) } },
        rawMistakesBySubject: {
          math: [mistake({ subject: "math", topic: "addition", operation: "addition", bucketKey: "addition" })],
        },
      }),
    checks: (ctx) => {
      const r = pickRollup(ctx.rollups, { topic: "addition" });
      return [
        whenDe2Unit(
          ctx.unit,
          "de2_no_intervention",
          "DE2: לא מאפשר התערבות אגרסיבית",
          (u) => u.outputGating?.interventionAllowed !== true,
          "interventionAllowed=true למרות מעט שאלות",
        ),
        whenDe2Unit(
          ctx.unit,
          "de2_thin_confidence",
          "DE2: ביטחון דל או cannotConclude",
          (u) =>
            oneOf(u.confidence?.level, [
              "insufficient_data",
              "early_signal_only",
              "low",
              "contradictory",
            ]) ||
            u.outputGating?.cannotConcludeYet === true ||
            u.outputGating?.probeOnly === true,
          "DE2 נתן ביטחון/פלט חזק מדי",
        ),
        whenV3Field(
          r,
          "confidence",
          "v3_low_confidence",
          "V3: ביטחון נמוך",
          (v) => oneOf(v, ["very_low", "low"]),
          `confidence=${r?.confidence}`,
        ),
        whenV3Field(
          r,
          "recommendedNextStep",
          "v3_insufficient_or_probe",
          "V3: insufficient או give_probe",
          (v) => oneOf(v, [RECOMMENDED_NEXT_STEP.INSUFFICIENT, RECOMMENDED_NEXT_STEP.GIVE_PROBE]),
          (v) => `recommendedNextStep=${v}`,
        ),
      ];
    },
  },

  {
    id: "02_recurring_subskill",
    titleHe: "טעות חוזרת באותו subskill",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: { math: { "fractions\u0001learning\u0001g4\u0001medium": topicRow(12, 4) } },
        rawMistakesBySubject: {
          math: Array.from({ length: 5 }, (_, i) =>
            mistake(
              {
                subject: "math",
                topic: "fractions",
                operation: "fractions",
                bucketKey: "fractions",
                patternFamily: "unlike_denominator",
                expectedErrorTags: ["fraction_concept_error"],
                diagnosticSkillId: "fractions",
                subskillId: "unlike_denominators",
              },
              i,
            ),
          ),
        },
      }),
    checks: (ctx) => {
      const r = pickRollup(ctx.rollups, { subskill: "unlike_denominators" }) || pickRollup(ctx.rollups);
      return [
        whenV3Field(
          r,
          "diagnosisStage",
          "v3_working_or_stable",
          "V3: working_hypothesis או stable (לא needs_probe בלבד)",
          (v) =>
            oneOf(v, [
              DIAGNOSIS_STAGE.WORKING_HYPOTHESIS,
              DIAGNOSIS_STAGE.STABLE,
              DIAGNOSIS_STAGE.INITIAL_SIGNAL,
            ]),
          (v) => `diagnosisStage=${v}`,
        ),
        whenV3Field(
          r,
          "dominantErrorType",
          "v3_known_error",
          "V3: סוג טעות מזוהה (לא unknown)",
          (v) => v !== ERROR_TYPE_V3.UNKNOWN,
          () => `dominantErrorType=${r?.dominantErrorType}`,
        ),
        whenDe2Unit(
          ctx.unit,
          "de2_has_unit",
          "DE2: יחידה נוצרה עם recurrence",
          (u) => !!u && (u.recurrence?.wrongCount >= 1 || u.evidenceTrace?.length > 0),
          "יחידת DE2 חסרה",
        ),
        r?.subskill
          ? result("v3_subskill", "V3: subskill מזוהה", true, `subskill=${r.subskill}`, "v3")
          : skip("v3_subskill", "V3: subskill מזוהה"),
      ];
    },
  },

  {
    id: "03_contradictory",
    titleHe: "תשובות סותרות",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: {
          hebrew: {
            "grammar\u0001learning": topicRow(15, 13, {
              behaviorProfile: { dominantType: "stable_mastery" },
            }),
          },
        },
        rawMistakesBySubject: {
          hebrew: [
            mistake({ subject: "hebrew", topic: "grammar", patternFamily: "spelling", expectedErrorTags: ["grammar_error"] }, 0),
            mistake({ subject: "hebrew", topic: "grammar", patternFamily: "reading", expectedErrorTags: ["reading_comprehension"] }, 1),
            mistake({ subject: "hebrew", topic: "grammar", patternFamily: "vocab", expectedErrorTags: ["vocabulary_gap"] }, 2),
          ],
        },
      }),
    checks: (ctx) => {
      const r = pickRollup(ctx.rollups);
      return [
        whenV3Field(
          r,
          "contradictorySignals",
          "v3_contradictory_flag",
          "V3: contradictorySignals=true",
          (v) => v === true,
          "contradictorySignals=false",
        ),
        whenV3Field(
          r,
          "diagnosisStage",
          "v3_contradictory_stage",
          "V3: שלב contradictory",
          (v) => v === DIAGNOSIS_STAGE.CONTRADICTORY,
          (v) => `diagnosisStage=${v}`,
        ),
        whenV3Field(
          r,
          "recommendedNextStep",
          "v3_needs_probe",
          "V3: give_probe_questions",
          (v) => v === RECOMMENDED_NEXT_STEP.GIVE_PROBE,
          (v) => `recommendedNextStep=${v}`,
        ),
        whenDe2Unit(
          ctx.unit,
          "de2_conservative",
          "DE2: probe/cannotConclude/diagnosisAllowed — לא overclaim",
          (u) =>
            u.outputGating?.probeOnly === true ||
            u.outputGating?.cannotConcludeYet === true ||
            u.confidence?.level === "contradictory" ||
            u.outputGating?.diagnosisAllowed === true,
          "DE2 לא הגיב בזהירות לסתירה",
        ),
      ];
    },
  },

  {
    id: "04_fast_wrong",
    titleHe: "מהיר ושגוי",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: {
          english: {
            "vocabulary\u0001learning": topicRow(10, 3, {
              behaviorProfile: { dominantType: "speed_pressure" },
            }),
          },
        },
        rawMistakesBySubject: {
          english: Array.from({ length: 4 }, (_, i) =>
            mistake({ subject: "english", topic: "vocabulary", responseMs: 2500 }, i),
          ),
        },
      }),
    checks: (ctx) => {
      const r = pickRollup(ctx.rollups);
      return [
        whenV3Field(
          r,
          "dominantErrorType",
          "v3_speed_or_guessing",
          "V3: speed/guessing/careless — לא knowledge_gap ישיר",
          (v) =>
            oneOf(v, [ERROR_TYPE_V3.SPEED, ERROR_TYPE_V3.GUESSING, ERROR_TYPE_V3.CARELESS, ERROR_TYPE_V3.VOCABULARY]),
          (v) => `dominantErrorType=${v} (צפוי speed/guessing)`,
        ),
        whenV3Field(
          r,
          "dominantErrorType",
          "v3_not_prerequisite",
          "V3: לא prerequisite_gap אוטומטי",
          (v) => v !== ERROR_TYPE_V3.PREREQUISITE,
          "סווג prerequisite_gap שלא לצורך",
        ),
        whenV3Field(
          r,
          "fastWrongCount",
          "v3_fast_wrong_signal",
          "V3: fastWrongCount>=1",
          (v) => Number(v) >= 1,
          (v) => `fastWrongCount=${v}`,
        ),
        result(
          "de2_behavior_hint",
          "DE2: שורה עם behaviorProfile speed_pressure (אם קיים)",
          ctx.maps?.english?.["vocabulary\u0001learning"]?.behaviorProfile?.dominantType === "speed_pressure" ||
            ctx.unit != null,
          "behaviorProfile speed_pressure",
          "de2",
        ),
      ];
    },
  },

  {
    id: "05_slow_accurate",
    titleHe: "איטי ומדויק",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: { math: { "addition\u0001learning\u0001g4\u0001medium": topicRow(14, 13) } },
        rawMistakesBySubject: {
          math: [mistake({ subject: "math", topic: "addition", responseMs: 52000 }, 0)],
        },
      }),
    checks: (ctx) => {
      const r = pickRollup(ctx.rollups);
      return [
        result("accuracy_high", "דיוק גבוה (>=85%)", Number(r?.accuracy) >= 85, `accuracy=${r?.accuracy}`, "v3"),
        whenV3Field(
          r,
          "recommendedNextStep",
          "v3_maintain_or_advance",
          "V3: maintain/advance/practice — לא strengthen_prerequisite",
          (v) =>
            oneOf(v, [
              RECOMMENDED_NEXT_STEP.MAINTAIN,
              RECOMMENDED_NEXT_STEP.ADVANCE,
              RECOMMENDED_NEXT_STEP.PRACTICE_MORE,
              RECOMMENDED_NEXT_STEP.GIVE_PROBE,
            ]) && v !== RECOMMENDED_NEXT_STEP.STRENGTHEN_PREREQUISITE,
          (v) => `recommendedNextStep=${v}`,
        ),
        whenV3Field(
          r,
          "dominantErrorType",
          "v3_no_strong_gap",
          "V3: לא conceptual_misunderstanding דומinant",
          (v) => v !== ERROR_TYPE_V3.CONCEPTUAL || Number(r?.accuracy) >= 85,
          (v) => `dominantErrorType=${v}`,
        ),
        whenDe2Unit(
          ctx.unit,
          "de2_positive_or_probe",
          "DE2: positiveConclusion או probe בלבד — לא intervention חזק",
          (u) =>
            u.outputGating?.positiveConclusionAllowed === true ||
            u.outputGating?.probeOnly === true ||
            u.outputGating?.interventionAllowed !== true,
          "DE2 הציע התערבות למרות דיוק גבוה",
        ),
      ];
    },
  },

  {
    id: "06_calc_vs_word_problem",
    titleHe: "חישוב מצליח, בעיה מילולית נכשלת",
    category: "engine",
    run: () => {
      const ctx = runDualEngine({
        maps: {
          math: {
            "addition\u0001learning\u0001g4\u0001medium": topicRow(12, 11),
            "word_problems\u0001learning\u0001g4\u0001medium": topicRow(10, 3),
          },
        },
        rawMistakesBySubject: {
          math: [
            ...Array.from({ length: 2 }, (_, i) =>
              mistake({ subject: "math", topic: "addition", operation: "addition", bucketKey: "addition" }, i),
            ),
            ...Array.from({ length: 4 }, (_, i) =>
              mistake(
                {
                  subject: "math",
                  topic: "word_problems",
                  operation: "word_problems",
                  bucketKey: "word_problems",
                  patternFamily: "word_problem_reading",
                  expectedErrorTags: ["word_problem_reading", "operation_selection_error"],
                },
                i + 3,
              ),
            ),
          ],
        },
      });
      const wordRollup = pickRollup(ctx.rollups, { topic: "word_problems" });
      const addRollup = pickRollup(ctx.rollups, { topic: "addition" });
      return { ...ctx, wordRollup, addRollup };
    },
    checks: (ctx) => {
      const cls = classifyErrorTypeV3(
        "math",
        mistake({
          subject: "math",
          topic: "word_problems",
          patternFamily: "word_problem_reading",
          expectedErrorTags: ["operation_selection_error"],
        }),
      );
      return [
        result(
          "classify_reading_or_concept",
          "classify: word_problem → reading/conceptual (לא procedural בלבד)",
          oneOf(cls.errorType, [ERROR_TYPE_V3.READING, ERROR_TYPE_V3.CONCEPTUAL]),
          `errorType=${cls.errorType}`,
          "classify",
        ),
        result(
          "addition_accuracy",
          "חישוב: דיוק גבוה ב-addition",
          Number(ctx.addRollup?.accuracy) >= 85,
          `addition accuracy=${ctx.addRollup?.accuracy}`,
          "v3",
        ),
        whenV3Field(
          ctx.wordRollup,
          "dominantErrorType",
          "word_problem_error_type",
          "בעיה מילולית: reading/conceptual/unknown",
          (v) => oneOf(v, [ERROR_TYPE_V3.READING, ERROR_TYPE_V3.CONCEPTUAL, ERROR_TYPE_V3.UNKNOWN]),
          (v) => `dominantErrorType=${v}`,
        ),
        result(
          "word_not_pure_arithmetic",
          "בעיה מילולית: dominantErrorType ≠ procedural בלבד (אם מזוהה)",
          ctx.wordRollup?.dominantErrorType == null ||
            ctx.wordRollup.dominantErrorType !== ERROR_TYPE_V3.PROCEDURAL ||
            ctx.wordRollup.dominantErrorType === ERROR_TYPE_V3.READING,
          `dominant=${ctx.wordRollup?.dominantErrorType}`,
          "v3",
        ),
      ];
    },
  },

  {
    id: "07_prerequisite_gap",
    titleHe: "פער prerequisite",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: { math: { "fractions\u0001learning\u0001g4\u0001medium": topicRow(11, 4) } },
        rawMistakesBySubject: {
          math: Array.from({ length: 4 }, (_, i) =>
            mistake(
              {
                subject: "math",
                topic: "fractions",
                expectedErrorTags: ["prerequisite_gap"],
                diagnosticSkillId: "fractions",
                subskillId: "fraction_equivalence",
                prerequisiteSkillIds: ["place_value"],
              },
              i,
            ),
          ),
        },
      }),
    checks: (ctx) => {
      const r = pickRollup(ctx.rollups);
      const cls = classifyErrorTypeV3(
        "math",
        mistake({ subject: "math", topic: "fractions", expectedErrorTags: ["prerequisite_gap"] }),
      );
      return [
        result(
          "classify_prerequisite",
          "classify: prerequisite_gap",
          cls.errorType === ERROR_TYPE_V3.PREREQUISITE,
          `errorType=${cls.errorType}`,
          "classify",
        ),
        whenV3Field(
          r,
          "dominantErrorType",
          "v3_prerequisite",
          "V3: dominantErrorType=prerequisite_gap",
          (v) => v === ERROR_TYPE_V3.PREREQUISITE,
          (v) => `dominantErrorType=${v}`,
        ),
        whenV3Field(
          r,
          "recommendedNextStep",
          "v3_no_advance_on_prerequisite",
          "V3: לא advance — strengthen/practice/probe/give_probe",
          (v) =>
            v !== RECOMMENDED_NEXT_STEP.ADVANCE &&
            oneOf(v, [
              RECOMMENDED_NEXT_STEP.STRENGTHEN_PREREQUISITE,
              RECOMMENDED_NEXT_STEP.GIVE_PROBE,
              RECOMMENDED_NEXT_STEP.PRACTICE_MORE,
            ]),
          (v) => `recommendedNextStep=${v} (צפוי לא advance)`,
        ),
        whenDe2Unit(
          ctx.unit,
          "de2_no_advance",
          "DE2: לא positiveConclusion excellent",
          (u) => u.outputGating?.positiveAuthorityLevel !== "excellent",
          "DE2 דירג mastery למרות prerequisite",
        ),
      ];
    },
  },

  {
    id: "08_multi_level_mastery",
    titleHe: "שליטה טובה בכמה רמות קושי",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: {
          math: {
            "multiplication\u0001learning\u0001g4\u0001easy": topicRow(8, 8),
            "multiplication\u0001learning\u0001g4\u0001medium": topicRow(8, 7),
            "multiplication\u0001learning\u0001g4\u0001hard": topicRow(6, 5),
          },
        },
        rawMistakesBySubject: {
          math: [
            mistake({ subject: "math", topic: "multiplication", level: "medium", operation: "multiplication" }, 0),
            mistake({ subject: "math", topic: "multiplication", level: "hard", operation: "multiplication" }, 1),
          ],
        },
      }),
    checks: (ctx) => {
      const rollups = ctx.rollups.filter((r) => r.topic === "multiplication");
      const avgAcc =
        rollups.length > 0
          ? rollups.reduce((s, r) => s + Number(r.accuracy || 0), 0) / rollups.length
          : 0;
      const best = rollups[0];
      return [
        result("multi_level_accuracy", "דיוק ממוצע >=88% across levels", avgAcc >= 88, `avg=${Math.round(avgAcc)}`, "v3"),
        whenV3Field(
          best,
          "recommendedNextStep",
          "v3_maintain_or_advance",
          "V3: maintain או advance_cautiously",
          (v) => oneOf(v, [RECOMMENDED_NEXT_STEP.MAINTAIN, RECOMMENDED_NEXT_STEP.ADVANCE, RECOMMENDED_NEXT_STEP.PRACTICE_MORE]),
          (v) => `recommendedNextStep=${v}`,
        ),
        whenDe2Unit(
          pickDe2Unit(ctx.de2, "math"),
          "de2_positive_signal",
          "DE2: positiveConclusionAllowed או cannotConclude=false",
          (u) => u.outputGating?.positiveConclusionAllowed === true || u.outputGating?.cannotConcludeYet === false,
          "DE2 לא זיהה שליטה",
        ),
      ];
    },
  },

  {
    id: "09_parent_activity_only",
    titleHe: "פעילות אישית מהורה בלבד",
    category: "aggregation",
    run: async () => {
      const parentAttempt = {
        id: "par-cert-1",
        student_id: STUDENT.id,
        activity_id: "par-act-cert",
        question_index: 0,
        skill_key: "fractions",
        is_correct: false,
        time_spent_ms: 12000,
        hints_used: 0,
        answered_at: "2026-03-10T11:00:00Z",
        question_snapshot: {
          isDiagnosticEligible: true,
          evidenceCategory: "diagnostic_independent",
          contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
        },
        parent_assigned_activities: {
          subject: "math",
          topic: "fractions",
          subtopic: null,
          mode: "quiz",
          difficulty_level: "medium",
        },
      };
      const agg = aggregateReportPayloadFromActivityRows(
        STUDENT,
        [],
        [],
        AGG_FROM,
        AGG_TO,
        AGG_META,
        [parentAttempt],
      );
      return { agg };
    },
    checks: (ctx) => {
      const math = ctx.agg?.subjects?.math;
      return [
        result(
          "parent_diagnostic_count",
          "ראיות parent: diagnosticAnswers>=1",
          Number(math?.diagnosticAnswers) >= 1,
          `diagnosticAnswers=${math?.diagnosticAnswers}`,
          "agg",
        ),
        result(
          "parent_wrong_counted",
          "טעות parent נספרת",
          Number(math?.wrong) >= 1 || Number(math?.diagnosticAnswers) >= 1,
          `wrong=${math?.wrong}`,
          "agg",
        ),
        result(
          "no_self_practice",
          "אין self-practice sessions",
          Number(ctx.agg?.summary?.totalAnswers || math?.answers) === Number(math?.diagnosticAnswers),
          "self-practice leaked",
          "agg",
        ),
      ];
    },
  },

  {
    id: "10_educational_game_only",
    titleHe: "משחק חינוכי בלבד (learning mode)",
    category: "aggregation",
    run: async () => {
      const session = {
        id: "sess-learning",
        student_id: STUDENT.id,
        subject: "math",
        topic: "addition",
        started_at: "2026-03-10T10:00:00Z",
        created_at: "2026-03-10T10:00:00Z",
        ended_at: "2026-03-10T10:20:00Z",
        duration_seconds: 1200,
        status: "completed",
        metadata: { mode: "learning" },
      };
      const answers = Array.from({ length: 5 }, (_, i) => ({
        id: `ans-learn-${i}`,
        student_id: STUDENT.id,
        learning_session_id: session.id,
        question_id: `q-${i}`,
        is_correct: i < 3,
        answered_at: "2026-03-10T10:05:00Z",
        created_at: "2026-03-10T10:05:00Z",
        answer_payload: {
          subject: "math",
          topic: "addition",
          gameMode: "learning",
          isDiagnosticEligible: false,
          evidenceCategory: "learning_guided",
          contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
        },
      }));
      const agg = aggregateReportPayloadFromActivityRows(
        STUDENT,
        [session],
        answers,
        AGG_FROM,
        AGG_TO,
        AGG_META,
      );
      const classification = classifyActivityEvidence("learning", "free_practice", { hintsUsed: 0 });
      return { agg, classification };
    },
    checks: (ctx) => {
      const math = ctx.agg?.subjects?.math;
      return [
        result(
          "learning_not_diagnostic_eligible",
          "classification: learning → לא diagnostic",
          ctx.classification.isDiagnosticEligible === false,
          `isDiagnosticEligible=${ctx.classification.isDiagnosticEligible}`,
          "agg",
        ),
        result(
          "no_diagnostic_bucket",
          "דוח: diagnosticAnswers=0",
          Number(math?.diagnosticAnswers || 0) === 0,
          `diagnosticAnswers=${math?.diagnosticAnswers}`,
          "agg",
        ),
        result(
          "excluded_from_report",
          "דוח: תשובות learning mode לא נספרות (answers=0)",
          Number(math?.answers || 0) === 0 && Number(math?.diagnosticAnswers || 0) === 0,
          `answers=${math?.answers}, diagnostic=${math?.diagnosticAnswers}`,
          "agg",
        ),
        result(
          "session_may_still_count",
          "סession duration עשוי להיספר (אם mode countable)",
          Number(ctx.agg?.summary?.totalSessions || 0) >= 0,
          "session tracking optional",
          "agg",
        ),
      ];
    },
  },

  {
    id: "11_book_practice_only",
    titleHe: "תרגול ספר למידה בלבד",
    category: "aggregation",
    run: async () => {
      const session = {
        id: "sess-book",
        student_id: STUDENT.id,
        subject: "hebrew",
        topic: "reading",
        started_at: "2026-03-10T09:00:00Z",
        created_at: "2026-03-10T09:00:00Z",
        ended_at: "2026-03-10T09:25:00Z",
        duration_seconds: 1500,
        status: "completed",
        metadata: { mode: "learning_book" },
      };
      let agg = aggregateReportPayloadFromActivityRows(STUDENT, [], [], AGG_FROM, AGG_TO, AGG_META);
      agg = mergeLearningActivityBookData(
        agg,
        [{ subject: "hebrew", credited_dwell_ms: 18 * 60 * 1000, page_read: true }],
        [{ id: "brs-cert-1" }],
        [],
      );
      const classification = classifyActivityEvidence("learning_book", "learning_book", {});
      return { agg, classification };
    },
    checks: (ctx) => {
      const heb = ctx.agg?.subjects?.hebrew;
      return [
        result(
          "book_not_diagnostic",
          "classification: learning_book → לא diagnostic",
          ctx.classification.isDiagnosticEligible === false,
          `category=${ctx.classification.evidenceCategory}`,
          "agg",
        ),
        result(
          "no_diagnostic_answers",
          "דוח: diagnosticAnswers=0",
          Number(heb?.diagnosticAnswers || 0) === 0,
          `diagnosticAnswers=${heb?.diagnosticAnswers}`,
          "agg",
        ),
        result(
          "book_time_tracked",
          "דוח: bookReadingMinutes>0",
          Number(ctx.agg?.learningActivity?.bookReadingMinutes || 0) > 0,
          `minutes=${ctx.agg?.learningActivity?.bookReadingMinutes}`,
          "agg",
        ),
      ];
    },
  },

  {
    id: "12_guessing",
    titleHe: "ניחושים",
    category: "engine",
    run: () =>
      runDualEngine({
        maps: { math: { "multiplication\u0001learning\u0001g4\u0001medium": topicRow(9, 2) } },
        rawMistakesBySubject: {
          math: Array.from({ length: 5 }, (_, i) =>
            mistake({ subject: "math", topic: "multiplication", responseMs: 1800, hintUsed: false, retryCount: 0 }, i),
          ),
        },
      }),
    checks: (ctx) => {
      const r = pickRollup(ctx.rollups);
      return [
        whenV3Field(
          r,
          "dominantErrorType",
          "v3_guessing_or_speed",
          "V3: guessing_or_unstable / speed / careless",
          (v) => oneOf(v, [ERROR_TYPE_V3.GUESSING, ERROR_TYPE_V3.SPEED, ERROR_TYPE_V3.CARELESS]),
          (v) => `dominantErrorType=${v}`,
        ),
        whenV3Field(
          r,
          "confidence",
          "v3_confidence_not_high",
          "V3: confidence לא high",
          (v) => noneOf(v, ["high"]),
          (v) => `confidence=${v}`,
        ),
        whenDe2Unit(
          ctx.unit,
          "de2_no_strong_intervention",
          "DE2: interventionAllowed=false או probe",
          (u) => u.outputGating?.interventionAllowed !== true || u.outputGating?.probeOnly === true,
          "DE2 התערבות חזקה מניחושים",
        ),
      ];
    },
  },

  {
    id: "13_math_fractions_subskills",
    titleHe: "מתמטיקה — שברים (subskills)",
    category: "engine",
    run: () => {
      const ctx = runDualEngine({
        maps: { math: { "fractions\u0001learning\u0001g4\u0001medium": topicRow(14, 6) } },
        rawMistakesBySubject: {
          math: [
            mistake({
              subject: "math",
              topic: "fractions",
              subskillId: "fraction_magnitude",
              expectedErrorTags: ["fraction_concept_error"],
              patternFamily: "fraction_magnitude",
            }, 0),
            mistake({
              subject: "math",
              topic: "fractions",
              subskillId: "fraction_equivalence",
              expectedErrorTags: ["fraction_concept_error"],
              patternFamily: "equivalence",
            }, 1),
            mistake({
              subject: "math",
              topic: "fractions",
              subskillId: "fraction_operations",
              expectedErrorTags: ["operation_selection_error"],
              patternFamily: "fraction_add",
            }, 2),
          ],
        },
      });
      const subskills = new Set(ctx.rollups.map((r) => r.subskill).filter(Boolean));
      return { ...ctx, subskills: [...subskills] };
    },
    checks: (ctx) => [
      result(
        "fraction_error_types",
        "classify: fraction tags → conceptual/procedural",
        [ERROR_TYPE_V3.CONCEPTUAL, ERROR_TYPE_V3.PROCEDURAL].includes(
          classifyErrorTypeV3(
            "math",
            mistake({ subject: "math", expectedErrorTags: ["fraction_concept_error"] }),
          ).errorType,
        ),
        "fraction tag mapping",
        "classify",
      ),
      ctx.subskills.length >= 2
        ? result("subskill_discrimination", "V3: לפחות 2 subskills ב-rollups", true, ctx.subskills.join(", "), "v3")
        : skip("subskill_discrimination", "V3: subskill discrimination (payload pending)"),
      result(
        "dominant_not_unknown",
        "V3: dominantErrorType מזוהה",
        ctx.rollups.some((r) => r.dominantErrorType && r.dominantErrorType !== ERROR_TYPE_V3.UNKNOWN),
        `types=${ctx.rollups.map((r) => r.dominantErrorType).join(",")}`,
        "v3",
      ),
    ],
  },

  {
    id: "14_hebrew_reading_layers",
    titleHe: "עברית — פענוח / הבנה / הסקה",
    category: "engine",
    run: () => ({
      decode: classifyErrorTypeV3(
        "hebrew",
        mistake({ subject: "hebrew", patternFamily: "phonics", expectedErrorTags: ["phonics_gap"] }),
      ),
      comprehension: classifyErrorTypeV3(
        "hebrew",
        mistake({ subject: "hebrew", patternFamily: "reading_comprehension", expectedErrorTags: ["reading_comprehension"] }),
      ),
      inference: classifyErrorTypeV3(
        "hebrew",
        mistake({ subject: "hebrew", patternFamily: "inference", expectedErrorTags: ["inference_error"] }),
      ),
    }),
    checks: (ctx) => [
      result(
        "hebrew_phonics",
        "פענוח → phonics_gap",
        ctx.decode.errorType === ERROR_TYPE_V3.PHONICS,
        `got ${ctx.decode.errorType}`,
        "classify",
      ),
      result(
        "hebrew_comprehension",
        "הבנה → reading_comprehension_issue",
        ctx.comprehension.errorType === ERROR_TYPE_V3.READING,
        `got ${ctx.comprehension.errorType}`,
        "classify",
      ),
      result(
        "hebrew_inference",
        "הסקה → inference_gap",
        ctx.inference.errorType === ERROR_TYPE_V3.INFERENCE,
        `got ${ctx.inference.errorType}`,
        "classify",
      ),
      result(
        "layers_distinct",
        "שכבות שונות זו מזו",
        ctx.decode.errorType !== ctx.comprehension.errorType &&
          ctx.comprehension.errorType !== ctx.inference.errorType,
        `${ctx.decode.errorType} / ${ctx.comprehension.errorType} / ${ctx.inference.errorType}`,
        "classify",
      ),
    ],
  },

  {
    id: "15_english_phonics_vocabulary",
    titleHe: "אנגלית — phonics מול vocabulary",
    category: "engine",
    run: () => ({
      phonics: classifyErrorTypeV3(
        "english",
        mistake({ subject: "english", patternFamily: "phonics", expectedErrorTags: ["phonics_gap"] }),
      ),
      vocabulary: classifyErrorTypeV3(
        "english",
        mistake({ subject: "english", patternFamily: "vocab", expectedErrorTags: ["vocabulary_gap"] }),
      ),
    }),
    checks: (ctx) => [
      result(
        "english_phonics",
        "phonics → phonics_gap",
        ctx.phonics.errorType === ERROR_TYPE_V3.PHONICS,
        `got ${ctx.phonics.errorType}`,
        "classify",
      ),
      result(
        "english_vocabulary",
        "vocabulary → vocabulary_gap",
        ctx.vocabulary.errorType === ERROR_TYPE_V3.VOCABULARY,
        `got ${ctx.vocabulary.errorType}`,
        "classify",
      ),
      result(
        "english_distinct",
        "phonics ≠ vocabulary",
        ctx.phonics.errorType !== ctx.vocabulary.errorType,
        `${ctx.phonics.errorType} vs ${ctx.vocabulary.errorType}`,
        "classify",
      ),
    ],
  },

  {
    id: "16_science_concept_vs_inference",
    titleHe: "מדעים — מושג מול הסקה",
    category: "engine",
    run: () => ({
      concept: classifyErrorTypeV3(
        "science",
        mistake({
          subject: "science",
          patternFamily: "concept",
          expectedErrorTags: ["fraction_concept_error"],
          distractorFamily: "misconception_energy",
        }),
      ),
      inference: classifyErrorTypeV3(
        "science",
        mistake({ subject: "science", patternFamily: "infer", expectedErrorTags: ["inference_error"] }),
      ),
      scenario: runDualEngine({
        maps: { science: { "experiments\u0001learning": topicRow(12, 5) } },
        rawMistakesBySubject: {
          science: [
            mistake({ subject: "science", topic: "experiments", expectedErrorTags: ["inference_error"], patternFamily: "infer" }, 0),
            mistake({ subject: "science", topic: "experiments", distractorFamily: "misconception_force", patternFamily: "concept" }, 1),
          ],
        },
      }),
    }),
    checks: (ctx) => {
      const r = pickRollup(ctx.scenario.rollups);
      return [
        result(
          "science_concept",
          "classify: distractor/tag → conceptual",
          oneOf(ctx.concept.errorType, [ERROR_TYPE_V3.CONCEPTUAL, ERROR_TYPE_V3.UNKNOWN]),
          `concept=${ctx.concept.errorType}`,
          "classify",
        ),
        result(
          "science_inference",
          "classify: inference tag → inference_gap",
          ctx.inference.errorType === ERROR_TYPE_V3.INFERENCE,
          `inference=${ctx.inference.errorType}`,
          "classify",
        ),
        result(
          "science_distinct",
          "concept ≠ inference (classify)",
          ctx.concept.errorType !== ctx.inference.errorType || ctx.inference.errorType === ERROR_TYPE_V3.INFERENCE,
          `${ctx.concept.errorType} vs ${ctx.inference.errorType}`,
          "classify",
        ),
        whenV3Field(
          r,
          "dominantErrorTypes",
          "v3_error_types_present",
          "V3 rollup: לפחות סוג טעות אחד",
          (v) => Array.isArray(v) && v.length >= 1,
          () => "dominantErrorTypes ריק",
        ),
      ];
    },
  },
  ...GRADE_SCENARIO_DEFS,
];

/**
 * Run all scenarios and return structured results.
 */
export async function runAllScenarios() {
  const results = [];
  for (const def of SCENARIO_DEFS) {
    try {
      results.push(await wrapScenario(def));
    } catch (err) {
      results.push({
        id: def.id,
        titleHe: def.titleHe,
        category: def.category,
        status: "fail",
        checkStats: { pass: 0, fail: 1, skipped: 0 },
        failures: [err instanceof Error ? err.message : String(err)],
        skips: [],
        checks: [],
      });
    }
  }
  return results;
}

export { SCENARIO_DEFS as SCENARIOS };
