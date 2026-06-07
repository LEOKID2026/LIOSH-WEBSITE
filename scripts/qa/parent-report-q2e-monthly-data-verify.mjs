#!/usr/bin/env node
/**
 * Step 1 — verify April 2026 parent-report aggregate data for AAA1–AAA12.
 * Also computes the date labels that parent-report-v2 would render (timezone probe).
 *
 * Run: node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-data-verify.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MONTH_FROM = "2026-04-01";
const MONTH_TO = "2026-04-30";
const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";

const AAA = [
  { label: "AAA1", login: "aaa1", grade: 1 },
  { label: "AAA2", login: "aaa2", grade: 1 },
  { label: "AAA3", login: "aaa3", grade: 2 },
  { label: "AAA4", login: "aaa4", grade: 2 },
  { label: "AAA5", login: "aaa5", grade: 3 },
  { label: "AAA6", login: "aaa6", grade: 3 },
  { label: "AAA7", login: "aaa7", grade: 4 },
  { label: "AAA8", login: "aaa8", grade: 4 },
  { label: "AAA9", login: "aaa9", grade: 5 },
  { label: "AAA10", login: "aaa10", grade: 5 },
  { label: "AAA11", login: "aaa11", grade: 6 },
  { label: "AAA12", login: "aaa12", grade: 6 },
];

function parseIsoDate(s) {
  return new Date(`${s}T00:00:00.000Z`);
}

/** Mirrors utils/parent-report-v2.js custom range (browser local TZ). */
function simulateV2RenderedDateLabels(customStartDate, customEndDate) {
  const now = new Date();
  let startDate = new Date(customStartDate);
  startDate.setHours(0, 0, 0, 0);
  let endDate = new Date(customEndDate);
  endDate.setHours(23, 59, 59, 999);
  if (endDate > now) endDate = now;
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  return {
    startIsoStored: startDate.toISOString().split("T")[0],
    endIsoStored: endDate.toISOString().split("T")[0],
    startLabelHe: fmt(startDate),
    endLabelHe: fmt(endDate),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offsetMin: -startDate.getTimezoneOffset(),
  };
}

async function resolveStudents(supabase) {
  const logins = AAA.map((a) => a.login);
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username")
    .in("login_username", logins)
    .eq("is_active", true);
  const byLogin = new Map((codes || []).map((c) => [String(c.login_username).toLowerCase(), c.student_id]));
  const ids = [...byLogin.values()];
  const { data: rows } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id")
    .in("id", ids);
  const byId = new Map((rows || []).map((r) => [r.id, r]));
  return AAA.map((a) => {
    const id = byLogin.get(a.login);
    const row = byId.get(id);
    if (!row || row.parent_id !== QA_PARENT_ID) throw new Error(`Student ${a.label} missing or wrong parent`);
    return { ...a, studentId: id, fullName: row.full_name, gradeLevel: row.grade_level };
  });
}

function subjectList(payload) {
  const subs = payload?.subjects || {};
  return Object.entries(subs)
    .filter(([, v]) => Number(v?.diagnosticAnswers || v?.totalAnswers || 0) > 0 || Number(v?.learningAnswers || 0) > 0)
    .map(([k, v]) => `${k}(${Number(v.diagnosticAnswers || 0)}d/${Number(v.totalAnswers || 0)}t)`)
    .join(", ");
}

function activeDaysApril(payload) {
  const daily = payload?.dailyActivity;
  if (!daily || typeof daily !== "object") return 0;
  return Object.keys(daily).filter((d) => d >= MONTH_FROM && d <= MONTH_TO).length;
}

