#!/usr/bin/env node
/**
 * Full visible-section matrix for server-authoritative parent report practice sync.
 * Run: node --env-file=.env.local scripts/qa/verify-parent-report-visible-sections.mjs
 */
import { createClient } from "@supabase/supabase-js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";
import { applyBridgeProvenanceToGeneratedReport } from "../../lib/learning-supabase/bridge-report-provenance.js";
import { syncReportVisiblePracticeFromServer } from "../../lib/learning/report-visible-practice-sync.js";
import {
  buildNormalizedSubjectPracticeFromApiPayload,
  NORMALIZED_SUBJECT_IDS,
  practicedSubjectCountFromReport,
  SUMMARY_FIELD_MAP,
} from "../../lib/learning/normalized-subject-practice.js";
import {
  SUBJECT_LABEL_BY_ID,
  buildSubjectEvidenceCoverageLines,
} from "../../utils/parent-report-language/subject-evidence-policy.js";
import { attachParentContextEvidenceQuality, allowsStrongParentDiagnosisAtStudent } from "../../lib/learning/evidence-quality.js";
import { buildParentFacingBlocks } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import {
  deriveParentDataPresenceForDiagnosticsView,
  deriveRawMetricStrengthLinesHe,
} from "../../utils/parent-data-presence.js";
import { applyServerParentFacingAuthorityToClientReport } from "../../lib/parent-server/parent-facing-report-authority.js";

const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";
const SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "moledet_geography"];
const FORBIDDEN_MULTI_SUBJECT_EXPLAINER = "על פני המקצועות";

function parseIsoDate(s) {
  return new Date(`${s}T00:00:00.000Z`);
}

async function resolveStudent(supabase, login) {
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username")
    .eq("login_username", login.toLowerCase())
    .eq("is_active", true)
    .limit(1);
  const studentId = codes?.[0]?.student_id;
  if (!studentId) throw new Error(`No student for login ${login}`);
  const { data: row } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id")
    .eq("id", studentId)
    .single();
  if (!row || row.parent_id !== QA_PARENT_ID) throw new Error(`Student ${login} wrong parent`);
  return {
    id: row.id,
    full_name: row.full_name,
    grade_level: row.grade_level,
    is_active: true,
  };
}

function sumTopicQuestions(topicMap) {
  return Object.values(topicMap || {}).reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row?.questions) || 0)),
    0,
  );
}

function makeStaleV2Report(apiPayload) {
  return {
    summary: {
      totalQuestions: 99,
      mathQuestions: 0,
      geometryQuestions: 99,
      englishQuestions: 0,
      scienceQuestions: 0,
      hebrewQuestions: 0,
      moledetGeographyQuestions: 0,
      diagnosticOverviewHe: {
        notPracticedSubjectsSummaryHe:
          "מקצועות שלא תורגלו בתקופה: חשבון, אנגלית, מדעים, עברית, מולדת וגאוגרפיה.",
        practicedSubjectsSummaryHe: "המקצועות שתורגלו בתקופה: גאומטריה.",
        strongestAreaLineHe: "גאומטריה: נושא חזק",
        mainFocusAreaLineHe: null,
        readyForProgressPreviewHe: [],
        requiresAttentionPreviewHe: [],
      },
    },
    dailyActivity: [
      {
        date: "2026-03-30",
        timeMinutes: 99,
        questions: 99,
        mathTopics: 0,
        geometryTopics: 3,
        englishTopics: 0,
        scienceTopics: 0,
        hebrewTopics: 0,
        moledetGeographyTopics: 0,
      },
    ],
    mathOperations: {},
    geometryTopics: { stale_only: { questions: 99, accuracy: 90, timeMinutes: 99 } },
    englishTopics: {},
    scienceTopics: {},
    hebrewTopics: {},
    moledetGeographyTopics: {},
    allBySubject: { geometry_stale_only: { questions: 99 } },
    rawMetricStrengthsHe: [],
    patternDiagnostics: { subjects: {} },
    diagnosticEngineV2: { units: [] },
  };
}

function buildSyncedReport(apiPayload, dbInput) {
  const report = makeStaleV2Report(apiPayload);
  report.parentFacing = buildParentFacingBlocks(apiPayload);
  applyServerParentFacingAuthorityToClientReport(report, apiPayload);
  applyBridgeProvenanceToGeneratedReport(report, dbInput, apiPayload);
  syncReportVisiblePracticeFromServer(report, { apiPayload, dbInput });
  return report;
}

function buildDiagnosticsView(report) {
  if (report?._parentFacingAuthority === "server") {
    return {
      mode: "new",
      rows: [],
      legacyRecommendations: [],
      presence: deriveParentDataPresenceForDiagnosticsView(report, {
        mode: "new",
        rows: [],
        legacyRecommendations: [],
      }),
    };
  }
  return null;
}

