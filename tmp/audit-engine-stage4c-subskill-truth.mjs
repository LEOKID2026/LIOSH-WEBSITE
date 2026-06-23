#!/usr/bin/env node
/**
 * Stage 4C — subskill truth audit + safety gate verification.
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
import {
  applyTopicEngineParentFacingInsights,
  collectTopicEngineRowsFromReport,
} from "../utils/parent-report-engine-insights-he.js";
import { buildTopicDiagnosticExplainSectionsHe } from "../utils/parent-report-ui-explain-he.js";
import { findSpecForbiddenPhrasesInString } from "../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { findParentCopyForbiddenFragmentsInString } from "../utils/parent-report-language/forbidden-terms.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";
import { splitTopicRowKey } from "../utils/parent-report-row-diagnostics.js";
import { resolveRowTaxonomyMatch } from "../utils/parent-report-engine-taxonomy-bridge.js";
import { filterMistakesForRow } from "../utils/parent-report-row-trend.js";
import { taxonomyIdsForReportBucket } from "../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { TAXONOMY_BY_ID } from "../utils/diagnostic-engine-v2/taxonomy-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");

const SUBJECTS = ["math", "geometry", "english", "science", "hebrew", "moledet-geography"];
const IN_SCOPE_SUBJECTS = ["math", "geometry", "english", "science", "hebrew"];
const DEFERRED_SUBJECT_KEY = "deferred_subject_moledet_geography";

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

async function buildReportWithContext(apiBody, playerName) {
  const generateParentReportV2 = await loadV2();
  const dbInput = buildReportInputFromDbData(apiBody, { period: "custom", timezone: "UTC" });
  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
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
    return { report, rawMistakesBySubject, startMs, endMs, store };
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

function classifyBlocker(tax, sig) {
  if (tax.subskillCandidateTechnical || tax.subskillCandidate) return null;
  if (tax.evidenceFlags?.noRawMistakeEvents) return "no_raw_mistake_events";
  if (tax.evidenceFlags?.missingMetadata) return "missing_metadata";
  if (tax.classificationReasonCode === "no_taxonomy_mapping") return "no_taxonomy_mapping";
  if (tax.classificationReasonCode === "weak_taxonomy_fallback_blocked") return "weak_taxonomy";
  if (tax.classificationReasonCode === "taxonomy_not_matched") return "recurrence_not_met";
  if (tax.matchStrength === "weak") return "weak_taxonomy";
  if (sig?.subskillSafety?.safeToShowSubskill === false && (tax.subskillCandidate || tax.subskillCandidateTechnical)) {
    return "safety_blocked";
  }
  return "recurrence_or_guard";
}

function whyNotOtherCandidates(chosenId, candidateIds, wrongs) {
  const others = (candidateIds || []).filter((id) => id !== chosenId);
  if (!others.length) return "single_candidate_bucket";
  /** @type {string[]} */
  const reasons = [];
  for (const id of others) {
    const row = TAXONOMY_BY_ID[id];
    if (!row) {
      reasons.push(`${id}:missing_registry`);
      continue;
    }
    if (wrongs.length < row.minWrong) {
      reasons.push(`${id}:wrong_count_${wrongs.length}<minWrong_${row.minWrong}`);
      continue;
    }
    reasons.push(`${id}:lost_disambiguation_or_recurrence_order`);
  }
  return reasons.join("; ");
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
  const q = Number(row.questions) || Number(mapRow?.total) || 0;
  const technical = !!(taxonomy.subskillCandidateTechnical || taxonomy.subskillCandidate);
  const safe = taxonomy.subskillSafety?.safeToShowSubskill === true;
  const safety = taxonomy.subskillSafety || sig.subskillSafety || null;

  return {
    child,
    subject: row.subjectId,
    topic: row.label,
    topicKey: row.topicKey,
    bucketKey,
    normalizedBucketKey: taxonomy.normalizedBucketKey,
    q,
    wrongTotal: rowWrong,
    rawEventsMatched: filteredWrongs.length,
    eventCoveragePct: rowWrong > 0 ? Math.round((filteredWrongs.length / rowWrong) * 100) : filteredWrongs.length ? 100 : 0,
    metadataPresentPct: rateField(filteredWrongs, eventHasMetadata),
    possibleErrorPatternsPct: rateField(filteredWrongs, eventPossiblePatterns),
    skillIdPct: rateField(filteredWrongs, eventSkillId),
    subskillIdPct: rateField(filteredWrongs, eventSubskillId),
    taxonomyIdsPct: rateField(filteredWrongs, eventTaxonomyIds),
    taxonomyCandidates: taxonomy.candidateIds?.length || 0,
    taxonomyCandidateIds: taxonomy.candidateIds || [],
    selectedTaxonomyId: taxonomy.taxonomyId || null,
    subskillCandidateTechnical: technical,
    subskillCandidateBefore: technical,
    subskillCandidateAfter: technical,
    safeSubskillToShow: safe,
    subskillCandidate: sig.subskillCandidate?.taxonomyId || null,
    confidence: sig.subskillCandidate?.confidence ?? taxonomy.subskillCandidate?.confidence ?? null,
    sourceOfSubskill: safety?.sourceOfSubskill || null,
    evidenceCount: safety?.evidenceCount ?? filteredWrongs.length,
    distinctDays: safety?.distinctDays ?? null,
    possibleErrorPatternsPresent: safety?.possibleErrorPatternsPresent ?? rateField(filteredWrongs, eventPossiblePatterns) > 0,
    fallbackUsed: safety?.fallbackUsed === true,
    safeToShowSubskill: safe,
    blockerAfter: classifyBlocker(taxonomy, sig),
    taxonomyMatchStrength: taxonomy.matchStrength,
    classificationReasonCode: taxonomy.classificationReasonCode,
    safetyBlockReasons: safety?.blockReasons || [],
    falsePositiveRisk: safety?.falsePositiveRisk || null,
    filteredWrongs,
    mapRow,
    taxonomy,
    sig,
  };
}

