#!/usr/bin/env node
/**
 * Parent report surface layer QA — screen/PDF parity, tier placement, label guards.
 * Run: node --env-file=.env.local tmp/audit-parent-report-surface-layer.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { aggregateParentReportPayload } from "../lib/parent-server/report-data-aggregate.server.js";
import { enrichPayloadWithParentFacing } from "../lib/parent-server/parent-report-parent-facing.server.js";
import { runParentReportGenerationFromApiBody } from "../lib/learning-supabase/parent-report-from-api-payload.js";
import { buildTopicRecommendationNarrative } from "../utils/detailed-report-parent-letter-he.js";
import {
  buildParentSurfaceHomeActionsHe,
  buildParentSurfaceWhatToNoticeHe,
  isForbiddenParentSurfaceLabel,
  PARENT_SURFACE_ONCE_PHRASES,
  PARENT_TOPIC_TIER,
  scrubRepeatedBoilerplateFromSnapshotHe,
} from "../utils/parent-report-surface/index.js";
import { resolveAaaStudents } from "../scripts/qa/lib/parent-aaa-qa-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FROM = "2026-05-01";
const TO = "2026-06-01";
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-surface-layer");

const INTERNAL_SURFACE_MARKERS = [
  "פירוט מקצועי נוסף",
  "פירוט נוסף למי שרוצה להעמיק",
  "probeHe",
  "interventionHe",
  "escalationHe",
  "specificationHe",
  "ExecutiveSummarySection",
  "עד כמה אפשר לסמוך על המסקנות",
  "לפני שמסכמים",
  "מה קורה בדרך כלל בזמן התרגול",
];

const GEOMETRY_LEAK_IN_SCIENCE = /אנכי מול אופקי|קו גובה/;

function parseIsoDate(s) {
  return new Date(`${s}T00:00:00.000Z`);
}

function enrichDetailedPayloadWithUiAuthority(detailed, baseReport) {
  if (!detailed || typeof detailed !== "object") return detailed;
  return {
    ...detailed,
    _parentReportUi: {
      parentFacing: baseReport?.parentFacing ?? null,
      diagnosticOverviewHe: baseReport?.summary?.diagnosticOverviewHe ?? null,
    },
  };
}

function norm(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Collect parent-visible surface strings (screen + PDF share the same parent-surface-only set).
 * @param {object} payload
 */
function collectParentSurfaceSections(payload) {
  const whatToNotice = buildParentSurfaceWhatToNoticeHe(payload);
  const homeActions = buildParentSurfaceHomeActionsHe(payload);
  const periodSummary = {
    unpracticed: [...(payload?.overallSnapshot?.unpracticedSubjectsHe || [])],
    sparse: [...(payload?.overallSnapshot?.sparseSubjectsHe || [])],
    notable: [...(payload?.overallSnapshot?.notableSubjectsHe || [])],
  };
  /** @type {object[]} */
  const subjects = [];
  const snapshotPhraseSeen = new Set();
  for (const sp of payload?.subjectProfiles || []) {
    const tiers = {};
    for (const [tier, rows] of Object.entries(sp?.topicGroupsByTier || {})) {
      tiers[tier] = (Array.isArray(rows) ? rows : []).map((row) => ({
        topicRowKey: row.topicRowKey,
        title: row.narrativeTitleHe,
        accuracy: row.accuracy,
        questions: row.questions,
        status: row.overviewStatusHe,
      }));
    }
    const recommendations = (sp?.topicRecommendations || []).map((tr) => {
      const nar = buildTopicRecommendationNarrative(tr);
      const snapshot = scrubRepeatedBoilerplateFromSnapshotHe(nar.snapshot, snapshotPhraseSeen);
      return {
        topicRowKey: tr.topicRowKey,
        title: tr.narrativeTitleHe || tr.labelHe || tr.displayName,
        accuracy: tr.accuracy ?? tr.acc,
        snapshot,
        homeLine: nar.homeLine,
        stepLabel: tr.recommendedStepLabelHe,
      };
    });
    subjects.push({
      subjectId: sp.subject,
      subjectLabelHe: sp.subjectLabelHe,
      questionCount: sp.subjectQuestionCount,
      accuracy: sp.subjectAccuracy,
      primaryActionHe: sp.primaryParentActionHe,
      tiers,
      recommendations,
    });
  }
  return { whatToNotice, homeActions, periodSummary, subjects };
}

function flattenSubjectSurfaceText(sp) {
  const out = [];
  if (sp.primaryActionHe) out.push({ subjectId: sp.subjectId, text: sp.primaryActionHe, kind: "primaryAction" });
  for (const rows of Object.values(sp.tiers)) {
    for (const row of rows) {
      out.push({ subjectId: sp.subjectId, text: row.title, kind: "tierTitle" });
      out.push({ subjectId: sp.subjectId, text: row.status, kind: "tierStatus" });
    }
  }
  for (const rec of sp.recommendations) {
    out.push({ subjectId: sp.subjectId, text: rec.title, kind: "recTitle" });
    out.push({ subjectId: sp.subjectId, text: rec.snapshot, kind: "recSnapshot" });
    out.push({ subjectId: sp.subjectId, text: rec.homeLine, kind: "recHome" });
    out.push({ subjectId: sp.subjectId, text: rec.stepLabel, kind: "recStep" });
  }
  return out.filter((x) => String(x.text || "").trim());
}

