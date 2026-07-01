#!/usr/bin/env node
/**
 * Question skill metadata V1 — coverage and resolution QA.
 * npm run qa:learning-simulator:question-skill-metadata
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateForMatrixCell, SUPPORTED_SUBJECTS } from "./lib/question-generator-adapters.mjs";
import { normalizeQuestionPayload, runIntegrityChecks } from "./lib/question-integrity-checks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const MATRIX_PATH = join(ROOT, "reports", "learning-simulator", "coverage-matrix.json");
const OUT_DIR = join(ROOT, "reports", "learning-simulator", "engine-professionalization");
const RUN_JSON = join(OUT_DIR, "question-skill-metadata-run.json");
const AUDIT_JSON = join(OUT_DIR, "question-skill-tagging-audit.json");
const AUDIT_MD = join(OUT_DIR, "question-skill-tagging-audit.md");

const N = Math.max(1, Math.min(10, Number(process.env.QSM_N || 2)));

function cellKey(c) {
  return `${c.grade}|${c.subjectCanonical}|${c.topic}|${c.level}`;
}

function classifyExpectedUnsupported(cell, reason) {
  const r = String(reason || "");
  if (cell.topic === "mixed" || r.includes("intentionally multi-topic")) {
    return {
      expected: true,
      code: "expected_skip",
      detail: "expected skip: topic `mixed` is a multi-topic runtime/UI selector (not a single integrity cell)",
      skipKind: "mixed_topic_not_single_cell",
    };
  }
  if (
    cell.subjectCanonical === "english" &&
    cell.topic === "phonics" &&
    (cell.grade === "g1" || cell.grade === "g2") &&
    r.includes("no MCQ-shaped english pool rows")
  ) {
    return {
      expected: true,
      code: "expected_skip",
      detail:
        "expected skip: english phonics g1/g2 is not represented as MCQ pool rows for this QA path (adapter not applicable)",
      skipKind: "english_phonics_non_mcq_pool",
    };
  }
  return {
    expected: false,
    code: "no_question",
    detail: r || "unsupported",
    skipKind: null,
  };
}

async function main() {
  const qsm = await import(pathToFileURL(join(ROOT, "utils/learning-diagnostics/question-skill-metadata-v1.js")).href);
  const buildQuestionSkillMetadataV1 = qsm.buildQuestionSkillMetadataV1;

  await mkdir(OUT_DIR, { recursive: true });

  let matrixRaw;
  try {
    matrixRaw = JSON.parse(await readFile(MATRIX_PATH, "utf8"));
  } catch (e) {
    console.error(`Missing ${MATRIX_PATH}. Run npm run qa:learning-simulator:matrix first.`);
    process.exit(1);
  }

  const rows = (matrixRaw.rows || []).filter((r) => r.isRuntimeSupported !== false);
  const subjectStrategies = {};
  for (const s of SUPPORTED_SUBJECTS) {
    subjectStrategies[s] = { strategy: "buildQuestionSkillMetadataV1", adapter: "question-generator-adapters" };
  }

  const issues = [];
  const samples = [];
  let cellsOk = 0;
  let cellsScanned = 0;
  let integrityPass = 0;
  let integrityFail = 0;
  const missingStats = { expectedErrorTypes: 0, prerequisiteSkillIds: 0, grade: 0, level: 0 };

  for (const row of rows) {
    const cell = {
      grade: row.grade,
      subjectCanonical: row.subjectCanonical,
      level: row.level,
      topic: row.topic,
    };
    if (!SUPPORTED_SUBJECTS.includes(cell.subjectCanonical)) continue;

    cellsScanned += 1;
    let cellPass = true;

    for (let i = 0; i < N; i += 1) {
      const gen = await generateForMatrixCell(cell, i);
      if (gen.unsupported || !gen.ok || !gen.raw) {
        const unsupported = classifyExpectedUnsupported(cell, gen.reason || gen.error || "unsupported");
        issues.push({
          cellKey: cellKey(cell),
          sampleIndex: i,
          code: unsupported.code,
          detail: unsupported.detail,
          ...(unsupported.skipKind ? { skipKind: unsupported.skipKind } : {}),
        });
        if (!unsupported.expected) cellPass = false;
        continue;
      }

      const q = gen.raw;
      const norm = normalizeQuestionPayload(q);
      const ictx = { requestedTopic: cell.topic, grade: cell.grade, level: cell.level, subject: cell.subjectCanonical };
      const integ = runIntegrityChecks(norm, ictx);
      if (!integ.pass) {
        integrityFail += 1;
        cellPass = false;
        issues.push({
          cellKey: cellKey(cell),
          sampleIndex: i,
          code: "integrity",
          detail: integ.failures?.[0]?.message || "integrity_fail",
        });
      } else {
        integrityPass += 1;
      }

      const meta = buildQuestionSkillMetadataV1(q, {
        subjectCanonical: cell.subjectCanonical,
        grade: cell.grade,
        level: cell.level,
        topic: cell.topic,
      });

      for (const mf of meta.missingFields || []) {
        missingStats[mf] = (missingStats[mf] || 0) + 1;
      }

      const requiredCore = ["subjectId", "topicId", "skillId", "subskillId"].every(
        (k) => meta[k] && String(meta[k]).length > 0
      );
      if (!requiredCore) {
        issues.push({ cellKey: cellKey(cell), sampleIndex: i, code: "missing_core_metadata", meta });
        cellPass = false;
      }

      samples.push({
        cellKey: cellKey(cell),
        sampleIndex: i,
        subjectId: meta.subjectId,
        topicId: meta.topicId,
        skillId: meta.skillId,
        subskillId: meta.subskillId,
        missingFields: meta.missingFields || [],
        warnings: meta.warnings || [],
      });
    }

    if (cellPass) cellsOk += 1;
  }

  /** Missing metadata is reported: policy — hard fail only on integrity or missing core ids */
  const hardFails = issues.filter((x) => x.code === "integrity" || x.code === "missing_core_metadata");
  const finalPass = hardFails.length === 0 && cellsScanned > 0 && samples.length > 0;

  const auditPayload = {
    generatedAt: new Date().toISOString(),
    version: "1.0.0",
    subjectStrategies,
    supportedSubjects: SUPPORTED_SUBJECTS,
    cellsScanned,
    cellsFullyOk: cellsOk,
    samplesPerCell: N,
    integrity: { pass: integrityFail === 0 ? integrityPass : integrityPass, fail: integrityFail },
    missingFieldHistogram: missingStats,
    note: "expectedErrorTypes and prerequisiteSkillIds may be empty until pool rows add them; reported in missingFields.",
    issues: issues.slice(0, 200),
    issueCount: issues.length,
    status: finalPass ? "PASS" : "FAIL",
  };

  await writeFile(RUN_JSON, JSON.stringify(auditPayload, null, 2), "utf8");
  await writeFile(AUDIT_JSON, JSON.stringify(auditPayload, null, 2), "utf8");

  const md = [
    "# Question skill tagging audit",
    "",
    `- **Status:** ${finalPass ? "PASS" : "FAIL"}`,
    `- **Generated:** ${auditPayload.generatedAt}`,
    "",
    "## Subject metadata strategies",
    "",
    ...SUPPORTED_SUBJECTS.map((s) => `- **${s}:** ${subjectStrategies[s].strategy}`),
    "",
    "## Metrics",
    "",
    `| Metric | Value |`,
    `| --- | ---: |`,
    `| Cells scanned | ${cellsScanned} |`,
    `| Cells all samples OK | ${cellsOk} |`,
    `| Integrity pass | ${integrityPass} |`,
    `| Integrity fail | ${integrityFail} |`,
    "",
    "### Missing field histogram (informational)",
    "",
    "```json",
    JSON.stringify(missingStats, null, 2),
    "```",
    "",
    "---",
    "",
    "See `question-skill-metadata-v1.js` for resolution rules.",
    "",
  ].join("\n");

  await writeFile(AUDIT_MD, md, "utf8");

  console.log(finalPass ? "PASS: question-skill-metadata QA" : "FAIL: question-skill-metadata QA");
  console.log(`  ${AUDIT_JSON}`);
  process.exit(finalPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