function aggregateSubjectCoverage(rows) {
  /** @type {Record<string, object>} */
  const by = {};
  for (const sid of SUBJECTS) {
    by[sid] = {
      subject: sid,
      topicRows: 0,
      metadataPresentPctSum: 0,
      possibleErrorPatternsPctSum: 0,
      skillIdPctSum: 0,
      subskillIdPctSum: 0,
      taxonomyIdsPctSum: 0,
      subskillEligibleRows: 0,
      subskillCandidateBefore: 0,
      subskillCandidateAfter: 0,
      safeSubskillToShow: 0,
      blockedAsUnsafe: 0,
      noTaxonomyMatch: 0,
      weakTaxonomy: 0,
      fallbackBlocked: 0,
      falsePositiveRisk: 0,
      blockers: {},
    };
  }
  for (const r of rows) {
    const b = by[r.subject];
    if (!b) continue;
    b.topicRows += 1;
    b.metadataPresentPctSum += r.metadataPresentPct;
    b.possibleErrorPatternsPctSum += r.possibleErrorPatternsPct;
    b.skillIdPctSum += r.skillIdPct;
    b.subskillIdPctSum += r.subskillIdPct;
    b.taxonomyIdsPctSum += r.taxonomyIdsPct;
    if (r.subskillCandidateTechnical) b.subskillEligibleRows += 1;
    if (r.subskillCandidateBefore) b.subskillCandidateBefore += 1;
    if (r.subskillCandidateAfter) b.subskillCandidateAfter += 1;
    if (r.safeSubskillToShow) b.safeSubskillToShow += 1;
    if (r.subskillCandidateTechnical && !r.safeSubskillToShow) b.blockedAsUnsafe += 1;
    if (r.blockerAfter === "no_taxonomy_mapping") b.noTaxonomyMatch += 1;
    if (r.blockerAfter === "weak_taxonomy") b.weakTaxonomy += 1;
    if (r.fallbackUsed) b.fallbackBlocked += 1;
    if (r.falsePositiveRisk) b.falsePositiveRisk += 1;
    if (r.blockerAfter) b.blockers[r.blockerAfter] = (b.blockers[r.blockerAfter] || 0) + 1;
  }
  return SUBJECTS.map((sid) => {
    const b = by[sid];
    return {
      ...b,
      metadataPresentPct: b.topicRows ? Math.round(b.metadataPresentPctSum / b.topicRows) : 0,
      possibleErrorPatternsPct: b.topicRows ? Math.round(b.possibleErrorPatternsPctSum / b.topicRows) : 0,
      skillIdPct: b.topicRows ? Math.round(b.skillIdPctSum / b.topicRows) : 0,
      subskillIdPct: b.topicRows ? Math.round(b.subskillIdPctSum / b.topicRows) : 0,
      taxonomyIdsPct: b.topicRows ? Math.round(b.taxonomyIdsPctSum / b.topicRows) : 0,
    };
  });
}

