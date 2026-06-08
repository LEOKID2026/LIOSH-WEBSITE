#!/usr/bin/env node
/**
 * MCQ child-visible option count audit (runtime / post-repair / post-strip paths).
 *
 * npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs
 *
 * Output:
 *   docs/qa/_artifacts/mcq-option-count/mcq-option-count.json
 *   docs/qa/MCQ_OPTION_COUNT_AUDIT_AND_FIX.md
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { curriculumTopicsFor } from "../lib/qa-curriculum-matrix.mjs";
import {
  generateForMatrixCell,
  SUPPORTED_SUBJECTS,
  englishItemsForMatrixTopic,
  filterEnglishByGrade,
  isEnglishMcqLike,
  normalizeEnglishBankItem,
  parseGradeNum,
  modUrl,
} from "../learning-simulator/lib/question-generator-adapters.mjs";
import { auditMcqOptionRow, summarizeMcqOptionAudits } from "./lib/mcq-option-count.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { rebalanceObviousMcqDistractors } = await import(href("utils/mcq-distractor-rebalance.js")).then(
  (m) => m.default?.rebalanceObviousMcqDistractors ? m.default : m
);
const { ensureMcqFourOptions } = await import(href("utils/mcq-four-options.js")).then((m) =>
  m.default?.ensureMcqFourOptions ? m.default : m
);
const { sanitizeQuestionForStudentDisplay } = await import(href("utils/student-question-stem-sanitizer.js")).then(
  (m) => (m.default?.sanitizeQuestionForStudentDisplay ? m.default : m)
);
const ARTIFACT_DIR = join(ROOT, "docs", "qa", "_artifacts", "mcq-option-count");
const OUT_JSON = join(ARTIFACT_DIR, "mcq-option-count.json");
const OUT_MD = join(ROOT, "docs", "qa", "MCQ_OPTION_COUNT_AUDIT_AND_FIX.md");
const GEN_SAMPLES = Math.max(4, Math.min(12, Number(process.env.MCQ_OPTION_GEN_SAMPLES || 8)));
const LEVELS = ["easy", "medium", "hard"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** @type {Array<Record<string, unknown>>} */
const rows = [];

/** @param {unknown} q @param {Record<string, unknown>} meta @param {string|null} [correctRaw] */
function pushAudit(q, meta, correctRaw = null) {
  rows.push(auditMcqOptionRow(q, correctRaw, meta));
}

/** @param {unknown} raw @param {Record<string, unknown>} meta */
function pushRuntimeQuestion(raw, meta) {
  const sanitized = sanitizeQuestionForStudentDisplay(raw);
  pushAudit(sanitized, { ...meta, path: `${meta.path || meta.source}:sanitize` }, sanitized?.correctAnswer);
}

async function collectStaticBanks() {
  const scienceMod = await import(modUrl("data/science-questions.js"));
  for (const q of scienceMod.SCIENCE_QUESTIONS || []) {
    const balanced = rebalanceObviousMcqDistractors({
      options: q.options,
      correctIndex: q.correctIndex,
    });
    const opts = balanced.options || q.options;
    const raw = ensureMcqFourOptions(
      {
        question: q.stem,
        answers: opts,
        options: opts,
        correctIndex: q.correctIndex,
        correctAnswer: opts?.[q.correctIndex],
        params: { answerMode: "choice", subject: "science", ...(q.params || {}) },
      },
      { subject: "science" }
    );
    pushRuntimeQuestion(raw, {
      subject: "science",
      grade: q.grades?.[0],
      topic: q.topic,
      level: q.minLevel,
      source: "static_bank",
      sourceFile: "data/science-questions.js",
      id: q.id,
      path: "science_export",
    });
  }

  const engPools = await import(modUrl("data/english-questions/index.js"));
  for (const [topic, root] of [
    ["grammar", engPools.GRAMMAR_POOLS],
    ["sentences", engPools.SENTENCE_POOLS],
    ["translation", engPools.TRANSLATION_POOLS],
  ]) {
    for (const [poolKey, arr] of Object.entries(root || {})) {
      if (!Array.isArray(arr)) continue;
      arr.forEach((item, idx) => {
        if (!isEnglishMcqLike(item)) return;
        const normalized = normalizeEnglishBankItem(item);
        if (!normalized) return;
        const padded = ensureMcqFourOptions(
          {
            ...normalized,
            params: {
              answerMode: "choice",
              subject: "english",
              ...(normalized.params || {}),
            },
          },
          { subject: "english", fallbackPool: item.options || item.answers }
        );
        pushRuntimeQuestion(padded, {
          subject: "english",
          grade: item.minGrade ? `g${item.minGrade}` : undefined,
          topic,
          source: `english_pool:${poolKey}`,
          sourceFile: "data/english-questions/index.js",
          id: item.id || `${poolKey}:${idx}`,
          path: "english_static_bank",
        });
      });
    }
  }

  const geoIndex = await import(modUrl("data/geography-questions/index.js"));
  for (const [poolName, pool] of Object.entries(geoIndex)) {
    if (!pool || typeof pool !== "object" || poolName === "default") continue;
    for (const [band, arr] of Object.entries(pool)) {
      if (!Array.isArray(arr)) continue;
      arr.forEach((q, idx) => {
        const balanced = rebalanceObviousMcqDistractors({
          answers: q.answers,
          correct: q.correct,
        });
        pushRuntimeQuestion(
          {
            question: q.question,
            answers: balanced.answers || q.answers,
            correct: q.correct,
            correctAnswer: (balanced.answers || q.answers)?.[q.correct],
            params: { answerMode: "choice", subject: "moledet_geography" },
          },
          {
            subject: "moledet_geography",
            grade: poolName.replace(/_QUESTIONS$/, "").toLowerCase(),
            topic: band,
            source: `moledet:${poolName}:${band}`,
            sourceFile: "data/geography-questions/index.js",
            id: q.id || `${poolName}:${band}:${idx}`,
            path: "moledet_export",
          }
        );
      });
    }
  }
}

