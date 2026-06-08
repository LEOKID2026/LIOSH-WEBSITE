#!/usr/bin/env node
/**
 * Full question bank integrity audit (read-only).
 * Output: docs/qa/_artifacts/question-bank-integrity/ + QUESTION_BANK_INTEGRITY_AUDIT.md
 *
 * npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
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
import { normalizeQuestionPayload, runIntegrityChecks } from "../learning-simulator/lib/question-integrity-checks.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const ARTIFACT_DIR = join(ROOT, "docs", "qa", "_artifacts", "question-bank-integrity");
const OUT_JSON = join(ARTIFACT_DIR, "question-bank-integrity.json");
const OUT_MD = join(ROOT, "docs", "qa", "QUESTION_BANK_INTEGRITY_AUDIT.md");

const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { detectStemLeak } = await import(href("lib/learning/question-engine-metadata.js"));
const { normalizeQuestionMetadata } = await import(href("lib/learning/question-metadata-normalizer.js"));
const { validateCanonicalMetadataBlock } = await import(href("lib/learning/question-metadata-validator.js"));
const { extractMcqFields, normalizeOptionForCompare } = await import(href("utils/question-quality.js"));
const { mcqCellValue, mcqCellLabel } = await import(href("utils/mcq-option-cell.js"));
const { mcqOptionsAreDuplicate, rebalanceObviousMcqDistractors } = await import(
  href("utils/mcq-distractor-rebalance.js")
);

const GEN_SAMPLES = Math.max(3, Math.min(12, Number(process.env.INTEGRITY_GEN_SAMPLES || 6)));
const LEVELS = ["easy", "medium", "hard"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

const PLACEHOLDER_RE =
  /\b(undefined|null|\[DRAFT\]|\[TODO\]|PLACEHOLDER|TBD|FIXME)\b|^\s*-\s*$/i;
const BAD_GEOMETRY_SUBJECT_RE = /הנדסה/;

/** @typedef {{ subject: string, grade?: string, topic?: string, level?: string, source: string, sourceFile?: string, id?: string, raw: object }} QuestionRef */

/** Flatten object-shaped MCQ cells for audit comparisons. */
function preprocessRaw(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const out = { ...raw };
  const answers = raw.answers ?? raw.options;
  if (Array.isArray(answers)) {
    const flat = answers.map((a) => {
      const v = mcqCellValue(a);
      return v == null ? "" : String(v);
    });
    out.answers = flat;
    out.options = flat;
  }
  if (raw.params && typeof raw.params === "object") {
    out.params = { ...raw.params };
  }
  return out;
}

