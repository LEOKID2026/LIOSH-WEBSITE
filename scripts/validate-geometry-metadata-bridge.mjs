#!/usr/bin/env node
/**
 * Validates procedural Geometry samples include diagnostic contract fields.
 * Run: node scripts/validate-geometry-metadata-bridge.mjs
 */
import { generateQuestion } from "../utils/geometry-question-generator.js";
import { LEVELS } from "../utils/geometry-constants.js";

const TOPICS = [
  "shapes_basic",
  "area",
  "perimeter",
  "volume",
  "angles",
  "triangles",
  "quadrilaterals",
  "symmetry",
];
const GRADES = ["g2", "g3", "g4", "g5", "g6"];
const LEVEL_KEYS = ["easy", "medium", "hard"];

let ok = 0;
let fail = 0;
const failures = [];

for (const gradeKey of GRADES) {
  for (const topic of TOPICS) {
    for (const levelKey of LEVEL_KEYS) {
      for (let i = 0; i < 30; i++) {
        globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL = true;
        const q = generateQuestion(LEVELS[levelKey], topic, gradeKey);
        delete globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL;
        if (q?.params?.kind === "no_question") continue;
        const p = q?.params || {};
        const has =
          p.patternFamily &&
          p.conceptTag &&
          p.diagnosticSkillId &&
          (p.expectedErrorTags?.length || p.expectedErrorTypes?.length);
        if (has) ok++;
        else {
          fail++;
          if (failures.length < 8) {
            failures.push({ gradeKey, topic, levelKey, kind: p.kind, patternFamily: p.patternFamily });
          }
        }
      }
    }
  }
}

console.log(`Procedural samples OK: ${ok}, missing metadata: ${fail}`);
if (failures.length) {
  console.log("Examples:", failures);
  process.exit(1);
}
console.log("validate-geometry-metadata-bridge: OK");
process.exit(0);
