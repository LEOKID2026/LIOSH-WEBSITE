#!/usr/bin/env node
/**
 * PDF export gate — Playwright download smoke for parent-report file export (html2pdf canvas path).
 * npm run qa:learning-simulator:pdf-export
 *
 * Uses ?qa_pdf=file on /learning/parent-report to select canvas/html2pdf (see audit).
 *
 * Env (same family as render gate):
 *   PDF_GATE_BASE_URL / RENDER_GATE_BASE_URL — default http://127.0.0.1:3001
 *   PDF_GATE_AUTO_SERVER — if "0", do not spawn dev server (RENDER_GATE_AUTO_SERVER does not apply; avoids full-orchestrator env coupling)
 *   PDF_GATE_BROWSER — if "0", skip Playwright → deferred
 *   PDF_GATE_SERVER_WAIT_MS / RENDER_GATE_SERVER_WAIT_MS — max wait for auto-started dev (default 300000)
 *   Auto-started dev always binds a free TCP port (ignores stale PORT / *_BASE_URL from env) so EADDRINUSE after render or overnight is avoided.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import {
  domInsightCardShowsParentAiHeading,
  pdfTextContainsParentAiInsightFingerprint,
} from "../lib/parent-report-pdf-insight-fingerprint.mjs";
import { killProcessTree } from "../lib/overnight-utils.mjs";
import { PARENT_REPORT_PORTAL_GATE } from "../../lib/parent-report-server-truth.js";

async function extractPdfText(buf) {
  const parser = new PDFParse({ data: buf });
  try {
    const textResult = await parser.getText();
    return String(textResult?.text || "");
  } finally {
    await parser.destroy?.();
  }
}
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createServer } from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const LS_DIR = join(ROOT, "reports", "learning-simulator");
const PDF_DIR = join(LS_DIR, "pdf-export");
const AUDIT_JSON = join(LS_DIR, "pdf-export-audit.json");
const AUDIT_MD = join(LS_DIR, "pdf-export-audit.md");
const OUT_JSON = join(LS_DIR, "pdf-export-gate.json");
const OUT_MD = join(LS_DIR, "pdf-export-gate.md");

const PORT = Number(process.env.PORT || process.env.PDF_GATE_PORT || process.env.RENDER_GATE_PORT || 3001);
const BASE_URL =
  process.env.PDF_GATE_BASE_URL || process.env.RENDER_GATE_BASE_URL || `http://127.0.0.1:${PORT}`;
const AUTO_SERVER = process.env.PDF_GATE_AUTO_SERVER !== "0";
const FORCE_NO_BROWSER = process.env.PDF_GATE_BROWSER === "0";

const SERVER_BOOT_WAIT_MS = Number(
  process.env.PDF_GATE_SERVER_WAIT_MS || process.env.RENDER_GATE_SERVER_WAIT_MS || 300_000
);

/** Avoid spawn("npm") without shell on Windows (EINVAL); prefer node + npx-cli.js like render gate. */
function npxCliPath() {
  const nextToNode = join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
  if (existsSync(nextToNode)) return nextToNode;
  if (process.platform === "win32") {
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    const sys = join(pf, "nodejs", "node_modules", "npm", "bin", "npx-cli.js");
    if (existsSync(sys)) return sys;
  }
  return null;
}

function nodeExeForNpm() {
  if (process.platform === "win32") {
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    const sysNode = join(pf, "nodejs", "node.exe");
    if (existsSync(sysNode)) return sysNode;
  }
  return process.execPath;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      try {
        const addr = s.address();
        const p = typeof addr === "object" && addr ? addr.port : 0;
        s.close(() => resolve(p || 3000));
      } catch (e) {
        reject(e);
      }
    });
    s.on("error", reject);
  });
}

/** Minimum PDF size for pass (documented). */
const MIN_PDF_BYTES = 10 * 1024;