/** @param {QuestionRef} ref */
function auditOne(ref) {
  const raw = preprocessRaw(ref.raw);
  const norm = normalizeQuestionPayload(raw);
  const ctx = {
    subject: ref.subject,
    grade: ref.grade,
    level: ref.level,
    topic: ref.topic,
    requestedTopic: ref.topic,
    resolvedTopic: raw?.topic || raw?.operation || ref.topic,
  };

  /** @type {Array<object>} */
  const structuralIssues = [];
  /** @type {Array<object>} */
  const leakIssues = [];
  /** @type {Array<object>} */
  const metadataIssues = [];

  if (!norm) {
    structuralIssues.push({ code: "null_payload", message: "Could not normalize question" });
    return { structuralIssues, leakIssues, metadataIssues, isMcq: false };
  }

  const integrity = runIntegrityChecks(norm, ctx);
  for (const f of integrity.failures) {
    structuralIssues.push({ ...f, layer: "integrity" });
  }

  const subjectLabel =
    raw?.subject ||
    raw?.params?.subject ||
    raw?.params?.canonicalMetadata?.subject ||
    ref.subject;
  if (ref.subject === "geometry" && BAD_GEOMETRY_SUBJECT_RE.test(String(subjectLabel))) {
    structuralIssues.push({
      code: "bad_geometry_subject_label",
      message: 'Geometry subject must be "גאומטריה", not "הנדסה"',
    });
  }

  const textsToScan = [
    norm.stem,
    norm.explanation,
    norm.hint,
    raw?.title,
    raw?.questionLabel,
    raw?.prompt,
    raw?.template,
    raw?.params?.questionPrefix,
    raw?.params?.displayLabel,
    raw?.frozenSnapshot?.stem,
    raw?.question_snapshot?.stem,
  ].filter(Boolean);

  for (const t of textsToScan) {
    if (PLACEHOLDER_RE.test(String(t))) {
      structuralIssues.push({ code: "placeholder_text", message: `Placeholder in text: ${String(t).slice(0, 60)}` });
    }
  }

  const { answers, correctAnswer, correctIndex } = extractMcqFields(raw);
  const isMcq = answers.length >= 2;

  if (isMcq) {
    for (let i = 0; i < answers.length; i++) {
      for (let j = i + 1; j < answers.length; j++) {
        if (mcqOptionsAreDuplicate(answers[i], answers[j])) {
          structuralIssues.push({
            code: "duplicate_options",
            message: `Duplicate options ${i}/${j}`,
            options: [answers[i], answers[j]],
          });
        }
      }
    }
  }

  const leakFields = [
    ["stem", norm.stem],
    ["explanation", norm.explanation],
    ["hint", norm.hint],
    ["title", raw?.title],
    ["questionLabel", raw?.questionLabel],
    ["prompt", raw?.prompt],
    ["metadataLabel", raw?.params?.displayLabel || raw?.params?.questionPrefix],
    ["frozenSnapshot", raw?.frozenSnapshot?.stem || raw?.question_snapshot?.stem],
  ];

  const leakTarget = correctAnswer ?? answers[correctIndex];
  for (const [field, text] of leakFields) {
    if (!text || leakTarget == null) continue;
    if (detectStemLeak(String(text), leakTarget)) {
      leakIssues.push({
        code: "answer_leak",
        field,
        message: `Correct answer appears in ${field}`,
        correctPreview: String(leakTarget).slice(0, 80),
      });
    }
  }

  if (isMcq && leakTarget != null) {
    for (let i = 0; i < answers.length; i++) {
      const label = mcqCellLabel(answers[i]);
      if (label && detectStemLeak(label, leakTarget)) {
        leakIssues.push({
          code: "answer_leak",
          field: "option_label_prefix",
          message: `Correct answer in option ${i} label prefix`,
        });
      }
    }
  }

  const cm =
    raw?.params?.canonicalMetadata ||
    ref.raw?.params?.canonicalMetadata ||
    ref.raw?.canonicalMetadata ||
    raw?.canonicalMetadata ||
    normalizeQuestionMetadata(ref.raw)?.canonicalMetadata ||
    null;

  const metaCtx = {
    subject: ref.subject === "moledet_geography" ? "moledet_geography" : ref.subject,
    topic: ref.topic || raw?.topic || raw?.operation,
    answerMode: raw?.params?.answerMode || (isMcq ? "choice" : "typing"),
    isEmptyPool: raw?.params?.kind === "empty_pool" || raw?.params?.kind === "no_question",
  };
  const metaProblems = validateCanonicalMetadataBlock(cm, metaCtx);
  for (const m of metaProblems) {
    metadataIssues.push({ code: "metadata", message: m });
  }

  if (norm.stem && cm?.skillId && norm.stem.trim().startsWith(String(cm.skillId))) {
    leakIssues.push({
      code: "metadata_ui_leak",
      message: "Diagnostic skillId appears as question stem prefix",
    });
  }

  return { structuralIssues, leakIssues, metadataIssues, isMcq };
}

/** @param {QuestionRef} ref */
function exampleRow(ref, issues, kind) {
  const raw = preprocessRaw(ref.raw);
  const stem = String(raw?.question ?? raw?.exerciseText ?? raw?.stem ?? raw?.template ?? "").slice(0, 120);
  const { answers, correctAnswer } = extractMcqFields(raw);
  return {
    kind,
    subject: ref.subject,
    grade: ref.grade,
    topic: ref.topic,
    level: ref.level,
    source: ref.source,
    sourceFile: ref.sourceFile,
    id: ref.id,
    stem,
    options: answers.slice(0, 6),
    correctAnswer,
    issues: issues.slice(0, 3),
  };
}

