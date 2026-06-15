#!/usr/bin/env node
/**
 * Verify parent report practice-count fix through UI/policy path.
 * Run: node --env-file=.env.local scripts/qa/verify-report-practice-counts.mjs
 */
import { createClient } from "@supabase/supabase-js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";
import { applyBridgeProvenanceToGeneratedReport } from "../../lib/learning-supabase/bridge-report-provenance.js";
import {
  buildSubjectEvidenceCoverageLines,
  SUBJECT_LABEL_BY_ID,
  subjectQuestionCountsFromPayload,
} from "../../utils/parent-report-language/subject-evidence-policy.js";
import { attachParentContextEvidenceQuality, allowsStrongParentDiagnosisAtStudent } from "../../lib/learning/evidence-quality.js";
import { buildParentFacingBlocks } from "../../lib/parent-server/parent-report-parent-facing.server.js";

const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";
const SUBJECTS = ["math", "geometry", "english", "hebrew", "science", "moledet_geography"];
const CANONICAL = {
  math: "math",
  geometry: "geometry",
  english: "english",
  hebrew: "hebrew",
  science: "science",
  moledet_geography: "moledet-geography",
};

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

const CARD_SUMMARY_FIELDS = Object.freeze({
  math: "mathQuestions",
  geometry: "geometryQuestions",
  english: "englishQuestions",
  hebrew: "hebrewQuestions",
  science: "scienceQuestions",
  moledet_geography: "moledetGeographyQuestions",
});

function subjectCardSummaryAfterBridge(pub, dbInput) {
  const fakeReport = {
    summary: {
      mathQuestions: adapterSubjectTotal(dbInput, "math"),
      geometryQuestions: adapterSubjectTotal(dbInput, "geometry"),
      englishQuestions: adapterSubjectTotal(dbInput, "english"),
      hebrewQuestions: adapterSubjectTotal(dbInput, "hebrew"),
      scienceQuestions: adapterSubjectTotal(dbInput, "science"),
      moledetGeographyQuestions: adapterSubjectTotal(dbInput, "moledet_geography"),
      totalQuestions: Number(pub.summary?.totalAnswers) || 0,
      totalCorrect: Number(pub.summary?.correctAnswers) || 0,
    },
  };
  applyBridgeProvenanceToGeneratedReport(fakeReport, dbInput, pub);
  return fakeReport.summary;
}

function cardCount(cardSummary, subject) {
  const field = CARD_SUMMARY_FIELDS[subject];
  return Math.max(0, Math.floor(Number(cardSummary?.[field]) || 0));
}

async function loadReport(supabase, student, from, to) {
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(from),
    parseIsoDate(to),
    { includeParentActivities: true },
  );
  const pub = stripInternalReportPayloadFields(raw);
  const withQuality = attachParentContextEvidenceQuality(pub);
  const dbInput = buildReportInputFromDbData(withQuality, { period: "custom", timezone: "UTC" });
  const policyCounts = subjectQuestionCountsFromPayload(withQuality);
  const coverage = buildSubjectEvidenceCoverageLines(policyCounts, SUBJECT_LABEL_BY_ID);
  const parentFacing = buildParentFacingBlocks(withQuality);
  const cardSummary = subjectCardSummaryAfterBridge(withQuality, dbInput);
  return { pub: withQuality, dbInput, policyCounts, coverage, parentFacing, cardSummary };
}

function aggSubjectAnswers(pub, subject) {
  return Math.max(0, Math.floor(Number(pub.subjects?.[subject]?.answers) || 0));
}

function adapterSubjectTotal(dbInput, subject) {
  return Math.max(0, Math.floor(Number(dbInput.subjects?.[subject]?.total) || 0));
}

function policyCount(policyCounts, subject) {
  const key = CANONICAL[subject] || subject;
  return Math.max(0, Math.floor(Number(policyCounts[key]) || 0));
}