const CONSOLE_WHITELIST = [/Download the React DevTools/i, /\[@faker-js/i];

function consoleAllowed(text) {
  return CONSOLE_WHITELIST.some((re) => re.test(String(text || "")));
}

async function buildPdfExportAudit() {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  const pdfLib =
    pkg.dependencies?.["html2pdf.js"] || pkg.devDependencies?.["html2pdf.js"] || "html2pdf.js (see package.json)";

  return {
    generatedAt: new Date().toISOString(),
    pdfLibraryDetected: String(pdfLib),
    pdfExportMechanism:
      "exportReportToPDF(report, options) in utils/math-report-generator.js. Default options.method is \"print\" → window.print() (no file download). With method \"canvas\", dynamic import of html2pdf.js/dist/html2pdf.js then html2pdf().set(opt).from(el).save() (jsPDF inside html2pdf options).",
    exportIsClientSide: true,
    exportIsServerSide: false,
    hasDedicatedPdfRoute: false,
    hasExportButton: true,
    buttonSelectorsFound: [
      "pages/learning/parent-report.js — button with visible label containing ייצא ל-PDF",
      "QA file mode: query ?qa_pdf=file so click passes { method: \"canvas\" } (html2pdf path)",
    ],
    requiresAuth: true,
    requiresLocalStorage: true,
    requiresReportData: true,
    canTestDownloadWithPlaywright:
      "Yes when navigating to /learning/parent-report?qa_pdf=file&source=parent&studentId=... with mocked /api/parent/students/:id/report-data (+ /api/student/me); canvas path emits a browser download.",
    blockingIssues: [
      "Without ?qa_pdf=file, default UI uses print dialog — not capturable as Playwright download.",
    ],
    recommendedMinimalGate:
      "Playwright: open parent-report with ?qa_pdf=file&source=parent&studentId=..., mock report-data, click export, assert download + %PDF header + min size.",
    recommendedFutureImprovement:
      "Optional dedicated /api PDF route if product moves generation server-side; keep client path tested via canvas.",
    evidenceFiles: [
      "utils/math-report-generator.js (exportReportToPDF)",
      "pages/learning/parent-report.js (export button)",
      "package.json (html2pdf.js dependency)",
    ],
  };
}

async function writeAuditFiles(audit) {
  await mkdir(LS_DIR, { recursive: true });
  await writeFile(AUDIT_JSON, JSON.stringify(audit, null, 2), "utf8");
  const md = [
    "# PDF export — implementation audit",
    "",
    `- Generated at: ${audit.generatedAt}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| pdfLibraryDetected | ${audit.pdfLibraryDetected} |`,
    `| exportIsClientSide | ${audit.exportIsClientSide ? "yes" : "no"} |`,
    `| exportIsServerSide | ${audit.exportIsServerSide ? "yes" : "no"} |`,
    `| hasDedicatedPdfRoute | ${audit.hasDedicatedPdfRoute ? "yes" : "no"} |`,
    `| hasExportButton | ${audit.hasExportButton ? "yes" : "no"} |`,
    "",
    "## Mechanism",
    "",
    audit.pdfExportMechanism,
    "",
    "## Button / selectors",
    "",
    ...audit.buttonSelectorsFound.map((x) => `- ${x}`),
    "",
    "## Requires",
    "",
    `- Auth/session: ${audit.requiresAuth} (StudentAccessGate + mocked /api/student/me in gate)`,
    `- localStorage seed: ${audit.requiresLocalStorage}`,
    `- Built report object in page: ${audit.requiresReportData}`,
    "",
    "## Playwright download testability",
    "",
    audit.canTestDownloadWithPlaywright,
    "",
    "## Blocking issues",
    "",
    ...audit.blockingIssues.map((x) => `- ${x}`),
    "",
    "## Recommended gate",
    "",
    audit.recommendedMinimalGate,
    "",
    "## Future",
    "",
    audit.recommendedFutureImprovement,
    "",
    "## Evidence files",
    "",
    ...audit.evidenceFiles.map((x) => `- ${x.replace(/\\/g, "/")}`),
    "",
    "JSON: " + AUDIT_JSON.replace(/\\/g, "/"),
    "",
  ].join("\n");
  await writeFile(AUDIT_MD, md, "utf8");
}

async function waitForHttpOk(url, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const perTryMs = Math.min(4000, Math.max(500, Math.floor(timeoutMs / 4) || 1500));
      const ac = new AbortController();
      const kill = setTimeout(() => ac.abort(), perTryMs);
      const r = await fetch(url, { redirect: "follow", signal: ac.signal });
      clearTimeout(kill);
      if (r.ok || r.status === 404) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function looksLikeNextDevApp(baseUrl) {
  try {
    const root = String(baseUrl || "").replace(/\/$/, "");
    const r = await fetch(`${root}/learning`, { redirect: "follow" });
    if (!r.ok) return false;
    const html = await r.text();
    return html.includes("__NEXT_DATA__") || /\/_next\/static\//.test(html);
  } catch {
    return false;
  }
}

function startDevServer(listenPort) {
  const p = listenPort ?? PORT;
  const env = { ...process.env, PORT: String(p) };
  const cli = npxCliPath();
  if (cli) {
    return spawn(nodeExeForNpm(), [cli, "next", "dev", "-p", String(p)], {
      cwd: ROOT,
      shell: false,
      stdio: "pipe",
      env,
      windowsHide: true,
    });
  }
  return spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
    cwd: ROOT,
    shell: process.platform === "win32",
    stdio: "pipe",
    env,
    windowsHide: true,
  });
}