function firstLastActivity(payload) {
  const dates = [];
  const daily = payload?.dailyActivity || {};
  for (const d of Object.keys(daily)) {
    if (d >= MONTH_FROM && d <= MONTH_TO && Number(daily[d]?.answers || daily[d]?.sessions || 0) > 0) {
      dates.push(d);
    }
  }
  dates.sort();
  return { first: dates[0] || null, last: dates[dates.length - 1] || null, days: dates.length };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveStudents(supabase);

  const dateProbe = simulateV2RenderedDateLabels(MONTH_FROM, MONTH_TO);
  console.log("\n=== Date range probe (parent-report-v2 local TZ simulation) ===");
  console.log(`Query: ${MONTH_FROM} .. ${MONTH_TO}`);
  console.log(`TZ: ${dateProbe.tz} (offset ${dateProbe.offsetMin} min)`);
  console.log(`Stored startDate/endDate ISO: ${dateProbe.startIsoStored} .. ${dateProbe.endIsoStored}`);
  console.log(`Rendered PDF labels would be: ${dateProbe.startLabelHe} – ${dateProbe.endLabelHe}`);
  console.log(`Expected: 01/04/2026 – 30/04/2026`);
  console.log(
    dateProbe.startLabelHe === "01/04/2026" && dateProbe.endLabelHe === "30/04/2026"
      ? "DATE LABELS: OK"
      : "DATE LABELS: MISMATCH (timezone bug in parent-report-v2.js)"
  );

  const rows = [];
  console.log("\n=== AAA April 2026 aggregate verification ===\n");
  console.log(
    "| Student | Sessions | Total ans | Diag ans | Minutes | Active days | Subjects | First | Last | API range |"
  );
  console.log("|---------|----------|-----------|----------|---------|-------------|----------|-------|------|-----------|");

  for (const s of students) {
    const student = {
      id: s.studentId,
      full_name: s.fullName,
      grade_level: s.gradeLevel || `g${s.grade}`,
      is_active: true,
    };
    const raw = await aggregateParentReportPayload(
      supabase,
      student,
      parseIsoDate(MONTH_FROM),
      parseIsoDate(MONTH_TO),
      { includeParentActivities: true }
    );
    const pub = stripInternalReportPayloadFields(raw);
    const summary = pub.summary || {};
    const act = pub.learningActivity || {};
    const { first, last, days } = firstLastActivity(pub);
    const dbInput = buildReportInputFromDbData(pub, { period: "custom", timezone: "UTC" });
    const row = {
      label: s.label,
      login: s.login,
      grade: s.grade,
      studentId: s.studentId,
      totalSessions: Number(summary.totalSessions || 0),
      totalAnswers: Number(summary.totalAnswers || 0),
      diagnosticAnswers: Number(summary.diagnosticAnswers || 0),
      bookReadingMinutes: Number(act.bookReadingMinutes || 0),
      learningMinutes: Number(act.learningMinutes || act.totalLearningMinutes || 0),
      totalMinutes: Number(act.totalMinutes || act.learningMinutes || 0) + Number(act.bookReadingMinutes || 0),
      activeDaysApril: activeDaysApril(pub) || days,
      subjectsPracticed: subjectList(pub),
      firstActivityDate: first,
      lastActivityDate: last,
      apiRangeFrom: dbInput.range?.from,
      apiRangeTo: dbInput.range?.to,
      pdfDateLabels: `${dateProbe.startLabelHe} – ${dateProbe.endLabelHe}`,
      meaningfulFullMonth: Number(summary.diagnosticAnswers || 0) >= 40 && (days || 0) >= 8,
    };
    rows.push(row);
    console.log(
      `| ${row.label} | ${row.totalSessions} | ${row.totalAnswers} | ${row.diagnosticAnswers} | ${row.totalMinutes || "-"} | ${row.activeDaysApril} | ${row.subjectsPracticed || "—"} | ${row.firstActivityDate || "—"} | ${row.lastActivityDate || "—"} | ${row.apiRangeFrom}..${row.apiRangeTo} |`
    );
  }

  const outDir = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "april-data-verification.json");
  await writeFile(
    outPath,
    JSON.stringify({ runAt: new Date().toISOString(), monthWindow: { from: MONTH_FROM, to: MONTH_TO }, dateProbe, rows }, null, 2),
    "utf8"
  );
  console.log(`\nWrote ${outPath}`);
  const meaningful = rows.filter((r) => r.meaningfulFullMonth).length;
  console.log(`\nStudents with meaningful full-month data (>=40 diag, >=8 days): ${meaningful}/12`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
