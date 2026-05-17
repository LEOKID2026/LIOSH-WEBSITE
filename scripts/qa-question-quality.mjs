#!/usr/bin/env node
/**
 * Cross-subject question quality audit (stems, MCQ options, thin pools).
 * npm run qa:question-quality
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "reports", "question-audit");
const OUT_JSON = join(OUT_DIR, "question-quality-audit.json");
const OUT_MD = join(OUT_DIR, "question-quality-audit.md");

const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const {
  auditMcqQuality,
  buildQuestionFingerprint,
  buildNearDuplicateStemKey,
  normalizeStemForFingerprint,
} = await import(href("utils/question-quality.js"));
const { generateForMatrixCell, SUPPORTED_SUBJECTS } = await import(
  "./learning-simulator/lib/question-generator-adapters.mjs"
);
const { normalizeQuestionPayload, runIntegrityChecks } = await import(
  "./learning-simulator/lib/question-integrity-checks.mjs"
);
const { finalizeHebrewMcq, generateQuestion: generateHebrew } = await import(
  href("utils/hebrew-question-generator.js")
);
const { hebrewQuestionFingerprint } = await import(href("utils/hebrew-learning-intel.js"));

const SAMPLES = Math.max(2, Math.min(10, Number(process.env.QA_QUALITY_SAMPLES || 4)));

const summary = {
  generatedAt: new Date().toISOString(),
  totalScanned: 0,
  duplicateStemGroups: 0,
  nearDuplicateStemGroups: 0,
  mcqFailures: 0,
  mcqWarnings: 0,
  thinInventoryCells: [],
  worstRepeatedStems: [],
  bySubject: {},
  hebrewG3Reading: null,
  failures: [],
};

/** @type {Map<string, { count: number, sample: object }>} */
const stemCounts = new Map();

function recordStem(fp, ctx) {
  if (!fp) return;
  const prev = stemCounts.get(fp) || { count: 0, sample: ctx };
  prev.count += 1;
  stemCounts.set(fp, prev);
}

function auditQuestion(raw, ctx) {
  const norm = normalizeQuestionPayload(raw);
  if (!norm?.stem) return;
  summary.totalScanned += 1;

  const fp = buildQuestionFingerprint(raw, ctx);
  const near = buildNearDuplicateStemKey(raw);
  recordStem(fp, { ...ctx, stem: norm.stem.slice(0, 120) });
  recordStem(`near|${near}`, { ...ctx, stem: norm.stem.slice(0, 80), near: true });

  const integrity = runIntegrityChecks(norm, ctx);
  if (!integrity.pass) {
    summary.mcqFailures += integrity.failures.length;
    for (const f of integrity.failures.slice(0, 3)) {
      summary.failures.push({ ...ctx, ...f, stem: norm.stem.slice(0, 100) });
    }
  }
  summary.mcqWarnings += integrity.warnings.length;

  const subj = summary.bySubject[ctx.subject] || {
    scanned: 0,
    failures: 0,
    warnings: 0,
  };
  subj.scanned += 1;
  subj.failures += integrity.failures.length;
  subj.warnings += integrity.warnings.length;
  summary.bySubject[ctx.subject] = subj;
}

async function scanGenerated() {
  const topicsBySubject = {
    math: ["addition", "equations", "fractions", "word_problems"],
    geometry: ["area", "perimeter", "angles"],
    hebrew: ["reading", "grammar", "comprehension", "vocabulary"],
    english: ["grammar", "vocabulary", "translation"],
    moledet_geography: ["israel_map", "settlements", "climate"],
  };

  for (const subject of SUPPORTED_SUBJECTS) {
    const topics = topicsBySubject[subject] || ["default"];
    for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
      for (const level of ["easy", "medium", "hard"]) {
        for (const topic of topics) {
          let cellCount = 0;
          for (let i = 0; i < SAMPLES; i++) {
            const gen = await generateForMatrixCell(
              { grade, subjectCanonical: subject, level, topic },
              i
            );
            if (gen.unsupported || !gen.question) continue;
            cellCount += 1;
            auditQuestion(gen.question, { subject, grade, level, topic, sample: i });
          }
          if (cellCount < 3) {
            summary.thinInventoryCells.push({ subject, grade, level, topic, samples: cellCount });
          }
        }
      }
    }
  }
}

async function scanScienceBank() {
  const { SCIENCE_QUESTIONS } = await import(href("data/science-questions.js"));
  for (const row of SCIENCE_QUESTIONS) {
    auditQuestion(
      { ...row, question: row.stem, topic: row.topic },
      { subject: "science", grade: row.grades?.[0], level: row.minLevel, topic: row.topic }
    );
  }
}

