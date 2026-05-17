/**
 * qa-question-selector-consistency.mjs
 *
 * Verifies that every topic visible to a student in the subject-master
 * page selector (GRADES[grade].topics) has an inventory matrix row and
 * is not NEEDS_AUTHORING_BEFORE_LAUNCH without a documented exception.
 *
 * Gate rules:
 *   ERROR  — active selector topic is NEEDS_AUTHORING_BEFORE_LAUNCH with
 *            launchBlocking: true (core blocking cell)
 *   WARN   — active selector topic is NEEDS_AUTHORING_BEFORE_LAUNCH (non-core)
 *   WARN   — active selector topic is LAUNCH_ACCEPTABLE_THIN (not yet
 *            owner-documented in QUESTION_FINAL_DEFINITION_OF_DONE.md)
 *   ERROR  — active selector topic has NO matrix row at all
 *   INFO   — active selector topic is PROFESSIONAL_READY
 *
 * Exit code 1 if any ERRORs are found.
 * Exit code 0 if only WARNs (or clean).
 *
 * Run: node scripts/qa-question-selector-consistency.mjs [--strict]
 *   --strict: also exit 1 on WARNs (used for Phase 2F final closure)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPORT_DIR = join(ROOT, "reports", "question-audit");
const STRICT = process.argv.includes("--strict");

// ─── Load inventory matrix ────────────────────────────────────────────────────

const matrixPath = join(REPORT_DIR, "QUESTION_INVENTORY_MATRIX.json");
if (!existsSync(matrixPath)) {
  console.error("ERROR: QUESTION_INVENTORY_MATRIX.json not found. Run: npm run qa:question-inventory-matrix first.");
  process.exit(1);
}
const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));

// Build lookup: subject|grade|topic|level → row
const matrixByKey = new Map();
for (const row of matrix.rows || []) {
  const key = `${row.subject}|${row.grade}|${row.topic}|${row.level}`;
  matrixByKey.set(key, row);
}

// Build set of topics per subject/grade from matrix
const matrixTopicsBySubjectGrade = new Map();
for (const row of matrix.rows || []) {
  const sgKey = `${row.subject}|${row.grade}`;
  if (!matrixTopicsBySubjectGrade.has(sgKey)) matrixTopicsBySubjectGrade.set(sgKey, new Set());
  matrixTopicsBySubjectGrade.get(sgKey).add(row.topic);
}

// ─── Load curriculum topic list ───────────────────────────────────────────────

import { curriculumTopicsFor } from "./lib/qa-curriculum-matrix.mjs";

// ─── Load owner-documented thin cells from QUESTION_FINAL_DEFINITION_OF_DONE.md
// (simplified: we read the matrix thinCells as the known documented set)

const thinCells = new Set(
  (matrix.thinCells || []).map((c) => `${c.subject}|${c.grade}|${c.topic}|${c.level}`)
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = ["math", "geometry", "hebrew", "english", "science", "moledet_geography"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const LEVELS = ["easy", "medium", "hard"];

// ─── Check each selector cell ─────────────────────────────────────────────────

let errorCount = 0;
let warnCount = 0;
let infoCount = 0;

const results = [];

for (const subject of SUBJECTS) {
  for (const grade of GRADES) {
    const selectorTopics = curriculumTopicsFor(subject, grade);

    for (const topic of selectorTopics) {
      const sgKey = `${subject}|${grade}`;
      const matrixTopics = matrixTopicsBySubjectGrade.get(sgKey) || new Set();

      if (!matrixTopics.has(topic)) {
        // Topic is in selector but has NO matrix row at all
        errorCount++;
        results.push({
          severity: "ERROR",
          subject, grade, topic, invLevel: "all",
          message: `Topic "${topic}" appears in ${subject} ${grade} selector but has NO matrix row. Run npm run qa:question-inventory-matrix to regenerate.`,
        });
        continue;
      }

      // Check per inventory level
      for (const invLevel of LEVELS) {
        const key = `${subject}|${grade}|${topic}|${invLevel}`;
        const row = matrixByKey.get(key);

        if (!row) continue;
        if (row.status === "NOT_APPLICABLE") continue;

        if (row.status === "PROFESSIONAL_READY") {
          infoCount++;
          results.push({ severity: "INFO", subject, grade, topic, invLevel, message: "PROFESSIONAL_READY" });
          continue;
        }

        if (row.status === "LAUNCH_ACCEPTABLE_THIN") {
          const isThinDocumented = thinCells.has(key);
          warnCount++;
          results.push({
            severity: "WARN",
            subject, grade, topic, invLevel,
            message: isThinDocumented
              ? `THIN (${row.uniqueUsableQuestionCount}/${row.professionalMinimumRequired}) — documented thin. Requires owner sign-off in QUESTION_FINAL_DEFINITION_OF_DONE.md.`
              : `THIN (${row.uniqueUsableQuestionCount}/${row.professionalMinimumRequired}) — NOT documented. Add to owner approval table.`,
          });
          continue;
        }

        if (row.status === "NEEDS_AUTHORING_BEFORE_LAUNCH") {
          if (row.launchBlocking === true) {
            errorCount++;
            results.push({
              severity: "ERROR",
              subject, grade, topic, invLevel,
              message: `NEEDS_AUTHORING (${row.uniqueUsableQuestionCount}/${row.professionalMinimumRequired}) — CORE LAUNCH-BLOCKING. Active in selector; must be resolved before READY_FOR_LAUNCH.`,
            });
          } else {
            warnCount++;
            results.push({
              severity: "WARN",
              subject, grade, topic, invLevel,
              message: `NEEDS_AUTHORING (${row.uniqueUsableQuestionCount}/${row.professionalMinimumRequired}) — non-core, active in selector. Hide or approve thin.`,
            });
          }
          continue;
        }

        if (row.status === "CRITICAL_BLOCKING") {
          errorCount++;
          results.push({
            severity: "ERROR",
            subject, grade, topic, invLevel,
            message: `CRITICAL_BLOCKING — 0 usable questions but topic is active in selector. Must fix or hide immediately.`,
          });
          continue;
        }
      }
    }
  }
}

// ─── Print report ─────────────────────────────────────────────────────────────

const errors = results.filter((r) => r.severity === "ERROR");
const warns = results.filter((r) => r.severity === "WARN");
const infos = results.filter((r) => r.severity === "INFO");

console.log("\n=== QUESTION SELECTOR CONSISTENCY GATE ===");
console.log(`Subjects checked: ${SUBJECTS.join(", ")}`);
console.log(`Grades: ${GRADES.join(", ")}`);
console.log(`Matrix rows loaded: ${matrix.rows?.length ?? 0}`);
console.log(`Mode: ${STRICT ? "STRICT (exits 1 on WARNs)" : "NORMAL (exits 1 on ERRORs only)"}`);
console.log("");

if (errors.length > 0) {
  console.log(`--- ERRORS (${errors.length}) ---`);
  for (const r of errors) {
    console.log(`  [ERROR] ${r.subject} ${r.grade} ${r.topic} ${r.invLevel}: ${r.message}`);
  }
  console.log("");
}

if (warns.length > 0) {
  // Only show first 30 warnings to avoid flooding — full list in matrix CSV
  const shownWarns = warns.slice(0, 30);
  console.log(`--- WARNINGS (${warns.length}${warns.length > 30 ? `, showing first 30` : ""}) ---`);
  for (const r of shownWarns) {
    console.log(`  [WARN]  ${r.subject} ${r.grade} ${r.topic} ${r.invLevel}: ${r.message}`);
  }
  if (warns.length > 30) console.log(`  ... and ${warns.length - 30} more warnings (see QUESTION_CELL_WORKPLAN.csv)`);
  console.log("");
}

console.log(`--- SUMMARY ---`);
console.log(`  ERRORS:   ${errors.length}`);
console.log(`  WARNINGS: ${warns.length}`);
console.log(`  READY (INFO): ${infos.length}`);
console.log("");

if (errors.length === 0 && warns.length === 0) {
  console.log("PASS: All active selector topics have PROFESSIONAL_READY inventory.");
  process.exit(0);
}

if (errors.length > 0) {
  console.log("FAIL: Active selector topics with CRITICAL or core launch-blocking gaps exist.");
  console.log("      Fix these cells before launch. See errors above.");
  process.exit(1);
}

if (STRICT && warns.length > 0) {
  console.log("FAIL (strict): Active selector topics with THIN or non-core NEEDS gaps exist.");
  console.log("      Resolve all warnings for Phase 2F final closure.");
  process.exit(1);
}

// Warnings only — pass with non-zero warnings
console.log("PASS WITH WARNINGS: No launch-blocking selector gaps found.");
console.log("                    Review warnings above before Phase 2F.");
process.exit(0);
