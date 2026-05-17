#!/usr/bin/env node
/** Merge professional inventory matrix + latest technical QA into QUESTION_RELEASE_READINESS.* */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "reports", "question-audit");

async function readJson(name) {
  try {
    return JSON.parse(await readFile(join(OUT, name), "utf8"));
  } catch {
    return null;
  }
}

const matrix = await readJson("QUESTION_INVENTORY_MATRIX.json");
const quality = await readJson("question-quality-audit.json");
const session = await readJson("session-variety.json");

let decision = matrix?.decision || "NOT_READY_INVENTORY_INSUFFICIENT";
const blockers = [];

if ((quality?.inventoryStatusCounts?.CRITICAL ?? 0) > 0) {
  blockers.push({
    code: "inventory_critical_technical",
    message: `${quality.inventoryStatusCounts.CRITICAL} CRITICAL cells in technical quality audit`,
  });
}
if ((quality?.hebrewG3Reading?.duplicateFingerprintGroups ?? 0) > 0) {
  blockers.push({ code: "hebrew_g3_dupes", message: "Hebrew g3 reading duplicate groups" });
}
if ((quality?.mcqFailures ?? 0) > 0) {
  blockers.push({ code: "mcq_failures", message: `${quality.mcqFailures} MCQ failures` });
}
if (session?.summary?.failCount > 0) {
  blockers.push({ code: "session_variety", message: "Session variety failures" });
}
if (matrix?.decision === "NOT_READY_BLOCKERS_REMAIN") {
  blockers.push({
    code: "professional_inventory_critical",
    message: matrix.decisionReasons?.join("; ") || "CRITICAL_BLOCKING cells in matrix",
  });
} else if (matrix?.decision !== "READY_FOR_LAUNCH") {
  blockers.push({
    code: "professional_inventory",
    message: matrix?.decisionReasons?.join("; ") || matrix?.decision,
  });
}

if (blockers.some((b) => b.code.includes("critical") || b.code === "mcq_failures" || b.code === "session_variety")) {
  decision = "NOT_READY_BLOCKERS_REMAIN";
} else if (matrix?.decision !== "READY_FOR_LAUNCH") {
  decision = matrix?.decision || "NOT_READY_INVENTORY_INSUFFICIENT";
}

const report = {
  generatedAt: new Date().toISOString(),
  decision,
  priorTechnicalReadyForLaunch: "Was READY_FOR_LAUNCH under old low thresholds — superseded by professional matrix",
  blockers,
  gates: {
    qa_question_quality: { pass: (quality?.mcqFailures ?? 0) === 0 },
    qa_session_variety: {
      pass: (session?.summary?.failCount ?? 0) === 0,
      thin: session?.summary?.thinCount ?? 0,
    },
    qa_question_inventory_matrix: {
      pass: matrix?.decision === "READY_FOR_LAUNCH",
      decision: matrix?.decision,
    },
  },
  professionalInventory: matrix
    ? {
        matrixDecision: matrix.decision,
        decisionReasons: matrix.decisionReasons,
        statusCounts: matrix.statusCounts,
        activeSelectableCells: matrix.activeSelectableCells,
        bySubjectCellSum: matrix.bySubjectCellSum,
        byGradeCellSum: matrix.byGradeCellSum,
        totalsNote: matrix.totalsNote,
        weakest: matrix.weakest,
        coreNeedsAuthoring: matrix.coreNeedsAuthoring,
        thinCells: matrix.thinCells,
        oldPassNewFailCount: matrix.oldPassNewFail?.length,
        oldPassNewFailSample: (matrix.oldPassNewFail || []).slice(0, 50),
      }
    : null,
  technicalQaSummary: {
    questionQualityPass: (quality?.mcqFailures ?? 0) === 0,
    sessionVarietyPass: (session?.summary?.failCount ?? 0) === 0,
    hebrewG3ReadingBank: quality?.hebrewG3Reading,
    scienceG3Body: quality?.scienceG3BodyInventory,
  },
};

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "QUESTION_RELEASE_READINESS.json"), JSON.stringify(report, null, 2), "utf8");

const md = `# Student question system — release readiness

Generated: ${report.generatedAt}

## Final decision: **${report.decision}**

Professional inventory matrix is authoritative for launch. Technical QA (variety, MCQ, no CRITICAL under old thresholds) can pass while inventory is insufficient.

## Professional inventory

| Status | Count |
|--------|------:|
| PROFESSIONAL_READY | ${matrix?.statusCounts?.PROFESSIONAL_READY ?? "—"} |
| LAUNCH_ACCEPTABLE_THIN | ${matrix?.statusCounts?.LAUNCH_ACCEPTABLE_THIN ?? "—"} |
| NEEDS_AUTHORING_BEFORE_LAUNCH | ${matrix?.statusCounts?.NEEDS_AUTHORING_BEFORE_LAUNCH ?? "—"} |
| CRITICAL_BLOCKING | ${matrix?.statusCounts?.CRITICAL_BLOCKING ?? "—"} |

Active selectable cells: **${matrix?.activeSelectableCells ?? "—"}**

See \`QUESTION_INVENTORY_MATRIX.md\` for full matrix.

## Technical QA (supporting)

- question-quality: ${report.gates.qa_question_quality.pass ? "PASS" : "FAIL"}
- session-variety: ${report.gates.qa_session_variety.pass ? "PASS" : "FAIL"} (thin=${report.gates.qa_session_variety.thin})

## Blockers

${blockers.length ? blockers.map((b) => `- **${b.code}**: ${b.message}`).join("\n") : "_None_"}
`;

await writeFile(join(OUT, "QUESTION_RELEASE_READINESS.md"), md, "utf8");
console.log("Wrote QUESTION_RELEASE_READINESS.* decision:", decision);