async function collectStaticBanks() {
  /** @type {QuestionRef[]} */
  const refs = [];

  const scienceMod = await import(modUrl("data/science-questions.js"));
  for (const q of scienceMod.SCIENCE_QUESTIONS || []) {
    const balanced = rebalanceObviousMcqDistractors({
      options: q.options,
      correctIndex: q.correctIndex,
    });
    const opts = balanced.options || q.options;
    refs.push({
      subject: "science",
      grade: q.grades?.[0],
      topic: q.topic,
      level: q.minLevel,
      source: "science_bank",
      sourceFile: "data/science-questions.js",
      id: q.id,
      raw: {
        question: q.stem,
        answers: opts,
        options: opts,
        correctIndex: q.correctIndex,
        correctAnswer: opts?.[q.correctIndex],
        params: q.params || {},
        explanation: q.explanation,
        topic: q.topic,
      },
    });
  }

  const engPools = await import(modUrl("data/english-questions/index.js"));
  const poolFiles = [
    ["grammar", engPools.GRAMMAR_POOLS, "data/english-questions/index.js"],
    ["sentences", engPools.SENTENCE_POOLS, "data/english-questions/index.js"],
    ["translation", engPools.TRANSLATION_POOLS, "data/english-questions/index.js"],
  ];
  for (const [topic, root, file] of poolFiles) {
    for (const [poolKey, arr] of Object.entries(root || {})) {
      if (!Array.isArray(arr)) continue;
      arr.forEach((item, idx) => {
        if (!isEnglishMcqLike(item)) return;
        const raw = normalizeEnglishBankItem(item);
        if (!raw) return;
        refs.push({
          subject: "english",
          grade: item.minGrade ? `g${item.minGrade}` : undefined,
          topic,
          source: `english_pool:${poolKey}`,
          sourceFile: file,
          id: item.id || `${poolKey}:${idx}`,
          raw: { ...raw, ...item },
        });
      });
    }
  }

  try {
    const rich = await import(modUrl("utils/hebrew-rich-question-bank.js"));
    const pool = rich.HEBREW_RICH_POOL || rich.default?.HEBREW_RICH_POOL;
    if (Array.isArray(pool)) {
      pool.forEach((q, idx) => {
        refs.push({
          subject: "hebrew",
          topic: q.topic,
          source: "hebrew_rich_pool",
          sourceFile: "utils/hebrew-rich-question-bank.js",
          id: q.id || `rich:${idx}`,
          raw: q,
        });
      });
    }
  } catch {
    /* optional */
  }

  try {
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
          refs.push({
            subject: "moledet_geography",
            source: `moledet:${poolName}:${band}`,
            sourceFile: "data/geography-questions/index.js",
            id: q.id || `${poolName}:${band}:${idx}`,
            raw: { ...q, answers: balanced.answers || q.answers },
          });
        });
      }
    }
  } catch (e) {
    console.warn("Moledet bank load warning:", e?.message || e);
  }

  return refs;
}

async function collectGenerated() {
  /** @type {QuestionRef[]} */
  const refs = [];
  for (const subject of SUPPORTED_SUBJECTS) {
    if (subject === "science" || subject === "english") continue;
    for (const grade of GRADES) {
      for (const topic of curriculumTopicsFor(subject, grade)) {
        for (const level of LEVELS) {
          for (let i = 0; i < GEN_SAMPLES; i++) {
            const gen = await generateForMatrixCell({ grade, subjectCanonical: subject, level, topic }, i);
            if (gen.unsupported || !gen.ok || !gen.raw) continue;
            refs.push({
              subject,
              grade,
              topic,
              level,
              source: `generator:${subject}:${grade}:${topic}:${level}:sample${i}`,
              sourceFile: `utils/${subject === "moledet_geography" ? "moledet-geography" : subject}-question-generator.js`,
              raw: gen.raw,
            });
          }
        }
      }
    }
  }
  return refs;
}

