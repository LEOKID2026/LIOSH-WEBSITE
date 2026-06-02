#!/usr/bin/env node
/**
 * Geometry Track A gate verification.
 * Run: node scripts/verify-geometry-track-a-gates.mjs
 */
import assert from "node:assert/strict";
import { generateQuestion } from "../utils/geometry-question-generator.js";
import { LEVELS } from "../utils/geometry-constants.js";
import { enrichGeometryProceduralParams } from "../utils/geometry-diagnostic-metadata-bridge.js";
import {
  geometryAreaRoutingScores,
  orderGeometryTaxonomyCandidates,
} from "../utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js";
import {
  resolveClassroomSkillLabelHe,
} from "../lib/classroom-activities/classroom-skill-labels-he.js";
import { resolveGeometryPracticeTarget } from "../lib/learning-book/geometry-book-practice-map.js";
import {
  getGeometryG6AccessiblePageOrder,
  GEOMETRY_G6_PAGE_ORDER,
} from "../lib/learning-book/geometry-g6-registry.js";
import {
  isPrismVolumeTriangleAllowed,
  isTriangleAreaFormulaGradeAllowed,
  parseGeometryGateGrade,
} from "../utils/geometry-curriculum-gates.js";
import { geometryKindGradeSpan } from "./curriculum-spine-grade-bindings.mjs";

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sampleAreaKinds(gradeKey, n = 200) {
  const kinds = [];
  const level = LEVELS.medium;
  for (let i = 0; i < n; i++) {
    const orig = Math.random;
    Math.random = seededRandom(0x7a03 + i * 997 + gradeKey.charCodeAt(1));
    globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL = true;
    const q = generateQuestion(level, "area", gradeKey);
    delete globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL;
    Math.random = orig;
    if (q?.params?.kind && q.params.kind !== "no_question") {
      kinds.push(String(q.params.kind));
    }
  }
  return kinds;
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`OK ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}:`, err.message);
  }
}

check("parseGeometryGateGrade accepts g3 and 3", () => {
  assert.equal(parseGeometryGateGrade("g3"), 3);
  assert.equal(parseGeometryGateGrade(3), 3);
  assert.equal(parseGeometryGateGrade("3"), 3);
});

check("isTriangleAreaFormulaGradeAllowed fail-closed for unknown grade", () => {
  assert.equal(isTriangleAreaFormulaGradeAllowed(null), false);
  assert.equal(isTriangleAreaFormulaGradeAllowed(""), false);
  assert.equal(isTriangleAreaFormulaGradeAllowed("unknown"), false);
  assert.equal(isTriangleAreaFormulaGradeAllowed("g3"), false);
  assert.equal(isTriangleAreaFormulaGradeAllowed(4), false);
  assert.equal(isTriangleAreaFormulaGradeAllowed("g5"), true);
  assert.equal(isTriangleAreaFormulaGradeAllowed(5), true);
});

check("triangle_area binding is G5–G6", () => {
  const span = geometryKindGradeSpan("triangle_area");
  assert.deepEqual(span, { minGrade: 5, maxGrade: 6 });
});

check("G3/G4 area samples never emit triangle_area", () => {
  for (const gk of ["g3", "g4"]) {
    const kinds = sampleAreaKinds(gk, 300);
    assert.ok(
      kinds.every((k) => !k.includes("triangle_area")),
      `${gk} emitted triangle_area: ${kinds.filter((k) => k.includes("triangle_area")).join(",")}`
    );
  }
});

check("G5 area can emit triangle_area", () => {
  const kinds = sampleAreaKinds("g5", 400);
  assert.ok(
    kinds.some((k) => k.includes("triangle_area")),
    "expected at least one triangle_area at g5"
  );
});

check("G3 triangle_perimeter still available", () => {
  globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL = true;
  const q = generateQuestion(LEVELS.easy, "perimeter", "g3", null, {
    forceKind: "triangle_perimeter",
  });
  delete globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL;
  assert.equal(q?.params?.kind, "triangle_perimeter");
});

check("enrichGeometryProceduralParams g3 triangle_area not geo_area_triangle_formula", () => {
  const p = enrichGeometryProceduralParams(
    { kind: "triangle_area", base: 4, height: 3 },
    { topic: "area", gradeKey: "g3", levelKey: "easy" }
  );
  assert.notEqual(p.diagnosticSkillId, "geo_area_triangle_formula");
});

check("G-08 formula routing suppressed below G5", () => {
  const scores = geometryAreaRoutingScores(
    [{ kind: "triangle_area", params: { kind: "triangle_area", formula_pipeline: true } }],
    { gradeKey: "g3" }
  );
  assert.equal(scores.g08Score, 0);
  const ordered = orderGeometryTaxonomyCandidates(
    ["G-03", "G-08"],
    [{ kind: "triangle_area" }],
    { bucketKey: "area", row: { gradeKey: "g4" } }
  );
  assert.equal(ordered[0], "G-03");
});

check("resolveClassroomSkillLabelHe fail-closed for geo_area_triangle_formula", () => {
  assert.equal(
    resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
      subject: "geometry",
      gradeLevel: "g3",
    }),
    "מיומנות בגאומטריה"
  );
  assert.equal(
    resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
      subject: "geometry",
      gradeLevel: null,
    }),
    "מיומנות בגאומטריה"
  );
  assert.equal(
    resolveClassroomSkillLabelHe("geo_area_triangle_formula", {
      subject: "geometry",
      gradeLevel: "g5",
    }),
    "שטח משולש"
  );
});

check("prism_volume_triangle unlocked when G5 triangle_area teach path ready", () => {
  assert.equal(isPrismVolumeTriangleAllowed(), true);
  const target = resolveGeometryPracticeTarget("g6", "prism_volume_triangle");
  assert.ok(target?.forceKind === "prism_volume_triangle");
  assert.ok(getGeometryG6AccessiblePageOrder().includes("prism_volume_triangle"));
  assert.ok(GEOMETRY_G6_PAGE_ORDER.includes("prism_volume_triangle"));
});

if (failed) {
  console.error(`\nverify-geometry-track-a-gates: ${failed} failure(s)`);
  process.exit(1);
}
console.log("\nverify-geometry-track-a-gates: all checks passed");
