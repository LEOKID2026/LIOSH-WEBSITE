/**
 * Final closure Round 2 — M-01 / H-05 / E-08 parent-report bridge verify.
 * Run: npx tsx scripts/parent-report-grade-aware-phase6-round2-bridge-verify.mjs
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

const BRIDGE_EXPECT = [
  { subjectId: "math", taxonomyId: "M-01", bucket: "scale", band: "g3_g4", grade: "g4" },
  { subjectId: "math", taxonomyId: "M-01", bucket: "prime_composite", band: "g3_g4", grade: "g4" },
  { subjectId: "math", taxonomyId: "M-01", bucket: "zero_one_properties", band: "g3_g4", grade: "g4" },
  { subjectId: "hebrew", taxonomyId: "H-05", bucket: "homophones", band: "g3_g4", grade: "g4" },
  { subjectId: "english", taxonomyId: "E-08", bucket: "listening", band: "g3_g4", grade: "g4" },
];

function r(subjectId, taxonomyId, bucket, grade, slot = "action") {
  return resolveGradeAwareParentRecommendationHe({
    subjectId,
    taxonomyId,
    bucketKey: bucket,
    gradeKey: grade,
    slot: slot === "nextGoal" ? "nextGoal" : "action",
  });
}

for (const { subjectId, taxonomyId, bucket, band, grade } of BRIDGE_EXPECT) {
  const bridgeSubject = subjectId === "math" ? "math" : subjectId;
  const ids = taxonomyIdsForReportBucket(bridgeSubject, bucket);
  if (!ids.includes(taxonomyId)) {
    throw new Error(`${taxonomyId}: bucket "${bucket}" must map in topic-taxonomy-bridge`);
  }
  const tpl = GRADE_AWARE_RECOMMENDATION_TEMPLATES[subjectId]?.[taxonomyId];
  const ov = tpl?.bucketOverrides?.[bucket]?.[band];
  if (!ov?.actionTextHe || !ov?.goalTextHe) {
    throw new Error(`Missing template for ${subjectId} ${taxonomyId} / ${bucket} / ${band}`);
  }
  const action = r(subjectId, taxonomyId, bucket, grade, "action");
  const goal = r(subjectId, taxonomyId, bucket, grade, "nextGoal");
  if (action !== ov.actionTextHe) throw new Error(`${taxonomyId} ${bucket} action drift`);
  if (goal !== ov.goalTextHe) throw new Error(`${taxonomyId} ${bucket} goal drift`);
  const blob = `${action}\n${goal}`;
  if (/\b(undefined|null|NaN)\b/.test(blob)) throw new Error(`${taxonomyId} resolved text contains nullish token`);
  if (new RegExp(`\\b${taxonomyId}\\b`).test(blob)) throw new Error(`${taxonomyId} resolved text leaks taxonomy id`);
  if (/\b(scale|prime_composite|zero_one_properties|homophones|listening)\b/.test(blob)) {
    throw new Error(`${taxonomyId} resolved text leaks raw bucket id`);
  }
}

process.stdout.write("parent-report-grade-aware-phase6-round2-bridge-verify: ok\n");
