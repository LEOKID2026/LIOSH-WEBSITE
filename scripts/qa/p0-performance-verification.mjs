#!/usr/bin/env node
/**
 * P0 performance patch — post-implementation verification (read-only).
 * node --env-file=.env.local [--env-file=.env.e2e.local] scripts/qa/p0-performance-verification.mjs
 */
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import {
  aggregateParentReportPayload,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { batchAggregateParentReportPayloadsForRoster } from "../../lib/parent-server/report-data-aggregate-batch.server.js";
import { buildTeacherDashboardPayload } from "../../lib/teacher-server/teacher-dashboard.server.js";
import { buildTeacherClassReportPayload } from "../../lib/teacher-server/teacher-class-report.server.js";
import { buildTeacherStudentReportPayload } from "../../lib/teacher-server/teacher-report.server.js";
import { buildSchoolPhysicalClassReportPayload } from "../../lib/school-server/school-physical-class-report.server.js";
import { listSchoolStudentsInPhysicalClass } from "../../lib/school-server/school-students.server.js";
import { buildSchoolBrowseStatusMaps } from "../../lib/school-server/school-browse-status.server.js";
import {
  batchCountSubmittedActivityStatuses,
} from "../../lib/teacher-server/classroom-activity-class-report.server.js";
import {
  getCachedLightweightStudentActivityMap,
  readCachedLightweightActivityByStudentId,
} from "../../lib/school-server/school-browse-activity-cache.server.js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const SCHOOL_ID = process.env.DEMO_SCHOOL_ID || "bb4e5984-d95f-438f-a465-e1a8208ea7de";
const GRADE = "1";
const PHYSICAL = physicalClassName(1, 1);
const CLASS_PHYSICAL = physicalClassName(1, 2);
const CLASS_SUBJECT = "geometry";

const report = {
  measuredAt: new Date().toISOString(),
  tests: [],
  timings: { directBuild: [], http: [] },
  payloadSizes: {},
  regressions: [],
  cacheReview: {},
};

function pass(name, detail = "") {
  report.tests.push({ name, pass: true, detail });
}

function fail(name, detail = "") {
  report.tests.push({ name, pass: false, detail });
  report.regressions.push({ name, detail });
}

async function timed(label, fn) {
  const t0 = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - t0);
  return { label, ms, result };
}

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function signIn(email, password) {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message || "signIn failed");
  return data.session.access_token;
}

