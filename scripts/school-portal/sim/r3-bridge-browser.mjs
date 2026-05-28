/**
 * R3 — Playwright validation of teacher QA parent-report bridge page.
 * Route: /learning/parent-report?source=teacher&studentId=...&period=month
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createServiceRole, findAuthUserByEmail, requireEnv } from "../demo-school-lib.mjs";
import { R3_BROWSER_SAMPLE_COUNT, TEACHER_EMAILS } from "./school-sim-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

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

/**
 * @param {object} params
 * @param {string} params.baseUrl
 * @param {string} params.teacherPassword
 * @param {string} params.teacherEmail
 * @param {Array<{ studentId: string }>} params.students
 * @param {string} [params.artifactRoot]
 * @param {(line: string) => void} [params.log]
 */
export async function runR3BridgeBrowserValidation({
  baseUrl,
  teacherPassword,
  teacherEmail = TEACHER_EMAILS.dan,
  students,
  artifactRoot,
  log = console.log,
}) {
  const base = baseUrl.replace(/\/$/, "");
  const sample = students.slice(0, R3_BROWSER_SAMPLE_COUNT);
  const results = {};

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  try {
    const token = await seedTeacherSession(page, base, teacherEmail, teacherPassword);

    for (const { studentId } of sample) {
      const apiRes = await page.request.get(
        `${base}/api/teacher/students/${studentId}/parent-report-data?studentId=${studentId}&windowDays=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const apiBody = await apiRes.json();
      const apiTotal = Number(apiBody?.summary?.totalAnswers || 0);
      const apiLeak = "_dailyBySubject" in (apiBody || {});

      await page.goto(`${base}/teacher/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      const route = `/learning/parent-report?studentId=${studentId}&source=teacher&period=month`;
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(3000);

      const headingOk = await page
        .getByText(/דוח להורים/u)
        .first()
        .waitFor({ state: "visible", timeout: 90_000 })
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
        .waitFor({ state: "visible", timeout: 90_000 })
        .then(() => true)
        .catch(async () => {
          const alt = await page.locator("[data-testid='parent-report-root'], .parent-report-subject-table").first().isVisible().catch(() => false);
          return alt;
        });

      if (artifactRoot) {
        const fs = await import("node:fs");
        const shot = path.join(artifactRoot, "report-validation", `r3-browser-${studentId}.png`);
        fs.mkdirSync(path.dirname(shot), { recursive: true });
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      }

      const pageText = await page.locator("body").innerText().catch(() => "");
      const hasReportContent =
        tableVisible ||
        (apiTotal > 0 && !emptyVisible && !loadErr && pageText.length > 500);
      const ok =
        apiRes.status() === 200 &&
        apiTotal > 0 &&
        !apiLeak &&
        !loadErr &&
        headingOk &&
        !emptyVisible &&
        hasReportContent;

      results[studentId] = {
        route,
        apiStatus: apiRes.status(),
        apiTotal,
        apiLeak,
        headingOk,
        emptyVisible,
        loadErr,
        tableVisible,
        ok,
      };
      log(`R3 browser ${studentId}: ${ok ? "PASS" : "FAIL"} apiTotal=${apiTotal} table=${tableVisible}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const failCount = Object.values(results).filter((r) => !r.ok).length;
  return {
    teacherEmail,
    sampled: sample.length,
    results,
    ok: failCount === 0,
    failCount,
  };
}
