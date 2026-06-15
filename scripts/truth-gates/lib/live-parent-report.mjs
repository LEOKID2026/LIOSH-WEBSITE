/**
 * Live parent report helpers — real Supabase + authenticated report-data HTTP.
 */
import { createClient } from "@supabase/supabase-js";
import { baseUrl, loadEnvFiles } from "./env.mjs";

loadEnvFiles();

const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "";
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || "";

export function getServiceSupabase() {
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

/**
 * @param {string} origin
 */
export async function resolveParentBearer(origin) {
  const identifier =
    process.env.E2E_PARENT_EMAIL ||
    process.env.E2E_PARENT_USERNAME ||
    process.env.TRUTH_GATES_PARENT_EMAIL ||
    "";
  const password =
    process.env.E2E_PARENT_PASSWORD ||
    process.env.SIM_TEACHER_PARENT_PASSWORD ||
    process.env.TRUTH_GATES_PARENT_PASSWORD ||
    "";

  if (!identifier || !password) {
    return { token: null, reason: "missing E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD" };
  }

  if (identifier.includes("@")) {
    const anon = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
    if (!anon) return { token: null, reason: "missing NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY" };
    const authClient = createClient(supabaseUrl, anon, { auth: { persistSession: false } });
    let data;
    let error;
    try {
      ({ data, error } = await authClient.auth.signInWithPassword({
        email: identifier,
        password,
      }));
    } catch (err) {
      return {
        token: null,
        reason: `fetch failed at step=parent login supabase auth; url=${supabaseUrl}; error=${err?.message || String(err)}`,
      };
    }
    if (error || !data?.session?.access_token) {
      return { token: null, reason: error?.message || "parent signIn failed" };
    }
    return {
      token: data.session.access_token,
      userId: data.session.user?.id || null,
      identifier,
    };
  }

  for (const path of ["/api/parent/login", "/api/guardian/login"]) {
    const url = `${origin}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ loginUsername: identifier, pin: password }),
    }).catch((err) => ({
      ok: false,
      status: 0,
      json: async () => ({
        error: `fetch failed at step=parent login endpoint; url=${url}; error=${err?.message || String(err)}`,
      }),
    }));
    if (res?.ok) {
      const json = await res.json().catch(() => ({}));
      const token =
        json?.accessToken || json?.token || json?.session?.access_token || null;
      if (token) return { token, identifier };
    }
  }
  return { token: null, reason: "parent login endpoints failed" };
}

/**
 * @param {string} origin
 * @param {string} studentId
 * @param {string} bearer
 * @param {{ from: string, to: string }} range
 */
export async function fetchLiveReportData(origin, studentId, bearer, range) {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const url = `${origin}/api/parent/students/${encodeURIComponent(studentId)}/report-data?${qs}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(`fetch failed at step=report-data; url=${url}; error=${err?.message || String(err)}`);
  }
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && body?.ok !== false, body };
}

/**
 * Resolve student for truth gates through product parent API.
 * @param {string} origin
 * @param {string} bearer
 */
export async function fetchParentStudentsForGate(origin, bearer) {
  if (!bearer) return { ok: false, status: 401, students: [], reason: "missing parent bearer" };
  const url = `${origin}/api/parent/list-students`;
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(`fetch failed at step=list students; url=${url}; error=${err?.message || String(err)}`);
  }
  const body = await res.json().catch(() => ({}));
  return {
    ok: res.ok && body?.ok !== false,
    status: res.status,
    students: Array.isArray(body?.students) ? body.students : [],
    body,
  };
}

/**
 * Resolve student for truth gates: explicit env id or parent product API child list.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string|null} parentUserId
 * @param {{ origin?: string, bearer?: string, studentUsername?: string }} [opts]
 */
export async function resolveTruthGateStudent(supabase, parentUserId, opts = {}) {
  const envId = process.env.TRUTH_GATES_STUDENT_ID || process.env.E2E_STUDENT_ID || "";
  if (envId) {
    const { data } = await supabase
      .from("students")
      .select("id,full_name,parent_id,grade_level")
      .eq("id", envId)
      .maybeSingle();
    if (data?.id) return data;
  }

  const origin = (opts.origin || baseUrl()).replace(/\/$/, "");
  const bearer = opts.bearer || "";
  if (bearer) {
    const listed = await fetchParentStudentsForGate(origin, bearer);
    if (!listed.ok) return null;
    const active = listed.students.filter((s) => s?.id && s.is_active !== false);
    const wantedUsername = String(opts.studentUsername || process.env.E2E_STUDENT_USERNAME || "")
      .trim()
      .toLowerCase();
    const byUsername = wantedUsername
      ? active.find((s) => String(s.login_username || "").trim().toLowerCase() === wantedUsername)
      : null;
    const picked = byUsername || (active.length === 1 ? active[0] : null);
    if (picked?.id) {
      return {
        id: picked.id,
        full_name: picked.full_name,
        parent_id: parentUserId,
        grade_level: picked.grade_level,
        gradeLevel: picked.grade_level,
        login_username: picked.login_username ?? null,
      };
    }
  }

  return null;
}

/** Default 7-day window ending today (UTC date strings). */
export function defaultReportRange(days = 7) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

/**
 * @param {string} origin
 */
export async function assertDevServerReachable(origin) {
  const root = String(origin).replace(/\/$/, "");
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${root}/`, { redirect: "manual" });
      if (res && res.status > 0 && res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return false;
}
