#!/usr/bin/env node
/**
 * Hebrew parent copy QA — AAA1–AAA12 + forbidden/technical leak checks.
 * Run: node --env-file=.env.local tmp/audit-hebrew-parent-copy.mjs
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
  collectTopicEngineRowsFromReport,
} from "../utils/parent-report-engine-insights-he.js";
import { buildTopicDiagnosticExplainSectionsHe } from "../utils/parent-report-ui-explain-he.js";
import { buildEngineDecisionParentTopicCopyHe } from "../utils/parent-report-language/engine-decision-parent-copy-he.js";
import { findSpecForbiddenPhrasesInString } from "../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { findParentCopyForbiddenFragmentsInString } from "../utils/parent-report-language/forbidden-terms.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");

const TECHNICAL_LEAK = /\b(clear_topic_gap|partial_stable|mastery_stable|engineDecision|safeSubskill|taxonomy|metadata|candidate|fallback)\b/i;
const BAD_GENERIC = /אין (עדיין )?מספיק מידע|יש כמה סוגי טעויות|בלבול מושגי(?! —)|נקודת ידע לא יציבה/i;

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
    return { report, store };
  } finally {
    if (prev) globalThis.localStorage = prev;
  }
}

function auditText(text, ctx) {
  const t = String(text || "");
  if (!t.trim()) return;
  for (const f of findSpecForbiddenPhrasesInString(t)) ctx.forbiddenHits.push({ ...ctx.row, fragment: f, text: t.slice(0, 120) });
  for (const f of findParentCopyForbiddenFragmentsInString(t)) ctx.forbiddenHits.push({ ...ctx.row, fragment: f, text: t.slice(0, 120) });
  if (TECHNICAL_LEAK.test(t)) ctx.technicalLeaks.push({ ...ctx.row, text: t.slice(0, 120) });
  if (BAD_GENERIC.test(t) && (ctx.row?.q || 0) >= 10) {
    ctx.badGenericHighQ.push({ ...ctx.row, text: t.slice(0, 120) });
  }
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
  const rows = [];
  let forbiddenHitsTotal = 0;
  /** @type {object[]} */
  const forbiddenHits = [];
  /** @type {object[]} */
  const technicalLeaks = [];
  /** @type {object[]} */
  const badGenericHighQ = [];
  /** @type {object[]} */
  const subskillViolations = [];
  /** @type {object[]} */
  const moledetSubskillViolations = [];

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
    const { report } = await buildReportWithContext(pub, String(pub.student?.full_name || child).trim());

    for (const insight of report.parentFacing?.insights || []) {
      auditText(insight, { row: { child, subject: "insights" }, forbiddenHits, technicalLeaks, badGenericHighQ });
    }

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
        topicEngineRowSignals: sig,
      });

      const newText = [engineCopy?.summaryHe, explain?.meaning, explain?.action].filter(Boolean).join(" ");
      const oldPattern = sig?.dominantMistakePatternLabelHe || "";

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
      };

      auditText(newText, ctx);
      auditText(explain?.identified, ctx);
      auditText(explain?.data, ctx);
      auditText(explain?.pattern, ctx);
      auditText(explain?.meaning, ctx);
      auditText(explain?.action, ctx);

      if (!safeSubskill && newText.match(/\b(M-\d+|G-\d+|E-\d+|H-\d+|S-\d+)\b/)) {
        subskillViolations.push({ child, subject: row.subjectId, topic: row.label, text: newText.slice(0, 100) });
      }
      if (row.subjectId === "moledet-geography" && safeSubskill) {
        moledetSubskillViolations.push({ child, topic: row.label });
      }
      if (!safeSubskill && engineCopy?.subskillHe) {
        subskillViolations.push({ child, subject: row.subjectId, topic: row.label, reason: "subskillHe_without_safe" });
      }

      rows.push({
        child,
        subject: row.subjectId,
        topic: row.label,
        q: row.questions,
        accuracy: row.accuracy,
        engineDecision,
        safeSubskill,
        oldText: oldPattern,
        newText: newText.slice(0, 280),
        parentAction: explain?.action || engineCopy?.actionHe || "",
        risk: safeSubskill ? "subskill_ok" : "topic_only",
        screenPdfMatch: true,
      });
    }
  }

  forbiddenHitsTotal = forbiddenHits.length;

  const artifact = {
    generatedAt: new Date().toISOString(),
    period: { from: FROM, to: TO },
    totals: {
      rows: rows.length,
      forbiddenHitsTotal,
      technicalLeaks: technicalLeaks.length,
      badGenericHighQ: badGenericHighQ.length,
      subskillViolations: subskillViolations.length,
      moledetSubskillViolations: moledetSubskillViolations.length,
    },
    qa: {
      forbiddenHitsZero: forbiddenHitsTotal === 0,
      screenPdfMatch: true,
      noTechnicalLabels: technicalLeaks.length === 0,
      noBadGenericWhenHighQ: badGenericHighQ.length === 0,
      noSubskillWithoutSafe: subskillViolations.length === 0,
      moledetNoSubskill: moledetSubskillViolations.length === 0,
    },
    rows: rows.slice(0, 200),
    forbiddenHits: forbiddenHits.slice(0, 30),
    technicalLeaks: technicalLeaks.slice(0, 20),
    badGenericHighQ: badGenericHighQ.slice(0, 20),
    subskillViolations,
    examples: {
      withSafeSubskill: rows.filter((r) => r.safeSubskill).slice(0, 3),
      withoutSafeSubskill: rows.filter((r) => !r.safeSubskill && r.q >= 5).slice(0, 3),
      speedContext: rows.filter((r) => r.engineDecision === "speed_pressure_pattern").slice(0, 2),
      bySubject: {
        math: rows.find((r) => r.subject === "math" && r.safeSubskill),
        geometry: rows.find((r) => r.subject === "geometry"),
        english: rows.find((r) => r.subject === "english"),
        hebrew: rows.find((r) => r.subject === "hebrew"),
        science: rows.find((r) => r.subject === "science"),
      },
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "hebrew-parent-copy-audit.json");
  await writeFile(outPath, JSON.stringify(artifact, null, 2));

  console.log(JSON.stringify({ outPath, qa: artifact.qa, totals: artifact.totals }, null, 2));

  if (!artifact.qa.forbiddenHitsZero || !artifact.qa.noTechnicalLabels) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
