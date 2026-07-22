#!/usr/bin/env node
/**
 * Post-hoc answer evidence backfill — LOCAL DRY-RUN ONLY.
 * Version: backfill-answer-evidence-v1
 *
 * Usage:
 *   node scripts/backfill-answer-evidence-dry-run.mjs [--limit=500] [--subject=math]
 *
 * Does NOT write to production DB. Outputs JSON report to tmp/backfill-answer-evidence/
 *
 * SQL for owner (after approval) — idempotent update on answers.answer_payload:
 *   UPDATE answers SET answer_payload = answer_payload || jsonb_build_object(
 *     'answerEvidence', <computed>,
 *     'backfillVersion', 'backfill-answer-evidence-v1'
 *   )
 *   WHERE id = $1 AND (answer_payload->>'backfillVersion') IS DISTINCT FROM 'backfill-answer-evidence-v1';
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyAnswerEvidence } from "../lib/learning/classifiers/index.js";
import { normalizeAnswerEvidence } from "../lib/learning/answer-evidence-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);

const LIMIT = Math.max(1, Number(args.limit) || 200);
const SUBJECT_FILTER = args.subject ? String(args.subject) : null;

/**
 * @param {Record<string, unknown>} payload
 */
function backfillOne(payload) {
  if (!payload || typeof payload !== "object") {
    return { status: "skip", reason: "empty_payload" };
  }
  if (payload.backfillVersion === "backfill-answer-evidence-v1" && payload.answerEvidence) {
    return { status: "skip", reason: "already_backfilled" };
  }
  const existing = normalizeAnswerEvidence(payload.answerEvidence);
  if (existing?.detectedMisconception && existing.detectedMisconception !== "unknown") {
    return { status: "skip", reason: "already_classified", tag: existing.detectedMisconception };
  }

  const subject = String(payload.subject || "unknown");
  if (SUBJECT_FILTER && subject !== SUBJECT_FILTER) {
    return { status: "skip", reason: "subject_filter" };
  }

  const ev = classifyAnswerEvidence({
    subject,
    topic: payload.topic,
    userAnswer: payload.userAnswer,
    expectedAnswer: payload.expectedAnswer,
    isCorrect: false,
    params: payload.params,
    questionEngine: payload.questionEngine,
    timestamp: payload.answeredAt,
  });

  if (!ev.detectedMisconception) {
    return { status: "unclassified", reason: "no_deterministic_match" };
  }

  return {
    status: "would_update",
    tag: ev.detectedMisconception,
    evidenceType: ev.evidenceType,
    answerEvidence: ev,
  };
}

/** Sample rows for local dry-run demonstration */
const SAMPLE_ROWS = [
  {
    id: "sample-1",
    answer_payload: {
      subject: "math",
      topic: "addition",
      userAnswer: "67900",
      expectedAnswer: "101782",
      params: { kind: "add_three", a: 33002, b: 34898, c: 9782 },
    },
  },
  {
    id: "sample-2",
    answer_payload: {
      subject: "math",
      topic: "subtraction",
      userAnswer: "999",
      expectedAnswer: "-1898",
      params: { kind: "sub_two", a: 33000, b: 34898 },
    },
  },
];

function main() {
  const outDir = path.join(ROOT, "tmp", "backfill-answer-evidence");
  fs.mkdirSync(outDir, { recursive: true });

  /** @type {object[]} */
  const results = [];
  for (const row of SAMPLE_ROWS.slice(0, LIMIT)) {
    const result = backfillOne(row.answer_payload);
    results.push({ id: row.id, ...result });
  }

  const summary = {
    version: "backfill-answer-evidence-v1",
    dryRun: true,
    processed: results.length,
    wouldUpdate: results.filter((r) => r.status === "would_update").length,
    unclassified: results.filter((r) => r.status === "unclassified").length,
    skipped: results.filter((r) => r.status === "skip").length,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(outDir, "dry-run-results.json"), JSON.stringify({ summary, results }, null, 2));

  const sql = `-- Owner-only migration (NOT executed by agent)
-- Idempotent backfill for answerEvidence on wrong answers missing classification
UPDATE answers
SET answer_payload = answer_payload || jsonb_build_object(
  'answerEvidence', $2::jsonb,
  'backfillVersion', 'backfill-answer-evidence-v1'
)
WHERE id = $1
  AND is_correct = false
  AND (answer_payload->>'backfillVersion') IS DISTINCT FROM 'backfill-answer-evidence-v1';
`;

  fs.writeFileSync(path.join(outDir, "owner-migration.sql"), sql);
  console.log(JSON.stringify(summary, null, 2));
}

main();
