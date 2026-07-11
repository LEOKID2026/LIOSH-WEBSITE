import assert from "node:assert/strict";
import {
  buildSubjectGradeDefaultsArtifact,
  resolveEffectiveContentGradePure,
  resolveSubjectGradeDefaults,
} from "../../lib/learning/subject-permissions/subject-grade-defaults.resolver.js";

function testArtifactNoConflicts() {
  const artifact = buildSubjectGradeDefaultsArtifact();
  assert.equal(artifact.hasUnresolvedConflicts, false, JSON.stringify(artifact.conflicts));
  assert.equal(artifact.subjects.length, 8);
  assert.equal(Object.keys(artifact.matrix.g1).length, 8);
}

function testMatrixG1() {
  const g1 = resolveSubjectGradeDefaults("g1").subjects;
  assert.equal(g1.math.isEnabledByDefault, true);
  assert.equal(g1.history.isEnabledByDefault, false);
  assert.equal(g1.moledet.isEnabledByDefault, false);
  assert.equal(g1.geography.isEnabledByDefault, false);
}

function testMatrixG6History() {
  const g6 = resolveSubjectGradeDefaults("g6").subjects;
  assert.equal(g6.history.isEnabledByDefault, true);
  assert.equal(g6.moledet.isEnabledByDefault, false);
  assert.equal(g6.geography.isEnabledByDefault, true);
}

console.log("subject-grade-defaults.test.mjs");
testArtifactNoConflicts();
testMatrixG1();
testMatrixG6History();
console.log("OK");