async function auditHebrewG3Reading() {
  const { G3_EASY_QUESTIONS, G3_MEDIUM_QUESTIONS, G3_HARD_QUESTIONS } = await import(
    href("data/hebrew-questions/g3.js")
  );
  const levels = [
    ["easy", G3_EASY_QUESTIONS.reading],
    ["medium", G3_MEDIUM_QUESTIONS.reading],
    ["hard", G3_HARD_QUESTIONS.reading],
  ];
  const all = [];
  for (const [level, pool] of levels) {
    for (const raw of pool || []) {
      const fq = finalizeHebrewMcq({ ...raw }, "reading", level, "g3");
      const q = {
        topic: "reading",
        question: fq.question,
        answers: fq.answers,
        correct: fq.correct,
      };
      all.push({
        level,
        question: fq.question,
        answers: fq.answers,
        fp: hebrewQuestionFingerprint(q),
        mcq: auditMcqQuality(q, { topic: "reading" }),
      });
    }
  }
  const fpMap = new Map();
  for (const row of all) {
    fpMap.set(row.fp, (fpMap.get(row.fp) || 0) + 1);
  }
  const dupStems = [...fpMap.entries()].filter(([, c]) => c > 1);
  summary.hebrewG3Reading = {
    total: all.length,
    byLevel: Object.fromEntries(levels.map(([lv, p]) => [lv, (p || []).length])),
    uniqueFingerprints: fpMap.size,
    duplicateFingerprintGroups: dupStems.length,
    duplicateExamples: dupStems.slice(0, 10).map(([fp, c]) => ({ fp, count: c })),
    mcqFailureCount: all.reduce((n, r) => n + r.mcq.failures.length, 0),
    mcqWarningCount: all.reduce((n, r) => n + r.mcq.warnings.length, 0),
    lengthBiasWarnings: all.filter((r) =>
      r.mcq.warnings.some((w) => w.code === "correct_answer_length_bias")
    ).length,
    genericDistractorWarnings: all.filter((r) =>
      r.mcq.warnings.some((w) => w.code === "generic_reading_distractors")
    ).length,
  };
}

function finalizeSummary() {
  const exactDups = [...stemCounts.entries()].filter(
    ([k, v]) => !k.startsWith("near|") && v.count > 1
  );
  const nearDups = [...stemCounts.entries()].filter(
    ([k, v]) => k.startsWith("near|") && v.count > 1
  );
  summary.duplicateStemGroups = exactDups.length;
  summary.nearDuplicateStemGroups = nearDups.length;
  summary.worstRepeatedStems = exactDups
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([fp, v]) => ({
      fingerprint: fp.slice(0, 120),
      count: v.count,
      sample: v.sample,
    }));
}

function buildMarkdown() {
  const h = summary.hebrewG3Reading;
  return `# Question quality audit

Generated: ${summary.generatedAt}

## Totals
- Questions scanned: **${summary.totalScanned}**
- Duplicate stem groups: **${summary.duplicateStemGroups}**
- Near-duplicate stem groups: **${summary.nearDuplicateStemGroups}**
- MCQ hard failures: **${summary.mcqFailures}**
- MCQ warnings: **${summary.mcqWarnings}**
- Thin inventory cells: **${summary.thinInventoryCells.length}**

## Hebrew grade 3 reading (bank)
- Total after finalize: **${h?.total ?? 0}** (easy ${h?.byLevel?.easy ?? 0}, medium ${h?.byLevel?.medium ?? 0}, hard ${h?.byLevel?.hard ?? 0})
- Unique fingerprints: **${h?.uniqueFingerprints ?? 0}**
- Duplicate fingerprint groups: **${h?.duplicateFingerprintGroups ?? 0}**
- MCQ failures: **${h?.mcqFailureCount ?? 0}**
- Length-bias warnings: **${h?.lengthBiasWarnings ?? 0}**
- Generic distractor warnings: **${h?.genericDistractorWarnings ?? 0}**

## Per subject
${Object.entries(summary.bySubject)
  .map(
    ([s, v]) =>
      `- **${s}**: scanned ${v.scanned}, failures ${v.failures}, warnings ${v.warnings}`
  )
  .join("\n")}

## Thin inventory (samples < 3)
${summary.thinInventoryCells
  .slice(0, 40)
  .map((c) => `- ${c.subject} ${c.grade} ${c.topic} ${c.level}`)
  .join("\n") || "(none)"}

## Top repeated stems
${summary.worstRepeatedStems
  .map((w) => `- ×${w.count} ${w.sample?.subject} ${w.sample?.grade} ${w.sample?.topic}`)
  .join("\n") || "(none)"}
`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await scanGenerated();
  await scanScienceBank();
  await auditHebrewG3Reading();
  finalizeSummary();

  await writeFile(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(), "utf8");

  const failBudget = Number(process.env.QA_QUALITY_FAIL_THRESHOLD || 25);
  if (summary.mcqFailures > failBudget) {
    console.error(`FAIL: ${summary.mcqFailures} MCQ hard failures (budget ${failBudget})`);
    console.error(`Report: ${OUT_JSON}`);
    process.exit(1);
  }
  console.log("PASS: question quality audit within budget");
  console.log(`Report: ${OUT_JSON}`);
  console.log(`Markdown: ${OUT_MD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