function initSubjectStats() {
  return {
    total: 0,
    structuralPass: 0,
    structuralFail: 0,
    leakRisk: 0,
    missingMetadata: 0,
    duplicateOptions: 0,
    brokenAnswer: 0,
  };
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  console.log("Collecting static banks...");
  const staticRefs = await collectStaticBanks();
  console.log(`Static bank rows: ${staticRefs.length}`);
  console.log(`Collecting generated samples (${GEN_SAMPLES}/cell)...`);
  const genRefs = await collectGenerated();
  console.log(`Generated samples: ${genRefs.length}`);

  const allRefs = [...staticRefs, ...genRefs];

  /** @type {Record<string, ReturnType<typeof initSubjectStats>>} */
  const bySubject = {};
  /** @type {Array<object>} */
  const topExamples = [];

  for (const ref of allRefs) {
    const subj = ref.subject || "unknown";
    if (!bySubject[subj]) bySubject[subj] = initSubjectStats();
    const st = bySubject[subj];
    st.total += 1;

    const { structuralIssues, leakIssues, metadataIssues, isMcq } = auditOne(ref);
    const structOk = structuralIssues.length === 0;
    if (structOk) st.structuralPass += 1;
    else st.structuralFail += 1;

    if (leakIssues.length) st.leakRisk += 1;
    if (metadataIssues.length) st.missingMetadata += 1;
    if (structuralIssues.some((x) => x.code === "duplicate_options" || x.code === "duplicate_choices")) {
      st.duplicateOptions += 1;
    }
    if (
      structuralIssues.some(
        (x) =>
          x.code === "correct_not_in_options" ||
          x.code === "missing_answer" ||
          x.code === "empty_choice"
      )
    ) {
      st.brokenAnswer += 1;
    }

    const severity = structuralIssues.length ? 3 : leakIssues.length ? 2 : metadataIssues.length ? 1 : 0;
    if (severity > 0) {
      topExamples.push({
        severity,
        ...exampleRow(
          ref,
          [...structuralIssues, ...leakIssues, ...metadataIssues],
          structuralIssues.length ? "structural" : leakIssues.length ? "leak" : "metadata"
        ),
      });
    }
  }

  topExamples.sort((a, b) => b.severity - a.severity);
  const top20 = topExamples.slice(0, 20);

  const summary = {
    generatedAt: new Date().toISOString(),
    totalScanned: allRefs.length,
    staticBankRows: staticRefs.length,
    generatedSamples: genRefs.length,
    genSamplesPerCell: GEN_SAMPLES,
    bySubject,
    top20Examples: top20,
    verdict:
      Object.values(bySubject).every(
        (s) => s.structuralFail === 0 && s.brokenAnswer === 0
      )
        ? Object.values(bySubject).some((s) => s.leakRisk > 0 || s.missingMetadata > 0)
          ? "PASS_WITH_WARNINGS"
          : "PASS"
        : "NOT_PASS",
  };

  await writeFile(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");

  const lines = [];
  lines.push("# Question Bank Integrity Audit");
  lines.push("");
  lines.push(`**Generated:** ${summary.generatedAt}`);
  lines.push(`**Verdict:** ${summary.verdict}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push(`- Total questions scanned: **${summary.totalScanned}**`);
  lines.push(`- Static bank rows: **${summary.staticBankRows}**`);
  lines.push(`- Generated samples: **${summary.generatedSamples}** (${GEN_SAMPLES} per matrix cell for math/geometry/hebrew/moledet)`);
  lines.push("- Subjects: math, geometry, hebrew, english, science, moledet_geography");
  lines.push("");
  lines.push("## Command");
  lines.push("");
  lines.push("```powershell");
  lines.push("npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs");
  lines.push("```");
  lines.push("");
  lines.push("## Per-subject totals");
  lines.push("");
  lines.push("| Subject | Total | Structural pass | Structural fail | Leak risk | Missing metadata | Duplicate options | Broken answer |");
  lines.push("|---------|------:|----------------:|----------------:|----------:|-----------------:|------------------:|--------------:|");
  for (const [subj, s] of Object.entries(bySubject).sort()) {
    lines.push(
      `| ${subj} | ${s.total} | ${s.structuralPass} | ${s.structuralFail} | ${s.leakRisk} | ${s.missingMetadata} | ${s.duplicateOptions} | ${s.brokenAnswer} |`
    );
  }
  lines.push("");
  lines.push("## Top 20 examples");
  lines.push("");
  for (const ex of top20) {
    lines.push(`### ${ex.kind.toUpperCase()} — ${ex.subject} ${ex.grade || ""} ${ex.topic || ""}`);
    lines.push(`- **Source:** ${ex.source} (${ex.sourceFile || "n/a"})`);
    lines.push(`- **ID:** ${ex.id || "n/a"}`);
    lines.push(`- **Stem:** ${ex.stem}`);
    if (ex.options?.length) lines.push(`- **Options:** ${ex.options.join(" | ")}`);
    if (ex.correctAnswer) lines.push(`- **Correct:** ${ex.correctAnswer}`);
    for (const iss of ex.issues) {
      lines.push(`- **Issue:** ${iss.code || iss.message} — ${iss.message}`);
    }
    lines.push("");
  }
  lines.push("## Notes");
  lines.push("");
  lines.push("- Generator subjects are sampled, not exhaustively enumerated.");
  lines.push("- Static banks (science, english, moledet, hebrew rich) are scanned in full where loaded.");
  lines.push("- Metadata validation uses Q2-D `validateCanonicalMetadataBlock` (100% coverage expected per Q2-D validator).");
  lines.push("- No product files modified by this audit.");

  await writeFile(OUT_MD, lines.join("\n"), "utf8");
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Verdict: ${summary.verdict}`);
  process.exit(summary.verdict === "NOT_PASS" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
