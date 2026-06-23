#!/usr/bin/env node
/** Stage 3 read-only — subskill block breakdown across AAA rows */
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { buildReportInputFromDbData } from "../lib/learning-supabase/report-data-adapter.js";
import { seedLocalStorageFromDbReportInput } from "../lib/learning-supabase/seed-db-report-local-storage.js";
import { applyServerParentFacingAuthorityToClientReport } from "../lib/parent-server/parent-facing-report-authority.js";
import {
  applyTopicEngineParentFacingInsights,
  collectTopicEngineRowsFromReport,
} from "../utils/parent-report-engine-insights-he.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";
import { splitTopicRowKey } from "../utils/parent-report-row-diagnostics.js";
import { resolveRowTaxonomyMatch } from "../utils/parent-report-engine-taxonomy-bridge.js";
import { taxonomyIdsForReportBucket } from "../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { computeAccuracyBand } from "../utils/parent-report-engine-v1-signals.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";

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

function safeJsonArray(store, key) {
  try {
    const raw = store.get(key);
    if (!raw) return [];
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function mistakesInDateRange(arr, startMs, endMs) {
  return (Array.isArray(arr) ? arr : []).filter((m) => {
    const t = m?.timestamp ?? m?.ts ?? m?.createdAt;
    const ms = typeof t === "number" ? t : t ? Date.parse(t) : NaN;
    return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
  });
}

function reasonNoSubskill(taxonomy, row, sig) {
  if (sig?.subskillCandidate || taxonomy?.subskillCandidate) return "has_subskill";
  const code = taxonomy?.classificationReasonCode;
  const ev = taxonomy?.evidenceFlags || {};
  const q = Number(row?.questions) || 0;
  const band = sig?.accuracyBand || computeAccuracyBand(Number(row?.accuracy) || 0, q);
  if (code === "no_taxonomy_mapping") return "no_taxonomy_mapping";
  if (ev.noRawMistakeEvents) return "no_raw_mistake_events";
  if (ev.missingMetadata) return "missing_metadata";
  if (code === "weak_taxonomy_fallback_blocked" || taxonomy?.matchStrength === "weak") {
    return "weak_taxonomy_fallback_blocked";
  }
  if (taxonomy?.matchStrength === "moderate") return "moderate_not_strong";
  if (band === "partial_good" || band === "mastery") return "not_weakness_row";
  if (q < 5) return "low_q";
  if (code === "taxonomy_not_matched") return "taxonomy_not_matched";
  return "unknown";
}

async function main() {
  try {
    const { config } = await import("dotenv");
    config({ path: path.join(ROOT, ".env.local") });
  } catch {
    /* optional */
  }
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const generateParentReportV2 = (await import("../utils/parent-report-v2.js")).generateParentReportV2;
  const supabase = createClient(url, key);
  const students = await resolveAaaStudents(supabase);
  const startMs = parseIsoDate(FROM).getTime();
  const endMs = parseIsoDate(TO).getTime() + 86400000 - 1;

  /** @type {Record<string, object>} */
  const bySubject = {};
  /** @type {Record<string, number>} */
  const reasonGlobal = {};
  /** @type {Record<string, number>} */
  const engineDecisionCounts = {};
  /** @type {Record<string, number>} */
  const qRangeCounts = {};

  for (const entry of students) {
    const login = String(entry.login || "").toLowerCase();
    if (!login.startsWith("aaa")) continue;

    const payload = await aggregateParentReportPayload(
      supabase,
      { id: entry.studentId, full_name: entry.fullName, grade_level: entry.gradeLevel, is_active: true },
      parseIsoDate(FROM),
      parseIsoDate(TO),
      { includeParentActivities: true },
    );
    if (!payload || payload.ok === false) continue;
    const pub = await enrichPayloadWithParentFacing(supabase, payload, entry.studentId);
    const dbInput = buildReportInputFromDbData(pub, { period: "custom", timezone: "UTC" });
    const store = new Map();
    seedLocalStorageFromDbReportInput(store, dbInput);
    store.set("mleo_player_name", String(dbInput.student?.name || "Student").trim());
    const prev = globalThis.localStorage;
    globalThis.localStorage = makeLs(store);
    globalThis.window = globalThis;
    let report;
    const rawMistakesBySubject = {};
    try {
      report = generateParentReportV2(String(dbInput.student?.name || "Student").trim(), "custom", FROM, TO);
      applyServerParentFacingAuthorityToClientReport(report, pub);
      applyTopicEngineParentFacingInsights(report, pub);
      rawMistakesBySubject.math = mistakesInDateRange(safeJsonArray(store, "mleo_mistakes"), startMs, endMs);
      rawMistakesBySubject.geometry = mistakesInDateRange(
        safeJsonArray(store, "mleo_geometry_mistakes"),
        startMs,
        endMs,
      );
      rawMistakesBySubject.english = mistakesInDateRange(
        safeJsonArray(store, "mleo_english_mistakes"),
        startMs,
        endMs,
      );
      rawMistakesBySubject.science = mistakesInDateRange(
        safeJsonArray(store, "mleo_science_mistakes"),
        startMs,
        endMs,
      );
      rawMistakesBySubject.hebrew = mistakesInDateRange(safeJsonArray(store, "mleo_hebrew_mistakes"), startMs, endMs);
      rawMistakesBySubject["moledet-geography"] = mistakesInDateRange(
        safeJsonArray(store, "mleo_moledet_geography_mistakes"),
        startMs,
        endMs,
      );
    } finally {
      if (prev) globalThis.localStorage = prev;
    }

    const mapBySubject = {
      math: report.mathOperations,
      geometry: report.geometryTopics,
      english: report.englishTopics,
      science: report.scienceTopics,
      hebrew: report.hebrewTopics,
      "moledet-geography": report.moledetGeographyTopics,
    };

    for (const row of collectTopicEngineRowsFromReport(report)) {
      const sid = row.subjectId;
      if (!bySubject[sid]) {
        bySubject[sid] = {
          subject: sid,
          totalRows: 0,
          rowsWithTaxonomyCandidates: 0,
          rowsWithStrongTaxonomy: 0,
          rowsBlockedMissingMetadata: 0,
          rowsBlockedNoRawMistakeEvents: 0,
          rowsBlockedNotWeaknessRow: 0,
          rowsBlockedLowQ: 0,
          rowsBlockedWeakTaxonomy: 0,
          rowsSubskillSafeIfMetadataExisted: 0,
          rowsWithSubskill: 0,
        };
      }
      const b = bySubject[sid];
      b.totalRows += 1;

      const mapRow = mapBySubject[sid]?.[row.topicKey] || {};
      const { bucketKey } = splitTopicRowKey(row.topicKey);
      const afterIds = taxonomyIdsForReportBucket(sid, bucketKey);
      if (afterIds.length > 0) b.rowsWithTaxonomyCandidates += 1;

      const taxonomy = resolveRowTaxonomyMatch({
        subjectId: sid,
        topicRowKey: row.topicKey,
        row: mapRow,
        rawMistakes: rawMistakesBySubject[sid] || [],
        startMs,
        endMs,
      });
      const sig = row.topicEngineRowSignals || {};
      const ed = sig.engineDiagnosticDecision || {};
      const q = Number(row.questions) || 0;

      if (taxonomy.matchStrength === "strong") b.rowsWithStrongTaxonomy += 1;
      if (taxonomy.evidenceFlags?.missingMetadata) b.rowsBlockedMissingMetadata += 1;
      if (taxonomy.evidenceFlags?.noRawMistakeEvents) b.rowsBlockedNoRawMistakeEvents += 1;
      if (taxonomy.subskillCandidate) b.rowsWithSubskill += 1;

      const reason = reasonNoSubskill(taxonomy, row, sig);
      reasonGlobal[reason] = (reasonGlobal[reason] || 0) + 1;
      if (reason === "not_weakness_row") b.rowsBlockedNotWeaknessRow += 1;
      if (reason === "low_q") b.rowsBlockedLowQ += 1;
      if (reason === "weak_taxonomy_fallback_blocked") b.rowsBlockedWeakTaxonomy += 1;

      if (
        taxonomy.matchStrength === "strong" &&
        taxonomy.wrongEventCount > 0 &&
        taxonomy.evidenceFlags?.missingMetadata
      ) {
        b.rowsSubskillSafeIfMetadataExisted += 1;
      }

      const edKey = String(ed.engineDecision || sig.engineDecision || "unknown");
      engineDecisionCounts[edKey] = (engineDecisionCounts[edKey] || 0) + 1;

      const qKey = q < 5 ? "1-4" : q < 10 ? "5-9" : q < 20 ? "10-19" : q < 50 ? "20-49" : q < 100 ? "50-99" : "100+";
      qRangeCounts[qKey] = (qRangeCounts[qKey] || 0) + 1;
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    period: { from: FROM, to: TO },
    bySubject: Object.values(bySubject).sort((a, b) => a.subject.localeCompare(b.subject)),
    reasonGlobal,
    engineDecisionCounts,
    qRangeCounts,
  };

  const outDir = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "stage3-capability-breakdown.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
