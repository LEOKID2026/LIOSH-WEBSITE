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
const { finalizeHebrewMcq, HEBREW_LEGACY_QUESTIONS_SNAPSHOT } = await import(
  href("utils/hebrew-question-generator.js")
);
const { hebrewQuestionFingerprint } = await import(href("utils/hebrew-learning-intel.js"));
const {
  G3_READING_EASY,
  G3_READING_MEDIUM,
  G3_READING_HARD,
} = await import(href("data/hebrew-g3-reading-bank.js"));
const { curriculumTopicsFor, classifyInventoryCell, isCurriculumCell } = await import(
  "./lib/qa-curriculum-matrix.mjs"
);
const { SCIENCE_G3_BODY_BANK } = await import(href("data/science-questions-g3-body-bank.js"));

const INVENTORY_MIN = {
  "hebrew|g3|reading|easy": 20,
  "hebrew|g3|reading|medium": 15,
  "hebrew|g3|reading|hard": 10,
};

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
  hebrewG3ReadingLive: null,
  thinInventoryReport: [],
  scienceNearDuplicateTop20: [],
  scienceG3BodyInventory: null,
  inventoryStatusCounts: { OK: 0, THIN: 0, CRITICAL: 0, NOT_APPLICABLE: 0 },
  nearDuplicateBreakdown: null,
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
  for (const subject of SUPPORTED_SUBJECTS) {
    for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
      const topics = curriculumTopicsFor(subject, grade);
      for (const level of ["easy", "medium", "hard"]) {
        for (const topic of topics) {
          let cellCount = 0;
          for (let i = 0; i < SAMPLES; i++) {
            const gen = await generateForMatrixCell(
              { grade, subjectCanonical: subject, level, topic },
              i
            );
            if (gen.unsupported || !gen.ok || !gen.raw) continue;
            cellCount += 1;
            auditQuestion(gen.raw, { subject, grade, level, topic, sample: i });
          }
          const inv = classifyInventoryCell(subject, grade, topic, cellCount);
          summary.inventoryStatusCounts[inv.status] =
            (summary.inventoryStatusCounts[inv.status] || 0) + 1;
          summary.thinInventoryReport.push({
            subject,
            grade,
            level,
            topic,
            samples: cellCount,
            status: inv.status,
            reason: inv.reason,
            inCurriculum: isCurriculumCell(subject, grade, topic),
          });
          if (inv.status === "THIN" || inv.status === "CRITICAL") {
            summary.thinInventoryCells.push({
              subject,
              grade,
              level,
              topic,
              samples: cellCount,
              status: inv.status,
            });
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
  auditScienceG3Body(SCIENCE_QUESTIONS);
  return SCIENCE_QUESTIONS;
}

function auditHebrewReadingPool(levels, label) {
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
  const report = {
    source: label,
    total: all.length,
    byLevel: Object.fromEntries(levels.map(([lv, p]) => [lv, (p || []).length])),
    uniqueFingerprints: fpMap.size,
    duplicateFingerprintGroups: dupStems.length,
    duplicateExamples: dupStems.slice(0, 12).map(([fp, c]) => ({ fp, count: c })),
    mcqFailureCount: all.reduce((n, r) => n + r.mcq.failures.length, 0),
    mcqWarningCount: all.reduce((n, r) => n + r.mcq.warnings.length, 0),
    lengthBiasWarnings: all.filter((r) =>
      r.mcq.warnings.some((w) => w.code === "correct_answer_length_bias")
    ).length,
    genericDistractorWarnings: all.filter((r) =>
      r.mcq.warnings.some((w) => w.code === "generic_reading_distractors")
    ).length,
  };

  for (const [level] of levels) {
    const key = `hebrew|g3|reading|${level}`;
    const count = report.byLevel[level] || 0;
    const required = INVENTORY_MIN[key] || 10;
    const uniqueAtLevel = new Set(
      all.filter((r) => r.level === level).map((r) => r.fp)
    ).size;
    summary.thinInventoryReport.push({
      subject: "hebrew",
      grade: "g3",
      topic: "reading",
      level,
      source: label,
      itemCount: count,
      uniqueFingerprints: uniqueAtLevel,
      requiredMinimum: required,
      status:
        uniqueAtLevel >= required
          ? "OK"
          : uniqueAtLevel >= Math.floor(required * 0.6)
            ? "THIN"
            : "CRITICAL",
    });
  }

  return report;
}

function auditHebrewG3Reading() {
  const bankLevels = [
    ["easy", G3_READING_EASY],
    ["medium", G3_READING_MEDIUM],
    ["hard", G3_READING_HARD],
  ];
  summary.hebrewG3Reading = auditHebrewReadingPool(bankLevels, "canonical_bank");

  const liveLevels = [
    ["easy", HEBREW_LEGACY_QUESTIONS_SNAPSHOT.G3_EASY_QUESTIONS?.reading],
    ["medium", HEBREW_LEGACY_QUESTIONS_SNAPSHOT.G3_MEDIUM_QUESTIONS?.reading],
    ["hard", HEBREW_LEGACY_QUESTIONS_SNAPSHOT.G3_HARD_QUESTIONS?.reading],
  ];
  summary.hebrewG3ReadingLive = auditHebrewReadingPool(liveLevels, "live_generator");
}

function classifyNearDuplicate(sample) {
  const subj = sample?.subject || "";
  const topic = sample?.topic || "";
  const stem = String(sample?.stem || "");
  if (/מה התנהגות מתאימה|מתמקדים ב־/.test(stem)) {
    return "meta_template_duplicate";
  }
  if (subj === "math" || subj === "geometry") {
    if (/equations|order_of|addition|multiplication|area|perimeter|angles/i.test(topic + stem)) {
      return "procedural_variant";
    }
  }
  if (/no_questions|empty_pool/i.test(stem)) return "ignore";
  if (subj === "science") return "content_quality";
  return "content_quality";
}

function auditScienceG3Body(scienceQuestions) {
  const LEVEL_RANK = { easy: 0, medium: 1, hard: 2 };
  let metaCount = 0;
  for (const row of SCIENCE_G3_BODY_BANK) {
    if (/מה התנהגות|מתמקדים/.test(row.stem)) metaCount += 1;
  }
  const pool = scienceQuestions.filter((q) => {
    if (q.topic !== "body") return false;
    if (!q.grades?.includes("g3")) return false;
    const lo = LEVEL_RANK[q.minLevel || "easy"] ?? 0;
    const hi = LEVEL_RANK[q.maxLevel || "hard"] ?? 2;
    return 0 >= lo && 0 <= hi;
  });
  const poolFps = new Set(pool.map((q) => `science|id:${q.id}`));
  summary.scienceG3BodyInventory = {
    bankItems: SCIENCE_G3_BODY_BANK.length,
    livePoolItems: pool.length,
    uniqueFingerprints: poolFps.size,
    metaStemInBank: metaCount,
    requiredMinimum: 40,
    status: poolFps.size >= 40 ? "OK" : poolFps.size >= 24 ? "THIN" : "CRITICAL",
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

  const nearWorst = nearDups
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([k, v]) => ({
      nearKey: k.replace(/^near\|/, "").slice(0, 100),
      count: v.count,
      classification: classifyNearDuplicate(v.sample),
      sample: v.sample,
    }));

  const allNearClassified = nearDups.map(([k, v]) => ({
    classification: classifyNearDuplicate(v.sample),
    count: v.count,
  }));
  const proceduralAll = allNearClassified.filter((x) => x.classification === "procedural_variant").length;
  const contentAll = allNearClassified.filter((x) => x.classification === "content_quality").length;
  const metaAll = allNearClassified.filter((x) => x.classification === "meta_template_duplicate").length;
  const ignoreAll = allNearClassified.filter((x) => x.classification === "ignore").length;

  const scienceNear = nearDups
    .filter(([, v]) => v.sample?.subject === "science")
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([k, v]) => ({
      nearKey: k.replace(/^near\|/, "").slice(0, 120),
      count: v.count,
      classification: classifyNearDuplicate(v.sample),
      topic: v.sample?.topic,
      grade: v.sample?.grade,
    }));
  summary.scienceNearDuplicateTop20 = scienceNear;
  const procedural = nearWorst.filter((w) => w.classification === "procedural_variant");
  const contentProblems = nearWorst.filter((w) => w.classification === "content_quality");

  summary.nearDuplicateBreakdown = {
    totalNearDuplicateGroups: nearDups.length,
    allGroupsProceduralVariants: proceduralAll,
    allGroupsContentQuality: contentAll,
    allGroupsMetaTemplateDuplicates: metaAll,
    allGroupsIgnored: ignoreAll,
    scienceNearDuplicateTop20: scienceNear,
    top20ProceduralVariants: procedural.length,
    top20ContentQualityProblems: contentProblems.length,
    top20WorstNearDuplicates: nearWorst,
    note:
      "Procedural variants (math/geometry numeric templates) are often acceptable; content_quality groups need authored review.",
  };
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

## Hebrew grade 3 reading (canonical bank)
- Total: **${h?.total ?? 0}** (easy ${h?.byLevel?.easy ?? 0}, medium ${h?.byLevel?.medium ?? 0}, hard ${h?.byLevel?.hard ?? 0})
- Unique fingerprints: **${h?.uniqueFingerprints ?? 0}**
- Duplicate fingerprint groups: **${h?.duplicateFingerprintGroups ?? 0}** (must be 0)
- MCQ failures: **${h?.mcqFailureCount ?? 0}**

## Hebrew g3 reading thin inventory
${summary.thinInventoryReport
  .filter((r) => r.topic === "reading")
  .map(
    (r) =>
      `- ${r.source} ${r.level}: ${r.uniqueFingerprints}/${r.requiredMinimum} unique → **${r.status}**`
  )
  .join("\n")}

## Near-duplicate breakdown (top 20 sample)
- Near-dup groups total: **${summary.nearDuplicateBreakdown?.totalNearDuplicateGroups ?? 0}**
- Top-20 procedural (acceptable): **${summary.nearDuplicateBreakdown?.top20ProceduralVariants ?? 0}**
- Top-20 content-quality: **${summary.nearDuplicateBreakdown?.top20ContentQualityProblems ?? 0}**

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
  await writeFile(
    join(OUT_DIR, "thin-inventory.json"),
    JSON.stringify(
      {
        generatedAt: summary.generatedAt,
        hebrewG3Reading: summary.thinInventoryReport.filter((r) => r.topic === "reading"),
        thinGeneratorCells: summary.thinInventoryCells,
      },
      null,
      2
    ),
    "utf8"
  );

  const failBudget = Number(process.env.QA_QUALITY_FAIL_THRESHOLD || 25);
  const hebrewBank = summary.hebrewG3Reading;
  const criticalHebrew = summary.thinInventoryReport.filter(
    (r) => r.topic === "reading" && r.status === "CRITICAL"
  );
  const criticalCells = summary.thinInventoryReport.filter((r) => r.status === "CRITICAL");
  const scienceBody = summary.scienceG3BodyInventory;
  const hebrewDupes = hebrewBank?.duplicateFingerprintGroups ?? 0;
  const hebrewMcqFail = hebrewBank?.mcqFailureCount ?? 0;

  if (summary.mcqFailures > failBudget) {
    console.error(`FAIL: ${summary.mcqFailures} MCQ hard failures (budget ${failBudget})`);
    process.exit(1);
  }
  if (hebrewDupes > 0) {
    console.error(`FAIL: Hebrew g3 reading bank has ${hebrewDupes} duplicate fingerprint groups`);
    process.exit(1);
  }
  if (hebrewMcqFail > 0) {
    console.error(`FAIL: Hebrew g3 reading bank has ${hebrewMcqFail} MCQ failures`);
    process.exit(1);
  }
  if (criticalHebrew.length > 0) {
    console.error(`FAIL: Hebrew g3 reading CRITICAL thin cells: ${criticalHebrew.length}`);
    process.exit(1);
  }
  if (scienceBody?.status === "CRITICAL") {
    console.error(
      `FAIL: science g3 body pool ${scienceBody.uniqueFingerprints}/${scienceBody.requiredMinimum}`
    );
    process.exit(1);
  }
  if (criticalCells.length > 0) {
    console.error(`FAIL: ${criticalCells.length} CRITICAL curriculum cells (see thin inventory)`);
    for (const c of criticalCells.slice(0, 8)) {
      console.error(`  ${c.subject} ${c.grade} ${c.topic} ${c.level}: ${c.reason}`);
    }
    process.exit(1);
  }
  const metaTemplateGroups =
    summary.nearDuplicateBreakdown?.allGroupsMetaTemplateDuplicates ?? 0;
  if (metaTemplateGroups > 0) {
    console.error(`FAIL: ${metaTemplateGroups} science meta-template near-duplicate groups remain`);
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
