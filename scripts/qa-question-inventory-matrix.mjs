#!/usr/bin/env node
/**
 * Professional question inventory matrix — truth, not lowered thresholds.
 * npm run qa:question-inventory-matrix
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { curriculumTopicsFor, isCurriculumCell } from "./lib/qa-curriculum-matrix.mjs";
import {
  INVENTORY_GRADES,
  INVENTORY_LEVELS,
  INVENTORY_SUBJECTS,
  PRO_TOPIC_MIN,
  classifyProfessionalCell,
  decideLaunchFromMatrix,
  isCoreCell,
  professionalMinimumForLevel,
} from "./lib/qa-inventory-professional.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "reports", "question-audit");
const href = (rel) => pathToFileURL(join(ROOT, rel)).href;

const PROBE_N = Math.max(200, Math.min(1200, Number(process.env.QA_INVENTORY_PROBE || 800)));

const { auditMcqQuality, normalizeOptionForCompare, extractMcqFields } = await import(
  href("utils/question-quality.js")
);
const { getQuestionFingerprintForSubject, getNearDuplicateKeyForSubject } = await import(
  href("utils/question-fingerprints.js")
);
const { hebrewStemNorm } = await import(href("utils/hebrew-learning-intel.js"));
const {
  generateForMatrixCell,
  englishItemsForMatrixTopic,
  filterEnglishByGrade,
  isEnglishMcqLike,
  normalizeEnglishBankItem,
  parseGradeNum,
} = await import("./learning-simulator/lib/question-generator-adapters.mjs");
const { normalizeQuestionPayload } = await import(
  "./learning-simulator/lib/question-integrity-checks.mjs"
);
const { finalizeHebrewMcq, HEBREW_LEGACY_QUESTIONS_SNAPSHOT } = await import(
  href("utils/hebrew-question-generator.js")
);
const { filterRichHebrewPool } = await import(href("utils/hebrew-rich-question-bank.js"));

const LEVEL_RANK = { easy: 0, medium: 1, hard: 2 };

/** @param {unknown} q */
function isUsableMcq(q) {
  if (!q || typeof q !== "object") return false;
  const aud = auditMcqQuality(q);
  if (!aud.isMcq && aud.failures.length === 0) return false;
  return aud.failures.length === 0;
}

/** @param {string} stem */
function extractHebrewPassage(stem) {
  const s = String(stem || "");
  const m =
    s.match(/קרא את הטקסט:\s*'([^']+)'/) ||
    s.match(/['׳]([^'׳]{10,})['׳]/) ||
    s.match(/"([^"]{10,})"/);
  return m ? (m[1] || m[2] || "").trim() : "";
}

/**
 * Reading: distinct passage + comprehension target + correct answer (not wording-only variants).
 * @param {object} q
 */
function hebrewReadingDistinctFingerprint(q) {
  const stem = String(q.question || q.exerciseText || "");
  const passage = extractHebrewPassage(stem);
  const passKey = passage ? hebrewStemNorm(passage) : hebrewStemNorm(stem);
  const { correctAnswer } = extractMcqFields(q);
  const corr = normalizeOptionForCompare(correctAnswer);
  const taskHead = hebrewStemNorm(stem).split(" ").slice(0, 14).join(" ");
  return `reading|pass:${passKey}|task:${taskHead}|corr:${corr}`;
}

/**
 * @param {object} q
 * @param {string} subject
 * @param {{ grade: string, level: string, topic: string }} ctx
 */
function usableFingerprint(q, subject, ctx) {
  if (subject === "hebrew" && (ctx.topic === "reading" || ctx.topic === "comprehension")) {
    return hebrewReadingDistinctFingerprint(q);
  }
  return getQuestionFingerprintForSubject(q, subject, ctx);
}

/** @param {object} raw @param {string} subject @param {string} topic @param {string} level @param {string} grade */
function normalizeForInventory(raw, subject, topic, level, grade) {
  let q = normalizeQuestionPayload(raw);
  if (subject === "hebrew") {
    const preview = finalizeHebrewMcq({ ...q }, topic, level, grade);
    q = { ...q, question: preview.question, answers: preview.answers, correct: preview.correct };
  }
  if (subject === "english" && raw?._englishBank) {
    q = normalizeEnglishBankItem(raw) || q;
  }
  return q;
}

/**
 * @param {object[]} bank
 * @param {string} grade
 * @param {string} topic
 * @param {string} level
 */
