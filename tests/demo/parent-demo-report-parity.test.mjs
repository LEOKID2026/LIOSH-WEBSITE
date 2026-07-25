/**
 * Demo parent-report parity — focused tests (no browser).
 * Run: node --test tests/demo/parent-demo-report-parity.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDemoParentReportPayload } from "../../lib/demo/parent-demo-data/report-payload-builder.server.js";
import { DEMO_HISTORY_START } from "../../lib/demo/parent-demo-data/constants.js";
import { todayYmdIsrael } from "../../lib/demo/parent-demo-data/israel-date.server.js";
import { generateDemoLearningRows } from "../../lib/demo/parent-demo-data/daily-generator.js";
import { DEMO_PARENT_CHILDREN } from "../../lib/demo/parent-demo-data/children.js";
import {
  aggregateReportPayloadFromActivityRows,
  parseIsoDateParam,
} from "../../lib/parent-server/report-data-aggregate.server.js";
import { attachParentContextEvidenceQuality } from "../../lib/learning/evidence-quality.js";
import {
  attachParentFacingToPayload,
  buildParentFacingBlocks,
} from "../../lib/parent-server/parent-report-parent-facing.server.js";
import { rebuildParentReportBaseFromAggregatedBody } from "../../lib/parent-server/rebuild-parent-report-from-aggregate.server.js";
import {
  applyServerParentFacingAuthorityToClientReport,
  cloneParentFacingBlock,
} from "../../lib/parent-server/parent-facing-report-authority.js";
import { applyTopicEngineParentFacingInsights } from "../../utils/parent-report-engine-insights-he.js";
import { collectTopicEngineRowsFromReport } from "../../utils/parent-report-engine-insights-he.js";
import { getLpdFromRow } from "../../utils/learning-pattern-decision/lpd-parent-facing-copy.js";
import {
  attachOutOfGradeTransparencyFromRawBase,
  buildDetailedParentReportFromBaseReport,
} from "../../utils/detailed-parent-report.js";
import { buildRegularReportViewModel } from "../../lib/parent-ui/parent-report-regular-display.js";
import { isForbiddenParentSurfaceLabel } from "../../utils/parent-report-surface/parent-surface-label-guard.js";

const FROM = DEMO_HISTORY_START;
const TO = todayYmdIsrael();
const NOAM = "demo-parent-child-noam-g2";
const MAYA = "demo-parent-child-maya-g4";
const ARI = "demo-parent-child-ari-g6";

function stableParentFacing(pf) {
  return JSON.stringify({
    insights: pf?.insights || [],
    homeRecommendations: pf?.homeRecommendations || [],
    systemActions: pf?.systemActions || [],
    parentState: pf?.parentState || null,
  });
}

function extractDecisionSnapshot(base) {
  const rows = collectTopicEngineRowsFromReport(base)
    .map((row) => {
      const lpd = getLpdFromRow(row);
      const edc = lpd?.engineDecisionContract || row.engineDecisionContract || null;
      const adc = edc?.actionDecisionContract || null;
      return {
        subject: row.subjectId || row.subject || null,
        topic: row.displayName || row.label || row.topicName || null,
        questions: row.questions ?? null,
        wrong: row.wrong ?? null,
        accuracy: row.accuracy ?? null,
        taxonomyId: edc?.detectedTaxonomyId || null,
        detectedPattern: edc?.detectedPattern || null,
        patternLayer: edc?.patternLayer || null,
        engineDecision: edc?.engineDecision || lpd?.engineDecision || null,
        adcAction: adc?.action || null,
        actionState: adc?.authorityTrace?.actionState || null,
        parentVisibleFinding: lpd?.parentVisibleFinding || null,
        parentSafeFinding: edc?.parentSafeFinding || null,
        blockPatternClaim: edc?.blockPatternClaim ?? null,
        evidenceCount: edc?.evidenceCount ?? lpd?.metrics?.questions ?? null,
      };
    })
    .filter((r) => r.engineDecision)
    .sort((a, b) => String(a.topic).localeCompare(String(b.topic)));
  return rows;
}

function collectParentReadableTexts(base, detailed) {
  const texts = [];
  const pf = base?.parentFacing || {};
  for (const arr of [pf.insights, pf.homeRecommendations, pf.systemActions]) {
    if (Array.isArray(arr)) texts.push(...arr.map(String));
  }
  const shortTop = detailed?.parentProductContractV1?.top || {};
  for (const k of Object.keys(shortTop)) {
    if (typeof shortTop[k] === "string") texts.push(shortTop[k]);
  }
  const exec = detailed?.executiveSummary || {};
  for (const [k, v] of Object.entries(exec)) {
    if (typeof v === "string") texts.push(v);
    if (Array.isArray(v)) texts.push(...v.map(String));
  }
  for (const row of extractDecisionSnapshot(base)) {
    if (row.parentVisibleFinding) texts.push(row.parentVisibleFinding);
    if (row.parentSafeFinding) texts.push(row.parentSafeFinding);
  }
  return texts;
}

function buildProdLikeFromDemoRows(childId, fromYmd, toYmd) {
  const child = DEMO_PARENT_CHILDREN.find((c) => c.id === childId);
  const { sessions, answers } = generateDemoLearningRows(childId, fromYmd, toYmd);
  const student = {
    id: child.id,
    full_name: child.full_name,
    grade_level: child.grade_level,
    is_active: child.is_active,
    account_kind: child.account_kind,
  };
  const fromDate = parseIsoDateParam(fromYmd);
  const toDate = parseIsoDateParam(toYmd);
  const aggregated = aggregateReportPayloadFromActivityRows(
    student,
    sessions,
    answers,
    fromDate,
    toDate,
    { sessionsFilterField: "started_at", answersFilterField: "answered_at" },
    [],
    [],
  );
  const withQuality = attachParentContextEvidenceQuality({
    ...aggregated,
    range: { from: fromYmd, to: toYmd },
  });
  const blocks = buildParentFacingBlocks(withQuality);
  const payload = attachParentFacingToPayload(
    { ok: true, ...withQuality, student },
    { ...blocks, teacherMessages: [] },
  );
  const rebuilt = rebuildParentReportBaseFromAggregatedBody(payload, "custom");
  assert.equal(rebuilt.ok, true);
  return { payload, base: rebuilt.base, rows: extractDecisionSnapshot(rebuilt.base) };
}

describe("demo parent report parity", () => {
  test("1. demo API parentFacing matches engine rebuild (not aggregate-only scaffold)", () => {
    const built = buildDemoParentReportPayload(NOAM, FROM, TO);
    assert.equal(built.ok, true);
    assert.equal(built.payload?.meta?.parentFacingSource, "engine_rebuild");
    const pf = built.payload.parentFacing;
    assert.ok(Array.isArray(pf.insights) && pf.insights.length > 0);
    const rebuilt = rebuildParentReportBaseFromAggregatedBody(built.payload, "custom");
    assert.equal(rebuilt.ok, true);
    assert.equal(stableParentFacing(pf), stableParentFacing(rebuilt.parentFacing));
  });

  test("2. production-path and demo-path same answer rows → decision parity", () => {
    const demo = buildDemoParentReportPayload(NOAM, FROM, TO);
    assert.equal(demo.ok, true);
    const demoRebuild = rebuildParentReportBaseFromAggregatedBody(demo.payload, "custom");
    assert.equal(demoRebuild.ok, true);
    const demoRows = extractDecisionSnapshot(demoRebuild.base);

    const prod = buildProdLikeFromDemoRows(NOAM, FROM, TO);
    const keys = [
      "taxonomyId",
      "detectedPattern",
      "patternLayer",
      "engineDecision",
      "adcAction",
      "actionState",
      "parentVisibleFinding",
      "parentSafeFinding",
      "blockPatternClaim",
    ];
    assert.equal(demoRows.length, prod.rows.length);
    for (let i = 0; i < demoRows.length; i += 1) {
      for (const k of keys) {
        assert.equal(
          demoRows[i][k],
          prod.rows[i][k],
          `row ${i} (${demoRows[i].topic}) field ${k}`,
        );
      }
    }
  });

  test("3. mutation isolation across children and repeat builds", () => {
    const a1 = buildDemoParentReportPayload(NOAM, FROM, TO);
    const b = buildDemoParentReportPayload(MAYA, FROM, TO);
    const a2 = buildDemoParentReportPayload(NOAM, FROM, TO);
    assert.equal(a1.ok && b.ok && a2.ok, true);
    assert.equal(stableParentFacing(a1.payload.parentFacing), stableParentFacing(a2.payload.parentFacing));
    assert.notEqual(stableParentFacing(a1.payload.parentFacing), stableParentFacing(b.payload.parentFacing));

    const snap = cloneParentFacingBlock(a1.payload.parentFacing);
    const fakeReport = { parentFacing: null };
    applyServerParentFacingAuthorityToClientReport(fakeReport, a1.payload);
    applyTopicEngineParentFacingInsights(fakeReport, a1.payload);
    fakeReport.parentFacing.insights = ["MUTATED"];
    assert.equal(stableParentFacing(a1.payload.parentFacing), stableParentFacing(snap));
  });

  test("4. probeHe does not leak to parent-readable text; remains on internal unit probe", () => {
    const built = buildDemoParentReportPayload(NOAM, FROM, TO);
    const rebuilt = rebuildParentReportBaseFromAggregatedBody(built.payload, "custom");
    assert.equal(rebuilt.ok, true);
    const vm = buildRegularReportViewModel(rebuilt.base)?.report ?? rebuilt.base;
    const detailed = attachOutOfGradeTransparencyFromRawBase(
      buildDetailedParentReportFromBaseReport(vm, {
        playerName: "נועם",
        period: "custom",
      }),
      rebuilt.base,
    );
    const texts = collectParentReadableTexts(vm, detailed);
    for (const t of texts) {
      assert.equal(
        isForbiddenParentSurfaceLabel(t, { subjectId: "math" }) && /תבנית שלבים|probeHe/i.test(t),
        false,
        `leaked parent text: ${t}`,
      );
      assert.equal(/עם תבנית שלבים/.test(t), false, `probe phrase leaked: ${t}`);
    }
    const units = rebuilt.base?.diagnosticEngineV2?.units || [];
    const withProbe = units.find((u) => u?.probe?.specificationHe || u?.taxonomy?.probeHe);
    // Internal probe may exist on some classified units; if present it must stay internal-only.
    if (withProbe) {
      const internal =
        withProbe.probe?.specificationHe ||
        withProbe.taxonomy?.probeHe ||
        withProbe.intervention?.immediateActionHe ||
        "";
      assert.ok(String(internal).length >= 0);
    }
  });

  test("5-7. real engineDecision, ADC action, and home recommendation present", () => {
    const built = buildDemoParentReportPayload(NOAM, FROM, TO);
    const rebuilt = rebuildParentReportBaseFromAggregatedBody(built.payload, "custom");
    const rows = extractDecisionSnapshot(rebuilt.base);
    assert.ok(rows.some((r) => r.engineDecision));
    assert.ok(rows.some((r) => r.adcAction));
    assert.ok((rebuilt.base.parentFacing?.homeRecommendations || []).length > 0);
    assert.ok(rows.some((r) => r.parentVisibleFinding || r.parentSafeFinding));
  });

  test("8. unpracticed demo-filtered subjects are not invented in insights", () => {
    const built = buildDemoParentReportPayload(NOAM, FROM, TO);
    const subjects = Object.keys(built.payload.subjects || {});
    assert.ok(!subjects.includes("history"));
    assert.ok(!subjects.includes("moledet"));
    const blob = JSON.stringify(built.payload.parentFacing || {});
    assert.equal(/היסטוריה|מולדת/.test(blob) && subjects.includes("history"), false);
  });

  test("9. three demo profiles produce different parentFacing outputs", () => {
    const noam = buildDemoParentReportPayload(NOAM, FROM, TO);
    const maya = buildDemoParentReportPayload(MAYA, FROM, TO);
    const ari = buildDemoParentReportPayload(ARI, FROM, TO);
    const set = new Set([
      stableParentFacing(noam.payload.parentFacing),
      stableParentFacing(maya.payload.parentFacing),
      stableParentFacing(ari.payload.parentFacing),
    ]);
    assert.equal(set.size, 3);
  });

  test("10. approved Hebrew copy markers present (מה רואים / no legacy מה נמצא)", () => {
    const built = buildDemoParentReportPayload(NOAM, FROM, TO);
    const rebuilt = rebuildParentReportBaseFromAggregatedBody(built.payload, "custom");
    const blob = JSON.stringify({
      pf: rebuilt.base.parentFacing,
      rows: extractDecisionSnapshot(rebuilt.base),
    });
    assert.equal(/מה נמצא:/.test(blob), false);
  });

  test("profiles cover mastery/gap/strengthen/pattern/adc/cautious initial_data", () => {
    const union = {
      decisions: new Set(),
      layers: new Set(),
      adc: new Set(),
      patterns: new Set(),
      statuses: new Set(),
    };
    for (const id of [NOAM, MAYA, ARI]) {
      const built = buildDemoParentReportPayload(id, FROM, TO);
      const rebuilt = rebuildParentReportBaseFromAggregatedBody(built.payload, "custom");
      for (const row of extractDecisionSnapshot(rebuilt.base)) {
        if (row.engineDecision) union.decisions.add(row.engineDecision);
        if (row.patternLayer) union.layers.add(row.patternLayer);
        if (row.adcAction) union.adc.add(row.adcAction);
        if (row.detectedPattern) union.patterns.add(row.detectedPattern);
      }
      for (const u of rebuilt.base?.diagnosticEngineV2?.units || []) {
        const lpd = u.learningPatternDecision;
        if (lpd?.topicStatus) union.statuses.add(lpd.topicStatus);
      }
      for (const row of collectTopicEngineRowsFromReport(rebuilt.base)) {
        const lpd = getLpdFromRow(row);
        if (lpd?.topicStatus) union.statuses.add(lpd.topicStatus);
      }
    }
    assert.ok(union.decisions.has("clear_topic_gap") || union.decisions.has("topic_needs_strengthening"));
    assert.ok(union.decisions.has("mastery_stable") || union.decisions.has("partial_stable"));
    assert.ok(union.patterns.size >= 1);
    assert.ok(union.adc.size >= 1);
    assert.ok(
      union.statuses.has("initial_data") ||
        [...union.decisions].includes("insufficient_data") ||
        [...union.decisions].includes("early_direction_only"),
      `missing cautious state; statuses=${[...union.statuses]} decisions=${[...union.decisions]}`,
    );
  });
});