function normalizedCount(normalized, subject) {
  return Math.max(0, Math.floor(Number(normalized?.[subject]?.questions) || 0));
}

function checkVisibleSections(name, apiPayload, dbInput, report, expectations = {}) {
  const issues = [];
  const normalized = buildNormalizedSubjectPracticeFromApiPayload(apiPayload);
  const summary = report.summary || {};
  const apiSummary = apiPayload.summary || {};
  const coverage = buildSubjectEvidenceCoverageLines(
    Object.fromEntries(
      NORMALIZED_SUBJECT_IDS.map((s) => [
        s === "moledet_geography" ? "moledet-geography" : s,
        normalizedCount(normalized, s),
      ]),
    ),
    SUBJECT_LABEL_BY_ID,
  );
  const diagnosticsView = buildDiagnosticsView(report);

  const section = (n, ok, detail) => {
    if (!ok) issues.push(`§${n}: ${detail}`);
  };

  // §1 Top summary
  section(
    1,
    (Number(summary.totalQuestions) || 0) > 0 || expectations.allowZeroTotal,
    `totalQuestions=${summary.totalQuestions}`,
  );

  // §2 מצב הנתונים
  if (expectations.noNotPracticedFor?.length) {
    for (const sid of expectations.noNotPracticedFor) {
      const label = SUBJECT_LABEL_BY_ID[sid];
      const line = `${label}: לא תורגל בתקופה שנבחרה`;
      if (coverage.notPracticedSubjectsHe.includes(line)) {
        section(2, false, `unexpected not-practiced line for ${sid}`);
      }
      const summaryLine = report.summary?.diagnosticOverviewHe?.notPracticedSubjectsSummaryHe || "";
      if (summaryLine.includes(label)) {
        section(2, false, `notPracticedSubjectsSummaryHe mentions ${sid}`);
      }
    }
  }
  if (expectations.mustNotPracticedFor?.length) {
    for (const sid of expectations.mustNotPracticedFor) {
      const label = SUBJECT_LABEL_BY_ID[sid];
      const summaryLine = report.summary?.diagnosticOverviewHe?.notPracticedSubjectsSummaryHe || "";
      section(2, summaryLine.includes(label), `expected ${sid} in notPracticed summary`);
    }
  }

  // §3-§5, §8 parentFacing (server blocks)
  const pf = report.parentFacing || {};
  if (expectations.expectParentFacingVolume) {
    section(3, Array.isArray(pf.insights), "insights array missing");
    section(4, pf.insights != null, "insights block missing");
    section(5, Array.isArray(pf.homeRecommendations), "homeRecommendations array missing");
    section(8, pf != null, "parentFacing missing");
  }

  // §6 איפה נראו תוצאות טובות
  if (expectations.minStrengthLines != null) {
    const strengths = report.rawMetricStrengthsHe || [];
    section(
      6,
      strengths.length >= expectations.minStrengthLines,
      `rawMetricStrengthsHe length ${strengths.length} < ${expectations.minStrengthLines}`,
    );
    const derived = deriveRawMetricStrengthLinesHe(summary);
    section(
      6,
      derived.length === strengths.length,
      "rawMetricStrengthsHe diverges from summary-derived strengths",
    );
  }

  // §7 Six subject cards
  for (const subject of SUBJECTS) {
    const field = SUMMARY_FIELD_MAP[subject].questions;
    const card = Math.max(0, Math.floor(Number(summary[field]) || 0));
    const norm = normalizedCount(normalized, subject);
    section(7, card === norm, `${subject} card=${card} normalized=${norm}`);
    const exp = expectations.subjects?.[subject];
    if (exp?.min != null) section(7, card >= exp.min, `${subject} card=${card} < min ${exp.min}`);
    if (exp?.zero) section(7, card === 0, `${subject} expected zero card=${card}`);
  }

  // §9 Subject progress blocks (topic maps)
  const topicMaps = {
    math: report.mathOperations,
    geometry: report.geometryTopics,
    english: report.englishTopics,
    science: report.scienceTopics,
    hebrew: report.hebrewTopics,
    moledet_geography: report.moledetGeographyTopics,
  };
  for (const subject of SUBJECTS) {
    const norm = normalizedCount(normalized, subject);
    const topicSum = sumTopicQuestions(topicMaps[subject]);
    if (norm > 0) {
      section(9, topicSum > 0, `${subject} practiced but topic map empty`);
      section(9, topicSum <= norm, `${subject} topic sum ${topicSum} > subject ${norm}`);
    } else {
      section(9, topicSum === 0, `${subject} unpracticed but topic sum ${topicSum}`);
    }
  }

  // §10 Daily activity graph
  if (expectations.expectDailyActivity) {
    section(10, Array.isArray(report.dailyActivity) && report.dailyActivity.length > 0, "dailyActivity empty");
    const apiDaily = Array.isArray(apiPayload.dailyActivity) ? apiPayload.dailyActivity : [];
    section(
      10,
      report.dailyActivity.length === apiDaily.length,
      `dailyActivity length ${report.dailyActivity.length} != api ${apiDaily.length}`,
    );
    const apiAnswerSum = apiDaily.reduce((s, d) => s + (Number(d.answers) || 0), 0);
    const chartAnswerSum = report.dailyActivity.reduce((s, d) => s + (Number(d.questions) || 0), 0);
    section(10, chartAnswerSum === apiAnswerSum, `daily questions ${chartAnswerSum} != api ${apiAnswerSum}`);
  }

  // §11 Daily subject activity graph
  if (expectations.expectDailyActivity) {
    const subjectChartKeys = {
      math: "mathTopics",
      geometry: "geometryTopics",
      english: "englishTopics",
      science: "scienceTopics",
      hebrew: "hebrewTopics",
      moledet_geography: "moledetGeographyTopics",
    };
    for (const subject of SUBJECTS) {
      const norm = normalizedCount(normalized, subject);
      if (norm <= 0) continue;
      const chartKey = subjectChartKeys[subject];
      const anyDay = (report.dailyActivity || []).some((d) => (Number(d[chartKey]) || 0) > 0);
      section(11, anyDay, `${subject} practiced (${norm}) but no daily ${chartKey} > 0`);
    }
  }

  // §12 Six-subject summary graph
  const chartRows = NORMALIZED_SUBJECT_IDS.map((subject) => {
    const field = SUMMARY_FIELD_MAP[subject].questions;
    return Math.max(0, Math.floor(Number(summary[field]) || 0));
  });
  const chartSum = chartRows.reduce((a, b) => a + b, 0);
  section(
    12,
    chartSum === NORMALIZED_SUBJECT_IDS.reduce((s, id) => s + normalizedCount(normalized, id), 0),
    "six-subject chart totals diverge from normalized",
  );

  // §13 Subject/topic detail graphs
  for (const subject of SUBJECTS) {
    const norm = normalizedCount(normalized, subject);
    const topics = Object.values(topicMaps[subject] || {});
    for (const t of topics) {
      section(13, (Number(t.questions) || 0) > 0, `${subject} topic row with zero questions`);
      section(13, (Number(t.accuracy) || 0) >= 0 && (Number(t.accuracy) || 0) <= 100, `${subject} bad accuracy`);
    }
    if (norm === 0) section(13, topics.length === 0, `${subject} has topic rows without practice`);
  }

  // §14 Recommendations block presence
  if (expectations.expectMultiSubjectPractice) {
    const practiced = practicedSubjectCountFromReport(report);
    section(14, practiced >= 2, `practiced subjects ${practiced} < 2`);
    const explainer = diagnosticsView?.presence?.recommendationsExplainerHe || "";
    section(
      14,
      !explainer.includes(FORBIDDEN_MULTI_SUBJECT_EXPLAINER),
      `forbidden explainer when multi-subject practice: ${explainer.slice(0, 80)}`,
    );
  }
  if (expectations.allowZeroTotal) {
    section(14, true, "skipped");
  }

  // §15 PDF / quick report object (same synced fields)
  section(15, report._practiceVisibilityAuthority === "server", "missing practice authority marker");
  section(
    15,
    report._normalizedSubjectPractice != null,
    "missing _normalizedSubjectPractice on report object",
  );
  section(
    15,
    Number(summary.totalQuestions) === chartSum || expectations.allowZeroTotal,
    "PDF path summary totals inconsistent",
  );

  // Diagnostic conservatism
  if (expectations.diagnosticAnswersZero) {
    section(
      "diag",
      Number(apiSummary.diagnosticAnswers) === 0,
      `diagnosticAnswers=${apiSummary.diagnosticAnswers}`,
    );
  }
  if (expectations.noStrongDiagnosis) {
    section(
      "diag",
      !allowsStrongParentDiagnosisAtStudent(apiPayload),
      "strong diagnosis should remain blocked",
    );
  }

  // API payload hygiene
  section("api", apiPayload.dailyActivityBySubject != null || expectations.allowZeroTotal, "dailyActivityBySubject missing");
  section("api", apiPayload._dailyBySubject === undefined, "_dailyBySubject leaked in stripped payload");

  return {
    name,
    pass: issues.length === 0,
    issues,
    summary: {
      totalQuestions: summary.totalQuestions,
      normalized,
      cardSummary: Object.fromEntries(
        SUBJECTS.map((s) => [s, Math.max(0, Math.floor(Number(summary[SUMMARY_FIELD_MAP[s].questions]) || 0))]),
      ),
      notPracticedSummary: report.summary?.diagnosticOverviewHe?.notPracticedSubjectsSummaryHe,
      strengthLines: (report.rawMetricStrengthsHe || []).length,
      dailyDays: report.dailyActivity?.length || 0,
      diagnosticsExplainer: diagnosticsView?.presence?.recommendationsExplainerHe,
      practicedSubjects: practicedSubjectCountFromReport(report),
    },
  };
}

