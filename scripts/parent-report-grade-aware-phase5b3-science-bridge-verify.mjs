/**
 * Phase 5-B3 — Science S-05 / S-06 / S-08 bridge implemented.
 * Run: npx tsx scripts/parent-report-grade-aware-phase5b3-science-bridge-verify.mjs
 */

const { taxonomyIdsForReportBucket } = await import(
  new URL("../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js", import.meta.url).href
);
const { resolveGradeAwareParentRecommendationHe } = await import(
  new URL("../utils/parent-report-language/grade-aware-recommendation-resolver.js", import.meta.url).href
);
const { GRADE_AWARE_RECOMMENDATION_TEMPLATES } = await import(
  new URL("../utils/parent-report-language/grade-aware-recommendation-templates.js", import.meta.url).href
);

const REQUIRED = ["S-05", "S-06", "S-08"];

const BRIDGE_EXPECT = {
  "S-05": { bucket: "materials", band: "g3_g4" },
  "S-06": { bucket: "earth_space", band: "g3_g4" },
  "S-08": { bucket: "animals", band: "g3_g4" },
};

for (const [tid, { bucket }] of Object.entries(BRIDGE_EXPECT)) {
  const ids = taxonomyIdsForReportBucket("science", bucket);
  if (!ids.includes(tid)) {
    throw new Error(`Phase 5-B3: bucket "${bucket}" must list ${tid} in SCIENCE_TOPIC_TO_IDS`);
  }
}

const sci = GRADE_AWARE_RECOMMENDATION_TEMPLATES.science;
for (const id of REQUIRED) {
  if (sci[id] == null) throw new Error(`Missing Hebrew template object for ${id}`);
  const ov = sci[id].bucketOverrides?.[BRIDGE_EXPECT[id].bucket]?.[BRIDGE_EXPECT[id].band];
  if (!ov?.actionTextHe || !ov?.goalTextHe) {
    throw new Error(`Missing bucketOverrides for ${id} / ${BRIDGE_EXPECT[id].bucket} / ${BRIDGE_EXPECT[id].band}`);
  }
}

function r(tid, bucket, grade, slot = "action") {
  return resolveGradeAwareParentRecommendationHe({
    subjectId: "science",
    taxonomyId: tid,
    bucketKey: bucket,
    gradeKey: grade,
    slot: slot === "nextGoal" ? "nextGoal" : "action",
  });
}

const s01 = sci["S-01"].bucketOverrides.animals.g3_g4.actionTextHe;
const s02 = sci["S-02"].bucketOverrides.experiments.g3_g4.actionTextHe;
const s03 = sci["S-03"].bucketOverrides.body.g3_g4.actionTextHe;
const s04 = sci["S-04"].bucketOverrides.materials.g3_g4.actionTextHe;
const s07 = sci["S-07"].bucketOverrides.environment.g3_g4.actionTextHe;

if (r("S-01", "animals", "g4") !== s01) throw new Error("S-01 animals g4 template drift");
if (r("S-02", "experiments", "g4") !== s02) throw new Error("S-02 experiments g4 template drift");
if (r("S-03", "body", "g4") !== s03) throw new Error("S-03 body g4 template drift");
if (r("S-04", "materials", "g4") !== s04) throw new Error("S-04 materials g4 template drift");
if (r("S-07", "environment", "g4") !== s07) throw new Error("S-07 environment g4 template drift");

const s05a = sci["S-05"].bucketOverrides.materials.g3_g4.actionTextHe;
const s05g = sci["S-05"].bucketOverrides.materials.g3_g4.goalTextHe;
const s06a = sci["S-06"].bucketOverrides.earth_space.g3_g4.actionTextHe;
const s06g = sci["S-06"].bucketOverrides.earth_space.g3_g4.goalTextHe;
const s08a = sci["S-08"].bucketOverrides.animals.g3_g4.actionTextHe;
const s08g = sci["S-08"].bucketOverrides.animals.g3_g4.goalTextHe;

if (r("S-05", "materials", "g4") !== s05a) throw new Error("S-05 materials g4 action drift");
if (r("S-05", "materials", "g4", "nextGoal") !== s05g) throw new Error("S-05 materials g4 goal drift");
if (r("S-06", "earth_space", "g4") !== s06a) throw new Error("S-06 earth_space g4 action drift");
if (r("S-06", "earth_space", "g4", "nextGoal") !== s06g) throw new Error("S-06 earth_space g4 goal drift");
if (r("S-08", "animals", "g4") !== s08a) throw new Error("S-08 animals g4 action drift");
if (r("S-08", "animals", "g4", "nextGoal") !== s08g) throw new Error("S-08 animals g4 goal drift");

for (const tid of REQUIRED) {
  const text = [r(tid, BRIDGE_EXPECT[tid].bucket, "g4"), r(tid, BRIDGE_EXPECT[tid].bucket, "g4", "nextGoal")].join("\n");
  if (/\b(undefined|null|NaN|S-\d+)\b/.test(text)) throw new Error(`${tid} resolved text contains raw token`);
  if (text.includes("S-05") || text.includes("S-06") || text.includes("S-08")) {
    throw new Error(`${tid} resolved text leaks taxonomy id`);
  }
}

process.stdout.write("parent-report-grade-aware-phase5b3-science-bridge-verify: ok\n");
