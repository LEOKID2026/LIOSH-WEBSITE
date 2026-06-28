/**
 * Phase 2-A3 product verification: math M-01 bucket templates (compare, number_sense, estimation, scale, prime_composite, zero_one_properties) g4.
 *
 *   npx tsx scripts/parent-report-grade-aware-phase2a2-m01-partial-verify.mjs
 */

const EXPECTED_COMPARE_ACTION =
  "כדאי לתרגל השוואת מספרים רב ספרתיים לפי ערך הספרות. בקשו מהילד להתחיל מהספרה בעלת הערך הגבוה ביותר ולהסביר באיזו עמודה נקבע ההבדל.";
const EXPECTED_COMPARE_GOAL =
  "בשבוע הקרוב התמקדו בהשוואת מספרים לפי ערך מקום, מהספרה הגדולה ביותר ועד העמודה שבה מופיע ההבדל.";

const EXPECTED_NUMBER_SENSE_ACTION =
  "כדאי לתרגל פירוק מספרים לפי ערך מקום: אחדות, עשרות, מאות ואלפים. בקשו מהילד לכתוב את המספר גם בצורה רגילה וגם כפירוק לפי הערך של כל ספרה.";
const EXPECTED_NUMBER_SENSE_GOAL =
  "בשבוע הקרוב התמקדו בערך מקום ובפירוק מספרים רב ספרתיים לפי הספרות שלהם.";

const EXPECTED_ESTIMATION_ACTION =
  "כדאי לתרגל אומדן לפני חישוב במספרים רב ספרתיים. בקשו מהילד לעגל את המספרים בקירוב, לשער מה גודל התשובה, ואז לבדוק אם החישוב הסופי סביר.";
const EXPECTED_ESTIMATION_GOAL =
  "בשבוע הקרוב התמקדו באומדן לפני חישוב ובבדיקת סבירות של תשובות במספרים רב ספרתיים.";

/** Must not appear in parent-facing resolver output when approved M-01 bucket templates apply. */
const M01_PARENT_BANNED = [
  "טעויות בהמרת ייצוג",
  "מבנה / פירוק 10+1",
  "פירוק 10+1",
  "שני ייצוגים לאותו מספר",
  "מניפולציה + מעבר הדרגתי לסמל",
];

/**
 * @param {string} bucketKey
 * @param {string} [gradeKey]
 */
function buildBaseReportM01(bucketKey, gradeKey = "g4") {
  const topicRowKey = `${bucketKey}\u0001learning\u0001${gradeKey}\u0001easy`;
  return {
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    period: "week",
    playerName: "בדיקה",
    summary: { totalQuestions: 20 },
    mathOperations: {
      [topicRowKey]: {
        bucketKey,
        displayName: "חשבון",
        questions: 12,
        correct: 8,
        wrong: 4,
        accuracy: 67,
        gradeKey,
        modeKey: "learning",
        levelKey: "easy",
        lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
      },
    },
    diagnosticEngineV2: {
      units: [
        {
          blueprintRef: "test",
          engineVersion: "v2",
          unitKey: `math::${topicRowKey}`,
          subjectId: "math",
          topicRowKey,
          bucketKey,
          displayName: "חשבון",
          diagnosis: { allowed: true, taxonomyId: "M-01", lineHe: "מצביע על דפוס." },
          intervention: {
            immediateActionHe: "מניפולציה + מעבר הדרגתי לסמל",
            shortPracticeHe: "שני ייצוגים לאותו מספר",
            taxonomyId: "M-01",
          },
          taxonomy: {
            id: "M-01",
            patternHe: "טעויות בהמרת ייצוג",
            topicHe: "מבנה",
            subskillHe: "פירוק 10+1",
          },
          recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
          confidence: { level: "moderate" },
          priority: { level: "P3", breadth: "narrow" },
          competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
          strengthProfile: { tags: [], dominantBehavior: null },
          outputGating: {
            interventionAllowed: true,
            diagnosisAllowed: true,
            probeOnly: false,
            cannotConcludeYet: false,
            additiveCautionAllowed: false,
            positiveAuthorityLevel: "none",
          },
          probe: { specificationHe: "בדיקה", objectiveHe: "מטרה" },
          explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
          canonicalState: {
            actionState: "intervene",
            recommendation: { allowed: false, family: "remedial" },
            assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
            evidence: { positiveAuthorityLevel: "none" },
            topicStateId: "ts_m01",
            stateHash: "h1",
          },
        },
      ],
    },
  };
}

/**
 * @param {string} name
 * @param {unknown} actual
 * @param {string} expected
 */