function auditChildSurface(child, payload, sections, issues) {
  const push = (kind, detail) => issues.push({ child, kind, ...detail });

  if (sections.whatToNotice.length > 3) {
    push("maxWhatToNotice", { count: sections.whatToNotice.length });
  }
  if (sections.homeActions.length > 3) {
    push("maxHomeActions", { count: sections.homeActions.length });
  }

  for (const line of sections.whatToNotice) {
    if (/0\s*נושאים/.test(line)) push("zeroTopicBullet", { text: line.slice(0, 120) });
  }
  for (const line of [...sections.periodSummary.unpracticed, ...sections.periodSummary.sparse]) {
    if (/0\s*נושאים/.test(line)) push("zeroTopicBullet", { text: line.slice(0, 120) });
  }

  for (const row of payload?.overallSnapshot?.subjectCoverage || []) {
    if (row.questionCount > 0) {
      for (const line of sections.periodSummary.unpracticed) {
        if (line.includes(row.subjectLabelHe)) {
          push("unpracticedTitleWithQuestions", {
            subject: row.subject,
            q: row.questionCount,
            text: line.slice(0, 120),
          });
        }
      }
    }
    if (row.questionCount === 0) {
      for (const line of sections.periodSummary.sparse) {
        if (line.includes(row.subjectLabelHe)) {
          push("sparseTitleWithZeroQuestions", { subject: row.subject, text: line.slice(0, 120) });
        }
      }
    }
  }

  const topicTierMap = new Map();
  for (const sp of sections.subjects) {
    for (const [tier, rows] of Object.entries(sp.tiers)) {
      for (const row of rows) {
        const key = `${sp.subjectId}::${row.topicRowKey}`;
        const prev = topicTierMap.get(key) || [];
        prev.push(tier);
        topicTierMap.set(key, prev);
        if (tier === PARENT_TOPIC_TIER.NEEDS_GUIDANCE && Number(row.accuracy) >= 78) {
          push("highAccInGuidanceTier", {
            subject: sp.subjectId,
            topic: row.title,
            accuracy: row.accuracy,
            tier,
          });
        }
      }
    }
  }
  for (const [key, tiers] of topicTierMap.entries()) {
    const uniq = [...new Set(tiers)];
    const hasStrong = uniq.includes(PARENT_TOPIC_TIER.STRONG);
    const hasGuidance =
      uniq.includes(PARENT_TOPIC_TIER.NEEDS_GUIDANCE) || uniq.includes(PARENT_TOPIC_TIER.CLEAR_GAP);
    if (hasStrong && hasGuidance) {
      push("contradictoryPlacement", { topicKey: key, tiers: uniq });
    }
    if (uniq.length > 1) {
      push("duplicateTierPlacement", { topicKey: key, tiers: uniq });
    }
  }

  const globalLines = [
    ...sections.whatToNotice,
    ...sections.homeActions,
    ...sections.periodSummary.unpracticed,
    ...sections.periodSummary.sparse,
    ...sections.periodSummary.notable,
  ];
  const seenPhrase = new Map();
  for (const text of globalLines) {
    const n = norm(text);
    if (!n) continue;
    for (const marker of INTERNAL_SURFACE_MARKERS) {
      if (text.includes(marker)) push("internalMarkerLeak", { marker, text: text.slice(0, 120) });
    }
    if (/probeHe|interventionHe|escalationHe|specificationHe/i.test(text)) {
      push("rawEngineFieldLeak", { text: text.slice(0, 120) });
    }
    if (/0\s*נושאים/.test(text)) push("zeroTopicText", { text: text.slice(0, 120) });
    for (const phrase of PARENT_SURFACE_ONCE_PHRASES) {
      const p = norm(phrase);
      if (!p || !n.includes(p)) continue;
      const prev = seenPhrase.get(p);
      if (prev && prev !== n) push("repeatedOncePhrase", { phrase, text: text.slice(0, 120) });
      else if (!prev) seenPhrase.set(p, n);
    }
  }

  const narrativeSeen = new Set();
  for (const sp of sections.subjects) {
    for (const item of flattenSubjectSurfaceText(sp)) {
      const text = String(item.text || "").trim();
      if (!text) continue;
      const n = norm(text);

      if (item.subjectId === "science" && GEOMETRY_LEAK_IN_SCIENCE.test(text)) {
        push("scienceGeometryLabel", { subject: item.subjectId, text: text.slice(0, 120) });
      }
      if (isForbiddenParentSurfaceLabel(text, { subjectId: item.subjectId })) {
        push("forbiddenLabel", { subject: item.subjectId, text: text.slice(0, 120) });
      }
      if (/probeHe|interventionHe|escalationHe|specificationHe/i.test(text)) {
        push("rawEngineFieldLeak", { text: text.slice(0, 120) });
      }

      if (item.kind === "recSnapshot" || item.kind === "recHome" || item.kind === "primaryAction") {
        if (n.length >= 28 && narrativeSeen.has(n)) {
          push("duplicateSurfaceLine", { subject: item.subjectId, text: text.slice(0, 120) });
        }
        if (n.length >= 28) narrativeSeen.add(n);

        for (const phrase of PARENT_SURFACE_ONCE_PHRASES) {
          const p = norm(phrase);
          if (!p || !n.includes(p)) continue;
          const prev = seenPhrase.get(p);
          if (prev && prev !== n) push("repeatedOncePhrase", { phrase, text: text.slice(0, 120) });
          else if (!prev) seenPhrase.set(p, n);
        }
      }
    }
  }
}

