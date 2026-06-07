#!/usr/bin/env node
/**
 * Q2-E Monthly Simulation — PDF export pack (36 PDFs: AAA1–AAA12 × modes A/C/D).
 * Requires running Next dev on port 3001 (or QA_BASE_URL).
 *
 * Run:
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-pdf-export.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-pdf-export.mjs --verify-only
 */
import { execSync } from "node:child_process";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MONTHLY_JSON = path.join(
  ROOT,
  "docs/qa/_artifacts/parent-report-q2e-monthly/parent-report-q2e-monthly-results.json"
);
const EXPORT_ROOT = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly/pdf-export");
const ZIP_PATH = path.join(EXPORT_ROOT, "parent-report-q2e-monthly-pdfs.zip");
const MANIFEST_PATH = path.join(EXPORT_ROOT, "pdf-export-manifest.json");

const QA_PARENT_EMAIL = "admin@admin.com";
const MONTH_FROM = "2026-04-01";
const MONTH_TO = "2026-04-30";
const BASE_URL = (process.env.QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

const FLAG_ENV = {
  subskill: "DIAGNOSTIC_METADATA_SUBSKILL_ENABLED",
  gating: "DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED",
  promotion: "DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED",
};

const EXPORT_MODES = [
  { id: "A", slug: "mode-A-default", env: { subskill: "false", gating: "false", promotion: "false" } },
  { id: "C", slug: "mode-C-suppression", env: { subskill: "true", gating: "true", promotion: "false" } },
  { id: "D", slug: "mode-D-promotion", env: { subskill: "true", gating: "true", promotion: "true" } },
];

const LEAKAGE_KEYS = [
  "classroom",
  "school",
  "privateTeacher",
  "private_teacher",
  "sourceBreakdown",
  "supportingEvidenceIds",
  "_evidenceQuality",
  "bySubSkill",
  "errorPatterns",
  "questionTypes",
  "problemClasses",
  "difficultyDepths",
  "shadowParentGating",
  "appliedParentGating",
  "validatedPromotionCandidates",
  "appliedParentPromotion",
  "gatingDecisions",
  "promotionDecisions",
  "_canonicalMeta",
];

const pdfOpts = {
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
  preferCSSPageSize: true,
};

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

function parseIsoDate(s) {
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function applyFlagMode(mode) {
  process.env[FLAG_ENV.subskill] = mode.env.subskill;
  process.env[FLAG_ENV.gating] = mode.env.gating;
  process.env[FLAG_ENV.promotion] = mode.env.promotion;
}

function deepFindLeakKeys(obj, pathPrefix = "") {
  const hits = [];
  if (!obj || typeof obj !== "object") return hits;
  for (const [k, v] of Object.entries(obj)) {
    const p = pathPrefix ? `${pathPrefix}.${k}` : k;
    const kl = k.toLowerCase();
    for (const leak of LEAKAGE_KEYS) {
      if (kl.includes(leak.toLowerCase())) hits.push(p);
    }
    if (v && typeof v === "object") hits.push(...deepFindLeakKeys(v, p));
  }
  return hits;
}

function publicSanitizationChecks(pub) {
  const checks = [];
  checks.push({ name: "no__evidenceQuality", pass: pub.meta?._evidenceQuality === undefined });
  checks.push({
    name: "no_supportingEvidenceIds",
    pass: pub.meta?.evidenceQuality?.student?.supportingEvidenceIds === undefined,
  });
  checks.push({
    name: "no_sourceBreakdown",
    pass: pub.meta?.evidenceQuality?.student?.sourceBreakdown === undefined,
  });
  checks.push({
    name: "no_public_metadata_internals",
    pass:
      pub.meta?.evidenceQuality?.bySubSkill === undefined &&
      pub.meta?.evidenceQuality?.errorPatterns === undefined &&
      pub.meta?.evidenceQuality?.questionTypes === undefined &&
      pub.meta?.evidenceQuality?.shadowParentGating === undefined &&
      pub.meta?.evidenceQuality?.appliedParentGating === undefined &&
      pub.meta?.evidenceQuality?.promotionDecisions === undefined,
  });
  checks.push({
    name: "no_canonicalMeta_on_mistakes",
    pass: !(pub.recentMistakes || []).some((m) => m?._canonicalMeta != null),
  });
  checks.push({
    name: "no_internal_rollups",
    pass:
      pub._diagnosticSubSkillRollup === undefined &&
      pub._diagnosticQuestionTypeRollup === undefined,
  });
  const leakHits = deepFindLeakKeys(pub);
  checks.push({ name: "no_leak_keys", pass: leakHits.length === 0, actual: leakHits.slice(0, 8) });
  return checks;
}

async function buildPublicPayload(supabase, studentRow, mode) {
  applyFlagMode(mode);
  const student = {
    id: studentRow.studentId,
    full_name: studentRow.displayName,
    grade_level: studentRow.gradeLevel || `g${studentRow.grade}`,
    is_active: true,
  };
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(MONTH_FROM),
    parseIsoDate(MONTH_TO),
    { includeParentActivities: true }
  );
  const withEq = attachParentContextEvidenceQuality(structuredClone(raw));
  const enriched = await enrichPayloadWithParentFacing(supabase, withEq, studentRow.studentId);
  return stripInternalReportPayloadFields(structuredClone(enriched));
}

async function assertDevServerReachable() {
  const url = `${BASE_URL}/learning/parent-report-detailed`;
  for (let i = 0; i < 8; i += 1) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.status > 0 && res.status < 600) {
        console.log(`  Dev server reachable (${url}) status=${res.status}`);
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Dev server not reachable at ${BASE_URL}`);
}

async function getParentAccessToken() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const qaParentId = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const tempPassword = process.env.QA_PDF_EXPORT_PARENT_PASSWORD || "QaPdfExportTemp2026!";
  const { error: updErr } = await admin.auth.admin.updateUserById(qaParentId, { password: tempPassword });
  if (updErr) throw new Error(`Parent password rotate failed: ${updErr.message}`);

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
      const key = `sb-${host}-auth-token`;
      localStorage.setItem(
        key,
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

function detailedReportUrl(studentId) {
  const q = new URLSearchParams({
    studentId,
    source: "parent",
    period: "custom",
    start: MONTH_FROM,
    end: MONTH_TO,
  });
  return `${BASE_URL}/learning/parent-report-detailed?${q.toString()}`;
}

async function exportPdf(page, studentRow, mode, publicPayload, outPath) {
  const studentId = studentRow.studentId;
  const routePattern = "**/api/parent/students/*/report-data*";

  await page.unroute(routePattern).catch(() => {});
  await page.route(routePattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(publicPayload),
    });
  });

  const url = detailedReportUrl(studentId);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForTimeout(2500);

  try {
    await page.waitForFunction(
      () => {
        const root = document.querySelector("#parent-report-detailed-print");
        const err = document.body?.innerText || "";
        if (/לא ניתן לבנות|שגיאת רשת|נדרשת התחברות/.test(err)) return false;
        return !!root && err.trim().length > 80;
      },
      undefined,
      { timeout: 240_000, polling: 500 }
    );
  } catch (err) {
    const snippet = await page.evaluate(() => (document.body?.innerText || "").slice(0, 500));
    throw new Error(`Report shell timeout: ${String(err?.message || err)} | body=${snippet}`);
  }

  await page.emulateMedia({ media: "print" });
  const buf = await page.pdf({ ...pdfOpts });
  await writeFile(outPath, buf);

  return { bytes: buf.length, hebrewSignal: buf.length > 5000 };
}

async function runMonthlyVerify() {
  const { execSync: exec } = await import("node:child_process");
  exec("node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-simulation.mjs --verify-only", {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

async function createZip() {
  await new Promise((r) => setTimeout(r, 2000));
  const dirs = [];
  for (let i = 1; i <= 12; i += 1) dirs.push(`AAA${i}`);
  const psDirs = dirs.map((d) => `'${d}'`).join(",");
  const cmd = `Set-Location -LiteralPath '${EXPORT_ROOT.replace(/'/g, "''")}'; if (Test-Path 'parent-report-q2e-monthly-pdfs.zip') { Remove-Item 'parent-report-q2e-monthly-pdfs.zip' -Force }; Compress-Archive -Path ${psDirs} -DestinationPath 'parent-report-q2e-monthly-pdfs.zip' -Force`;
  execSync(`powershell -NoProfile -Command "${cmd}"`, { stdio: "inherit" });
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const exportOnly = process.argv.includes("--export-only");

  if (!exportOnly) {
    console.log("Step 1: verify monthly simulation...");
    await runMonthlyVerify();
  } else {
    console.log("Step 1: skipped (--export-only)");
  }

  if (verifyOnly) {
    console.log("--verify-only: monthly simulation PASS, skipping PDF export");
    return;
  }

  console.log("Step 2: check dev server...");
  await assertDevServerReachable();

  let monthly;
  try {
    monthly = JSON.parse(await readFile(MONTHLY_JSON, "utf8"));
  } catch {
    throw new Error(`Missing ${MONTHLY_JSON} — run monthly simulation first`);
  }

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const key = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  await mkdir(EXPORT_ROOT, { recursive: true });

  const manifest = {
    runAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    monthWindow: { from: MONTH_FROM, to: MONTH_TO },
    seedTag: "parent-report-q2e-monthly-v1",
    parentAccount: QA_PARENT_EMAIL,
    reportSurface: "parent-report-detailed-full",
    modes: EXPORT_MODES.map((m) => m.id),
    students: [],
    exports: [],
    summary: { expected: 36, generated: 0, failed: 0 },
  };

  console.log("Step 3: preflight sanitization on all student/mode payloads...");
  for (const row of monthly.results) {
    const studentEntry = { label: row.label, studentId: row.studentId, modes: {} };
    for (const mode of EXPORT_MODES) {
      const pub = await buildPublicPayload(supabase, row, mode);
      const checks = publicSanitizationChecks(pub);
      const pass = checks.every((c) => c.pass);
      studentEntry.modes[mode.id] = { sanitizationPass: pass, checks: checks.filter((c) => !c.pass) };
      if (!pass) {
        throw new Error(`Sanitization failed ${row.label} mode ${mode.id}: ${JSON.stringify(checks.filter((c) => !c.pass))}`);
      }
    }
    manifest.students.push(studentEntry);
  }
  console.log("  Sanitization preflight PASS (12 × 3 modes)");

  console.log("Step 4: Playwright PDF export...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "he-IL" });
  await context.addInitScript(() => {
    window.__parentReportPlaywrightE2eSession = true;
  });
  const page = await context.newPage();
  const auth = await getParentAccessToken();
  await seedParentSession(page, auth);

  for (const row of monthly.results) {
    const studentDir = path.join(EXPORT_ROOT, row.label);
    await mkdir(studentDir, { recursive: true });
    console.log(`  ${row.label}...`);

    for (const mode of EXPORT_MODES) {
      const fileName = `${row.label}_2026-04_${mode.slug}.pdf`;
      const outPath = path.join(studentDir, fileName);
      const exportRow = {
        student: row.label,
        login: row.login,
        mode: mode.id,
        modeSlug: mode.slug,
        fileName,
        relativePath: path.join(row.label, fileName).replace(/\\/g, "/"),
        pass: false,
      };
      try {
        const pub = await buildPublicPayload(supabase, row, mode);
        const meta = await exportPdf(page, row, mode, pub, outPath);
        exportRow.pass = true;
        exportRow.bytes = meta.bytes;
        exportRow.hebrewSignal = meta.hebrewSignal;
        manifest.summary.generated += 1;
        console.log(`    PASS ${mode.id} → ${fileName} (${meta.bytes} bytes)`);
      } catch (err) {
        exportRow.error = String(err?.message || err);
        manifest.summary.failed += 1;
        console.error(`    FAIL ${mode.id}: ${exportRow.error}`);
      }
      manifest.exports.push(exportRow);
    }
  }

  await browser.close();

  console.log("Step 5: create ZIP...");
  await createZip();

  manifest.summary.expected = monthly.results.length * EXPORT_MODES.length;
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`\nDone: ${manifest.summary.generated}/${manifest.summary.expected} PDFs`);
  console.log(`ZIP: ${ZIP_PATH}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);

  if (manifest.summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL", e?.message || e);
  process.exit(1);
});
