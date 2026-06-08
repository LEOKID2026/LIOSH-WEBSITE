#!/usr/bin/env node
/**
 * MCQ obvious-answer risk audit (read-only).
 * Output: docs/qa/_artifacts/mcq-obvious-answer-risk/mcq-obvious-answer-risk.json
 *         docs/qa/MCQ_OBVIOUS_ANSWER_RISK_AUDIT.md
 *
 * node scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
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
  modUrl,
} from "../learning-simulator/lib/question-generator-adapters.mjs";
import {
  detectMcqObviousAnswerRisks,
  assessCorrectIndexPattern,
} from "./lib/mcq-obvious-answer-risk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const { mcqCellValue } = await import(modUrl("utils/mcq-option-cell.js"));
const { extractMcqFields } = await import(modUrl("utils/question-quality.js"));
const { rebalanceObviousMcqDistractors } = await import(modUrl("utils/mcq-distractor-rebalance.js"));
const { repairMcqObviousAnswerContent } = await import(modUrl("utils/mcq-fail-content-repair.js"));
const ARTIFACT_DIR = join(ROOT, "docs", "qa", "_artifacts", "mcq-obvious-answer-risk");
const OUT_JSON = join(ARTIFACT_DIR, "mcq-obvious-answer-risk.json");
const OUT_MD = join(ROOT, "docs", "qa", "MCQ_OBVIOUS_ANSWER_RISK_AUDIT.md");

const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const GEN_SAMPLES = Math.max(3, Math.min(12, Number(process.env.MCQ_RISK_GEN_SAMPLES || 6)));
const LEVELS = ["easy", "medium", "hard"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const SEV_RANK = { BLOCKER: 4, FAIL: 3, WARN: 2, INFO: 1 };

async function collectMcqQuestions() {
  /** @type {Array<object>} */
  const items = [];

  async function pushMcq(ref) {
    const pre = preprocessRaw(ref.raw);
    const { answers, correctIndex, correctAnswer } = extractMcqFields(pre);
    if (answers.length < 2) return;
    items.push({ ...ref, raw: pre, answers, correctIndex, correctAnswer });
  }

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
    return out;
  }

  const scienceMod = await import(modUrl("data/science-questions.js"));
  for (const q of scienceMod.SCIENCE_QUESTIONS || []) {
    if (!Array.isArray(q.options) || q.options.length < 2) continue;
    await pushMcq({
      subject: "science",
      grade: q.grades?.[0],
      topic: q.topic,
      difficulty: q.minLevel,
      source: "science_bank",
      sourceFile: "data/science-questions.js",
      id: q.id,
      raw: {
        question: q.stem,
        answers: q.options,
        correctIndex: q.correctIndex,
        params: q.params,
      },
    });
  }

  const engPools = await import(modUrl("data/english-questions/index.js"));
  for (const [topic, root, file] of [
    ["grammar", engPools.GRAMMAR_POOLS, "data/english-questions/index.js"],
    ["sentences", engPools.SENTENCE_POOLS, "data/english-questions/index.js"],
    ["translation", engPools.TRANSLATION_POOLS, "data/english-questions/index.js"],
  ]) {
    for (const [poolKey, arr] of Object.entries(root || {})) {
      if (!Array.isArray(arr)) continue;
      arr.forEach((item, idx) => {
        if (!isEnglishMcqLike(item)) return;
        const raw = normalizeEnglishBankItem(item);
        if (!raw) return;
        pushMcq({
          subject: "english",
          grade: item.minGrade ? `g${item.minGrade}` : undefined,
          topic,
          difficulty: item.difficulty,
          source: `english_pool:${poolKey}`,
          sourceFile: file,
          id: item.id || `${poolKey}:${idx}`,
          raw,
        });
      });
    }
  }

  try {
    const rich = await import(modUrl("utils/hebrew-rich-question-bank.js"));
    const pool = rich.HEBREW_RICH_POOL || rich.default?.HEBREW_RICH_POOL;
    if (Array.isArray(pool)) {
      pool.forEach((q, idx) => {
        const repaired = repairMcqObviousAnswerContent(q, {
          subject: "hebrew",
          stem: q.question,
        });
        pushMcq({
          subject: "hebrew",
          topic: q.topic,
          source: "hebrew_rich_pool",
          sourceFile: "utils/hebrew-rich-question-bank.js",
          id: q.id || `rich:${idx}`,
          raw: repaired,
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
          pushMcq({
            subject: "moledet_geography",
            source: `moledet:${poolName}:${band}`,
            sourceFile: "data/geography-questions/index.js",
            id: q.id || `${poolName}:${band}:${idx}`,
            raw: q,
          });
        });
      }
    }
  } catch {
    /* optional */
  }

  for (const subject of SUPPORTED_SUBJECTS) {
    if (subject === "science" || subject === "english") continue;
    for (const grade of GRADES) {
      for (const topic of curriculumTopicsFor(subject, grade)) {
        for (const level of LEVELS) {
          for (let i = 0; i < GEN_SAMPLES; i++) {
            const gen = await generateForMatrixCell(
              { grade, subjectCanonical: subject, level, topic },
              i
            );
            if (gen.unsupported || !gen.ok || !gen.raw) continue;
            pushMcq({
              subject,
              grade,
              topic,
              difficulty: level,
              source: `generator:${subject}:${grade}:${topic}:${level}:${i}`,
              sourceFile: `utils/${subject === "moledet_geography" ? "moledet-geography" : subject}-question-generator.js`,
              raw: gen.raw,
            });
          }
        }
      }
    }
  }

  return items;
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  console.log("Collecting MCQ questions...");
  const mcqs = await collectMcqQuestions();
  console.log(`MCQ count: ${mcqs.length}`);

  /** @type {Record<string, Record<number, number>>} */
  const poolIndexHist = {};

  /** @type {Array<object>} */
  const flagged = [];
  /** @type {Record<string, { total: number, flagged: number, bySeverity: Record<string, number>, byCategory: Record<string, number> }>} */
  const bySubject = {};

  for (const item of mcqs) {
    const subj = item.subject || "unknown";
    if (!bySubject[subj]) {
      bySubject[subj] = { total: 0, flagged: 0, bySeverity: {}, byCategory: {} };
    }
    bySubject[subj].total += 1;

    const poolKey = `${item.sourceFile || item.source}:${item.source}`;
    if (!poolIndexHist[poolKey]) poolIndexHist[poolKey] = {};
    poolIndexHist[poolKey][item.correctIndex] =
      (poolIndexHist[poolKey][item.correctIndex] || 0) + 1;

    const stem = String(
      item.raw?.question ?? item.raw?.exerciseText ?? item.raw?.stem ?? ""
    ).trim();
    let risks = detectMcqObviousAnswerRisks(item.raw, { subject: subj, stem });

    const hist = poolIndexHist[poolKey];
    const poolTotal = Object.values(hist).reduce((a, b) => a + b, 0);
    const patternRisk = assessCorrectIndexPattern(item.correctIndex, poolTotal, hist, item.sourceFile);
    if (patternRisk) risks = [...risks, patternRisk];

    if (!risks.length) continue;

    bySubject[subj].flagged += 1;
    let maxSev = "INFO";
    for (const r of risks) {
      bySubject[subj].bySeverity[r.severity] = (bySubject[subj].bySeverity[r.severity] || 0) + 1;
      bySubject[subj].byCategory[r.category] = (bySubject[subj].byCategory[r.category] || 0) + 1;
      if ((SEV_RANK[r.severity] || 0) > (SEV_RANK[maxSev] || 0)) maxSev = r.severity;
    }

    flagged.push({
      subject: subj,
      grade: item.grade,
      topic: item.topic,
      difficulty: item.difficulty,
      source: item.source,
      sourceFile: item.sourceFile,
      id: item.id,
      stem: stem.slice(0, 200),
      options: item.answers,
      correctAnswer: item.correctAnswer,
      correctIndex: item.correctIndex,
      maxSeverity: maxSev,
      risks,
    });
  }

  flagged.sort(
    (a, b) =>
      (SEV_RANK[b.maxSeverity] || 0) - (SEV_RANK[a.maxSeverity] || 0)
  );

  const blockers = flagged.filter((f) => f.maxSeverity === "BLOCKER").length;
  const fails = flagged.filter((f) => f.maxSeverity === "FAIL").length;
  const warns = flagged.filter((f) => f.maxSeverity === "WARN").length;

  const summary = {
    generatedAt: new Date().toISOString(),
    totalMcqScanned: mcqs.length,
    totalFlagged: flagged.length,
    blockers,
    fails,
    warns,
    bySubject,
    flaggedQuestions: flagged,
    verdict:
      blockers > 0
        ? "NOT_PASS"
        : fails > 50
          ? "NOT_PASS"
          : fails > 0 || warns > 0
            ? "PASS_WITH_WARNINGS"
            : "PASS",
  };

  await writeFile(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");

  const lines = [];
  lines.push("# MCQ Obvious Answer Risk Audit");
  lines.push("");
  lines.push(`**Generated:** ${summary.generatedAt}`);
  lines.push(`**Verdict:** ${summary.verdict}`);
  lines.push("");
  lines.push("## Command");
  lines.push("");
  lines.push("```powershell");
  lines.push("npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs");
  lines.push("```");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| MCQ scanned | ${summary.totalMcqScanned} |`);
  lines.push(`| Flagged questions | ${summary.totalFlagged} |`);
  lines.push(`| BLOCKER | ${blockers} |`);
  lines.push(`| FAIL | ${fails} |`);
  lines.push(`| WARN | ${warns} |`);
  lines.push("");
  lines.push("## Per-subject");
  lines.push("");
  lines.push("| Subject | MCQ total | Flagged | FAIL | WARN |");
  lines.push("|---------|----------:|--------:|-----:|-----:|");
  for (const [subj, s] of Object.entries(bySubject).sort()) {
    lines.push(
      `| ${subj} | ${s.total} | ${s.flagged} | ${s.bySeverity.FAIL || 0} | ${s.bySeverity.WARN || 0} |`
    );
  }
  lines.push("");
  lines.push("## Top flagged examples (first 30)");
  lines.push("");
  for (const f of flagged.slice(0, 30)) {
    lines.push(`### ${f.maxSeverity} — ${f.subject} ${f.grade || ""} ${f.topic || ""}`);
    lines.push(`- **Source:** ${f.source} (${f.sourceFile})`);
    lines.push(`- **Stem:** ${f.stem}`);
    lines.push(`- **Options:** ${f.options.join(" | ")}`);
    lines.push(`- **Correct:** ${f.correctAnswer}`);
    for (const r of f.risks) {
      lines.push(`- **${r.category}** (${r.severity}): ${r.explanation}`);
      lines.push(`  - Fix direction: ${r.suggestedFix}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Diagnostic handling recommendation");
  lines.push("");
  lines.push("### Current state");
  lines.push("");
  lines.push("- **No runtime field** marks MCQ obvious-answer risk today. Phase 8 `questionEngine` exposes `answerLeakageRisk` (`stem_leak`, `explanation_shown`, etc.) but not obviousness/trivial-guess quality.");
  lines.push("- **`questionQuality`** appears in the diagnostic master plan as a 0–1 engine-metadata confidence score, not MCQ distractor quality.");
  lines.push("- **Canonical metadata contract** (`QUESTION_METADATA_CONTRACT.md`) has no `mcqObviousnessRisk` field yet; Q2-D validator enforces skill/topic/answerFormat only.");
  lines.push("- **Frozen snapshots** preserve `params.canonicalMetadata` and Phase 8 `questionEngine`; a new internal-only field could be added additively without changing public parent API.");
  lines.push("- **Evidence quality (Q1/Q2-E)** counts diagnostic answers and recurrence; it does **not** downweight by question quality.");
  lines.push("- **Flags** `DIAGNOSTIC_METADATA_*` default OFF; no consumption path exists for quality-based exclusion.");
  lines.push("");
  lines.push("### Recommended future design (no active change in this pass)");
  lines.push("");
  lines.push("```json");
  lines.push('{');
  lines.push('  "questionQuality": {');
  lines.push('    "mcqObviousnessRisk": "none | warn | fail | blocker",');
  lines.push('    "mcqObviousnessCategories": ["A_length_outlier", "..."],');
  lines.push('    "auditedAt": "ISO-8601",');
  lines.push('    "auditVersion": "mcq-obvious-v1"');
  lines.push("  }");
  lines.push("}");
  lines.push("```");
  lines.push("");
  lines.push("| Property | Recommendation |");
  lines.push("|----------|----------------|");
  lines.push("| Storage | `params.canonicalMetadata.questionQuality` or sibling internal block |");
  lines.push("| Preservation | Copy into frozen activity snapshot at assign/freeze time |");
  lines.push("| Public API | Strip in `stripInternalReportPayloadFields` — never in parent `meta.evidenceQuality` |");
  lines.push("| Diagnostic use | Optional downweight/exclude behind **new default-OFF** flag e.g. `DIAGNOSTIC_MCQ_QUALITY_DOWNWEIGHT_ENABLED` |");
  lines.push("| Scope | Parent-context only at first; no school/teacher parity until approved |");
  lines.push("| Behavior | Audit populates severity; engine ignores until flag ON |");
  lines.push("");
  lines.push("### Risks");
  lines.push("");
  lines.push("- False positives from heuristic audit could suppress valid evidence if flag enabled prematurely.");
  lines.push("- Generator-only sampling may miss per-session shuffle bugs; pool-level index skew (category G) needs runtime telemetry.");
  lines.push("- Adding consumption before bank fixes could hide real weaknesses instead of improving items.");
  lines.push("");
  lines.push("### Confirmation");
  lines.push("");
  lines.push("**No active diagnostic behavior was changed in this audit pass.**");

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