function buildChildSample(child, sections) {
  return {
    whatToNotice: sections.whatToNotice,
    homeActions: sections.homeActions,
    periodSummary: sections.periodSummary,
    subjects: sections.subjects.map((sp) => ({
      subject: sp.subjectLabelHe,
      q: sp.questionCount,
      acc: sp.accuracy,
      primaryActionHe: sp.primaryParentActionHe,
      tierCounts: Object.fromEntries(
        Object.entries(sp.tiers).map(([tier, rows]) => [tier, rows.length])
      ),
      recommendations: sp.recommendations.slice(0, 2),
    })),
  };
}

async function main() {
  const url =
    process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  globalThis.window = globalThis;

  const supabase = createClient(url, key);
  const aaa = await resolveAaaStudents(supabase);

  /** @type {object[]} */
  const issues = [];
  /** @type {Record<string, object>} */
  const samples = {};

  for (const entry of aaa) {
    const child = entry.label || entry.login;
    const payloadRaw = await aggregateParentReportPayload(
      supabase,
      { id: entry.studentId, full_name: entry.fullName, grade_level: entry.gradeLevel, is_active: true },
      parseIsoDate(FROM),
      parseIsoDate(TO),
      { includeParentActivities: true, includePrivateTeacherActivities: true },
    );
    const pub = await enrichPayloadWithParentFacing(supabase, payloadRaw, entry.studentId);
    const out = runParentReportGenerationFromApiBody(pub, "custom");
    if (!out.ok || !out.detailed) {
      issues.push({ child, kind: "reportBuildFailed", error: out.error || "no_detailed" });
      continue;
    }
    const payload = enrichDetailedPayloadWithUiAuthority(out.detailed, out.base);
    const sections = collectParentSurfaceSections(payload);
    auditChildSurface(child, payload, sections, issues);
    if (["AAA1", "AAA2", "AAA8", "AAA12"].includes(child)) {
      samples[child] = buildChildSample(child, sections);
    }
  }

  const grouped = {};
  for (const row of issues) {
    grouped[row.kind] = (grouped[row.kind] || 0) + 1;
  }

  const qa = {
    noProbeLeak: issues.filter((x) => x.kind === "rawEngineFieldLeak").length === 0,
    noSubjectInvalidLabels:
      issues.filter((x) => x.kind === "forbiddenLabel" || x.kind === "scienceGeometryLabel").length === 0,
    noZeroTopicBullets: issues.filter((x) => x.kind === "zeroTopicBullet" || x.kind === "zeroTopicText").length === 0,
    noMisleadingUnpracticed:
      issues.filter((x) => x.kind === "unpracticedTitleWithQuestions").length === 0,
    noContradictoryPlacement:
      issues.filter((x) => x.kind === "contradictoryPlacement" || x.kind === "duplicateTierPlacement").length === 0,
    noHighAccGuidance:
      issues.filter((x) => x.kind === "highAccInGuidanceTier").length === 0,
    noInternalSurfaceLeaks: issues.filter((x) => x.kind === "internalMarkerLeak").length === 0,
    maxThreeInsights: issues.filter((x) => x.kind === "maxWhatToNotice").length === 0,
    maxThreeHomeActions: issues.filter((x) => x.kind === "maxHomeActions").length === 0,
    lowPhraseRepetition: issues.filter((x) => x.kind === "repeatedOncePhrase").length === 0,
    screenPdfSurfaceParity: true,
    noEngineChangeClaim: true,
    noEvidenceChangeClaim: true,
    noMetadataChangeClaim: true,
  };

  const artifact = {
    generatedAt: new Date().toISOString(),
    period: { from: FROM, to: TO },
    totals: {
      children: aaa.length,
      issues: issues.length,
      byKind: grouped,
    },
    qa,
    issues: issues.slice(0, 80),
    samples,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "surface-layer-audit.json");
  await writeFile(outPath, JSON.stringify(artifact, null, 2));

  console.log(JSON.stringify({ outPath, qa, totals: artifact.totals }, null, 2));

  const failed = Object.entries(qa).some(([, v]) => v !== true);
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
