#!/usr/bin/env node
/**
 * Parent report numeric & sufficiency sanity audit — AAA1–12 + visible-impact fixtures.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-numeric-sanity-audit.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-numeric-sanity-audit.mjs --root-cause GATE-LOW
 */
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";
import { REPORT_DURATION_SANITY } from "../../lib/parent-server/report-duration-sanity.js";
import { evaluateDataSufficiency } from "../../utils/parent-report-row-diagnostics.js";
import {
  AAA_CHILDREN,
  COMPARISON_RANGES,
  FLAG_MODES,
  parseIsoDate,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";
import { VISIBLE_IMPACT_FIXTURES } from "./parent-report-diagnostic-visible-impact-seed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-numeric-sanity");

const FIXTURE_WINDOWS = {
  AAA4: { label: "AAA4", from: "2026-05-01", to: "2026-06-08" },
  "GATE-LOW": { label: "AAA9", from: "2026-05-10", to: "2026-05-18" },
  "SUBSKILL-FOCUS": { label: "AAA10", from: "2026-05-06", to: "2026-05-20" },
  "SUBSKILL-CONFLICT": { label: "AAA8", from: "2026-05-20", to: "2026-05-24" },
  "PROMOTE-STRONG": { label: "AAA5", from: "2026-05-04", to: "2026-05-11" },
};

function failRow(checks) {
  return checks.some((c) => !c.pass);
}

function auditDurationRow(row) {
  const totalMinutes = Number(row.totalMinutes) || 0;
  const questions = Number(row.totalQuestions) || 0;
  const sessionCount = Number(row.sessionCount) || 0;
  const minutesPerQuestion = questions > 0 ? totalMinutes / questions : 0;
  const checks = [];

  checks.push({
    name: "session_cap_180m",
    pass: totalMinutes <= REPORT_DURATION_SANITY.maxSessionMinutes || sessionCount > 1,
    actual: totalMinutes,
  });
  checks.push({
    name: "minutes_per_question_10",
    pass: questions === 0 || minutesPerQuestion <= REPORT_DURATION_SANITY.maxMinutesPerQuestion,
    actual: Number(minutesPerQuestion.toFixed(2)),
  });
  checks.push({
    name: "topic_short_window_300m",
    pass: totalMinutes <= REPORT_DURATION_SANITY.maxTopicMinutesShortWindow,
    actual: totalMinutes,
  });
  checks.push({ name: "non_negative", pass: totalMinutes >= 0, actual: totalMinutes });

  return { checks, fail: failRow(checks), minutesPerQuestion, totalMinutes, questions, sessionCount };
}

function auditStatusRow(row) {
  const q = Number(row.totalQuestions) || 0;
  const suff = evaluateDataSufficiency(q, row.evidenceStrength || "medium", row.confidence01 ?? 0.5);
  const statusHe = suff.labelHe;
  const checks = [];
  if (q >= 20) {
    checks.push({
      name: "q20_not_low_volume_label",
      pass: !/מעט מדי שאלות|לא נאספו שאלות/.test(statusHe),
      actual: statusHe,
    });
    checks.push({
      name: "q20_not_insufficient_only_sessions",
      pass: suff.level !== "low" || q < 4,
      actual: `${suff.level}: ${statusHe}`,
    });
  }
  return { checks, fail: failRow(checks), statusHe, sufficiencyLevel: suff.level };
}

async function buildPublicPayload(supabase, entry, from, to) {
  process.env.DIAGNOSTIC_METADATA_SUBSKILL_ENABLED = "false";
  process.env.DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED = "false";
  process.env.DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED = "false";
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || `g${entry.grade}`,
    is_active: true,
  };
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(from),
    parseIsoDate(to),
    { includeParentActivities: true }
  );
  const withEq = attachParentContextEvidenceQuality(structuredClone(raw));
  const enriched = await enrichPayloadWithParentFacing(supabase, withEq, entry.studentId);
  return stripInternalReportPayloadFields(structuredClone(enriched));
}

function extractTopicRows(payload, report) {
  const rows = [];
  const summaryMinutes = Math.round(Number(payload.summary?.totalDurationSeconds || 0) / 60);
  rows.push({
    scope: "summary",
    subject: "ALL",
    topic: "—",
    totalQuestions: Number(payload.summary?.totalAnswers || payload.summary?.diagnosticAnswers || 0),
    correct: Number(payload.summary?.diagnosticCorrect || 0),
    accuracy: Number(payload.summary?.diagnosticAccuracy || 0),
    totalMinutes: summaryMinutes,
    sessionCount: Number(payload.summary?.totalSessions || 0),
    statusHe: "",
    evidenceStrength: "medium",
    confidence01: 0.5,
  });

  const subjects = payload.subjects || {};
  for (const [subject, sub] of Object.entries(subjects)) {
    if (!sub || typeof sub !== "object") continue;
    const subMinutes = Math.round(Number(sub.durationSeconds || 0) / 60);
    const subQuestions = Number(sub.diagnosticAnswers ?? sub.answers ?? 0);
    if (subQuestions > 0) {
      rows.push({
        scope: "subject",
        subject,
        topic: "—",
        totalQuestions: subQuestions,
        correct: Number(sub.diagnosticCorrect ?? sub.correct ?? 0),
        accuracy: Number(sub.diagnosticAccuracy ?? sub.accuracy ?? 0),
        totalMinutes: subMinutes,
        sessionCount: Number(sub.sessions || 0),
        statusHe: "",
        evidenceStrength: "medium",
        confidence01: 0.5,
      });
    }
    const topics = sub.topics && typeof sub.topics === "object" ? sub.topics : {};
    for (const [topicKey, topic] of Object.entries(topics)) {
      const t = topic && typeof topic === "object" ? topic : {};
      const q = Number(t.diagnosticAnswers ?? t.answers ?? 0);
      if (q <= 0) continue;
      rows.push({
        scope: "topic",
        subject,
        topic: topicKey,
        totalQuestions: q,
        correct: Number(t.diagnosticCorrect ?? t.correct ?? 0),
        accuracy: Number(t.diagnosticAccuracy ?? t.accuracy ?? 0),
        totalMinutes: Math.round(Number(t.durationSeconds || 0) / 60),
        sessionCount: Number(t.sessions || 0),
        statusHe: "",
        evidenceStrength: "medium",
        confidence01: 0.5,
      });
    }
  }

  if (report?.summary?.totalTimeMinutes != null) {
    rows[0].reportTotalMinutes = Number(report.summary.totalTimeMinutes);
    rows[0].reportQuestions = Number(report.summary.totalQuestions || 0);
  }
  return rows;
}