function countScienceCell(bank, grade, topic, level) {
  const reqRank = LEVEL_RANK[level] ?? 0;
  const fps = new Set();
  const near = new Set();
  let unusable = 0;
  for (const item of bank) {
    if (String(item.topic) !== String(topic)) continue;
    if (!Array.isArray(item.grades) || !item.grades.includes(grade)) continue;
    const lo = LEVEL_RANK[String(item.minLevel || "easy")] ?? 0;
    const hi = LEVEL_RANK[String(item.maxLevel || "hard")] ?? 2;
    if (reqRank < lo || reqRank > hi) continue;
    const q = {
      question: item.stem,
      answers: item.options,
      options: item.options,
      correctAnswer: item.options?.[item.correctIndex],
      id: item.id,
      _scienceBankId: item.id,
    };
    if (!isUsableMcq(q)) {
      unusable += 1;
      continue;
    }
    const ctx = { grade, level, topic };
    fps.add(usableFingerprint(q, "science", ctx));
    near.add(getNearDuplicateKeyForSubject(q, "science"));
  }
  return {
    unique: fps.size,
    nearDuplicateGroups: near.size - fps.size,
    unusable,
    inventorySource: "bank",
    generatorVariantCount: null,
  };
}

/**
 * @param {object} pools
 * @param {string} grade
 * @param {string} topic
 */
function countEnglishTopicPool(pools, grade, topic) {
  const gNum = parseGradeNum(grade);
  const items = filterEnglishByGrade(englishItemsForMatrixTopic(topic, pools), gNum).filter(
    isEnglishMcqLike
  );
  const fps = new Set();
  let unusable = 0;
  for (const item of items) {
    const raw = normalizeEnglishBankItem(item);
    if (!raw || !isUsableMcq(raw)) {
      unusable += 1;
      continue;
    }
    fps.add(usableFingerprint(raw, "english", { grade, topic, level: "easy" }));
  }
  return { unique: fps.size, unusable, items: items.length };
}

/**
 * @param {string} grade
 * @param {string} topic
 * @param {string} level
 */
function countHebrewStaticCell(grade, topic, level) {
  const gNum = parseGradeNum(grade);
  const poolKey = `G${gNum}_${level.toUpperCase()}_QUESTIONS`;
  const poolObj = HEBREW_LEGACY_QUESTIONS_SNAPSHOT[poolKey];
  const legacy = Array.isArray(poolObj?.[topic]) ? poolObj[topic] : [];
  const rich = filterRichHebrewPool(grade, level, topic);
  const merged = [
    ...legacy,
    ...rich.map(({ grades: _g, gradeBand: _gb, allowedLevels: _al, levels: _l, topic: _t, ...rest }) => rest),
  ];
  const fps = new Set();
  const near = new Set();
  let unusable = 0;
  for (const raw of merged) {
    const preview = finalizeHebrewMcq({ ...raw }, topic, level, grade);
    const q = {
      question: preview.question,
      answers: preview.answers,
      correct: preview.correct,
      topic,
      params: { patternFamily: preview.patternFamily, subtype: preview.subtype },
    };
    if (!isUsableMcq(q)) {
      unusable += 1;
      continue;
    }
    const ctx = { grade, level, topic };
    fps.add(usableFingerprint(q, "hebrew", ctx));
    near.add(getNearDuplicateKeyForSubject(q, "hebrew"));
  }
  return {
    unique: fps.size,
    nearDuplicateGroups: Math.max(0, near.size - fps.size),
    unusable,
    inventorySource: "bank",
    generatorVariantCount: null,
  };
}

/**
 * @param {{ grade: string, subjectCanonical: string, level: string, topic: string }} cell
 */
async function probeGeneratedCell(cell) {
  const fps = new Set();
  const kinds = new Set();
  let errors = 0;
  let unusable = 0;
  let unsupported = false;

  for (let i = 0; i < PROBE_N; i += 1) {
    const gen = await generateForMatrixCell(cell, i);
    if (gen.unsupported) {
      unsupported = true;
      break;
    }
    if (!gen.ok || !gen.raw) {
      errors += 1;
      continue;
    }
    const q = normalizeForInventory(
      gen.raw,
      cell.subjectCanonical,
      cell.topic,
      cell.level,
      cell.grade
    );
    if (!isUsableMcq(gen.raw)) {
      unusable += 1;
      continue;
    }
    const ctx = {
      grade: cell.grade,
      level: cell.level,
      topic: cell.topic,
    };
    const fpSource = gen.raw || q;
    fps.add(usableFingerprint(fpSource, cell.subjectCanonical, ctx));
    const k = q?.params?.kind || q?.params?.patternFamily || q?.params?.subtype;
    if (k) kinds.add(String(k));
  }

  return {
    unique: unsupported ? 0 : fps.size,
    probeErrors: errors,
    unusable,
    unsupported,
    inventorySource: "generated",
    generatorVariantCount: kinds.size,
  };
}

