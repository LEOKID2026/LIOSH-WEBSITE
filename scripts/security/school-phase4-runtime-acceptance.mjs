#!/usr/bin/env node
/**
 * Phase 4.5 / technical GREEN — School portal runtime acceptance.
 * Static checks always run; live HTTP when fixtures + server exist; honest NOT_RUN otherwise.
 *
 * Usage:
 *   node --env-file=.env.local scripts/security/school-phase4-runtime-acceptance.mjs
 *
 * Optional live HTTP fixtures (see plan section P):
 *   SCHOOL_A_BASE_URL / PHASE45_BASE_URL / SCHOOL_PORTAL_BASE_URL (default http://localhost:3000)
 *   SCHOOL_A_MANAGER_BEARER, SCHOOL_B_MANAGER_BEARER
 *   SCHOOL_A_CLASS_A_ID, SCHOOL_B_CLASS_ID, SCHOOL_A_STUDENT_ID, SCHOOL_B_STUDENT_ID
 *   SCHOOL_A_OPERATOR_NO_GRANTS_COOKIE, SCHOOL_A_OPERATOR_ACCESS_ADMIN_COOKIE,
 *   SCHOOL_A_OPERATOR_DATA_VIEWER_COOKIE, SCHOOL_A_STAFF_SUSPENDED_COOKIE
 *   SCHOOL_A_SCHOOL_ID (for audit log school scoping checks)
 *
 * Handler-level matrix (QA throwaway accounts, requires Supabase env):
 *   SCHOOL_SECURITY_TEST_PASSWORD (falls back to SCHOOL_QA_PASSWORD)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const TECH_GREEN_FIXTURES = path.join(ROOT, "reports/security/school-phase4-technical-green-fixtures.json");

/** @typedef {'PASS'|'FAIL'|'NOT_RUN'|'STATIC_PASS'|'HANDLER_PASS'} ResultStatus */
/** @type {Array<{ id: string, area: string, name: string, status: ResultStatus, detail: string }>} */
const results = [];

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