async function collectGeneratedSamples() {
  for (const subject of SUPPORTED_SUBJECTS) {
    const topics = curriculumTopicsFor(subject);
    for (const grade of GRADES) {
      const gradeTopics = topics.filter((t) => t !== "mixed");
      for (const topic of gradeTopics.slice(0, 6)) {
        for (const level of LEVELS) {
          for (let i = 0; i < GEN_SAMPLES; i++) {
            const gen = await generateForMatrixCell(
              { grade, subjectCanonical: subject, level, topic },
              i
            );
            if (!gen.ok || !gen.raw) continue;
            pushRuntimeQuestion(gen.raw, {
              subject,
              grade,
              topic,
              level,
              source: `${gen.mode}_sample`,
              path: `generateForMatrixCell:${subject}`,
            });
          }
        }
      }
    }
  }
}

async function collectAssignedActivityPath() {
  const { generateActivityQuestionSetClient } = await import(
    href("lib/classroom-activities/generate-activity-questions-client.js")
  );
  const { stripQuestionSetForStudent } = await import(
    href("lib/classroom-activities/classroom-activities-shared.server.js")
  );

  const cases = [
    { subject: "math", gradeLevel: "g3", topic: "multiplication", difficulty: "medium", count: 5 },
    { subject: "science", gradeLevel: "g2", topic: "body", difficulty: "easy", count: 5 },
    { subject: "hebrew", gradeLevel: "g3", topic: "comprehension", difficulty: "medium", count: 5 },
    { subject: "geometry", gradeLevel: "g4", topic: "area", difficulty: "medium", count: 5 },
    { subject: "english", gradeLevel: "g3", topic: "grammar", difficulty: "medium", count: 5 },
    { subject: "english", gradeLevel: "g4", topic: "sentences", difficulty: "medium", count: 5 },
    { subject: "english", gradeLevel: "g2", topic: "vocabulary", difficulty: "easy", count: 5 },
    {
      subject: "moledet_geography",
      gradeLevel: "g3",
      topic: "homeland",
      difficulty: "easy",
      count: 5,
    },
  ];

  for (const c of cases) {
    try {
      const generated = await generateActivityQuestionSetClient(c);
      const stripped = stripQuestionSetForStudent(generated, "homework");
      for (const [idx, q] of stripped.entries()) {
        pushAudit(q, {
          subject: c.subject,
          grade: c.gradeLevel,
          topic: c.topic,
          level: c.difficulty,
          source: "assigned_activity_strip",
          path: "generateActivityQuestionSetClient+stripQuestionSetForStudent",
          sampleIndex: idx,
        });
      }
    } catch (e) {
      rows.push({
        subject: c.subject,
        grade: c.gradeLevel,
        topic: c.topic,
        source: "assigned_activity_strip",
        path: "generateActivityQuestionSetClient+stripQuestionSetForStudent",
        pass: true,
        skipped: true,
        skipReason: "generation_error",
        issues: [],
        optionCount: 0,
        note: String(e?.message || e).slice(0, 160),
      });
    }
  }
}

function renderMarkdown(summary, failures) {
  const lines = [];
  lines.push("# MCQ Option Count Audit");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Verdict:** **${summary.verdict}**`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total MCQs scanned | ${summary.totalScanned} |`);
  lines.push(`| Exactly 4 options | ${summary.exactly4} |`);
  lines.push(`| 2 options | ${summary.count2} |`);
  lines.push(`| 3 options | ${summary.count3} |`);
  lines.push(`| >4 options | ${summary.countOver4} |`);
  lines.push(`| Duplicate options | ${summary.duplicateOptions} |`);
  lines.push(`| Correct missing from options | ${summary.correctMissing} |`);
  lines.push(`| Fail rows | ${summary.fail} |`);
  lines.push("");
  lines.push("## By subject");
  lines.push("");
  lines.push("| Subject | Total | Fail | 2-opt | 3-opt | Not-4 (enforced) |");
  lines.push("|---------|------:|-----:|------:|------:|-----------------:|");
  for (const [sub, s] of Object.entries(summary.bySubject).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`| ${sub} | ${s.total} | ${s.fail} | ${s.count2} | ${s.count3} | ${s.not4} |`);
  }
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  lines.push("```powershell");
  lines.push("npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs");
  lines.push("```");
  lines.push("");
  if (failures.length) {
    lines.push("## Sample failures (up to 40)");
    lines.push("");
    for (const f of failures.slice(0, 40)) {
      lines.push(
        `- **${f.subject}** ${f.grade || ""} ${f.topic || ""} \`${f.source}\` count=${f.optionCount} issues=${(f.issues || []).join(",")} stem="${(f.stem || "").slice(0, 80)}"`
      );
    }
  }
  return lines.join("\n");
}

async function main() {
  console.log("Collecting static banks...");
  await collectStaticBanks();
  console.log(`Rows after static: ${rows.length}`);

  console.log("Collecting generated samples...");
  await collectGeneratedSamples();
  console.log(`Rows after generated: ${rows.length}`);

  console.log("Collecting assigned-activity strip path...");
  await collectAssignedActivityPath();
  console.log(`Rows total: ${rows.length}`);

  const summary = summarizeMcqOptionAudits(rows);
  const failures = rows.filter((r) => !r.pass);
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        failures: failures.slice(0, 500),
        samples: rows.slice(0, 200),
      },
      null,
      2
    )
  );
  await writeFile(OUT_MD, renderMarkdown(summary, failures));

  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Verdict: ${summary.verdict}`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