function assertEq(name, actual, expected) {
  const a = String(actual ?? "");
  const e = String(expected ?? "");
  if (a !== e) {
    throw new Error(`${name} mismatch.\nexpected (${e.length} chars): ${e}\nactual   (${a.length} chars): ${a}`);
  }
}

/**
 * @param {string} label
 * @param {unknown} blob
 */
function assertM01ParentBannedAbsent(label, blob) {
  const s = typeof blob === "string" ? blob : JSON.stringify(blob);
  for (const b of M01_PARENT_BANNED) {
    if (s.includes(b)) throw new Error(`${label} contains banned M-01 internal phrase: ${b}`);
  }
}

const [detailedMod, parentReportV2Mod, truthMod, resolverMod, recMod] = await Promise.all([
  import("../utils/detailed-parent-report.js"),
  import("../utils/parent-report-v2.js"),
  import("../utils/parent-copilot/truth-packet-v1.js"),
  import("../utils/parent-report-language/grade-aware-recommendation-resolver.js"),
  import("../utils/parent-report-recommendation-consistency.js"),
]);

const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { summarizeV2UnitsForSubjectForTests } = parentReportV2Mod;
const { buildTruthPacketV1 } = truthMod;
const { resolveGradeAwareParentRecommendationHe } = resolverMod;
const { resolveUnitParentActionHe } = recMod;