/** @param {string} subject */
function inventorySourceFor(subject) {
  if (subject === "math" || subject === "geometry" || subject === "moledet_geography") {
    return "generated";
  }
  if (subject === "english") return "bank_grade_scoped";
  return "bank";
}

async function buildMatrix() {
  const { SCIENCE_QUESTIONS } = await import(href("data/science-questions.js"));
  const englishPools = await import(href("data/english-questions/grammar-pools.js")).then((g) =>
    import(href("data/english-questions/sentence-pools.js")).then((s) =>
      import(href("data/english-questions/translation-pools.js")).then((t) => ({
        grammar: g.GRAMMAR_POOLS,
        sentences: s.SENTENCE_POOLS,
        translation: t.TRANSLATION_POOLS,
      }))
    )
  );

  /** @type {object[]} */
  const rows = [];

  for (const subject of INVENTORY_SUBJECTS) {
    for (const grade of INVENTORY_GRADES) {
      const topics = curriculumTopicsFor(subject, grade);
      for (const topic of topics) {
        for (const level of INVENTORY_LEVELS) {
          const curriculumStatus = isCurriculumCell(subject, grade, topic) ? "VALID" : "NOT_APPLICABLE";
          const cell = {
            grade,
            subjectCanonical: subject,
            level,
            topic,
          };
          const min = professionalMinimumForLevel(level);
          const sessionTarget = min;

          let countResult = {
            unique: 0,
            inventorySource: inventorySourceFor(subject),
            generatorVariantCount: null,
            probeErrors: 0,
            unusable: 0,
            notes: "",
          };

          if (curriculumStatus === "NOT_APPLICABLE") {
            rows.push({
              subject,
              grade,
              topic,
              level,
              curriculumStatus,
              uniqueUsableQuestionCount: 0,
              professionalMinimumRequired: min,
              topicTotalUniqueCount: 0,
              generatorVariantCount: null,
              sessionTarget,
              status: "NOT_APPLICABLE",
              launchBlocking: false,
              notes: `topic "${topic}" not in ${grade} curriculum`,
              inventorySource: "n/a",
            });
            continue;
          }

          if (subject === "science") {
            countResult = countScienceCell(SCIENCE_QUESTIONS, grade, topic, level);
          } else if (subject === "english") {
            const pool = countEnglishTopicPool(englishPools, grade, topic);
            countResult = {
              unique: pool.unique,
              unusable: pool.unusable,
              inventorySource: "bank_grade_scoped",
              generatorVariantCount: null,
              notes:
                pool.items > 0
                  ? `English MCQ pool is grade-scoped (${pool.items} rows); same inventory applies to easy/medium/hard UI levels`
                  : "no MCQ-shaped english pool rows for grade/topic",
            };
          } else if (subject === "hebrew") {
            countResult = countHebrewStaticCell(grade, topic, level);
            if (countResult.unique === 0) {
              const probe = await probeGeneratedCell(cell);
              if (probe.unique > 0) {
                countResult = {
                  ...probe,
                  notes: "static pools empty; generator probe used",
                };
              }
            } else {
              countResult.notes = countResult.nearDuplicateGroups
                ? `static bank; ~${countResult.nearDuplicateGroups} near-dup template groups vs strict fingerprints`
                : "static bank (legacy + rich)";
            }
          } else {
            countResult = await probeGeneratedCell(cell);
            countResult.notes = `generator probe n=${PROBE_N}; ${countResult.generatorVariantCount ?? 0} variant kinds observed`;
          }

          const row = {
            subject,
            grade,
            topic,
            level,
            curriculumStatus,
            uniqueUsableQuestionCount: countResult.unique,
            professionalMinimumRequired: min,
            topicTotalUniqueCount: 0,
            generatorVariantCount: countResult.generatorVariantCount,
            sessionTarget,
            inventorySource: countResult.inventorySource,
            probeErrors: countResult.probeErrors ?? 0,
            unusableDiscarded: countResult.unusable ?? 0,
            notes: countResult.notes || "",
          };

          const classified = classifyProfessionalCell(row);
          row.status = classified.status;
          row.launchBlocking = classified.launchBlocking;
          row.notes = [row.notes, classified.notes].filter(Boolean).join(" | ");

          rows.push(row);
        }
      }
    }
  }

  const topicKeys = [
    ...new Set(
      rows
        .filter((r) => r.curriculumStatus === "VALID")
        .map((r) => `${r.subject}|${r.grade}|${r.topic}`)
    ),
  ];

  for (const topicKey of topicKeys) {
    const [subject, grade, topic] = topicKey.split("|");
    const topicTotal = sumTopicLevelsConservative(rows, subject, grade, topic);
    const englishNote =
      subject === "english"
        ? "topic total = shared grade pool (not summed across levels)"
        : inventorySourceFor(subject) === "generated"
          ? "topic total = max per-level probe (conservative; levels may overlap)"
          : "topic total = sum of per-level static bank counts";

    for (const row of rows) {
      if (`${row.subject}|${row.grade}|${row.topic}` !== topicKey) continue;
      row.topicTotalUniqueCount = topicTotal;
      if (subject === "english" && !row.notes.includes("shared grade pool")) {
        row.notes += ` | ${englishNote}`;
      }
      const reclass = classifyProfessionalCell(row);
      row.status = reclass.status;
      row.launchBlocking = reclass.launchBlocking;
      if (reclass.notes && !row.notes.includes(reclass.notes)) {
        row.notes += ` | ${reclass.notes}`;
      }
    }
  }

  return rows;
}

