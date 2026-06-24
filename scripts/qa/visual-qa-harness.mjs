#!/usr/bin/env node
/**
 * Visual QA Harness — one subject, all grades G1–G6, ENV-driven.
 *
 * Usage:
 *   npx next dev -p 3002 -H 127.0.0.1
 *   $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3002"
 *   $env:VISUAL_QA_SUBJECT="geometry"
 *   $env:VISUAL_QA_SAMPLES_PER_GRADE="30"
 *   node scripts/qa/visual-qa-harness.mjs
 *
 * Env:
 *   PLAYWRIGHT_BASE_URL / VISUAL_QA_BASE_URL
 *   VISUAL_QA_SUBJECT          math | geometry | hebrew | english (phase 1)
 *   VISUAL_QA_SAMPLES_PER_GRADE  default 2
 *   VISUAL_QA_USE_SECOND_STUDENT 1 → AAA2,4,6,8,10,12 instead of AAA1,3,5,7,9,11
 *   VISUAL_QA_MODE               sample (default) | full-flow (future)
 *   VISUAL_QA_ALLOW_MUTATIONS    1 → allow answer submit (future full-flow)
 *   VISUAL_QA_OUTPUT_DIR         optional report dir (default reports/visual-qa/<subject>/)
 *   VISUAL_QA_SAMPLE_SEED        optional seed string → topic rotation offset per run
 *   VISUAL_QA_GRADE_FILTER       optional 1–6 — run only this grade (one AAA student)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { resolveBaseUrl, resolveStudentAuthMode, getRepoRoot } from "../virtual-student-qa/lib/config.mjs";
import { authenticateStudent } from "../virtual-student-qa/lib/student-auth.mjs";
import {
  GRADE_HE,
  parseHarnessEnv,
  parseGradeFilter,
  resolveSubject,
  sampleSeedTopicOffset,
  studentForGrade,
  topicsForGrade,
} from "./lib/visual-qa-config.mjs";
import { sampleHasIssues, mergeIssues, analyzeVisibleText } from "./lib/visual-qa-analyze.mjs";
import {
  captureQuestionSample,
  dismissBlockingUi,
  navigateToPlayerShell,
  readDisplayedGrade,
  selectPracticeMode,
  startQuestionSurface,
  stopActiveGameIfAny,
  selectTopicIfAvailable,
} from "./lib/visual-qa-surface.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = getRepoRoot();

function log(msg) {
  process.stderr.write(`${msg}\n`);
}

function blockedReport(partial) {
  return { status: "BLOCKED", generatedAt: new Date().toISOString(), ...partial };
}

async function probeServerOnce(baseUrl, timeoutMs = 15_000) {
  const url = `${baseUrl.replace(/\/$/, "")}/student/login`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, status: res.status, url };
  } catch (error) {
    return { ok: false, status: 0, url, error: error?.message || String(error) };
  }
}

async function probeServer(baseUrl) {
  const retries = Math.max(1, Number(process.env.VISUAL_QA_SERVER_PROBE_RETRIES || 5) || 5);
  const delayMs = Math.max(500, Number(process.env.VISUAL_QA_SERVER_PROBE_DELAY_MS || 2000) || 2000);
  let last = null;
  for (let i = 0; i < retries; i += 1) {
    last = await probeServerOnce(baseUrl);
    if (last.ok) return last;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

function supabaseHintForRoute(route) {
  if (route.includes("/student/login")) {
    return "Student login needs LEARNING_SUPABASE_* + valid access_codes rows for AAA1–AAA12.";
  }
  return "Check LEARNING_SUPABASE_* / NEXT_PUBLIC_LEARNING_SUPABASE_* in .env.local.";
}

function sampleErrorEntry(meta, errorMessage) {
  return {
    ...meta,
    questionText: "",
    answersDisplayed: [],
    inputType: "unknown",
    hasDiagram: false,
    diagramType: null,
    audioRequired: meta.gradeNumber <= 2 && (meta.subject === "hebrew" || meta.subject === "english"),
    audioButtonVisible: false,
    hasStepButton: false,
    hasFullExplanationButton: false,
    screenshotPath: null,
    captureError: errorMessage,
    issues: mergeIssues(analyzeVisibleText("", { inputType: "unknown", answersDisplayed: [] }), {
      details: [`sample capture failed: ${errorMessage}`],
    }),
  };
}

async function verifyGradeOrBlock(page, plan, expectedGrade, student, baseUrl, subject) {
  const displayed = await readDisplayedGrade(page, plan);
  if (displayed === expectedGrade) {
    return { ok: true, displayedGrade: displayed };
  }
  return {
    ok: false,
    blocked: blockedReport({
      baseUrl,
      subject,
      blocked: {
        route: page.url(),
        account: `${student.label} (${student.username})`,
        expectedGrade: expectedGrade,
        expectedGradeDisplay: GRADE_HE[expectedGrade],
        displayedGrade: displayed,
        missingEnv: [],
        supabaseHint: supabaseHintForRoute(page.url()),
        whatYouNeed:
          `Account ${student.label} must be grade ${expectedGrade} in Supabase. ` +
          `Screen shows ${displayed ?? "unknown"}. Fix access_codes / student profile.`,
      },
    }),
  };
}

async function loginStudent(context, account, baseUrl) {
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);
  await authenticateStudent({
    context,
    page,
    account,
    baseUrl,
    mode: resolveStudentAuthMode(),
    log,
  });
  return page;
}

function resolveHarnessOutputDir(subject, outputDirEnv) {
  const raw = String(outputDirEnv || "").trim();
  if (!raw) return join(REPO_ROOT, "reports", "visual-qa", subject);
  if (raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw)) return raw;
  return join(REPO_ROOT, raw);
}

async function sampleGrade({
  context,
  baseUrl,
  subject,
  plan,
  gradeNumber,
  student,
  samplesPerGrade,
  mode,
  screenshotDir,
  allowMutations,
  topicOffset = 0,
}) {
  const gradeKey = `g${gradeNumber}`;
  const topics = topicsForGrade(plan, gradeNumber);
  const gradeSamples = [];
  let gradeBlocked = null;
  let authOk = false;

  const page = await loginStudent(context, student, baseUrl);
  authOk = true;

  try {
    await navigateToPlayerShell(page, plan, baseUrl, { log });

    const gradeCheck = await verifyGradeOrBlock(page, plan, gradeNumber, student, baseUrl, subject);
    if (!gradeCheck.ok) {
      gradeBlocked = gradeCheck.blocked;
      await page.close();
      return { gradeBlocked, gradeSamples, authOk, studentLabel: student.label };
    }

    for (let i = 0; i < samplesPerGrade; i += 1) {
      const topic = topics[(i + topicOffset) % topics.length];
      const meta = {
        subject,
        grade: gradeKey,
        gradeDisplay: GRADE_HE[gradeNumber],
        gradeNumber,
        studentLabel: student.label,
        topic: topic.value,
        topicDisplay: topic.label,
        url: `${baseUrl}${plan.path}`,
        mode,
      };
      const shotFile = join(screenshotDir, `${subject}-g${gradeNumber}-s${i + 1}.png`);
      const shotRel = relative(REPO_ROOT, shotFile);

      try {
        await stopActiveGameIfAny(page);
        await navigateToPlayerShell(page, plan, baseUrl, { log });

        const recheck = await readDisplayedGrade(page, plan);
        if (recheck !== gradeNumber) {
          throw new Error(`grade drift: expected ${gradeNumber}, screen ${recheck}`);
        }

        const pickedTopic = await selectTopicIfAvailable(page, plan.topicSelectTestId, topic, log);
        meta.topic = pickedTopic.value;
        meta.topicDisplay = pickedTopic.label;
        meta.topicRequested = topic.value;

        const tabMode = await selectPracticeMode(page, `${subject}-master`, plan.startTestId, log);
        meta.practiceTab = tabMode;

        const sessionInfo = await startQuestionSurface(page, plan.startTestId, subject, { log });
        meta.sessionStarted = sessionInfo.sessionStarted;

        if (allowMutations) {
          meta.mutationNote = "answer submit allowed (VISUAL_QA_ALLOW_MUTATIONS=1)";
        }

        const sample = await captureQuestionSample(page, meta, { screenshotPath: shotFile });
        sample.screenshotPath = sample.screenshotPath ? shotRel : null;
        gradeSamples.push(sample);
      } catch (error) {
        const errSample = sampleErrorEntry(meta, error.message);
        errSample.screenshotPath = null;
        gradeSamples.push(errSample);
      }
    }
  } finally {
    await page.close().catch(() => {});
  }

  return { gradeBlocked, gradeSamples, authOk, studentLabel: student.label };
}

function finalizeStatus(report) {
  if (report.status === "BLOCKED") return report;

  const sampleIssues = (report.samples || []).filter((s) => sampleHasIssues(s.issues));
  if (sampleIssues.length || report.gradeMismatches?.length) {
    report.status = "ISSUES_FOUND";
    report.issueSummary = {
      samplesWithIssues: sampleIssues.length,
      totalSamples: report.samples?.length || 0,
      gradesChecked: report.grades?.length || 0,
      flaggedSamples: sampleIssues.map((s) => ({
        grade: s.grade,
        studentLabel: s.studentLabel,
        topic: s.topic,
        details: s.issues?.details || [],
      })),
    };
    return report;
  }

  report.status = "VISUAL_QA_PASS";
  report.issueSummary = {
    totalSamples: report.samples?.length || 0,
    samplesWithIssues: 0,
    gradesChecked: report.grades?.length || 0,
  };
  return report;
}

function renderTextReport(report) {
  const lines = [
    "Visual QA Harness",
    `Status: ${report.status}`,
    `Subject: ${report.subject}`,
    `Mode: ${report.mode}`,
    `Base URL: ${report.baseUrl}`,
    `Generated: ${report.generatedAt}`,
    "",
  ];

  if (report.status === "BLOCKED") {
    const b = report.blocked || {};
    lines.push(`BLOCKED at route: ${b.route}`);
    lines.push(`Account: ${b.account}`);
    if (b.expectedGrade) {
      lines.push(`Expected grade: ${b.expectedGradeDisplay || b.expectedGrade}`);
      lines.push(`Displayed grade: ${b.displayedGrade}`);
    }
    lines.push(`Missing env: ${(b.missingEnv || []).join("; ") || "none"}`);
    lines.push(`Supabase: ${b.supabaseHint || ""}`);
    lines.push(`Need: ${b.whatYouNeed || ""}`);
    if (b.detail) lines.push(`Detail: ${b.detail}`);
    return lines.join("\n");
  }

  lines.push(`Samples per grade: ${report.samplesPerGrade}`);
  lines.push(`Students: ${(report.grades || []).map((g) => `${g.grade}→${g.studentLabel}`).join(", ")}`);
  lines.push(`Total samples: ${report.samples?.length || 0}`);
  lines.push(`Mutations: session/start on AAA accounts (documented); answer submit=${report.allowMutations ? "yes" : "no"}`);
  lines.push("");

  for (const s of report.samples || []) {
    lines.push(`--- ${s.grade} ${s.studentLabel} ${s.topicDisplay} ---`);
    lines.push(`URL: ${s.url}`);
    lines.push(`Q: ${(s.questionText || "").slice(0, 240)}`);
    lines.push(`Input: ${s.inputType} | answers: ${JSON.stringify(s.answersDisplayed)}`);
    lines.push(`Diagram: ${s.hasDiagram}${s.diagramType ? ` (${s.diagramType})` : ""}`);
    lines.push(`Audio: required=${s.audioRequired} visible=${s.audioButtonVisible}`);
    if (s.screenshotPath) lines.push(`Screenshot: ${s.screenshotPath}`);
    if (s.issues?.details?.length) lines.push(`ISSUES: ${s.issues.details.join("; ")}`);
  }

  return lines.join("\n");
}

async function writeOutputs(report, subject, outputDirOverride) {
  const outDir = resolveHarnessOutputDir(subject, outputDirOverride);
  const shotDir = join(outDir, "screenshots");
  await mkdir(shotDir, { recursive: true });
  const jsonPath = join(outDir, "visual-qa-report.json");
  const txtPath = join(outDir, "visual-qa-report.txt");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(txtPath, `${renderTextReport(report)}\n`, "utf8");
  log(`Wrote ${jsonPath}`);
  return { jsonPath, txtPath, outDir };
}

async function main() {
  const baseUrl = resolveBaseUrl(process.env.PLAYWRIGHT_BASE_URL || process.env.VISUAL_QA_BASE_URL);
  const env = parseHarnessEnv();
  const gradeFilterCheck = parseGradeFilter(process.env.VISUAL_QA_GRADE_FILTER);
  if (!gradeFilterCheck.ok) {
    const out = blockedReport({
      baseUrl,
      subject: env.subject || null,
      blocked: {
        route: "(env)",
        account: "(none)",
        missingEnv: ["VISUAL_QA_GRADE_FILTER"],
        supabaseHint: "",
        whatYouNeed: gradeFilterCheck.error,
      },
    });
    await writeOutputs(out, env.subject || "unknown", env.outputDir);
    console.log(JSON.stringify(out, null, 2));
    process.exit(2);
  }
  env.gradeFilter = gradeFilterCheck.grade;

  const subjectResult = resolveSubject(env.subject);

  if (!subjectResult.ok) {
    const out = blockedReport({
      baseUrl,
      subject: env.subject || null,
      blocked: {
        route: "(env)",
        account: "(none)",
        missingEnv: ["VISUAL_QA_SUBJECT"],
        supabaseHint: "",
        whatYouNeed: subjectResult.error,
      },
    });
    await writeOutputs(out, env.subject || "unknown", env.outputDir);
    console.log(JSON.stringify(out, null, 2));
    process.exit(2);
  }

  const { subject, plan } = subjectResult;

  if (env.mode === "full-flow") {
    const out = blockedReport({
      baseUrl,
      subject,
      blocked: {
        route: "(mode)",
        account: "(none)",
        missingEnv: [],
        supabaseHint: "",
        whatYouNeed: "VISUAL_QA_MODE=full-flow is not implemented yet. Use VISUAL_QA_MODE=sample.",
      },
    });
    await writeOutputs(out, subject, env.outputDir);
    console.log(JSON.stringify(out, null, 2));
    process.exit(2);
  }

  const server = await probeServer(baseUrl);
  if (!server.ok) {
    const out = blockedReport({
      baseUrl,
      subject,
      blocked: {
        route: server.url,
        account: "(server probe)",
        missingEnv: [`dev server not responding at ${baseUrl}`],
        supabaseHint: `Start: npx next dev -p ${new URL(baseUrl).port || "3100"} -H 127.0.0.1`,
        whatYouNeed: "Run Next dev and re-run harness.",
      },
    });
    await writeOutputs(out, subject, env.outputDir);
    console.log(JSON.stringify(out, null, 2));
    process.exit(2);
  }

  const report = {
    status: "ISSUES_FOUND",
    generatedAt: new Date().toISOString(),
    baseUrl,
    subject,
    mode: env.mode,
    samplesPerGrade: env.samplesPerGrade,
    useSecondStudent: env.useSecondStudent,
    allowMutations: env.allowMutations,
    sampleSeed: env.sampleSeed || null,
    gradeFilter: env.gradeFilter ?? null,
    outputDir: env.outputDir || null,
    dataMutations: {
      sessionStartOnAaaAccounts: true,
      answerSubmit: env.allowMutations,
      parentActivity: false,
      note: "Sample mode starts practice sessions on AAA test students only; no parent/admin/DB writes.",
    },
    grades: [],
    samples: [],
  };

  const browser = await chromium.launch({ headless: true });
  const harnessOutDir = resolveHarnessOutputDir(subject, env.outputDir);
  const screenshotDir = join(harnessOutDir, "screenshots");
  await mkdir(screenshotDir, { recursive: true });

  try {
    const gradeNumbers = env.gradeFilter != null ? [env.gradeFilter] : [1, 2, 3, 4, 5, 6];
    for (const gradeNumber of gradeNumbers) {
      const student = studentForGrade(gradeNumber, env.useSecondStudent);
      if (!student) {
        const out = blockedReport({
          baseUrl,
          subject,
          blocked: {
            route: "(config)",
            account: `(grade ${gradeNumber})`,
            missingEnv: [],
            whatYouNeed: `No student mapping for grade ${gradeNumber}`,
          },
        });
        await browser.close();
        await writeOutputs(out, subject, env.outputDir);
        console.log(JSON.stringify(out, null, 2));
        process.exit(2);
      }

      log(`Grade ${gradeNumber}: login ${student.label}…`);
      const context = await browser.newContext({ baseURL: baseUrl, locale: "he-IL" });
      const topics = topicsForGrade(plan, gradeNumber);
      const topicOffset = env.sampleSeed ? sampleSeedTopicOffset(env.sampleSeed, topics.length) : 0;

      const result = await sampleGrade({
        context,
        baseUrl,
        subject,
        plan,
        gradeNumber,
        student,
        samplesPerGrade: env.samplesPerGrade,
        mode: env.mode,
        screenshotDir,
        allowMutations: env.allowMutations,
        topicOffset,
      });

      await context.close();

      if (result.gradeBlocked) {
        await browser.close();
        const out = { ...result.gradeBlocked, subject, mode: env.mode, baseUrl };
        await writeOutputs(out, subject, env.outputDir);
        console.log(JSON.stringify(out, null, 2));
        process.exit(2);
      }

      report.grades.push({
        grade: gradeNumber,
        gradeDisplay: GRADE_HE[gradeNumber],
        studentLabel: result.studentLabel,
        authOk: result.authOk,
        samples: result.gradeSamples.length,
      });
      report.samples.push(...result.gradeSamples);
    }
  } catch (error) {
    await browser.close();
    const out = blockedReport({
      baseUrl,
      subject,
      blocked: {
        route: "(harness)",
        account: "(varies by grade)",
        missingEnv: [],
        supabaseHint: supabaseHintForRoute("/student/login"),
        whatYouNeed: error.message,
      },
    });
    await writeOutputs(out, subject, env.outputDir);
    console.error(error);
    console.log(JSON.stringify(out, null, 2));
    process.exit(2);
  }

  await browser.close();
  const finalReport = finalizeStatus(report);
  await writeOutputs(finalReport, subject, env.outputDir);
  console.log(JSON.stringify(finalReport, null, 2));
  process.exit(finalReport.status === "VISUAL_QA_PASS" ? 0 : finalReport.status === "BLOCKED" ? 2 : 1);
}

main().catch(async (error) => {
  const subject = process.env.VISUAL_QA_SUBJECT || "unknown";
  const out = blockedReport({
    baseUrl: resolveBaseUrl(),
    subject,
    blocked: {
      route: "(harness crash)",
      account: "(unknown)",
      missingEnv: [],
      supabaseHint: supabaseHintForRoute("/student/login"),
      whatYouNeed: error.message,
    },
  });
  await writeOutputs(out, subject, process.env.VISUAL_QA_OUTPUT_DIR || "").catch(() => {});
  console.error(error);
  process.exit(2);
});
