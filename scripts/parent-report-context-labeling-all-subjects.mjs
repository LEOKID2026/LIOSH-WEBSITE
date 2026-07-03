/**
 * Seven-subject context-aware labeling + topic overview / focus matrix.
 * Run: npm run test:parent-report-context-labeling-all-subjects
 */

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildSixSubjectContextLabelingMatrixBaseReport,
  CONTEXT_LABELING_SUBJECT_IDS,
  matrixRowKeysForSubject,
} from "./fixtures/parent-report-context-labeling-matrix.mjs";
import { buildRealGradeSplitRegressionBaseReport } from "./fixtures/parent-report-real-regression-payload.mjs";
import { collectParentFacingTextBundle, verifyPdfOrPrintOutput } from "./lib/parent-report-pdf-output-verify.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");

async function load(rel) {
  const m = await import(pathToFileURL(join(REPO, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { runContextLabelingMatrixAssertions } = await load(
  "utils/parent-report-output-integrity/context-labeling-matrix.js",
);
const { LONG_NARRATIVE_TITLE_RE } = await load(
  "utils/parent-report-output-integrity/row-display-label-context.js",
);

function assertMatrix(base, label) {
  const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
  const failures = runContextLabelingMatrixAssertions(base, detailed, {
    subjectIds: CONTEXT_LABELING_SUBJECT_IDS,
    matrixRowKeysForSubject: matrixRowKeysForSubject,
  });
  if (failures.length) {
    assert.fail(`${label} matrix failures:\n- ${failures.join("\n- ")}`);
  }
  return detailed;
}

// ─── Seven-subject generic matrix ─────────────────────────────────────────────
const matrixBase = buildSixSubjectContextLabelingMatrixBaseReport();
const matrixDetailed = assertMatrix(matrixBase, "seven-subject");

for (const sid of CONTEXT_LABELING_SUBJECT_IDS) {
  const sp = matrixDetailed.subjectProfiles.find((s) => s.subject === sid);
  const keys = matrixRowKeysForSubject(sid);
  assert.equal(sp?.topicOverviewRows?.length, 2, `${sid}: two core overview rows`);
  assert.ok(
    !(sp?.topicRecommendations || []).some((r) => r.topicRowKey === keys.splitG5),
    `${sid}: higher-grade split must not be core focus`,
  );
}

// ─── Real math regression (3 rows) ───────────────────────────────────────────
const mathBase = buildRealGradeSplitRegressionBaseReport();
const mathDetailed = buildDetailedParentReportFromBaseReport(mathBase, { period: "week" });
const mathFailures = runContextLabelingMatrixAssertions(mathBase, mathDetailed, {
  subjectIds: ["math"],
  matrixRowKeysForSubject: (sid) => {
    if (sid !== "math") throw new Error("math-only keys");
    return {
      splitG4: "fractions::grade:g4",
      splitG5: "fractions::grade:g5",
      soloG4: "subtraction::grade:g4",
      splitLabelHe: "שברים",
      soloLabelHe: "חיסור",
    };
  },
});
if (mathFailures.length) {
  assert.fail(`math regression matrix failures:\n- ${mathFailures.join("\n- ")}`);
}
const mathP = mathDetailed.subjectProfiles.find((s) => s.subject === "math");
assert.equal(mathP?.topicOverviewRows?.length, 2, "math: two core overview rows");
assert.ok(
  !(mathP?.topicRecommendations || []).some((r) => r.topicRowKey === "fractions::grade:g5"),
  "math: no higher-grade focus",
);

// ─── Print bundle (UI/PDF parity proxy) ──────────────────────────────────────
const printBundle = collectParentFacingTextBundle(matrixDetailed);
for (const sp of matrixDetailed.subjectProfiles) {
  for (const row of sp.topicOverviewRows || []) {
    const title = String(row.narrativeTitleHe || "");
    if (title && LONG_NARRATIVE_TITLE_RE.test(title)) {
      assert.fail(`${sp.subject}: long title in overview (${title})`);
    }
  }
}
await verifyPdfOrPrintOutput({
  label: "six-subject-matrix-print-bundle",
  printDomText: printBundle,
});

process.stdout.write(
  `OK parent-report-context-labeling-all-subjects (${CONTEXT_LABELING_SUBJECT_IDS.length} subjects + math regression)\n`,
);