async function loadCase(supabase, student, from, to) {
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(from),
    parseIsoDate(to),
    { includeParentActivities: true },
  );
  const pub = stripInternalReportPayloadFields(raw);
  const withQuality = attachParentContextEvidenceQuality(pub);
  withQuality.parentFacing = buildParentFacingBlocks(withQuality);
  const dbInput = buildReportInputFromDbData(withQuality, { period: "custom", timezone: "UTC" });
  const report = buildSyncedReport(withQuality, dbInput);
  return { apiPayload: withQuality, dbInput, report };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const cases = [
    {
      label: "AAA1-March-full",
      login: "aaa1",
      from: "2026-03-01",
      to: "2026-03-31",
      expectations: {
        expectDailyActivity: true,
        expectMultiSubjectPractice: true,
        expectParentFacingVolume: true,
        minStrengthLines: 2,
        noNotPracticedFor: ["math", "geometry", "english", "hebrew", "science"],
        mustNotPracticedFor: ["moledet-geography"],
        diagnosticAnswersZero: true,
        noStrongDiagnosis: true,
        subjects: {
          math: { min: 100 },
          geometry: { min: 50 },
          english: { min: 50 },
          hebrew: { min: 50 },
          science: { min: 50 },
          moledet_geography: { zero: true },
        },
      },
    },
    {
      label: "AAA5-second-student",
      login: "aaa5",
      from: "2026-03-24",
      to: "2026-03-30",
      expectations: {
        expectDailyActivity: true,
        expectMultiSubjectPractice: false,
        diagnosticAnswersZero: true,
        noStrongDiagnosis: true,
        subjects: {
          geometry: { min: 1 },
        },
      },
    },
    {
      label: "AAA3-one-day",
      login: "aaa3",
      from: "2026-03-15",
      to: "2026-03-15",
      expectations: {
        expectDailyActivity: true,
        diagnosticAnswersZero: true,
        noNotPracticedFor: ["math", "science"],
        subjects: {
          math: { min: 10 },
          science: { min: 10 },
          geometry: { zero: true },
        },
      },
    },
    {
      label: "AAA1-negative-future",
      login: "aaa1",
      from: "2026-07-01",
      to: "2026-07-07",
      expectations: {
        allowZeroTotal: true,
        mustNotPracticedFor: [
          "math",
          "geometry",
          "english",
          "hebrew",
          "science",
          "moledet-geography",
        ],
        subjects: {
          math: { zero: true },
          geometry: { zero: true },
          english: { zero: true },
          hebrew: { zero: true },
          science: { zero: true },
          moledet_geography: { zero: true },
        },
      },
    },
  ];

  const results = [];
  for (const c of cases) {
    const student = await resolveStudent(supabase, c.login);
    const loaded = await loadCase(supabase, student, c.from, c.to);
    results.push(
      checkVisibleSections(`${c.label} ${c.from}..${c.to}`, loaded.apiPayload, loaded.dbInput, loaded.report, c.expectations),
    );
  }

  console.log("\n=== Parent report visible-section verification ===\n");
  let failed = 0;
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} — ${r.name}`);
    console.log(`  cards: ${JSON.stringify(r.summary.cardSummary)}`);
    console.log(`  normalized: ${JSON.stringify(r.summary.normalized)}`);
    console.log(`  notPracticed: ${r.summary.notPracticedSummary || "(none)"}`);
    console.log(`  strengths: ${r.summary.strengthLines} dailyDays: ${r.summary.dailyDays}`);
    console.log(`  diagnosticsExplainer: ${r.summary.diagnosticsExplainer || "(none)"}`);
    if (r.issues.length) {
      failed += 1;
      for (const issue of r.issues) console.log(`  ! ${issue}`);
    }
    console.log("");
  }

  console.log(`\n${failed ? "FAILED" : "ALL PASSED"} (${results.length - failed}/${results.length})`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