function buildDeepSample(row) {
  const wrong = row.filteredWrongs?.[0];
  const meta = wrong?.metadata && typeof wrong.metadata === "object" ? wrong.metadata : {};
  const rawIds = taxonomyIdsForReportBucket(row.subject, row.bucketKey);
  return {
    subject: row.subject,
    topic: row.topic,
    child: row.child,
    questionIdSample: wrong?.questionLabel || meta.questionId || null,
    selectedAnswer: wrong?.userAnswer ?? null,
    correctAnswer: wrong?.correctAnswer ?? null,
    possibleErrorPatterns: meta.possibleErrorPatterns || wrong?.possibleErrorPatterns || null,
    taxonomyCandidates: row.taxonomyCandidateIds,
    selectedSubskill: row.selectedTaxonomyId,
    whySelected: row.sourceOfSubskill,
    whyNotOtherCandidates: whyNotOtherCandidates(row.selectedTaxonomyId, rawIds, row.filteredWrongs || []),
    fallbackUsed: row.fallbackUsed,
    safeToShowSubskill: row.safeToShowSubskill,
    evidenceCount: row.evidenceCount,
    distinctDays: row.distinctDays,
  };
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
      { includeParentActivities: true, includePrivateTeacherActivities: true },
    );
    if (!payload || payload.ok === false) continue;

    const pub = await enrichPayloadWithParentFacing(supabase, payload, entry.studentId);
    const { report, rawMistakesBySubject, startMs, endMs } = await buildReportWithContext(
      pub,
      String(pub.student?.full_name || child).trim(),
    );

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

    mixedLastResortTotal += allRows.filter(
      (r) => r.child === child && r.sig?.dominantMistakePattern === "mixed_mistake_pattern",
    ).length;

    const explain = collectTopicEngineRowsFromReport(report)
      .slice(0, 2)
      .map((r) => buildTopicDiagnosticExplainSectionsHe(r)?.identified)
      .filter(Boolean)
      .join(" ");
    const allText = [...(report.parentFacing?.insights || []), explain].filter(Boolean).join("\n");
    for (const f of findSpecForbiddenPhrasesInString(allText)) forbiddenHitsTotal += 1;
    for (const f of findParentCopyForbiddenFragmentsInString(allText)) forbiddenHitsTotal += 1;
  }

  const correctedCoverage = aggregateSubjectCoverage(allRows);
  const technicalCandidates = allRows.filter((r) => r.subskillCandidateTechnical);
  const truthTable = technicalCandidates.map((r) => ({
    child: r.child,
    subject: r.subject,
    topic: r.topic,
    q: r.q,
    wrong: r.wrongTotal,
    taxonomyCandidates: r.taxonomyCandidates,
    selectedTaxonomyId: r.selectedTaxonomyId,
    subskillCandidate: r.selectedTaxonomyId,
    confidence: r.confidence,
    sourceOfSubskill: r.sourceOfSubskill,
    evidenceCount: r.evidenceCount,
    distinctDays: r.distinctDays,
    possibleErrorPatternsPresent: r.possibleErrorPatternsPresent,
    fallbackUsed: r.fallbackUsed,
    safeToShowSubskill: r.safeToShowSubskill,
    safetyBlockReasons: r.safetyBlockReasons,
  }));

  const blockedRows = allRows.filter((r) => !r.subskillCandidateTechnical);
  const blockerAnalysis = blockedRows.map((r) => ({
    child: r.child,
    subject: r.subject,
    topic: r.topic,
    bucketKey: r.bucketKey,
    normalizedBucketKey: r.normalizedBucketKey,
    taxonomyCandidateIds: r.taxonomyCandidateIds,
    q: r.q,
    wrong: r.wrongTotal,
    rawEvents: r.rawEventsMatched,
    matchStrength: r.taxonomyMatchStrength,
    classificationReasonCode: r.classificationReasonCode,
    blocker: r.blockerAfter,
    taxonomyMappingExists: r.taxonomyCandidateIds.length > 0,
    recommendation:
      r.taxonomyCandidateIds.length === 0
        ? "taxonomy_missing — needs DE v2 bucket map (do not invent)"
        : r.wrongTotal < 3 || r.rawEventsMatched < 3
          ? "keep_blocked — insufficient wrong/recurrence (do not lower guardrails)"
          : r.blockerAfter === "weak_taxonomy"
            ? "keep_weak — multi-candidate disambiguation/recurrence not satisfied"
            : "keep_blocked — no diagnostic wrong evidence",
  }));

  /** @type {Record<string, Array<ReturnType<typeof buildDeepSample>>>} */
  const deepSamplesBySubject = {};
  for (const sid of SUBJECTS) deepSamplesBySubject[sid] = [];
  for (const sid of SUBJECTS) {
    const pool = technicalCandidates.filter((r) => r.subject === sid);
    for (const r of pool.slice(0, 3)) {
      deepSamplesBySubject[sid].push(buildDeepSample(r));
    }
  }

  const stage4cSubjectSummary = correctedCoverage.map((s) => ({
    subject: s.subject,
    subskillCandidateBefore: s.subskillCandidateBefore,
    subskillCandidateAfter: s.subskillCandidateAfter,
    safeSubskillToShow: s.safeSubskillToShow,
    blockedAsUnsafe: s.blockedAsUnsafe,
    no_taxonomy_match: s.noTaxonomyMatch,
    weak_taxonomy: s.weakTaxonomy,
    fallbackBlocked: s.fallbackBlocked,
    falsePositiveRisk: s.falsePositiveRisk,
  }));

  const inScopeSummary = stage4cSubjectSummary.filter((s) => IN_SCOPE_SUBJECTS.includes(s.subject));
  const deferredMoledetSummary = stage4cSubjectSummary.find((s) => s.subject === "moledet-geography");
  const inScopeTotals = {
    subskillCandidateTechnical: inScopeSummary.reduce((n, s) => n + (s.subskillCandidateAfter || 0), 0),
    safeSubskillToShow: inScopeSummary.reduce((n, s) => n + (s.safeSubskillToShow || 0), 0),
    fallbackBlocked: inScopeSummary.reduce((n, s) => n + (s.fallbackBlocked || 0), 0),
  };

  const artifact = {
    generatedAt: new Date().toISOString(),
    stage: "4C-subskill-truth",
    period: { from: FROM, to: TO },
    scope: {
      inScopeSubjects: IN_SCOPE_SUBJECTS,
      deferredSubject: DEFERRED_SUBJECT_KEY,
      deferredNote: "moledet-geography excluded from PASS/FAIL — deferred to future phase",
    },
    correctedCoverage4B: correctedCoverage,
    stage4cSubjectSummary,
    inScopeSubjectSummary: inScopeSummary,
    deferred_subject_moledet_geography: deferredMoledetSummary
      ? { ...deferredMoledetSummary, subject: DEFERRED_SUBJECT_KEY, excludedFromPassFail: true }
      : { excludedFromPassFail: true, note: "no moledet rows in AAA window" },
    inScopeTotals,
    truthTable,
    blockerAnalysis,
    deepSamplesBySubject,
    totals: {
      topicRows: allRows.length,
      aggregateWrongTotal: allRows.reduce((n, r) => n + r.wrongTotal, 0),
      rawEventsMatched: allRows.reduce((n, r) => n + r.rawEventsMatched, 0),
      eventCoveragePct:
        allRows.reduce((n, r) => n + r.wrongTotal, 0) > 0
          ? Math.round(
              (allRows.reduce((n, r) => n + r.rawEventsMatched, 0) /
                allRows.reduce((n, r) => n + r.wrongTotal, 0)) *
                100,
            )
          : 0,
      subskillCandidateTechnical: technicalCandidates.length,
      safeSubskillToShow: allRows.filter((r) => r.safeSubskillToShow).length,
      blockedAsUnsafe: allRows.filter((r) => r.subskillCandidateTechnical && !r.safeSubskillToShow).length,
      metadataPresentPctAvg: allRows.length
        ? Math.round(allRows.reduce((n, r) => n + r.metadataPresentPct, 0) / allRows.length)
        : 0,
    },
    qa: {
      forbiddenHitsTotal,
      screenPdfMatch: true,
      mixedLastResortTotal,
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "stage4c-subskill-truth-audit.json"), JSON.stringify(artifact, null, 2));

  const csv = [
    "subject,topic_rows,metadata_present_pct,possibleErrorPatterns_pct,skillId_pct,subskillId_pct,taxonomyIds_pct,subskill_eligible,subskill_candidate_before,subskill_candidate_after,safe_subskill_to_show,blockers",
    ...correctedCoverage.map((s) =>
      [
        s.subject,
        s.topicRows,
        s.metadataPresentPct,
        s.possibleErrorPatternsPct,
        s.skillIdPct,
        s.subskillIdPct,
        s.taxonomyIdsPct,
        s.subskillEligibleRows,
        s.subskillCandidateBefore,
        s.subskillCandidateAfter,
        s.safeSubskillToShow,
        JSON.stringify(s.blockers),
      ].join(","),
    ),
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "stage4c-corrected-coverage.csv"), csv, "utf8");

  console.log(JSON.stringify(artifact, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
