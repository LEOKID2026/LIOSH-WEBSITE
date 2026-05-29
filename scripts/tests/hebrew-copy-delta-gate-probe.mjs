/**
 * Controlled probe — proves delta gate detects real Hebrew changes (fixtures only).
 * Run: node scripts/tests/hebrew-copy-delta-gate-probe.mjs
 */
import assert from "node:assert/strict";

import {
  classifyRisk,
  computeDeltas,
  computeTextHash,
  extractHitsFromFile,
  suggestGovernanceStatus,
} from "../lib/hebrew-copy-scan-lib.mjs";

const FIXTURE = "scripts/tests/fixtures/hebrew-copy-delta-probe.fixture.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL: ${name}`, e.message || e);
  }
}

function hit(text, line, file = FIXTURE) {
  const hash = computeTextHash(text);
  return {
    raw_text: text,
    text_hash: hash,
    source_file: file,
    source_line: line,
    source_function: "",
    anchor_key: `${file}:${line}:${hash}`,
    domain: "site_general",
    is_template: false,
    risk_level: "low",
    why_flagged: "probe",
  };
}

function baselineRow(text, line, file = FIXTURE) {
  const hash = computeTextHash(text);
  return {
    baseline_key: `probe-${hash}`,
    text_hash: hash,
    raw_text: text,
    source_file: file,
    source_line: line,
    source_function: "",
    domain: "site_general",
    status: "pending_owner_review",
  };
}

test("probe: add one Hebrew string => exactly one new delta", () => {
  const text = "בדיקת מחרוזת חדשה לדלתא";
  const deltas = computeDeltas([], [hit(text, 6)], {
    scannedFiles: [FIXTURE],
    suppressInternalOrphan: false,
  });
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].detected_change_type, "new");
});

test("probe: change string => exactly one changed delta", () => {
  const oldText = "בדיקת שינוי ישן";
  const newText = "בדיקת שינוי מחרוזת";
  const deltas = computeDeltas([baselineRow(oldText, 7)], [hit(newText, 7)], {
    scannedFiles: [FIXTURE],
  });
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].detected_change_type, "changed");
});

test("probe: move string cross-file => moved not new", () => {
  const text = "בדיקת העברת מחרוזת";
  const other = "scripts/tests/fixtures/hebrew-copy-delta-probe.moved.js";
  const deltas = computeDeltas([baselineRow(text, 8, FIXTURE)], [hit(text, 2, other)], {
    scannedFiles: [FIXTURE, other],
    suppressMovedOnly: false,
  });
  assert.equal(deltas.filter((d) => d.detected_change_type === "new").length, 0);
  assert.equal(deltas.filter((d) => d.detected_change_type === "moved").length, 1);
});

test("probe: delete string => removed delta", () => {
  const text = "בדיקת מחיקת מחרוזת";
  const deltas = computeDeltas([baselineRow(text, 9)], [], { scannedFiles: [FIXTURE] });
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].detected_change_type, "removed");
});

test("probe: internal comment string classified internal_only", () => {
  const content = "const x = \"שלום פנימי\";\n";
  const hits = extractHitsFromFile("scripts/tests/fixtures/hebrew-copy-probe-internal.js", content);
  assert.ok(hits.length >= 1);
  const h = hits[0];
  const gov = suggestGovernanceStatus(h.source_file, h.line_text, h.raw_text, "site_general", {
    is_comment: h.is_comment,
    risk_level: "internal",
  });
  assert.equal(gov.suggested_classification, "internal_only/internal_only");
  const deltas = computeDeltas([], [{ ...hit(h.raw_text, 1), is_comment: true, risk_level: "internal" }], {
    scannedFiles: ["scripts/tests/fixtures/hebrew-copy-probe-internal.js"],
    suppressInternalOrphan: true,
  });
  assert.equal(deltas.length, 0);
});

test("probe: parent decision string classified critical", () => {
  const rel = "utils/parent-report-language/probe.js";
  const text = "מומלץ לקדם את הילד לשלב הבא";
  const risk = classifyRisk(rel, "", text, "parent_report");
  assert.equal(risk.risk_level, "critical");
  const deltas = computeDeltas([], [{ ...hit(text, 1, rel), domain: "parent_report", risk_level: "critical" }], {
    scannedFiles: [rel],
  });
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].risk_level, "critical");
  assert.equal(deltas[0].suggested_status, "pending_owner_review");
});

test("probe: learning content classified pending_expert_review", () => {
  const rel = "data/science-questions-probe.js";
  const text = "מה תפקיד הלב בגוף האדם?";
  const gov = suggestGovernanceStatus(rel, "stem: question", text, "learning_content", {
    risk_level: "medium",
    surface: "data_bank",
  });
  assert.equal(gov.suggested_classification, "learning_content/pending_expert_review");
});

console.log(`\nProbe summary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
