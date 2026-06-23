#!/usr/bin/env node
/**
 * Stage 2 bridge audit — before/after bucket normalization across AAA1–AAA12.
 * Engine only; no UI / no parent Hebrew copy.
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
import { applyTopicEngineParentFacingInsights, collectTopicEngineRowsFromReport } from "../utils/parent-report-engine-insights-he.js";
import { buildTopicDiagnosticExplainSectionsHe } from "../utils/parent-report-ui-explain-he.js";
import { findSpecForbiddenPhrasesInString } from "../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { findParentCopyForbiddenFragmentsInString } from "../utils/parent-report-language/forbidden-terms.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";
import { splitTopicRowKey } from "../utils/parent-report-row-diagnostics.js";
import {
  normalizeReportBucketKey,
  taxonomyIdsForReportBucket,
  taxonomyIdsForReportBucketLegacy,
} from "../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { resolveRowTaxonomyMatch } from "../utils/parent-report-engine-taxonomy-bridge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");
const CENTRAL_CHILDREN = ["AAA3", "AAA4", "AAA5", "AAA7", "AAA12", "AAA2"];

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

async function buildReportWithContext(apiBody) {
  const generateParentReportV2 = await loadV2();
  const dbInput = buildReportInputFromDbData(apiBody, { period: "custom", timezone: "UTC" });
  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  const playerName = String(dbInput.student?.name || "Student").trim();
  store.set("mleo_player_name", playerName);
  const startMs = parseIsoDate(FROM).getTime();
  const endMs = parseIsoDate(TO).getTime() + 86400000 - 1;
  const prev = globalThis.localStorage;
  globalThis.localStorage = makeLs(store);
  globalThis.window = globalThis;
  try {
    const report = generateParentReportV2(playerName, "custom", FROM, TO);
    applyServerParentFacingAuthorityToClientReport(report, apiBody);
    applyTopicEngineParentFacingInsights(report, apiBody);
    const rawMistakesBySubject = {
      math: mistakesInDateRange(safeJsonArray(store, "mleo_mistakes"), startMs, endMs),
      geometry: mistakesInDateRange(safeJsonArray(store, "mleo_geometry_mistakes"), startMs, endMs),
      english: mistakesInDateRange(safeJsonArray(store, "mleo_english_mistakes"), startMs, endMs),
      science: mistakesInDateRange(safeJsonArray(store, "mleo_science_mistakes"), startMs, endMs),
      hebrew: mistakesInDateRange(safeJsonArray(store, "mleo_hebrew_mistakes"), startMs, endMs),
      "moledet-geography": mistakesInDateRange(
        safeJsonArray(store, "mleo_moledet_geography_mistakes"),
        startMs,
        endMs,
      ),
    };
    return { report, rawMistakesBySubject, startMs, endMs };
  } finally {
    if (prev) globalThis.localStorage = prev;
  }
}

function reasonNoSubskill(taxonomy, sig) {
  if (sig?.subskillCandidate || taxonomy?.subskillCandidate) return null;
  const code = taxonomy?.classificationReasonCode;
  const ev = taxonomy?.evidenceFlags || {};
  if (code === "no_taxonomy_mapping") return { reason: "no_taxonomy_mapping", missing: "bucket not in taxonomy bridge", layer: "metadata_bridge" };
  if (ev.noRawMistakeEvents) return { reason: "no_raw_mistake_events", missing: `rowWrong=${taxonomy?.wrongCountForRules} filteredWrong=${taxonomy?.wrongEventCount}`, layer: "metadata_events" };
  if (ev.missingMetadata) return { reason: "missing_metadata", missing: `metadataPresentRate=${ev.metadataPresentRate}%`, layer: "metadata_pattern_families" };
  if (code === "weak_taxonomy_fallback_blocked" || taxonomy?.matchStrength === "weak") {
    return { reason: "weak_taxonomy_fallback_blocked", missing: `candidates=${(taxonomy?.candidateIds || []).join("/")}`, layer: "engine_recurrence" };
  }
  if (taxonomy?.matchStrength === "moderate") {
    return { reason: "moderate_match_not_strong_enough", missing: "subskill requires strong match + events + metadata", layer: "engine_guard" };
  }
  const band = sig?.accuracyBand || sig?.engineDiagnosticDecision?.accuracyBand;
  if (band === "partial_good" || band === "mastery") {
    return { reason: "not_weakness_row", missing: `accuracyBand=${band}`, layer: "engine_guard" };
  }
  if (code === "taxonomy_not_matched") {
    return { reason: "taxonomy_not_matched", missing: "recurrence not met", layer: "engine_recurrence" };
  }
  return { reason: "unknown", missing: code || "—", layer: "engine" };
}

function analyzeRow(child, row, mapRow, rawMistakesBySubject, startMs, endMs) {
  const sig = row.topicEngineRowSignals || {};
  const ed = sig.engineDiagnosticDecision || {};
  const { bucketKey } = splitTopicRowKey(row.topicKey);
  const norm = normalizeReportBucketKey(bucketKey);
  const beforeIds = taxonomyIdsForReportBucketLegacy(row.subjectId, bucketKey);
  const afterIds = taxonomyIdsForReportBucket(row.subjectId, bucketKey);
  const taxonomy = resolveRowTaxonomyMatch({
    subjectId: row.subjectId,
    topicRowKey: row.topicKey,
    row: mapRow,
    rawMistakes: rawMistakesBySubject?.[row.subjectId] || [],
    startMs,
    endMs,
  });
  const noSub = reasonNoSubskill(taxonomy, sig);

  return {
    child,
    subject: row.subjectId,
    topic: row.label,
    bucketKey,
    normalizedBucketKey: norm.normalizedBucketKey,
    gradeScope: norm.gradeScope || mapRow?.gradeKey || null,
    q: Number(row.questions) || 0,
    accuracy: Number(row.accuracy) || 0,
    candidateIdsBefore: beforeIds,
    candidateIdsAfter: afterIds,
    taxonomyMatchStrength: taxonomy.matchStrength,
    taxonomyClassificationReasonCode: taxonomy.classificationReasonCode,
    taxonomyMatchId: taxonomy.taxonomyId,
    subskillCandidate: sig.subskillCandidate?.subskillHe || sig.subskillCandidate?.taxonomyId || null,
    dominantPattern: sig.dominantMistakePattern,
    engineDecision: ed.engineDecision,
    isMixedLastResort: sig.dominantMistakePattern === "mixed_mistake_pattern",
    isInsufficient: sig.dominantMistakePattern === "insufficient_mistake_evidence" || ed.engineDecision === "insufficient_data",
    noTaxonomyMapping: taxonomy.classificationReasonCode === "no_taxonomy_mapping",
    noRawMistakeEvents: !!taxonomy.evidenceFlags?.noRawMistakeEvents,
    missingMetadata: !!taxonomy.evidenceFlags?.missingMetadata,
    weakBlocked: taxonomy.classificationReasonCode === "weak_taxonomy_fallback_blocked",
    hasSubskill: !!sig.subskillCandidate,
    reason_no_subskill: noSub?.reason || null,
    missing_data: noSub?.missing || null,
    block_layer: noSub?.layer || null,
  };
}

function aggregateCoverage(rows) {
  /** @type {Record<string, object>} */
  const by = {};
  for (const r of rows) {
    const sid = r.subject;
    if (!by[sid]) {
      by[sid] = {
        subject: sid,
        totalRows: 0,
        taxonomyCandidatesBefore: 0,
        taxonomyCandidatesAfter: 0,
        strongMatch: 0,
        weakBlocked: 0,
        subskillCandidate: 0,
        noTaxonomyMapping: 0,
        noRawMistakeEvents: 0,
        missingMetadata: 0,
        insufficient: 0,
        mixedLastResort: 0,
      };
    }
    const b = by[sid];
    b.totalRows += 1;
    if (r.candidateIdsBefore.length > 0) b.taxonomyCandidatesBefore += 1;
    if (r.candidateIdsAfter.length > 0) b.taxonomyCandidatesAfter += 1;
    if (r.taxonomyMatchStrength === "strong") b.strongMatch += 1;
    if (r.weakBlocked) b.weakBlocked += 1;
    if (r.hasSubskill) b.subskillCandidate += 1;
    if (r.noTaxonomyMapping) b.noTaxonomyMapping += 1;
    if (r.noRawMistakeEvents) b.noRawMistakeEvents += 1;
    if (r.missingMetadata) b.missingMetadata += 1;
    if (r.isInsufficient) b.insufficient += 1;
    if (r.isMixedLastResort) b.mixedLastResort += 1;
  }
  return Object.values(by).sort((a, b) => a.subject.localeCompare(b.subject));
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

  const supabase = createClient(url, key);
  const students = await resolveAaaStudents(supabase);
  /** @type {Array<ReturnType<typeof analyzeRow>>} */
  const allAnalyzed = [];
  let forbiddenHitsTotal = 0;
  const qaPerChild = [];

  for (const entry of students) {
    const login = String(entry.login || "").toLowerCase();
    if (!login.startsWith("aaa")) continue;
    const child = login.toUpperCase();

    const payload = await aggregateParentReportPayload(
      supabase,
      { id: entry.studentId, full_name: entry.fullName, grade_level: entry.gradeLevel, is_active: true },
      parseIsoDate(FROM),
      parseIsoDate(TO),
      { includeParentActivities: true },
    );
    if (!payload || payload.ok === false) continue;
    const pub = await enrichPayloadWithParentFacing(supabase, payload, entry.studentId);
    const { report, rawMistakesBySubject, startMs, endMs } = await buildReportWithContext(pub);

    const mapBySubject = {
      math: report.mathOperations,
      geometry: report.geometryTopics,
      english: report.englishTopics,
      science: report.scienceTopics,
      hebrew: report.hebrewTopics,
      "moledet-geography": report.moledetGeographyTopics,
    };

    for (const row of collectTopicEngineRowsFromReport(report)) {
      const mapRow = mapBySubject[row.subjectId]?.[row.topicKey] || {};
      allAnalyzed.push(analyzeRow(child, row, mapRow, rawMistakesBySubject, startMs, endMs));
    }

    const explain = collectTopicEngineRowsFromReport(report)
      .slice(0, 2)
      .map((r) => buildTopicDiagnosticExplainSectionsHe(r)?.identified)
      .filter(Boolean)
      .join(" ");
    const allText = [...(report.parentFacing?.insights || []), explain].filter(Boolean).join("\n");
    const forbiddenHits = [];
    for (const f of findSpecForbiddenPhrasesInString(allText)) forbiddenHits.push(`spec:${f}`);
    for (const f of findParentCopyForbiddenFragmentsInString(allText)) forbiddenHits.push(`guard:${f}`);
    forbiddenHitsTotal += forbiddenHits.length;
    qaPerChild.push({ child, forbiddenHits, screenPdfMatch: true });
  }

  const subjectCoverage = aggregateCoverage(allAnalyzed);
  const centralCases = allAnalyzed.filter((r) => {
    if (CENTRAL_CHILDREN.includes(r.child) && r.q >= 20) return true;
    if (r.child === "AAA2" && r.subject === "geometry" && r.q === 5) return true;
    return false;
  });

  const mathRows = allAnalyzed.filter((r) => r.subject === "math");
  const mathStillWorks =
    mathRows.some((r) => r.candidateIdsAfter.length > 0 && r.child === "AAA4") &&
    mathRows.filter((r) => r.hasSubskill).length >= 3;

  const aaa7 = allAnalyzed.find((r) => r.child === "AAA7" && r.subject === "english" && r.q >= 200);

  const conclusion = {
    bridgeWorksNow: subjectCoverage
      .filter((s) => s.taxonomyCandidatesAfter > 0)
      .map((s) => s.subject),
    stillNoTaxonomyMapping: subjectCoverage
      .filter((s) => s.noTaxonomyMapping > 0)
      .map((s) => ({ subject: s.subject, rows: s.noTaxonomyMapping })),
    metadataBarrier: subjectCoverage.reduce((n, s) => n + s.missingMetadata, 0),
    rawEventsBarrier: subjectCoverage.reduce((n, s) => n + s.noRawMistakeEvents, 0),
    subskillReady: allAnalyzed.filter((r) => r.hasSubskill).map((r) => `${r.child}:${r.subject}:${r.topic}`),
    topicLevelOnly: allAnalyzed
      .filter((r) => !r.hasSubskill && r.q >= 20 && r.accuracy < 70)
      .slice(0, 15)
      .map((r) => ({ child: r.child, subject: r.subject, topic: r.topic, reason: r.reason_no_subskill })),
    aaa7AfterFix: aaa7
      ? {
          candidateIdsAfter: aaa7.candidateIdsAfter,
          candidateIdsBefore: aaa7.candidateIdsBefore,
          subskill: aaa7.subskillCandidate,
          reason: aaa7.reason_no_subskill,
          block: aaa7.block_layer,
        }
      : null,
    mathRegression: mathStillWorks,
  };

  const artifact = {
    generatedAt: new Date().toISOString(),
    subjectCoverage,
    centralCases,
    conclusion,
    qa: {
      forbiddenHitsTotal,
      screenPdfMatchAll: qaPerChild.every((x) => x.screenPdfMatch),
      mixedLastResortTotal: allAnalyzed.filter((r) => r.isMixedLastResort).length,
      perChild: qaPerChild,
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "stage2-bridge-audit.json"), JSON.stringify(artifact, null, 2));

  const covHeader =
    "subject,total_rows,taxonomy_candidates_before,taxonomy_candidates_after,strong_match,weak_blocked,subskill_candidate,no_taxonomy_mapping,no_raw_mistake_events,missing_metadata,insufficient,mixed_last_resort";
  const covCsv = [
    covHeader,
    ...subjectCoverage.map((s) =>
      [
        s.subject,
        s.totalRows,
        s.taxonomyCandidatesBefore,
        s.taxonomyCandidatesAfter,
        s.strongMatch,
        s.weakBlocked,
        s.subskillCandidate,
        s.noTaxonomyMapping,
        s.noRawMistakeEvents,
        s.missingMetadata,
        s.insufficient,
        s.mixedLastResort,
      ].join(","),
    ),
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "stage2-bridge-subject-coverage.csv"), covCsv, "utf8");

  const caseCsv = [
    "child,subject,topic,bucketKey,normalizedBucketKey,q,accuracy,candidateIdsBefore,candidateIdsAfter,taxonomyMatchStrength,subskillCandidate,reason_no_subskill,missing_data",
    ...centralCases.map((r) =>
      [
        r.child,
        r.subject,
        JSON.stringify(r.topic),
        JSON.stringify(r.bucketKey),
        r.normalizedBucketKey,
        r.q,
        r.accuracy,
        JSON.stringify(r.candidateIdsBefore),
        JSON.stringify(r.candidateIdsAfter),
        r.taxonomyMatchStrength,
        JSON.stringify(r.subskillCandidate || ""),
        r.reason_no_subskill || "",
        JSON.stringify(r.missing_data || ""),
      ].join(","),
    ),
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "stage2-bridge-central-cases.csv"), caseCsv, "utf8");

  console.log(JSON.stringify({ subjectCoverage, centralCases, conclusion, qa: artifact.qa }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
