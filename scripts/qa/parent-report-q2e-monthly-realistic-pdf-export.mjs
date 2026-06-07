#!/usr/bin/env node
/**
 * Realistic April 2026 parent-report PDF export — 36 PDFs (12 × 3 product types).
 *
 * Requires:
 *   - Realistic seed (parent-report-q2e-monthly-realistic-v1)
 *   - Data verification PASS
 *   - Next dev on port 3001 (or QA_BASE_URL)
 *
 * Run:
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-pdf-export.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-pdf-export.mjs --export-only
 *   node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-pdf-export.mjs --verify-only
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { PDFParse } from "pdf-parse";

import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../../lib/parent-server/parent-report-account-attachment.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly-realistic");
const VERIFY_JSON = path.join(ARTIFACT_DIR, "april-data-verification.json");
const exportDirArg = process.argv.find((a) => a.startsWith("--export-dir="))?.split("=")[1];
const EXPORT_ROOT = exportDirArg
  ? path.resolve(ROOT, exportDirArg)
  : path.join(ARTIFACT_DIR, "pdf-export");
const ZIP_PATH = path.join(EXPORT_ROOT, "parent-report-q2e-monthly-realistic-pdfs.zip");
const MANIFEST_PATH = path.join(EXPORT_ROOT, "pdf-export-manifest.json");
const CONTENT_VERIFY_PATH = path.join(EXPORT_ROOT, "pdf-content-verification.json");

const QA_PARENT_EMAIL = "admin@admin.com";
const MONTH_FROM = "2026-04-01";
const MONTH_TO = "2026-04-30";
const BASE_URL = (process.env.QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

const EXPORT_TYPES = [
  { id: "detailed-full", slug: "detailed-full", route: "parent-report-detailed", mode: null, printRoot: "#parent-report-detailed-print" },
  { id: "detailed-summary", slug: "detailed-summary", route: "parent-report-detailed", mode: "summary", printRoot: "#parent-report-detailed-print" },
  { id: "short-report", slug: "short-report", route: "parent-report", mode: null, printRoot: "#parent-report-pdf" },
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

const AAA = [
  { label: "AAA1", login: "aaa1", grade: 1 },
  { label: "AAA2", login: "aaa2", grade: 1 },
  { label: "AAA3", login: "aaa3", grade: 2 },
  { label: "AAA4", login: "aaa4", grade: 2 },
  { label: "AAA5", login: "aaa5", grade: 3 },
  { label: "AAA6", login: "aaa6", grade: 3 },
  { label: "AAA7", login: "aaa7", grade: 4 },
  { label: "AAA8", login: "aaa8", grade: 4 },
  { label: "AAA9", login: "aaa9", grade: 5 },
  { label: "AAA10", login: "aaa10", grade: 5 },
  { label: "AAA11", login: "aaa11", grade: 6 },
  { label: "AAA12", login: "aaa12", grade: 6 },
];

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return v;
}

function parseIsoDate(s) {
  return new Date(`${s}T00:00:00.000Z`);
}

async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf });
  try {
    const textResult = await parser.getText();
    return String(textResult?.text || "");
  } finally {
    await parser.destroy?.();
  }
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

async function resolveStudents(supabase) {
  const logins = AAA.map((a) => a.login);
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username")
    .in("login_username", logins)
    .eq("is_active", true);
  const byLogin = new Map((codes || []).map((c) => [String(c.login_username).toLowerCase(), c.student_id]));
  const ids = [...byLogin.values()];
  const { data: rows } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id")
    .in("id", ids);
  const byId = new Map((rows || []).map((r) => [r.id, r]));
  return AAA.map((a) => {
    const id = byLogin.get(a.login);
    const row = byId.get(id);
    if (!row) throw new Error(`Missing ${a.label}`);
    return { ...a, studentId: id, fullName: row.full_name, gradeLevel: row.grade_level };
  });
}

async function buildPublicPayload(supabase, studentRow) {
  const student = {
    id: studentRow.studentId,
    full_name: studentRow.fullName,
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
  const withAccount = await attachStudentLearningAccountToParentReportPayload(supabase, student, raw);
  const withEq = attachParentContextEvidenceQuality(structuredClone(withAccount));
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

  const { createClient: createSb } = await import("@supabase/supabase-js");
  const admin = createSb(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createSb(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

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

function reportUrl(studentId, exportType) {
  const q = new URLSearchParams({
    studentId,
    source: "parent",
    period: "custom",
    start: MONTH_FROM,
    end: MONTH_TO,
  });
  if (exportType.mode) q.set("mode", exportType.mode);
  return `${BASE_URL}/learning/${exportType.route}?${q.toString()}`;
}

async function exportPdf(page, studentRow, exportType, publicPayload, outPath) {
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

  const url = reportUrl(studentRow.studentId, exportType);
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(url, { waitUntil: "load", timeout: 240_000 });
  await page.waitForTimeout(3500);

  try {
    await page.waitForSelector(exportType.printRoot, { state: "attached", timeout: 240_000 });
    await page.waitForFunction(
      ({ printRoot }) => {
        const root = document.querySelector(printRoot);
        const err = document.body?.innerText || "";
        if (/לא ניתן לבנות|שגיאת רשת|נדרשת התחברות|טוען דוח/.test(err) && !root) return false;
        return !!root && err.trim().length > 120;
      },
      { printRoot: exportType.printRoot },
      { timeout: 240_000, polling: 500 }
    );
  } catch (err) {
    const snippet = await page.evaluate(() => (document.body?.innerText || "").slice(0, 500));
    throw new Error(`Report shell timeout: ${String(err?.message || err)} | body=${snippet}`);
  }

  await page.emulateMedia({ media: "print" });
  const buf = await page.pdf({ ...pdfOpts });
  await writeFile(outPath, buf);
  return buf;
}

function parsePdfMinutes(text) {
  const totalBlock =
    text.match(/זמן\s*כולל[\s\S]{0,120}?['׳]?דק\s*(\d{2,4})/) ||
    text.match(/זמן\s*כולל[\s\S]{0,120}?(\d{2,4})\s*['׳]?דק/);
  if (totalBlock) return Number(totalBlock[1]);
  const m =
    text.match(/['׳]?דק\s*(\d{2,4})/) ||
    text.match(/דק['׳]\s*(\d{2,4})/) ||
    text.match(/(\d{2,4})\s*['׳]?דק[^\d]{0,20}שעות/);
  return m ? Number(m[1]) : null;
}

function parsePdfQuestionCount(text) {
  const m =
    text.match(/שאלות[\s\n\r]*(\d{2,4})/) ||
    text.match(/(\d{2,4})[\s\n\r]*שאלות/) ||
    text.match(/שאל[\s\S]{0,12}(\d{2,4})/);
  return m ? Number(m[1]) : null;
}

function verifyPdfContent(text, exportType) {
  const pdfMinutes = parsePdfMinutes(text);
  const pdfQuestions = parsePdfQuestionCount(text);
  const checks = [];
  checks.push({ name: "date_start_april_1", pass: text.includes("01/04/2026") });
  checks.push({ name: "date_end_april_30", pass: text.includes("30/04/2026") });
  checks.push({ name: "no_march_31_start", pass: !text.includes("31/03/2026") });
  checks.push({ name: "hebrew_parent_signal", pass: /להורה|סיכום|דוח/.test(text) });
  checks.push({
    name: "no_school_classroom_context",
    pass: !/(בית\s+ספר|מורה\s+פרטי|private\s+teacher|classroom\s+activity|פעילות\s+כיתה|school\s+context)/i.test(
      text
    ),
  });
  checks.push({
    name: "pdf_minutes_at_least_250",
    pass: pdfMinutes != null && pdfMinutes >= 250 && pdfMinutes <= 650,
  });
  checks.push({
    name: "pdf_questions_at_least_150",
    pass: pdfQuestions != null && pdfQuestions >= 150,
  });
  checks.push({
    name: "no_recent_inactivity_warning",
    pass: !text.includes("לא הייתה פעילות לאחרונה"),
  });
  if (exportType.id === "detailed-full" || exportType.id === "detailed-summary") {
    checks.push({
      name: "has_practiced_subject_section",
      pass: /מתמטיקה|חשבון|עברית|אנגלית|מדעים|מולדת/.test(text),
    });
  }
  const pass = checks.every((c) => c.pass);
  return { exportType: exportType.id, pass, pdfMinutes, pdfQuestions, checks: checks.filter((c) => !c.pass) };
}

async function createZip() {
  await new Promise((r) => setTimeout(r, 1500));
  const dirs = AAA.map((a) => a.label);
  const psDirs = dirs.map((d) => `'${d}'`).join(",");
  const cmd = `Set-Location -LiteralPath '${EXPORT_ROOT.replace(/'/g, "''")}'; if (Test-Path 'parent-report-q2e-monthly-realistic-pdfs.zip') { Remove-Item 'parent-report-q2e-monthly-realistic-pdfs.zip' -Force }; Compress-Archive -Path ${psDirs} -DestinationPath 'parent-report-q2e-monthly-realistic-pdfs.zip' -Force`;
  execSync(`powershell -NoProfile -Command "${cmd}"`, { stdio: "inherit" });
}

async function runDataVerify() {
  execSync("node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-data-verify.mjs", {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const exportOnly = process.argv.includes("--export-only");
  const skipPdf = process.argv.includes("--skip-pdf");
  const studentFilter = process.argv
    .filter((a) => a.startsWith("--student="))
    .map((a) => a.slice("--student=".length).toUpperCase());

  if (!exportOnly) {
    console.log("Step 1: run realistic seed...");
    execSync("node --env-file=.env.local scripts/qa/parent-report-q2e-monthly-realistic-seed.mjs", {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    console.log("Step 2: data verification gate...");
    await runDataVerify();
  } else {
    console.log("Step 1–2: skipped (--export-only)");
  }

  if (verifyOnly) {
    console.log("--verify-only: seed + data verify done, skipping PDF export");
    return;
  }

  if (skipPdf) return;

  let verifyData;
  try {
    verifyData = JSON.parse(await readFile(VERIFY_JSON, "utf8"));
  } catch {
    throw new Error(`Missing ${VERIFY_JSON} — run data verify first`);
  }
  if (Number(verifyData.meaningfulCount || 0) < 12) {
    throw new Error("Data verification gate failed — not exporting PDFs");
  }

  console.log("Step 3: check dev server...");
  await assertDevServerReachable();

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const key = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const students = await resolveStudents(supabase);

  await mkdir(EXPORT_ROOT, { recursive: true });

  const manifest = {
    runAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    monthWindow: { from: MONTH_FROM, to: MONTH_TO },
    seedTag: "parent-report-q2e-monthly-realistic-v1",
    parentAccount: QA_PARENT_EMAIL,
    exportTypes: EXPORT_TYPES.map((t) => t.id),
    context: "parent-only (no school/classroom/private-teacher)",
    students: [],
    exports: [],
    contentVerification: [],
    summary: { expected: 36, generated: 0, failed: 0, contentPass: 0, contentFail: 0 },
  };

  console.log("Step 4: preflight sanitization...");
  for (const row of students) {
    const pub = await buildPublicPayload(supabase, row);
    const checks = publicSanitizationChecks(pub);
    if (!checks.every((c) => c.pass)) {
      throw new Error(`Sanitization failed ${row.label}: ${JSON.stringify(checks.filter((c) => !c.pass))}`);
    }
    manifest.students.push({ label: row.label, studentId: row.studentId, sanitizationPass: true });
  }
  console.log("  Sanitization preflight PASS (12 students)");

  console.log("Step 5: Playwright PDF export (36 PDFs)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "he-IL" });
  await context.addInitScript(() => {
    window.__parentReportPlaywrightE2eSession = true;
  });
  const page = await context.newPage();
  const auth = await getParentAccessToken();
  await seedParentSession(page, auth);

  for (const row of students) {
    if (studentFilter.length && !studentFilter.includes(row.label)) continue;
    const studentDir = path.join(EXPORT_ROOT, row.label);
    await mkdir(studentDir, { recursive: true });
    console.log(`  ${row.label}...`);
    const pub = await buildPublicPayload(supabase, row);

    for (const exportType of EXPORT_TYPES) {
      const fileName = `${row.label}_2026-04_${exportType.slug}.pdf`;
      const outPath = path.join(studentDir, fileName);
      const exportRow = {
        student: row.label,
        type: exportType.id,
        fileName,
        relativePath: path.join(row.label, fileName).replace(/\\/g, "/"),
        pass: false,
      };
      try {
        const buf = await exportPdf(page, row, exportType, pub, outPath);
        const text = await extractPdfText(buf);
        const contentCheck = verifyPdfContent(text, exportType);
        exportRow.pass = true;
        exportRow.bytes = buf.length;
        exportRow.contentPass = contentCheck.pass;
        exportRow.contentFailures = contentCheck.checks;
        exportRow.textSample = text.slice(0, 400).replace(/\s+/g, " ");
        manifest.summary.generated += 1;
        if (contentCheck.pass) manifest.summary.contentPass += 1;
        else manifest.summary.contentFail += 1;
        manifest.contentVerification.push({ studentLabel: row.label, ...contentCheck });
        console.log(
          `    ${contentCheck.pass ? "PASS" : "CONTENT-FAIL"} ${exportType.id} → ${fileName} (${buf.length} bytes)`
        );
        if (!contentCheck.pass) {
          console.error(`      Failed checks: ${JSON.stringify(contentCheck.checks)}`);
        }
      } catch (err) {
        exportRow.error = String(err?.message || err);
        manifest.summary.failed += 1;
        console.error(`    FAIL ${exportType.id}: ${exportRow.error}`);
      }
      manifest.exports.push(exportRow);
    }
  }

  await browser.close();

  console.log("Step 6: create ZIP...");
  await createZip();

  const zipBytes = await readFile(ZIP_PATH);
  const zipSha256 = createHash("sha256").update(zipBytes).digest("hex").toUpperCase();
  await writeFile(`${ZIP_PATH}.sha256`, `${zipSha256}  ${path.basename(ZIP_PATH)}\n`, "utf8");
  console.log(`  ZIP SHA256: ${zipSha256}`);
  console.log("Step 7: verify PDF content from ZIP (not loose folders)...");
  execSync(`node scripts/qa/parent-report-q2e-monthly-realistic-zip-verify.mjs "${ZIP_PATH.replace(/\\/g, "/")}"`, {
    cwd: ROOT,
    stdio: "inherit",
  });

  manifest.summary.expected = students.length * EXPORT_TYPES.length;
  manifest.zip = { path: ZIP_PATH, sizeBytes: zipBytes.length, sha256: zipSha256 };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(CONTENT_VERIFY_PATH, JSON.stringify(manifest.contentVerification, null, 2), "utf8");

  console.log(`\nDone: ${manifest.summary.generated}/${manifest.summary.expected} PDFs`);
  console.log(`Content verification: ${manifest.summary.contentPass}/${manifest.summary.generated} PASS`);
  console.log(`ZIP: ${ZIP_PATH}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);

  if (manifest.summary.failed > 0 || manifest.summary.contentFail > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL", e?.message || e);
  process.exit(1);
});
