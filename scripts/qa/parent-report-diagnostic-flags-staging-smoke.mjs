#!/usr/bin/env node
/**
 * Live staging smoke — diagnostic flags B+C ON, promotion OFF (mode-C equivalent).
 * Uses real report-data API on QA_BASE_URL (no payload intercept).
 *
 *   QA_BASE_URL=https://….vercel.app node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-staging-smoke.mjs
 *   … --write-report   # also writes docs/qa/DIAGNOSTIC_FLAGS_STAGING_SMOKE_REPORT.md
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

import {
  parseIsoDate,
  QA_PARENT_EMAIL,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_ROOT = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-staging-smoke");
const REPORT_PATH = path.join(ROOT, "docs/qa/DIAGNOSTIC_FLAGS_STAGING_SMOKE_REPORT.md");
const BASE_URL = (process.env.QA_BASE_URL || "").replace(/\/$/, "");

const SCENARIOS = {
  AAA4: { label: "AAA4", from: "2026-05-01", to: "2026-06-08" },
  "GATE-LOW": { label: "AAA9", from: "2026-05-10", to: "2026-05-18" },
  "SUBSKILL-FOCUS": { label: "AAA10", from: "2026-05-06", to: "2026-05-20" },
  "SUBSKILL-CONFLICT": { label: "AAA8", from: "2026-05-20", to: "2026-05-24" },
};

const LEAK_PATTERNS = [
  { name: "_evidenceQuality", re: /_evidenceQuality/i },
  { name: "bySubSkill", re: /\bbySubSkill\b/ },
  { name: "gatingDecisions", re: /\bgatingDecisions\b/ },
  { name: "promotionDecisions", re: /\bpromotionDecisions\b/ },
  { name: "supportingEvidenceIds", re: /\bsupportingEvidenceIds\b/ },
  { name: "skillId", re: /\bskillId\b/ },
  { name: "subSkill", re: /\bsubSkill\b/ },
  { name: "math_*", re: /\bmath_[a-z0-9_]+\b/i },
  { name: "frac_*", re: /\bfrac_[a-z0-9_]+\b/i },
];

const BAD_MINUTE_PATTERNS = [/30602/, /5881/, /13141/, /36483/, /24902/];
const INSUFFICIENT_SESSIONS_RE = /אין\s+מספיק\s+מפגש/;
const MIN_QUESTIONS_FOR_STATUS = 12;
const STRONG_RE = /(כדאי לשים לב ל|נראה שיש קושי|הביצועים הכלליים)/;
const SOFT_RE = /(מעט נתוני תרגול|יש עדיין מעט נתוני תרגול|מומלץ לשמור)/;
const FOCUS_RE = /(נושא לחיזוק|מוקד לתרגול)/;

const pdfOpts = {
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
  preferCSSPageSize: true,
};

function findInsufficientSessionsOnHighQuestionRows(text) {
  const hits = [];
  const parts = String(text || "").split(/(?=דק['\u2019]?\s*\d+)/);
  for (const part of parts) {
    const m = part.match(
      /^דק['\u2019]?\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)%\s*[⚠👍✓]?\s*(.*?)(?=דק['\u2019]?|$)/s
    );
    if (!m) continue;
    const questions = Number(m[2]);
    const status = String(m[5] || "");
    if (questions >= MIN_QUESTIONS_FOR_STATUS && INSUFFICIENT_SESSIONS_RE.test(status)) {
      hits.push({ questions, statusSnippet: status.replace(/\s+/g, " ").trim().slice(0, 100) });
    }
  }
  return hits;
}

function scanPdfNumeric(text) {
  const badPatternHits = [];
  for (const re of BAD_MINUTE_PATTERNS) {
    if (re.test(text)) badPatternHits.push(re.source);
  }
  const minutes = [];
  for (const match of text.matchAll(/(?:^|[\s'"])(\d{1,3})\s*דק|(?:^|[\s'"])דק[\s'"]*(\d{1,3})/gm)) {
    const n = Number(match[1] || match[2]);
    if (Number.isFinite(n) && n > 0) minutes.push(n);
  }
  const minutesOver300 = minutes.filter((n) => n > 300);
  const insufficientHighQ = findInsufficientSessionsOnHighQuestionRows(text);
  return {
    badPatternHits,
    minutesOver300,
    insufficientHighQ,
    minuteSamples: [...new Set(minutes)].sort((a, b) => a - b).slice(0, 20),
    pass:
      badPatternHits.length === 0 &&
      minutesOver300.length === 0 &&
      insufficientHighQ.length === 0,
  };
}

function leakScan(text) {
  const hits = [];
  for (const { name, re } of LEAK_PATTERNS) {
    if (re.test(text)) hits.push(name);
  }
  return { pass: hits.length === 0, hits };
}

async function assertServerReachable() {
  if (!BASE_URL) throw new Error("Set QA_BASE_URL to staging/preview URL");
  const url = `${BASE_URL}/learning/parent-report`;
  const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!(res.status > 0 && res.status < 600)) throw new Error(`Unreachable: ${url}`);
  console.log(`  Staging reachable (${url}) status=${res.status}`);
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
    refresh: data.session.refresh_token || "",
  };
}

async function seedParentSession(page, auth) {
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

async function gotoLiveReport(page, studentId, from, to) {
  const printRoot = '[data-testid="parent-report-parent-sections"]';
  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/parent/students/") &&
      res.url().includes("/report-data") &&
      res.status() === 200,
    { timeout: 240_000 }
  );
  await page.goto(reportUrl(studentId, from, to), { waitUntil: "load", timeout: 240_000 });
  let apiPayload = null;
  try {
    const resp = await responsePromise;
    apiPayload = await resp.json();
  } catch {
    apiPayload = null;
  }
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
  return apiPayload;
}

async function extractPageText(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="parent-report-parent-sections"]');
    const lis = root ? [...root.querySelectorAll("li")].map((li) => li.textContent?.trim() || "") : [];
    return {
      insightLines: lis.filter(Boolean),
      bodyText: (document.body?.innerText || "").slice(0, 8000),
    };
  });
}

async function parsePdfText(buf) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf });
  const textResult = await parser.getText();
  await parser.destroy?.();
  return String(textResult?.text || "");
}

function scenarioChecks(scenarioKey, uiText, pdfText, numeric, leak) {
  const joined = `${uiText}\n${pdfText}`;
  const checks = [];

  checks.push({ name: "report_not_empty", pass: uiText.trim().length > 120, actual: uiText.length });
  checks.push({ name: "pdf_not_empty", pass: pdfText.trim().length > 200, actual: pdfText.length });
  checks.push({ name: "leak_scan", pass: leak.pass, actual: leak.hits });
  checks.push({ name: "numeric_scan", pass: numeric.pass, actual: numeric });
  checks.push({
    name: "no_insufficient_sessions_q12_plus",
    pass: numeric.insufficientHighQ.length === 0,
    actual: numeric.insufficientHighQ,
  });

  switch (scenarioKey) {
    case "AAA4":
      checks.push({ name: "strong_suppressed", pass: !STRONG_RE.test(joined) });
      checks.push({ name: "soft_fallback", pass: SOFT_RE.test(joined) });
      break;
    case "GATE-LOW":
      checks.push({ name: "strong_suppressed", pass: !STRONG_RE.test(joined) });
      checks.push({ name: "soft_fallback", pass: SOFT_RE.test(joined) });
      checks.push({
        name: "minutes_not_inflated",
        pass: numeric.badPatternHits.length === 0 && numeric.minutesOver300.length === 0,
        actual: numeric.minuteSamples,
      });
      break;
    case "SUBSKILL-FOCUS":
      checks.push({ name: "has_nose_lechizuk", pass: /נושא לחיזוק/.test(joined) });
      checks.push({ name: "has_moked_litargul", pass: /מוקד לתרגול/.test(joined) });
      break;
    case "SUBSKILL-CONFLICT":
      checks.push({ name: "no_focus", pass: !FOCUS_RE.test(joined) });
      break;
    default:
      break;
  }

  const pass = checks.every((c) => c.pass);
  return { pass, checks };
}

function writeReportMarkdown(meta, results) {
  const lines = [
    "# Diagnostic Flags — Staging Smoke Report",
    "",
    `**Date:** ${meta.date}`,
    `**Staging URL:** ${meta.baseUrl}`,
    `**Flags (staging):** subskill=ON, gating=ON, promotion=OFF`,
    `**Production flags:** unchanged (OFF)`,
    "",
    "## Overall verdict",
    "",
    `**${meta.overallPass ? "PASS" : "FAIL"}** — ${meta.passCount}/${results.length} scenarios`,
    "",
    "## Environment activation",
    "",
    "| Variable | Staging (Preview) | Production |",
    "|----------|-------------------|------------|",
    "| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | `true` | OFF |",
    "| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | `true` | OFF |",
    "| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | `false` | OFF |",
    "",
    meta.activationNote ? `**Note:** ${meta.activationNote}` : "",
    "",
    "## Scenario results",
    "",
    "| Scenario | Verdict | Screenshot | PDF |",
    "|----------|---------|------------|-----|",
  ];

  for (const r of results) {
    lines.push(
      `| ${r.scenario} | **${r.pass ? "PASS" : "FAIL"}** | \`${r.png}\` | \`${r.pdf}\` |`
    );
  }

  lines.push("", "## Per-scenario checks", "");
  for (const r of results) {
    lines.push(`### ${r.scenario} — ${r.pass ? "PASS" : "FAIL"}`, "");
    for (const c of r.checks) {
      lines.push(`- ${c.pass ? "✓" : "✗"} \`${c.name}\`${c.actual != null && !c.pass ? `: ${JSON.stringify(c.actual).slice(0, 120)}` : ""}`);
    }
    lines.push("", "**Numeric scan:**", "```json", JSON.stringify(r.numeric, null, 2), "```", "");
    lines.push("**Leak scan:**", "```json", JSON.stringify(r.leak, null, 2), "```", "");
  }

  lines.push(
    "## Production limited recommendation",
    "",
    meta.overallPass
      ? "**Conditional yes** — staging smoke PASS for B+C (promotion OFF). Safe to consider **production limited** rollout behind env flags after owner review of artifacts; keep `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false`."
      : "**No** — fix failing scenarios on staging before any production limited rollout.",
    "",
    "## Artifacts",
    "",
    "```text",
    "docs/qa/_artifacts/diagnostic-flags-staging-smoke/",
    "  staging-smoke-results.json",
    "  <scenario>.png / .pdf",
    "```",
    "",
    "---",
    "",
    "*Generated by `scripts/qa/parent-report-diagnostic-flags-staging-smoke.mjs`*"
  );

  return lines.join("\n");
}

async function main() {
  const writeReport = process.argv.includes("--write-report");
  await assertServerReachable();

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));

  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const auth = await getParentAccessToken();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await seedParentSession(page, auth);

  /** @type {Array<object>} */
  const results = [];

  for (const [scenarioKey, range] of Object.entries(SCENARIOS)) {
    const entry = byLabel.get(range.label);
    if (!entry) throw new Error(`Missing student ${range.label}`);
    console.log(`Smoke ${scenarioKey} (${range.label})…`);

    await gotoLiveReport(page, entry.studentId, range.from, range.to);
    const { insightLines, bodyText } = await extractPageText(page);
    const uiText = [...insightLines, bodyText].join("\n");

    const pdfBuf = await page.pdf(pdfOpts);
    const pdfText = await parsePdfText(pdfBuf);
    const numeric = scanPdfNumeric(pdfText);
    const leak = leakScan(pdfText);
    const { pass, checks } = scenarioChecks(scenarioKey, uiText, pdfText, numeric, leak);

    const slug = scenarioKey.replace(/[^a-z0-9-]+/gi, "-");
    const pngRel = `${slug}.png`;
    const pdfRel = `${slug}.pdf`;
    await page.screenshot({ path: path.join(ARTIFACT_ROOT, pngRel), fullPage: true });
    await writeFile(path.join(ARTIFACT_ROOT, pdfRel), pdfBuf);

    results.push({
      scenario: scenarioKey,
      student: range.label,
      window: `${range.from} → ${range.to}`,
      pass,
      checks,
      numeric,
      leak,
      png: path.relative(ROOT, path.join(ARTIFACT_ROOT, pngRel)).replace(/\\/g, "/"),
      pdf: path.relative(ROOT, path.join(ARTIFACT_ROOT, pdfRel)).replace(/\\/g, "/"),
    });
    console.log(`  ${scenarioKey}: ${pass ? "PASS" : "FAIL"}`);
  }

  await browser.close();

  const passCount = results.filter((r) => r.pass).length;
  const overallPass = passCount === results.length;
  const summary = {
    scannedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    flags: { subskill: true, gating: true, promotion: false },
    passCount,
    total: results.length,
    overallPass,
    results,
  };

  await writeFile(
    path.join(ARTIFACT_ROOT, "staging-smoke-results.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  if (writeReport) {
    const md = writeReportMarkdown(
      {
        date: new Date().toISOString().slice(0, 10),
        baseUrl: BASE_URL,
        overallPass,
        passCount,
        activationNote:
          "Preview deployment with B+C flags via `vercel deploy --target preview` (-e/-b). Production env unchanged.",
      },
      results
    );
    await writeFile(REPORT_PATH, md, "utf8");
    console.log(`Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify({ overallPass, passCount, total: results.length }, null, 2));
  if (!overallPass) process.exit(1);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
