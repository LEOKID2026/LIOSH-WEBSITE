#!/usr/bin/env node
/**
 * QA-only: provision throwaway school operators on School A (security matrix fixtures)
 * and capture staff-session cookies for Phase 4 technical GREEN live HTTP tests.
 *
 *   node --env-file=.env.local scripts/security/school-phase4-qa-staff-cookie-fixtures.mjs
 *
 * Requires dev server at SCHOOL_A_BASE_URL (default http://localhost:3001).
 * Mutates QA throwaway accounts only — never demo @leo-k.com production identities.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const MANAGER_EMAIL = "school-qa-a@leo.com";
const FIXTURES_IN = path.join(ROOT, "reports/security/school-phase4-5-qa-fixtures.json");
const FIXTURES_OUT = path.join(ROOT, "reports/security/school-phase4-technical-green-fixtures.json");

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function baseUrl() {
  return (
    env("SCHOOL_A_BASE_URL") ||
    env("PHASE45_BASE_URL") ||
    env("SCHOOL_PORTAL_BASE_URL") ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

function qaPassword() {
  return env("SCHOOL_SECURITY_TEST_PASSWORD") || env("SCHOOL_QA_PASSWORD") || env("DEMO_TEACHER_PASSWORD");
}

async function signInSupabase(email, password) {
  const url = env("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = env("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`signIn failed for ${email}: ${json.error_description || json.msg}`);
  return json.access_token;
}

function extractStaffCookie(res) {
  const raw = res.headers.get("set-cookie") || "";
  const m = raw.match(/liosh_staff_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function staffLogin(staffCode, pin) {
  const res = await fetch(`${baseUrl()}/api/school/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffCode, pin }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cookie: extractStaffCookie(res) };
}

async function apiBearer(method, urlPath, bearer, body) {
  const res = await fetch(`${baseUrl()}${urlPath}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(body != null ? { "Content-Type": "application/json" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, code: json?.error?.code || null };
}

async function apiStaffCookie(method, urlPath, cookie, body) {
  const res = await fetch(`${baseUrl()}${urlPath}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: `liosh_staff_session=${cookie}` } : {}),
      ...(body != null ? { "Content-Type": "application/json" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, code: json?.error?.code || null };
}

async function provisionOperatorWithCookie(managerToken, displayName, grants) {
  const prov = await apiBearer("POST", "/api/school/operators", managerToken, { displayName });
  if (prov.status !== 201) {
    throw new Error(`provision ${displayName} failed: HTTP ${prov.status} ${prov.code || ""}`);
  }
  const operatorUserId = prov.json?.data?.operatorUserId;
  const staffCode = prov.json?.data?.staffCode;
  const initialPin = prov.json?.data?.initialPin;
  if (!operatorUserId || !staffCode || !initialPin) {
    throw new Error(`provision ${displayName} missing credentials in response`);
  }

  const login = await staffLogin(staffCode, initialPin);
  if (login.status !== 200 || !login.cookie) {
    throw new Error(`staff login failed for ${displayName}: HTTP ${login.status}`);
  }

  const chosenPin = `${String((Date.now() % 9000) + 1000).padStart(4, "0")}`;
  const pinChange = await apiStaffCookie("POST", "/api/school/staff/change-pin", login.cookie, {
    currentPin: initialPin,
    newPin: chosenPin,
    confirmPin: chosenPin,
  });
  if (pinChange.status !== 200) {
    throw new Error(`change-pin failed for ${displayName}: HTTP ${pinChange.status}`);
  }

  if (grants) {
    const patch = await apiBearer("PATCH", `/api/school/operators/${operatorUserId}/grants`, managerToken, grants);
    if (patch.status !== 200) {
      throw new Error(`grants patch failed for ${displayName}: HTTP ${patch.status}`);
    }
  }

  const me = await apiStaffCookie("GET", "/api/school/me", login.cookie);
  if (me.status !== 200 || me.json?.data?.portalRole !== "school_operator") {
    throw new Error(`operator /me failed for ${displayName}: HTTP ${me.status}`);
  }

  return {
    operatorUserId,
    staffCode,
    pin: chosenPin,
    cookie: login.cookie,
    grants: grants || { studentAccessAdmin: false, studentDataViewer: false },
  };
}

async function tryReuseExistingFixtures() {
  if (!fs.existsSync(FIXTURES_OUT)) return null;
  const existing = JSON.parse(fs.readFileSync(FIXTURES_OUT, "utf8"));
  const checks = [
    ["operatorNoGrants", existing.operatorNoGrants?.cookie],
    ["operatorAccessAdmin", existing.operatorAccessAdmin?.cookie],
    ["operatorDataViewer", existing.operatorDataViewer?.cookie],
  ];
  for (const [, cookie] of checks) {
    if (!cookie) return null;
    const me = await apiStaffCookie("GET", "/api/school/me", cookie);
    if (me.status !== 200) return null;
  }
  const suspended = existing.operatorSuspended?.cookie;
  if (suspended) {
    const suspendedMe = await apiStaffCookie("GET", "/api/school/me", suspended);
    if (suspendedMe.status !== 401 && suspendedMe.status !== 403) return null;
  } else {
    return null;
  }
  console.log("Reusing valid QA staff cookie fixtures:", FIXTURES_OUT);
  return existing;
}

async function cleanupQaTechnicalGreenOperators(admin, schoolId, managerToken) {
  const { data: profiles } = await admin
    .from("teacher_profiles")
    .select("id, display_name")
    .eq("school_id", schoolId)
    .ilike("display_name", "QA TG %");

  for (const profile of profiles || []) {
    await apiBearer("PUT", `/api/school/operators/${profile.id}/suspend`, managerToken);
    await admin
      .from("school_teacher_memberships")
      .delete()
      .eq("school_id", schoolId)
      .eq("teacher_id", profile.id)
      .eq("role", "school_operator");
  }

  await admin
    .from("school_accounts")
    .update({ max_school_operators: 50 })
    .eq("id", schoolId);
}

async function main() {
  const password = qaPassword();
  if (!password) throw new Error("Missing SCHOOL_SECURITY_TEST_PASSWORD or SCHOOL_QA_PASSWORD");

  let matrixFixtures = {};
  if (fs.existsSync(FIXTURES_IN)) {
    matrixFixtures = JSON.parse(fs.readFileSync(FIXTURES_IN, "utf8"));
  } else {
    throw new Error(`Run security matrix first — missing ${FIXTURES_IN}`);
  }

  const supabaseUrl = env("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = env("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
  let admin = null;
  if (supabaseUrl && serviceKey && matrixFixtures.schoolAId) {
    admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data } = await admin
      .from("school_accounts")
      .select("school_code")
      .eq("id", matrixFixtures.schoolAId)
      .maybeSingle();
    const existing = data?.school_code ? String(data.school_code).trim().toLowerCase() : "";
    if (!/^[a-z]{3,4}$/.test(existing)) {
      await admin
        .from("school_accounts")
        .update({ school_code: "qaa" })
        .eq("id", matrixFixtures.schoolAId);
    }
  }

  const managerToken = await signInSupabase(MANAGER_EMAIL, password);

  const reused = await tryReuseExistingFixtures();
  if (reused) {
    fs.writeFileSync(FIXTURES_OUT, JSON.stringify({ ...reused, reusedAt: new Date().toISOString() }, null, 2));
    return;
  }

  if (admin && matrixFixtures.schoolAId) {
    await cleanupQaTechnicalGreenOperators(admin, matrixFixtures.schoolAId, managerToken);
  }

  const tag = Date.now();

  const noGrants = await provisionOperatorWithCookie(
    managerToken,
    `QA TG NoGrants ${tag}`,
    { studentAccessAdmin: false, studentDataViewer: false }
  );

  const accessAdmin = await provisionOperatorWithCookie(
    managerToken,
    `QA TG AccessAdmin ${tag}`,
    { studentAccessAdmin: true, studentDataViewer: false }
  );

  const dataViewer = await provisionOperatorWithCookie(
    managerToken,
    `QA TG DataViewer ${tag}`,
    { studentAccessAdmin: false, studentDataViewer: true }
  );

  const suspendTarget = await provisionOperatorWithCookie(
    managerToken,
    `QA TG Suspend ${tag}`,
    { studentAccessAdmin: false, studentDataViewer: false }
  );

  const suspendedCookie = suspendTarget.cookie;
  const suspendRes = await apiBearer(
    "PUT",
    `/api/school/operators/${suspendTarget.operatorUserId}/suspend`,
    managerToken
  );
  if (suspendRes.status !== 200) {
    throw new Error(`suspend operator failed: HTTP ${suspendRes.status}`);
  }

  const suspendedMe = await apiStaffCookie("GET", "/api/school/me", suspendedCookie);
  if (suspendedMe.status !== 401 && suspendedMe.status !== 403) {
    throw new Error(
      `expected suspended cookie blocked on /me, got HTTP ${suspendedMe.status} (code=${suspendedMe.code})`
    );
  }

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: baseUrl(),
    schoolAId: matrixFixtures.schoolAId,
    schoolBId: matrixFixtures.schoolBId,
    studentAId: matrixFixtures.studentAId,
    studentBId: matrixFixtures.studentBId,
    operatorNoGrants: {
      userId: noGrants.operatorUserId,
      cookie: noGrants.cookie,
      staffCode: noGrants.staffCode,
    },
    operatorAccessAdmin: {
      userId: accessAdmin.operatorUserId,
      cookie: accessAdmin.cookie,
      staffCode: accessAdmin.staffCode,
    },
    operatorDataViewer: {
      userId: dataViewer.operatorUserId,
      cookie: dataViewer.cookie,
      staffCode: dataViewer.staffCode,
    },
    operatorSuspended: {
      userId: suspendTarget.operatorUserId,
      cookie: suspendedCookie,
      suspendedMeStatus: suspendedMe.status,
      suspendedMeCode: suspendedMe.code,
    },
  };

  fs.mkdirSync(path.dirname(FIXTURES_OUT), { recursive: true });
  fs.writeFileSync(FIXTURES_OUT, JSON.stringify(out, null, 2), "utf8");

  console.log("QA staff cookie fixtures written:", FIXTURES_OUT);
  console.log("operatorNoGrants cookie: OK");
  console.log("operatorAccessAdmin cookie: OK");
  console.log("operatorDataViewer cookie: OK");
  console.log(`operatorSuspended cookie → /me HTTP ${suspendedMe.status} (${suspendedMe.code || "ok"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
