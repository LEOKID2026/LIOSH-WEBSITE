import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const artifact = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "artifacts",
      "qa",
      "decision-engine-p3b",
      "p3b-coverage-closure.json",
    ),
    "utf8",
  ),
);

test("P3B metadata completeness classifies every scanned record", () => {
  const summary = artifact.metadataCompleteness;
  assert.equal(summary.records, 9993);
  assert.equal(summary.rows.length, 9993);
  assert.equal(summary.invalidMetadata, 0);
  assert.equal(
    summary.prerequisiteNotApplicable +
      summary.prerequisiteMissing +
      summary.prerequisiteComplete,
    summary.records,
  );
  assert.equal(summary.prerequisiteMissing, 0);
  assert.equal(summary.unsupportedTag, 8);
});

test("P3B grade-topic matrix distinguishes evidence from unsupported constraints", () => {
  assert.equal(artifact.topicRows.length, 79);
  for (const row of artifact.topicRows) {
    for (const gradeKey of row.gradeKeys) {
      assert.match(gradeKey, /^g[1-6]$/, `${row.subjectId}:${row.topicKey}`);
    }
    if (row.gradeKeys.length > 0) {
      assert.equal(row.gradeEvidence, "curriculum_map_declared");
      assert.equal(
        row.taxonomyGradeConstraintStatus,
        "topic_availability_only_not_rule_validity",
      );
    } else {
      assert.ok(
        [
          "unsupported_runtime_alias",
          "unsupported_topic_not_in_curriculum",
          "unsupported_no_grade_mapping",
        ].includes(row.gradeEvidence),
      );
      assert.equal(
        row.taxonomyGradeConstraintStatus,
        "unsupported_no_grade_constraint",
      );
    }
  }
});
