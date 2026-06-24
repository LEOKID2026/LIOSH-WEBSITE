#!/usr/bin/env node
/**
 * Production HTTP final QA — 10 questions, slow pace, stop on 429.
 * Run: node --env-file=.env.local --env-file=.env.e2e.local tmp/production-fix-final-qa.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import { AMBIGUOUS_RESPONSE_HE } from "../utils/parent-copilot/question-classifier.js";
import { isNoDataClarificationText } from "../utils/parent-copilot/no-data-request-response.js";
import { resolveParentBearer } from "../scripts/truth-gates/lib/live-parent-report.mjs";
import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../lib/parent-server/parent-report-account-attachment.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/copilot-closure-round");

const PROD_ORIGIN = process.env.COPILOT_PROD_ORIGIN || "https://liosh-website.vercel.app";
const STUDENT_ID = process.env.COPILOT_QA_STUDENT_ID || "38e2dbcf-a927-419f-a2ed-b26c7100e656";
const RANGE = { reportPeriod: "custom", rangeFrom: "2026-05-26", rangeTo: "2026-06-24" };
const INITIAL_DELAY_MS = Number(process.env.COPILOT_QA_INITIAL_DELAY_MS || 600_000);
const BETWEEN_DELAY_MS = Number(process.env.COPILOT_QA_BETWEEN_DELAY_MS || 90_000);
const START_INDEX = Math.max(1, Number(process.env.COPILOT_QA_START_INDEX || 1));
const APPEND_PRIOR = process.env.COPILOT_QA_APPEND_PRIOR === "1";

const QUESTIONS = [
  "מה הכי חשוב כרגע?",
  "איפה רואים התקדמות?",
  "מה כדאי להימנע ממנו עכשיו?",
  "מה לעשות בבית היום?",
  "איפה הוא צריך עזרה?",
  "למה כתוב שיש פער במתמטיקה?",
  "האם הבעיה היא נשיאה?",
  "האם זה בגלל לחץ זמן?",
  "האם הפעילות שנתתי לו השפיעה?",
  "תסביר לי את הדוח במילים פשוטות.",
];

function gitHead() {
  try {
    return execSync('git log -1 --format="%H %ci %s"', { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function summaryFromBody(enriched) {
  const s = enriched?.summary || enriched?.practiceSummary || {};
  const totalQuestions = Number(s.totalAnswers ?? s.totalQuestions ?? 0) || 0;
  const accuracy = s.accuracy ?? s.accuracyPercent ?? null;
  const totalMinutes =
    s.totalTimeMinutes ??
    s.totalMinutes ??
    (Number(s.totalDurationSeconds) > 0 ? Math.round(Number(s.totalDurationSeconds) / 60) : null);
  const bySubject =
    s.bySubject || enriched?.derived?.bySubject || enriched?.bySubject || enriched?.subjects || {};
  const subjectBreakdown = {};
  for (const [sid, row] of Object.entries(bySubject)) {
    const q = Number(row?.answers ?? row?.questions ?? 0) || 0;
    const c = Number(row?.correct ?? 0) || 0;
    subjectBreakdown[sid] = {
      questions: q,
      accuracy: row?.accuracy ?? (q ? Math.round((c / q) * 100) : null),
    };
  }
  return { totalQuestions, overallAccuracy: accuracy, totalMinutes, subjectBreakdown };
}

function answerTextFromApi(json) {
  const core = json?.result?.response || json?.result || json?.response || json;
  if (core?.resolutionStatus === "resolved") {
    return (core.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(core?.clarificationQuestionHe || "");
}

function extractCore(json) {
  return json?.result?.response || json?.result || json?.response || json;
}

function forbiddenCopy(text) {
  const t = String(text || "");
  return {
    magbil: /מגביל\s+כמה\s+ברורה/u.test(t),
    circularAmbiguousExample:
      t.includes("לא הצלחתי להבין") && t.includes("איפה רואים התקדמות"),
  };
}

/** @param {string} utterance @param {string} text @param {object} row */
function manualPassFail(utterance, text, row) {
  const t = String(text || "");
  const reasons = [];
  if (row.httpStatus !== 200) reasons.push(`http ${row.httpStatus}`);
  if (row.ambiguous) reasons.push("ambiguous");
  if (forbiddenCopy(t).magbil) reasons.push("forbidden magbil copy");

  const u = utterance.trim();
  if (u === "מה הכי חשוב כרגע?") {
    if (!/הדבר הכי חשוב|נושא אחד לחיזוק/u.test(t)) reasons.push("missing action template");
    if (!/102\s+שאלות|חיבור/u.test(t)) reasons.push("missing math/chibur anchor");
  } else if (u === "איפה רואים התקדמות?") {
    if (row.isNoData && !/יש בדוח נתוני תרגול/u.test(t)) reasons.push("generic NO_DATA");
    if (row.ambiguous) reasons.push("ambiguous");
    if (row.resolutionStatus === "resolved" && !/שינוי|יציב|השוואה/u.test(t)) reasons.push("no progress framing");
  } else if (u === "מה כדאי להימנע ממנו עכשיו?") {
    if (!/כרגע כדאי להימנע משלושה דברים/u.test(t)) reasons.push("missing avoid template");
    if (row.ambiguous) reasons.push("ambiguous");
  } else if (u === "מה לעשות בבית היום?") {
    if (!/היום|בבית|5.?10|תרגול|פעילות/u.test(t)) reasons.push("no clear home action");
  } else if (u === "איפה הוא צריך עזרה?") {
    if (!/102\s+שאלות|33%|חיבור|חשבון/u.test(t)) reasons.push("missing math/chibur 102/33");
  } else if (u === "למה כתוב שיש פער במתמטיקה?") {
    if (!/102|33|חיבור|מתמטיקה|חשבון/u.test(t)) reasons.push("missing math gap anchor");
  } else if (u === "האם הבעיה היא נשיאה?") {
    if (!row.isNoData) reasons.push("expected specific NO_DATA");
    if (!/יש בדוח נתוני תרגול/u.test(t)) reasons.push("not specific NO_DATA");
    if (/אין מספיק מידע כדי לענות על זה בצורה מדויקת/u.test(t) && !/דווקא על הנקודה/u.test(t))
      reasons.push("generic NO_DATA phrasing");
  } else if (u === "האם זה בגלל לחץ זמן?") {
    if (!row.isNoData) reasons.push("expected specific NO_DATA");
    if (!/יש בדוח נתוני תרגול/u.test(t)) reasons.push("not specific NO_DATA");
  } else if (u === "האם הפעילות שנתתי לו השפיעה?") {
    if (!row.isNoData) reasons.push("expected specific NO_DATA");
    if (!/יש בדוח נתוני תרגול/u.test(t)) reasons.push("not specific NO_DATA");
  } else if (u === "תסביר לי את הדוח במילים פשוטות.") {
    if (!/חשבון|מתמטיקה|גאומטריה|עברית|מדעים|אנגלית/u.test(t)) reasons.push("missing subject coverage");
  }

  return { pass: reasons.length === 0, reasons };
}

