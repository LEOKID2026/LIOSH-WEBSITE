#!/usr/bin/env node
/**
 * Triage week-20260517 report checkpoint failure (read-only).
 * Run: node --env-file=.env.local scripts/tests/triage-week-20260517.mjs
 */
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import {
  TEACHER_EMAILS,
  SCHOOL_MANAGER_EMAIL,
  defaultBaseUrl,
} from "../school-portal/sim/school-sim-config.mjs";
import { resolveStaffPassword } from "../school-portal/sim/student-credentials.mjs";
import {
  buildTeacherStudentReportPayload,
  buildTeacherParentReportPreviewPayload,
  resolveTeacherReportDateRange,
} from "../../lib/teacher-server/teacher-report.server.js";
import { loadSchoolScopedClassroomActivityRollupForStudentReport } from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import { applySchoolTeacherReportFilter } from "../../lib/school-server/school-subjects.server.js";
import { resolveSchoolReportTeacherForStudent } from "../../lib/school-server/school-scope.server.js";
import { readFileSync } from "node:fs";

const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const STUDENT_ID = "f1ee3d3d-77b5-48cd-96d2-f42eb60a3bea";
const EXPECTED_DEPLOY = "dpl_5niwYxwFSnEifiVDmnkZ2Podpgim";

const API_RANGES = [
  { label: "current_week", from: "2026-05-17", to: "2026-05-21" },
  { label: "current_month_to_21", from: "2026-05-01", to: "2026-05-21" },
  { label: "current_month_to_14", from: "2026-05-01", to: "2026-05-14" },
  { label: "full_range", from: "2025-09-01", to: "2026-05-21" },
  { label: "rolling_30", windowDays: 30 },
];

const DB_RANGES = [
  { label: "week_0517_0521", from: "2026-05-17", to: "2026-05-21" },
  { label: "month_0501_0521", from: "2026-05-01", to: "2026-05-21" },
];

async function getBearer(email, password) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) throw new Error(`auth failed ${email}`);
  return tokenJson.access_token;
}

function dayBounds(from, to) {
  return { fromIso: `${from}T00:00:00.000Z`, toIso: `${to}T23:59:59.999Z` };
}

function totalAnswers(body) {
  return Number(body?.summary?.totalAnswers ?? 0) || 0;
}

function subjectTotals(body) {
  const subs = body?.subjects || {};
  const out = {};
  for (const [k, v] of Object.entries(subs)) {
    out[k] = Number(v?.answers ?? 0) || 0;
  }
  return out;
}

async function fetchProd(baseUrl, path, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return {
    status: res.status,
    total: totalAnswers(body),
    subjects: subjectTotals(body),
    dailyActivity: body?.dailyActivity?.length ?? body?.daily?.length ?? null,
    reportMeta: body?.reportMeta?.range ?? body?.reportMeta ?? null,
    fromEcho: body?.reportMeta?.range?.from ?? body?.from ?? null,
    toEcho: body?.reportMeta?.range?.to ?? body?.to ?? null,
  };
}

function buildPath(route, studentId, { from, to, windowDays } = {}) {
  const q = new URLSearchParams({ studentId });
  if (from && to) {
    q.set("from", from);
    q.set("to", to);
  } else {
    q.set("windowDays", String(windowDays ?? 30));
  }
  if (route === "R2") return `/api/teacher/students/${studentId}/report-data?${q}`;
  if (route === "R3") return `/api/teacher/students/${studentId}/parent-report-data?${q}`;
  return `/api/school/students/${studentId}/report-data?${q}`;
}

async function dbGroundTruth(admin, studentId, from, to) {
  const { fromIso, toIso } = dayBounds(from, to);

  const { data: memberships } = await admin
    .from("class_memberships")
    .select("class_id")
    .eq("student_id", studentId)
    .eq("school_id", DEMO_SCHOOL_ID);
  const classIds = [...new Set((memberships || []).map((m) => m.class_id).filter(Boolean))];

  const { data: activities } = await admin
    .from("classroom_activities")
    .select("id, subject, activated_at, closed_at, created_at, class_id")
    .in("class_id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"])
    .neq("status", "archived")
    .neq("mode", "discussion")
    .gte("activated_at", fromIso)
    .lte("activated_at", toIso);

  const actRows = activities || [];
  const actIds = actRows.map((a) => a.id);

  let statusRows = [];
  for (let i = 0; i < actIds.length; i += 80) {
    const chunk = actIds.slice(i, i + 80);
    const { data: st } = await admin
      .from("classroom_activity_student_status")
      .select("activity_id, answers_count, correct_count, status")
      .in("activity_id", chunk)
      .eq("student_id", studentId);
    statusRows.push(...(st || []));
  }

  const bySubject = {};
  let totalAnswers = 0;
  let totalStatus = 0;
  let mathAnswers = 0;
  for (const st of statusRows) {
    const act = actRows.find((a) => a.id === st.activity_id);
    const subj = act?.subject || "unknown";
    const ans = Number(st.answers_count || 0);
    totalAnswers += ans;
    totalStatus += 1;
    bySubject[subj] = (bySubject[subj] || 0) + ans;
    if (subj === "math") mathAnswers += ans;
  }

  const { count: hpSessions } = await admin
    .from("learning_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("school_id", DEMO_SCHOOL_ID)
    .gte("started_at", fromIso)
    .lte("started_at", toIso);

  let hpAnswers = 0;
  if (hpSessions > 0) {
    const { data: sessions } = await admin
      .from("learning_sessions")
      .select("id")
      .eq("student_id", studentId)
      .eq("school_id", DEMO_SCHOOL_ID)
      .gte("started_at", fromIso)
      .lte("started_at", toIso);
    const sessionIds = (sessions || []).map((s) => s.id);
    for (let i = 0; i < sessionIds.length; i += 80) {
      const chunk = sessionIds.slice(i, i + 80);
      const { data: ans } = await admin
        .from("answers")
        .select("id")
        .in("session_id", chunk);
      hpAnswers += (ans || []).length;
    }
  }

  return {
    classIds: classIds.length,
    activitiesInRange: actRows.length,
    statusRows: totalStatus,
    classroomAnswers: totalAnswers,
    mathAnswers,
    bySubject,
    hpSessions: hpSessions ?? 0,
    hpAnswers,
  };
}

