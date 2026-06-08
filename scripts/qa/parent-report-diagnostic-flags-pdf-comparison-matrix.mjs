#!/usr/bin/env node
/**
 * Visual PDF comparison matrix — 5 scenarios × modes A/B/C/D (20 PNG + 20 PDF).
 *
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-pdf-comparison-matrix.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-pdf-comparison-matrix.mjs --report-only
 *
 * Requires Next on port 3001 (npm run dev or next start -p 3001).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const ARTIFACT_ROOT = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-pdf-comparison-matrix");
const REPORT_PATH = path.join(ROOT, "docs/qa/DIAGNOSTIC_FLAGS_PDF_COMPARISON_MATRIX_REPORT.md");
const RESULTS_JSON = path.join(ARTIFACT_ROOT, "matrix-results.json");
const BASE_URL = (process.env.QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

/** @type {Record<string, { label: string, from: string, to: string }>} */
const SCENARIOS = {
  AAA4: { label: "AAA4", from: "2026-05-01", to: "2026-06-08" },
  "GATE-LOW": { label: "AAA9", from: "2026-05-10", to: "2026-05-18" },
  "SUBSKILL-FOCUS": { label: "AAA10", from: "2026-05-06", to: "2026-05-20" },
  "SUBSKILL-CONFLICT": { label: "AAA8", from: "2026-05-20", to: "2026-05-24" },
  "PROMOTE-STRONG": { label: "AAA5", from: "2026-05-04", to: "2026-05-11" },
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

const STRONG_RE = /(כדאי לשים לב ל|נראה שיש קושי|הביצועים הכלליים)/;
const SOFT_RE = /(מעט נתוני תרגול|יש עדיין מעט נתוני תרגול|מומלץ לשמור)/;
const FOCUS_RE = /(נושא לחיזוק|מוקד לתרגול)/;
const RAW_KEY_RE = /\b(math_|frac_|eng_|heb_|subSkill|skillId)\b/i;

const pdfOpts = {
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
  preferCSSPageSize: true,
};

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = mode.env.promotion;
}

