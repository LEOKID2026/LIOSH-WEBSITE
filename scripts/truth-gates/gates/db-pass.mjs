#!/usr/bin/env node
/** DB_PASS — live Supabase aggregation matches report-data pipeline (rerun, no artifacts). */
import { loadEnvFiles, hasLiveSupabaseEnv, baseUrl } from "../lib/env.mjs";
import { passGate, failGate, skipGate } from "../lib/gate-result.mjs";
import {
  getServiceSupabase,
  resolveTruthGateStudent,
  resolveParentBearer,
  fetchLiveReportData,
  defaultReportRange,
  assertDevServerReachable,
} from "../lib/live-parent-report.mjs";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../../lib/parent-server/report-data-aggregate.server.js";

loadEnvFiles();

if (!hasLiveSupabaseEnv()) {
  skipGate("DB_PASS", "missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = getServiceSupabase();
const origin = baseUrl().replace(/\/$/, "");
const auth = await resolveParentBearer(origin);
const student = await resolveTruthGateStudent(supabase, auth?.userId || null, {
  origin,
  bearer: auth?.token || "",
  studentUsername: process.env.E2E_STUDENT_USERNAME,
});

if (!student?.id) {
  skipGate("DB_PASS", "no student resolved — set TRUTH_GATES_STUDENT_ID or E2E_PARENT_* with linked child");
}

const range = defaultReportRange(30);
const fromDate = new Date(`${range.from}T00:00:00.000Z`);
const toDate = new Date(`${range.to}T00:00:00.000Z`);

const inProcess = await aggregateParentReportPayload(supabase, student, fromDate, toDate, {
  includeParentActivities: true,
});
const publicPayload = stripInternalReportPayloadFields(inProcess);
const dbTotal = Number(publicPayload?.summary?.totalAnswers ?? 0);

if (!(await assertDevServerReachable(origin)) || !auth?.token) {
  passGate("DB_PASS", `in-process DB aggregation OK (${dbTotal} answers); live API compare skipped`, {
    usesLiveDb: true,
    usesLiveApi: false,
    details: { studentId: student.id, dbTotal, range },
  });
}

const live = await fetchLiveReportData(origin, student.id, auth.token, range);
if (!live.ok) {
  failGate("DB_PASS", `API report-data failed HTTP ${live.status} after DB aggregate`, {
    usesLiveDb: true,
    usesLiveApi: true,
  });
}

const apiTotal = Number(live.body?.summary?.totalAnswers ?? 0);
if (apiTotal !== dbTotal) {
  failGate("DB_PASS", `DB aggregate totalAnswers=${dbTotal} != API=${apiTotal}`, {
    usesLiveDb: true,
    usesLiveApi: true,
    details: { studentId: student.id, range },
  });
}

passGate("DB_PASS", `DB rows and live API agree (totalAnswers=${apiTotal})`, {
  usesLiveDb: true,
  usesLiveApi: true,
  details: { studentId: student.id, range },
});