function renderMd(report) {
  const lines = [];
  lines.push("# Production Fix — Final QA Report");
  lines.push("");
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Status:** ${report.status}`);
  lines.push(`**Production origin:** ${report.productionOrigin}`);
  lines.push(`**Real Production HTTP:** yes`);
  lines.push(`**Local git HEAD (audit machine):** ${report.localGitHead}`);
  lines.push(`**Deploy/build note:** ${report.deployNote}`);
  lines.push(`**HTTP 200 count:** ${report.http200Count}/10`);
  lines.push(`**Any 429:** ${report.any429 ? "YES — run incomplete" : "NO"}`);
  lines.push("");
  lines.push("## Report match");
  lines.push("");
  lines.push(`- Student: **${report.matchedStudent.name}** (${report.matchedStudent.id})`);
  lines.push(`- Range: **${report.rangeUsed.rangeFrom} – ${report.rangeUsed.rangeTo}**`);
  lines.push(`- Questions: **${report.matchedStudent.summary.totalQuestions}**`);
  lines.push(`- Minutes: **${report.matchedStudent.summary.totalMinutes}**`);
  lines.push(`- Accuracy: **${report.matchedStudent.summary.overallAccuracy}%**`);
  lines.push("");
  lines.push("## Run parameters");
  lines.push("");
  lines.push(`- Initial cooldown: ${report.runParams.initialDelayMs / 1000}s`);
  lines.push(`- Delay between questions: ${report.runParams.betweenDelayMs / 1000}s`);
  lines.push(`- Stopped early on 429: ${report.stoppedOn429 ? "YES" : "NO"}`);
  lines.push("");
  lines.push("## 10 questions — full results");
  lines.push("");
  for (const row of report.results) {
    lines.push(`### ${row.index}. ${row.utterance}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`| ----- | ----- |`);
    lines.push(`| HTTP | ${row.httpStatus} |`);
    lines.push(`| intent | ${row.intent ?? "-"} |`);
    lines.push(`| route | ${row.route ?? "-"} |`);
    lines.push(`| ambiguous | ${row.ambiguous} |`);
    lines.push(`| NO_DATA | ${row.isNoData} |`);
    lines.push(`| payloadQuestions | ${row.payloadQuestions} |`);
    lines.push(`| manual PASS/FAIL | **${row.manualPass ? "PASS" : "FAIL"}** |`);
    if (row.manualFailReasons?.length) lines.push(`| fail reasons | ${row.manualFailReasons.join("; ")} |`);
    lines.push(`| forbidden copy | magbil=${row.forbidden.magbil} |`);
    lines.push("");
    lines.push("**Full answer:**");
    lines.push("");
    lines.push("> " + (row.fullText || row.error || "(empty)").replace(/\n/g, "\n> "));
    lines.push("");
  }
  lines.push("## Summary table");
  lines.push("");
  lines.push("| # | שאלה | HTTP | ambiguous | NO_DATA | PASS/FAIL |");
  lines.push("| - | ---- | ---- | --------- | ------- | --------- |");
  for (const row of report.results) {
    const short = row.utterance.length > 36 ? row.utterance.slice(0, 33) + "…" : row.utterance;
    lines.push(
      `| ${row.index} | ${short} | ${row.httpStatus} | ${row.ambiguous} | ${row.isNoData} | ${row.manualPass ? "PASS" : "FAIL"} |`,
    );
  }
  return lines.join("\n");
}

