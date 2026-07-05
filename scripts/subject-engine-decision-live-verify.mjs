#!/usr/bin/env node
/**
 * Live verify: topic contracts → subjectEngineDecisionContract → letter/rollup render source.
 * Run: node scripts/subject-engine-decision-live-verify.mjs
 */
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";
import { getServiceSupabase } from "./truth-gates/lib/live-parent-report.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

loadEnvFiles();

async function load(rel) {
  const m = await import(u(rel));
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { aggregateParentReportPayload } = await load("lib/parent-server/report-data-aggregate.server.js");
const { runWithParentReportRebuildLock } = await load("lib/parent-server/db-input-to-detailed-report.server.js");
const { buildReportInputFromDbData } = await load("lib/learning-supabase/report-data-adapter.js");
const { applyParentReportGamificationOverlay } = await load("lib/learning-shared/student-account-state-view.js");
const { applyServerParentFacingAuthorityToClientReport } = await load("lib/parent-server/parent-facing-report-authority.js");
const { applyTopicEngineParentFacingInsights } = await load("utils/parent-report-engine-insights-he.js");
const { applyBridgeProvenanceToGeneratedReport } = await load("lib/learning-supabase/bridge-report-provenance.js");
const { syncReportVisiblePracticeFromServer } = await load("lib/learning/report-visible-practice-sync.js");
const { generateParentReportV2 } = await load("utils/parent-report-v2.js");
const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { buildSubjectParentLetter, buildTopicRecommendationNarrative } = await load("utils/detailed-report-parent-letter-he.js");
const {
  buildLpdSafeTopicInsightLineHe,
  resolveParentExplainRowCopy,
} = await load("utils/learning-pattern-decision/lpd-parent-facing-copy.js");
const { seedLocalStorageFromDbReportInput } = await load("lib/learning-supabase/seed-db-report-local-storage.js");
const {
  EDC_CONTRACT_KEY,
  SP_SUBJECT_ENGINE_CONTRACT,
  RENDER_SOURCE_SUBJECT_ENGINE,
  ED_CLEAR_TOPIC_GAP,
  RA_REMEDIATE_SAME_LEVEL,
} = await load("utils/learning-pattern-decision/engine-decision-codes.js");

const LEGACY_FORBIDDEN = [
  "בחלק מהשורות",
  "עדיין מוקדם",
  "אין תמונה מספיק ברורה",
  "עדיין לא מספיק",
];

const INTERNAL_FORBIDDEN = [
  "remediate same level",
  "undefined",
  "null",
  "unknown",
  "engineDecision",
  "clear_topic_gap",
  "topic_needs_strengthening",
  "recommendedAction",
  "parentSafeFinding",
];

function collectTopicOwnerCopySurfaces(mathSp, base) {
  const topicRows = Array.isArray(mathSp?.topicRecommendations) ? mathSp.topicRecommendations : [];
  const shortRows = Array.isArray(base?.patternDiagnostics?.subjects?.math?.rows)
    ? base.patternDiagnostics.subjects.math.rows
    : [];
  const shortByKey = new Map(shortRows.map((r) => [String(r.topicRowKey || r.topicKey || ""), r]));

  return topicRows
    .filter((tr) => (Number(tr?.questions) || 0) > 0)
    .map((tr) => {
      const topicKey = String(tr?.topicRowKey || tr?.topicKey || "");
      const shortRow = shortByKey.get(topicKey) || tr;
      const row = {
        ...shortRow,
        ...tr,
        subjectLabelHe: "מתמטיקה",
        label: tr.displayName || shortRow.label,
        displayName: tr.displayName || shortRow.displayName,
        learningPatternDecision: tr.learningPatternDecision,
        engineDecisionContract: tr.engineDecisionContract || tr.learningPatternDecision?.engineDecisionContract,
      };
      const explain = resolveParentExplainRowCopy(row);
      const narrative = buildTopicRecommendationNarrative(tr);
      return {
        topicKey,
        displayName: tr.displayName,
        questions: tr.questions,
        accuracy: tr.accuracy,
        engineDecision: tr.engineDecisionContract?.engineDecision || tr.learningPatternDecision?.engineDecisionContract?.engineDecision,
        detectedPattern: tr.engineDecisionContract?.detectedPattern || tr.learningPatternDecision?.engineDecisionContract?.detectedPattern,
        templateId: tr.learningPatternDecision?.templateId,
        shortReport: buildLpdSafeTopicInsightLineHe(row) || null,
        topicExplain: explain.explainSections,
        primaryFinding: explain.primaryFinding || null,
        recommendationCard: {
          recommendedStepLabelHe: tr.recommendedStepLabelHe || null,
          parentVisibleFinding: tr.parentVisibleFinding || null,
          interventionPlanHe: tr.interventionPlanHe || null,
          doNowHe: tr.doNowHe || null,
          cautionLineHe: tr.cautionLineHe || null,
        },
        detailedReport: narrative,
        parentLetterTopicNarrative: narrative,
      };
    });
}

function assertNoInternalTerms(text, label) {
  for (const frag of INTERNAL_FORBIDDEN) {
    assert.doesNotMatch(String(text || ""), new RegExp(frag, "i"), `${label} must not contain internal term: ${frag}`);
  }
}

/** @param {object} reportApiBody */
async function buildReports(reportApiBody) {
  return runWithParentReportRebuildLock(async () => {
    const dbInput = buildReportInputFromDbData(reportApiBody, { period: "custom", timezone: "UTC" });
    const playerName = String(dbInput.student?.name || "").trim() || "Student";
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
    globalThis.window = globalThis;
    store.set("mleo_player_name", playerName);
    seedLocalStorageFromDbReportInput(store, dbInput);
    const from = String(dbInput.range?.from || reportApiBody.fromDate || "").slice(0, 10);
    const to = String(dbInput.range?.to || reportApiBody.toDate || "").slice(0, 10);
    const base = generateParentReportV2(playerName, "custom", from, to);
    if (!base) return null;
    applyParentReportGamificationOverlay(base, reportApiBody);
    applyServerParentFacingAuthorityToClientReport(base, reportApiBody);
    applyTopicEngineParentFacingInsights(base, reportApiBody);
    base._reportApiPayload = reportApiBody;
    applyBridgeProvenanceToGeneratedReport(base, dbInput, reportApiBody);
    syncReportVisiblePracticeFromServer(base, { apiPayload: reportApiBody, dbInput });
    const detailed = buildDetailedParentReportFromBaseReport(base, { playerName, period: "custom" });
    return { base, detailed };
  });
}

async function resolveStudent(supabase, username) {
  const un = String(username || "").trim().toLowerCase();
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id,login_username,is_active")
    .eq("login_username", un)
    .eq("is_active", true)
    .limit(1);
  if (!codes?.[0]?.student_id) return null;
  const { data: row } = await supabase
    .from("students")
    .select("id,full_name,grade_level,is_active,leo_number")
    .eq("id", codes[0].student_id)
    .maybeSingle();
  return row?.id ? { ...row, login_username: un } : null;
}

function topicContractsFromSp(sp) {
  return (sp?.topicRecommendations || []).map((tr) => {
    const edc = tr?.[EDC_CONTRACT_KEY] || tr?.learningPatternDecision?.[EDC_CONTRACT_KEY] || null;
    return {
      topicKey: tr?.topicRowKey || tr?.topicKey,
      engineDecision: edc?.engineDecision,
      detectedPattern: edc?.detectedPattern,
      recommendedAction: edc?.recommendedAction,
      parentSafeFinding: edc?.parentSafeFinding,
      evidenceStrength: edc?.evidenceStrength,
    };
  });
}

function assertNoLegacy(text, label) {
  for (const frag of LEGACY_FORBIDDEN) {
    assert.doesNotMatch(String(text || ""), new RegExp(frag), `${label} must not contain legacy: ${frag}`);
  }
}

async function verifyCase(supabase, { label, username, from, to, assertFn }) {
  const student = await resolveStudent(supabase, username);
  assert.ok(student?.id, `${label}: student ${username} not found`);

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const reportApiBody = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  reportApiBody.fromDate = from;
  reportApiBody.toDate = to;

  const reports = await buildReports(reportApiBody);
  assert.ok(reports?.detailed, `${label}: failed to build detailed report`);
  const { base, detailed } = reports;
  const mathSp = (detailed.subjectProfiles || []).find((s) => String(s?.subject) === "math") || null;
  assert.ok(mathSp, `${label}: math subject profile missing`);

  const shortMath = base?.patternDiagnostics?.subjects?.math || null;
  assert.ok(shortMath?.summaryHe, `${label}: short report math subject summary missing`);

  const subjectContract = mathSp[SP_SUBJECT_ENGINE_CONTRACT] || null;
  const shortContract = shortMath?.[SP_SUBJECT_ENGINE_CONTRACT] || null;
  const letter = buildSubjectParentLetter(mathSp);
  const rollupText = [
    mathSp.summaryHe,
    letter.opening,
    letter.diagnosisHe,
    letter.homeAction,
    letter.closing,
  ]
    .filter(Boolean)
    .join(" | ");

  const trace = {
    student: username,
    range: { from, to },
    topicContracts: topicContractsFromSp(mathSp),
    topicOwnerCopySurfaces: collectTopicOwnerCopySurfaces(mathSp, base),
    subjectEngineDecisionContract: subjectContract,
    shortReportSubjectSummary: {
      summaryHe: shortMath.summaryHe || null,
      renderSource: shortMath.subjectSummaryRenderSource || null,
      templateId: shortMath.subjectSummaryTemplateId || null,
      decisionCode: shortMath.subjectSummaryDecisionCode || null,
      subjectEngineDecisionContract: shortContract,
    },
    renderSource: letter.renderSource || null,
    summarySlots: letter.summarySlots || subjectContract?.summarySlots || null,
    subjectRollup: {
      summaryHe: mathSp.summaryHe || null,
      subjectDiagnosticRestraintHe: mathSp.subjectDiagnosticRestraintHe || null,
    },
    subjectLetter: {
      opening: letter.opening || null,
      diagnosisHe: letter.diagnosisHe || null,
      homeAction: letter.homeAction || null,
      closing: letter.closing || null,
      renderSource: letter.renderSource || null,
    },
    combinedRenderText: rollupText,
  };

  console.log(`\n========== ${label} (${username} ${from} → ${to}) ==========\n`);
  console.log(JSON.stringify(trace, null, 2));

  assertFn({ mathSp, subjectContract, shortMath, shortContract, letter, rollupText, trace, base });
  for (const surf of trace.topicOwnerCopySurfaces || []) {
    const texts = [
      surf.shortReport,
      surf.primaryFinding,
      ...(surf.topicExplain ? Object.values(surf.topicExplain) : []),
      ...(surf.recommendationCard ? Object.values(surf.recommendationCard) : []),
      ...(surf.detailedReport ? Object.values(surf.detailedReport) : []),
    ].filter(Boolean);
    for (const text of texts) {
      assertNoInternalTerms(text, `${label} topic ${surf.topicKey}`);
      const allowEarly =
        surf.templateId === "initial_topic_data" ||
        surf.engineDecision === "early_direction_only" ||
        (Number(surf.questions) || 0) <= 2;
      if (!allowEarly) assertNoLegacy(text, `${label} topic ${surf.topicKey}`);
      else {
        for (const frag of LEGACY_FORBIDDEN.filter((f) => f !== "עדיין מוקדם")) {
          assert.doesNotMatch(String(text || ""), new RegExp(frag), `${label} topic ${surf.topicKey} legacy: ${frag}`);
        }
      }
    }
  }
  console.log(`\n✓ ${label} acceptance passed\n`);
  return trace;
}

async function main() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  await verifyCase(supabase, {
    label: "OMER math",
    username: "omer",
    from: "2025-09-01",
    to: "2026-07-04",
    assertFn: ({ subjectContract, shortMath, shortContract, letter, rollupText, mathSp, trace }) => {
      assert.ok(subjectContract, "subjectEngineDecisionContract missing");
      assert.equal(subjectContract.subjectDecision, "multiple_topic_gaps");
      assert.equal(subjectContract.priorityTopics?.[0]?.topicKey, "fractions::grade:g5");
      assert.equal(subjectContract.priorityTopics?.[1]?.topicKey, "multiplication::grade:g5");
      assert.equal(subjectContract.recommendedSubjectAction, "remediate_priority_topics_same_level");
      assert.equal(subjectContract.blockedLegacySummary, true);
      assert.equal(letter.renderSource, "subjectEngineDecisionContract");
      assert.equal(shortMath.subjectSummaryRenderSource, RENDER_SOURCE_SUBJECT_ENGINE);
      assert.equal(shortContract?.subjectDecision, "multiple_topic_gaps");
      assert.equal(shortMath.summaryHe, mathSp.summaryHe);
      assert.match(String(shortMath.summaryHe || ""), /בולטים כמה נושאים שדורשים חיזוק/);
      assert.match(String(shortMath.summaryHe || ""), /שברים/);
      assert.match(String(shortMath.summaryHe || ""), /השוואה לפי מונה בלבד/);
      assert.match(String(letter.diagnosisHe || ""), /כפל/);
      assert.match(String(letter.diagnosisHe || ""), /אותם זוגות שגויים/);
      assert.match(String(letter.homeAction || ""), /בשבוע הקרוב מומלץ לתרגל/);
      assert.doesNotMatch(String(letter.homeAction || ""), /remediate/i);
      assert.doesNotMatch(String(rollupText || ""), /כדאי לחזק את הנושא\. מבוסס/);
      assert.ok(
        subjectContract.strongestDetectedPatterns?.includes("השוואה לפי מונה בלבד"),
        "missing fractions pattern",
      );
      assert.ok(
        subjectContract.strongestDetectedPatterns?.includes("אותם זוגות שגויים"),
        "missing multiplication pattern",
      );
      assert.ok(String(rollupText || "").trim().length > 0, "subject summary/letter must not be empty");
      assertNoLegacy(rollupText, "OMER rollup");
      assertNoLegacy(shortMath.summaryHe, "OMER short subject summary");
      const positiveAddition = (trace.topicOwnerCopySurfaces || []).find(
        (s) => String(s.topicKey || "").includes("addition") && s.templateId === "positive_observed",
      );
      if (positiveAddition?.recommendationCard?.cautionLineHe) {
        assert.match(
          String(positiveAddition.recommendationCard.cautionLineHe),
          /גם כשנראית הצלחה/u,
          "positive caution must use owner RECOMMENDATION_CAUTION",
        );
        assert.doesNotMatch(
          String(positiveAddition.recommendationCard.cautionLineHe),
          /עדיין לא קובעים כיוון חזק/u,
          "positive caution must not use legacy gated text",
        );
      }
    },
  });

  await verifyCase(supabase, {
    label: "Aaa7 math",
    username: "aaa7",
    from: "2026-07-04",
    to: "2026-07-04",
    assertFn: ({ subjectContract, shortMath, shortContract, letter, trace }) => {
      assert.ok(subjectContract, "subjectEngineDecisionContract missing");
      const additionTopic = trace.topicContracts.find((t) =>
        String(t.topicKey || "").includes("addition"),
      );
      assert.equal(additionTopic?.engineDecision, ED_CLEAR_TOPIC_GAP);
      assert.equal(additionTopic?.recommendedAction, RA_REMEDIATE_SAME_LEVEL);
      const p0 = subjectContract.priorityTopics?.[0];
      assert.ok(String(p0?.topicKey || "").includes("addition"), "priority topic must be addition");
      assert.ok(
        subjectContract.subjectDecision === "focused_strengthening_needed" ||
          subjectContract.recommendedSubjectAction === "remediate_priority_topics_same_level",
        "expected focused strengthening / remediate priority",
      );
      assert.notEqual(additionTopic?.recommendedAction, "maintain");
      assert.equal(letter.renderSource, "subjectEngineDecisionContract");
      assert.equal(shortMath.subjectSummaryRenderSource, RENDER_SOURCE_SUBJECT_ENGINE);
      assert.equal(shortContract?.subjectDecision, "focused_strengthening_needed");
      assert.match(String(shortMath.summaryHe || ""), /בולט כרגע נושא אחד שדורש חיזוק/);
      assert.match(String(shortMath.summaryHe || ""), /חיבור/);
      assert.match(String(shortMath.summaryHe || ""), /20%/);
      assert.match(String(shortMath.summaryHe || ""), /מומלץ לחזק את הנושא לפני שממשיכים/u);
      assert.match(String(letter.homeAction || ""), /בשבוע הקרוב מומלץ לתרגל/);
      assert.doesNotMatch(String(letter.homeAction || ""), /remediate/i);
      assert.doesNotMatch(String(letter.homeAction || ""), /maintain/i);
    },
  });

  console.log("subject-engine-decision-live-verify: ALL PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
