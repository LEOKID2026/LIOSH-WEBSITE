#!/usr/bin/env node
/**
 * One-off audit for a real student: gradeRelation counts + core leak + activity labels.
 * Run: node --env-file=.env.local scripts/qa/parent-report-student-grade-label-audit.mjs
 */
import { aggregateParentReportPayload } from "../../lib/parent-server/report-data-aggregate.server.js";
import { buildParentReportV2FromAggregate } from "./lib/mass-virtual-students/report-v2-bridge.mjs";
import { buildDetailedParentReportFromBaseReport } from "../../utils/detailed-parent-report.js";
import { createServiceClient } from "./lib/mass-virtual-students/supabase.mjs";
import {
  isCoreParentReportRow,
  resolveParentReportRowGradeRelation,
} from "../../utils/parent-report-core-grade-filter.js";
import { formatParentReportActivityDisplayLabelHe } from "../../utils/parent-report-language/parent-report-display-labels.he.js";
import { buildInsightPacketFromV2Snapshot } from "../../utils/parent-report-insights/build-packet-from-v2-snapshot.js";
import { buildDeterministicFallbackNarrative } from "../../utils/parent-report-ai-narrative/deterministic-fallback.js";
import { applyTopicEngineParentFacingInsights } from "../../utils/parent-report-engine-insights-he.js";
import { buildParentSurfaceWhatToNoticeHe } from "../../utils/parent-report-surface/parent-surface-insights.js";

const STUDENT_ID = "2352e8c7-ac0b-4daa-afbf-cb7d130062b3";
const FROM = "2025-09-01";
const TO = "2026-07-03";

const MAP_KEYS = [
  "mathOperations",
  "geometryTopics",
  "englishTopics",
  "scienceTopics",
  "historyTopics",
  "hebrewTopics",
  "moledetGeographyTopics",
];

function collectMapRows(base) {
  const rows = [];
  for (const mk of MAP_KEYS) {
    const tm = base?.[mk];
    if (!tm || typeof tm !== "object") continue;
    for (const [topicRowKey, row] of Object.entries(tm)) {
      if ((Number(row?.questions) || 0) <= 0) continue;
      rows.push({ mapKey: mk, topicRowKey, row });
    }
  }
  return rows;
}

function gradeRelationCounts(rows, registeredGradeKey) {
  const counts = { same: 0, higher: 0, lower: 0, unknown: 0 };
  for (const { row } of rows) {
    const rel = resolveParentReportRowGradeRelation(row, registeredGradeKey);
    counts[rel] = (counts[rel] || 0) + 1;
  }
  return counts;
}

function collectCoreText(detailed) {
  const parts = [];
  const es = detailed?.executiveSummary || {};
  parts.push(...(es.topStrengthsAcrossHe || []));
  parts.push(...(es.topFocusAreasHe || []));
  parts.push(...(es.gradeSplitTopicNoticesHe || []));
  parts.push(String(es.mainHomeRecommendationHe || ""));
  for (const sp of detailed?.subjectProfiles || []) {
    parts.push(String(sp.summaryHe || ""));
    for (const r of sp.topStrengths || []) parts.push(String(r.labelHe || r.narrativeTitleHe || ""));
    for (const r of sp.topWeaknesses || []) parts.push(String(r.labelHe || r.narrativeTitleHe || ""));
    for (const r of sp.topicOverviewRows || []) parts.push(String(r.narrativeTitleHe || ""));
    for (const r of sp.topicRecommendations || []) parts.push(String(r.narrativeTitleHe || r.recommendedStepLabelHe || ""));
  }
  for (const line of detailed?.homePlan?.itemsHe || []) parts.push(String(line));
  return parts.filter(Boolean).join("\n");
}

function collectWhatToNoticeText(base, detailed) {
  applyTopicEngineParentFacingInsights(base);
  const payload = {
    ...detailed,
    _parentReportUi: { parentFacing: base?.parentFacing ?? null },
  };
  return buildParentSurfaceWhatToNoticeHe(payload).join("\n");
}