async function loadPayloadSummary(supabase, studentId) {
  const { data: st, error } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw error;
  if (!st) throw new Error(`Student not found: ${studentId}`);
  const from = new Date(`${RANGE.rangeFrom}T00:00:00.000Z`);
  const to = new Date(`${RANGE.rangeTo}T23:59:59.999Z`);
  const reportBody = await aggregateParentReportPayload(supabase, st, from, to, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  const withAcc = await attachStudentLearningAccountToParentReportPayload(supabase, st, reportBody);
  const enriched = await enrichPayloadWithParentFacing(supabase, withAcc, st.id);
  return { student: st, summary: summaryFromBody(enriched) };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  console.error(`[final-qa] Initial cooldown ${INITIAL_DELAY_MS / 1000}s (rate-limit window reset)…`);
  await sleep(INITIAL_DELAY_MS);

  const supabase = createClient(url, key);
  const { token, identifier } = await resolveParentBearer(PROD_ORIGIN);
  if (!token) throw new Error("Parent bearer unavailable");

  const { student, summary } = await loadPayloadSummary(supabase, STUDENT_ID);
  if (summary.totalQuestions !== 214) {
    console.error(`[final-qa] WARN: expected 214q, got ${summary.totalQuestions}`);
  }

  /** @type {object[]} */
  let results = [];
  if (APPEND_PRIOR) {
    const priorPath = path.join(OUT_DIR, "production-fix-final-qa-report.json");
    try {
      const prior = JSON.parse(await readFile(priorPath, "utf8"));
      results = (prior.results || []).filter((r) => r.httpStatus === 200 && r.index < START_INDEX);
      console.error(`[final-qa] Appended ${results.length} prior 200 results before Q${START_INDEX}`);
    } catch {
      console.error("[final-qa] No prior report to append");
    }
  }

  let stoppedOn429 = false;
  let vercelIds = [];
  let buildHint = null;
  let last429Detail = null;

  const questionSlice = QUESTIONS.slice(START_INDEX - 1);

  for (let j = 0; j < questionSlice.length; j++) {
    const i = START_INDEX - 1 + j;
    const utterance = questionSlice[j];
    const sessionId = `final-qa-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    console.error(`[final-qa] Q${i + 1}/10 POST ${utterance.slice(0, 40)}…`);

    let httpStatus = 0;
    let prodJson = {};
    let headers = {};
    let errMsg = null;

    try {
      const res = await fetch(`${PROD_ORIGIN}/api/parent/copilot-turn`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: STUDENT_ID,
          utterance,
          sessionId,
          ...RANGE,
          payload: { version: 999, ignored: true },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      httpStatus = res.status;
      headers = {
        "x-vercel-id": res.headers.get("x-vercel-id"),
        "x-vercel-cache": res.headers.get("x-vercel-cache"),
        date: res.headers.get("date"),
        "retry-after": res.headers.get("retry-after"),
      };
      if (headers["x-vercel-id"]) vercelIds.push(headers["x-vercel-id"]);
      prodJson = await res.json().catch(() => ({}));
      if (httpStatus === 429) {
        last429Detail = {
          body: prodJson,
          retryAfterSec: headers["retry-after"],
          rateLimitType: "production_in_memory_Too_many_requests",
        };
      }
    } catch (err) {
      errMsg = String(err?.message || err);
    }

    const core = extractCore(prodJson);
    const fullText = answerTextFromApi(prodJson);
    const ambiguous =
      core?.resolutionStatus === "clarification_required" &&
      fullText.includes(AMBIGUOUS_RESPONSE_HE.slice(0, 24));
    const isNoData = isNoDataClarificationText(fullText);
    const forbidden = forbiddenCopy(fullText);

    const row = {
      index: i + 1,
      utterance,
      httpStatus,
      resolutionStatus: core?.resolutionStatus,
      intent: core?.intent || core?.metadata?.semanticIntent,
      route: core?.debug?.route || core?.telemetry?.answerComposerUsed || core?.metadata?.generationPath,
      ambiguous,
      isNoData,
      fullText,
      payloadQuestions: summary.totalQuestions,
      payloadSubjects: summary.subjectBreakdown,
      forbidden,
      responseHeaders: headers,
      error: errMsg,
    };
    const { pass, reasons } = manualPassFail(utterance, fullText, row);
    row.manualPass = pass;
    row.manualFailReasons = reasons;
    row.matches214qReport = summary.totalQuestions === 214;
    results.push(row);

    if (httpStatus === 429) {
      console.error("[final-qa] STOP — received 429");
      stoppedOn429 = true;
      break;
    }

    if (i < QUESTIONS.length - 1) {
      console.error(`[final-qa] waiting ${BETWEEN_DELAY_MS / 1000}s…`);
      await sleep(BETWEEN_DELAY_MS);
    }
  }

  results.sort((a, b) => a.index - b.index);

  // Try to read Next.js buildId from homepage
  try {
    const home = await fetch(PROD_ORIGIN, { signal: AbortSignal.timeout(30_000) });
    const html = await home.text();
    const m = html.match(/"buildId":"([^"]+)"/);
    if (m) buildHint = m[1];
  } catch {
    /* ignore */
  }

  const http200Count = results.filter((r) => r.httpStatus === 200).length;
  const any429 = results.some((r) => r.httpStatus === 429);
  const allPass =
    results.length === 10 && results.every((r) => r.manualPass && r.httpStatus === 200);
  const priorReportNote =
    "Earlier production-fix-qa-report.json (partial 2/10 + 429) superseded by this final run.";

  const report = {
    generatedAt: new Date().toISOString(),
    status: allPass
      ? "NOT_APPROVED — ready for owner re-test (10/10 Production HTTP PASS on criteria)"
      : any429 || stoppedOn429
        ? "NOT_APPROVED — incomplete (429 or stopped early)"
        : "NOT_APPROVED — Production HTTP complete but manual criteria failures",
    productionOrigin: PROD_ORIGIN,
    isRealProductionHttp: true,
    localGitHead: gitHead(),
    vercelBuildIdFromHomepage: buildHint,
    vercelResponseIds: [...new Set(vercelIds)],
    deployNote:
      buildHint
        ? `Production Next.js buildId=${buildHint}. Prior partial QA showed updated copy on Q1–Q2 before this run — deploy occurred before final QA. ${priorReportNote}`
        : `Production HTTP to ${PROD_ORIGIN}. ${priorReportNote}`,
    rangeUsed: RANGE,
    authAccount: identifier || "[redacted]",
    matchedStudent: { id: student.id, name: student.full_name, summary },
    runParams: {
      initialDelayMs: INITIAL_DELAY_MS,
      betweenDelayMs: BETWEEN_DELAY_MS,
      startIndex: START_INDEX,
      appendPrior: APPEND_PRIOR,
    },
    rateLimit429Note:
      "Production returns 429 {error:'Too many requests'} from in-memory limiter (copilot-turn-ip 25/10min + copilot-turn-auth 12/10min per IP). Not monthly_ai_limit (admin unlimited).",
    last429Detail,
    stoppedOn429,
    http200Count,
    any429,
    allManualPass: results.every((r) => r.manualPass),
    results,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outJson = path.join(OUT_DIR, "production-fix-final-qa-report.json");
  const outMd = path.join(OUT_DIR, "production-fix-final-qa-report.md");
  await writeFile(outJson, JSON.stringify(report, null, 2), "utf8");
  await writeFile(outMd, renderMd(report), "utf8");

  console.log(
    JSON.stringify(
      {
        ok: !stoppedOn429 && !any429,
        outJson,
        outMd,
        http200Count,
        stoppedOn429,
        allManualPass: report.allManualPass,
        status: report.status,
      },
      null,
      2,
    ),
  );

  if (stoppedOn429 || any429) process.exit(2);
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
