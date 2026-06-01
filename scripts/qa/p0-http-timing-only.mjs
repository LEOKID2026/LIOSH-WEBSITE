#!/usr/bin/env node
/** One-off HTTP timing for P0 verification — routes measured sequentially. */
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { createServiceRole, findAuthUserByEmail } from "../school-portal/demo-school-lib.mjs";
import { physicalClassName } from "../school-portal/demo-school-data.mjs";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const GRADE = "1";
const PHYSICAL = physicalClassName(1, 1);
const CLASS_PHYSICAL = physicalClassName(1, 2);
const CLASS_SUBJECT = "geometry";

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function signIn(email, password) {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message || "signIn failed");
  return data.session.access_token;
}

function parseST(header) {
  if (!header) return {};
  const out = {};
  for (const part of String(header).split(",")) {
    const m = part.trim().match(/^(\w+);dur=(\d+)/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

async function measure(path, token, timeoutMs, label) {
  const t0 = performance.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ac.signal,
    });
    const wallMs = Math.round(performance.now() - t0);
    const text = await res.text();
    return {
      path,
      label: label || path,
      status: res.status,
      wallMs,
      serverTiming: parseST(res.headers.get("server-timing")),
      bodyBytes: Buffer.byteLength(text, "utf8"),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const pw =
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    process.env.SCHOOL_SECURITY_TEST_PASSWORD;
  if (!pw) throw new Error("Missing DEMO_TEACHER_PASSWORD or SCHOOL_QA_PASSWORD");

  const admin = createServiceRole();
  const dan = await findAuthUserByEmail(admin, "dan@leo-k.com");
  const { data: cls } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", dan.id)
    .eq("name", CLASS_PHYSICAL)
    .eq("subject_focus", CLASS_SUBJECT)
    .maybeSingle();
  const { data: roster } = await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", cls.id)
    .is("removed_at", null)
    .limit(1);
  const studentId = roster[0].student_id;

  const danToken = await signIn("dan@leo-k.com", pw);
  const schoolToken = await signIn("school@leo-k.com", pw);

  const routes = [
    { path: "/api/teacher/dashboard", label: "teacher_dashboard_shell", token: danToken, timeout: 60_000 },
    {
      path: "/api/teacher/dashboard/activity",
      label: "teacher_dashboard_activity",
      token: danToken,
      timeout: 180_000,
    },
    {
      path: "/api/teacher/dashboard?phase=full",
      label: "teacher_dashboard_full",
      token: danToken,
      timeout: 180_000,
    },
    {
      path: `/api/teacher/classes/${cls.id}/report-data?windowDays=30`,
      token: danToken,
      timeout: 120_000,
    },
    {
      path: `/api/teacher/students/${studentId}/report-data?windowDays=30&classId=${cls.id}`,
      token: danToken,
      timeout: 120_000,
    },
    {
      path: `/api/school/classes/physical-report?gradeLevel=${encodeURIComponent(GRADE)}&physicalClassName=${encodeURIComponent(PHYSICAL)}&windowDays=30`,
      token: schoolToken,
      timeout: 180_000,
    },
    {
      path: `/api/school/students?gradeLevel=${encodeURIComponent(GRADE)}&physicalClassName=${encodeURIComponent(PHYSICAL)}`,
      token: schoolToken,
      timeout: 120_000,
    },
  ];

  const results = [];
  for (const r of routes) {
    process.stderr.write(`measuring ${r.path} ...\n`);
    try {
      results.push(await measure(r.path, r.token, r.timeout, r.label));
    } catch (e) {
      results.push({ path: r.path, error: e.message });
    }
  }

  // warm school students after browse-status primes cache
  const browsePath = `/api/school/classes/browse-status?gradeLevel=${encodeURIComponent(GRADE)}`;
  process.stderr.write(`priming cache via ${browsePath} ...\n`);
  try {
    results.push({ label: "browse_status_prime", ...(await measure(browsePath, schoolToken, 180_000)) });
  } catch (e) {
    results.push({ path: browsePath, label: "browse_status_prime", error: e.message });
  }

  const q = `/api/school/students?gradeLevel=${encodeURIComponent(GRADE)}&physicalClassName=${encodeURIComponent(PHYSICAL)}`;
  process.stderr.write(`measuring ${q} (post browse-status) ...\n`);
  try {
    results.push({ label: "students_post_browse_status", ...(await measure(q, schoolToken, 120_000)) });
  } catch (e) {
    results.push({ path: q, label: "students_post_browse_status", error: e.message });
  }

  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2));
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
