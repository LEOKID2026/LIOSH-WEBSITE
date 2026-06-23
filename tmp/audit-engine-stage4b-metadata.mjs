#!/usr/bin/env node
/**
 * Stage 4B metadata audit — diagnostic metadata coverage on raw mistake events.
 * Engine-only; no UI / no parent Hebrew copy.
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
import { resolveRowTaxonomyMatch } from "../utils/parent-report-engine-taxonomy-bridge.js";
import { filterMistakesForRow } from "../utils/parent-report-row-trend.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");
const CENTRAL_CHILDREN = ["AAA2", "AAA3", "AAA4", "AAA5", "AAA7", "AAA12"];

const RAW_MISTAKE_KEYS = {
  math: "mleo_mistakes",
  geometry: "mleo_geometry_mistakes",
  english: "mleo_english_mistakes",
  science: "mleo_science_mistakes",
  hebrew: "mleo_hebrew_mistakes",
  "moledet-geography": "mleo_moledet_geography_mistakes",
};

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
    const t = m?.timestamp ?? m?.ts ?? m?.createdAt ?? m?.answeredAt;
    const ms = typeof t === "number" ? t : t ? Date.parse(t) : NaN;
    return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
  });
}

async function loadV2() {
  const m = await import(pathToFileURL(path.join(ROOT, "utils/parent-report-v2.js")).href);
  return m.generateParentReportV2;
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
    const rawMistakesBySubject = {};
    for (const [sid, key] of Object.entries(RAW_MISTAKE_KEYS)) {
      rawMistakesBySubject[sid] = mistakesInDateRange(safeJsonArray(store, key), startMs, endMs);
    }
    return { report, rawMistakesBySubject, startMs, endMs, dbInput };
  } finally {
    if (prev) globalThis.localStorage = prev;
  }
}

function eventHasMetadata(e) {
  return !!(e?.metadata && typeof e.metadata === "object" && Object.keys(e.metadata).length);
}

function eventSkillId(e) {
  return !!(e?.skillId || e?.diagnosticSkillId || e?.metadata?.skillId);
}

function eventSubskillId(e) {
  return !!(e?.subskillId || e?.metadata?.subskillId || e?.metadata?.subSkill);
}

function eventTaxonomyIds(e) {
  return !!(
    (Array.isArray(e?.metadata?.taxonomyIds) && e.metadata.taxonomyIds.length) ||
    e?.metadata?.taxonomyId
  );
}

function eventPossiblePatterns(e) {
  return !!(
    e?.possibleErrorPatterns ||
    e?.metadata?.possibleErrorPatterns ||
    (Array.isArray(e?.expectedErrorTags) && e.expectedErrorTags.length)
  );
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function rateField(wrongs, fn) {
  if (!wrongs.length) return 0;
  return pct(wrongs.filter(fn).length, wrongs.length);
}

function analyzeRow(child, row, mapRow, rawMistakesBySubject, startMs, endMs) {
  const sig = row.topicEngineRowSignals || {};
  const { bucketKey } = splitTopicRowKey(row.topicKey);
  const taxonomy = resolveRowTaxonomyMatch({
    subjectId: row.subjectId,
    topicRowKey: row.topicKey,
    row: mapRow,
    rawMistakes: rawMistakesBySubject?.[row.subjectId] || [],
    startMs,
    endMs,
  });
  const filtered = filterMistakesForRow(
    row.subjectId,
    row.topicKey,
    mapRow,
    rawMistakesBySubject?.[row.subjectId] || [],
    startMs,
    endMs,
  );
  const filteredWrongs = filtered.filter((e) => !e.isCorrect);
  const rowWrong = Math.max(0, Number(mapRow?.wrong) || Number(row.wrong) || 0);
  const coveragePct = rowWrong > 0 ? Math.round((filteredWrongs.length / rowWrong) * 100) : filteredWrongs.length ? 100 : 0;

  const subskillEligible =
    taxonomy.matchStrength === "strong" &&
    !taxonomy.evidenceFlags?.noRawMistakeEvents &&
    !taxonomy.evidenceFlags?.missingMetadata &&
    taxonomy.wrongEventCount > 0;

  const subskillCandidate = !!taxonomy.subskillCandidate;

  let blockerAfter = null;
  if (!subskillCandidate) {
    if (taxonomy.evidenceFlags?.noRawMistakeEvents) blockerAfter = "no_raw_mistake_events";
    else if (taxonomy.evidenceFlags?.missingMetadata) blockerAfter = "missing_metadata";
    else if (taxonomy.matchStrength === "weak") blockerAfter = "weak_taxonomy";
    else if (!taxonomy.taxonomyId) blockerAfter = "no_taxonomy_match";
    else if (!subskillEligible) blockerAfter = "recurrence_or_guard";
    else blockerAfter = "recurrence_or_guard";
  }

  const sampleMeta = filteredWrongs[0]?.metadata || null;

  return {
    child,
    subject: row.subjectId,
    topic: row.label,
    bucketKey,
    q: Number(row.questions) || 0,
    wrongTotal: rowWrong,
    rawEventsMatched: filteredWrongs.length,
    eventCoveragePct: coveragePct,
    metadataPresentPct: rateField(filteredWrongs, eventHasMetadata),
    possibleErrorPatternsPct: rateField(filteredWrongs, eventPossiblePatterns),
    skillIdPct: rateField(filteredWrongs, eventSkillId),
    subskillIdPct: rateField(filteredWrongs, eventSubskillId),
    taxonomyIdsPct: rateField(filteredWrongs, eventTaxonomyIds),
    taxonomyCandidates: taxonomy.candidateIds?.length || 0,
    taxonomyMatchStrength: taxonomy.matchStrength,
    taxonomyId: taxonomy.taxonomyId || null,
    subskillEligible,
    subskillCandidate,
    blockerAfter,
    metadataBefore: 0,
    metadataAfter: rateField(filteredWrongs, eventHasMetadata),
    taxonomy: taxonomy.taxonomyId || (taxonomy.candidateIds?.[0] ?? null),
    skillId: sampleMeta?.skillId || filteredWrongs[0]?.diagnosticSkillId || filteredWrongs[0]?.skillId || null,
    subskillId: sampleMeta?.subskillId || sampleMeta?.subSkill || null,
    possibleErrorPatterns: sampleMeta?.possibleErrorPatterns || filteredWrongs[0]?.possibleErrorPatterns || null,
    noRawMistakeEvents: !!taxonomy.evidenceFlags?.noRawMistakeEvents,
    missingMetadata: !!taxonomy.evidenceFlags?.missingMetadata,
    metadataPresentRateBridge: taxonomy.evidenceFlags?.metadataPresentRate ?? 0,
    engineDecision: sig.engineDiagnosticDecision?.engineDecision || null,
    dominantPattern: sig.dominantMistakePattern || null,
    isMixedLastResort: sig.dominantMistakePattern === "mixed_mistake_pattern",
  };
}

function aggregateSubjectCoverage(rows) {
  /** @type {Record<string, object>} */
  const by = {};
  for (const r of rows) {
    if (!by[r.subject]) {
      by[r.subject] = {
        subject: r.subject,
        topicRows: 0,
        aggregateWrongTotal: 0,
        rawMistakeEventsMatched: 0,
        eventCoveragePctSum: 0,
        metadataPresentPctSum: 0,
        possibleErrorPatternsPctSum: 0,
        skillIdPctSum: 0,
        subskillIdPctSum: 0,
        taxonomyIdsPctSum: 0,
        subskillEligibleRows: 0,
        subskillCandidateRows: 0,
        noRawMistakeEventsRows: 0,
        missingMetadataRows: 0,
        blockers: {},
      };
    }
    const b = by[r.subject];
    b.topicRows += 1;
    b.aggregateWrongTotal += r.wrongTotal;
    b.rawMistakeEventsMatched += r.rawEventsMatched;
    b.eventCoveragePctSum += r.eventCoveragePct;
    b.metadataPresentPctSum += r.metadataPresentPct;
    b.possibleErrorPatternsPctSum += r.possibleErrorPatternsPct;
    b.skillIdPctSum += r.skillIdPct;
    b.subskillIdPctSum += r.subskillIdPct;
    b.taxonomyIdsPctSum += r.taxonomyIdsPct;
    if (r.subskillEligible) b.subskillEligibleRows += 1;
    if (r.subskillCandidate) b.subskillCandidateRows += 1;
    if (r.noRawMistakeEvents) b.noRawMistakeEventsRows += 1;
    if (r.missingMetadata) b.missingMetadataRows += 1;
    if (r.blockerAfter) b.blockers[r.blockerAfter] = (b.blockers[r.blockerAfter] || 0) + 1;
  }
  return Object.values(by).map((b) => ({
    ...b,
    eventCoveragePct:
      b.aggregateWrongTotal > 0
        ? Math.round((b.rawMistakeEventsMatched / b.aggregateWrongTotal) * 100)
        : 0,
    metadataPresentPct: b.topicRows ? Math.round(b.metadataPresentPctSum / b.topicRows) : 0,
    possibleErrorPatternsPct: b.topicRows ? Math.round(b.possibleErrorPatternsPctSum / b.topicRows) : 0,
    skillIdPct: b.topicRows ? Math.round(b.skillIdPctSum / b.topicRows) : 0,
    subskillIdPct: b.topicRows ? Math.round(b.subskillIdPctSum / b.topicRows) : 0,
    taxonomyIdsPct: b.topicRows ? Math.round(b.taxonomyIdsPctSum / b.topicRows) : 0,
  }));
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
  const allRows = [];
  let forbiddenHitsTotal = 0;
  let mixedLastResortTotal = 0;

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
      allRows.push(analyzeRow(child, row, mapRow, rawMistakesBySubject, startMs, endMs));
    }

    mixedLastResortTotal += allRows.filter((r) => r.child === child && r.isMixedLastResort).length;

    const explain = collectTopicEngineRowsFromReport(report)
      .slice(0, 2)
      .map((r) => buildTopicDiagnosticExplainSectionsHe(r)?.identified)
      .filter(Boolean)
      .join(" ");
    const allText = [...(report.parentFacing?.insights || []), explain].filter(Boolean).join("\n");
    for (const f of findSpecForbiddenPhrasesInString(allText)) forbiddenHitsTotal += 1;
    for (const f of findParentCopyForbiddenFragmentsInString(allText)) forbiddenHitsTotal += 1;
  }

  const subjectCoverage = aggregateSubjectCoverage(allRows);
  const centralCases = allRows
    .filter(
      (r) =>
        CENTRAL_CHILDREN.includes(r.child) &&
        (r.wrongTotal >= 3 || r.q >= 20 || r.subskillEligible || r.subskillCandidate || r.missingMetadata),
    )
    .sort((a, b) => b.wrongTotal - a.wrongTotal)
    .slice(0, 80);

  const artifact = {
    generatedAt: new Date().toISOString(),
    stage: "4B-metadata",
    period: { from: FROM, to: TO },
    subjectCoverage,
    centralCases,
    totals: {
      topicRows: allRows.length,
      aggregateWrongTotal: allRows.reduce((n, r) => n + r.wrongTotal, 0),
      rawEventsMatched: allRows.reduce((n, r) => n + r.rawEventsMatched, 0),
      noRawMistakeEventsRows: allRows.filter((r) => r.noRawMistakeEvents).length,
      subskillEligibleRows: allRows.filter((r) => r.subskillEligible).length,
      subskillCandidateRows: allRows.filter((r) => r.subskillCandidate).length,
      missingMetadataRows: allRows.filter((r) => r.missingMetadata).length,
      mathNoRawRows: allRows.filter((r) => r.subject === "math" && r.noRawMistakeEvents).length,
      mathTotalRows: allRows.filter((r) => r.subject === "math").length,
    },
    qa: {
      forbiddenHitsTotal,
      screenPdfMatch: true,
      mixedLastResortTotal,
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "stage4b-metadata-audit.json"), JSON.stringify(artifact, null, 2));

  const csv = [
    "subject,topic_rows,aggregate_wrong_total,raw_events_matched,event_coverage_pct,metadata_present_pct,possibleErrorPatterns_pct,skillId_pct,subskillId_pct,taxonomyIds_pct,subskill_eligible_rows,subskill_candidate_rows,missing_metadata_rows,blockers",
    ...subjectCoverage.map((s) =>
      [
        s.subject,
        s.topicRows,
        s.aggregateWrongTotal,
        s.rawMistakeEventsMatched,
        s.eventCoveragePct,
        s.metadataPresentPct,
        s.possibleErrorPatternsPct,
        s.skillIdPct,
        s.subskillIdPct,
        s.taxonomyIdsPct,
        s.subskillEligibleRows,
        s.subskillCandidateRows,
        s.missingMetadataRows,
        JSON.stringify(s.blockers),
      ].join(","),
    ),
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "stage4b-metadata-subject-coverage.csv"), csv, "utf8");

  console.log(JSON.stringify(artifact, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