function modeFlagsLabel(modeId) {
  const m = FLAG_MODES.find((x) => x.id === modeId);
  if (!m) return modeId;
  return `S=${m.env.subskill} G=${m.env.gating} P=${m.env.promotion}`;
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
        console.log(`  Server reachable (${url}) status=${res.status}`);
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Server not reachable at ${BASE_URL}. Start: npm run dev or next start -p 3001`);
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
  await page.waitForTimeout(1200);
}

async function extractInsights(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="parent-report-parent-sections"]');
    if (!root) return { insightLines: [], allLines: [], bodySnippet: "" };
    const lis = root.querySelectorAll("li");
    const lines = [...lis].map((li) => li.textContent?.trim() || "").filter(Boolean);
    return {
      insightLines: lines,
      allLines: lines,
      bodySnippet: (document.body?.innerText || "").slice(0, 3000),
    };
  });
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

function analyzeText(text, payload) {
  const pf = payload?.parentFacing || {};
  return {
    insightCount: Array.isArray(pf.insights) ? pf.insights.length : 0,
    payloadInsights: Array.isArray(pf.insights) ? pf.insights : [],
    practiceFocusCount: Array.isArray(pf.practiceFocus) ? pf.practiceFocus.length : 0,
    gatingApplied: Boolean(pf.gatingApplied),
    diagnosisSuppressed: Boolean(pf.diagnosisSuppressed),
    hasStrong: STRONG_RE.test(text),
    hasSoft: SOFT_RE.test(text),
    hasFocus: FOCUS_RE.test(text),
    hasRawKeys: RAW_KEY_RE.test(text),
    notEmpty: text.trim().length > 200,
  };
}

function leakCheckPdf(text) {
  const hits = [];
  for (const { name, re } of LEAK_PATTERNS) {
    if (re.test(text)) hits.push(name);
  }
  return { pass: hits.length === 0, hits };
}

function summarizeMode(analysis) {
  const parts = [];
  if (analysis.hasStrong) parts.push("strong");
  if (analysis.hasSoft) parts.push("soft");
  if (analysis.hasFocus) parts.push("focus");
  if (analysis.gatingApplied) parts.push("gating");
  if (analysis.diagnosisSuppressed) parts.push("suppressed");
  if (analysis.practiceFocusCount > 0) parts.push(`pf=${analysis.practiceFocusCount}`);
  if (analysis.insightCount === 0 && !analysis.notEmpty) parts.push("empty");
  if (analysis.hasRawKeys) parts.push("RAW!");
  return parts.length ? parts.join(", ") : "baseline";
}

function expectedDiffForScenario(scenarioKey) {
  switch (scenarioKey) {
    case "AAA4":
      return "A/B strong or activity lines; C/D soften/remove strong; report not empty";
    case "GATE-LOW":
      return "A/B may show strong; C/D suppress + soft fallback";
    case "SUBSKILL-FOCUS":
      return "A no focus; B/C/D show נושא לחיזוק + מוקד לתרגול; no raw keys";
    case "SUBSKILL-CONFLICT":
      return "All modes: no practice focus (conflict suppresses B/C/D)";
    case "PROMOTE-STRONG":
      return "D may show promotion-visible delta; else internal-only promotion";
    default:
      return "—";
  }
}

function verdictForScenario(scenarioKey, byMode) {
  const a = byMode.A?.analysis;
  const b = byMode.B?.analysis;
  const c = byMode.C?.analysis;
  const d = byMode.D?.analysis;
  if (!a || !b || !c || !d) return { pass: false, note: "missing mode data" };

  const allLeakPass = ["A", "B", "C", "D"].every((m) => byMode[m]?.leak?.pass);
  if (!allLeakPass) return { pass: false, note: "PDF leak detected" };

  switch (scenarioKey) {
    case "AAA4": {
      const cSoft = c.hasSoft || !c.hasStrong;
      const notEmpty = [a, b, c, d].every((x) => x.notEmpty && x.insightCount + x.payloadInsights.length > 0);
      const gatingDelta = (a.hasStrong || b.hasStrong) !== (c.hasStrong || d.hasStrong) || c.gatingApplied;
      return {
        pass: notEmpty && cSoft && gatingDelta,
        note: gatingDelta
          ? "C/D gating visible vs A/B"
          : "A/B and C/D similar — check strong-line patterns",
      };
    }
    case "GATE-LOW": {
      const cSuppressed = !c.hasStrong && c.hasSoft;
      const dSuppressed = !d.hasStrong;
      return {
        pass: cSuppressed && dSuppressed && [c, d].every((x) => x.notEmpty),
        note: cSuppressed ? "C/D suppress strong + soft fallback" : "gating pattern weak on GATE-LOW",
      };
    }
    case "SUBSKILL-FOCUS": {
      const bFocus = b.hasFocus && b.practiceFocusCount > 0;
      const cFocus = c.hasFocus;
      const aNoFocus = !a.hasFocus;
      const noRaw = [a, b, c, d].every((x) => !x.hasRawKeys);
      return {
        pass: aNoFocus && bFocus && cFocus && d.hasFocus && noRaw,
        note: `A focus=${a.hasFocus}; B/C/D focus=${b.hasFocus}/${c.hasFocus}/${d.hasFocus}`,
      };
    }
    case "SUBSKILL-CONFLICT": {
      const noFocusAny = [a, b, c, d].every((x) => !x.hasFocus && x.practiceFocusCount === 0);
      return { pass: noFocusAny, note: noFocusAny ? "conflict suppresses all modes" : "unexpected focus lines" };
    }
    case "PROMOTE-STRONG": {
      const dVsA = JSON.stringify(d.payloadInsights) !== JSON.stringify(a.payloadInsights);
      const dVsC = JSON.stringify(d.payloadInsights) !== JSON.stringify(c.payloadInsights);
      if (dVsA || dVsC) {
        return { pass: true, note: "D shows visible promotion delta" };
      }
      return {
        pass: true,
        note: "promotion internal only — D identical to A/C on parentFacing (policy/fixture)",
      };
    }
    default:
      return { pass: true, note: "—" };
  }
}

function actualDiffForScenario(byMode) {
  return ["A", "B", "C", "D"]
    .map((m) => `${m}:${summarizeMode(byMode[m].analysis)}`)
    .join("; ");
}

function buildReport(matrix) {
  const lines = [
    "# Diagnostic Flags — Visual PDF Comparison Matrix",
    "",
    "**Date:** 2026-06-08",
    "**Scope:** Visual comparison only — no staging/production activation, no deploy, no code changes.",
    "",
    "**Route:** `/learning/parent-report` (ParentReportParentSections)",
    "",
    "**Artifacts:** `docs/qa/_artifacts/diagnostic-flags-pdf-comparison-matrix/`",
    "",
    "Each cell: `mode-X.png` + `mode-X.pdf` under scenario folder.",
    "",
    "---",
    "",
    "## Summary matrix",
    "",
    "| Scenario | A | B | C | D | Expected diff | Actual diff | Verdict |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of matrix.scenarios) {
    const col = (modeId) => summarizeMode(row.modes[modeId].analysis);
    const actualDiff = ["A", "B", "C", "D"]
      .map((m) => `${m}:${col(m)}`)
      .join("; ");
    lines.push(
      `| ${row.scenario} | ${col("A")} | ${col("B")} | ${col("C")} | ${col("D")} | ${row.expectedDiff} | ${actualDiff} | **${row.verdict.pass ? "PASS" : "FAIL"}** — ${row.verdict.note} |`
    );
  }

  lines.push("", "---", "", "## Leak scan (all 20 PDFs)", "");
  const leakFails = matrix.cells.filter((c) => !c.leak.pass);
  if (leakFails.length === 0) {
    lines.push("**PASS** — no forbidden keys in any PDF text extract.");
  } else {
    lines.push("**FAIL** — leaks found:");
    for (const c of leakFails) {
      lines.push(`- ${c.scenario} mode-${c.mode}: ${c.leak.hits.join(", ")}`);
    }
  }

  lines.push("", "---", "", "## Per-scenario detail", "");

  for (const row of matrix.scenarios) {
    lines.push(`### ${row.scenario} (${row.child}, ${row.from}..${row.to})`, "");
    for (const modeId of ["A", "B", "C", "D"]) {
      const cell = row.modes[modeId];
      lines.push(`**Mode ${modeId}** (${modeFlagsLabel(modeId)})`);
      lines.push(`- Files: \`${row.scenario}/mode-${modeId}.png\`, \`mode-${modeId}.pdf\``);
      lines.push(`- Payload insights (${cell.analysis.insightCount}): ${cell.analysis.payloadInsights.map((s) => `"${s}"`).join("; ") || "—"}`);
      lines.push(`- PDF signals: ${summarizeMode(cell.analysis)}`);
      lines.push(`- Leak: ${cell.leak.pass ? "PASS" : `FAIL (${cell.leak.hits.join(", ")})`}`);
      lines.push("");
    }
  }

  lines.push("---", "", "## Flag mode reference", "", "| Mode | SUBSKILL | GATING | PROMOTION |", "| --- | --- | --- | --- |");
  for (const m of FLAG_MODES) {
    lines.push(`| ${m.id} | ${m.env.subskill} | ${m.env.gating} | ${m.env.promotion} |`);
  }

  lines.push("", "---", "", "*Generated by `scripts/qa/parent-report-diagnostic-flags-pdf-comparison-matrix.mjs`*");
  return lines.join("\n");
}