function runM01ApprovedBucketsG4() {
  if (
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      slot: "action",
    }) !== null
  ) {
    throw new Error("M-01 without bucketKey must not resolve template action");
  }

  const rCompare = resolveGradeAwareParentRecommendationHe({
    subjectId: "math",
    gradeKey: "g4",
    taxonomyId: "M-01",
    bucketKey: "compare",
    slot: "action",
  });
  if (rCompare !== EXPECTED_COMPARE_ACTION) {
    throw new Error("M-01 compare g4 resolver action exact match failed");
  }
  const gCompare = resolveGradeAwareParentRecommendationHe({
    subjectId: "math",
    gradeKey: "g4",
    taxonomyId: "M-01",
    bucketKey: "compare",
    slot: "nextGoal",
  });
  if (gCompare !== EXPECTED_COMPARE_GOAL) throw new Error("M-01 compare g4 resolver goal exact match failed");
  if (rCompare === gCompare) throw new Error("M-01 compare g4 action and goal must differ");

  const rNs = resolveGradeAwareParentRecommendationHe({
    subjectId: "math",
    gradeKey: "g4",
    taxonomyId: "M-01",
    bucketKey: "number_sense",
    slot: "action",
  });
  if (rNs !== EXPECTED_NUMBER_SENSE_ACTION) {
    throw new Error("M-01 number_sense g4 resolver action exact match failed");
  }
  const gNs = resolveGradeAwareParentRecommendationHe({
    subjectId: "math",
    gradeKey: "g4",
    taxonomyId: "M-01",
    bucketKey: "number_sense",
    slot: "nextGoal",
  });
  if (gNs !== EXPECTED_NUMBER_SENSE_GOAL) throw new Error("M-01 number_sense g4 resolver goal exact match failed");
  if (rNs === gNs) throw new Error("M-01 number_sense g4 action and goal must differ");

  const rEst = resolveGradeAwareParentRecommendationHe({
    subjectId: "math",
    gradeKey: "g4",
    taxonomyId: "M-01",
    bucketKey: "estimation",
    slot: "action",
  });
  if (rEst !== EXPECTED_ESTIMATION_ACTION) {
    throw new Error("M-01 estimation g4 resolver action exact match failed");
  }
  const gEst = resolveGradeAwareParentRecommendationHe({
    subjectId: "math",
    gradeKey: "g4",
    taxonomyId: "M-01",
    bucketKey: "estimation",
    slot: "nextGoal",
  });
  if (gEst !== EXPECTED_ESTIMATION_GOAL) throw new Error("M-01 estimation g4 resolver goal exact match failed");
  if (rEst === gEst) throw new Error("M-01 estimation g4 action and goal must differ");

  for (const b of ["scale", "prime_composite", "zero_one_properties"]) {
    const resolved = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: b,
      slot: "action",
    });
    if (resolved == null || String(resolved).trim() === "") {
      throw new Error(`M-01 bucket ${b} must resolve template action`);
    }
    assertM01ParentBannedAbsent(`M-01 ${b} action`, resolved);
  }

  const baseCompare = buildBaseReportM01("compare", "g4");
  const topicRowKeyCompare = "compare\u0001learning\u0001g4\u0001easy";
  const detailedC = buildDetailedParentReportFromBaseReport(baseCompare, { period: "week" });
  const mpC = detailedC?.subjectProfiles?.find((p) => p.subject === "math");
  assertEq("detailed math parentActionHe (M-01 compare g4)", mpC?.parentActionHe, EXPECTED_COMPARE_ACTION);
  assertEq("detailed math nextWeekGoalHe (M-01 compare g4)", mpC?.nextWeekGoalHe, EXPECTED_COMPARE_GOAL);
  assertEq("detailed math recommendedHomeMethodHe (M-01 compare g4)", mpC?.recommendedHomeMethodHe, EXPECTED_COMPARE_GOAL);
  assertM01ParentBannedAbsent("detailed compare parentActionHe", mpC?.parentActionHe);
  assertM01ParentBannedAbsent("detailed compare nextWeekGoalHe", mpC?.nextWeekGoalHe);

  const dJsonC = JSON.stringify(detailedC);
  if (dJsonC.includes("מניפולציה + מעבר הדרגתי לסמל") || dJsonC.includes("שני ייצוגים לאותו מספר")) {
    throw new Error("detailed JSON still contains raw M-01 engine intervention strings after sanitize (compare)");
  }

  const shortC = summarizeV2UnitsForSubjectForTests(baseCompare.diagnosticEngineV2.units, {
    subjectReportQuestions: 12,
    subjectLabelHe: "מתמטיקה",
    topicMap: baseCompare.mathOperations,
    reportTotalQuestions: 20,
  });
  assertEq("short parentActionHe (M-01 compare g4)", shortC.parentActionHe, EXPECTED_COMPARE_ACTION);
  assertM01ParentBannedAbsent("short compare parentActionHe", shortC.parentActionHe);

  const tpC = buildTruthPacketV1(detailedC, {
    scopeType: "topic",
    scopeId: topicRowKeyCompare,
    scopeLabel: "חשבון",
  });
  if (!tpC) throw new Error("buildTruthPacketV1 returned null (compare)");
  const narC = tpC?.contracts?.narrative?.textSlots || {};
  const factsParallelC = {
    observation: String(narC.observation || ""),
    interpretation: String(narC.interpretation || ""),
    action: String(narC.action || ""),
    uncertainty: String(narC.uncertainty || ""),
  };
  assertM01ParentBannedAbsent("FACTS_JSON parallel narrative slots (compare)", JSON.stringify(factsParallelC));
  assertM01ParentBannedAbsent("truthPacket JSON (compare)", JSON.stringify(tpC));

  const baseNs = buildBaseReportM01("number_sense", "g4");
  const topicRowKeyNs = "number_sense\u0001learning\u0001g4\u0001easy";
  const detailedN = buildDetailedParentReportFromBaseReport(baseNs, { period: "week" });
  const mpN = detailedN?.subjectProfiles?.find((p) => p.subject === "math");
  assertEq("detailed math parentActionHe (M-01 number_sense g4)", mpN?.parentActionHe, EXPECTED_NUMBER_SENSE_ACTION);
  assertEq("detailed math nextWeekGoalHe (M-01 number_sense g4)", mpN?.nextWeekGoalHe, EXPECTED_NUMBER_SENSE_GOAL);
  assertEq(
    "detailed math recommendedHomeMethodHe (M-01 number_sense g4)",
    mpN?.recommendedHomeMethodHe,
    EXPECTED_NUMBER_SENSE_GOAL
  );
  assertM01ParentBannedAbsent("detailed number_sense parentActionHe", mpN?.parentActionHe);

  const dJsonN = JSON.stringify(detailedN);
  if (dJsonN.includes("מניפולציה + מעבר הדרגתי לסמל") || dJsonN.includes("שני ייצוגים לאותו מספר")) {
    throw new Error("detailed JSON still contains raw M-01 engine intervention strings after sanitize (number_sense)");
  }

  const tpN = buildTruthPacketV1(detailedN, {
    scopeType: "topic",
    scopeId: topicRowKeyNs,
    scopeLabel: "חשבון",
  });
  if (!tpN) throw new Error("buildTruthPacketV1 returned null (number_sense)");
  const narN = tpN?.contracts?.narrative?.textSlots || {};
  assertM01ParentBannedAbsent(
    "FACTS_JSON parallel narrative slots (number_sense)",
    JSON.stringify({
      observation: String(narN.observation || ""),
      interpretation: String(narN.interpretation || ""),
      action: String(narN.action || ""),
      uncertainty: String(narN.uncertainty || ""),
    })
  );

  const baseEst = buildBaseReportM01("estimation", "g4");
  const topicRowKeyEst = "estimation\u0001learning\u0001g4\u0001easy";
  const detailedE = buildDetailedParentReportFromBaseReport(baseEst, { period: "week" });
  const mpE = detailedE?.subjectProfiles?.find((p) => p.subject === "math");
  assertEq("detailed math parentActionHe (M-01 estimation g4)", mpE?.parentActionHe, EXPECTED_ESTIMATION_ACTION);
  assertEq("detailed math nextWeekGoalHe (M-01 estimation g4)", mpE?.nextWeekGoalHe, EXPECTED_ESTIMATION_GOAL);
  assertEq(
    "detailed math recommendedHomeMethodHe (M-01 estimation g4)",
    mpE?.recommendedHomeMethodHe,
    EXPECTED_ESTIMATION_GOAL
  );
  assertM01ParentBannedAbsent("detailed estimation parentActionHe", mpE?.parentActionHe);

  const dJsonE = JSON.stringify(detailedE);
  if (dJsonE.includes("מניפולציה + מעבר הדרגתי לסמל") || dJsonE.includes("שני ייצוגים לאותו מספר")) {
    throw new Error("detailed JSON still contains raw M-01 engine intervention strings after sanitize (estimation)");
  }

  const shortE = summarizeV2UnitsForSubjectForTests(baseEst.diagnosticEngineV2.units, {
    subjectReportQuestions: 12,
    subjectLabelHe: "מתמטיקה",
    topicMap: baseEst.mathOperations,
    reportTotalQuestions: 20,
  });
  assertEq("short parentActionHe (M-01 estimation g4)", shortE.parentActionHe, EXPECTED_ESTIMATION_ACTION);
  assertM01ParentBannedAbsent("short estimation parentActionHe", shortE.parentActionHe);

  const tpE = buildTruthPacketV1(detailedE, {
    scopeType: "topic",
    scopeId: topicRowKeyEst,
    scopeLabel: "חשבון",
  });
  if (!tpE) throw new Error("buildTruthPacketV1 returned null (estimation)");
  const narE = tpE?.contracts?.narrative?.textSlots || {};
  assertM01ParentBannedAbsent(
    "FACTS_JSON parallel narrative slots (estimation)",
    JSON.stringify({
      observation: String(narE.observation || ""),
      interpretation: String(narE.interpretation || ""),
      action: String(narE.action || ""),
      uncertainty: String(narE.uncertainty || ""),
    })
  );
}

