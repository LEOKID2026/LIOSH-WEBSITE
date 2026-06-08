#!/usr/bin/env node
/** One-cell Playwright debug for matrix timeout. */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import {
  FLAG_MODES,
  parseIsoDate,
  QA_PARENT_EMAIL,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "docs/qa/_artifacts/parent-report-numeric-sanity/matrix-debug.json");
const BASE_URL = (process.env.QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

async function getParentAccessToken() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const { createClient: createSb } = await import("@supabase/supabase-js");
  const admin = createSb(url, serviceKey, { auth: { persistSession: false } });
  const anon = createSb(url, anonKey, { auth: { persistSession: false } });
  const tempPassword = process.env.QA_PDF_EXPORT_PARENT_PASSWORD || "QaPdfExportTemp2026!";
  await admin.auth.admin.updateUserById("05c73a19-bf1f-4f1a-b034-7cd2ece4feec", { password: tempPassword });
  const { data, error } = await anon.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: tempPassword,
  });
  if (error || !data.session?.access_token) throw new Error(error?.message || "auth failed");
  return { token: data.session.access_token, url, refresh: data.session.refresh_token || "" };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const entry = students.find((s) => s.label === "AAA4");
  const mode = FLAG_MODES.find((m) => m.id === "A");
  process.env.DIAGNOSTIC_METADATA_SUBSKILL_ENABLED = mode.env.subskill;
  process.env.DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED = mode.env.gating;
  process.env.DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED = mode.env.promotion;

  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || `g${entry.grade}`,
    is_active: true,
  };
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate("2026-05-01"),
    parseIsoDate("2026-06-08"),
    { includeParentActivities: true }
  );
  const payload = stripInternalReportPayloadFields(
    structuredClone(await enrichPayloadWithParentFacing(supabase, attachParentContextEvidenceQuality(structuredClone(raw)), entry.studentId))
  );

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ locale: "he-IL" })).newPage();
  const network = [];
  const consoleLogs = [];
  page.on("request", (req) => {
    if (req.url().includes("report-data")) network.push({ type: "request", url: req.url(), method: req.method() });
  });
  page.on("response", async (res) => {
    if (res.url().includes("report-data")) {
      let bodySample = "";
      try {
        bodySample = (await res.text()).slice(0, 200);
      } catch {
        bodySample = "<unreadable>";
      }
      network.push({ type: "response", url: res.url(), status: res.status(), bodySample });
    }
  });
  page.on("console", (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => consoleLogs.push({ type: "pageerror", text: String(err?.message || err), stack: String(err?.stack || "").slice(0, 500) }));
  page.on("requestfailed", (req) => {
    if (req.url().includes("report-data") || req.url().includes("parent-report")) {
      network.push({ type: "requestfailed", url: req.url(), failure: req.failure()?.errorText || "unknown" });
    }
  });

  const auth = await getParentAccessToken();
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(
    ({ url, token, refresh }) => {
      window.__parentReportPlaywrightE2eSession = true;
      const host = new URL(url).hostname.split(".")[0];
      localStorage.setItem(
        `sb-${host}-auth-token`,
        JSON.stringify({
          access_token: token,
          refresh_token: refresh,
          token_type: "bearer",
          expires_in: 7200,
          expires_at: Math.floor(Date.now() / 1000) + 7200,
        })
      );
    },
    auth
  );

  const useIntercept = !process.argv.includes("--no-intercept");
  let interceptHit = false;
  if (useIntercept) {
    const routePattern = "**/api/parent/students/*/report-data*";
    await page.route(routePattern, async (route) => {
      interceptHit = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });
  }

  const reportUrl = `${BASE_URL}/learning/parent-report?studentId=${entry.studentId}&source=parent&period=custom&start=2026-05-01&end=2026-06-08`;
  await page.goto(reportUrl, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(8000);

  const dom = await page.evaluate(() => ({
    bodyText: (document.body?.innerText || "").slice(0, 4000),
    hasSections: !!document.querySelector('[data-testid="parent-report-parent-sections"]'),
    hasPdfRoot: !!document.querySelector("#parent-report-pdf"),
    loading: /טוען דוח/.test(document.body?.innerText || ""),
    error: /לא ניתן לבנות|שגיאת רשת|נדרשת התחברות/.test(document.body?.innerText || ""),
    genError: window.__parentReportGenerationLastError || null,
  }));

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      {
        reportUrl,
        interceptHit,
        useIntercept,
        payloadSummary: {
          ok: payload.ok,
          diagnosticAnswers: payload.summary?.diagnosticAnswers,
          totalDurationSeconds: payload.summary?.totalDurationSeconds,
        },
        dom,
        network,
        consoleLogs: consoleLogs.slice(0, 50),
      },
      null,
      2
    ),
    "utf8"
  );
  await browser.close();
  console.log(`Wrote ${OUT}`);
  console.log(JSON.stringify({ interceptHit, hasSections: dom.hasSections, loading: dom.loading, error: dom.error }, null, 2));
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
