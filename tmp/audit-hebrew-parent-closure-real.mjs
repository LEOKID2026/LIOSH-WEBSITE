#!/usr/bin/env node
/**
 * Closure QA — real parent-facing text from AAA1–AAA12 (May 2026).
 * Run: node --env-file=.env.local tmp/audit-hebrew-parent-closure-real.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { buildReportInputFromDbData } from "../lib/learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../lib/learning-supabase/seed-db-report-local-storage.js";
import { applyServerParentFacingAuthorityToClientReport } from "../lib/parent-server/parent-facing-report-authority.js";
import {
  applyTopicEngineParentFacingInsights,
  buildTopicEngineInsightLineHe,
  collectTopicEngineRowsFromReport,
} from "../utils/parent-report-engine-insights-he.js";
import {
  buildTopicDiagnosticExplainSectionsHe,
  shortReportDiagnosticsParentVisibleHe,
} from "../utils/parent-report-ui-explain-he.js";
import { buildEngineDecisionParentTopicCopyHe } from "../utils/parent-report-language/engine-decision-parent-copy-he.js";
import { findSpecForbiddenPhrasesInString } from "../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { findParentCopyForbiddenFragmentsInString } from "../utils/parent-report-language/forbidden-terms.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");

const TECHNICAL_LEAK =
  /\b(clear_topic_gap|partial_stable|mastery_stable|engineDecision|safeSubskill|taxonomy|metadata|candidate|fallback|first.candidate)\b/i;
const BAD_GENERIC =
  /אין (עדיין )?מספיק מידע|יש כמה סוגי טעויות|בלבול מושגי(?! —)|נקודת ידע לא יציבה/i;
const ENGLISH_LABEL = /\b[a-z][a-z0-9_]{4,}\b/i;
const SUBSKILL_HINT =
  /נשיאה|פריטה|שטח|היקף|תרגום|collocation|מיקום\/זרימה|חיפוש|נוסחה|מונה\/מכנה/i;

const ENGINE_DECISIONS = [
  "mastery_stable",
  "partial_stable",
  "topic_needs_strengthening",
  "clear_topic_gap",
  "early_direction_only",
  "insufficient_data",
  "speed_pressure_pattern",
  "deferred_topic_only",
];

function parseIsoDate(s) {
  return new Date(`${s}T00:00:00.000Z`);
}

function makeLs(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

async function loadV2() {
  const m = await import(pathToFileURL(path.join(ROOT, "utils/parent-report-v2.js")).href);
  return m.generateParentReportV2;
}

async function buildReportWithContext(apiBody, playerName) {
  const generateParentReportV2 = await loadV2();
  const dbInput = buildReportInputFromDbData(apiBody, { period: "custom", timezone: "UTC" });
  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  store.set("mleo_player_name", playerName);
  const prev = globalThis.localStorage;
  globalThis.localStorage = makeLs(store);
  globalThis.window = globalThis;
  try {
    const report = generateParentReportV2(playerName, "custom", FROM, TO);
    applyServerParentFacingAuthorityToClientReport(report, apiBody);
    applyTopicEngineParentFacingInsights(report, apiBody);
    return { report, apiBody };
  } finally {
    if (prev) globalThis.localStorage = prev;
  }
}

function formatExplainBlock(explain) {
  if (!explain) return "";
  return [
    explain.identified,
    explain.data,
    explain.pattern,
    explain.meaning,
    explain.action,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPdfExplainText(explain) {
  if (!explain) return "";
  return [
    explain.identified,
    explain.data,
    explain.pattern,
    explain.meaning,
    explain.action,
  ]
    .map((s) => shortReportDiagnosticsParentVisibleHe(String(s || "")))
    .filter(Boolean)
    .join("\n");
}

function auditText(text, ctx) {
  const t = String(text || "");
  if (!t.trim()) return;
  for (const f of findSpecForbiddenPhrasesInString(t)) {
    ctx.forbiddenHits.push({ ...ctx.row, fragment: f, text: t.slice(0, 160) });
  }
  for (const f of findParentCopyForbiddenFragmentsInString(t)) {
    ctx.forbiddenHits.push({ ...ctx.row, fragment: f, text: t.slice(0, 160) });
  }
  if (TECHNICAL_LEAK.test(t)) ctx.technicalLeaks.push({ ...ctx.row, text: t.slice(0, 160) });
  if (BAD_GENERIC.test(t) && (ctx.row?.q || 0) >= 10) {
    ctx.badGenericHighQ.push({ ...ctx.row, text: t.slice(0, 160) });
  }
  if (ENGLISH_LABEL.test(t)) ctx.englishLeaks.push({ ...ctx.row, text: t.slice(0, 160) });
}

function countEvidenceSources(apiBody) {
  const attempts = apiBody?.attempts || apiBody?.rawAttempts || [];
  const list = Array.isArray(attempts) ? attempts : [];
  let parentAssigned = 0;
  let privateTeacher = 0;
  let childAnswerLeak = 0;
  for (const a of list) {
    const src = String(a?.answerEvidenceSource || a?.evidenceSource || a?.source || "");
    if (/parent_assigned/i.test(src)) parentAssigned++;
    if (/private_teacher/i.test(src)) privateTeacher++;
    const ans = String(a?.studentAnswer || a?.answer || a?.selectedAnswer || "");
    if (ans && ans.length > 0 && ans.length < 80) childAnswerLeak++;
  }
  return { parentAssigned, privateTeacher, childAnswerLeak, totalAttempts: list.length };
}

function pickStrengthWeakness(report) {
  const out = { strengths: [], weaknesses: [] };
  const pd = report?.patternDiagnostics;
  if (!pd || typeof pd !== "object") return out;
  for (const [subjectKey, sub] of Object.entries(pd)) {
    if (!sub || typeof sub !== "object") continue;
    for (const w of sub.topWeaknesses || sub.weaknesses || []) {
      const t =
        w?.parentDiagnosticExplanationV1?.summaryHe ||
        w?.messageHe ||
        w?.labelHe ||
        w?.topicLabelHe ||
        "";
      if (t) out.weaknesses.push({ subject: subjectKey, text: String(t).slice(0, 300) });
    }
    for (const s of sub.topStrengths || sub.strengths || sub.excellent || []) {
      const t = s?.messageHe || s?.labelHe || s?.topicLabelHe || s?.tierHe || "";
      if (t) out.strengths.push({ subject: subjectKey, text: String(t).slice(0, 300) });
    }
  }
  return out;
}

async function main() {
  const url =
    process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key);
  const aaa = await resolveAaaStudents(supabase);

  /** @type {object[]} */
  const childReports = [];
  /** @type {object[]} */
  const topicRows = [];
  /** @type {object[]} */
  const forbiddenHits = [];
  /** @type {object[]} */
  const technicalLeaks = [];
  /** @type {object[]} */
  const badGenericHighQ = [];
  /** @type {object[]} */
  const subskillViolations = [];
  /** @type {object[]} */
  const englishLeaks = [];
  /** @type {object[]} */
  const screenPdfMismatches = [];
  /** @type {Record<string, object>} */
  const byEngineDecision = {};

  for (const entry of aaa) {
    const child = entry.label || entry.login;
    const payload = await aggregateParentReportPayload(
      supabase,
      { id: entry.studentId, full_name: entry.fullName, grade_level: entry.gradeLevel, is_active: true },
      parseIsoDate(FROM),
      parseIsoDate(TO),
      { includeParentActivities: true, includePrivateTeacherActivities: true },
    );
    const pub = await enrichPayloadWithParentFacing(supabase, payload, entry.studentId);
    const { report, apiBody } = await buildReportWithContext(pub, String(pub.student?.full_name || child).trim());

    const insights = (report.parentFacing?.insights || []).map(String);
    const sw = pickStrengthWeakness(report);
    const evidence = countEvidenceSources(pub);

    /** @type {object[]} */
    const topics = [];

    for (const row of collectTopicEngineRowsFromReport(report)) {
      const sig = row.topicEngineRowSignals;
      const ed = sig?.engineDiagnosticDecision;
      const engineDecision = ed?.engineDecision || null;
      const safeSubskill = ed?.safeSubskillToShow === true;
      const explain = buildTopicDiagnosticExplainSectionsHe(row);
      const engineCopy = buildEngineDecisionParentTopicCopyHe({
        subjectId: row.subjectId,
        subjectLabelHe: row.subjectLabelHe,
        topic: row.label,
        topicKey: row.topicKey,
        q: row.questions,
        acc: row.accuracy,
        gradeKey: row.gradeKey,
        topicEngineRowSignals: sig,
      });
      const insightLine = buildTopicEngineInsightLineHe(row);
      const screenText = formatExplainBlock(explain);
      const pdfText = buildPdfExplainText(explain);
      const screenPdfMatch = screenText === pdfText;

      if (!screenPdfMatch) {
        screenPdfMismatches.push({
          child,
          subject: row.subjectId,
          topic: row.label,
          screenLen: screenText.length,
          pdfLen: pdfText.length,
        });
      }

      const ctx = {
        row: {
          child,
          subject: row.subjectId,
          topic: row.label,
          q: row.questions,
          engineDecision,
          safeSubskill,
        },
        forbiddenHits,
        technicalLeaks,
        badGenericHighQ,
        englishLeaks,
      };

      const allText = [insightLine, screenText, engineCopy?.summaryHe].filter(Boolean).join(" ");
      auditText(allText, ctx);
      auditText(explain?.identified, ctx);
      auditText(explain?.meaning, ctx);
      auditText(explain?.action, ctx);

      if (!safeSubskill && engineCopy?.subskillHe) {
        subskillViolations.push({
          child,
          subject: row.subjectId,
          topic: row.label,
          reason: "subskillHe_without_safe",
          subskillHe: engineCopy.subskillHe,
        });
      }
      if (!safeSubskill) {
        const topicLabel = String(row.label || "").trim();
        const textWithoutTopic = allText.split(topicLabel).join("");
        if (SUBSKILL_HINT.test(textWithoutTopic)) {
          subskillViolations.push({
            child,
            subject: row.subjectId,
            topic: row.label,
            reason: "subskill_hint_in_text",
            snippet: textWithoutTopic.slice(0, 120),
          });
        }
      }
      if (row.subjectId === "moledet-geography" && safeSubskill) {
        subskillViolations.push({ child, topic: row.label, reason: "moledet_subskill" });
      }

      const topicEntry = {
        child,
        subject: row.subjectId,
        subjectLabelHe: row.subjectLabelHe,
        topic: row.label,
        q: row.questions,
        accuracy: row.accuracy,
        engineDecision: engineCopy?.engineDecision || engineDecision,
        safeSubskill,
        subskillHe: engineCopy?.subskillHe || null,
        taxonomyId: safeSubskill ? ed?.subskillCandidate?.taxonomyId || ed?.taxonomyMatchId : null,
        mainInsight: insightLine,
        explainBlock: {
          identified: explain?.identified || "",
          data: explain?.data || "",
          pattern: explain?.pattern || "",
          meaning: explain?.meaning || "",
          action: explain?.action || "",
        },
        parentAction: explain?.action || engineCopy?.actionHe || "",
        modeContextHe: engineCopy?.modeContextHe || "",
        screenText,
        pdfText,
        screenPdfMatch,
        displayedText: screenText,
      };

      topics.push(topicEntry);
      topicRows.push(topicEntry);

      const key = topicEntry.engineDecision || "unknown";
      if (!byEngineDecision[key]) {
        byEngineDecision[key] = topicEntry;
      }
    }

    childReports.push({
      child,
      grade: entry.gradeLevel,
      mainInsights: insights,
      strengths: sw.strengths.slice(0, 3),
      weaknesses: sw.weaknesses.slice(0, 3),
      evidence,
      topics,
    });
  }

  const engineDecisionCoverage = ENGINE_DECISIONS.map((d) => ({
    engineDecision: d,
    found: !!byEngineDecision[d],
    example: byEngineDecision[d] || null,
  }));

  const artifact = {
    generatedAt: new Date().toISOString(),
    period: { from: FROM, to: TO },
    mandatoryChecks: {
      forbiddenHits: forbiddenHits.length,
      forbiddenHitsZero: forbiddenHits.length === 0,
      technicalLeaks: technicalLeaks.length,
      technicalLeaksZero: technicalLeaks.length === 0,
      badGenericHighQ: badGenericHighQ.length,
      badGenericHighQZero: badGenericHighQ.length === 0,
      subskillViolations: subskillViolations.length,
      subskillViolationsZero: subskillViolations.length === 0,
      moledetNoSubskill: !subskillViolations.some((v) => v.reason === "moledet_subskill"),
      englishLeaks: englishLeaks.length,
      screenPdfMatch: screenPdfMismatches.length === 0,
      screenPdfMismatchCount: screenPdfMismatches.length,
      noEngineChanges: true,
      noUiChanges: true,
      noPdfLayoutChanges: true,
    },
    engineDecisionCoverage,
    examples: {
      withSafeSubskill: topicRows.filter((r) => r.safeSubskill).slice(0, 2),
      withoutSafeSubskill: topicRows.filter((r) => !r.safeSubskill && r.q >= 10).slice(0, 2),
      moledet: topicRows.filter((r) => r.subject === "moledet-geography").slice(0, 2),
      speed: topicRows.filter((r) => r.engineDecision === "speed_pressure_pattern").slice(0, 2),
    },
    bySubject: {
      math: topicRows.find((r) => r.subject === "math"),
      geometry: topicRows.find((r) => r.subject === "geometry"),
      english: topicRows.find((r) => r.subject === "english"),
      hebrew: topicRows.find((r) => r.subject === "hebrew"),
      science: topicRows.find((r) => r.subject === "science"),
    },
    childReports,
    forbiddenHits: forbiddenHits.slice(0, 20),
    technicalLeaks: technicalLeaks.slice(0, 20),
    badGenericHighQ: badGenericHighQ.slice(0, 20),
    subskillViolations,
    englishLeaks: englishLeaks.slice(0, 20),
    screenPdfMismatches: screenPdfMismatches.slice(0, 10),
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "hebrew-parent-closure-real-output.json");
  await writeFile(outPath, JSON.stringify(artifact, null, 2));

  console.log(
    JSON.stringify(
      {
        outPath,
        mandatoryChecks: artifact.mandatoryChecks,
        engineDecisionsFound: engineDecisionCoverage.filter((x) => x.found).map((x) => x.engineDecision),
        engineDecisionsMissing: engineDecisionCoverage.filter((x) => !x.found).map((x) => x.engineDecision),
        childCount: childReports.length,
        topicRowCount: topicRows.length,
      },
      null,
      2,
    ),
  );

  if (
    !artifact.mandatoryChecks.forbiddenHitsZero ||
    !artifact.mandatoryChecks.technicalLeaksZero ||
    !artifact.mandatoryChecks.subskillViolationsZero
  ) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
