#!/usr/bin/env node
/** API_PASS — report-data contract units + optional live authenticated HTTP. */
import { runNodeTest, runNodeScript } from "../lib/run-child.mjs";
import { loadEnvFiles, baseUrl, hasLiveSupabaseEnv, hasLiveParentE2EEnv } from "../lib/env.mjs";
import { passGate, failGate, skipGate } from "../lib/gate-result.mjs";
import {
  resolveParentBearer,
  fetchLiveReportData,
  resolveTruthGateStudent,
  getServiceSupabase,
  defaultReportRange,
  assertDevServerReachable,
} from "../lib/live-parent-report.mjs";

loadEnvFiles();

const unitPaths = [
  { path: "tests/parent-server/parent-assigned-activities.test.mjs", runner: "test" },
  { path: "scripts/tests/report-date-range-parent-api.mjs", runner: "script" },
];

for (const { path, runner } of unitPaths) {
  const code = runner === "script" ? runNodeScript(path) : runNodeTest(path);
  if (code !== 0) {
    failGate("API_PASS", `unit contract failed: ${path}`, { usesMock: path.includes("parent-assigned") });
  }
}

if (!hasLiveSupabaseEnv() || !hasLiveParentE2EEnv()) {
  skipGate(
    "API_PASS",
    "live HTTP skipped — unit contracts passed; set Supabase + E2E_PARENT_* for live API_PASS",
    { usesLiveApi: false, usesMock: true, details: { unitOnly: true } }
  );
}

const origin = baseUrl().replace(/\/$/, "");
if (!(await assertDevServerReachable(origin))) {
  skipGate("API_PASS", `dev server unreachable at ${origin}`, { usesLiveApi: false });
}

const supabase = getServiceSupabase();
const auth = await resolveParentBearer(origin);
if (!auth.token) {
  skipGate("API_PASS", auth.reason || "no parent bearer", { usesLiveApi: false });
}

const student = await resolveTruthGateStudent(supabase, auth.userId, {
  origin,
  bearer: auth.token,
  studentUsername: process.env.E2E_STUDENT_USERNAME,
});
if (!student?.id) {
  skipGate("API_PASS", "could not resolve student for live API", { usesLiveApi: false });
}

const range = defaultReportRange(7);
const live = await fetchLiveReportData(origin, student.id, auth.token, range);
if (!live.ok) {
  failGate("API_PASS", `live report-data HTTP ${live.status}`, {
    usesLiveApi: true,
    details: { studentId: student.id, range },
  });
}

passGate("API_PASS", `live report-data OK for student ${student.id}`, {
  usesLiveApi: true,
  usesLiveDb: true,
  details: {
    status: live.status,
    totalAnswers: live.body?.summary?.totalAnswers,
    range,
  },
});
