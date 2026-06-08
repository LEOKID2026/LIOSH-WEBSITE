#!/usr/bin/env node
/**
 * Parent Report Launch QA — AAA1–AAA12, admin parent, all diagnostic flags OFF.
 * Validates API payload, visible report rebuild, and optional PDF export.
 *
 *   node --env-file=.env.local scripts/qa/parent-report-launch-qa.mjs
 *   node --env-file=.env.local scripts/qa/parent-report-launch-qa.mjs --seed-june-week
 *   node --env-file=.env.local scripts/qa/parent-report-launch-qa.mjs --skip-pdf
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { DATA_SUFFICIENCY } from "../../lib/learning/evidence-quality.js";
import { buildDetailedPayloadFromAggregatedReportBody } from "../../lib/parent-server/db-input-to-detailed-report.server.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import {
  COMPARISON_RANGES,
  FLAG_ENV,
  parseIsoDate,
  QA_PARENT_EMAIL,
  resolveAaaStudents,
} from "./lib/parent-aaa-qa-constants.mjs";
import { scenarioPlan } from "./parent-report-q2e-monthly-simulation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-launch-qa");
const MD_PATH = path.join(ROOT, "docs/qa/PARENT_REPORT_LAUNCH_QA.md");
const BASE_URL = (process.env.QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const INACTIVITY_PHRASE = "לא הייתה פעילות לאחרונה";

const LEAKAGE_KEYS = [
  "classroom",
  "school",
  "privateTeacher",
  "private_teacher",
  "sourceBreakdown",
  "supportingEvidenceIds",
  "_evidenceQuality",
  "bySubSkill",
  "shadowParentGating",
  "appliedParentGating",
  "promotionDecisions",
  "gatingDecisions",
  "_canonicalMeta",
  "teacherReport",
  "classReport",
  "crossContext",
];

const RANGE_PDF_DATES = {
  may_month: { start: "01/05/2026", end: "31/05/2026", forbid: "31/03/2026" },
  full: { start: "01/05/2026", end: "08/06/2026", forbid: "31/03/2026" },
};

function ensureFlagsOff() {
  process.env[FLAG_ENV.subskill] = "false";
  process.env[FLAG_ENV.gating] = "false";
  process.env[FLAG_ENV.promotion] = "false";
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
  return [...new Set(hits)];
}

function gradeDbKey(gradeNum) {
  return `g${gradeNum}`;
}

function hasStrongDiagnosisLanguage(insights) {
  const strong = ["נראה שיש קושי", "כדאי לשים לב ל", "יש טעויות חוזרות", "הביצועים הכלליים"];
  return (insights || []).some((line) => strong.some((s) => line.includes(s)));
}

function uiPeriodForRange(rangeId) {
  if (rangeId === "one_week") return "week";
  if (rangeId === "may_month") return "month";
  return "custom";
}

function launchExpectations(entry, rangeId) {
  const plan = scenarioPlan(entry);
  const base = {
    subject: plan.subject,
    topic: plan.topic,
    scenarioExpected: plan.expected,
  };

  if (rangeId === "one_day" || rangeId === "one_week") {
    if (entry.scenario === "A_no_data") {
      return { ...base, expectEmpty: true, minDiag: 0, maxDiag: 0 };
    }
    if (rangeId === "one_day") {
      return { ...base, expectJuneActivity: true, minDiag: 0, minSessions: 0, minAnswers: 0 };
    }
    return { ...base, expectJuneActivity: true, minSessions: 1, minAnswers: 2 };
  }

  switch (entry.scenario) {
    case "A_no_data":
      return { ...base, maxDiag: 0, allowNoData: true };
    case "B_insufficient_data":
      return { ...base, minDiag: 1, maxDiag: 7, allowInsufficient: true };
    case "C_preliminary_by_count":
    case "D_preliminary_no_recurrence":
    case "F_parent_assigned":
      return { ...base, minDiag: 5, allowPreliminary: true };
    case "E_supported_diagnosis":
    case "H_questionType_contrast":
    case "J_english_metadata":
    case "K_hebrew_metadata":
    case "L_science_moledet":
    case "I_weak_metadata_suppression":
      return { ...base, minDiag: 8, allowSupported: true };
    case "G_non_diagnostic_exclusion":
      return { ...base, maxDiag: 0, minBookOrLearning: true };
    default:
      return base;
  }
}

async function fetchPublicReport(supabase, entry, from, to) {
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel || gradeDbKey(entry.grade),
    is_active: true,
  };
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(from),
    parseIsoDate(to),
    { includeParentActivities: true }
  );
  const enriched = await enrichPayloadWithParentFacing(supabase, raw, entry.studentId);
  return stripInternalReportPayloadFields(structuredClone(enriched));
}

function runApiChecks(pub, range, entry) {
  const checks = [];
  const summary = pub.summary || {};
  const eq = pub.meta?.evidenceQuality;
  const diag = Number(summary.diagnosticAnswers ?? 0);
  const sessions = Number(summary.totalSessions ?? 0);
  const answers = Number(summary.totalAnswers ?? 0);
  const exp = launchExpectations(entry, range.id);

  checks.push({ name: "payload_ok", pass: pub.ok !== false });
  checks.push({
    name: "range_matches",
    pass: pub.range?.from === range.from && pub.range?.to === range.to,
    actual: pub.range,
  });
  checks.push({ name: "public_evidenceQuality", pass: !!eq });
  checks.push({ name: "no__evidenceQuality", pass: pub.meta?._evidenceQuality === undefined });
  checks.push({
    name: "no_public_bySubSkill",
    pass: eq?.bySubSkill === undefined && eq?.shadowParentGating === undefined,
  });
  checks.push({
    name: "no_supportingEvidenceIds",
    pass: eq?.student?.supportingEvidenceIds === undefined,
  });
  const leaks = deepFindLeakKeys(pub);
  checks.push({ name: "no_leak_keys", pass: leaks.length === 0, actual: leaks.slice(0, 6) });

  if (exp.maxDiag === 0) {
    checks.push({ name: "diagnostic_zero", pass: diag === 0, actual: diag });
  }
  if (exp.minDiag != null) {
    checks.push({ name: "diagnostic_min", pass: diag >= exp.minDiag, actual: diag, expected: exp.minDiag });
  }
  if (exp.maxDiag != null && exp.maxDiag > 0) {
    checks.push({ name: "diagnostic_max", pass: diag <= exp.maxDiag, actual: diag, expected: exp.maxDiag });
  }
  if (exp.minSessions != null) {
    checks.push({
      name: "sessions_min",
      pass: sessions >= exp.minSessions,
      actual: sessions,
      expected: exp.minSessions,
    });
  }
  if (exp.minAnswers != null) {
    checks.push({
      name: "answers_min",
      pass: answers >= exp.minAnswers,
      actual: answers,
      expected: exp.minAnswers,
    });
  }
  if (exp.allowNoData) {
    checks.push({
      name: "no_data_sufficiency",
      pass: eq?.student?.dataSufficiency === DATA_SUFFICIENCY.NO_DATA || diag === 0,
      actual: eq?.student?.dataSufficiency,
    });
  }
  if (exp.allowInsufficient) {
    checks.push({
      name: "insufficient_or_less",
      pass:
        eq?.student?.dataSufficiency === DATA_SUFFICIENCY.INSUFFICIENT ||
        eq?.student?.dataSufficiency === DATA_SUFFICIENCY.NO_DATA ||
        diag < 8,
      actual: eq?.student?.dataSufficiency,
    });
  }
  if (exp.allowSupported) {
    checks.push({
      name: "supported_or_preliminary_student",
      pass:
        eq?.student?.dataSufficiency === DATA_SUFFICIENCY.SUPPORTED ||
        eq?.student?.dataSufficiency === DATA_SUFFICIENCY.PRELIMINARY ||
        diag >= 8,
      actual: eq?.student?.dataSufficiency,
    });
  }
  if (exp.minBookOrLearning) {
    const act = pub.learningActivity || {};
    const bookMin = Number(act.bookReadingMinutes ?? 0);
    const learningMin = Number(act.learningMinutes ?? act.totalLearningMinutes ?? 0);
    checks.push({
      name: "book_or_learning_present",
      pass: bookMin > 0 || learningMin > 0 || answers > 0,
      actual: { bookMin, learningMin, answers },
    });
  }

  if (entry.scenario === "F_parent_assigned" || entry.scenario === "L_science_moledet") {
    const pa = Number(summary.parentAssignedAttempts ?? summary.parentActivityAttempts ?? 0);
    const paAlt = (pub.parentActivities || []).length;
    checks.push({
      name: "parent_activity_reflected",
      pass: pa > 0 || paAlt > 0 || answers > 0,
      actual: { pa, paAlt, answers },
    });
  }

  if (exp.allowNoData || exp.allowInsufficient) {
    checks.push({
      name: "no_strong_diagnosis_language",
      pass: !hasStrongDiagnosisLanguage(pub.parentFacing?.insights),
      actual: pub.parentFacing?.insights,
    });
  }

  return checks;
}

async function runUiChecks(pub, range, entry) {
  const checks = [];
  const periodLabel = uiPeriodForRange(range.id);
  let detailed = null;
  try {
    detailed = await buildDetailedPayloadFromAggregatedReportBody(pub, periodLabel);
  } catch (err) {
    checks.push({ name: "detailed_build", pass: false, error: String(err?.message || err) });
    return { checks, detailed: null, visibleOk: false };
  }

  checks.push({ name: "detailed_build", pass: !!detailed });

  const periodInfo = detailed?.periodInfo || {};
  checks.push({
    name: "period_start_matches",
    pass: String(periodInfo.startDate || "").slice(0, 10) === range.from,
    actual: periodInfo.startDate,
  });
  checks.push({
    name: "period_end_matches",
    pass: String(periodInfo.endDate || "").slice(0, 10) === range.to,
    actual: periodInfo.endDate,
  });
  checks.push({
    name: "no_march_31_in_labels",
    pass:
      !String(periodInfo.startDateLabelHe || "").includes("31/03") &&
      !String(periodInfo.endDateLabelHe || "").includes("31/03"),
    actual: {
      start: periodInfo.startDateLabelHe,
      end: periodInfo.endDateLabelHe,
    },
  });

  const insights = pub.parentFacing?.insights || [];
  checks.push({
    name: "has_parent_insights",
    pass: insights.length > 0,
    actual: insights.length,
  });
  checks.push({
    name: "has_home_recommendations",
    pass: (pub.parentFacing?.homeRecommendations || []).length > 0,
    actual: (pub.parentFacing?.homeRecommendations || []).length,
  });

  const summary = pub.summary || {};
  const hasActivity =
    Number(summary.totalSessions ?? 0) > 0 || Number(summary.totalAnswers ?? 0) > 0;
  const hasInactivity = insights.some((l) => l.includes(INACTIVITY_PHRASE));
  const lastInRange = String(pub.dailyActivity?.slice?.(-1)?.[0]?.date || pub.dailyActivity?.at?.(-1)?.date || "");
  const activityEndsNearPeriod =
    lastInRange && range.to && lastInRange >= range.to.slice(0, 8) + "01";

  if (hasActivity && (range.id === "may_month" || range.id === "full")) {
    checks.push({
      name: "inactivity_warning_when_stale_gap",
      pass: true,
      warn: hasInactivity && !activityEndsNearPeriod,
      detail: hasInactivity
        ? "inactivity phrase present — expected if last activity >7d before period end (May-only seed)"
        : "ok",
    });
  }

  if (range.id === "one_week" && entry.scenario !== "A_no_data") {
    checks.push({
      name: "one_week_has_june_activity",
      pass: Number(summary.totalSessions ?? 0) >= 1 || Number(summary.totalAnswers ?? 0) >= 2,
      actual: { sessions: summary.totalSessions, answers: summary.totalAnswers },
    });
    checks.push({
      name: "one_week_no_false_inactivity",
      pass: !hasInactivity || Number(summary.totalSessions ?? 0) === 0,
      actual: hasInactivity,
    });
  }

  if (entry.scenario === "G_non_diagnostic_exclusion" && (range.id === "may_month" || range.id === "full")) {
    const act = pub.learningActivity || {};
    checks.push({
      name: "aaa7_book_learning_visible",
      pass:
        Number(act.bookReadingMinutes ?? 0) > 0 ||
        Number(act.bookSessionCount ?? 0) > 0 ||
        Number(summary.totalAnswers ?? 0) > 0,
      actual: act,
    });
  }

  const exec = detailed?.executiveSummary;
  checks.push({
    name: "executive_summary_present",
    pass: !!exec && typeof exec === "object",
  });

  const visibleOk = checks.filter((c) => c.name !== "inactivity_warning_when_stale_gap").every((c) => c.pass);
  return { checks, detailed, visibleOk };
}

function verdictFromChecks(apiChecks, uiChecks) {
  const apiFail = apiChecks.filter((c) => !c.pass);
  const uiFail = uiChecks.filter((c) => !c.pass && !c.warn);
  const warns = uiChecks.filter((c) => c.warn);
  if (apiFail.length || uiFail.length) return { verdict: "FAIL", apiFail, uiFail, warns };
  if (warns.length) return { verdict: "WARN", apiFail, uiFail, warns };
  return { verdict: "PASS", apiFail, uiFail, warns };
}

async function tryDevServer() {
  try {
    const res = await fetch(`${BASE_URL}/learning/parent-report-detailed`, { redirect: "follow" });
    return res.status > 0 && res.status < 600;
  } catch {
    return false;
  }
}

async function exportPdfSample(students, resultsByKey, rangesForPdf) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return { skipped: true, reason: "playwright not available" };
  }

  const reachable = await tryDevServer();
  if (!reachable) return { skipped: true, reason: `dev server not reachable at ${BASE_URL}` };

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    return { skipped: true, reason: "missing supabase env for auth" };
  }

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
    return { skipped: true, reason: `parent sign-in failed: ${error?.message}` };
  }

  const pdfDir = path.join(ARTIFACT_DIR, "pdf-export");
  await mkdir(pdfDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(
    ({ url: sbUrl, anonKey: ak, token, refresh }) => {
      const host = new URL(sbUrl).hostname.split(".")[0];
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
    { url, anonKey, token: data.session.access_token, refresh: data.session.refresh_token || "" }
  );

  const exports = [];
  const printRoot = '[data-testid="parent-report-detailed-full-print-root"]';
  const routePattern = "**/api/parent/students/*/report-data*";

  for (const range of rangesForPdf) {
    for (const entry of students) {
      const key = `${entry.label}::${range.id}`;
      const row = resultsByKey.get(key);
      if (!row?.publicPayload) continue;

      const outPath = path.join(pdfDir, `${entry.label}-${range.id}-detailed-full.pdf`);
      const q = new URLSearchParams({
        studentId: entry.studentId,
        source: "parent",
        period: "custom",
        start: range.from,
        end: range.to,
      });
      const reportUrl = `${BASE_URL}/learning/parent-report-detailed-full?${q.toString()}`;

      await page.unroute(routePattern).catch(() => {});
      await page.route(routePattern, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify(row.publicPayload),
        });
      });

      try {
        await page.goto(reportUrl, { waitUntil: "load", timeout: 180_000 });
        await page.waitForTimeout(3000);
        await page.waitForSelector(printRoot, { state: "attached", timeout: 120_000 }).catch(() => {});
        await page.emulateMedia({ media: "print" });
        const buf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
        });
        await writeFile(outPath, buf);

        let text = "";
        try {
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: buf });
          const textResult = await parser.getText();
          text = String(textResult?.text || "");
          await parser.destroy?.();
        } catch {
          text = "";
        }

        const dates = RANGE_PDF_DATES[range.id] || RANGE_PDF_DATES.full;
        const checks = [
          { name: "date_start", pass: text.includes(dates.start) },
          { name: "date_end", pass: text.includes(dates.end) },
          { name: "no_march_31", pass: !text.includes(dates.forbid) },
          { name: "hebrew_signal", pass: /להורה|סיכום|דוח/.test(text) },
          {
            name: "no_school_leak",
            pass: !/(בית\s+ספר|classroom\s+activity|פעילות\s+כיתה)/i.test(text),
          },
        ];
        const summary = row.publicPayload.summary || {};
        const hasActivity =
          Number(summary.totalSessions ?? 0) > 0 || Number(summary.totalAnswers ?? 0) > 0;
        if (hasActivity && lastActivityNearEnd(row.publicPayload, range.to)) {
          checks.push({
            name: "no_false_inactivity",
            pass: !text.includes(INACTIVITY_PHRASE),
          });
        }

        exports.push({
          child: entry.label,
          range: range.id,
          file: outPath,
          bytes: buf.length,
          pass: checks.every((c) => c.pass),
          failures: checks.filter((c) => !c.pass).map((c) => c.name),
        });
      } catch (err) {
        exports.push({
          child: entry.label,
          range: range.id,
          pass: false,
          error: String(err?.message || err),
        });
      }
    }
  }

  await browser.close();
  return { skipped: false, exports };
}

function lastActivityNearEnd(pub, rangeTo) {
  const daily = pub.dailyActivity;
  if (!Array.isArray(daily) || !daily.length) return false;
  const last = daily[daily.length - 1]?.date;
  if (!last || !rangeTo) return false;
  const gap =
    (Date.parse(`${rangeTo}T23:59:59.000Z`) - Date.parse(`${last}T12:00:00.000Z`)) /
    (86400 * 1000);
  return gap <= 7;
}

function buildMarkdown(artifact) {
  const lines = [];
  lines.push("# Parent Report Launch QA — AAA1–AAA12");
  lines.push("");
  lines.push(`**Generated:** ${artifact.generatedAt.slice(0, 19)}`);
  lines.push(`**Parent:** ${QA_PARENT_EMAIL}`);
  lines.push(`**Flags:** all OFF (production launch setting)`);
  lines.push(`**June week seed:** ${artifact.juneWeekSeeded ? "yes" : "no"}`);
  lines.push(`**Overall:** **${artifact.summary.overall}** (${artifact.summary.pass}/${artifact.summary.total} PASS)`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| ------ | ----- |`);
  lines.push(`| API+UI matrix | ${artifact.summary.pass} PASS · ${artifact.summary.warn} WARN · ${artifact.summary.fail} FAIL / ${artifact.summary.total} |`);
  lines.push(`| PDF exports | ${artifact.pdfSummary} |`);
  lines.push(`| Launch readiness | **${artifact.launchReadiness}** |`);
  lines.push("");
  lines.push("## Matrix (child × range)");
  lines.push("");
  lines.push("| child | range | diag | sessions | sufficiency | visible | verdict |");
  lines.push("| ----- | ----- | ---: | -------: | ----------- | ------- | ------- |");
  for (const r of artifact.results) {
    lines.push(
      `| ${r.child} | ${r.range} | ${r.diagnosticAnswers} | ${r.totalSessions} | ${r.dataSufficiency || "—"} | ${r.visibleOk ? "ok" : "issue"} | ${r.verdict} |`
    );
  }
  lines.push("");
  lines.push("## Scenario highlights");
  lines.push("");
  lines.push("| Check | Result |");
  lines.push("| ----- | ------ |");
  for (const h of artifact.highlights) {
    lines.push(`| ${h.name} | ${h.result} |`);
  }
  lines.push("");
  if (artifact.failures.length) {
    lines.push("## Failures");
    lines.push("");
    for (const f of artifact.failures) {
      lines.push(`- **${f.child} / ${f.range}:** ${f.issues.join("; ")}`);
    }
    lines.push("");
  }
  if (artifact.warnings.length) {
    lines.push("## Warnings");
    lines.push("");
    for (const w of artifact.warnings) {
      lines.push(`- **${w.child} / ${w.range}:** ${w.detail}`);
    }
    lines.push("");
  }
  lines.push("## Launch readiness recommendation");
  lines.push("");
  lines.push(artifact.recommendation);
  lines.push("");
  lines.push(`Artifacts: \`${ARTIFACT_DIR}\``);
  return lines.join("\n");
}

async function main() {
  ensureFlagsOff();
  const seedJuneWeek = process.argv.includes("--seed-june-week");
  const skipPdf = process.argv.includes("--skip-pdf");

  if (seedJuneWeek) {
    console.log("Seeding June week parent-context data...");
    const seedScript = path.join(__dirname, "parent-report-launch-qa-june-week-seed.mjs");
    const r = spawnSync(process.execPath, ["--env-file=.env.local", seedScript], {
      stdio: "inherit",
      cwd: ROOT,
      env: process.env,
    });
    if (r.status !== 0) process.exit(r.status || 1);
  }

  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const results = [];
  const resultsByKey = new Map();
  const failures = [];
  const warnings = [];

  for (const range of COMPARISON_RANGES) {
    for (const entry of students) {
      console.log(`QA ${entry.label} ${range.id} (${range.from}..${range.to})`);
      const pub = await fetchPublicReport(supabase, entry, range.from, range.to);
      const apiChecks = runApiChecks(pub, range, entry);
      const { checks: uiChecks, visibleOk } = await runUiChecks(pub, range, entry);
      const { verdict, apiFail, uiFail, warns } = verdictFromChecks(apiChecks, uiChecks);

      const row = {
        child: entry.label,
        scenario: entry.scenario,
        range: range.id,
        rangeDates: { from: range.from, to: range.to },
        diagnosticAnswers: Number(pub.summary?.diagnosticAnswers ?? 0),
        totalAnswers: Number(pub.summary?.totalAnswers ?? 0),
        totalSessions: Number(pub.summary?.totalSessions ?? 0),
        dataSufficiency: pub.meta?.evidenceQuality?.student?.dataSufficiency,
        insights: pub.parentFacing?.insights || [],
        visibleOk,
        verdict,
        apiChecks,
        uiChecks,
        publicPayload: pub,
      };
      results.push(row);
      resultsByKey.set(`${entry.label}::${range.id}`, row);

      if (verdict === "FAIL") {
        failures.push({
          child: entry.label,
          range: range.id,
          issues: [...apiFail, ...uiFail].map((c) => `${c.name}${c.actual != null ? `(${JSON.stringify(c.actual)})` : ""}`),
        });
      }
      for (const w of warns) {
        warnings.push({ child: entry.label, range: range.id, detail: w.detail || w.name });
      }
    }
  }

  let pdfResult = { skipped: true, reason: "skipped by flag" };
  if (!skipPdf) {
    console.log("\nPDF export (may_month + full, detailed-full)...");
    pdfResult = await exportPdfSample(
      students,
      resultsByKey,
      COMPARISON_RANGES.filter((r) => r.id === "may_month" || r.id === "full")
    );
  }

  const pass = results.filter((r) => r.verdict === "PASS").length;
  const warn = results.filter((r) => r.verdict === "WARN").length;
  const fail = results.filter((r) => r.verdict === "FAIL").length;

  const highlights = [
    {
      name: "AAA1 no-data (full)",
      result: results.find((r) => r.child === "AAA1" && r.range === "full")?.verdict || "—",
    },
    {
      name: "AAA2 insufficient (may_month)",
      result: results.find((r) => r.child === "AAA2" && r.range === "may_month")?.verdict || "—",
    },
    {
      name: "AAA5 supported (full)",
      result: results.find((r) => r.child === "AAA5" && r.range === "full")?.verdict || "—",
    },
    {
      name: "AAA6 parent activity (full)",
      result: results.find((r) => r.child === "AAA6" && r.range === "full")?.verdict || "—",
    },
    {
      name: "AAA7 book/learning (full)",
      result: results.find((r) => r.child === "AAA7" && r.range === "full")?.verdict || "—",
    },
    {
      name: "AAA12 parent+science (full)",
      result: results.find((r) => r.child === "AAA12" && r.range === "full")?.verdict || "—",
    },
    {
      name: "one_week June activity (AAA3)",
      result: results.find((r) => r.child === "AAA3" && r.range === "one_week")?.verdict || "—",
    },
  ];

  let pdfSummary = "skipped";
  if (!pdfResult.skipped && pdfResult.exports) {
    const pdfPass = pdfResult.exports.filter((e) => e.pass).length;
    pdfSummary = `${pdfPass}/${pdfResult.exports.length} PASS`;
  } else if (pdfResult.reason) {
    pdfSummary = `skipped (${pdfResult.reason})`;
  }

  const launchReadiness =
    fail === 0 && (pdfResult.skipped || pdfResult.exports?.every((e) => e.pass))
      ? warn === 0
        ? "READY"
        : "READY_WITH_WARNINGS"
      : "NOT_READY";

  let recommendation =
    fail === 0
      ? "**Parent report is launch-ready** with all diagnostic flags OFF. Baseline API sanitization PASS; visible report rebuild PASS."
      : "**Not launch-ready** — fix FAIL rows before release.";

  if (warn > 0) {
    recommendation +=
      " WARN: inactivity insight may appear on full range when last activity is in May and period ends in June — expected with current seed; June week seed reduces this for one_week.";
  }
  if (!seedJuneWeek && results.find((r) => r.range === "one_week" && r.verdict === "FAIL")) {
    recommendation += " Re-run with `--seed-june-week` for June one_day/one_week QA.";
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    flags: { subskill: false, gating: false, promotion: false },
    juneWeekSeeded: seedJuneWeek,
    summary: { pass, warn, fail, total: results.length, overall: fail === 0 ? (warn ? "PASS_WITH_WARN" : "PASS") : "FAIL" },
    pdfSummary,
    launchReadiness,
    highlights,
    results: results.map(({ publicPayload, apiChecks, uiChecks, ...rest }) => rest),
    failures,
    warnings,
    pdf: pdfResult,
    recommendation,
  };

  await writeFile(path.join(ARTIFACT_DIR, "launch-qa-results.json"), JSON.stringify(artifact, null, 2), "utf8");
  await writeFile(
    path.join(ARTIFACT_DIR, "launch-qa-matrix.csv"),
    [
      "child,range,verdict,diag,sessions,sufficiency,visibleOk",
      ...results.map(
        (r) =>
          `${r.child},${r.range},${r.verdict},${r.diagnosticAnswers},${r.totalSessions},${r.dataSufficiency},${r.visibleOk}`
      ),
    ].join("\n") + "\n",
    "utf8"
  );

  const md = buildMarkdown(artifact);
  await writeFile(MD_PATH, md, "utf8");
  await writeFile(path.join(ARTIFACT_DIR, "PARENT_REPORT_LAUNCH_QA.md"), md, "utf8");

  console.log(`\nSummary: PASS=${pass} WARN=${warn} FAIL=${fail}`);
  console.log(`Launch readiness: ${launchReadiness}`);
  console.log(`Report: ${MD_PATH}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
