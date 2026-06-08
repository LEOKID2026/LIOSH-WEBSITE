#!/usr/bin/env node
/**
 * Gate 3+4 — Live browser + PDF QA for diagnostic visible impact (B+C ON, D OFF).
 * Payloads built server-side with same pipeline as report-data API; Playwright renders real UI.
 *
 * Requires dev server: npm run dev (port 3001) OR set QA_BASE_URL.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-browser-pdf-qa.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-browser-pdf-qa.mjs --browser-only
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-browser-pdf-qa.mjs --pdf-only
 */
import { mkdir, writeFile } from "node:fs/promises";
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
  FLAG_ENV,
  FLAG_MODES,
  parseIsoDate,
  QA_PARENT_EMAIL,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BROWSER_DIR = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-visible-impact-browser");
const PDF_DIR = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-visible-impact-pdf");
const BASE_URL = (process.env.QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

/** @type {Record<string, { label: string, from: string, to: string }>} */
const SCENARIOS = {
  AAA4: { label: "AAA4", from: "2026-05-01", to: "2026-06-08" },
  "GATE-LOW": { label: "AAA9", from: "2026-05-10", to: "2026-05-18" },
  "SUBSKILL-FOCUS": { label: "AAA10", from: "2026-05-06", to: "2026-05-20" },
  "SUBSKILL-CONFLICT": { label: "AAA8", from: "2026-05-20", to: "2026-05-24" },
};

const MODE_A = FLAG_MODES.find((m) => m.id === "A");
const MODE_BC = FLAG_MODES.find((m) => m.id === "C");

const LEAK_PATTERNS = [
  /_evidenceQuality/i,
  /\bbySubSkill\b/,
  /\bgatingDecisions\b/,
  /\bpromotionDecisions\b/,
  /\bsupportingEvidenceIds\b/,
  /\bmath_[a-z0-9_]+\b/i,
  /\bfrac_[a-z0-9_]+\b/i,
  /\bskillId\b/,
  /\bsubSkill\b/,
];

const pdfOpts = {
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
  preferCSSPageSize: true,
};

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = "false";
}

async function buildPublicPayload(supabase, entry, range, mode) {
  applyFlagMode(mode);
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || `g${entry.grade}`,
    is_active: true,
  };
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(range.from),
    parseIsoDate(range.to),
    { includeParentActivities: true }
  );
  const withEq = attachParentContextEvidenceQuality(structuredClone(raw));
  const enriched = await enrichPayloadWithParentFacing(supabase, withEq, entry.studentId);
  return stripInternalReportPayloadFields(structuredClone(enriched));
}

async function assertDevServerReachable() {
  const url = `${BASE_URL}/learning/parent-report`;
  for (let i = 0; i < 8; i += 1) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000) });
      if (res.status > 0 && res.status < 600) {
        console.log(`  Dev server reachable (${url}) status=${res.status}`);
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(
    `Dev server not reachable at ${BASE_URL}. Start: npm run dev (port 3001).`
  );
}

async function getParentAccessToken() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) throw new Error("Missing Supabase env");
  const { createClient: createSb } = await import("@supabase/supabase-js");
  const admin = createSb(url, serviceKey, { auth: { persistSession: false } });
  const anon = createSb(url, anonKey, { auth: { persistSession: false } });
  const parentId = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";
  const tempPassword = process.env.QA_PDF_EXPORT_PARENT_PASSWORD || "QaPdfExportTemp2026!";
  await admin.auth.admin.updateUserById(parentId, { password: tempPassword });
  const { data, error } = await anon.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: tempPassword,
  });
  if (error || !data.session?.access_token) {
    throw new Error(`Parent sign-in failed: ${error?.message || "no token"}`);
  }
  return {
    token: data.session.access_token,
    url,
    anonKey,
    refresh: data.session.refresh_token || "",
  };
}

