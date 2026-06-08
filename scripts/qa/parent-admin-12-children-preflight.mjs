#!/usr/bin/env node
/**
 * Read-only preflight for AAA1–AAA12 under admin@admin.com parent context.
 *
 *   node --env-file=.env.local scripts/qa/parent-admin-12-children-preflight.mjs
 *   node --env-file=.env.local scripts/qa/parent-admin-12-children-preflight.mjs --from 2026-05-01 --to 2026-06-08
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import {
  AAA_CHILDREN,
  QA_PARENT_EMAIL,
  QA_PARENT_ID,
  parseIsoDate,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_PATH = path.join(ROOT, "docs/qa/_artifacts/parent-admin-12-children-preflight.json");

function parseArgs(argv) {
  let from = "2026-05-01";
  let to = "2026-06-08";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from") from = argv[++i];
    else if (argv[i] === "--to") to = argv[++i];
    else if (argv[i]?.startsWith("--from=")) from = argv[i].slice("--from=".length);
    else if (argv[i]?.startsWith("--to=")) to = argv[i].slice("--to=".length);
  }
  return { from, to };
}

async function countAnswersInRange(supabase, studentId, from, to) {
  const { count, error } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("answered_at", `${from}T00:00:00.000Z`)
    .lte("answered_at", `${to}T23:59:59.999Z`);
  if (error) throw error;
  return count ?? 0;
}

async function countSessionsInRange(supabase, studentId, from, to) {
  const { count, error } = await supabase
    .from("learning_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("started_at", `${from}T00:00:00.000Z`)
    .lte("started_at", `${to}T23:59:59.999Z`);
  if (error) throw error;
  return count ?? 0;
}

async function countParentActivitiesInRange(supabase, studentId, from, to) {
  const { count, error } = await supabase
    .from("parent_assigned_activities")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", `${from}T00:00:00.000Z`)
    .lte("created_at", `${to}T23:59:59.999Z`);
  if (error && error.code !== "42P01") throw error;
  return count ?? 0;
}

async function countBookSessionsInRange(supabase, studentId, from, to) {
  const { count, error } = await supabase
    .from("book_reading_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("started_at", `${from}T00:00:00.000Z`)
    .lte("started_at", `${to}T23:59:59.999Z`);
  if (error && error.code !== "42P01") throw error;
  return count ?? 0;
}

function assessEnoughData(row, scenario) {
  if (scenario === "A_no_data") {
    return { enough: true, reason: "scenario expects no data" };
  }
  if (row.reportDiagnosticAnswers >= 5 || row.reportTotalAnswers >= 8) {
    return { enough: true, reason: "report aggregate has activity" };
  }
  if (row.answersCount >= 5) {
    return { enough: true, reason: "raw answers >= 5" };
  }
  if (row.sessionsCount >= 1 && row.answersCount >= 1) {
    return { enough: row.answersCount >= 3, reason: "minimal session data" };
  }
  return { enough: false, reason: "insufficient for flag comparison in range" };
}

async function main() {
  const { from, to } = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);

  const children = [];
  for (const s of students) {
    const [answersCount, sessionsCount, parentActivitiesCount, bookEventsCount] = await Promise.all([
      countAnswersInRange(supabase, s.studentId, from, to),
      countSessionsInRange(supabase, s.studentId, from, to),
      countParentActivitiesInRange(supabase, s.studentId, from, to),
      countBookSessionsInRange(supabase, s.studentId, from, to),
    ]);

    const student = {
      id: s.studentId,
      full_name: s.fullName,
      grade_level: s.gradeLevel || `g${s.grade}`,
      is_active: true,
    };
    const raw = await aggregateParentReportPayload(
      supabase,
      student,
      parseIsoDate(from),
      parseIsoDate(to),
      { includeParentActivities: true }
    );
    const pub = stripInternalReportPayloadFields(raw);
    const summary = pub.summary || {};
    const enough = assessEnoughData(
      {
        answersCount,
        sessionsCount,
        reportDiagnosticAnswers: Number(summary.diagnosticAnswers || 0),
        reportTotalAnswers: Number(summary.totalAnswers || 0),
      },
      s.scenario
    );

    children.push({
      label: s.label,
      login: s.login,
      name: s.fullName,
      grade: s.grade,
      scenario: s.scenario,
      studentId: s.studentId,
      parentId: QA_PARENT_ID,
      isActive: s.isActive,
      range: { from, to },
      answers: answersCount,
      sessions: sessionsCount,
      parentActivities: parentActivitiesCount,
      bookEvents: bookEventsCount,
      reportSummary: {
        totalAnswers: Number(summary.totalAnswers || 0),
        diagnosticAnswers: Number(summary.diagnosticAnswers || 0),
        totalSessions: Number(summary.totalSessions || 0),
        totalDurationSeconds: Number(summary.totalDurationSeconds || 0),
        coins: Number(summary.coins ?? pub.coins ?? 0),
      },
      hasEnoughData: enough.enough,
      enoughDataReason: enough.reason,
    });
  }

  const enoughCount = children.filter((c) => c.hasEnoughData).length;
  const artifact = {
    generatedAt: new Date().toISOString(),
    parent: { email: QA_PARENT_EMAIL, id: QA_PARENT_ID },
    confirmedChildren: "AAA1–AAA12 via student_access_codes login aaa1..aaa12",
    range: { from, to },
    summary: {
      totalChildren: children.length,
      enoughForComparison: enoughCount,
      needsSeed: enoughCount < children.length,
    },
    children,
  };

  await mkdir(path.dirname(ARTIFACT_PATH), { recursive: true });
  await writeFile(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(artifact, null, 2));
  console.log(`\nWrote ${ARTIFACT_PATH}`);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
