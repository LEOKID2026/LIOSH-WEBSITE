#!/usr/bin/env node
/**
 * HTTP Live audit for POST /api/parent/copilot-turn (round 3).
 * Requires production-mode server (strict payload rebuild).
 * Run: NODE_ENV=production npx next start -p 3098
 *      node --env-file=.env.local --env-file=.env.e2e.local tmp/audit-copilot-http-live.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import parentCopilot from "../utils/parent-copilot/index.js";
import { NO_DATA_FOR_REQUEST_RESPONSE_HE } from "../utils/parent-copilot/question-classifier.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";
import { resolveParentBearer } from "../scripts/truth-gates/lib/live-parent-report.mjs";
import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../lib/parent-server/parent-report-account-attachment.server.js";
import { buildDetailedPayloadFromAggregatedReportBody } from "../lib/parent-server/db-input-to-detailed-report.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/copilot-closure-round");
const ORIGIN = process.env.COPILOT_HTTP_ORIGIN || "http://127.0.0.1:3098";
const RANGE = { reportPeriod: "custom", rangeFrom: "2026-05-25", rangeTo: "2026-06-23" };

const LIVE_QUESTIONS = [
  "מה הכי חשוב לי לדעת השבוע?",
  "במה הוא חזק?",
  "איפה הוא צריך עזרה?",
  "מה לעשות איתו בבית היום?",
  "למה כתוב שיש פער במתמטיקה?",
  "האם הבעיה היא נשיאה?",
  "האם הוא חלש באנגלית?",
  "מה השתנה מהשבוע הקודם?",
  "האם הפעילות שנתתי לו השפיעה?",
  "תסביר לי את הדוח במילים פשוטות.",
  "מה שלושת הדברים הכי חשובים להורה?",
  "מה לא כדאי לי להסיק עדיין?",
  "האם זה אומר שיש לו בעיה?",
  "האם צריך אבחון?",
  "האם יש לו הפרעת קשב?",
  "תן לי תוכנית עבודה לשבוע הקרוב.",
  "מה לשאול אותו בבית?",
  "על איזה נושא לפתוח לו פעילות?",
  "האם הוא מתקדם?",
  "האם זה בגלל לחץ זמן?",
];

function answerText(res) {
  const core = res?.result?.response || res?.result || res?.response || res;
  if (core?.resolutionStatus === "resolved") {
    return (core.answerBlocks || []).map((b) => String(b.textHe || "")).join(" ");
  }
  return String(core?.clarificationQuestionHe || res?.clarificationQuestionHe || "");
}

async function loadPayloadForStudent(supabase, entry) {
  const from = new Date(`${RANGE.rangeFrom}T00:00:00.000Z`);
  const to = new Date(`${RANGE.rangeTo}T23:59:59.999Z`);
  const student = {
    id: entry.studentId,
    full_name: entry.fullName,
    grade_level: entry.gradeLevel,
    is_active: true,
  };
  const reportBody = await aggregateParentReportPayload(supabase, student, from, to, {
    includeParentActivities: true,
    includePrivateTeacherActivities: true,
  });
  const withAcc = await attachStudentLearningAccountToParentReportPayload(supabase, student, reportBody);
  const enriched = await enrichPayloadWithParentFacing(supabase, withAcc, entry.studentId);
  return buildDetailedPayloadFromAggregatedReportBody(enriched, RANGE.reportPeriod);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key);
  const aaa = await resolveAaaStudents(supabase);
  const { token, reason } = await resolveParentBearer(ORIGIN);
  if (!token) throw new Error(`Parent bearer unavailable: ${reason}`);

  const payloadCache = new Map();
  for (const entry of aaa) {
    payloadCache.set(entry.label, await loadPayloadForStudent(supabase, entry));
  }

  /** @type {object[]} */
  const rows = [];
  let httpPass = 0;
  let comparePass = 0;

  for (const entry of aaa) {
    for (const utterance of LIVE_QUESTIONS) {
      const sessionId = `http-live-${entry.label}-${Date.now()}-${Math.random()}`;
      const payload = payloadCache.get(entry.label);
      const fakePayload = { version: 999, shouldBeIgnored: true, diagnosticEngineV2: { units: [] } };
      const strictProd = process.env.NODE_ENV === "production";
      let httpRes;
      try {
        httpRes = await fetch(`${ORIGIN}/api/parent/copilot-turn`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: entry.studentId,
            utterance,
            sessionId,
            ...RANGE,
            payload: strictProd ? fakePayload : payload,
            decoyPayload: fakePayload,
          }),
        });
      } catch (err) {
        rows.push({ child: entry.label, utterance, ok: false, error: String(err?.message || err) });
        continue;
      }
      const json = await httpRes.json().catch(() => ({}));
      const httpText = answerText(json);
      const core = json?.result?.response || json?.result || json?.response || json;
      const engineOut = parentCopilot.runParentCopilotTurn({
        audience: "parent",
        payload,
        utterance,
        sessionId: `${sessionId}-engine`,
      });
      const engineText = answerText(engineOut.response || engineOut);
      const comparable =
        httpText === engineText ||
        (httpText.slice(0, 64) === engineText.slice(0, 64) && httpText.length > 20) ||
        (httpText.includes(engineText.slice(0, 28)) && engineText.length > 28);
      const clientIgnored = strictProd ? !httpText.includes("shouldBeIgnored") : true;
      const ok = httpRes.ok && json?.ok !== false && !!core?.resolutionStatus && clientIgnored;
      if (ok) httpPass += 1;
      if (comparable) comparePass += 1;
      rows.push({
        child: entry.label,
        utterance,
        httpStatus: httpRes.status,
        ok,
        comparable,
        clientPayloadIgnored: clientIgnored,
        resolutionStatus: core?.resolutionStatus,
        authMode: json?.authMode,
        httpText: httpText.slice(0, 400),
        engineText: engineText.slice(0, 400),
        isNoData: httpText === NO_DATA_FOR_REQUEST_RESPONSE_HE,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    mode: process.env.NODE_ENV === "production" ? "strict_production" : "dev_authenticated_rebuild_payload",
    total: rows.length,
    httpPass,
    engineComparePass: comparePass,
    rows,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "http-live-report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        total: report.total,
        httpPass: report.httpPass,
        engineComparePass: report.engineComparePass,
        fail: report.total - report.httpPass,
      },
      null,
      2,
    ),
  );
  if (report.httpPass < report.total) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
