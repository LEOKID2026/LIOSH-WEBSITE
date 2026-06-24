#!/usr/bin/env node
/**
 * Post-fix: find owner 214q report on UI range + Production HTTP QA.
 * Run: node --env-file=.env.local --env-file=.env.e2e.local tmp/audit-production-fix-qa.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

import parentCopilot from "../utils/parent-copilot/index.js";
import { AMBIGUOUS_RESPONSE_HE } from "../utils/parent-copilot/question-classifier.js";
import { isNoDataClarificationText } from "../utils/parent-copilot/no-data-request-response.js";
import { resolveParentBearer } from "../scripts/truth-gates/lib/live-parent-report.mjs";
import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../lib/parent-server/parent-report-account-attachment.server.js";
import { buildDetailedPayloadFromAggregatedReportBody } from "../lib/parent-server/db-input-to-detailed-report.server.js";
import { resolveCopilotTurnPayloadForApi } from "../lib/parent-copilot/copilot-turn-payload.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/copilot-closure-round");
const PROD_ORIGIN = process.env.COPILOT_PROD_ORIGIN || "https://liosh-website.vercel.app";

/** UI range from owner screenshot */
const RANGE = { reportPeriod: "custom", rangeFrom: "2026-05-26", rangeTo: "2026-06-24" };

const OWNER_FINGERPRINT = {
  totalQuestions: 214,
  overallAccuracy: 53,
  totalMinutes: 372,
  subjects: {
    math: { q: 102, acc: 33 },
    geometry: { q: 25, acc: 72 },
    english: { q: 18, acc: 67 },
    science: { q: 44, acc: 75 },
    hebrew: { q: 25, acc: 64 },
  },
};

