#!/usr/bin/env node
import { TEACHER_EMAILS, SCHOOL_MANAGER_EMAIL, defaultBaseUrl } from "../school-portal/sim/school-sim-config.mjs";
import { resolveStaffPassword } from "../school-portal/sim/student-credentials.mjs";

const STUDENT_ID = "f1ee3d3d-77b5-48cd-96d2-f42eb60a3bea";

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

function pathFor(route, from, to) {
  const q = new URLSearchParams({ studentId: STUDENT_ID, from, to });
  if (route === "R4") return `/api/school/students/${STUDENT_ID}/report-data?${q}`;
  const suffix = route === "R3" ? "parent-report-data" : "report-data";
  return `/api/teacher/students/${STUDENT_ID}/${suffix}?${q}`;
}

async function fetchTotal(baseUrl, path, token) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, total: Number(body?.summary?.totalAnswers ?? 0) || 0 };
}

const RANGES = [
  { label: "0501_0514", from: "2026-05-01", to: "2026-05-14", exp: { R2: 160, R3: 160, R4: 420 } },
  { label: "0517_0521", from: "2026-05-17", to: "2026-05-21", exp: { R2: 60, R3: 60, R4: 180 } },
  { label: "0524_0528", from: "2026-05-24", to: "2026-05-28", exp: { R2: 60, R3: 60, R4: 180 } },
  { label: "0501_0528", from: "2026-05-01", to: "2026-05-28", exp: { R2: 280, R3: 280, R4: 780 } },
  { label: "full_range", from: "2025-09-01", to: "2026-05-28", exp: { R2: 2700, R3: 2700, R4: 7380 } },
];

const baseUrl = defaultBaseUrl();
const pw = resolveStaffPassword();
const danToken = await getBearer(TEACHER_EMAILS.dan, pw);
const schoolToken = await getBearer(SCHOOL_MANAGER_EMAIL, pw);

const out = { baseUrl, ranges: {} };
for (const r of RANGES) {
  out.ranges[r.label] = {
    R2: await fetchTotal(baseUrl, pathFor("R2", r.from, r.to), danToken),
    R3: await fetchTotal(baseUrl, pathFor("R3", r.from, r.to), danToken),
    R4: await fetchTotal(baseUrl, pathFor("R4", r.from, r.to), schoolToken),
    expected: r.exp,
  };
}
console.log(JSON.stringify(out, null, 2));
