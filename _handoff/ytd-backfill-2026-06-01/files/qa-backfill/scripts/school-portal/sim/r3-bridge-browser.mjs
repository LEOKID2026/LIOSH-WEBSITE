/**
 * R3 — Playwright validation of teacher QA parent-report bridge page.
 * Route: /learning/parent-report?source=teacher&studentId=...&period=month
 *
 * Retries browser checks when API returns data but the page shows empty/no table.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServiceRole, findAuthUserByEmail, requireEnv } from "../demo-school-lib.mjs";
import { R3_BROWSER_SAMPLE_COUNT, TEACHER_EMAILS } from "./school-sim-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_BROWSER_ATTEMPTS = 3;

async function getAccessTokenViaPassword(page, email, password) {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const res = await page.request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  });
  const json = await res.json();
  return json.access_token || null;
}

async function getAccessTokenViaAdmin(email) {
  const admin = createServiceRole();
  const user = await findAuthUserByEmail(admin, email);
  if (!user?.id) return null;
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/auth/v1/admin/users/${user.id}/tokens`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expires_in: 3600 }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token || null;
}

async function getAccessToken(page, email, password) {
  return (await getAccessTokenViaPassword(page, email, password)) || (await getAccessTokenViaAdmin(email));
}

async function seedTeacherSession(page, baseUrl, email, password) {
  const token = await getAccessToken(page, email, password);
  if (!token) throw new Error(`R3 browser: no token for ${email}`);
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  await page.goto(`${baseUrl.replace(/\/$/, "")}/teacher/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ url, anonKey, token }) => {
      const key = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "",
          user: null,
        })
      );
    },
    { url, anonKey, token }
  );
  return token;
}

async function waitForHydration(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function probeReportPage(page) {
  const headingVisible = await page
    .getByText(/דוח להורים/u)
    .first()
    .waitFor({ state: "visible", timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  const emptyVisible = await page
    .getByText(/אין עדיין מספיק פעילות/u)
    .isVisible()
    .catch(() => false);
  const loadErr = await page
    .getByText(/לא ניתן לבנות את הדוח|שגיאת רשת בטעינת הדוח/u)
    .isVisible()
    .catch(() => false);
  const tableVisible = await page
    .locator("table.parent-report-subject-table, [data-testid='parent-report-subject-table']")
    .first()
    .waitFor({ state: "visible", timeout: 45_000 })
    .then(() => true)
    .catch(async () =>
      page
        .locator("[data-testid='parent-report-root'], .parent-report-subject-table")
        .first()
        .isVisible()
        .catch(() => false)
    );

  const rawSnippet = await page
    .locator("[data-testid='parent-report-root'], main, .parent-report-subject-table")
    .first()
    .innerText()
    .catch(async () => page.locator("body").innerText().catch(() => ""));
  const bodySnippet = String(rawSnippet || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);

  return { headingVisible, emptyVisible, loadErr, tableVisible, bodySnippet };
}

function evaluateBrowserPass({ apiStatus, apiTotal, apiLeak, probe }) {
  const { headingVisible, emptyVisible, loadErr, tableVisible, bodySnippet } = probe;
  const hasReportContent =
    tableVisible || (apiTotal > 0 && !emptyVisible && !loadErr && bodySnippet.length > 200);
  return (
    apiStatus === 200 &&
    apiTotal > 0 &&
    !apiLeak &&
    !loadErr &&
    headingVisible &&
    !emptyVisible &&
    hasReportContent
  );
}

function isRetryableFlake({ apiTotal, probe, ok }) {
  if (ok) return false;
  if (apiTotal <= 0) return false;
  return !probe.tableVisible || probe.emptyVisible;
}

async function screenshotOnFailure(page, artifactRoot, studentId, attemptNum) {
  if (!artifactRoot) return null;
  const shot = path.join(
    artifactRoot,
    "report-validation",
    `r3-browser-${studentId}-attempt-${attemptNum}.png`
  );
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  return shot;
}

function buildReportRoute(studentId, reportRange) {
  const params = new URLSearchParams({
    studentId,
    source: "teacher",
  });
  if (reportRange?.from && reportRange?.to) {
    params.set("period", "custom");
    params.set("start", reportRange.from);
    params.set("end", reportRange.to);
  } else {
    params.set("period", "month");
  }
  return `/learning/parent-report?${params.toString()}`;
}

function buildParentReportDataUrl(base, studentId, reportRange) {
  const qs = reportRange?.from && reportRange?.to
    ? `from=${reportRange.from}&to=${reportRange.to}`
    : "windowDays=30";
  return `${base}/api/teacher/students/${studentId}/parent-report-data?studentId=${studentId}&${qs}`;
}

async function waitForReportDataResponse(page, studentId) {
  await page
    .waitForResponse(
      (res) =>
        res.url().includes(`/students/${studentId}/`) &&
        res.url().includes("parent-report-data") &&
        res.status() === 200,
      { timeout: 90_000 }
    )
    .catch(() => null);
}

async function openReportPage({
  browser,
  base,
  route,
  studentId,
  teacherEmail,
  teacherPassword,
  attemptNum,
  pageRef,
  contextRef,
}) {
  const url = `${base}${route}`;

  if (attemptNum === 3) {
    if (contextRef.current) await contextRef.current.close().catch(() => {});
    contextRef.current = await browser.newContext({ locale: "he-IL" });
    pageRef.current = await contextRef.current.newPage();
    await seedTeacherSession(pageRef.current, base, teacherEmail, teacherPassword);
    const responseWait = waitForReportDataResponse(pageRef.current, studentId);
    await pageRef.current.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await responseWait;
    await waitForHydration(pageRef.current);
    return url;
  }

  const page = pageRef.current;
  if (attemptNum === 2) {
    const responseWait = waitForReportDataResponse(page, studentId);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await responseWait;
    await waitForHydration(page);
    const reloadWait = waitForReportDataResponse(page, studentId);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await reloadWait;
    await waitForHydration(page);
    return url;
  }

  await page.goto(`${base}/teacher/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const responseWait = waitForReportDataResponse(page, studentId);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await responseWait;
  await waitForHydration(page);
  return url;
}

async function runStudentBrowserAttempts({
  browser,
  base,
  route,
  reportRange,
  studentId,
  apiStatus,
  apiTotal,
  apiLeak,
  teacherEmail,
  teacherPassword,
  artifactRoot,
  log,
}) {
  if (apiTotal <= 0) {
    return {
      route,
      reportRange: reportRange || null,
      apiStatus,
      apiTotal,
      apiLeak,
      headingOk: false,
      headingVisible: false,
      emptyVisible: false,
      loadErr: false,
      tableVisible: false,
      ok: false,
      failureKind: "api_no_data",
      attempts: [],
      retryable: false,
    };
  }

  const pageRef = { current: null };
  const contextRef = { current: await browser.newContext({ locale: "he-IL" }) };
  pageRef.current = await contextRef.current.newPage();
  await seedTeacherSession(pageRef.current, base, teacherEmail, teacherPassword);

  const attempts = [];
  let ok = false;
  let lastProbe = null;

  try {
    for (let attemptNum = 1; attemptNum <= MAX_BROWSER_ATTEMPTS; attemptNum += 1) {
      const url = await openReportPage({
        browser,
        base,
        route,
        studentId,
        teacherEmail,
        teacherPassword,
        attemptNum,
        pageRef,
        contextRef,
      });
      const probe = await probeReportPage(pageRef.current);
      lastProbe = probe;
      ok = evaluateBrowserPass({ apiStatus, apiTotal, apiLeak, probe });
      const retryable = isRetryableFlake({ apiTotal, probe, ok });

      let screenshotPath = null;
      if (!ok) {
        screenshotPath = await screenshotOnFailure(pageRef.current, artifactRoot, studentId, attemptNum);
      }

      attempts.push({
        attempt: attemptNum,
        url,
        apiTotal,
        tableVisible: probe.tableVisible,
        emptyVisible: probe.emptyVisible,
        headingVisible: probe.headingVisible,
        loadErr: probe.loadErr,
        bodySnippet: probe.bodySnippet,
        screenshotPath,
        ok,
        retryable,
      });

      log(
        `R3 browser ${studentId} attempt ${attemptNum}/${MAX_BROWSER_ATTEMPTS}: ${ok ? "PASS" : "FAIL"} apiTotal=${apiTotal} table=${probe.tableVisible} empty=${probe.emptyVisible}`
      );

      if (ok) break;
      if (!retryable) break;
      if (attemptNum < MAX_BROWSER_ATTEMPTS) {
        log(`R3 browser ${studentId}: retrying (API has data but page empty/no table)`);
      }
    }
  } finally {
    await contextRef.current?.close().catch(() => {});
  }

  const finalAttempt = attempts[attempts.length - 1];
  const failureKind = ok
    ? null
    : apiTotal <= 0
      ? "api_no_data"
      : finalAttempt?.retryable
        ? "browser_flake_exhausted"
        : "browser_or_api_failure";

  return {
    route,
    reportRange: reportRange || null,
    apiStatus,
    apiTotal,
    apiLeak,
    headingOk: lastProbe?.headingVisible ?? false,
    headingVisible: lastProbe?.headingVisible ?? false,
    emptyVisible: lastProbe?.emptyVisible ?? false,
    loadErr: lastProbe?.loadErr ?? false,
    tableVisible: lastProbe?.tableVisible ?? false,
    ok,
    failureKind,
    attempts,
    finalAttempt: finalAttempt?.attempt ?? 0,
    retryable: Boolean(finalAttempt?.retryable),
  };
}

/**
 * @param {object} params
 * @param {string} params.baseUrl
 * @param {string} params.teacherPassword
 * @param {string} params.teacherEmail
 * @param {Array<{ studentId: string }>} params.students
 * @param {{ from: string, to: string }} [params.reportRange] — backfill checkpoint range for custom period URL
 * @param {string} [params.artifactRoot]
 * @param {(line: string) => void} [params.log]
 */