function checkCase(name, report, expectations = {}) {
  const { pub, dbInput, policyCounts, coverage, cardSummary } = report;
  const summary = pub.summary || {};
  const issues = [];

  if (expectations.minTotalAnswers != null) {
    const total = Number(summary.totalAnswers) || 0;
    if (total < expectations.minTotalAnswers) {
      issues.push(`totalAnswers ${total} < ${expectations.minTotalAnswers}`);
    }
  }
  if (expectations.approxTotalAnswers != null) {
    const total = Number(summary.totalAnswers) || 0;
    const delta = Math.abs(total - expectations.approxTotalAnswers);
    if (delta > (expectations.totalTolerance || 5)) {
      issues.push(`totalAnswers ${total} not ~${expectations.approxTotalAnswers}`);
    }
  }
  if (expectations.minDurationMin != null) {
    const min = Math.floor(Number(summary.totalDurationSeconds) / 60);
    if (min < expectations.minDurationMin - (expectations.durationTolerance || 10)) {
      issues.push(`durationMin ${min} < ${expectations.minDurationMin}`);
    }
  }
  if (expectations.approxAccuracy != null) {
    const total = Number(summary.totalAnswers) || 0;
    const correct = Number(summary.correctAnswers) || 0;
    const acc = total > 0 ? (correct / total) * 100 : 0;
    if (Math.abs(acc - expectations.approxAccuracy) > (expectations.accuracyTolerance || 3)) {
      issues.push(`accuracy ${acc.toFixed(1)} not ~${expectations.approxAccuracy}`);
    }
  }

  for (const subject of SUBJECTS) {
    const agg = aggSubjectAnswers(pub, subject);
    const adapter = adapterSubjectTotal(dbInput, subject);
    const policy = policyCount(policyCounts, subject);
    const exp = expectations.subjects?.[subject];

    if (adapter !== policy) {
      issues.push(`${subject}: adapter=${adapter} policy=${policy}`);
    }
    if (agg > 0 && policy === 0) {
      issues.push(`${subject}: aggregate has ${agg} but policy=0`);
    }
    if (exp?.min != null && policy < exp.min) {
      issues.push(`${subject}: policy=${policy} < min ${exp.min}`);
    }
    if (exp?.exact != null && policy !== exp.exact) {
      issues.push(`${subject}: policy=${policy} != exact ${exp.exact}`);
    }
    if (exp?.zero && policy !== 0) {
      issues.push(`${subject}: expected zero but policy=${policy}`);
    }

    const card = cardCount(cardSummary, subject);
    if (adapter > 0 && card === 0) {
      issues.push(`${subject}: adapter=${adapter} but cardSummary=0`);
    }
    if (policy > 0 && card !== policy) {
      issues.push(`${subject}: card=${card} policy=${policy}`);
    }
    if (exp?.min != null && card < exp.min) {
      issues.push(`${subject}: card=${card} < min ${exp.min}`);
    }
    if (exp?.zero && card !== 0) {
      issues.push(`${subject}: expected card zero but card=${card}`);
    }
  }

  if (expectations.noNotPracticedFor?.length) {
    for (const sid of expectations.noNotPracticedFor) {
      const label = SUBJECT_LABEL_BY_ID[sid];
      const line = `${label}: לא תורגל בתקופה שנבחרה`;
      if (coverage.notPracticedSubjectsHe.includes(line)) {
        issues.push(`unexpected not-practiced for ${sid}`);
      }
    }
  }
  if (expectations.mustNotPracticedFor?.length) {
    for (const sid of expectations.mustNotPracticedFor) {
      const label = SUBJECT_LABEL_BY_ID[sid];
      const line = `${label}: לא תורגל בתקופה שנבחרה`;
      if (!coverage.notPracticedSubjectsHe.includes(line)) {
        issues.push(`expected not-practiced for ${sid}`);
      }
    }
  }
  if (expectations.diagnosticAnswersZero && Number(summary.diagnosticAnswers) !== 0) {
    issues.push(`expected diagnosticAnswers=0 got ${summary.diagnosticAnswers}`);
  }
  if (expectations.noStrongDiagnosis && allowsStrongParentDiagnosisAtStudent(pub)) {
    issues.push("strong diagnosis allowed but should be conservative");
  }

  const topicCount = SUBJECTS.reduce(
    (n, s) => n + Object.keys(dbInput.subjects?.[s]?.topics || {}).length,
    0,
  );

  const pass = issues.length === 0;
  return {
    name,
    pass,
    issues,
    summary: {
      totalAnswers: summary.totalAnswers,
      diagnosticAnswers: summary.diagnosticAnswers,
      durationMin: Math.floor(Number(summary.totalDurationSeconds) / 60),
      accuracy: summary.accuracy,
      topicCount,
      notPracticed: coverage.notPracticedSubjectsHe,
      policyCounts,
      adapterTotals: Object.fromEntries(
        SUBJECTS.map((s) => [s, adapterSubjectTotal(dbInput, s)]),
      ),
      cardSummary: Object.fromEntries(
        SUBJECTS.map((s) => [CARD_SUMMARY_FIELDS[s], cardCount(cardSummary, s)]),
      ),
      strongDiagnosis: allowsStrongParentDiagnosisAtStudent(pub),
      sufficiency: pub.meta?.evidenceQuality?.student?.dataSufficiency,
    },
  };
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
      label: "AAA1-card-grid",
      login: "aaa1",
      from: "2026-03-01",
      to: "2026-03-30",
      expectations: {
        approxTotalAnswers: 527,
        totalTolerance: 20,
        minDurationMin: 740,
        noNotPracticedFor: ["math", "geometry", "english", "hebrew", "science"],
        mustNotPracticedFor: ["moledet-geography"],
        diagnosticAnswersZero: true,
        noStrongDiagnosis: true,
        subjects: {
          math: { min: 140 },
          geometry: { min: 90 },
          english: { min: 80 },
          hebrew: { min: 70 },
          science: { min: 110 },
          moledet_geography: { zero: true },
        },
      },
    },
    {
      label: "AAA1",
      login: "aaa1",
      from: "2026-03-01",
      to: "2026-03-31",
      expectations: {
        approxTotalAnswers: 549,
        totalTolerance: 40,
        minDurationMin: 700,
        approxAccuracy: 90,
        noNotPracticedFor: ["math", "geometry", "english", "hebrew", "science"],
        diagnosticAnswersZero: true,
        noStrongDiagnosis: true,
        subjects: {
          math: { min: 100 },
          geometry: { min: 50 },
          english: { min: 50 },
          hebrew: { min: 50 },
          science: { min: 50 },
        },
      },
    },
    {
      label: "AAA5-day",
      login: "aaa5",
      from: "2026-03-27",
      to: "2026-03-27",
      expectations: {
        minTotalAnswers: 1,
        noNotPracticedFor: ["geometry", "hebrew"],
        diagnosticAnswersZero: true,
        subjects: {
          geometry: { min: 10 },
          hebrew: { min: 10 },
        },
      },
    },
    {
      label: "AAA5-week",
      login: "aaa5",
      from: "2026-03-24",
      to: "2026-03-30",
      expectations: {
        minTotalAnswers: 20,
        diagnosticAnswersZero: true,
      },
    },
    {
      label: "AAA11-month",
      login: "aaa11",
      from: "2026-03-01",
      to: "2026-03-31",
      expectations: {
        minTotalAnswers: 1,
        diagnosticAnswersZero: true,
      },
    },
    {
      label: "AAA3-day",
      login: "aaa3",
      from: "2026-03-15",
      to: "2026-03-15",
      expectations: {
        minTotalAnswers: 20,
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
        minTotalAnswers: 0,
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
    const report = await loadReport(supabase, student, c.from, c.to);
    const result = checkCase(`${c.label} ${c.from}..${c.to}`, report, c.expectations);
    results.push(result);
  }

  console.log("\n=== Parent report practice-count verification ===\n");
  let failed = 0;
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} — ${r.name}`);
    console.log(
      `  totals: answers=${r.summary.totalAnswers} diag=${r.summary.diagnosticAnswers} min=${r.summary.durationMin} acc=${r.summary.accuracy}% topics=${r.summary.topicCount}`,
    );
    console.log(`  adapter: ${JSON.stringify(r.summary.adapterTotals)}`);
    console.log(`  cards:   ${JSON.stringify(r.summary.cardSummary)}`);
    console.log(`  policy:  ${JSON.stringify(r.summary.policyCounts)}`);
    console.log(
      `  diagnostic: strong=${r.summary.strongDiagnosis} sufficiency=${r.summary.sufficiency}`,
    );
    if (r.summary.notPracticed.length) {
      console.log(`  notPracticed: ${r.summary.notPracticed.join(" | ")}`);
    }
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
