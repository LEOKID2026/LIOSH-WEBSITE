#!/usr/bin/env node
/**
 * QA preflight: school sim DB + state snapshot for a calendar date range.
 * Read-only — no mutations.
 *
 *   node --env-file=.env.local scripts/qa/school-sim-preflight-status.mjs
 *   node --env-file=.env.local scripts/qa/school-sim-preflight-status.mjs --from 2026-05-01 --to 2026-06-08
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertDemoSchoolBaseline,
  createServiceRole,
  loadSimState,
} from "../school-portal/demo-school-lib.mjs";
import { schoolDayToWeekday } from "../school-portal/sim/school-day-planner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const START_DATE = "2025-09-01";
const EXPECTED_ACTIVITIES = 108;

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

function schoolDayToCalendarDate(schoolDay) {
  const start = new Date(`${START_DATE}T12:00:00Z`);
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + schoolDay);
  let dow = d.getUTCDay();
  while (dow === 5 || dow === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
    dow = d.getUTCDay();
  }
  return d.toISOString().slice(0, 10);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function queryInBatches(svc, table, select, column, ids, extraFilter) {
  const rows = [];
  for (const batch of chunk(ids, 40)) {
    let q = svc.from(table).select(select).in(column, batch);
    if (extraFilter) q = extraFilter(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

function calendarDatesInRange(from, to) {
  const out = [];
  const d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function main() {
  const { from: FROM, to: TO } = parseArgs(process.argv.slice(2));

  const lockPaths = [
    path.join(ROOT, "scripts/school-portal/.sim-lock"),
    path.join(ROOT, "scripts/school-portal/sim.lock"),
    path.join(ROOT, "reports/school-sim-daily/.lock"),
  ];
  const locks = lockPaths
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ path: p, mtime: fs.statSync(p).mtime.toISOString() }));

  const state = loadSimState();
  const svc = createServiceRole();
  const baseline = await assertDemoSchoolBaseline(svc, state, { strict: false });

  const dates = calendarDatesInRange(FROM, TO);
  const schoolDayByDate = {};
  for (let sd = 1; sd <= 300; sd++) {
    const cal = schoolDayToCalendarDate(sd);
    if (cal >= FROM && cal <= TO) schoolDayByDate[cal] = sd;
    if (cal > TO) break;
  }

  const { data: activities, error: actErr } = await svc
    .from("classroom_activities")
    .select("id, closed_at, status, subject")
    .eq("school_id", state.schoolId)
    .gte("closed_at", `${FROM}T00:00:00.000Z`)
    .lte("closed_at", `${TO}T23:59:59.999Z`);
  if (actErr) throw actErr;

  const actByDay = {};
  for (const d of dates) actByDay[d] = { classroomActivities: 0, subjects: new Set() };
  for (const a of activities || []) {
    const day = String(a.closed_at || "").slice(0, 10);
    if (!actByDay[day]) actByDay[day] = { classroomActivities: 0, subjects: new Set() };
    actByDay[day].classroomActivities++;
    actByDay[day].subjects.add(a.subject);
  }

  const studentIds = state.studentIds || [];
  const hpByDay = {};
  for (const d of dates) hpByDay[d] = 0;
  const hpStatus = await queryInBatches(
    svc,
    "student_activity_status",
    "id, student_id, submitted_at, started_at",
    "student_id",
    studentIds,
    (q) => q.gte("submitted_at", `${FROM}T00:00:00.000Z`).lte("submitted_at", `${TO}T23:59:59.999Z`)
  );
  for (const s of hpStatus) {
    const day = String(s.submitted_at || s.started_at || "").slice(0, 10);
    if (hpByDay[day] != null) hpByDay[day]++;
  }

  const answers = await queryInBatches(
    svc,
    "answers",
    "id, answered_at, student_id",
    "student_id",
    studentIds,
    (q) => q.gte("answered_at", `${FROM}T00:00:00.000Z`).lte("answered_at", `${TO}T23:59:59.999Z`)
  );

  const ansByDay = {};
  const studentsByDay = {};
  for (const d of dates) {
    ansByDay[d] = 0;
    studentsByDay[d] = new Set();
  }
  for (const a of answers) {
    const day = String(a.answered_at || "").slice(0, 10);
    if (ansByDay[day] == null) continue;
    ansByDay[day]++;
    studentsByDay[day].add(a.student_id);
  }

  const dayRows = dates.map((d) => {
    const acts = actByDay[d]?.classroomActivities || 0;
    const isWeekend = [0, 5, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
    let status = "empty";
    if (isWeekend && acts === 0) status = "weekend_ok";
    else if (acts === 0) status = "missing";
    else if (acts >= EXPECTED_ACTIVITIES) status = "full";
    else status = "partial";
    return {
      date: d,
      weekday: new Date(`${d}T12:00:00Z`).getUTCDay(),
      schoolDay: schoolDayByDate[d] ?? null,
      classroomActivities: acts,
      hpSessions: hpByDay[d] || 0,
      answers: ansByDay[d] || 0,
      distinctStudents: studentsByDay[d]?.size || 0,
      status,
    };
  });

  const summarize = (rows) => ({
    totalDays: rows.length,
    full: rows.filter((r) => r.status === "full").length,
    partial: rows.filter((r) => r.status === "partial").length,
    missing: rows.filter((r) => r.status === "missing").length,
    weekendOk: rows.filter((r) => r.status === "weekend_ok").length,
  });

  const artifactRoot = path.join(ROOT, "reports", "school-sim-daily");
  const artifactDates = fs.existsSync(artifactRoot)
    ? fs.readdirSync(artifactRoot).filter((n) => /^\d{4}-\d{2}-\d{2}/.test(n)).sort()
    : [];

  const out = {
    generatedAt: new Date().toISOString(),
    range: { from: FROM, to: TO },
    locks: locks.length ? locks : null,
    simState: {
      schoolId: state.schoolId,
      demoSchoolName: state.demoSchoolName,
      demoParentEmail: state.demoParentEmail,
      currentSchoolDay: state.currentSchoolDay,
      lastSimCalendarDate: state.lastSimCalendarDate,
      lastSimStatus: state.lastSimStatus,
      lastRunAt: state.lastRunAt,
      studentCount: studentIds.length,
    },
    baseline,
    artifactDatesInRepo: artifactDates,
    rangeSummary: {
      "2026-05-01_to_2026-06-01": summarize(
        dayRows.filter((r) => r.date >= "2026-05-01" && r.date <= "2026-06-01")
      ),
      "2026-06-02_to_2026-06-08": summarize(
        dayRows.filter((r) => r.date >= "2026-06-02" && r.date <= "2026-06-08")
      ),
    },
    partialDays: dayRows
      .filter((r) => r.status === "partial")
      .map((r) => ({ date: r.date, classroomActivities: r.classroomActivities })),
    missingWeekdayDays: dayRows.filter((r) => r.status === "missing").map((r) => r.date),
    dayRows,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
