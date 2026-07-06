#!/usr/bin/env node
/**
 * Verify detailed report grade filter — before/after metrics for OMER.
 * Run: node --env-file=.env.local --env-file=.env.e2e.local scripts/parent-report-detailed-grade-filter-verify.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from "./truth-gates/lib/env.mjs";

loadEnvFiles();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const STUDENT_ID = process.env.PARENT_REPORT_DOM_STUDENT_ID || "74c30e48-895b-4f4c-a65a-888f656f54f6";
const RANGE = {
  from: process.env.PARENT_REPORT_DOM_FROM || "2025-09-01",
  to: process.env.PARENT_REPORT_DOM_TO || "2026-07-04",
};

const { aggregateParentReportPayload } = await import(u("lib/parent-server/report-data-aggregate.server.js"));
const { buildReportInputFromDbData } = await import(u("lib/learning-supabase/report-data-adapter.js"));
const { seedLocalStorageFromDbReportInput } = await import(u("lib/learning-supabase/seed-db-report-local-storage.js"));
const { generateParentReportV2 } = await import(u("utils/parent-report-v2.js"));
const { buildDetailedParentReportFromBaseReport, attachOutOfGradeTransparencyFromRawBase } =
  await import(u("utils/detailed-parent-report.js"));
const { buildRegularReportViewModel } = await import(u("lib/parent-ui/parent-report-regular-display.js"));
const { applyParentReportGamificationOverlay } = await import(u("lib/learning-shared/student-account-state-view.js"));
const { applyServerParentFacingAuthorityToClientReport } = await import(
  u("lib/parent-server/parent-facing-report-authority.js"),
);
const { applyTopicEngineParentFacingInsights } = await import(u("utils/parent-report-engine-insights-he.js"));
const { applyBridgeProvenanceToGeneratedReport } = await import(u("lib/learning-supabase/bridge-report-provenance.js"));
const { syncReportVisiblePracticeFromServer } = await import(u("lib/learning/report-visible-practice-sync.js"));
const { attachDiagnosticEngineV3 } = await import(u("utils/diagnostic-engine-v3/attach-diagnostic-engine-v3.js"));

function makeStorageShim(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

function buildBaseReport(student, api, dbInput) {
  const store = new Map();
  globalThis.localStorage = makeStorageShim(store);
  globalThis.window = globalThis;
  const playerName = String(student.full_name || student.login_username || "Student").trim();
  store.set("mleo_player_name", playerName);
  seedLocalStorageFromDbReportInput(store, dbInput);
  const base = generateParentReportV2(playerName, "custom", RANGE.from, RANGE.to);
  attachDiagnosticEngineV3(base, {
    probeEvidence: api?.probeEvidence ?? null,
    startMs: dbInput.range?.startMs,
    endMs: dbInput.range?.endMs,
  });
  applyParentReportGamificationOverlay(base, api);
  applyServerParentFacingAuthorityToClientReport(base, api);
  applyTopicEngineParentFacingInsights(base, api);
  base._reportApiPayload = api;
  applyBridgeProvenanceToGeneratedReport(base, dbInput, api);
  syncReportVisiblePracticeFromServer(base, { apiPayload: api, dbInput });
  return base;
}

function subjectProfile(detailed, sid) {
  return (detailed?.subjectProfiles || []).find((s) => s.subject === sid) || null;
}

function topicRec(detailed, sid, namePart) {
  const sp = subjectProfile(detailed, sid);
  return (sp?.topicRecommendations || []).find((r) =>
    String(r.displayName || r.narrativeTitleHe || "").includes(namePart),
  );
}

function tierTopics(detailed, sid) {
  const sp = subjectProfile(detailed, sid);
  const groups = sp?.topicGroupsByTier;
  if (!groups || typeof groups !== "object") return [];
  const out = [];
  for (const [tierKey, topics] of Object.entries(groups)) {
    for (const t of Array.isArray(topics) ? topics : []) {
      out.push({
        tierKey,
        title: t.narrativeTitleHe || t.displayName,
        questions: t.questions,
        accuracy: t.accuracy,
      });
    }
  }
  return out;
}

function metricPair(label, before, after, beforeSource, afterSource) {
  return {
    area: label,
    before,
    after,
    sourceBefore: beforeSource,
    sourceAfter: afterSource,
  };
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL,
    process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data: student, error: stErr } = await supabase.from("students").select("*").eq("id", STUDENT_ID).single();
  if (stErr || !student) throw stErr || new Error("student_not_found");

  const fromDate = new Date(`${RANGE.from}T00:00:00.000Z`);
  const toDate = new Date(`${RANGE.to}T23:59:59.999Z`);
  const api = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  if (!api?.ok) throw new Error(api?.error || "aggregate_failed");

  const dbInput = buildReportInputFromDbData(api, { period: "custom", timezone: "UTC" });
  const base = buildBaseReport(student, api, dbInput);
  const filtered = buildRegularReportViewModel(base)?.report ?? base;

  const detailedBefore = buildDetailedParentReportFromBaseReport(base, { period: "custom" });
  const detailedAfter = attachOutOfGradeTransparencyFromRawBase(
    buildDetailedParentReportFromBaseReport(filtered, { period: "custom" }),
    base,
  );

  const transparency = detailedAfter?.outOfGradePracticeTransparency;
  const transparencyRows = [
    ...(transparency?.advancedPractice || []),
    ...(transparency?.foundationPractice || []),
  ];
  const transparencyQuestionSum = transparencyRows.reduce((acc, r) => acc + (Number(r.questions) || 0), 0);
  const centralMathQ = Number(subjectProfile(detailedAfter, "math")?.subjectQuestionCount) || 0;
  const centralTotalQ = Number(detailedAfter?.overallSnapshot?.totalQuestions) || 0;

  const rows = [];

  const addSubject = (label, sid) => {
    const b = subjectProfile(detailedBefore, sid);
    const a = subjectProfile(detailedAfter, sid);
    rows.push(
      metricPair(
        `${label} — שאלות`,
        Number(b?.subjectQuestionCount) || 0,
        Number(a?.subjectQuestionCount) || 0,
        "buildSubjectCoverage → baseReport.summary (unfiltered)",
        "buildSubjectCoverage → filtered summary via buildRegularReportViewModel",
      ),
    );
    rows.push(
      metricPair(
        `${label} — דיוק`,
        `${Number(b?.subjectAccuracy) || 0}%`,
        `${Number(a?.subjectAccuracy) || 0}%`,
        "buildSubjectCoverage → baseReport.summary (unfiltered)",
        "buildSubjectCoverage → filtered summary via buildRegularReportViewModel",
      ),
    );
  };

  addSubject("מתמטיקה", "math");
  addSubject("אנגלית", "english");
  addSubject("עברית", "hebrew");

  const mathTopics = [
    { label: "שברים", part: "שבר" },
    { label: "כפל", part: "כפל" },
    { label: "עשרוניים", part: "עשר" },
    { label: "חיסור", part: "חיס" },
    { label: "חיבור", part: "חיב" },
  ];
  for (const { label, part } of mathTopics) {
    const b = topicRec(detailedBefore, "math", part);
    const a = topicRec(detailedAfter, "math", part);
    rows.push(
      metricPair(
        `${label} — שאלות`,
        Number(b?.questions) || 0,
        Number(a?.questions) || 0,
        "topicRecommendations ← filterCoreV2Units + unfiltered topicMap metrics",
        "topicRecommendations ← filterCoreV2Units + filtered topicMap",
      ),
    );
    rows.push(
      metricPair(
        `${label} — דיוק`,
        `${Math.round(Number(b?.accuracy) || 0)}%`,
        `${Math.round(Number(a?.accuracy) || 0)}%`,
        "topicRecommendations ← filterCoreV2Units + unfiltered topicMap metrics",
        "topicRecommendations ← filterCoreV2Units + filtered topicMap",
      ),
    );
  }

  const tierBefore = tierTopics(detailedBefore, "hebrew");
  const tierAfter = tierTopics(detailedAfter, "hebrew");
  for (const t of tierAfter.length ? tierAfter : tierBefore) {
    const b = tierBefore.find((x) => x.title === t.title) || { questions: 0, accuracy: 0 };
    const a = tierAfter.find((x) => x.title === t.title) || { questions: 0, accuracy: 0 };
    rows.push(
      metricPair(
        `topicGroupsByTier — ${t.title} — שאלות`,
        Number(b.questions) || 0,
        Number(a.questions) || 0,
        "topicGroupsByTier ← coreUnits + unfiltered topicMap",
        "topicGroupsByTier ← coreUnits + filtered topicMap",
      ),
    );
    rows.push(
      metricPair(
        `topicGroupsByTier — ${t.title} — דיוק`,
        `${Math.round(Number(b.accuracy) || 0)}%`,
        `${Math.round(Number(a.accuracy) || 0)}%`,
        "topicGroupsByTier ← coreUnits + unfiltered topicMap",
        "topicGroupsByTier ← coreUnits + filtered topicMap",
      ),
    );
  }

  const outDir = join(ROOT, "docs", "audits");
  mkdirSync(outDir, { recursive: true });
  const report = {
    studentId: STUDENT_ID,
    studentLabel: student.full_name || student.login_username,
    registeredGradeLevel: student.grade_level,
    registeredGradeKey: base.registeredGradeKey,
    range: RANGE,
    summaryUnfiltered: {
      mathQuestions: base.summary?.mathQuestions,
      mathAccuracy: base.summary?.mathAccuracy,
      englishQuestions: base.summary?.englishQuestions,
      englishAccuracy: base.summary?.englishAccuracy,
      hebrewQuestions: base.summary?.hebrewQuestions,
      hebrewAccuracy: base.summary?.hebrewAccuracy,
    },
    summaryFiltered: {
      mathQuestions: filtered.summary?.mathQuestions,
      mathAccuracy: filtered.summary?.mathAccuracy,
      englishQuestions: filtered.summary?.englishQuestions,
      englishAccuracy: filtered.summary?.englishAccuracy,
      hebrewQuestions: filtered.summary?.hebrewQuestions,
      hebrewAccuracy: filtered.summary?.hebrewAccuracy,
    },
    comparisonRows: rows,
    outOfGradeTransparency: {
      visible: Boolean(transparency && transparencyRows.length > 0),
      titleHe: transparency?.titleHe || null,
      advancedCount: (transparency?.advancedPractice || []).length,
      foundationCount: (transparency?.foundationPractice || []).length,
      totalOutOfGradeQuestions: transparencyQuestionSum,
      sampleRows: transparencyRows.slice(0, 8).map((r) => ({
        subjectLabelHe: r.subjectLabelHe,
        topicLabelHe: r.topicLabelHe,
        gradeLabelHe: r.gradeLabelHe,
        questions: r.questions,
        accuracy: r.accuracy,
        sourceLabelHe: r.sourceLabelHe,
      })),
      isolationCheck: {
        centralMathQuestions: centralMathQ,
        centralTotalQuestions: centralTotalQ,
        transparencyQuestionsNotInCentralTotal:
          transparencyQuestionSum > 0 && centralTotalQ < base.summary?.totalQuestions,
      },
    },
  };

  writeFileSync(join(outDir, "parent-report-detailed-grade-filter-verify.json"), JSON.stringify(report, null, 2));

  console.log("registeredGradeKey:", base.registeredGradeKey);
  console.log("summary unfiltered math:", base.summary?.mathQuestions, base.summary?.mathAccuracy);
  console.log("summary filtered math:", filtered.summary?.mathQuestions, filtered.summary?.mathAccuracy);
  console.log("rows:", rows.length);
  console.log(
    "outOfGrade transparency:",
    report.outOfGradeTransparency.visible,
    "rows:",
    report.outOfGradeTransparency.advancedCount + report.outOfGradeTransparency.foundationCount,
    "out-of-grade Q sum:",
    report.outOfGradeTransparency.totalOutOfGradeQuestions,
  );
  for (const r of rows.slice(0, 6)) {
    console.log(`${r.area}: ${r.before} → ${r.after}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