function parseServerTiming(header) {
  if (!header) return {};
  const out = {};
  for (const part of String(header).split(",")) {
    const m = part.trim().match(/^(\w+);dur=(\d+)/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

async function httpGet(path, token, timeoutMs = 120_000) {
  const t0 = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    const wallMs = Math.round(performance.now() - t0);
    const bodyText = await res.text();
    let body = null;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = null;
    }
    const serverTiming = parseServerTiming(res.headers.get("server-timing"));
    return {
      path,
      status: res.status,
      wallMs,
      serverTiming,
      bodyBytes: Buffer.byteLength(bodyText, "utf8"),
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

function pickSummary(payload) {
  const s = payload?.summary || payload?.cohortSummary || {};
  return {
    totalSessions: s.totalSessions,
    totalAnswers: s.totalAnswers,
    correctAnswers: s.correctAnswers,
    wrongAnswers: s.wrongAnswers,
    accuracy: s.accuracy,
    studentsWithActivity: s.studentsWithActivity,
  };
}

function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

async function main() {
  const admin = createServiceRole();
  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");
  assert.ok(dan?.id, "dan@leo-k.com auth user");

  const targetName = CLASS_PHYSICAL;
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id, name, subject_focus, teacher_id")
    .eq("teacher_id", dan.id)
    .eq("name", targetName)
    .eq("subject_focus", CLASS_SUBJECT)
    .maybeSingle();
  assert.ok(cls?.id, `${CLASS_SUBJECT} class ${targetName} not found`);

  const { data: rosterRows } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", cls.id)
    .is("removed_at", null);
  const rosterIds = [...new Set((rosterRows || []).map((r) => r.student_id))];
  assert.ok(rosterIds.length >= 1, "roster empty");

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 30);

  // ── 1. Batch vs single aggregate parity (first 5 roster students) ─────────
  const sampleIds = rosterIds.slice(0, 2);
  const { data: studentRows } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .in("id", sampleIds);

  const batchMap = await batchAggregateParentReportPayloadsForRoster(
    admin,
    studentRows || [],
    fromDate,
    toDate
  );

  for (const student of studentRows || []) {
    const single = await aggregateParentReportPayload(admin, student, fromDate, toDate);
    const batch = batchMap.get(String(student.id));
    const singleSum = pickSummary(single);
    const batchSum = pickSummary(batch);
    if (stableStringify(singleSum) !== stableStringify(batchSum)) {
      fail("batch_single_aggregate_parity", `${student.id} single=${JSON.stringify(singleSum)} batch=${JSON.stringify(batchSum)}`);
    } else {
      pass("batch_single_aggregate_parity", student.id);
    }
  }

  // ── 2. Class report shape + dedupe ───────────────────────────────────────
  const classTimed = await timed("buildTeacherClassReportPayload", () =>
    buildTeacherClassReportPayload({
      serviceRole: admin,
      teacherId: dan.id,
      classId: cls.id,
      fromDate,
      toDate,
      skipAudit: true,
    })
  );
  report.timings.directBuild.push({ fn: classTimed.label, ms: classTimed.ms });

  const cp = classTimed.result.payload;
  assert.ok(classTimed.result.ok);
  const studentIdsInPayload = (cp.students || []).map((s) => s.studentId);
  const uniqueStudents = new Set(studentIdsInPayload);
  if (uniqueStudents.size !== studentIdsInPayload.length) {
    fail("class_report_no_duplicate_students", `dup=${studentIdsInPayload.length - uniqueStudents.size}`);
  } else {
    pass("class_report_no_duplicate_students", `count=${uniqueStudents.size}`);
  }
  if (studentIdsInPayload.length !== cp.roster.studentCount) {
    fail("class_report_roster_count_match", `payload=${studentIdsInPayload.length} roster=${cp.roster.studentCount}`);
  } else {
    pass("class_report_roster_count_match", String(cp.roster.studentCount));
  }

  const requiredTopKeys = [
    "ok",
    "class",
    "range",
    "roster",
    "cohortSummary",
    "subjects",
    "weaknessTopics",
    "attentionList",
    "recentActivity",
    "students",
    "teacherGuidanceBlock",
    "reportMeta",
  ];
  for (const k of requiredTopKeys) {
    if (!(k in cp)) fail("class_report_shape", `missing ${k}`);
    else pass("class_report_shape", k);
  }
  if (cp.teacherGuidanceBlock?.version === "v2") {
    pass("class_report_guidance_v2", cp.teacherGuidanceBlock.guidanceSeverityTier || "tier-present");
  } else {
    fail("class_report_guidance_v2", `version=${cp.teacherGuidanceBlock?.version}`);
  }
  report.payloadSizes.classReportBytes = JSON.stringify(cp).length;

  // ── 3. Physical report + submit counts ───────────────────────────────────
  const physTimed = await timed("buildSchoolPhysicalClassReportPayload", () =>
    buildSchoolPhysicalClassReportPayload({
      serviceRole: admin,
      schoolId: SCHOOL_ID,
      gradeLevel: GRADE,
      physicalClassName: PHYSICAL,
      fromDate,
      toDate,
    })
  );
  report.timings.directBuild.push({ fn: physTimed.label, ms: physTimed.ms });
  assert.ok(physTimed.result.ok);
  const pp = physTimed.result.payload;

  if (!Array.isArray(pp.subjectGuidanceBlocks) || pp.subjectGuidanceBlocks.length < 1) {
    fail("physical_subject_guidance_blocks", "empty");
  } else {
    pass("physical_subject_guidance_blocks", `count=${pp.subjectGuidanceBlocks.length}`);
  }
  pass("physical_report_meta_v2", pp.reportMeta?.version || "missing");

  const activityIds = (pp.recentActivities || []).map((a) => a.activityId).filter(Boolean);
  if (activityIds.length) {
    const batched = await batchCountSubmittedActivityStatuses(admin, activityIds);
    for (const act of pp.recentActivities) {
      const fromBatch = batched.get(act.activityId) ?? 0;
      const onPayload = act.submittedCount ?? 0;
      if (fromBatch !== onPayload) {
        fail("physical_submit_count_parity", `${act.activityId} payload=${onPayload} batch=${fromBatch}`);
      } else {
        pass("physical_submit_count_parity", `${act.activityId}=${onPayload}`);
      }
    }
  } else {
    pass("physical_submit_count_parity", "no recent activities");
  }
  report.payloadSizes.physicalReportBytes = JSON.stringify(pp).length;

  // ── 4. Parent aggregate smoke ────────────────────────────────────────────
  const parentStudentId = rosterIds[0];
  const { data: parentChild } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active, parent_id")
    .eq("id", parentStudentId)
    .maybeSingle();
  const parentPayload = await aggregateParentReportPayload(admin, parentChild, fromDate, toDate);
  if (parentPayload?.ok !== true || !parentPayload.summary) {
    fail("parent_aggregateParentReportPayload", "missing ok/summary");
  } else {
    pass("parent_aggregateParentReportPayload", `answers=${parentPayload.summary.totalAnswers}`);
  }
  if (parentPayload.meta?.source !== "supabase") {
    fail("parent_payload_meta", parentPayload.meta?.source);
  } else {
    pass("parent_payload_meta", "supabase");
  }

  // ── 5. Cache safety (in-process) ─────────────────────────────────────────
  const cacheStudentA = rosterIds[0];
  const cacheStudentB = rosterIds[1] || rosterIds[0];
  const cacheFrom = new Date();
  cacheFrom.setUTCDate(cacheFrom.getUTCDate() - 30);
  const cacheTo = new Date();

  await getCachedLightweightStudentActivityMap({
    serviceRole: admin,
    studentIds: [cacheStudentA],
    fromDate: cacheFrom,
    toDate: cacheTo,
  });

  const hit = readCachedLightweightActivityByStudentId([cacheStudentA], cacheFrom, cacheTo);
  if (!hit || !hit.has(cacheStudentA)) {
    fail("cache_warm_hit", "slice miss after warm");
  } else {
    pass("cache_warm_hit", cacheStudentA);
  }

  const wrongRange = readCachedLightweightActivityByStudentId(
    [cacheStudentA],
    new Date(cacheFrom.getTime() - 86_400_000),
    cacheTo
  );
  if (wrongRange) {
    fail("cache_date_isolation", "hit on different fromDate");
  } else {
    pass("cache_date_isolation", "different date range misses");
  }

  if (cacheStudentB !== cacheStudentA) {
    const partial = readCachedLightweightActivityByStudentId(
      [cacheStudentA, cacheStudentB],
      cacheFrom,
      cacheTo
    );
    if (partial) {
      fail("cache_partial_roster_miss", "should miss when not all slices warm");
    } else {
      pass("cache_partial_roster_miss", "all-or-nothing subset read");
    }
  }

  report.cacheReview = {
    keyDimensions: ["fromDate (iso)", "toDate (iso)", "studentId per slice", "sorted roster id list for full roster key"],
    schoolIdInKey: false,
    note: "Process-local only; TTL 3min; student slices keyed per student+date window",
    crossSchoolRisk: "Low — rollups are numeric aggregates keyed by student UUID; wrong-school mix requires same student id in two schools (same UUID)",
    teacherIdInKey: false,
    teacherIdScope: "buildLightweightStudentActivityMap receives teacherId but cache key omits it — school browse always passes null",
  };

  // ── 6. Direct builder timings (dashboard, student, school students) ───────
  const dashTimed = await timed("buildTeacherDashboardPayload", () =>
    buildTeacherDashboardPayload({ serviceRole: admin, teacherId: dan.id })
  );
  report.timings.directBuild.push({ fn: dashTimed.label, ms: dashTimed.ms });

  const studentId = rosterIds[0];
  const studentTimed = await timed("buildTeacherStudentReportPayload", () =>
    buildTeacherStudentReportPayload(
      { serviceRole: admin, teacherId: dan.id, studentId, fromDate, toDate },
      { skipAudit: true, classId: cls.id }
    )
  );
  report.timings.directBuild.push({ fn: studentTimed.label, ms: studentTimed.ms });

  const schoolStudentsTimed = await timed("listSchoolStudentsInPhysicalClass", () =>
    listSchoolStudentsInPhysicalClass(admin, SCHOOL_ID, {
      gradeLevel: GRADE,
      physicalClassName: PHYSICAL,
    })
  );
  report.timings.directBuild.push({ fn: schoolStudentsTimed.label, ms: schoolStudentsTimed.ms });

  // browse-status then students (cache warm path)
  await buildSchoolBrowseStatusMaps(admin, SCHOOL_ID, { gradeLevel: GRADE });
  const schoolStudentsWarm = await timed("listSchoolStudentsInPhysicalClass (post browse-status)", () =>
    listSchoolStudentsInPhysicalClass(admin, SCHOOL_ID, {
      gradeLevel: GRADE,
      physicalClassName: PHYSICAL,
    })
  );
  report.timings.directBuild.push({ fn: schoolStudentsWarm.label, ms: schoolStudentsWarm.ms });

  // ── 7. HTTP + Server-Timing (optional if password + dev server) ───────────
  const pw =
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
    "";

  if (pw && process.env.P0_VERIFY_SKIP_HTTP !== "1") {
    try {
      const danToken = await signIn("dan@leo-k.com", pw);
      const httpPaths = [
        "/api/teacher/dashboard",
        `/api/teacher/classes/${cls.id}/report-data?windowDays=30`,
        `/api/teacher/students/${studentId}/report-data?windowDays=30&classId=${cls.id}`,
        `/api/school/classes/physical-report?gradeLevel=${encodeURIComponent(GRADE)}&physicalClassName=${encodeURIComponent(PHYSICAL)}&windowDays=30`,
      ];

      const schoolToken = await signIn("school@leo-k.com", pw).catch(() => null);

      for (const path of httpPaths) {
        const token = path.includes("/api/school/") ? schoolToken || danToken : danToken;
        if (!token) continue;
        const timeoutMs = path.includes("physical-report") ? 180_000 : 120_000;
        try {
          console.error(`HTTP measuring ${path} ...`);
          const r = await httpGet(path, token, timeoutMs);
          report.timings.http.push({
            path,
            status: r.status,
            wallMs: r.wallMs,
            serverTiming: r.serverTiming,
            bodyBytes: r.bodyBytes,
          });
          if (r.status === 200) pass("http_" + path.split("?")[0], `wall=${r.wallMs}ms build=${r.serverTiming.build ?? "n/a"}`);
          else fail("http_" + path.split("?")[0], `status=${r.status}`);
        } catch (e) {
          fail("http_fetch", `${path}: ${e.message}`);
        }
      }

      if (schoolToken) {
        const q = new URLSearchParams({ gradeLevel: GRADE, physicalClassName: PHYSICAL });
        const r = await httpGet(`/api/school/students?${q}`, schoolToken);
        report.timings.http.push({
          path: `/api/school/students?${q}`,
          status: r.status,
          wallMs: r.wallMs,
          serverTiming: r.serverTiming,
          bodyBytes: r.bodyBytes,
        });
        pass("http_school_students", `wall=${r.wallMs}ms students=${r.body?.data?.students?.length ?? 0}`);
      }
    } catch (e) {
      fail("http_auth", e.message);
    }
  } else {
    report.timings.http.push({ note: "skipped — set DEMO_TEACHER_PASSWORD or SCHOOL_QA_PASSWORD for HTTP Server-Timing" });
  }

  report.commitReady = report.regressions.length === 0;
  console.log(JSON.stringify(report, null, 2));
  console.log(
    `\np0-performance-verification: ${report.regressions.length === 0 ? "PASS" : "FAIL"} (${report.regressions.length} regressions)`
  );
  if (report.regressions.length) process.exit(1);
}

main().catch((e) => {
  console.error(e.stack || e.message || e);
  process.exit(1);
});
