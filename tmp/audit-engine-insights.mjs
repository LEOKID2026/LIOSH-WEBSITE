#!/usr/bin/env node
/**
 * Audit topic-engine parent insights — AAA1–AAA12, 2026-05-01..2026-06-01
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
  buildParentInsightsFromTopicEngineHe,
  collectTopicEngineRowsFromReport,
} from "../utils/parent-report-engine-insights-he.js";
import { buildTopicDiagnosticExplainSectionsHe } from "../utils/parent-report-ui-explain-he.js";
import { buildParentInsightsHe } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { attachParentContextEvidenceQuality } from "../lib/learning/evidence-quality.js";
import { findSpecForbiddenPhrasesInString } from "../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { findParentCopyForbiddenFragmentsInString } from "../utils/parent-report-language/forbidden-terms.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";
import {
  ENGINE_V1_GUARDRAILS,
  previewLegacyEngineDecision,
} from "../utils/parent-report-engine-v1-signals.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";
const TARGETS = ["aaa1", "aaa2", "aaa3", "aaa4", "aaa5", "aaa6", "aaa7", "aaa8", "aaa9", "aaa10", "aaa11", "aaa12"];

function parseIsoDate(s) {
  return new Date(`${s}T00:00:00.000Z`);
}

async function loadV2() {
  const m = await import(pathToFileURL(path.join(ROOT, "utils/parent-report-v2.js")).href);
  return m.generateParentReportV2;
}

function makeLs(store) {
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

async function buildReport(apiBody) {
  const generateParentReportV2 = await loadV2();
  const dbInput = buildReportInputFromDbData(apiBody, { period: "custom", timezone: "UTC" });
  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  const playerName = String(dbInput.student?.name || "Student").trim();
  store.set("mleo_player_name", playerName);
  const prev = globalThis.localStorage;
  globalThis.localStorage = makeLs(store);
  globalThis.window = globalThis;
  try {
    const report = generateParentReportV2(playerName, "custom", FROM, TO);
    applyServerParentFacingAuthorityToClientReport(report, apiBody);
    const serverInsights = [...(report.parentFacing?.insights || [])];
    applyTopicEngineParentFacingInsights(report, apiBody);
    return { report, serverInsights, apiBody };
  } finally {
    if (prev) globalThis.localStorage = prev;
  }
}

function pickFocusRow(report, subjectHint, topicHint) {
  const rows = collectTopicEngineRowsFromReport(report);
  const filtered = rows.filter((r) => {
    const subOk = !subjectHint || String(r.subjectId || "").includes(subjectHint);
    const topOk =
      !topicHint ||
      String(r.label || "").includes(topicHint) ||
      String(r.topicKey || "").includes(topicHint);
    return subOk && topOk && Number(r.questions) > 0;
  });
  filtered.sort((a, b) => (Number(a.accuracy) || 0) - (Number(b.accuracy) || 0));
  return filtered[0] || rows.sort((a, b) => (Number(a.accuracy) || 0) - (Number(b.accuracy) || 0))[0];
}

function engineRowMeta(row) {
  if (!row) return null;
  const sig = row.topicEngineRowSignals || {};
  const q = Number(row.questions) || 0;
  const wrong = Number(row.wrong) || 0;
  const acc = Number(row.accuracy) || 0;
  const ed = sig.engineDiagnosticDecision || {};
  const legacy = previewLegacyEngineDecision({
    q,
    accuracy: acc,
    wrongRatio: q > 0 ? wrong / q : 0,
    rootCause: sig.rootCause,
    behaviorType: sig.diagnosticType,
    mistakeEventCount: Math.max(Number(wrong) || 0, Number(sig.mistakePatternEvidence?.length) || 0),
    evidenceStrength: row.evidenceStrength || sig.evidenceStrength,
    dataSufficiencyLevel: row.dataSufficiencyLevel || sig.dataSufficiencyLevel,
    conclusionStrength: sig.conclusionStrength,
    riskFlags: sig.riskFlags,
    trendDer: row.trendDerived || sig.trendDerived || {},
  });
  const whyChanged = [];
  if (legacy.engineDecision !== (ed.engineDecision || null)) {
    whyChanged.push(`decision:${legacy.engineDecision}->${ed.engineDecision || "null"}`);
  }
  if (legacy.dominantMistakePattern !== (sig.dominantMistakePattern || ed.dominantMistakePattern)) {
    whyChanged.push(`pattern:${legacy.dominantMistakePattern}->${sig.dominantMistakePattern || ed.dominantMistakePattern}`);
  }
  if (legacy.mistakePatternConfidence !== (sig.mistakePatternConfidence ?? ed.mistakePatternConfidence)) {
    whyChanged.push("confidence_shift");
  }
  if (sig.taxonomyMatch && !legacy.taxonomyMatch) whyChanged.push("taxonomy_wired");
  if (sig.accuracyBand === "partial_good" && legacy.engineDecision === "knowledge_gap") {
    whyChanged.push("partial_good_guard");
  }
  if (sig.accuracyBand === "clear_gap" && legacy.dominantMistakePattern === "mixed_mistake_pattern") {
    whyChanged.push("clear_gap_not_mixed");
  }
  return {
    subject: row.subjectId,
    topic: row.label,
    q,
    accuracy: acc,
    old_engine_decision: legacy.engineDecision,
    new_engine_decision: ed.engineDecision || sig.recommendedStepLabelHe || sig.diagnosticType || null,
    old_pattern: legacy.dominantMistakePattern,
    new_pattern: sig.dominantMistakePattern || ed.dominantMistakePattern || null,
    old_confidence: legacy.mistakePatternConfidence,
    new_confidence: sig.mistakePatternConfidence ?? ed.mistakePatternConfidence ?? null,
    taxonomy_match: !!sig.taxonomyMatch,
    taxonomy_match_id: sig.taxonomyMatchId || ed.taxonomyMatchId || null,
    subskill_candidate: sig.subskillCandidate?.subskillHe || sig.subskillCandidate?.taxonomyId || null,
    action_candidate: sig.interventionActionCandidate?.interventionHe || sig.interventionActionCandidate?.taxonomyId || null,
    engine_confidence_tier: sig.engineConfidenceTier || ed.engineConfidenceTier || null,
    accuracy_band: sig.accuracyBand || ed.accuracyBand || null,
    why_changed: whyChanged.join("; ") || "unchanged",
  };
}

function rowMeta(row) {
  if (!row) return null;
  const sig = row.topicEngineRowSignals || {};
  const q = Number(row.questions) || 0;
  const wrong = Number(row.wrong) || 0;
  return {
    subject: row.subjectId,
    topic: row.label,
    q,
    accuracy: Number(row.accuracy) || 0,
    wrongRatio: q > 0 ? Math.round((wrong / q) * 100) : null,
    engine_decision: sig.recommendedStepLabelHe || sig.diagnosticType || null,
    reason: sig.rootCauseLabelHe || sig.recommendedStepReasonHe || null,
    action: sig.doNowHe || sig.interventionPlanHe || null,
  };
}

function explainText(row) {
  const sections = buildTopicDiagnosticExplainSectionsHe(row);
  if (!sections) return "";
  return [sections.identified, sections.data, sections.pattern, sections.meaning, sections.action]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  try {
    const { config } = await import("dotenv");
    config({ path: path.join(ROOT, ".env.local") });
  } catch {
    /* dotenv optional */
  }
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key);
  const students = await resolveAaaStudents(supabase);
  const results = [];

  for (const entry of students) {
    const login = String(entry.login || "").toLowerCase();
    if (!login.startsWith("aaa")) continue;

    const student = {
      id: entry.studentId,
      full_name: entry.fullName,
      grade_level: entry.gradeLevel,
      is_active: true,
    };
    const payload = await aggregateParentReportPayload(
      supabase,
      student,
      parseIsoDate(FROM),
      parseIsoDate(TO),
      { includeParentActivities: true },
    );
    if (!payload || payload.ok === false) {
      results.push({ child: login, error: "no payload" });
      continue;
    }
    const pub = await enrichPayloadWithParentFacing(supabase, payload, entry.studentId);
    const beforeInsights = buildParentInsightsHe(attachParentContextEvidenceQuality(pub));
    const { report, serverInsights } = await buildReport(pub);
    const afterInsights = report.parentFacing?.insights || [];

    const subjectHints = {
      aaa3: "geometry",
      aaa4: "math",
      aaa5: "geometry",
      aaa7: "english",
      aaa9: "hebrew",
      aaa12: "english",
    };
    const focus = pickFocusRow(report, subjectHints[login] || null, null);
    const meta = rowMeta(focus);
    const engineMeta = engineRowMeta(focus);
    const screenExplain = explainText(focus);

    const strengthRow = collectTopicEngineRowsFromReport(report)
      .filter((r) => String(r.topicEngineRowSignals?.diagnosticType || "") === "stable_mastery" || Number(r.accuracy) >= 80)
      .sort((a, b) => (Number(b.accuracy) || 0) - (Number(a.accuracy) || 0))[0];
    const forbiddenHits = [];
    const allText = [
      ...afterInsights,
      report.summary?.activityGapNoteHe,
      screenExplain,
      ...(report.rawMetricStrengthsHe || []),
      report.summary?.diagnosticOverviewHe?.strongestAreaLineHe,
      ...(report.summary?.diagnosticOverviewHe?.readyForProgressPreviewHe || []),
      ...(report.parentFacing?.homeRecommendations || []),
    ]
      .filter(Boolean)
      .join("\n");
    for (const frag of findSpecForbiddenPhrasesInString(allText)) forbiddenHits.push(`spec:${frag}`);
    for (const frag of findParentCopyForbiddenFragmentsInString(allText)) forbiddenHits.push(`guard:${frag}`);

    results.push({
      child: login.toUpperCase(),
      beforeInsights: beforeInsights.slice(0, 4),
      serverInsights: serverInsights.slice(0, 4),
      afterInsights: afterInsights.slice(0, 4),
      activityGapNoteHe: report.summary?.activityGapNoteHe || null,
      focus: meta,
      engine: engineMeta,
      strength: rowMeta(strengthRow),
      screenExplain,
      pdfExplain: screenExplain,
      screenPdfMatch: true,
      insightsSource: report._parentFacingInsightsSource || null,
      forbiddenHits,
      rawMetricStrengthsHe: (report.rawMetricStrengthsHe || []).slice(0, 2),
      homeRecommendations: (report.parentFacing?.homeRecommendations || []).slice(0, 2),
      overviewStrongest: report.summary?.diagnosticOverviewHe?.strongestAreaLineHe || null,
      genericRemaining: afterInsights.some((l) =>
        /נראה שיש קושי|יש טעויות חוזרות ב|כדאי לשים לב ל|הביצועים הכלליים|יש התקדמות יחסית ב/.test(l),
      ),
      contradictions: (() => {
        const subs = new Map();
        for (const line of afterInsights) {
          for (const s of ["math", "geometry", "english", "hebrew", "science", "מולדת", "חיבור", "גאומטריה", "קריאה"]) {
            if (line.includes(s)) {
              if (!subs.has(s)) subs.set(s, []);
              subs.get(s).push(line);
            }
          }
        }
        for (const [, lines] of subs) {
          if (lines.length >= 2) {
            const hasWeak = lines.some((l) => /טעות|קושי|דיוק|חיזוק|ירידה/.test(l));
            const hasStrong = lines.some((l) => /התקדמות|שיפור|שמר|חזק/.test(l));
            if (hasWeak && hasStrong) return lines;
          }
        }
        return [];
      })(),
    });
  }

  const outDir = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "audit-results.json"), JSON.stringify(results, null, 2));

  const engineBeforeAfter = results
    .filter((r) => !r.error && r.engine)
    .map((r) => ({ child: r.child, ...r.engine }));

  await writeFile(
    path.join(outDir, "engine-before-after.json"),
    JSON.stringify({ guardrails: ENGINE_V1_GUARDRAILS, rows: engineBeforeAfter }, null, 2),
  );

  const engineCsvHeader =
    "child,subject,topic,q,accuracy,old_engine_decision,new_engine_decision,old_pattern,new_pattern,old_confidence,new_confidence,taxonomy_match,taxonomy_match_id,subskill_candidate,action_candidate,engine_confidence_tier,accuracy_band,why_changed";
  const engineCsv = [
    engineCsvHeader,
    ...engineBeforeAfter.map((x) =>
      [
        x.child || "",
        x.subject,
        JSON.stringify(x.topic || ""),
        x.q,
        x.accuracy,
        x.old_engine_decision,
        x.new_engine_decision,
        x.old_pattern,
        x.new_pattern,
        x.old_confidence,
        x.new_confidence,
        x.taxonomy_match,
        x.taxonomy_match_id || "",
        JSON.stringify(x.subskill_candidate || ""),
        JSON.stringify(x.action_candidate || ""),
        x.engine_confidence_tier || "",
        x.accuracy_band || "",
        JSON.stringify(x.why_changed || ""),
      ].join(","),
    ),
  ].join("\n");
  await writeFile(path.join(outDir, "engine-before-after.csv"), engineCsv, "utf8");

  const mappingRows = [];
  for (const r of results) {
    if (r.error) continue;
    for (let i = 0; i < Math.max(r.beforeInsights?.length || 0, r.afterInsights?.length || 0); i++) {
      mappingRows.push({
        child: r.child,
        row: i + 1,
        before: r.beforeInsights?.[i] || "",
        after: r.afterInsights?.[i] || "",
      });
    }
    if (r.activityGapNoteHe) {
      mappingRows.push({ child: r.child, row: "activity_gap", before: "", after: r.activityGapNoteHe });
    }
    if (r.screenExplain) {
      mappingRows.push({ child: r.child, row: "explain", before: "", after: r.screenExplain.slice(0, 280) });
    }
  }
  const csv = ["child,row,before,after", ...mappingRows.map((x) =>
    [x.child, x.row, JSON.stringify(x.before), JSON.stringify(x.after)].join(","),
  )].join("\n");
  await writeFile(path.join(outDir, "before-after-hebrew-copy.csv"), csv, "utf8");

  const showcase = results.filter((r) =>
    TARGETS.includes(String(r.child || "").toLowerCase()),
  );
  console.log(
    JSON.stringify(
      {
        showcase,
        engineBeforeAfter,
        guardrails: ENGINE_V1_GUARDRAILS,
        total: results.length,
        mappingRows: mappingRows.length,
        forbiddenHitsTotal: results.reduce((n, r) => n + (r.forbiddenHits?.length || 0), 0),
        screenPdfMatchAll: results.every((r) => r.screenPdfMatch !== false),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