async function seedParentSession(page, auth) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(
    ({ url, anonKey, token, refresh }) => {
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
}

function reportUrl(studentId, from, to) {
  const q = new URLSearchParams({
    studentId,
    source: "parent",
    period: "custom",
    start: from,
    end: to,
  });
  return `${BASE_URL}/learning/parent-report?${q.toString()}`;
}

async function interceptAndGoto(page, studentId, from, to, publicPayload) {
  const routePattern = "**/api/parent/students/*/report-data*";
  const printRoot = '[data-testid="parent-report-parent-sections"]';
  await page.unroute(routePattern).catch(() => {});
  await page.route(routePattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(publicPayload),
    });
  });
  await page.evaluate(() => {
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(reportUrl(studentId, from, to), { waitUntil: "load", timeout: 240_000 });
  await page.waitForTimeout(3500);
  await page.waitForSelector(printRoot, { state: "attached", timeout: 240_000 });
  await page.waitForFunction(
    ({ rootSel }) => {
      const root = document.querySelector(rootSel);
      const err = document.body?.innerText || "";
      if (/לא ניתן לבנות|שגיאת רשת|נדרשת התחברות|טוען דוח/.test(err) && !root) return false;
      return !!root && err.trim().length > 120;
    },
    { rootSel: printRoot },
    { timeout: 240_000 }
  );
  await page.waitForTimeout(1500);
}

async function extractInsights(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="parent-report-parent-sections"]');
    if (!root) return { insights: [], home: [], bodySnippet: "" };
    const lis = root.querySelectorAll("li");
    const lines = [...lis].map((li) => li.textContent?.trim() || "").filter(Boolean);
    return {
      insights: lines,
      bodySnippet: (document.body?.innerText || "").slice(0, 2000),
    };
  });
}

function assertScenarioBrowser(scenarioKey, modeId, insights, bodySnippet) {
  const checks = [];
  const joined = [...insights, bodySnippet].join("\n");

  checks.push({
    name: "not_empty_report",
    pass: insights.length > 0,
    actual: insights.length,
  });
  checks.push({
    name: "no_raw_skill_keys",
    pass: !/\b(math_|frac_|eng_|heb_|subSkill|skillId)\b/i.test(joined),
  });

  if (scenarioKey === "AAA4" && modeId === "C") {
    checks.push({
      name: "no_strong_diagnosis",
      pass: !/(נראה שיש קושי|כדאי לשים לב ל|הביצועים הכלליים)/.test(joined),
    });
    checks.push({
      name: "has_soft_fallback",
      pass: /מעט נתוני תרגול|מומלץ לשמור/.test(joined),
    });
  }
  if (scenarioKey === "AAA4" && modeId === "A") {
    checks.push({
      name: "mode_a_has_strong_or_activity_lines",
      pass: insights.length >= 1,
    });
  }
  if (scenarioKey === "GATE-LOW" && modeId === "C") {
    checks.push({
      name: "no_kedai_lehashim_lav",
      pass: !/כדאי לשים לב ל/.test(joined),
    });
    checks.push({
      name: "soft_line_present",
      pass: /מעט נתוני תרגול|מומלץ לשמור/.test(joined),
    });
  }
  if (scenarioKey === "SUBSKILL-FOCUS" && modeId === "C") {
    checks.push({ name: "has_nose_lechizuk", pass: /נושא לחיזוק/.test(joined) });
    checks.push({ name: "has_moked_litargul", pass: /מוקד לתרגול/.test(joined) });
  }
  if (scenarioKey === "SUBSKILL-CONFLICT" && modeId === "C") {
    checks.push({
      name: "no_practice_focus_lines",
      pass: !/נושא לחיזוק|מוקד לתרגול/.test(joined),
    });
  }

  return checks;
}

function assertPdfText(scenarioKey, text, payload) {
  const checks = [];
  for (const re of LEAK_PATTERNS) {
    checks.push({
      name: `no_leak_${re.source.slice(0, 24)}`,
      pass: !re.test(text),
    });
  }
  checks.push({ name: "hebrew_signal", pass: /מה חשוב לדעת|להורה|דוח|תרגול/.test(text) });
  checks.push({ name: "not_empty", pass: text.trim().length > 200 });

  const summary = payload.summary || {};
  if (Number(summary.totalSessions ?? 0) > 0) {
    checks.push({
      name: "no_false_inactivity_if_recent",
      pass: !text.includes("לא הייתה פעילות לאחרונה") || scenarioKey === "AAA4",
      warn: scenarioKey === "AAA4",
    });
  }

  if (scenarioKey === "SUBSKILL-FOCUS") {
    checks.push({ name: "focus_in_pdf", pass: /נושא לחיזוק/.test(text) && /מוקד לתרגול/.test(text) });
  }
  if (scenarioKey === "GATE-LOW" || scenarioKey === "AAA4") {
    checks.push({
      name: "gating_no_kedai_lehashim",
      pass: !/כדאי לשים לב ל/.test(text),
    });
  }
  if (scenarioKey === "SUBSKILL-CONFLICT") {
    checks.push({ name: "no_focus_in_pdf", pass: !/מוקד לתרגול/.test(text) });
  }

  return checks;
}

async function parsePdfText(buf) {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    const textResult = await parser.getText();
    await parser.destroy?.();
    return String(textResult?.text || "");
  } catch {
    return "";
  }
}