const QA_QUESTIONS = [
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

function summaryFromBody(enriched) {
  const s = enriched?.summary || enriched?.practiceSummary || {};
  const totalQuestions = Number(s.totalAnswers ?? s.totalQuestions ?? 0) || 0;
  const accuracy = s.accuracy ?? s.accuracyPercent ?? null;
  const totalMinutes = s.totalTimeMinutes ?? s.totalMinutes ?? null;
  const bySubject = s.bySubject || enriched?.derived?.bySubject || enriched?.bySubject || {};
  /** @type {Record<string, {questions: number, accuracy: number|null}>} */
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

function fingerprintMatch(summary) {
  const fp = OWNER_FINGERPRINT;
  if (summary.totalQuestions !== fp.totalQuestions) return false;
  if (fp.totalMinutes && summary.totalMinutes != null && summary.totalMinutes !== fp.totalMinutes) return false;
  for (const [k, v] of Object.entries(fp.subjects)) {
    if (summary.subjectBreakdown?.[k]?.questions !== v.q) return false;
  }
  return true;
}

async function loadStudentReport(supabase, student, range) {
  const from = new Date(`${range.rangeFrom}T00:00:00.000Z`);
  const to = new Date(`${range.rangeTo}T23:59:59.999Z`);
  const reportBody = await aggregateParentReportPayload(supabase, student, from, to, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  const withAcc = await attachStudentLearningAccountToParentReportPayload(supabase, student, reportBody);
  const enriched = await enrichPayloadWithParentFacing(supabase, withAcc, student.id);
  const detailed = buildDetailedPayloadFromAggregatedReportBody(enriched, range.reportPeriod);
  return { enriched, detailed, summary: summaryFromBody(enriched) };
}

function answerText(res) {
  const core = res?.result?.response || res?.result || res?.response || res;
  if (core?.resolutionStatus === "resolved") {
    return (core.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(core?.clarificationQuestionHe || "");
}

function extractRow(res, payloadSummary) {
  const core = res?.result?.response || res?.result || res?.response || res;
  const text = answerText(res);
  return {
    resolutionStatus: core?.resolutionStatus,
    intent: core?.intent || core?.metadata?.semanticIntent,
    route: core?.debug?.route || core?.telemetry?.answerComposerUsed || core?.metadata?.generationPath,
    ambiguous: core?.resolutionStatus === "clarification_required" && text.includes(AMBIGUOUS_RESPONSE_HE.slice(0, 24)),
    isNoData: isNoDataClarificationText(text),
    fullText: text,
    payloadQuestions: payloadSummary?.totalQuestions ?? null,
    payloadSubjects: payloadSummary?.subjectBreakdown ?? null,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key);
  const { token, identifier } = await resolveParentBearer(PROD_ORIGIN);
  if (!token) throw new Error("Parent bearer unavailable");

  const { data: students, error } = await supabase
    .from("students")
    .select("id, full_name, grade_level, parent_id, is_active")
    .not("parent_id", "is", null)
    .eq("is_active", true)
    .limit(500);
  if (error) throw error;

  /** @type {object[]} */
  const scans = [];
  /** @type {object|null} */
  let matched = null;

  for (const st of students || []) {
    try {
      const loaded = await loadStudentReport(supabase, st, RANGE);
      const row = {
        studentId: st.id,
        fullName: st.full_name,
        parentId: st.parent_id,
        ...loaded.summary,
        matchesOwnerFingerprint: fingerprintMatch(loaded.summary),
      };
      scans.push(row);
      if (row.matchesOwnerFingerprint && !matched) {
        matched = { student: st, ...loaded };
      }
    } catch (err) {
      scans.push({ studentId: st.id, fullName: st.full_name, error: String(err?.message || err) });
    }
  }

  const close214 = scans
    .filter((s) => s.totalQuestions)
    .sort((a, b) => Math.abs((a.totalQuestions || 0) - 214) - Math.abs((b.totalQuestions || 0) - 214))
    .slice(0, 20);

  let target = matched;
  if (!target) {
    const best = close214[0];
    if (best?.studentId) {
      const st = (students || []).find((s) => s.id === best.studentId);
      if (st) target = { student: st, ...(await loadStudentReport(supabase, st, RANGE)) };
    }
  }

  /** @type {object[]} */
  const prodRows = [];
  /** @type {object[]} */
  const localRows = [];

  if (target?.student) {
    for (const utterance of QA_QUESTIONS) {
      const sessionId = `fix-qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let prodJson = {};
      try {
        const res = await fetch(`${PROD_ORIGIN}/api/parent/copilot-turn`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: target.student.id,
            utterance,
            sessionId,
            ...RANGE,
            payload: { version: 999, ignored: true },
          }),
          signal: AbortSignal.timeout(120_000),
        });
        prodJson = await res.json().catch(() => ({}));
        prodRows.push({
          utterance,
          httpStatus: res.status,
          ...extractRow(prodJson, target.summary),
        });
      } catch (err) {
        prodRows.push({ utterance, error: String(err?.message || err) });
      }

      await new Promise((r) => setTimeout(r, 1500));

      const localRes = await parentCopilot.runParentCopilotTurnAsync({
        audience: "parent",
        payload: target.detailed,
        utterance,
        sessionId: `${sessionId}-local`,
      });
      localRows.push({ utterance, ...extractRow(localRes, target.summary) });
    }
  }

  const forbiddenGrep = {
    magbil: prodRows.some((r) => /מגביל\s+כמה\s+ברורה/u.test(r.fullText || "")),
    circularAmbiguous: prodRows.some((r) => (r.fullText || "").includes("איפה רואים התקדמות") && r.ambiguous),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    status: "NOT_APPROVED — ready for owner re-test only",
    localGitHead: gitHead(),
    rangeUsed: RANGE,
    rangeNote: "Owner UI showed 26/05/2026–24/06/2026; API uses inclusive YYYY-MM-DD (same as computeReportRangeForParentApi custom path)",
    authAccount: identifier || "[redacted]",
    studentsScanned: scans.length,
    owner214Found: Boolean(matched),
    matchedStudent: matched
      ? { id: matched.student.id, name: matched.student.full_name, summary: matched.summary }
      : null,
    closestReports: close214,
    productionHttpResults: prodRows,
    localEngineResults: localRows,
    forbiddenChecks: forbiddenGrep,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outJson = path.join(OUT_DIR, "production-fix-qa-report.json");
  const outMd = path.join(OUT_DIR, "production-fix-qa-report.md");
  await writeFile(outJson, JSON.stringify(report, null, 2), "utf8");
  await writeFile(outMd, renderMd(report), "utf8");
  console.log(JSON.stringify({ ok: true, outJson, owner214Found: report.owner214Found, matched: report.matchedStudent?.id }, null, 2));
}

function renderMd(r) {
  const lines = [];
  lines.push("# Production Fix QA Report");
  lines.push("");
  lines.push(`**Status:** ${r.status}`);
  lines.push(`**Range:** ${r.rangeUsed.rangeFrom} – ${r.rangeUsed.rangeTo}`);
  lines.push(`**214q report found:** ${r.owner214Found ? "YES" : "NO"}`);
  if (r.matchedStudent) {
    lines.push(`**Matched:** ${r.matchedStudent.name} (${r.matchedStudent.id})`);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(r.matchedStudent.summary, null, 2));
    lines.push("```");
  } else {
    lines.push("");
    lines.push("## Closest reports scanned");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(r.closestReports, null, 2));
    lines.push("```");
  }
  lines.push("");
  lines.push("## Production HTTP (10 questions)");
  lines.push("");
  lines.push("| שאלה | status | ambiguous | NO_DATA | intent | תשובה (קצר) |");
  lines.push("| ---- | ------ | --------- | ------- | ------ | ----------- |");
  for (const row of r.productionHttpResults || []) {
    const prev = String(row.fullText || row.error || "").replace(/\s+/g, " ").slice(0, 80);
    lines.push(`| ${row.utterance} | ${row.httpStatus ?? "-"} | ${row.ambiguous ? "כן" : "לא"} | ${row.isNoData ? "כן" : "לא"} | ${row.intent ?? "-"} | ${prev} |`);
  }
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
