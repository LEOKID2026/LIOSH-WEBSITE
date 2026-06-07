#!/usr/bin/env node

/**

 * Verify April 2026 aggregate data for realistic monthly PDF package (AAA1–AAA12).

 * PDF-visible minutes = summary.totalDurationSeconds / 60 (same pipeline as reports).

 *

 * Run: node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-data-verify.mjs

 */

import { mkdir, writeFile } from "node:fs/promises";

import path from "node:path";

import { fileURLToPath, pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";



import {

  aggregateParentReportPayload,

  stripInternalReportPayloadFields,

} from "../../lib/parent-server/report-data-aggregate.server.js";

import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";

import { buildReportInputFromDbData } from "../../lib/learning-supabase/report-data-adapter.js";



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, "../..");

const MONTH_FROM = "2026-04-01";

const MONTH_TO = "2026-04-30";

const QA_PARENT_ID = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";

const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly-realistic");



const { resolveCustomReportCalendarRange } = await import(

  pathToFileURL(path.join(ROOT, "utils/parent-report-v2.js")).href

);



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



const INACTIVITY_PHRASE = "לא הייתה פעילות לאחרונה";



function formatDateLabelHe(isoDateStr) {

  const p = String(isoDateStr || "").split("T")[0].split("-");

  if (p.length !== 3) return isoDateStr;

  return `${p[2]}/${p[1]}/${p[0]}`;

}



function parseIsoDate(s) {

  return new Date(`${s}T00:00:00.000Z`);

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

    .filter(([, v]) => Number(v?.diagnosticAnswers || v?.totalAnswers || 0) > 0)

    .map(([k, v]) => `${k}(${Number(v.diagnosticAnswers || 0)}d)`)

    .join(", ");

}



function dailyActivityRows(payload) {

  const daily = payload?.dailyActivity;

  return Array.isArray(daily) ? daily : Object.values(daily || {});

}



function firstLastActivity(payload) {

  const dates = [];

  for (const row of dailyActivityRows(payload)) {

    const d = row?.date;

    if (d && d >= MONTH_FROM && d <= MONTH_TO && Number(row?.answers || row?.sessions || 0) > 0) {

      dates.push(d);

    }

  }

  dates.sort();

  return { first: dates[0] || null, last: dates[dates.length - 1] || null, days: dates.length };

}



/** PDF-visible minutes (session duration sum, not book-reading overlay). */

function pdfVisibleMinutes(payload) {

  const summary = payload?.summary || {};

  return Math.round(Number(summary.totalDurationSeconds || 0) / 60);

}



function hasRecentActivityInsight(enrichedPayload) {

  const insights = enrichedPayload?.parentFacing?.insights || [];

  const list = Array.isArray(insights) ? insights : [];

  return !list.some((line) => String(line).includes(INACTIVITY_PHRASE));

}



function meetsRealisticThreshold(row) {

  return (

    row.totalAnswers >= 150 &&

    row.diagnosticAnswers >= 150 &&

    row.pdfVisibleMinutes >= 250 &&

    row.pdfVisibleMinutes <= 650 &&

    row.activeDays >= 18 &&

    row.lastActivityDate >= "2026-04-28" &&

    row.noRecentInactivityInsight === true &&

    (row.subjectsPracticed || "").split(",").filter(Boolean).length >= 2

  );

}



async function main() {

  process.env.TZ = "Asia/Jerusalem";

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;

  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {

    console.error("Missing Supabase env");

    process.exit(1);

  }



  const resolved = resolveCustomReportCalendarRange(MONTH_FROM, MONTH_TO, new Date("2026-06-01T12:00:00.000Z"));

  const dateLabels = `${formatDateLabelHe(resolved.startCalendar)} – ${formatDateLabelHe(resolved.endCalendar)}`;



  console.log("\n=== Date range (fixed parent-report-v2 calendar) ===");

  console.log(`Stored: ${resolved.startCalendar} .. ${resolved.endCalendar}`);

  console.log(`Rendered: ${dateLabels}`);



  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const students = await resolveStudents(supabase);

  const rows = [];



  console.log("\n=== AAA April 2026 realistic full-month verification ===\n");

  console.log(

    "| Student | Sessions | Total ans | Diag ans | PDF min | Active days | Subjects | First | Last | No inact. warn |"

  );

  console.log("|---------|----------|-----------|----------|---------|-------------|----------|-------|------|----------------|");



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

    const enriched = await enrichPayloadWithParentFacing(supabase, pub, s.studentId);

    const summary = pub.summary || {};

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

      pdfVisibleMinutes: pdfVisibleMinutes(pub),

      activeDays: days,

      subjectsPracticed: subjectList(pub),

      firstActivityDate: first,

      lastActivityDate: last,

      renderedReportDateRange: dateLabels,

      noRecentInactivityInsight: hasRecentActivityInsight(enriched),

      apiRangeFrom: dbInput.range?.from,

      apiRangeTo: dbInput.range?.to,

      meaningfulFullMonth: false,

    };

    row.meaningfulFullMonth = meetsRealisticThreshold(row);

    rows.push(row);

    console.log(

      `| ${row.label} | ${row.totalSessions} | ${row.totalAnswers} | ${row.diagnosticAnswers} | ${row.pdfVisibleMinutes} | ${row.activeDays} | ${row.subjectsPracticed || "—"} | ${row.firstActivityDate || "—"} | ${row.lastActivityDate || "—"} | ${row.noRecentInactivityInsight ? "yes" : "NO"} |`

    );

  }



  await mkdir(ARTIFACT_DIR, { recursive: true });

  const outPath = path.join(ARTIFACT_DIR, "april-data-verification.json");

  const meaningful = rows.filter((r) => r.meaningfulFullMonth).length;

  await writeFile(

    outPath,

    JSON.stringify(

      {

        runAt: new Date().toISOString(),

        seedTag: "parent-report-q2e-monthly-realistic-v1",

        monthWindow: { from: MONTH_FROM, to: MONTH_TO },

        dateRangeFix: { stored: resolved, rendered: dateLabels },

        threshold: {

          totalAnswers: 150,

          diagnosticAnswers: 150,

          pdfVisibleMinutesMin: 250,

          pdfVisibleMinutesMax: 650,

          activeDays: 18,

          lastActivityOnOrAfter: "2026-04-28",

          subjects: 2,

          noRecentInactivityInsight: true,

        },

        meaningfulCount: meaningful,

        rows,

      },

      null,

      2

    ),

    "utf8"

  );

  console.log(`\nWrote ${outPath}`);

  console.log(`Students meeting realistic full-month threshold: ${meaningful}/12`);

  if (meaningful < 12) {

    console.error("GATE: Not all students meet threshold — do not export PDFs yet");

    process.exit(1);

  }

  console.log("GATE: All 12 students ready for PDF export");

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});