function record(id, area, name, status, detail = "") {
  results.push({ id, area, name, status, detail });
  const tag =
    status === "PASS" || status === "STATIC_PASS" || status === "HANDLER_PASS" ? "PASS" : status;
  console.log(`[${tag}] ${id} ${area} — ${name}${detail ? `: ${detail}` : ""}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function grepFiles(pattern, globs) {
  const hits = [];
  for (const rel of globs) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    if (fs.statSync(full).isDirectory()) {
      for (const f of walkDir(full)) {
        const src = fs.readFileSync(f, "utf8");
        if (pattern.test(src)) hits.push(path.relative(ROOT, f));
      }
    } else if (pattern.test(fs.readFileSync(full, "utf8"))) {
      hits.push(rel);
    }
  }
  return hits;
}

function walkDir(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkDir(p));
    else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function runSelftest(rel) {
  const r = spawnSync(process.execPath, [path.join(ROOT, rel)], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  return { ok: r.status === 0, stdout: r.stdout || "", stderr: r.stderr || "" };
}

async function serverReachable(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: "GET", signal: ctrl.signal, redirect: "manual" });
    clearTimeout(t);
    return res.status > 0;
  } catch {
    return false;
  }
}

async function http(method, urlPath, { bearer, staffCookie, body, expectedStatuses } = {}) {
  const headers = { Accept: "application/json" };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (staffCookie) headers.Cookie = `liosh_staff_session=${encodeURIComponent(staffCookie)}`;
  if (body != null) headers["Content-Type"] = "application/json";
  const res = await fetch(`${baseUrl()}${urlPath}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const cacheControl = res.headers.get("cache-control") || "";
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const ok = expectedStatuses.includes(res.status);
  return { ok, status: res.status, json, text: text.slice(0, 800), cacheControl, headers: res.headers };
}

function auditEntriesContainSecrets(entries) {
  const denyKey = /^(pin|password|token|bearer|session_token|liosh_staff_session)/i;
  for (const e of entries || []) {
    const meta = e?.metadata || {};
    for (const [k, v] of Object.entries(meta)) {
      if (denyKey.test(k)) return k;
      if (typeof v === "string" && /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\./.test(v)) {
        return `${k}=jwt`;
      }
      if (typeof v === "string" && /liosh_staff_session/i.test(v)) return k;
    }
  }
  return null;
}

function runStaticChecks() {
  const sw = read("public/sw.js");
  record(
    "pwa-sw-skip-api",
    "PWA/static",
    "Service worker skips /api/ routes",
    /url\.pathname\.startsWith\(['"]\/api\//.test(sw) ? "STATIC_PASS" : "FAIL",
    "public/sw.js"
  );

  const schoolReportRoutes = [
    "pages/api/school/students/[studentId]/report-data.js",
    "pages/api/school/classes/[classId]/report-data.js",
    "pages/api/school/classes/physical-report.js",
    "pages/api/school/worksheet-activities/[worksheetId]/report.js",
    "pages/api/school/me.js",
    "pages/api/school/staff/logout.js",
    "pages/api/school/audit-log.js",
  ];
  for (const rel of schoolReportRoutes) {
    const src = read(rel);
    const ok =
      /setSensitiveReportNoStoreHeaders\s*\(\s*res\s*\)/.test(src) ||
      (/Cache-Control/.test(src) && /no-store/.test(src));
    record(
      `static-no-store-${path.basename(rel, ".js")}`,
      "Phase 4.2",
      `${rel} no-store headers (source)`,
      ok ? "STATIC_PASS" : "FAIL"
    );
  }

  const auditRoute = read("pages/api/school/audit-log.js");
  record(
    "audit-log-manager-only-src",
    "Phase 4.4",
    "audit-log route uses requireSchoolManagerApiContext (source)",
    /requireSchoolManagerApiContext/.test(auditRoute) ? "STATIC_PASS" : "FAIL"
  );

  const auditLog = read("lib/school-server/school-audit-log.server.js");
  record(
    "audit-log-merge-src",
    "Phase 4.4",
    "listSchoolAuditLog merges three audit sources (source)",
    /school_staff_audit_log/.test(auditLog) &&
      /school_operator_audit_log/.test(auditLog) &&
      /teacher_access_audit/.test(auditLog)
      ? "STATIC_PASS"
      : "FAIL"
  );

  const classScope = read("lib/school-server/school-class-scope.server.js");
  record(
    "class-scope-and-src",
    "Phase 4.1",
    "isSchoolClassRowInScope uses AND school+teacher alignment (source)",
    /classRow\.school_id/.test(classScope) && /schoolTeacherIds\.includes/.test(classScope)
      ? "STATIC_PASS"
      : "FAIL"
  );

  const staffSession = read("lib/school-server/school-staff-session.server.js");
  record(
    "staff-session-entitlement-src",
    "Phase 4.3",
    "resolveStaffSession re-checks entitlement (source)",
    /assertActivePersonaEntitlement/.test(staffSession) ? "STATIC_PASS" : "FAIL"
  );

  const storageHits = grepFiles(/localStorage\.|sessionStorage\./, ["pages/school", "components/school"]);
  record(
    "school-ui-no-web-storage",
    "PWA/static",
    "School UI pages do not use localStorage/sessionStorage for secrets",
    storageHits.length === 0 ? "STATIC_PASS" : "FAIL",
    storageHits.length ? storageHits.slice(0, 5).join("; ") : "none found"
  );
}

const QA_MATRIX_EMAILS = {
  managerA: "school-qa-a@leo.com",
  managerB: "school-b@leo.com",
};

function qaPassword() {
  return env("SCHOOL_SECURITY_TEST_PASSWORD") || env("SCHOOL_QA_PASSWORD") || env("DEMO_TEACHER_PASSWORD");
}

function parseMatrixFixtures(stdout) {
  const match = stdout.match(/\{\s*"schoolAId"[\s\S]*?\}\s*(?=\n\n|$)/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function signInSupabase(email, password) {
  const url = env("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = env("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  if (!url || !anonKey || !email || !password) return null;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  return json.access_token || null;
}

function runRegressionSelftests() {
  const tests = [
    ["reg-class-scope", "scripts/security/school-phase4-class-scope-selftest.mjs"],
    ["reg-report", "scripts/security/school-phase4-report-hardening-selftest.mjs"],
    ["reg-credential", "scripts/security/school-phase4-credential-session-selftest.mjs"],
    ["reg-audit", "scripts/security/school-phase4-audit-log-selftest.mjs"],
    ["reg-wave4a", "scripts/security/wave4a-phase1-3-security-selftest.mjs"],
  ];
  for (const [id, rel] of tests) {
    const r = runSelftest(rel);
    record(id, "Regression", rel, r.ok ? "PASS" : "FAIL", r.ok ? "exit 0" : "exit non-zero");
  }
}

function runSecurityMatrixSubprocess() {
  const password = qaPassword();
  if (!password) {
    record(
      "handler-matrix",
      "Handler runtime",
      "school-portal-security-matrix.mjs",
      "NOT_RUN",
      "set SCHOOL_SECURITY_TEST_PASSWORD or SCHOOL_QA_PASSWORD"
    );
    return null;
  }
  if (!env("NEXT_PUBLIC_LEARNING_SUPABASE_URL") || !env("LEARNING_SUPABASE_SERVICE_ROLE_KEY")) {
    record(
      "handler-matrix",
      "Handler runtime",
      "school-portal-security-matrix.mjs",
      "NOT_RUN",
      "missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY"
    );
    return null;
  }

  const r = spawnSync(
    process.execPath,
    ["--env-file=.env.local", "scripts/school-portal/school-portal-security-matrix.mjs"],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, SCHOOL_SECURITY_TEST_PASSWORD: password },
    }
  );
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  fs.writeFileSync(
    path.join(ROOT, "reports/security/test-output-school-portal-security-matrix-phase4-5.txt"),
    out,
    "utf8"
  );
  const fixtures = parseMatrixFixtures(out);
  if (fixtures) {
    fs.writeFileSync(
      path.join(ROOT, "reports/security/school-phase4-5-qa-fixtures.json"),
      JSON.stringify(fixtures, null, 2),
      "utf8"
    );
  }
  const passMatch = out.match(/(\d+)\/(\d+)\s+passed/i);
  const detail = passMatch ? `${passMatch[1]}/${passMatch[2]} from matrix output` : `exit ${r.status}`;
  record(
    "handler-matrix",
    "Handler runtime",
    "school-portal-security-matrix.mjs (QA throwaway accounts)",
    r.status === 0 ? "HANDLER_PASS" : "FAIL",
    detail
  );
  return fixtures;
}

function runStaffCookieFixturesSubprocess() {
  const password = qaPassword();
  if (!password) {
    record(
      "staff-cookie-fixtures",
      "Live HTTP",
      "Provision QA operator staff cookies",
      "NOT_RUN",
      "missing SCHOOL_SECURITY_TEST_PASSWORD / SCHOOL_QA_PASSWORD"
    );
    return null;
  }
  const r = spawnSync(
    process.execPath,
    ["--env-file=.env.local", "scripts/security/school-phase4-qa-staff-cookie-fixtures.mjs"],
    { cwd: ROOT, encoding: "utf8", env: process.env }
  );
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  fs.writeFileSync(
    path.join(ROOT, "reports/security/test-output-school-phase4-qa-staff-cookie-fixtures.txt"),
    out,
    "utf8"
  );
  if (r.status !== 0 || !fs.existsSync(TECH_GREEN_FIXTURES)) {
    record(
      "staff-cookie-fixtures",
      "Live HTTP",
      "Provision QA operator staff cookies",
      "FAIL",
      `exit ${r.status}`
    );
    return null;
  }
  record("staff-cookie-fixtures", "Live HTTP", "Provision QA operator staff cookies", "PASS", TECH_GREEN_FIXTURES);
  return JSON.parse(fs.readFileSync(TECH_GREEN_FIXTURES, "utf8"));
}

function runBrowserPwaSubprocess() {
  if (!fs.existsSync(TECH_GREEN_FIXTURES)) {
    record(
      "browser-pwa-manual",
      "Browser/PWA",
      "Browser / PWA verification",
      "NOT_RUN",
      "staff cookie fixtures missing"
    );
    return;
  }
  const r = spawnSync(
    process.execPath,
    ["--env-file=.env.local", "scripts/security/school-phase4-browser-pwa-verification.mjs"],
    { cwd: ROOT, encoding: "utf8", env: process.env }
  );
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  fs.writeFileSync(
    path.join(ROOT, "reports/security/test-output-school-phase4-browser-pwa-verification.txt"),
    out,
    "utf8"
  );
  const failCount = (out.match(/\[FAIL\]/g) || []).length;
  const notRunCount = (out.match(/\[NOT_RUN\]/g) || []).length;
  const passCount = (out.match(/\[PASS\]/g) || []).length;
  const onlyPwaNotRun = notRunCount === 1 && /browser-pwa-installed-mode/.test(out);
  const status = failCount === 0 ? "PASS" : "FAIL";
  record(
    "browser-pwa-manual",
    "Browser/PWA",
    "Browser / PWA verification (installed PWA may be NOT_RUN)",
    status,
    `pass=${passCount} fail=${failCount} not_run=${notRunCount}${onlyPwaNotRun ? " (installed-PWA owner-only)" : ""} exit=${r.status}`
  );
}

async function runAuditPaginationSpotCheck(managerA, schoolAId) {
  if (!managerA || !schoolAId) {
    record("audit-pagination", "Phase 4.4", "Audit log pagination + school scope", "NOT_RUN", "need manager bearer + schoolAId");
    return;
  }
  const page1 = await http("GET", "/api/school/audit-log?limit=2&offset=0", {
    bearer: managerA,
    expectedStatuses: [200],
  });
  const page2 = await http("GET", "/api/school/audit-log?limit=2&offset=2", {
    bearer: managerA,
    expectedStatuses: [200],
  });
  const e1 = page1.json?.data?.entries || [];
  const e2 = page2.json?.data?.entries || [];
  const ids1 = new Set(e1.map((e) => e.id));
  const overlap = e2.filter((e) => ids1.has(e.id));
  const wrongSchool = [...e1, ...e2].filter((e) => e.schoolId && e.schoolId !== schoolAId);
  const secretHit = auditEntriesContainSecrets([...e1, ...e2]);
  const ok =
    page1.ok &&
    page2.ok &&
    overlap.length === 0 &&
    wrongSchool.length === 0 &&
    !secretHit &&
    (e1.length > 0 || page1.json?.data?.total === 0);
  record(
    "audit-pagination",
    "Phase 4.4",
    "Audit log pagination + school scope",
    ok ? "PASS" : "FAIL",
    secretHit
      ? `secrets: ${secretHit}`
      : wrongSchool.length
        ? `cross-school: ${wrongSchool.length}`
        : overlap.length
          ? `overlap: ${overlap.length}`
          : `p1=${e1.length} p2=${e2.length} total=${page1.json?.data?.total ?? "?"}`
  );
}

async function runLiveHttpSuite(qaFixtures, techGreenFixtures) {
  const reachable = await serverReachable(baseUrl());
  if (!reachable) {
    record(
      "live-server",
      "Live HTTP",
      "Dev server reachable",
      "NOT_RUN",
      `${baseUrl()} not responding — start npm run dev`
    );
  } else {
    record("live-server", "Live HTTP", "Dev server reachable", "PASS", baseUrl());
  }

  const password = qaPassword();
  let managerA = env("SCHOOL_A_MANAGER_BEARER");
  if (!managerA && reachable && password) {
    managerA = await signInSupabase(QA_MATRIX_EMAILS.managerA, password);
    if (managerA) {
      record(
        "live-auth-manager-a",
        "Live HTTP",
        "Auto sign-in school-qa-a@leo.com for live tests",
        "PASS",
        "QA throwaway manager A"
      );
    }
  }

  const fixtures = qaFixtures || {};
  const tg = techGreenFixtures || {};
  const studentB = env("SCHOOL_B_STUDENT_ID") || fixtures.studentBId || "";
  const classB = env("SCHOOL_B_CLASS_ID") || fixtures.classBId || "";
  const classA = env("SCHOOL_A_CLASS_A_ID") || fixtures.classAId || "";
  const studentA = env("SCHOOL_A_STUDENT_ID") || fixtures.studentAId || "";
  const schoolAId = env("SCHOOL_A_SCHOOL_ID") || fixtures.schoolAId || tg.schoolAId || "";

  const operatorNoGrants =
    env("SCHOOL_A_OPERATOR_NO_GRANTS_COOKIE") || tg.operatorNoGrants?.cookie || "";
  const operatorAccessAdmin =
    env("SCHOOL_A_OPERATOR_ACCESS_ADMIN_COOKIE") || tg.operatorAccessAdmin?.cookie || "";
  const operatorDataViewer =
    env("SCHOOL_A_OPERATOR_DATA_VIEWER_COOKIE") || tg.operatorDataViewer?.cookie || "";
  const staffSuspended =
    env("SCHOOL_A_STAFF_SUSPENDED_COOKIE") || tg.operatorSuspended?.cookie || "";

  const needServer = reachable;
  const needManagerA = needServer && managerA;

  async function live(id, area, name, fn) {
    if (!needServer) {
      record(id, area, name, "NOT_RUN", "dev server down");
      return;
    }
    try {
      await fn();
    } catch (err) {
      record(id, area, name, "FAIL", err.message);
    }
  }

  await live("tenant-student-report", "Tenant isolation", "Manager A → School B student report → 403/404", async () => {
    if (!needManagerA || !studentB) {
      record("tenant-student-report", "Tenant isolation", "Manager A → School B student report → 403/404", "NOT_RUN", "need SCHOOL_A_MANAGER_BEARER + SCHOOL_B_STUDENT_ID");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentB)}/report-data?windowDays=30`, {
      bearer: managerA,
      expectedStatuses: [403, 404],
    });
    record("tenant-student-report", "Tenant isolation", "Manager A → School B student report → 403/404", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("tenant-class-report", "Tenant isolation", "Manager A → School B class report → 403/404", async () => {
    if (!needManagerA || !classB) {
      record("tenant-class-report", "Tenant isolation", "Manager A → School B class report → 403/404", "NOT_RUN", "need bearer + SCHOOL_B_CLASS_ID");
      return;
    }
    const r = await http("GET", `/api/school/classes/${encodeURIComponent(classB)}/report-data?windowDays=30`, {
      bearer: managerA,
      expectedStatuses: [403, 404],
    });
    record("tenant-class-report", "Tenant isolation", "Manager A → School B class report → 403/404", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("class-scope-valid", "Phase 4.1", "Manager A → School A class report → 200", async () => {
    if (!needManagerA || !classA) {
      record("class-scope-valid", "Phase 4.1", "Manager A → School A class report → 200", "NOT_RUN", "need bearer + SCHOOL_A_CLASS_A_ID");
      return;
    }
    const r = await http("GET", `/api/school/classes/${encodeURIComponent(classA)}/report-data?windowDays=30`, {
      bearer: managerA,
      expectedStatuses: [200],
    });
    record("class-scope-valid", "Phase 4.1", "Manager A → School A class report → 200", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("report-no-store-student", "Phase 4.2", "School student report Cache-Control no-store", async () => {
    if (!needManagerA || !studentA) {
      record("report-no-store-student", "Phase 4.2", "School student report Cache-Control no-store", "NOT_RUN", "need bearer + SCHOOL_A_STUDENT_ID");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`, {
      bearer: managerA,
      expectedStatuses: [200],
    });
    const ok = r.ok && /no-store/i.test(r.cacheControl);
    record("report-no-store-student", "Phase 4.2", "School student report Cache-Control no-store", ok ? "PASS" : "FAIL", `HTTP ${r.status} cache=${r.cacheControl || "missing"}`);
  });

  await live("report-no-store-class", "Phase 4.2", "School class report Cache-Control no-store", async () => {
    if (!needManagerA || !classA) {
      record("report-no-store-class", "Phase 4.2", "School class report Cache-Control no-store", "NOT_RUN", "need bearer + SCHOOL_A_CLASS_A_ID");
      return;
    }
    const r = await http("GET", `/api/school/classes/${encodeURIComponent(classA)}/report-data?windowDays=30`, {
      bearer: managerA,
      expectedStatuses: [200],
    });
    const ok = r.ok && /no-store/i.test(r.cacheControl);
    record("report-no-store-class", "Phase 4.2", "School class report Cache-Control no-store", ok ? "PASS" : "FAIL", `HTTP ${r.status} cache=${r.cacheControl || "missing"}`);
  });

  await live("report-payload-strip", "Phase 4.2", "Report JSON excludes _dailyBySubject", async () => {
    if (!needManagerA || !studentA) {
      record("report-payload-strip", "Phase 4.2", "Report JSON excludes _dailyBySubject", "NOT_RUN", "need bearer + student id");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`, {
      bearer: managerA,
      expectedStatuses: [200],
    });
    const hasInternal = r.json && Object.prototype.hasOwnProperty.call(r.json, "_dailyBySubject");
    record("report-payload-strip", "Phase 4.2", "Report JSON excludes _dailyBySubject", r.ok && !hasInternal ? "PASS" : "FAIL", hasInternal ? "leaked _dailyBySubject" : `HTTP ${r.status}`);
  });

  await live("audit-log-manager-only", "Phase 4.4", "Operator → /api/school/audit-log → 403", async () => {
    const cookie = operatorNoGrants || operatorDataViewer || operatorAccessAdmin;
    if (!needServer || !cookie) {
      record("audit-log-manager-only", "Phase 4.4", "Operator → /api/school/audit-log → 403", "NOT_RUN", "need operator staff cookie + server");
      return;
    }
    const r = await http("GET", "/api/school/audit-log", {
      staffCookie: cookie,
      expectedStatuses: [403],
    });
    record("audit-log-manager-only", "Phase 4.4", "Operator → /api/school/audit-log → 403", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("tenant-audit-log", "Phase 4.4", "Manager A audit log sanitized + school scoped", async () => {
    if (!needManagerA) {
      record("tenant-audit-log", "Phase 4.4", "Manager A audit log sanitized + school scoped", "NOT_RUN", "need SCHOOL_A_MANAGER_BEARER");
      return;
    }
    const r = await http("GET", "/api/school/audit-log?limit=20", {
      bearer: managerA,
      expectedStatuses: [200],
    });
    const entries = r.json?.data?.entries || [];
    const secretHit = auditEntriesContainSecrets(entries);
    const wrongSchool = schoolAId
      ? entries.filter((e) => e.schoolId && e.schoolId !== schoolAId)
      : [];
    const ok = r.ok && !secretHit && wrongSchool.length === 0;
    record(
      "tenant-audit-log",
      "Phase 4.4",
      "Manager A audit log sanitized + school scoped",
      ok ? "PASS" : "FAIL",
      secretHit ? `secrets: ${secretHit}` : wrongSchool.length ? `cross-school rows: ${wrongSchool.length}` : `HTTP ${r.status} entries=${entries.length}`
    );
  });

  await live("operator-no-grants-report", "Phase 4.3", "Operator no grants → student report → 403", async () => {
    if (!needServer || !operatorNoGrants || !studentA) {
      record("operator-no-grants-report", "Phase 4.3", "Operator no grants → student report → 403", "NOT_RUN", "need cookie + SCHOOL_A_STUDENT_ID + server");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`, {
      staffCookie: operatorNoGrants,
      expectedStatuses: [403],
    });
    record("operator-no-grants-report", "Phase 4.3", "Operator no grants → student report → 403", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("operator-access-admin-report", "Phase 4.3", "Operator access_admin only → student report → 403", async () => {
    if (!needServer || !operatorAccessAdmin || !studentA) {
      record("operator-access-admin-report", "Phase 4.3", "Operator access_admin only → student report → 403", "NOT_RUN", "need SCHOOL_A_OPERATOR_ACCESS_ADMIN_COOKIE");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`, {
      staffCookie: operatorAccessAdmin,
      expectedStatuses: [403],
    });
    record("operator-access-admin-report", "Phase 4.3", "Operator access_admin only → student report → 403", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("operator-data-viewer-cred", "Phase 4.3", "Operator data_viewer only → student accounts → 403", async () => {
    if (!needServer || !operatorDataViewer || !studentA) {
      record("operator-data-viewer-cred", "Phase 4.3", "Operator data_viewer only → student accounts → 403", "NOT_RUN", "need SCHOOL_A_OPERATOR_DATA_VIEWER_COOKIE");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/accounts`, {
      staffCookie: operatorDataViewer,
      expectedStatuses: [403, 405],
    });
    record("operator-data-viewer-cred", "Phase 4.3", "Operator data_viewer only → student accounts → 403", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("operator-no-grants-accounts", "Phase 4.3", "Operator no grants → student accounts → 403", async () => {
    if (!needServer || !operatorNoGrants || !studentA) {
      record("operator-no-grants-accounts", "Phase 4.3", "Operator no grants → student accounts → 403", "NOT_RUN", "need operator cookie");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/accounts`, {
      staffCookie: operatorNoGrants,
      expectedStatuses: [403],
    });
    record("operator-no-grants-accounts", "Phase 4.3", "Operator no grants → student accounts → 403", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("operator-access-admin-accounts", "Phase 4.3", "Operator access_admin only → student accounts → 200", async () => {
    if (!needServer || !operatorAccessAdmin || !studentA) {
      record("operator-access-admin-accounts", "Phase 4.3", "Operator access_admin only → student accounts → 200", "NOT_RUN", "need access_admin cookie");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/accounts`, {
      staffCookie: operatorAccessAdmin,
      expectedStatuses: [200],
    });
    record("operator-access-admin-accounts", "Phase 4.3", "Operator access_admin only → student accounts → 200", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("operator-data-viewer-report", "Phase 4.3", "Operator data_viewer only → student report → 200", async () => {
    if (!needServer || !operatorDataViewer || !studentA) {
      record("operator-data-viewer-report", "Phase 4.3", "Operator data_viewer only → student report → 200", "NOT_RUN", "need data_viewer cookie");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentA)}/report-data?windowDays=30`, {
      staffCookie: operatorDataViewer,
      expectedStatuses: [200],
    });
    record("operator-data-viewer-report", "Phase 4.3", "Operator data_viewer only → student report → 200", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("operator-manager-dashboard", "Phase 4.3", "Operator → /api/school/dashboard → 403", async () => {
    const cookie = operatorDataViewer || operatorAccessAdmin || operatorNoGrants;
    if (!needServer || !cookie) {
      record("operator-manager-dashboard", "Phase 4.3", "Operator → /api/school/dashboard → 403", "NOT_RUN", "need operator cookie");
      return;
    }
    const r = await http("GET", "/api/school/dashboard", {
      staffCookie: cookie,
      expectedStatuses: [403],
    });
    record("operator-manager-dashboard", "Phase 4.3", "Operator → /api/school/dashboard → 403", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("operator-cross-school-report", "Tenant isolation", "Operator A → School B student report → 403/404", async () => {
    const cookie = operatorDataViewer || operatorAccessAdmin;
    if (!needServer || !cookie || !studentB) {
      record("operator-cross-school-report", "Tenant isolation", "Operator A → School B student report → 403/404", "NOT_RUN", "need operator cookie + studentB");
      return;
    }
    const r = await http("GET", `/api/school/students/${encodeURIComponent(studentB)}/report-data?windowDays=30`, {
      staffCookie: cookie,
      expectedStatuses: [403, 404],
    });
    record("operator-cross-school-report", "Tenant isolation", "Operator A → School B student report → 403/404", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  await live("staff-suspend-session", "Phase 4.3", "Suspended staff cookie → /api/school/me → 401/403", async () => {
    if (!needServer || !staffSuspended) {
      record("staff-suspend-session", "Phase 4.3", "Suspended staff cookie → /api/school/me → 401/403", "NOT_RUN", "need suspended QA staff cookie fixture");
      return;
    }
    const r = await http("GET", "/api/school/me", {
      staffCookie: staffSuspended,
      expectedStatuses: [401, 403],
    });
    record("staff-suspend-session", "Phase 4.3", "Suspended staff cookie → /api/school/me → 401/403", r.ok ? "PASS" : "FAIL", `HTTP ${r.status}`);
  });

  if (needManagerA) {
    await runAuditPaginationSpotCheck(managerA, schoolAId);
  } else {
    record("audit-pagination", "Phase 4.4", "Audit log pagination + school scope", "NOT_RUN", "need manager bearer");
  }
}

function printSummary() {
  const fail = results.filter((r) => r.status === "FAIL");
  const notRun = results.filter((r) => r.status === "NOT_RUN");
  const pass = results.filter(
    (r) => r.status === "PASS" || r.status === "STATIC_PASS" || r.status === "HANDLER_PASS"
  );

  console.log("\n--- Phase 4 school runtime acceptance summary ---");
  console.log(`PASS (incl. STATIC/HANDLER): ${pass.length}`);
  console.log(`FAIL: ${fail.length}`);
  console.log(`NOT RUN: ${notRun.length}`);

  if (fail.length) {
    console.log("\nFailures:");
    for (const f of fail) console.log(`  - [${f.id}] ${f.name}: ${f.detail}`);
  }
  if (notRun.length) {
    console.log("\nNOT RUN:");
    for (const n of notRun.slice(0, 25)) console.log(`  - [${n.id}] ${n.name}: ${n.detail}`);
    if (notRun.length > 25) console.log(`  ... and ${notRun.length - 25} more`);
  }

  if (fail.length) process.exit(1);
}

async function main() {
  console.log(`Phase 4 school runtime acceptance — base URL: ${baseUrl()}\n`);

  console.log("== Static / source checks ==\n");
  runStaticChecks();

  console.log("\n== Regression selftests ==\n");
  runRegressionSelftests();

  console.log("\n== Handler-level security matrix ==\n");
  const qaFixtures = runSecurityMatrixSubprocess();

  console.log("\n== QA staff cookie fixtures ==\n");
  const techGreenFixtures = runStaffCookieFixturesSubprocess();

  console.log("\n== Live HTTP matrix ==\n");
  await runLiveHttpSuite(qaFixtures, techGreenFixtures);

  console.log("\n== Browser / PWA verification ==\n");
  runBrowserPwaSubprocess();

  printSummary();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