/** Same official parent-report id already used by this gate's `mockStudentMe`. */
const PDF_GATE_MOCK_PARENT_STUDENT_ID = "00000000-0000-0000-0000-0000000000e3";

async function mockStudentMe(page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-0000000000e3",
          full_name: "PdfGateQA",
          grade_level: 3,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
}

/**
 * The product now blocks the legacy localStorage-built report entirely (see
 * `lib/parent-report-server-truth.js` → `PARENT_REPORT_PORTAL_GATE`: "דוח הורים רשמי זמין רק דרך
 * פורטל ההורה ... אין לבנות דוח מנתוני הדפדפן המקומיים"). The official route requires
 * `?source=parent&studentId=...` and fetches from `/api/parent/students/:id/report-data`.
 * This mirrors the same officially-supported QA bypass already used by
 * `tests/e2e/parent-report-real-ui-load.spec.ts` and `run-render-release-gate.mjs`'s
 * `parent_remote_mock` scenario (both already green) — `window.__parentReportPlaywrightE2eSession`
 * is a server-gated, non-production-only flag (see `lib/parent-client/copilot-turn-api.js`).
 */
function pdfGateMockParentReportDataBody() {
  const now = new Date();
  const fromDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);
  return {
    ok: true,
    student: {
      id: PDF_GATE_MOCK_PARENT_STUDENT_ID,
      full_name: "PdfGate Parent Child",
      grade_level: "g3",
      is_active: true,
    },
    range: { from: fromDate, to: toDate },
    summary: {
      totalSessions: 12,
      completedSessions: 12,
      answers: 128,
      correct: 97,
      wrong: 31,
      totalDurationSeconds: 5400,
      registeredGradeLevel: "g3",
    },
    subjects: {
      math: {
        total: 64,
        correct: 50,
        wrong: 14,
        durationSeconds: 2700,
        topics: {
          word_problems: {
            total: 36,
            correct: 27,
            wrong: 9,
            durationSeconds: 1500,
            byContentGrade: {
              g3: {
                total: 36,
                correct: 27,
                wrong: 9,
                durationSeconds: 1500,
                contentGradeLevel: "g3",
                registeredGradeLevel: "g3",
                gradeRelation: "on_grade",
              },
            },
          },
          fractions: {
            total: 28,
            correct: 23,
            wrong: 5,
            durationSeconds: 1200,
            byContentGrade: {
              g3: {
                total: 28,
                correct: 23,
                wrong: 5,
                durationSeconds: 1200,
                contentGradeLevel: "g3",
                registeredGradeLevel: "g3",
                gradeRelation: "on_grade",
              },
            },
          },
        },
      },
      science: {
        total: 64,
        correct: 47,
        wrong: 17,
        durationSeconds: 2700,
        topics: {
          cause_effect: {
            total: 40,
            correct: 29,
            wrong: 11,
            durationSeconds: 1700,
            byContentGrade: {
              g3: {
                total: 40,
                correct: 29,
                wrong: 11,
                durationSeconds: 1700,
                contentGradeLevel: "g3",
                registeredGradeLevel: "g3",
                gradeRelation: "on_grade",
              },
            },
          },
          ecosystems: {
            total: 24,
            correct: 18,
            wrong: 6,
            durationSeconds: 1000,
            byContentGrade: {
              g3: {
                total: 24,
                correct: 18,
                wrong: 6,
                durationSeconds: 1000,
                contentGradeLevel: "g3",
                registeredGradeLevel: "g3",
                gradeRelation: "on_grade",
              },
            },
          },
        },
      },
      geometry: {},
      english: {},
      hebrew: {},
      history: {},
      moledet_geography: {},
    },
    dailyActivity: [],
    recentMistakes: [],
    diagnosticMistakes: [],
    meta: { evidenceQuality: { status: "qa_pdf_export_gate_mock" } },
  };
}

