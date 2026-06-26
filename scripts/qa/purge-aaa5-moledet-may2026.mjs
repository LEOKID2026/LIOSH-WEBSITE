#!/usr/bin/env node
/**
 * Remove AAA5 moledet/geography practice for May 2026 only (parent promo video).
 *   node --env-file=.env.local scripts/qa/purge-aaa5-moledet-may2026.mjs
 *   node --env-file=.env.local scripts/qa/purge-aaa5-moledet-may2026.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { resolveAaaStudents } from "./lib/parent-aaa-qa-constants.mjs";
import { subjectQuestionCountsFromPayload } from "../../utils/parent-report-language/subject-evidence-policy.js";
import {
  aggregateParentReportPayload,
  stripInternalReportPayloadFields,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../../lib/parent-server/parent-report-parent-facing.server.js";
import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import { parseIsoDate } from "./lib/parent-aaa-qa-constants.mjs";

const FROM = "2026-05-01";
const TO = "2026-05-31";
const MOLEDET_SUBJECTS = new Set([
  "moledet_geography",
  "moledet-geography",
  "moledet",
  "geography",
]);

function isMoledetPayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  const sub = String(p.subject || p.subjectId || "").trim().toLowerCase();
  if (!sub) return false;
  if (sub === "geometry") return false;
  return MOLEDET_SUBJECTS.has(sub) || sub.includes("moledet");
}

function isMoledetSessionSubject(subject) {
  const sub = String(subject || "").trim().toLowerCase();
  if (!sub) return false;
  if (sub === "geometry") return false;
  return MOLEDET_SUBJECTS.has(sub) || sub.includes("moledet");
}

async function verifyReport(supabase, studentId, fullName, grade) {
  const student = {
    id: studentId,
    full_name: fullName,
    grade_level: `g${grade}`,
    is_active: true,
  };
  const raw = await aggregateParentReportPayload(
    supabase,
    student,
    parseIsoDate(FROM),
    parseIsoDate(TO),
    { includeParentActivities: true }
  );
  const enriched = await enrichPayloadWithParentFacing(
    supabase,
    attachParentContextEvidenceQuality(structuredClone(raw)),
    studentId
  );
  const pub = stripInternalReportPayloadFields(structuredClone(enriched));
  const counts = subjectQuestionCountsFromPayload(pub);
  return counts["moledet-geography"] ?? 0;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const students = await resolveAaaStudents(supabase);
  const aaa5 = students.find((s) => s.label === "AAA5");
  if (!aaa5) throw new Error("AAA5 not found");

  const { data: answers, error: ansErr } = await supabase
    .from("answers")
    .select("id, learning_session_id, answer_payload, answered_at")
    .eq("student_id", aaa5.studentId)
    .gte("answered_at", `${FROM}T00:00:00.000Z`)
    .lte("answered_at", `${TO}T23:59:59.999Z`);
  if (ansErr) throw ansErr;

  const moledetAnswers = (answers || []).filter((row) => isMoledetPayload(row.answer_payload));
  const moledetAnswerIds = moledetAnswers.map((r) => r.id);
  const sessionIdsFromAnswers = [
    ...new Set(moledetAnswers.map((r) => r.learning_session_id).filter(Boolean)),
  ];

  const { data: sessions, error: sessErr } = await supabase
    .from("learning_sessions")
    .select("id, subject, started_at")
    .eq("student_id", aaa5.studentId)
    .gte("started_at", `${FROM}T00:00:00.000Z`)
    .lte("started_at", `${TO}T23:59:59.999Z`);
  if (sessErr) throw sessErr;

  const moledetSessionIds = (sessions || [])
    .filter((s) => isMoledetSessionSubject(s.subject))
    .map((s) => s.id);
  const sessionIdsToDelete = [...new Set([...sessionIdsFromAnswers, ...moledetSessionIds])];

  const beforeMoledetQ = await verifyReport(
    supabase,
    aaa5.studentId,
    aaa5.fullName,
    aaa5.grade
  );

  console.log(
    JSON.stringify(
      {
        dryRun,
        student: "AAA5",
        studentId: aaa5.studentId,
        range: { from: FROM, to: TO },
        beforeReportMoledetQ: beforeMoledetQ,
        moledetAnswersToDelete: moledetAnswerIds.length,
        moledetSessionsToDelete: sessionIdsToDelete.length,
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log("Dry run — no rows deleted.");
    return;
  }

  if (moledetAnswerIds.length) {
    const { error } = await supabase.from("answers").delete().in("id", moledetAnswerIds);
    if (error) throw error;
  }

  for (const sessionId of sessionIdsToDelete) {
    const { count, error: remainErr } = await supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("learning_session_id", sessionId);
    if (remainErr) throw remainErr;
    if ((count ?? 0) > 0) continue;

    const { error: delSessErr } = await supabase
      .from("learning_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("student_id", aaa5.studentId);
    if (delSessErr) throw delSessErr;
  }

  const afterMoledetQ = await verifyReport(
    supabase,
    aaa5.studentId,
    aaa5.fullName,
    aaa5.grade
  );

  console.log(
    JSON.stringify(
      {
        deletedAnswers: moledetAnswerIds.length,
        deletedSessionsAttempted: sessionIdsToDelete.length,
        afterReportMoledetQ: afterMoledetQ,
        ok: afterMoledetQ === 0,
      },
      null,
      2
    )
  );

  if (afterMoledetQ !== 0) {
    throw new Error(`AAA5 still has ${afterMoledetQ} moledet-geography questions in report`);
  }
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
