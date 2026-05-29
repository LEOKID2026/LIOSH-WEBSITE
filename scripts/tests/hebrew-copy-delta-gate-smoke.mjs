/**
 * Smoke tests for Hebrew copy delta gate logic (fixtures only — no product edits).
 * Run: node scripts/tests/hebrew-copy-delta-gate-smoke.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  classifyDomain,
  classifyRisk,
  computeDeltas,
  computeTextHash,
  detectTemplate,
  evaluateGate,
  extractHitsFromFile,
  normalizeTextForHash,
  suggestGovernanceStatus,
  writeJsonl,
} from "../lib/hebrew-copy-scan-lib.mjs";

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

test("normalizeTextForHash collapses whitespace", () => {
  assert.equal(normalizeTextForHash("  שלום   עולם  "), "שלום עולם");
});

test("detectTemplate finds variables", () => {
  const t = detectTemplate("ענית על ${correct} שאלות");
  assert.equal(t.is_template, true);
  assert.deepEqual(t.template_variables, ["correct"]);
});

test("extractHitsFromFile finds Hebrew string", () => {
  const content = 'const msg = "שלום לתלמידים";\n';
  const hits = extractHitsFromFile("fixture.js", content);
  assert.ok(hits.some((h) => h.raw_text.includes("שלום לתלמידים")));
});

test("baseline existing string unchanged", () => {
  const text = "שלום לתלמידים";
  const hash = computeTextHash(text);
  const baseline = [
    {
      baseline_key: "b1",
      text_hash: hash,
      raw_text: text,
      source_file: "fixture.js",
      source_line: 1,
      source_function: "",
      domain: "site_general",
      status: "pending_owner_review",
    },
  ];
  const current = [
    {
      raw_text: text,
      text_hash: hash,
      source_file: "fixture.js",
      source_line: 1,
      source_function: "",
      anchor_key: "fixture.js:1:" + hash,
      domain: "site_general",
      is_template: false,
    },
  ];
  const deltas = computeDeltas(baseline, current, { scannedFiles: ["fixture.js"] });
  assert.equal(deltas.length, 0);
});

test("new Hebrew string detected", () => {
  const baseline = [];
  const current = [
    {
      raw_text: "טקסט חדש לבדיקה",
      text_hash: computeTextHash("טקסט חדש לבדיקה"),
      source_file: "fixture.js",
      source_line: 2,
      source_function: "",
      anchor_key: "fixture.js:2:" + computeTextHash("טקסט חדש לבדיקה"),
      domain: "site_general",
      is_template: false,
      risk_level: "low",
      why_flagged: "test",
    },
  ];
  const deltas = computeDeltas(baseline, current, { scannedFiles: ["fixture.js"] });
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].detected_change_type, "new");
});

test("changed string detected", () => {
  const baseline = [
    {
      baseline_key: "b1",
      text_hash: computeTextHash("ישן"),
      raw_text: "ישן",
      source_file: "fixture.js",
      source_line: 3,
      source_function: "",
      domain: "site_general",
      status: "pending_owner_review",
    },
  ];
  const current = [
    {
      raw_text: "חדש",
      text_hash: computeTextHash("חדש"),
      source_file: "fixture.js",
      source_line: 3,
      source_function: "",
      anchor_key: "fixture.js:3:" + computeTextHash("חדש"),
      domain: "site_general",
      is_template: false,
    },
  ];
  const deltas = computeDeltas(baseline, current, {
    scannedFiles: ["fixture.js"],
    suppressInventoryNoise: false,
  });
  assert.ok(deltas.some((d) => d.detected_change_type === "changed"));
});

test("moved unchanged string is not classified as new", () => {
  const text = "אותו טקסט";
  const hash = computeTextHash(text);
  const baseline = [
    {
      baseline_key: "b1",
      text_hash: hash,
      raw_text: text,
      source_file: "a.js",
      source_line: 1,
      source_function: "",
      domain: "site_general",
      status: "pending_owner_review",
    },
  ];
  const current = [
    {
      raw_text: text,
      text_hash: hash,
      source_file: "b.js",
      source_line: 10,
      source_function: "",
      anchor_key: "b.js:10:" + hash,
      domain: "site_general",
      is_template: false,
    },
  ];
  const deltas = computeDeltas(baseline, current, { scannedFiles: ["fixture.js"], suppressMovedOnly: false });
  assert.ok(deltas.some((d) => d.detected_change_type === "moved"));
  assert.ok(!deltas.some((d) => d.detected_change_type === "new"));
});

test("line shift only suppressed by default (hash match)", () => {
  const text = "אותו טקסט";
  const hash = computeTextHash(text);
  const baseline = [
    {
      baseline_key: "b1",
      text_hash: hash,
      raw_text: text,
      source_file: "a.js",
      source_line: 1,
      source_function: "",
      domain: "site_general",
      status: "pending_owner_review",
    },
  ];
  const current = [
    {
      raw_text: text,
      text_hash: hash,
      source_file: "a.js",
      source_line: 42,
      source_function: "",
      anchor_key: "a.js:42:" + hash,
      domain: "site_general",
      is_template: false,
    },
  ];
  const deltas = computeDeltas(baseline, current, { scannedFiles: ["a.js"] });
  assert.equal(deltas.length, 0);
});

test("decodeJsStringLiteral normalizes escaped newlines in hash", () => {
  assert.equal(
    normalizeTextForHash("שורה\\nשנייה"),
    normalizeTextForHash("שורה\nשנייה")
  );
});

test("critical parent/AI phrase classified critical", () => {
  const rel = "utils/parent-report-language/example.js";
  const line = "return buildNarrativeContractV1";
  const text = "מומלץ לקדם את הילד לשלב הבא";
  const domain = classifyDomain(rel, line, text);
  const risk = classifyRisk(rel, line, text, domain);
  assert.equal(risk.risk_level, "critical");
});

test("dry-run writeJsonl does not create file", () => {
  const dir = mkdtempSync(join(tmpdir(), "hebrew-copy-smoke-"));
  const path = join(dir, "baseline.jsonl");
  writeJsonl(path, [{ a: 1 }], true);
  assert.equal(existsSync(path), false);
  rmSync(dir, { recursive: true, force: true });
});

test("evaluateGate fails on critical new when not warn-only", () => {
  const deltas = [{ detected_change_type: "new", risk_level: "critical" }];
  const gate = evaluateGate(deltas, { warnOnly: false, strict: false });
  assert.equal(gate.pass, false);
  assert.equal(gate.exitCode, 1);
});

test("evaluateGate passes with warn-only on critical", () => {
  const deltas = [{ detected_change_type: "new", risk_level: "critical" }];
  const gate = evaluateGate(deltas, { warnOnly: true });
  assert.equal(gate.exitCode, 0);
});

test("suggested_classification uses governance status not visibility", () => {
  const parent = suggestGovernanceStatus(
    "utils/parent-report-language/example.js",
    "",
    "מומלץ לקדם את הילד",
    "parent_report",
    { risk_level: "critical" }
  );
  assert.equal(parent.suggested_classification, "parent_report/pending_owner_review");
  assert.equal(parent.suggested_status, "pending_owner_review");
  assert.ok(!parent.suggested_classification.includes("visible"));

  const learning = suggestGovernanceStatus(
    "data/science-questions.js",
    "stem: question",
    "מה תפקיד הלב?",
    "learning_content",
    { risk_level: "medium", surface: "data_bank" }
  );
  assert.equal(learning.suggested_status, "pending_expert_review");
  assert.equal(learning.suggested_classification, "learning_content/pending_expert_review");

  const neutral = suggestGovernanceStatus("components/ui.js", "", "סגור", "site_general", {
    risk_level: "low",
  });
  assert.equal(neutral.suggested_classification, "site_general/looks_ok_pending");

  const internal = suggestGovernanceStatus("scripts/guard.mjs", "// comment", "פנימי", "internal_only", {
    is_comment: true,
    risk_level: "internal",
  });
  assert.equal(internal.suggested_classification, "internal_only/internal_only");
});

test("delta row suggested_classification is domain/status not visibility", () => {
  const baseline = [];
  const current = [
    {
      raw_text: "מומלץ לבדוק",
      text_hash: computeTextHash("מומלץ לבדוק"),
      source_file: "utils/parent-report-language/x.js",
      source_line: 1,
      source_function: "",
      anchor_key: "utils/parent-report-language/x.js:1:" + computeTextHash("מומלץ לבדוק"),
      domain: "parent_report",
      is_template: false,
      risk_level: "critical",
      why_flagged: "test",
      audience: "parent",
      surface: "language_layer",
    },
  ];
  const deltas = computeDeltas(baseline, current, { scannedFiles: ["utils/parent-report-language/x.js"] });
  assert.equal(deltas[0].suggested_classification, "parent_report/pending_owner_review");
  assert.equal(deltas[0].suggested_status, "pending_owner_review");
  assert.ok(!String(deltas[0].suggested_classification).includes("visible"));
});

console.log(`\nSmoke summary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