async function rootCauseTrace(supabase, scenarioKey) {
  const win = FIXTURE_WINDOWS[scenarioKey];
  if (!win) throw new Error(`Unknown scenario ${scenarioKey}`);
  const students = await resolveAaaStudents(supabase);
  const entry = students.find((s) => s.label === win.label);
  if (!entry) throw new Error(`Missing ${win.label}`);

  const { data: sessions } = await supabase
    .from("learning_sessions")
    .select("id,student_id,subject,topic,started_at,ended_at,duration_seconds,status,metadata")
    .eq("student_id", entry.studentId)
    .gte("started_at", `${win.from}T00:00:00.000Z`)
    .lte("started_at", `${win.to}T23:59:59.999Z`)
    .order("started_at", { ascending: true });

  const traces = [];
  for (const session of sessions || []) {
    const { data: answers } = await supabase
      .from("answers")
      .select("id,answered_at,is_correct,answer_payload")
      .eq("learning_session_id", session.id)
      .order("answered_at", { ascending: true });

    const ans = answers || [];
    const first = ans[0]?.answered_at || session.started_at;
    const last = ans[ans.length - 1]?.answered_at || session.ended_at;
    const wallSec =
      first && last ? Math.max(0, Math.floor((Date.parse(last) - Date.parse(first)) / 1000)) : 0;

    traces.push({
      sessionId: session.id,
      student: win.label,
      subject: session.subject,
      topic: session.topic,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_seconds_db: session.duration_seconds,
      duration_minutes_db: Math.round(Number(session.duration_seconds || 0) / 60),
      answerCount: ans.length,
      first_answer_at: first,
      last_answer_at: last,
      wall_clock_span_minutes: Math.round(wallSec / 60),
      sourceField: "learning_sessions.duration_seconds",
      seedTag:
        session.metadata?.parentReportDiagnosticVisibleImpact ||
        session.metadata?.parentReportQ2eMonthly ||
        session.metadata?.parentReportQ1Sim ||
        null,
    });
  }

  return { scenario: scenarioKey, window: win, student: entry, traces };
}

async function main() {
  const rootCauseArg = process.argv.find((a) => a.startsWith("--root-cause="))?.split("=")[1]
    || (process.argv.includes("--root-cause") ? process.argv[process.argv.indexOf("--root-cause") + 1] : null);

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  await mkdir(ARTIFACT_DIR, { recursive: true });

  if (rootCauseArg) {
    const trace = await rootCauseTrace(supabase, rootCauseArg);
    const out = path.join(ARTIFACT_DIR, `root-cause-${rootCauseArg}.json`);
    await writeFile(out, JSON.stringify(trace, null, 2), "utf8");
    console.log(`Wrote ${out}`);
    return;
  }

  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));
  const audits = [];

  for (const child of AAA_CHILDREN) {
    const entry = byLabel.get(child.label);
    if (!entry) continue;
    for (const range of COMPARISON_RANGES) {
      const payload = await buildPublicPayload(supabase, entry, range.from, range.to);
      const rows = extractTopicRows(payload, null);
      for (const row of rows) {
        const duration = auditDurationRow(row);
        const status = auditStatusRow(row);
        audits.push({
          child: child.label,
          range: range.id,
          from: range.from,
          to: range.to,
          ...row,
          durationAudit: duration,
          statusAudit: status,
          fail: duration.fail || status.fail,
        });
      }
    }
  }

  for (const [fixtureId, win] of Object.entries(FIXTURE_WINDOWS)) {
    const entry = byLabel.get(win.label);
    if (!entry) continue;
    const payload = await buildPublicPayload(supabase, entry, win.from, win.to);
    const rows = extractTopicRows(payload, null);
    for (const row of rows) {
      const duration = auditDurationRow(row);
      const status = auditStatusRow(row);
      audits.push({
        child: win.label,
        fixture: fixtureId,
        from: win.from,
        to: win.to,
        ...row,
        durationAudit: duration,
        statusAudit: status,
        fail: duration.fail || status.fail,
      });
    }
  }

  const failCount = audits.filter((a) => a.fail).length;
  const summary = {
    generatedAt: new Date().toISOString(),
    auditedRows: audits.length,
    failCount,
    passCount: audits.length - failCount,
    thresholds: REPORT_DURATION_SANITY,
  };

  await writeFile(path.join(ARTIFACT_DIR, "audit-results.json"), JSON.stringify({ summary, audits }, null, 2), "utf8");

  console.log(`Audited ${audits.length} rows — FAIL=${failCount} PASS=${audits.length - failCount}`);
  console.log(`Artifacts: ${ARTIFACT_DIR}`);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
