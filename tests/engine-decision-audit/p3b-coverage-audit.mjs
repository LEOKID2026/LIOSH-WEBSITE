import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const artifactPath = path.join(
  ROOT,
  "artifacts",
  "qa",
  "decision-engine-p3b",
  "p3b-coverage-closure.json",
);
const outputPath = path.join(
  ROOT,
  "artifacts",
  "qa",
  "decision-engine-p3b",
  "p3b-run-summary.json",
);
const payload = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
let assertions = 0;
const failures = [];
const branches = new Set();

function check(id, condition, detail = null) {
  assertions += 1;
  if (!condition) failures.push({ id, detail });
}

check(
  "official_p3_tests",
  payload.summary.officialP3Baseline.topLevelTests === 36,
);
check(
  "official_p3_assertions",
  payload.summary.officialP3Baseline.assertions === 988,
);
check("topic_count", payload.topicRows.length === 79);

for (const row of payload.topicRows) {
  const id = `${row.subjectId}:${row.topicKey}`;
  branches.add(`topic:${row.rawToAction.status}`);
  branches.add(`grade:${row.gradeEvidence}`);
  check(
    `${id}:classified`,
    ["passed", "mixed_safe_fallback"].includes(
      row.rawToAction.status,
    ),
  );
  check(`${id}:wrong_topic`, row.wrongTopic.status === "passed");
  check(`${id}:not_failed`, row.rawToAction.status !== "failed");
  check(
    `${id}:grade_classified`,
    [
      "curriculum_map_declared",
      "unsupported_runtime_alias",
      "unsupported_topic_not_in_curriculum",
      "unsupported_no_grade_mapping",
    ].includes(row.gradeEvidence),
  );
  if (row.rawToAction.status === "passed") {
    check(`${id}:producer`, !!row.rawToAction.producer);
    check(`${id}:taxonomy`, row.rawToAction.taxonomyId === row.rawToAction.ruleId);
    check(
      `${id}:target`,
      row.rawToAction.target?.topic ===
        (row.rawToAction.canonicalTopic || row.topicKey),
    );
    if (
      row.rawToAction.canonicalTopic &&
      row.rawToAction.target?.topic === row.rawToAction.canonicalTopic
    ) {
      branches.add("alias:canonical_runtime_topic");
    }
  }
  if (row.rawToAction.status === "mixed_safe_fallback") {
    check(`${id}:mixed_subskill`, !row.rawToAction.target?.subskill);
    check(`${id}:mixed_subskill_id`, !row.rawToAction.target?.subskillId);
  }
}

check("required_tag_count", payload.requiredTagRows.length === 155);
for (const row of payload.requiredTagRows) {
  branches.add(`tag:${row.status}`);
  check(
    `tag:${row.tag}:classified`,
    row.status === "active" || row.status === "unsupported_unproduced",
  );
  check(
    `tag:${row.tag}:producer_consistency`,
    row.status === "active" ? !!row.producer : row.producer == null,
  );
}

check(
  "prerequisite_entity_count",
  Object.keys(payload.prerequisiteEntities).length === 8,
);
check("prerequisite_relation_count", payload.prerequisiteRelations.length === 4);
check(
  "prerequisite_declarations",
  payload.summary.prerequisites.declarationsScanned === 12,
);
check(
  "prerequisite_missing",
  payload.summary.prerequisites.missingWhereApplicable === 0,
);
check(
  "metadata_records",
  payload.metadataCompleteness.records === 9993,
);
check(
  "metadata_invalid",
  payload.metadataCompleteness.invalidMetadata === 0,
);

for (const row of payload.metadataCompleteness.rows) {
  if (row.metadataComplete) branches.add("metadata:complete");
  if (row.topicLevelOnly) branches.add("metadata:topic_level_only");
  if (row.patternMissing) branches.add("metadata:pattern_missing");
  if (row.prerequisiteNotApplicable) {
    branches.add("metadata:prerequisite_not_applicable");
  }
  if (row.prerequisiteMissing) branches.add("metadata:prerequisite_missing");
  if (row.unsupportedTag) branches.add("metadata:unsupported_tag");
  if (row.invalidMetadata) branches.add("metadata:invalid");
}

const expectedBranches = [
  "topic:passed",
  "topic:mixed_safe_fallback",
  "grade:curriculum_map_declared",
  "alias:canonical_runtime_topic",
  "grade:unsupported_topic_not_in_curriculum",
  "tag:active",
  "tag:unsupported_unproduced",
  "metadata:complete",
  "metadata:topic_level_only",
  "metadata:pattern_missing",
  "metadata:prerequisite_not_applicable",
  "metadata:unsupported_tag",
];
for (const branch of expectedBranches) {
  check(`branch:${branch}`, branches.has(branch));
}

const summary = {
  scenarios:
    payload.topicRows.length +
    payload.requiredTagRows.length +
    payload.metadataCompleteness.rows.length,
  assertions,
  passedAssertions: assertions - failures.length,
  failedAssertions: failures.length,
  branchesRegistered: expectedBranches.length,
  branchesCovered: expectedBranches.filter((branch) => branches.has(branch))
    .length,
  failures,
};
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary));
if (failures.length > 0) process.exitCode = 1;
