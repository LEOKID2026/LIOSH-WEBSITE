import assert from "node:assert/strict";
import { resolveEffectiveContentGradePure } from "../../lib/learning/subject-permissions/subject-grade-defaults.resolver.js";

function testRegisteredInRange() {
  assert.equal(resolveEffectiveContentGradePure("g3", ["g2", "g3", "g4"]), "g3");
}

function testMoledetG1ToG2() {
  assert.equal(resolveEffectiveContentGradePure("g1", ["g2", "g3", "g4"]), "g2");
}

function testMoledetG6ToG4() {
  assert.equal(resolveEffectiveContentGradePure("g6", ["g2", "g3", "g4"]), "g4");
  assert.equal(resolveEffectiveContentGradePure("g5", ["g2", "g3", "g4"]), "g4");
}

function testGeographyG3ToG5() {
  assert.equal(resolveEffectiveContentGradePure("g3", ["g5", "g6"]), "g5");
}

function testTiePickLower() {
  assert.equal(resolveEffectiveContentGradePure("g3", ["g2", "g4"]), "g2");
}

function testEmptyThrows() {
  assert.throws(() => resolveEffectiveContentGradePure("g3", []), /SUBJECT_CONTENT_CATALOG_INCOMPLETE/);
}

console.log("resolve-effective-content-grade.test.mjs");
testRegisteredInRange();
testMoledetG1ToG2();
testMoledetG6ToG4();
testGeographyG3ToG5();
testTiePickLower();
testEmptyThrows();
console.log("OK");