function gradeMentionLeak(text, registeredGradeKey) {
  if (registeredGradeKey !== "g1") return [];
  const leaks = [];
  const banned = [/כיתה\s*ב/u, /כיתה\s*ג/u, /כיתה\s*ד/u, /כיתה\s*ה/u, /—\s*ב׳/u, /—\s*ג׳/u, /—\s*ד׳/u, /—\s*ה׳/u];
  for (const re of banned) {
    if (re.test(text)) leaks.push(String(re));
  }
  return leaks;
}

function collectAiInsightText(base) {
  const packet = buildInsightPacketFromV2Snapshot(base);
  const narr = buildDeterministicFallbackNarrative(packet);
  return [
    narr.summary,
    ...(narr.strengths || []).map((s) => s.textHe),
    ...(narr.focusAreas || []).map((f) => f.textHe),
    ...(narr.homeTips || []),
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("students")
    .select("id, grade_level, full_name, parent_id, is_active")
    .eq("id", STUDENT_ID)
    .maybeSingle();
  if (!profile?.id) throw new Error(`student not found: ${STUDENT_ID}`);

  const fromDate = new Date(`${FROM}T00:00:00.000Z`);
  const toDate = new Date(`${TO}T23:59:59.999Z`);
  const payload = await aggregateParentReportPayload(supabase, profile, fromDate, toDate, {
    includeParentActivities: true,
  });
  if (!payload?.ok && payload?.error) throw new Error(payload.message || payload.error);
  const base = await buildParentReportV2FromAggregate(payload, {
    studentName: profile.full_name,
    fromDate,
    toDate,
  });
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "custom" });
  const registeredGradeKey = base?.registeredGradeKey || profile?.grade_level || null;
  const mapRows = collectMapRows(base);
  const counts = gradeRelationCounts(mapRows, registeredGradeKey);

  const labels = mapRows.map(({ row }) => formatParentReportActivityDisplayLabelHe(row));
  const bareTargil = labels.filter((l) => l === "תרגול");
  const coreText = collectCoreText(detailed);
  const whatToNoticeText = collectWhatToNoticeText(base, detailed);
  const aiInsightText = collectAiInsightText(base);
  const leaks = gradeMentionLeak(coreText, registeredGradeKey);
  const whatToNoticeLeaks = gradeMentionLeak(whatToNoticeText, registeredGradeKey);
  const aiLeaks = gradeMentionLeak(aiInsightText, registeredGradeKey);
  const combinedTargilTopic = labels.filter((l) => /^תרגול — /u.test(l));

  const nonCoreInOverview = [];
  for (const sp of detailed?.subjectProfiles || []) {
    for (const r of sp.topicOverviewRows || []) {
      const mapRow = mapRows.find((m) => m.topicRowKey === r.topicRowKey)?.row;
      if (mapRow && !isCoreParentReportRow(mapRow, registeredGradeKey)) {
        nonCoreInOverview.push(r.topicRowKey);
      }
    }
  }

  const out = {
    studentId: STUDENT_ID,
    studentName: profile?.full_name || null,
    registeredGradeKey,
    profileGradeLevel: profile?.grade_level || null,
    dateRange: { from: FROM, to: TO },
    mapRowCount: mapRows.length,
    gradeRelationCounts: counts,
    bareTargilLabelCount: bareTargil.length,
    combinedTargilTopicLabelCount: combinedTargilTopic.length,
    sampleLabels: labels.slice(0, 15),
    nonCoreInTopicOverview: nonCoreInOverview,
    coreTextGradeLeaks: leaks,
    whatToNoticeGradeLeaks: whatToNoticeLeaks,
    whatToNoticeSample: whatToNoticeText.slice(0, 500),
    outOfGradeTransparencyCount:
      (detailed?.outOfGradePracticeTransparency?.advancedPractice?.length || 0) +
      (detailed?.outOfGradePracticeTransparency?.foundationPractice?.length || 0),
    aiInsightGradeLeaks: aiLeaks,
    aiInsightSample: aiInsightText.slice(0, 500),
    topicRecommendationCount: (detailed?.subjectProfiles || []).reduce(
      (n, sp) => n + (sp.topicRecommendations?.length || 0),
      0,
    ),
    executiveFocusCount: (detailed?.executiveSummary?.topFocusAreasHe || []).length,
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
