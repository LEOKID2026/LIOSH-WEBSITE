#!/usr/bin/env node
/**
 * Verify teacher classroom sim via real teacher API (no Playwright).
 * node --env-file=.env.local scripts/teacher-portal/verify-teacher-classroom-sim.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import { SIM_TEACHER_EMAIL, parseConfig, resolvePassword } from "./teacher-classroom-sim/config.mjs";
import { fetchTeacherInsights } from "./teacher-classroom-sim/output.mjs";
import { createAdminClient, verifyUntouchedAccounts } from "./teacher-classroom-sim/bootstrap.mjs";

const config = parseConfig([]);
const manifest = loadManifest(config.stateDir);
if (!manifest) {
  console.error("No manifest — run bootstrap first");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
const password = resolvePassword("SIM_TEACHER_PASSWORD", "747975");

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createAdminClient();

const { data, error } = await anon.auth.signInWithPassword({
  email: SIM_TEACHER_EMAIL,
  password,
});
if (error || !data.session?.access_token) {
  console.error("Teacher login failed:", error?.message);
  process.exit(1);
}

const baseUrl = config.baseUrl.replace(/\/$/, "");
const token = data.session.access_token;

async function apiGet(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const me = await apiGet("/api/teacher/me");
const classes = await apiGet("/api/teacher/classes");
const students = await apiGet("/api/teacher/students");
const classReport = await apiGet(
  `/api/teacher/classes/${manifest.classId}/report-data?from=${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`
);

const sampleIds = [manifest.students[0], manifest.students[9], manifest.students[17]].map((s) => s.id);
const studentReports = [];
for (const id of sampleIds) {
  studentReports.push({
    id,
    ...(await apiGet(
      `/api/teacher/students/${id}/report-data?from=${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`
    )),
  });
}

const insights = await fetchTeacherInsights(admin, manifest).catch((e) => ({ ok: false, error: e.message }));
const untouched = await verifyUntouchedAccounts(admin);

console.log("\n=== Teacher Classroom Sim Verification ===");
console.log(`Teacher login: OK (${SIM_TEACHER_EMAIL})`);
console.log(`GET /api/teacher/me: ${me.status}`, me.body?.data?.limits?.planCode || "");
console.log(`GET /api/teacher/classes: ${classes.status} count=${classes.body?.data?.classes?.length ?? "?"}`);
console.log(`GET /api/teacher/students: ${students.status} count=${students.body?.data?.students?.length ?? "?"}`);
console.log(`GET class report: ${classReport.status} answers=${classReport.body?.data?.cohortSummary?.totalAnswers ?? "?"}`);
console.log(`Class URL: ${baseUrl}/teacher/class/${manifest.classId}`);
for (const sr of studentReports) {
  const answers = sr.body?.data?.summary?.totalAnswers ?? sr.body?.data?.report?.summary?.totalAnswers;
  console.log(`Student ${sr.id}: status=${sr.status} answers=${answers ?? "?"}`);
}
console.log("\nInsights:", insights.ok ? JSON.stringify({
  weakTopics: insights.weakTopics,
  attention: insights.attentionStudents?.length,
  groups: insights.suggestedGroups,
  next: insights.nextLessonFocus,
}, null, 2) : insights.error);
console.log("\nUntouched checks:");
for (const c of untouched) console.log(`  ${c.name}: ${c.value}`);

const ok =
  me.status === 200 &&
  (classes.body?.data?.classes?.length === 1) &&
  (students.body?.data?.students?.length === 20) &&
  classReport.status === 200;

process.exit(ok ? 0 : 1);
