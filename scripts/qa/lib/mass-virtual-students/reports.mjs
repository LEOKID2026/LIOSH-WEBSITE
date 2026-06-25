import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../../../lib/parent-server/parent-report-parent-facing.server.js";
import { BEHAVIOR_PROFILES, ENGINE_DECISIONS, SEED_META_KEY } from "./constants.mjs";
import { studentDisplayName } from "./config.mjs";
import {
  analyzeEnglishInReports,
  buildEnglishAnalysisMarkdown,
  scanParentVisibleText,
} from "./english-analysis.mjs";
import {
  buildEngineDecisionDebug,
  buildEngineDecisionDebugMarkdown,
  extractDecisionsFromV2Report,
} from "./engine-decision-debug.mjs";
import { buildParentAssignedDebug } from "./parent-assigned-debug.mjs";
import { buildTopicCoverage } from "./topic-coverage.mjs";
import { buildParentReportV2FromAggregate } from "./report-v2-bridge.mjs";
import { createServiceClient } from "./supabase.mjs";

function parseReportDate(value) {
  if (value instanceof Date) return value;
  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`);
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) throw new Error(`invalid report date: ${value}`);
  return d;
}

async function loadStudentReportBundle(supabase, student, from, to) {
  const { data: row } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .eq("id", student.studentId)
    .maybeSingle();
  if (!row?.id) throw new Error("student row missing");

  const raw = await aggregateParentReportPayload(supabase, row, from, to, {
    includeParentActivities: true,
  });
  const enriched = await enrichPayloadWithParentFacing(supabase, raw, student.studentId);
  const publicPayload = stripInternalReportPayloadFields(enriched);
  const v2 = await buildParentReportV2FromAggregate(raw, {
    studentName: row.full_name,
    fromDate: from,
    toDate: to,
  });
  return { row, raw, publicPayload, v2 };
}

export async function syncMassStudentDisplayNames(manifestStudents, { dryRun = false } = {}) {
  const supabase = createServiceClient();
  const updates = [];

  for (const student of manifestStudents) {
    const profile = BEHAVIOR_PROFILES.find((p) => p.id === student.profile);
    const hebrewName = studentDisplayName({
      grade: student.grade,
      subject: student.primarySubject,
      profileId: student.profile,
      profileLabelHe: profile?.labelHe,
      seq: student.seq || Number(String(student.login || "").slice(-3)) || 0,
    });
    updates.push({ studentId: student.studentId, login: student.login, hebrewName });
    if (!dryRun) {
      await supabase.from("students").update({ full_name: hebrewName }).eq("id", student.studentId);
    }
  }

  return { updated: updates.length, dryRun, updates };
}

export async function verifyParentReports({
  students,
  fromDate,
  toDate,
  maxReports = Infinity,
  runId,
}) {
  const from = parseReportDate(fromDate);
  const to = parseReportDate(toDate);
  const supabase = createServiceClient();
  const results = [];
  const engineFindings = [];
  const topicEngineFindings = [];
  const errors = [];
  const englishSamples = [];
  let reportsGenerated = 0;
  let reportsFailed = 0;

  const slice = students.slice(0, maxReports);
  const aggregateLoader = async (student) => {
    const { row, raw, v2 } = await loadStudentReportBundle(supabase, student, from, to);
    return { row, raw, v2 };
  };

  for (const student of slice) {
    const t0 = Date.now();
    try {
      const { row, raw, publicPayload, v2 } = await loadStudentReportBundle(
        supabase,
        student,
        from,
        to,
      );
      const textScan = scanParentVisibleText(publicPayload);
      const { findings: v2Findings } = extractDecisionsFromV2Report(v2, row.grade_level);
      const decisions = [...new Set(v2Findings.map((f) => f.engineDecision))];

      for (const f of v2Findings) {
        topicEngineFindings.push({
          studentId: student.studentId,
          login: student.login,
          subjectId: f.subjectId,
          topicKey: f.topicKey,
          engineDecision: f.engineDecision,
        });
      }

      for (const d of decisions) {
        engineFindings.push({
          studentId: student.studentId,
          login: student.login,
          grade: student.grade,
          profile: student.profile,
          engineDecision: d,
        });
      }

      englishSamples.push({ student, publicPayload, rawPayload: raw });

      reportsGenerated += 1;
      results.push({
        studentId: student.studentId,
        login: student.login,
        grade: student.grade,
        profile: student.profile,
        ok: true,
        durationMs: Date.now() - t0,
        engineDecisions: decisions,
        v2TopicFindings: v2Findings.length,
        englishHits: textScan.englishHits,
        technicalHits: textScan.technicalHits,
        hebrewIssues: textScan.hebrewIssues,
        topicCount: publicPayload?.subjects
          ? Object.values(publicPayload.subjects).reduce(
              (n, s) => n + Object.keys(s?.topics || {}).length,
              0,
            )
          : 0,
        dataSufficiency: raw.meta?.evidenceQuality?.student?.dataSufficiency,
      });
    } catch (err) {
      reportsFailed += 1;
      errors.push({
        studentId: student.studentId,
        login: student.login,
        error: err?.message || String(err),
        durationMs: Date.now() - t0,
      });
      results.push({
        studentId: student.studentId,
        login: student.login,
        ok: false,
        error: err?.message || String(err),
      });
    }
  }

  const decisionsSeen = new Set(engineFindings.map((f) => f.engineDecision));
  const missingDecisions = ENGINE_DECISIONS.filter((d) => !decisionsSeen.has(d));
  const englishAnalysis = analyzeEnglishInReports(englishSamples);
  const engineDecisionDebug = await buildEngineDecisionDebug({
    students: slice,
    fromDate: from,
    toDate: to,
    runId,
    aggregateLoader,
  });
  const topicCoverage = await buildTopicCoverage({
    students: slice,
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    runId,
    engineFindings: topicEngineFindings,
  });
  const parentAssignedDebug = await buildParentAssignedDebug({
    students: slice,
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    runId,
  });

  return {
    results,
    engineFindings,
    topicEngineFindings,
    errors,
    reportsGenerated,
    reportsFailed,
    decisionsSeen: [...decisionsSeen],
    missingDecisions,
    englishAnalysis,
    engineDecisionDebug,
    topicCoverage,
    parentAssignedDebug,
  };
}

export function buildCoverageRows({ cohort, seededStats, subjects, grades }) {
  const rows = [];
  for (const subject of subjects) {
    for (const grade of grades) {
      const studentsInCell = cohort.filter((s) => s.grade === grade && s.primarySubject === subject);
      rows.push({
        subject,
        grade,
        studentsPlanned: studentsInCell.length,
        studentsSeeded: seededStats.bySubjectGrade?.[`${subject}:${grade}`] || 0,
      });
    }
  }
  return rows;
}

export function computePassVerdict(summary) {
  const blockers = [];
  if (summary.apiErrors > 0) blockers.push("api_errors");
  if (summary.reportsFailed > 0) blockers.push("report_failures");
  if (summary.englishIssues > 0) blockers.push("english_in_reports");
  if (summary.technicalIssues > 0) blockers.push("technical_text_in_reports");
  if (summary.subjectCoverageGaps?.length) blockers.push("subject_coverage_gaps");
  if (summary.gradeCoverageGaps?.length) blockers.push("grade_coverage_gaps");

  if (blockers.length === 0) return { verdict: "PASS", blockers: [] };
  if (summary.apiErrors > 10 || summary.reportsFailed > summary.reportsGenerated * 0.1) {
    return { verdict: "BLOCKED", blockers };
  }
  return { verdict: "ISSUES_FOUND", blockers };
}

export { SEED_META_KEY, analyzeEnglishInReports, buildEnglishAnalysisMarkdown, buildEngineDecisionDebugMarkdown };