async function setupParentReportRemoteMocks(page) {
  const body = JSON.stringify(pdfGateMockParentReportDataBody());
  await page.addInitScript(() => {
    window.__parentReportPlaywrightE2eSession = true;
  });
  await page.route("**/api/parent/students/*/report-data**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body });
  });
  await page.route("**/api/teacher/students/*/parent-report-data**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body });
  });
  await page.route("**/api/parent/copilot-turn", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, answer: "pdf-gate-mock", followups: [], contextRefs: [] }),
    });
  });
  await page.route("**/api/analytics/events", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
}

function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

async function readPkgPlaywright() {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  return !!(pkg.devDependencies?.["@playwright/test"] || pkg.devDependencies?.playwright);
}

async function main() {
  await mkdir(PDF_DIR, { recursive: true });

  const audit = await buildPdfExportAudit();
  await writeAuditFiles(audit);

  const runId = `pdf-gate-${Date.now().toString(36)}`;
  const generatedAt = new Date().toISOString();

  const basePayload = {
    runId,
    generatedAt,
    browserMode: false,
    checkedRoute: "/learning/parent-report?qa_pdf=file&source=parent&studentId=<mock>&period=month",
    pdfLibraryDetected: audit.pdfLibraryDetected,
    exportMechanism: "client html2pdf canvas when qa_pdf=file",
    downloadAttempted: false,
    downloadSucceeded: false,
    downloadPath: null,
    fileSizeBytes: null,
    pdfHeaderOk: null,
    consoleErrorsTotal: null,
    fatalErrorsTotal: null,
    deferredReason: null,
    failures: [],
    warnings: [],
    minPdfBytesThreshold: MIN_PDF_BYTES,
  };

  const hasPw = await readPkgPlaywright();
  if (FORCE_NO_BROWSER || !hasPw) {
    const deferPayload = {
      ...basePayload,
      status: "deferred",
      deferredReason: "Playwright not available or PDF_GATE_BROWSER=0 — cannot run browser PDF gate.",
    };
    await writeFile(OUT_JSON, JSON.stringify(deferPayload, null, 2), "utf8");
    await writeFile(
      OUT_MD,
      "# PDF export gate\n\n**Status: deferred** — browser runner unavailable.\n",
      "utf8"
    );
    console.log(JSON.stringify({ ok: true, status: "deferred", browserMode: false, outJson: OUT_JSON }, null, 2));
    process.exit(0);
    return;
  }

  let serverProc = null;
  let serverStarted = false;
  /** @type {string} */
  let activeBaseUrl = BASE_URL;
  const trustExistingListener =
    process.env.RENDER_GATE_TRUST_EXISTING_SERVER === "1" || process.env.PDF_GATE_TRUST_EXISTING_SERVER === "1";
  let serverAlreadyUp = false;
  if (trustExistingListener) {
    serverAlreadyUp = await waitForHttpOk(activeBaseUrl, 2500);
    if (serverAlreadyUp && !(await looksLikeNextDevApp(activeBaseUrl))) {
      serverAlreadyUp = false;
    }
  }
  if (!serverAlreadyUp && AUTO_SERVER) {
    const bootPort = await findFreePort();
    activeBaseUrl = `http://127.0.0.1:${bootPort}`;
    serverProc = startDevServer(bootPort);
    serverStarted = true;
    let bootLog = "";
    serverProc.stdout?.on("data", (c) => {
      bootLog += c.toString();
      if (bootLog.length > 120_000) bootLog = bootLog.slice(-120_000);
    });
    serverProc.stderr?.on("data", (c) => {
      bootLog += c.toString();
      if (bootLog.length > 120_000) bootLog = bootLog.slice(-120_000);
    });
    const up = await waitForHttpOk(activeBaseUrl, SERVER_BOOT_WAIT_MS);
    if (!up) {
      basePayload.status = "fail";
      basePayload.failures.push(`Dev server did not respond at ${activeBaseUrl} within ${SERVER_BOOT_WAIT_MS}ms`);
      await writeFile(OUT_JSON, JSON.stringify(basePayload, null, 2), "utf8");
      if (bootLog) console.error("[pdf-export-gate] dev boot log (tail):\n", bootLog.slice(-4000));
      /** `next dev` forks a separate `start-server.js` child; a plain `.kill()` on the wrapper
       * leaves that grandchild (and its port) running — kill the whole process tree instead. */
      if (serverProc) killProcessTree(serverProc.pid);
      console.error("PDF export gate: server failed to start");
      process.exit(1);
      return;
    }
  } else if (!serverAlreadyUp && !AUTO_SERVER) {
    basePayload.status = "fail";
    basePayload.failures.push(`No server at ${activeBaseUrl} and PDF_GATE_AUTO_SERVER=0`);
    await writeFile(OUT_JSON, JSON.stringify(basePayload, null, 2), "utf8");
    process.exit(1);
    return;
  }

  const playwright = await import("playwright");
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "he-IL",
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const fatal = [];
  const consoleBad = [];
  const debugPdfGate = process.env.PDF_GATE_DEBUG === "1";
  page.on("pageerror", (e) => fatal.push(String(e?.message || e)));
  page.on("console", (msg) => {
    const t = msg.text();
    if (debugPdfGate) console.error(`[pdf-gate:debug] console.${msg.type()}: ${t}`);
    if (msg.type() === "error" && !consoleAllowed(t)) consoleBad.push(t);
  });
  if (debugPdfGate) {
    page.on("response", (res) => {
      if (res.status() >= 400) console.error(`[pdf-gate:debug] response ${res.status()}: ${res.request().method()} ${res.url()}`);
    });
    page.on("requestfailed", (req) => {
      console.error(`[pdf-gate:debug] requestfailed: ${req.method()} ${req.url()} (${req.failure()?.errorText})`);
    });
  }

  /** @type {string[]} */
  const failures = [];
  let downloadAttempted = false;
  let downloadSucceeded = false;
  let downloadPath = null;
  let fileSizeBytes = null;
  let pdfHeaderOk = null;

  try {
    await mockStudentMe(page);
    await setupParentReportRemoteMocks(page);

    /**
     * Month window keeps mock report data in-range across calendar edges (Phase C.1).
     * `source=parent&studentId=...` is required — the product blocks the legacy localStorage-built
     * report entirely (see `pdfGateMockParentReportDataBody` doc comment above).
     */
    const url = `${activeBaseUrl}/learning/parent-report?qa_pdf=file&source=parent&studentId=${PDF_GATE_MOCK_PARENT_STUDENT_ID}&period=month`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await new Promise((r) => setTimeout(r, 2000));

    if (debugPdfGate) {
      const bodyPreview = (await page.locator("body").innerText()).slice(0, 800);
      console.error(`[pdf-gate:debug] body text (first 800 chars) before waitForSelector:\n${bodyPreview}`);
    }

    /**
     * The Parent AI insight (`ParentReportInsight` / "סיכום חכם להורה") is part of the official
     * report and MUST render on-screen — product decision (launch call, 2026-07-01, superseding the
     * earlier 2026-07-01 no-pdf call): "סיכום חכם להורה" is part of the official report and must be
     * present in the exported/printed PDF too. Only the live Copilot chat / buttons / overlays /
     * interactive controls stay `no-pdf`. The PDF-presence check happens further below, on the
     * Playwright print-PDF text proof (`pdfTextContainsParentAiInsightFingerprint`).
     */
    try {
      await page.waitForSelector(".parent-report-parent-ai-insight", { timeout: 90_000 });
      const insightCardText = await page.locator(".parent-report-parent-ai-insight").innerText();
      if (!domInsightCardShowsParentAiHeading(insightCardText)) {
        failures.push("Parent AI insight card rendered on-screen but missing expected heading text.");
      }
      if (debugPdfGate) {
        await writeFile(
          join(PDF_DIR, "debug-insight-card-dom-text.txt"),
          `domInsightCardShowsParentAiHeading = ${domInsightCardShowsParentAiHeading(insightCardText)}\n\n---\n\n${insightCardText}`,
          "utf8",
        );
      }
    } catch (e) {
      if (debugPdfGate) {
        const bodyPreview = (await page.locator("body").innerText()).slice(0, 2000);
        console.error(`[pdf-gate:debug] AI insight waitForSelector failed. body text (first 2000 chars):\n${bodyPreview}`);
      }
      throw e;
    }

    const bodyLen = (await page.locator("body").innerText()).length;
    if (bodyLen < 150) failures.push("Report body text too short — report may not have hydrated.");

    /**
     * Text proof via Playwright print PDF — html2pdf canvas downloads are often image-only, so pdf-parse
     * cannot recover Hebrew from the file bytes. Same DOM state as export; `.no-pdf` respected in print.
     *
     * Validates the *official remote report* actually printed (not the `PARENT_REPORT_PORTAL_GATE`
     * blocking screen, not an empty/error shell) AND that the Parent AI insight ("סיכום חכם להורה")
     * is present in the printed PDF text — product decision (launch call, 2026-07-01): the insight is
     * part of the official report and must appear in the PDF, unlike the live Copilot chat/buttons.
     */
    await page.emulateMedia({ media: "print" });
    try {
      const proofBuf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
        preferCSSPageSize: true,
      });
      const proofTxt = (await extractPdfText(Buffer.from(proofBuf))).replace(/\s+/g, " ");
      if (debugPdfGate) {
        await writeFile(join(PDF_DIR, "debug-proof-pdf-text.txt"), proofTxt, "utf8");
      }

      if (proofTxt.includes(PARENT_REPORT_PORTAL_GATE.messageHe)) {
        failures.push("PDF shows the PARENT_REPORT_PORTAL_GATE blocking screen, not the official report.");
      }
      if (!pdfTextContainsParentAiInsightFingerprint(proofTxt)) {
        failures.push(
          "PDF missing Parent AI insight (\"סיכום חכם להורה\") — this is part of the official report and must print (product decision 2026-07-01)."
        );
      }
      const mockChildName = pdfGateMockParentReportDataBody().student.full_name;
      if (!proofTxt.includes(mockChildName)) {
        failures.push(`PDF missing real report content marker (expected mock student name "${mockChildName}").`);
      }
      if (!proofTxt.includes("התקדמות במתמטיקה") && !proofTxt.includes("דוח להורים")) {
        failures.push("PDF missing expected report structure/heading (subject progress or report title).");
      }
      if (/\bundefined\b/.test(proofTxt)) {
        failures.push("PDF contains literal 'undefined' — likely unhandled missing data.");
      }
      if (/\bNaN\b/.test(proofTxt)) {
        failures.push("PDF contains literal 'NaN' — likely a bad numeric computation.");
      }
      if (proofTxt.includes(PDF_GATE_MOCK_PARENT_STUDENT_ID)) {
        failures.push("PDF leaks the raw student UUID into visible report text.");
      }
      if (proofTxt.includes("שאלה על הדוח")) {
        failures.push("Parent Copilot placeholder leaked into Playwright print PDF.");
      }
    } catch (e) {
      failures.push(`print-PDF text proof failed: ${String(e?.message || e)}`);
    }
    await page.emulateMedia({ media: "screen" });

    const exportBtn = page.getByRole("button", { name: /ייצא ל-PDF/ });
    const count = await exportBtn.count();
    if (count === 0) failures.push("Export button not found (accessible name /ייצא ל-PDF/).");

    if (!failures.length) {
      downloadAttempted = true;
      const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
      await exportBtn.first().click();
      const download = await downloadPromise;
      const suggested = download.suggestedFilename() || `parent-report-${runId}.pdf`;
      const safeName = suggested.replace(/[^a-zA-Z0-9._\-א-ת]/g, "_") || `parent-report-${runId}.pdf`;
      downloadPath = join(PDF_DIR, safeName);
      await download.saveAs(downloadPath);
      downloadSucceeded = true;

      const buf = await readFile(downloadPath);
      fileSizeBytes = buf.length;
      pdfHeaderOk = buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";

      if (fileSizeBytes < MIN_PDF_BYTES) failures.push(`PDF smaller than minimum (${fileSizeBytes} < ${MIN_PDF_BYTES} bytes).`);
      if (!pdfHeaderOk) failures.push("File does not start with %PDF header.");

      /** Optional: canvas PDFs are often image-heavy — Copilot leak check only when text extracts. */
      try {
        const txt = await extractPdfText(buf);
        if (txt.includes("שאלה על הדוח")) {
          failures.push("Phase C.1: Parent Copilot placeholder text leaked into html2pdf export.");
        }
      } catch (e) {
        failures.push(`Phase C.1: pdf-parse on download failed: ${String(e?.message || e)}`);
      }
    }
  } catch (e) {
    failures.push(String(e?.message || e));
  }

  if (fatal.length) failures.push(...fatal.map((x) => `pageerror: ${x}`));
  if (consoleBad.length) failures.push(...consoleBad.map((x) => `console: ${x}`));

  await browser.close();

  if (serverStarted && serverProc) {
    /** Same tree-kill rationale as the boot-failure path above — otherwise `start-server.js`
     * survives as an orphan that piles up across repeated runs and starves later steps. */
    killProcessTree(serverProc.pid);
  }

  const blocking =
    failures.length > 0 ||
    (downloadAttempted && !downloadSucceeded) ||
    (downloadSucceeded && (!pdfHeaderOk || fileSizeBytes < MIN_PDF_BYTES));

  const status = blocking ? "fail" : "pass";

  const payload = {
    ...basePayload,
    browserMode: true,
    baseURL: activeBaseUrl,
    downloadAttempted,
    downloadSucceeded,
    downloadPath: downloadPath ? downloadPath.replace(/\\/g, "/") : null,
    fileSizeBytes,
    pdfHeaderOk,
    consoleErrorsTotal: consoleBad.length,
    fatalErrorsTotal: fatal.length,
    failures,
    status,
    deferredReason: basePayload.deferredReason ?? null,
  };

  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");

  const md = [
    "# PDF export gate",
    "",
    "- runId: " + runId,
    "- status: " + mdEscape(status),
    "- browserMode: true",
    "- checkedRoute: " + mdEscape(payload.checkedRoute),
    "",
    "## Result",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| downloadAttempted | ${downloadAttempted} |`,
    `| downloadSucceeded | ${downloadSucceeded} |`,
    `| fileSizeBytes | ${fileSizeBytes ?? "—"} |`,
    `| pdfHeaderOk | ${pdfHeaderOk ?? "—"} |`,
    `| consoleErrorsTotal | ${consoleBad.length} |`,
    `| fatalErrorsTotal | ${fatal.length} |`,
    "",
    payload.downloadPath ? "Saved file: " + mdEscape(payload.downloadPath) : "",
    "",
    "## Failures",
    "",
    ...(failures.length ? failures.map((f) => `- ${mdEscape(f)}`) : ["- (none)"]),
    "",
    "Full JSON: " + OUT_JSON.replace(/\\/g, "/"),
    "",
  ].join("\n");

  await writeFile(OUT_MD, md, "utf8");

  const exitCode = status === "fail" ? 1 : 0;
  console.log(JSON.stringify({ ok: exitCode === 0, status, browserMode: true, outJson: OUT_JSON }, null, 2));
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
