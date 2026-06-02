/**
 * Phase 3-B2 — Geometry templates Batch B (G-01, G-03, G-08 bucketOverrides) + routing order smoke.
 * Run: node scripts/parent-report-grade-aware-geometry-batch-b-verify.mjs
 *      npx tsx scripts/parent-report-grade-aware-geometry-batch-b-verify.mjs
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");

if (process.env.LIOSH_TSX_RELAUNCH !== "1") {
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  const r = spawnSync(process.execPath, [tsxCli, __filename, ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, LIOSH_TSX_RELAUNCH: "1" },
  });
  process.exit(r.status ?? 1);
}

const [resolverMod, recMod, templatesMod, detailedMod, v2Mod, truthMod, geomOrderMod] = await Promise.all([
  import("../utils/parent-report-language/grade-aware-recommendation-resolver.js"),
  import("../utils/parent-report-recommendation-consistency.js"),
  import("../utils/parent-report-language/grade-aware-recommendation-templates.js"),
  import("../utils/detailed-parent-report.js"),
  import("../utils/parent-report-v2.js"),
  import("../utils/parent-copilot/truth-packet-v1.js"),
  import(new URL("../utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js", import.meta.url).href),
]);

const { resolveGradeAwareParentRecommendationHe } = resolverMod;
const { resolveUnitParentActionHe } = recMod;
const GRADE_AWARE_RECOMMENDATION_TEMPLATES = templatesMod.GRADE_AWARE_RECOMMENDATION_TEMPLATES;
const { buildDetailedParentReportFromBaseReport } = detailedMod;
const { summarizeV2UnitsForSubjectForTests } = v2Mod;
const { buildTruthPacketV1 } = truthMod;
const { orderGeometryTaxonomyCandidates } = geomOrderMod;

const GEO = GRADE_AWARE_RECOMMENDATION_TEMPLATES.geometry;
const SEP = "\u0001";

const BANNED = [
  "__RAW_PROBE_GEOM_B__",
  "__RAW_INTERVENTION_GEOM_B__",
  "__PATTERN_GEOM_B_INTERNAL__",
  "עם סימון זווית/צלע",
  "כרטיסיות הגדרה",
  "עם/בלי קו גובה",
  "הדגשת גובה",
  "עם/בלי פריסה",
  "גובה חיצוני מודגש",
];

function assertEq(name, actual, expected) {
  const a = String(actual ?? "");
  const e = String(expected ?? "");
  if (a !== e) throw new Error(`${name} mismatch (${e.length} vs ${a.length} chars)`);
}

function assertNull(name, v) {
  if (v != null && String(v).trim() !== "") throw new Error(`${name} expected null`);
}

function assertNoBanned(label, blob) {
  const s = typeof blob === "string" ? blob : JSON.stringify(blob);
  for (const b of BANNED) {
    if (s.includes(b)) throw new Error(`${label} banned: ${b}`);
  }
}

function r(sid, tid, bucket, grade, slot) {
  return resolveGradeAwareParentRecommendationHe({
    subjectId: sid,
    taxonomyId: tid,
    bucketKey: bucket,
    gradeKey: grade,
    slot: slot === "nextGoal" ? "nextGoal" : "action",
  });
}

function rowGeo(topicRowKey, bucketKey, gradeKey) {
  return {
    bucketKey,
    displayName: "גאומטריה",
    questions: 12,
    correct: 8,
    wrong: 4,
    accuracy: 67,
    gradeKey,
    modeKey: "learning",
    levelKey: "easy",
    lastSessionMs: Date.UTC(2026, 4, 6, 12, 0, 0),
  };
}

function buildGeoUnit(taxonomyId, bucketKey, topicRowKey) {
  return {
    blueprintRef: "test",
    engineVersion: "v2",
    unitKey: `geometry::${topicRowKey}`,
    subjectId: "geometry",
    topicRowKey,
    bucketKey,
    displayName: "גאומטריה",
    diagnosis: { allowed: true, taxonomyId, lineHe: "מצביע על דפוס." },
    intervention: {
      immediateActionHe: "__RAW_PROBE_GEOM_B__",
      shortPracticeHe: "__RAW_INTERVENTION_GEOM_B__",
      taxonomyId,
    },
    taxonomy: {
      id: taxonomyId,
      patternHe: "__PATTERN_GEOM_B_INTERNAL__",
      topicHe: "גאומטריה",
      subskillHe: "test",
    },
    recurrence: { wrongCountForRules: 4, full: true, wrongEventCount: 4, rowWrongTotal: 4 },
    confidence: { level: "moderate" },
    priority: { level: "P3", breadth: "narrow" },
    competingHypotheses: { hypotheses: [], distinguishingEvidenceHe: [] },
    strengthProfile: { tags: [], dominantBehavior: null },
    outputGating: {
      interventionAllowed: true,
      diagnosisAllowed: true,
      probeOnly: false,
      cannotConcludeYet: false,
      additiveCautionAllowed: false,
      positiveAuthorityLevel: "none",
    },
    probe: { specificationHe: "__RAW_PROBE_GEOM_B__", objectiveHe: "__RAW_INTERVENTION_GEOM_B__" },
    explainability: { whyNotStrongerConclusionHe: [], cannotConcludeYetHe: [] },
    canonicalState: {
      actionState: "intervene",
      recommendation: { allowed: false, family: "remedial" },
      assessment: { readiness: "ready", confidenceLevel: "moderate", cannotConcludeYet: false },
      evidence: { positiveAuthorityLevel: "none" },
      topicStateId: `ts_${taxonomyId}_${bucketKey}`,
      stateHash: "h1",
    },
  };
}

delete process.env.ENABLE_GRADE_AWARE_RECOMMENDATIONS;
delete process.env.NEXT_PUBLIC_ENABLE_GRADE_AWARE_RECOMMENDATIONS;

// —— G-01 ——
const g1s = GEO["G-01"].bucketOverrides.shapes_basic;
assertEq("G-01 shapes_basic g1 action", r("geometry", "G-01", "shapes_basic", "g1", "action"), g1s.g1_g2.actionTextHe);
assertNull("G-01 quadrilaterals g1", r("geometry", "G-01", "quadrilaterals", "g2", "action"));
assertEq("G-01 quadrilaterals g4 goal", r("geometry", "G-01", "quadrilaterals", "g4", "nextGoal"), GEO["G-01"].bucketOverrides.quadrilaterals.g3_g4.goalTextHe);
assertNull("G-01 parallel_perpendicular g2", r("geometry", "G-01", "parallel_perpendicular", "g2", "nextGoal"));
assertEq("G-01 parallel_perpendicular g4", r("geometry", "G-01", "parallel_perpendicular", "g4", "action"), GEO["G-01"].bucketOverrides.parallel_perpendicular.g3_g4.actionTextHe);
assertNull("G-01 diagonal g1", r("geometry", "G-01", "diagonal", "g1", "action"));
assertEq("G-01 diagonal g6", r("geometry", "G-01", "diagonal", "g6", "action"), GEO["G-01"].bucketOverrides.diagonal.g5_g6.actionTextHe);
assertEq("G-01 tiling g2 goal", r("geometry", "G-01", "tiling", "g2", "nextGoal"), GEO["G-01"].bucketOverrides.tiling.g1_g2.goalTextHe);
assertNull("G-01 unknown bucket mixed", r("geometry", "G-01", "mixed", "g4", "action"));

// —— G-03 ——
assertNull("G-03 quadrilaterals g2", r("geometry", "G-03", "quadrilaterals", "g2", "action"));
assertEq("G-03 quadrilaterals g4", r("geometry", "G-03", "quadrilaterals", "g4", "action"), GEO["G-03"].bucketOverrides.quadrilaterals.g3_g4.actionTextHe);
assertEq("G-03 heights g5 action", r("geometry", "G-03", "heights", "g5", "action"), GEO["G-03"].bucketOverrides.heights.g5_g6.actionTextHe);
assertEq("G-03 area g6 goal", r("geometry", "G-03", "area", "g6", "nextGoal"), GEO["G-03"].bucketOverrides.area.g5_g6.goalTextHe);

// —— G-08 ——
assertNull("G-08 area g4", r("geometry", "G-08", "area", "g4", "action"));
assertEq("G-08 area g6", r("geometry", "G-08", "area", "g6", "action"), GEO["G-08"].bucketOverrides.area.g5_g6.actionTextHe);
assertNull("G-08 triangles g2", r("geometry", "G-08", "triangles", "g2", "action"));
assertEq("G-08 triangles g4", r("geometry", "G-08", "triangles", "g4", "action"), GEO["G-08"].bucketOverrides.triangles.g3_g4.actionTextHe);
assertNull("G-08 pythagoras g4", r("geometry", "G-08", "pythagoras", "g4", "action"));
assertEq("G-08 pythagoras g6", r("geometry", "G-08", "pythagoras", "g6", "action"), GEO["G-08"].bucketOverrides.pythagoras.g5_g6.actionTextHe);

assertNull("unknown grade", r("geometry", "G-01", "tiling", "g9", "action"));
assertNull("null grade", r("geometry", "G-03", "area", null, "action"));

// —— Routing + resolver (first candidate after order uses correct template bucket) ——
const oQuad = orderGeometryTaxonomyCandidates(
  ["G-01", "G-03"],
  [{ patternFamily: "quadrilateral_props", kind: "rectangle" }],
  { bucketKey: "quadrilaterals", row: { gradeKey: "g4" } }
);
if (oQuad[0] !== "G-01") throw new Error("expected G-01 first on quadrilateral property evidence");
const qCopy = GEO["G-01"].bucketOverrides.quadrilaterals.g3_g4.actionTextHe;
assertEq("routing+tpl G-01 quad g4", r("geometry", oQuad[0], "quadrilaterals", "g4", "action"), qCopy);

const oHeight = orderGeometryTaxonomyCandidates(
  ["G-01", "G-03"],
  [{ params: { kind: "area_by_height", missing_height: true } }],
  { bucketKey: "quadrilaterals", row: {} }
);
if (oHeight[0] !== "G-03") throw new Error("expected G-03 first on height evidence");
const hCopy = GEO["G-03"].bucketOverrides.heights.g3_g4.goalTextHe;
assertEq("routing+tpl G-03 heights g4 goal", r("geometry", oHeight[0], "heights", "g4", "nextGoal"), hCopy);

const oArea = orderGeometryTaxonomyCandidates(
  ["G-03", "G-08"],
  [{ patternFamily: "triangle_area", params: { operation: "formula", theorem: "pythagoras" } }],
  { bucketKey: "area", row: { gradeKey: "g6" } }
);
if (oArea[0] !== "G-08") throw new Error("expected G-08 first on formula/triangle evidence for area bucket");
const tCopy = GEO["G-08"].bucketOverrides.triangles.g5_g6.actionTextHe;
assertEq("routing+tpl G-08 triangles g6", r("geometry", oArea[0], "triangles", "g6", "action"), tCopy);

const oTie = orderGeometryTaxonomyCandidates(["G-01", "G-03"], [], { bucketKey: "quadrilaterals" });
if (oTie[0] !== "G-01" || oTie[1] !== "G-03") throw new Error("ambiguous quadrilateral order should preserve bridge order");

// —— Detailed / short / truth ——
const mk = (taxonomyId, bucket, gradeKey) => {
  const trk = `${bucket}${SEP}learning${SEP}${gradeKey}${SEP}easy`;
  return {
    base: {
      startDate: "2026-05-01",
      endDate: "2026-05-08",
      period: "week",
      playerName: "בדיקה",
      summary: { totalQuestions: 20 },
      geometryTopics: { [trk]: rowGeo(trk, bucket, gradeKey) },
      diagnosticEngineV2: { units: [buildGeoUnit(taxonomyId, bucket, trk)] },
    },
    trk,
  };
};

const d1 = buildDetailedParentReportFromBaseReport(mk("G-01", "quadrilaterals", "g4").base, { period: "week" });
const mp1 = d1?.subjectProfiles?.find((p) => p.subject === "geometry");
assertEq("detailed G-01 quad g4", mp1?.parentActionHe, qCopy);
assertNoBanned("detailed G-01", mp1?.parentActionHe);
const tp1 = buildTruthPacketV1(d1, { scopeType: "topic", scopeId: mk("G-01", "quadrilaterals", "g4").trk, scopeLabel: "מרובעים" });
assertNoBanned("truth G-01", JSON.stringify(tp1?.narrative?.textSlots || {}));

const { base: b3, trk: t3 } = mk("G-03", "heights", "g5");
const d3 = buildDetailedParentReportFromBaseReport(b3, { period: "week" });
const mp3 = d3?.subjectProfiles?.find((p) => p.subject === "geometry");
assertEq("detailed G-03 heights g5", mp3?.parentActionHe, GEO["G-03"].bucketOverrides.heights.g5_g6.actionTextHe);
assertNoBanned("detailed G-03", mp3?.parentActionHe);

const { base: b8, trk: t8 } = mk("G-08", "triangles", "g6");
const d8 = buildDetailedParentReportFromBaseReport(b8, { period: "week" });
const mp8 = d8?.subjectProfiles?.find((p) => p.subject === "geometry");
assertEq("detailed G-08 triangles g6", mp8?.parentActionHe, tCopy);
const tp8 = buildTruthPacketV1(d8, { scopeType: "topic", scopeId: t8, scopeLabel: "משולשים" });
assertNoBanned("truth G-08", JSON.stringify(tp8?.narrative?.textSlots || {}));

const u8 = b8.diagnosticEngineV2.units[0];
const sh = summarizeV2UnitsForSubjectForTests(b8.diagnosticEngineV2.units, {
  subjectReportQuestions: 12,
  subjectLabelHe: "גאומטריה",
  topicMap: b8.geometryTopics,
  reportTotalQuestions: 20,
});
assertEq("short G-08", sh.parentActionHe, resolveUnitParentActionHe(u8, "g6"));
assertNoBanned("short G-08", sh.parentActionHe);

process.stdout.write("parent-report-grade-aware-geometry-batch-b-verify: ok\n");