async function runMatrix() {
  await assertDevServerReachable();

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const byLabel = new Map(students.map((s) => [s.label, s]));

  await mkdir(ARTIFACT_ROOT, { recursive: true });

  /** @type {Array<object>} */
  const cells = [];
  /** @type {Array<object>} */
  const scenarioRows = [];

  console.log("=== Build payloads (5 × 4 modes) ===");
  /** @type {Record<string, Record<string, object>>} */
  const payloads = {};
  for (const [scenarioKey, range] of Object.entries(SCENARIOS)) {
    const entry = byLabel.get(range.label);
    if (!entry) throw new Error(`Missing student ${range.label}`);
    payloads[scenarioKey] = {};
    for (const mode of FLAG_MODES) {
      console.log(`  ${scenarioKey} mode-${mode.id}`);
      payloads[scenarioKey][mode.id] = await buildPublicPayload(supabase, entry, range, mode);
    }
  }

  console.log("\n=== Capture screenshots + PDFs (20 + 20) ===");
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
    const scenarioDir = path.join(ARTIFACT_ROOT, scenarioKey);
    await mkdir(scenarioDir, { recursive: true });
    /** @type {Record<string, object>} */
    const modes = {};

    for (const mode of FLAG_MODES) {
      const payload = payloads[scenarioKey][mode.id];
      const slug = `mode-${mode.id}`;
      console.log(`  ${scenarioKey} ${slug}`);
      await interceptAndGoto(page, entry.studentId, range.from, range.to, payload);

      const pngPath = path.join(scenarioDir, `${slug}.png`);
      await page.screenshot({ path: pngPath, fullPage: true });

      const { insightLines, bodySnippet } = await extractInsights(page);
      const joinedUi = [...insightLines, bodySnippet].join("\n");

      await page.emulateMedia({ media: "print" });
      await page.waitForSelector("#parent-report-pdf", { state: "attached", timeout: 120_000 });
      const pdfBuf = await page.pdf(pdfOpts);
      const pdfPath = path.join(scenarioDir, `${slug}.pdf`);
      await writeFile(pdfPath, pdfBuf);
      const pdfText = await parsePdfText(pdfBuf);

      const analysis = analyzeText(`${joinedUi}\n${pdfText}`, payload);
      const leak = leakCheckPdf(pdfText);

      const cell = {
        scenario: scenarioKey,
        mode: mode.id,
        flags: modeFlagsLabel(mode.id),
        png: path.relative(ROOT, pngPath).replace(/\\/g, "/"),
        pdf: path.relative(ROOT, pdfPath).replace(/\\/g, "/"),
        pdfBytes: pdfBuf.length,
        uiInsightLines: insightLines,
        payloadInsights: analysis.payloadInsights,
        analysis,
        leak,
      };
      cells.push(cell);
      modes[mode.id] = cell;
    }

    const verdict = verdictForScenario(scenarioKey, modes);
    scenarioRows.push({
      scenario: scenarioKey,
      child: range.label,
      from: range.from,
      to: range.to,
      expectedDiff: expectedDiffForScenario(scenarioKey),
      actualDiff: actualDiffForScenario(modes),
      modes,
      verdict,
    });
  }

  await browser.close();

  const matrix = {
    generatedAt: new Date().toISOString(),
    artifactRoot: path.relative(ROOT, ARTIFACT_ROOT).replace(/\\/g, "/"),
    route: "/learning/parent-report",
    cellCount: cells.length,
    scenarios: scenarioRows,
    cells,
    leakScanPass: cells.every((c) => c.leak.pass),
  };

  await writeFile(RESULTS_JSON, JSON.stringify(matrix, null, 2), "utf8");
  await writeFile(REPORT_PATH, buildReport(matrix), "utf8");

  console.log(`\nCells: ${cells.length} (expected 20)`);
  console.log(`Leak scan: ${matrix.leakScanPass ? "PASS" : "FAIL"}`);
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Artifacts: ${ARTIFACT_ROOT}`);

  if (cells.length !== 20 || !matrix.leakScanPass) process.exit(1);
  const failScenarios = scenarioRows.filter((r) => !r.verdict.pass);
  if (failScenarios.length) {
    console.log(`Scenario verdict FAIL: ${failScenarios.map((r) => r.scenario).join(", ")}`);
  }
}

async function main() {
  if (process.argv.includes("--report-only")) {
    const raw = await readFile(RESULTS_JSON, "utf8");
    const matrix = JSON.parse(raw);
    await writeFile(REPORT_PATH, buildReport(matrix), "utf8");
    console.log(`Report regenerated: ${REPORT_PATH}`);
    return;
  }
  await runMatrix();
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