/**
 * Conservative topic total: max level count (avoids inflating by summing overlapping generator pools).
 */
function sumTopicLevelsConservative(rows, subject, grade, topic) {
  const byLevel = rows.filter(
    (r) =>
      r.subject === subject &&
      r.grade === grade &&
      r.topic === topic &&
      r.curriculumStatus === "VALID"
  );
  const counts = byLevel.map((r) => r.uniqueUsableQuestionCount);
  const max = Math.max(...counts, 0);
  const sum = counts.reduce((a, b) => a + b, 0);
  if (subject === "english") return max;
  const src = byLevel[0]?.inventorySource;
  if (src === "generated") return max;
  return sum;
}

/**
 * Sum of per-cell counts (NOT global dedupe — generated pools overlap across topics/levels).
 */
function aggregateCellSumBy(rows, keyFn) {
  /** @type {Map<string, number>} */
  const m = new Map();
  for (const r of rows) {
    if (r.curriculumStatus !== "VALID") continue;
    const k = keyFn(r);
    m.set(k, (m.get(k) || 0) + r.uniqueUsableQuestionCount);
  }
  return Object.fromEntries([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function weakestCells(rows, n = 30) {
  return rows
    .filter((r) => r.curriculumStatus === "VALID")
    .map((r) => ({
      subject: r.subject,
      grade: r.grade,
      topic: r.topic,
      level: r.level,
      count: r.uniqueUsableQuestionCount,
      minimum: r.professionalMinimumRequired,
      gap: r.professionalMinimumRequired - r.uniqueUsableQuestionCount,
      status: r.status,
      core: isCoreCell(r.subject, r.grade, r.topic),
      notes: r.notes,
    }))
    .sort((a, b) => b.gap - a.gap || a.count - b.count)
    .slice(0, n);
}

/**
 * Cells that passed old technical probe (≥3 samples / OK) but fail professional bar.
 */
function oldPassNewFail(rows) {
  return rows
    .filter((r) => r.curriculumStatus === "VALID")
    .filter((r) => r.uniqueUsableQuestionCount >= 3 && r.status !== "PROFESSIONAL_READY")
    .map((r) => ({
      subject: r.subject,
      grade: r.grade,
      topic: r.topic,
      level: r.level,
      count: r.uniqueUsableQuestionCount,
      status: r.status,
      oldWouldBe: r.uniqueUsableQuestionCount >= 3 ? "OK/THIN (technical probe)" : "CRITICAL",
    }));
}

function rowsToCsv(rows) {
  const headers = [
    "subject",
    "grade",
    "topic",
    "level",
    "curriculumStatus",
    "uniqueUsableQuestionCount",
    "professionalMinimumRequired",
    "topicTotalUniqueCount",
    "generatorVariantCount",
    "sessionTarget",
    "status",
    "launchBlocking",
    "inventorySource",
    "notes",
  ];
  const esc = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function buildMarkdown(report) {
  const {
    decision,
    statusCounts: counts,
    activeSelectableCells,
    weakest,
    coreNeedsAuthoring: coreNeeds,
  } = report;
  return `# Question inventory matrix (professional)

Generated: ${report.generatedAt}

## Final decision

**${decision}**

${report.decisionReasons.map((r) => `- ${r}`).join("\n")}

## Status counts (all matrix rows)

| Status | Count |
|--------|------:|
| PROFESSIONAL_READY | ${counts.PROFESSIONAL_READY} |
| LAUNCH_ACCEPTABLE_THIN | ${counts.LAUNCH_ACCEPTABLE_THIN} |
| NEEDS_AUTHORING_BEFORE_LAUNCH | ${counts.NEEDS_AUTHORING_BEFORE_LAUNCH} |
| CRITICAL_BLOCKING | ${counts.CRITICAL_BLOCKING} |
| NOT_APPLICABLE | ${counts.NOT_APPLICABLE} |

**Active selectable cells (VALID curriculum):** ${activeSelectableCells}

## Per-cell count sums by subject (not globally deduped)

${Object.entries(report.bySubjectCellSum || {})
  .map(([s, n]) => `- **${s}**: ${n}`)
  .join("\n")}

_${report.totalsNote || ""}_

## Per-cell count sums by grade (not globally deduped)

${Object.entries(report.byGradeCellSum || {})
  .map(([g, n]) => `- **${g}**: ${n}`)
  .join("\n")}

## Top 30 weakest active cells

| Subject | Grade | Topic | Level | Count | Min | Status |
|---------|-------|-------|-------|------:|----:|--------|
${weakest
  .map(
    (w) =>
      `| ${w.subject} | ${w.grade} | ${w.topic} | ${w.level} | ${w.count} | ${w.minimum} | ${w.status} |`
  )
  .join("\n")}

## Core topics needing authoring before launch

${coreNeeds.length ? coreNeeds.map((c) => `- **${c.subject} ${c.grade} ${c.topic} ${c.level}**: ${c.count}/${c.minimum} — ${c.notes}`).join("\n") : "_None marked core+NEEDS_AUTHORING (check NEEDS on non-core separately)._"}

## Passed old technical QA, fail professional threshold

${report.oldPassNewFail.length} cells with ≥3 usable but not PROFESSIONAL_READY (see JSON \`oldPassNewFail\`).

## Thresholds (not lowered)

- Authored banks per level: easy ≥50, medium ≥40, hard ≥30
- Topic total (active levels): ≥${PRO_TOPIC_MIN}
- Generated Math/Geometry/Moledet: ≥${100} unique variants per cell (ideal ${150}), probe n=${PROBE_N}

## Files

- \`QUESTION_INVENTORY_MATRIX.json\`
- \`QUESTION_INVENTORY_MATRIX.csv\`
`;
}

async function main() {
  console.log(`Building professional inventory matrix (probe n=${PROBE_N})…`);
  const rows = await buildMatrix();
  const launch = decideLaunchFromMatrix(rows);

  const report = {
    generatedAt: new Date().toISOString(),
    probeSamplesPerGeneratedCell: PROBE_N,
    decision: launch.decision,
    decisionReasons: launch.reasons,
    activeSelectableCells: launch.activeSelectableCells,
    statusCounts: launch.counts,
    thinCells: launch.thinCells,
    coreNeedsAuthoring: launch.coreNeedsAuthoring,
    bySubjectCellSum: aggregateCellSumBy(rows, (r) => r.subject),
    byGradeCellSum: aggregateCellSumBy(rows, (r) => r.grade),
    totalsNote:
      "bySubjectCellSum / byGradeCellSum add per-matrix-row counts; they are NOT globally deduplicated unique inventory (especially math/geometry generators).",
    weakest: weakestCells(rows, 30),
    oldPassNewFail: oldPassNewFail(rows),
    rows,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, "QUESTION_INVENTORY_MATRIX.json");
  const csvPath = join(OUT_DIR, "QUESTION_INVENTORY_MATRIX.csv");
  const mdPath = join(OUT_DIR, "QUESTION_INVENTORY_MATRIX.md");

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(csvPath, rowsToCsv(rows), "utf8");
  await writeFile(mdPath, buildMarkdown(report), "utf8");

  console.log(`Wrote ${mdPath}`);
  console.log(`Decision: ${report.decision}`);
  console.log(`Active cells: ${report.activeSelectableCells}`);
  console.log("Status counts:", report.statusCounts);
  return report;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