function runM01ExtendedBucketsUseTemplatesNotEngineFallback() {
  for (const bucket of ["scale", "prime_composite", "zero_one_properties"]) {
    const action = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: bucket,
      slot: "action",
    });
    const goal = resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: bucket,
      slot: "nextGoal",
    });
    if (!action || !goal || action === goal) {
      throw new Error(`M-01 ${bucket} template action/goal must resolve and differ`);
    }
    const base = buildBaseReportM01(bucket, "g4");
    const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
    const mp = detailed?.subjectProfiles?.find((p) => p.subject === "math");
    assertEq(`detailed math parentActionHe (M-01 ${bucket} g4)`, mp?.parentActionHe, action);
    assertEq(`detailed math nextWeekGoalHe (M-01 ${bucket} g4)`, mp?.nextWeekGoalHe, goal);
    assertM01ParentBannedAbsent(`detailed ${bucket} parentActionHe`, mp?.parentActionHe);
    const dJson = JSON.stringify(detailed);
    if (dJson.includes("מניפולציה + מעבר הדרגתי לסמל")) {
      throw new Error(`M-01 ${bucket}: detailed JSON must not contain raw engine intervention`);
    }
  }
}

function runM01TemplatesAlwaysAvailableWithoutEnv() {
  delete process.env.ENABLE_GRADE_AWARE_RECOMMENDATIONS;
  delete process.env.NEXT_PUBLIC_ENABLE_GRADE_AWARE_RECOMMENDATIONS;
  if (
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "compare",
      slot: "action",
    }) == null
  ) {
    throw new Error("M-01 compare must resolve without env flag");
  }
  if (
    resolveGradeAwareParentRecommendationHe({
      subjectId: "math",
      gradeKey: "g4",
      taxonomyId: "M-01",
      bucketKey: "estimation",
      slot: "action",
    }) == null
  ) {
    throw new Error("M-01 estimation must resolve without env flag");
  }
}

runM01ApprovedBucketsG4();
runM01ExtendedBucketsUseTemplatesNotEngineFallback();
runM01TemplatesAlwaysAvailableWithoutEnv();

process.stdout.write("OK parent-report-grade-aware-phase2a2-m01-partial-verify\n");