export async function runR3BridgeBrowserValidation({
  baseUrl,
  teacherPassword,
  teacherEmail = TEACHER_EMAILS.dan,
  students,
  reportRange = null,
  artifactRoot,
  log = console.log,
}) {
  const base = baseUrl.replace(/\/$/, "");
  const sample = students.slice(0, R3_BROWSER_SAMPLE_COUNT);
  const results = {};

  const browser = await chromium.launch({ headless: true });

  try {
    for (const { studentId } of sample) {
      const probePage = await browser.newPage();
      let apiStatus = 0;
      let apiTotal = 0;
      let apiLeak = false;
      try {
        const token = await getAccessToken(probePage, teacherEmail, teacherPassword);
        const apiRes = await probePage.request.get(buildParentReportDataUrl(base, studentId, reportRange), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const apiBody = await apiRes.json();
        apiStatus = apiRes.status();
        apiTotal = Number(apiBody?.summary?.totalAnswers || 0);
        apiLeak = "_dailyBySubject" in (apiBody || {});
      } finally {
        await probePage.close();
      }

      const route = buildReportRoute(studentId, reportRange);
      results[studentId] = await runStudentBrowserAttempts({
        browser,
        base,
        route,
        reportRange,
        studentId,
        apiStatus,
        apiTotal,
        apiLeak,
        teacherEmail,
        teacherPassword,
        artifactRoot,
        log,
      });
    }
  } finally {
    await browser.close();
  }

  const failCount = Object.values(results).filter((r) => !r.ok).length;
  return {
    teacherEmail,
    sampled: sample.length,
    results,
    ok: failCount === 0,
    failCount,
    maxAttempts: MAX_BROWSER_ATTEMPTS,
  };
}