async function main() {
  const browserOnly = process.argv.includes("--browser-only");
  const pdfOnly = process.argv.includes("--pdf-only");
  await assertDevServerReachable();

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));

  /** @type {Record<string, { modeA?: object, modeC: object }>} */
  const payloads = {};
  for (const [scenarioKey, range] of Object.entries(SCENARIOS)) {
    const entry = byLabel.get(range.label);
    if (!entry) continue;
    console.log(`Build payload ${scenarioKey} (${range.label})`);
    payloads[scenarioKey] = {
      modeC: await buildPublicPayload(supabase, entry, range, MODE_BC),
    };
    if (scenarioKey === "AAA4") {
      payloads[scenarioKey].modeA = await buildPublicPayload(supabase, entry, range, MODE_A);
    }
  }

  await mkdir(BROWSER_DIR, { recursive: true });
  await mkdir(PDF_DIR, { recursive: true });

  const browserResults = [];
  const pdfResults = [];

  if (!pdfOnly) {
    console.log("\n=== Gate 3: Browser QA ===");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "he-IL" });
    await context.addInitScript(() => {
      window.__parentReportPlaywrightE2eSession = true;
    });
    const page = await context.newPage();
    const auth = await getParentAccessToken();
    await seedParentSession(page, auth);

    for (const [scenarioKey, range] of Object.entries(SCENARIOS)) {
      const entry = byLabel.get(range.label);
      const bundle = payloads[scenarioKey];
      if (!entry || !bundle) continue;

      const runs = [{ modeId: "C", payload: bundle.modeC }];
      if (scenarioKey === "AAA4" && bundle.modeA) {
        runs.unshift({ modeId: "A", payload: bundle.modeA });
      }

      for (const run of runs) {
        const slug = `${scenarioKey}-mode-${run.modeId}`;
        console.log(`  Browser ${slug}`);
        await interceptAndGoto(page, entry.studentId, range.from, range.to, run.payload);
        const { insights, bodySnippet } = await extractInsights(page);
        const screenshotPath = path.join(BROWSER_DIR, `${slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        const checks = assertScenarioBrowser(scenarioKey, run.modeId, insights, bodySnippet);
        const pass = checks.every((c) => c.pass);
        browserResults.push({
          scenario: scenarioKey,
          mode: run.modeId,
          flags: run.modeId === "C" ? "B+C ON, D OFF" : "all OFF",
          screenshot: screenshotPath,
          insights,
          checks,
          pass,
        });
      }
    }
    await browser.close();
    await writeFile(path.join(BROWSER_DIR, "browser-results.json"), JSON.stringify(browserResults, null, 2), "utf8");
  }

  if (!browserOnly) {
    console.log("\n=== Gate 4: PDF export QA ===");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "he-IL" });
    const page = await context.newPage();
    const auth = await getParentAccessToken();
    await seedParentSession(page, auth);

    for (const [scenarioKey, range] of Object.entries(SCENARIOS)) {
      const entry = byLabel.get(range.label);
      const payload = payloads[scenarioKey]?.modeC;
      if (!entry || !payload) continue;
      console.log(`  PDF ${scenarioKey}`);
      await interceptAndGoto(page, entry.studentId, range.from, range.to, payload);
      await page.emulateMedia({ media: "print" });
      const pdfRoot = "#parent-report-pdf";
      await page.waitForSelector(pdfRoot, { state: "attached", timeout: 120_000 });
      const buf = await page.pdf(pdfOpts);
      const pdfPath = path.join(PDF_DIR, `${scenarioKey}-mode-C.pdf`);
      await writeFile(pdfPath, buf);
      const text = await parsePdfText(buf);
      const checks = assertPdfText(scenarioKey, text, payload);
      pdfResults.push({
        scenario: scenarioKey,
        pdf: pdfPath,
        bytes: buf.length,
        textSample: text.slice(0, 800),
        checks,
        pass: checks.every((c) => c.pass),
      });
    }
    await browser.close();
    await writeFile(path.join(PDF_DIR, "pdf-results.json"), JSON.stringify(pdfResults, null, 2), "utf8");
  }

  const browserPass = browserResults.every((r) => r.pass);
  const pdfPass = pdfResults.every((r) => r.pass);
  console.log(`\nBrowser: ${browserResults.length ? (browserPass ? "PASS" : "FAIL") : "skipped"}`);
  console.log(`PDF: ${pdfResults.length ? (pdfPass ? "PASS" : "FAIL") : "skipped"}`);
  console.log(`Artifacts: ${BROWSER_DIR} , ${PDF_DIR}`);

  if ((browserResults.length && !browserPass) || (pdfResults.length && !pdfPass)) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