async function localBuild(admin, danId, rangeSpec) {
  const resolved = resolveTeacherReportDateRange(
    rangeSpec.from
      ? { from: rangeSpec.from, to: rangeSpec.to }
      : { windowDays: rangeSpec.windowDays ?? 30 }
  );
  if (!resolved.ok) return { error: "bad range" };
  const { fromDate, toDate } = resolved;

  const rollup = await loadSchoolScopedClassroomActivityRollupForStudentReport({
    serviceRole: admin,
    schoolId: DEMO_SCHOOL_ID,
    studentId: STUDENT_ID,
    fromDate,
    toDate,
    gradeLevel: "1",
    physicalClassName: null,
  });

  const r2 = await buildTeacherStudentReportPayload(
    { serviceRole: admin, teacherId: danId, studentId: STUDENT_ID, fromDate, toDate },
    { skipAudit: true }
  );
  const r2f = r2.ok ? await applySchoolTeacherReportFilter(admin, danId, r2.payload) : null;

  const r3 = await buildTeacherParentReportPreviewPayload({
    serviceRole: admin,
    teacherId: danId,
    studentId: STUDENT_ID,
    fromDate,
    toDate,
  });
  const r3f = r3.ok ? await applySchoolTeacherReportFilter(admin, danId, r3.payload) : null;

  const rt = await resolveSchoolReportTeacherForStudent(admin, DEMO_SCHOOL_ID, STUDENT_ID, {});
  const r4 = rt.ok
    ? await buildTeacherStudentReportPayload(
        { serviceRole: admin, teacherId: rt.teacherId, studentId: STUDENT_ID, fromDate, toDate },
        { skipAudit: true, gradeLevel: "1" }
      )
    : null;

  return {
    rollupAnswers: rollup.ok ? rollup.rollup?.answers ?? 0 : null,
    R2: r2f?.ok ? totalAnswers(r2f.payload) : null,
    R3: r3f?.ok ? totalAnswers(r3f.payload) : null,
    R4: r4?.ok ? totalAnswers(r4.payload) : null,
    R2math: r2f?.ok ? subjectTotals(r2f.payload).math ?? 0 : null,
  };
}

function checkDeploySource() {
  const src = readFileSync("lib/teacher-server/classroom-activity-class-report.server.js", "utf8");
  const teacherSrc = readFileSync("lib/teacher-server/teacher-report.server.js", "utf8");
  return {
    localHasPagination: src.includes("fetchScopedClassroomActivitiesForClassIds") && src.includes("BATCH_PAGE"),
    localHasChunking: src.includes("ACTIVITY_ID_IN_CHUNK = 80"),
    localHasR2GradeLevel: teacherSrc.includes("gradeLevel: options.gradeLevel ?? loaded.student?.grade_level"),
  };
}

async function main() {
  const admin = createServiceRole();
  const pw = resolveStaffPassword();
  const baseUrl = defaultBaseUrl();
  const danToken = await getBearer(TEACHER_EMAILS.dan, pw);
  const schoolToken = await getBearer(SCHOOL_MANAGER_EMAIL, pw);
  const dan = await findAuthUserByEmail(admin, TEACHER_EMAILS.dan);

  const artifactPath =
    "reports/school-sim-backfill/2025-09-01__2026-05-28/weeks/week-20260517/report-checkpoint.json";
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const histChecks = artifact.reportResult?.historicalReportChecks?.checks || [];
  const spotFails = histChecks.filter(
    (c) =>
      c.path?.includes(STUDENT_ID.slice(0, 8)) &&
      (c.route === "R2" || c.route === "R3" || c.route === "R4") &&
      c.ok === false
  );

  const out = {
    artifact: {
      kind: artifact.kind,
      currentDateIso: artifact.currentDateIso,
      reportStatus: artifact.reportResult?.status,
      historicalFailCount: spotFails.length,
      spotHistoricalFails: spotFails.map((c) => ({
        range: c.range,
        route: c.route,
        from: c.from,
        to: c.to,
        total: c.total,
        status: c.status,
      })),
      r3Browser: artifact.reportResult?.r3BridgeBrowser?.students?.[STUDENT_ID] ?? null,
    },
    dbGroundTruth: {},
    productionApi: {},
    localBuild: {},
    deploySource: checkDeploySource(),
  };

  for (const r of DB_RANGES) {
    out.dbGroundTruth[r.label] = await dbGroundTruth(admin, STUDENT_ID, r.from, r.to);
  }

  for (const r of API_RANGES) {
    out.productionApi[r.label] = {};
    for (const route of ["R2", "R3", "R4"]) {
      const path = buildPath(route, STUDENT_ID, r);
      const token = route === "R4" ? schoolToken : danToken;
      out.productionApi[r.label][route] = await fetchProd(baseUrl, path, token);
    }
  }

  for (const r of API_RANGES.filter((x) => x.from)) {
    out.localBuild[r.label] = await localBuild(admin, dan.id, r);
  }
  out.localBuild.rolling_30 = await localBuild(admin, dan.id, { windowDays: 30 });

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
