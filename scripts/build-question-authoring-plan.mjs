#!/usr/bin/env node
/**
 * Phase 2 — professional authoring plan from inventory matrix (planning only).
 * npm run qa:question-authoring-plan
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRO_LEVEL_MIN,
  PRO_TOPIC_MIN,
  PRO_TOPIC_IDEAL,
  PRO_GENERATED_MIN,
  PRO_GENERATED_IDEAL,
  isCoreCell,
  professionalMinimumForLevel,
} from "./lib/qa-inventory-professional.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "reports", "question-audit");

const SUBJECT_IMPACT = {
  hebrew: 100,
  english: 95,
  science: 90,
  math: 85,
  geometry: 80,
  moledet_geography: 70,
};

const GRADE_IMPACT = { g1: 100, g2: 95, g3: 90, g4: 75, g5: 65, g6: 55 };

function gradeNum(g) {
  return parseInt(String(g).replace(/\D/g, ""), 10) || 3;
}

function cellKey(r) {
  return `${r.subject}|${r.grade}|${r.topic}|${r.level}`;
}

function topicKey(r) {
  return `${r.subject}|${r.grade}|${r.topic}`;
}

function shortageLevel(row) {
  const min = row.professionalMinimumRequired ?? professionalMinimumForLevel(row.level);
  const count = row.uniqueUsableQuestionCount ?? 0;
  return Math.max(0, min - count);
}

function shortageTopic(row, topicTotals) {
  const tk = topicKey(row);
  const total = topicTotals.get(tk) ?? row.topicTotalUniqueCount ?? 0;
  return Math.max(0, PRO_TOPIC_MIN - total);
}

function whyCore(subject, grade, topic) {
  const key = `${subject}|${grade}|${topic}`;
  const reasons = [];
  if (
    [
      "hebrew|g3|reading",
      "science|g3|body",
      "science|g3|animals",
      "science|g4|body",
      "math|g1|addition",
      "math|g2|addition",
      "math|g3|multiplication",
      "math|g3|order_of_operations",
      "math|g4|fractions",
      "english|g3|grammar",
      "english|g2|grammar",
      "geometry|g3|area",
      "geometry|g4|perimeter",
      "moledet_geography|g3|homeland",
      "moledet_geography|g4|community",
    ].includes(key)
  ) {
    reasons.push("explicit launch-critical topic key");
  }
  if (["g1", "g2", "g3"].includes(grade) && ["reading", "grammar", "addition", "subtraction", "multiplication", "comprehension", "body", "animals"].includes(topic)) {
    reasons.push("early-grade core curriculum topic");
  }
  return reasons.length ? reasons.join("; ") : "core classification rule";
}

function needsGeneratorImprovement(row) {
  return row.inventorySource === "generated";
}

function needsAuthoredItems(row) {
  return row.inventorySource === "bank" || row.inventorySource === "bank_grade_scoped";
}

function recommendAction(row, topicTotals) {
  const src = row.inventorySource || "unknown";
  const core = isCoreCell(row.subject, row.grade, row.topic);
  const levelShort = shortageLevel(row);
  const topicShort = shortageTopic(row, topicTotals);

  if (src === "generated") {
    const gap = Math.max(0, PRO_GENERATED_MIN - (row.uniqueUsableQuestionCount ?? 0));
    if (gap > 0) return "IMPROVE_GENERATOR_VARIETY";
    return "POST_LAUNCH_BACKLOG";
  }

  if (src === "bank_grade_scoped") {
    if (topicShort > 0) return "AUTHOR_MORE_ITEMS";
    if (levelShort > 0 && (row.topicTotalUniqueCount ?? 0) >= PRO_TOPIC_MIN) {
      return "SPLIT_SHARED_POOL_BY_LEVEL";
    }
    return "AUTHOR_MORE_ITEMS";
  }

  if (src === "bank") {
    if (levelShort > 0 || topicShort > 0) return "AUTHOR_MORE_ITEMS";
    return "REVIEW_CURRICULUM_SCOPE";
  }

  if (!core && levelShort > 0 && (row.uniqueUsableQuestionCount ?? 0) >= Math.ceil((row.professionalMinimumRequired ?? 50) * 0.35)) {
    return "POST_LAUNCH_BACKLOG";
  }

  return "AUTHOR_MORE_ITEMS";
}

function priorityScore(row, topicTotals) {
  const core = isCoreCell(row.subject, row.grade, row.topic);
  const levelShort = shortageLevel(row);
  const topicShort = shortageTopic(row, topicTotals);
  const genGap =
    row.inventorySource === "generated"
      ? Math.max(0, PRO_GENERATED_MIN - (row.uniqueUsableQuestionCount ?? 0))
      : 0;

  let score = 0;
  if (core) score += 500;
  if (row.launchBlocking) score += 200;
  score += SUBJECT_IMPACT[row.subject] ?? 50;
  score += GRADE_IMPACT[row.grade] ?? 50;
  score += levelShort * 3;
  score += topicShort * 2;
  score += genGap * 2;

  if (row.subject === "hebrew" && row.topic === "reading") score += 80;
  if (row.subject === "english") score += 40;
  if (row.subject === "science") score += 35;

  return Math.round(score);
}

function authoredItemsNeeded(row, topicTotals, action) {
  const levelShort = shortageLevel(row);
  const topicShort = shortageTopic(row, topicTotals);

  if (action === "IMPROVE_GENERATOR_VARIETY") {
    return {
      newAuthoredItems: 0,
      generatorVariantsNeeded: Math.max(0, PRO_GENERATED_MIN - (row.uniqueUsableQuestionCount ?? 0)),
      generatorTarget: PRO_GENERATED_MIN,
    };
  }

  if (action === "SPLIT_SHARED_POOL_BY_LEVEL") {
    return {
      newAuthoredItems: levelShort,
      generatorVariantsNeeded: 0,
      note: "English pool is grade-scoped; split or tag items by difficulty tier",
    };
  }

  if (action === "POST_LAUNCH_BACKLOG" || action === "REVIEW_CURRICULUM_SCOPE") {
    return { newAuthoredItems: 0, generatorVariantsNeeded: 0 };
  }

  const tk = topicKey(row);
  const topicRows = [...topicTotals.entries()].filter(([k]) => k === tk);
  const topicShortVal = topicShort;

  return {
    newAuthoredItems: Math.max(levelShort, topicShortVal > 0 && levelShort === 0 ? Math.ceil(topicShortVal / 3) : levelShort),
    levelShortage: levelShort,
    topicShortage: topicShortVal,
    generatorVariantsNeeded: 0,
  };
}

function recommendVisibility(row, action) {
  const core = isCoreCell(row.subject, row.grade, row.topic);
  const count = row.uniqueUsableQuestionCount ?? 0;
  const min = row.professionalMinimumRequired ?? 50;

  if (core) return { visibility: "keep_active", launchBlocking: true };

  if (action === "POST_LAUNCH_BACKLOG") {
    return { visibility: "post_launch_backlog", launchBlocking: false };
  }

  if (count >= Math.ceil(min * 0.5) && !core) {
    return { visibility: "keep_active_mark_thin", launchBlocking: false };
  }

  if (count < 5 && !core && ["speaking", "writing", "translation"].includes(row.topic)) {
    return { visibility: "hide_before_launch", launchBlocking: false };
  }

  if (count < 10 && !core && gradeNum(row.grade) >= 5) {
    return { visibility: "hide_before_launch", launchBlocking: false };
  }

  return { visibility: "keep_active", launchBlocking: false };
}

function assignBatch(row, action, visibility) {
  const core = isCoreCell(row.subject, row.grade, row.topic);
  const g = gradeNum(row.grade);

  if (visibility.visibility === "hide_before_launch" || visibility.visibility === "post_launch_backlog") {
    return "Batch 3 — non-core enrichment / post-launch polish";
  }

  const batch1English =
    row.subject === "english" &&
    g <= 4 &&
    (action === "AUTHOR_MORE_ITEMS" || action === "SPLIT_SHARED_POOL_BY_LEVEL");

  const batch1HebrewScience = (row.subject === "hebrew" || row.subject === "science") && core;

  const batch1MathGeo =
    core &&
    (row.subject === "math" || row.subject === "geometry") &&
    action === "IMPROVE_GENERATOR_VARIETY";

  if (batch1English || batch1HebrewScience || batch1MathGeo) {
    return "Batch 1 — launch blockers by user impact";
  }

  if (core) {
    return "Batch 2 — remaining core cells";
  }

  if (g <= 4 && (row.subject === "hebrew" || row.subject === "english" || row.subject === "science")) {
    return "Batch 2 — remaining core cells";
  }

  return "Batch 3 — non-core enrichment / post-launch polish";
}

function countingIssueNote(row) {
  if (row.inventorySource !== "generated") return null;
  const c = row.uniqueUsableQuestionCount ?? 0;
  if (c >= 80 && c < PRO_GENERATED_MIN) {
    return "Likely real variety gap (80–99 uniques); fingerprint probe is credible, not a counting artifact.";
  }
  if (c < 20) {
    return "Severe variety gap; verify generator branches fire for this topic/level before large authoring.";
  }
  return "Probe-based unique count (800 samples); treat as procedural variety unless manual session proves repetition.";
}

async function main() {
  const matrix = JSON.parse(await readFile(join(OUT, "QUESTION_INVENTORY_MATRIX.json"), "utf8"));
  let readiness = null;
  try {
    readiness = JSON.parse(await readFile(join(OUT, "QUESTION_RELEASE_READINESS.json"), "utf8"));
  } catch {
    readiness = null;
  }

  const rows = matrix.rows || [];
  const needs = rows.filter((r) => r.status === "NEEDS_AUTHORING_BEFORE_LAUNCH");

  const topicTotals = new Map();
  for (const r of rows) {
    if (r.curriculumStatus !== "VALID") continue;
    const tk = topicKey(r);
    const prev = topicTotals.get(tk) ?? 0;
    topicTotals.set(tk, Math.max(prev, r.topicTotalUniqueCount ?? 0));
  }

  const planCells = needs.map((row) => {
    const min = row.professionalMinimumRequired ?? professionalMinimumForLevel(row.level);
    const core = isCoreCell(row.subject, row.grade, row.topic);
    const action = recommendAction(row, topicTotals);
    const targets = authoredItemsNeeded(row, topicTotals, action);
    const visibility = recommendVisibility(row, action);
    const batch = assignBatch(row, action, visibility);

    return {
      subject: row.subject,
      grade: row.grade,
      topic: row.topic,
      level: row.level,
      currentUniqueUsableCount: row.uniqueUsableQuestionCount ?? 0,
      professionalMinimumRequired: min,
      shortageCount: shortageLevel(row),
      topicTotalCount: row.topicTotalUniqueCount ?? 0,
      topicMinimumRequired: PRO_TOPIC_MIN,
      topicShortageCount: shortageTopic(row, topicTotals),
      core,
      launchBlocking: core,
      priorityScore: priorityScore(row, topicTotals),
      inventorySource: row.inventorySource,
      recommendedAction: action,
      batch,
      visibilityRecommendation: visibility.visibility,
      generatorVariantCount: row.generatorVariantCount,
      generatorCurrentUnique: row.inventorySource === "generated" ? row.uniqueUsableQuestionCount : null,
      generatorRequiredUnique: row.inventorySource === "generated" ? PRO_GENERATED_MIN : null,
      generatorIdealUnique: row.inventorySource === "generated" ? PRO_GENERATED_IDEAL : null,
      generatorVariantsNeeded: targets.generatorVariantsNeeded ?? 0,
      newAuthoredItemsEstimate: targets.newAuthoredItems ?? 0,
      countingNote: countingIssueNote(row),
      matrixNotes: row.notes || "",
    };
  });

  planCells.sort((a, b) => b.priorityScore - a.priorityScore);

  const coreCells = planCells.filter((c) => c.core);
  const batch1 = planCells.filter((c) => c.batch.startsWith("Batch 1"));
  const batch2 = planCells.filter((c) => c.batch.startsWith("Batch 2"));
  const batch3 = planCells.filter((c) => c.batch.startsWith("Batch 3"));

  const generatorCells = planCells.filter((c) => c.recommendedAction === "IMPROVE_GENERATOR_VARIETY");

  /** Topic-level deduped authoring gap (avoid triple-counting easy/medium/hard). */
  const topicAuthoringGap = new Map();
  for (const c of planCells) {
    if (c.recommendedAction !== "AUTHOR_MORE_ITEMS" && c.recommendedAction !== "SPLIT_SHARED_POOL_BY_LEVEL") {
      continue;
    }
    const tk = topicKey(c);
    const levelGap = c.shortageCount;
    const topicGap = c.topicShortageCount;
    const prev = topicAuthoringGap.get(tk) || {
      subject: c.subject,
      grade: c.grade,
      topic: c.topic,
      levelGaps: 0,
      topicGap: 0,
    };
    prev.levelGaps += levelGap;
    prev.topicGap = Math.max(prev.topicGap, topicGap);
    topicAuthoringGap.set(tk, prev);
  }

  const bySubjectAuthored = {};
  let totalDedupedAuthored = 0;
  for (const [, t] of topicAuthoringGap) {
    const need = Math.max(t.topicGap, t.levelGaps);
    bySubjectAuthored[t.subject] = (bySubjectAuthored[t.subject] || 0) + need;
    totalDedupedAuthored += need;
  }

  const batch1Authored = batch1.reduce((s, c) => s + c.newAuthoredItemsEstimate, 0);
  const batch1Generator = batch1.filter((c) => c.recommendedAction === "IMPROVE_GENERATOR_VARIETY").length;

  const hideBeforeLaunch = planCells.filter((c) => c.visibilityRecommendation === "hide_before_launch");
  const keepThin = planCells.filter((c) => c.visibilityRecommendation === "keep_active_mark_thin");

  const minWork = {
    description: "Clear all 56 core NEEDS cells to PROFESSIONAL_READY (or documented thin exceptions for non-blocking only).",
    coreCellsRemaining: coreCells.length,
    estimatedNewAuthoredItems: coreCells.reduce((s, c) => s + c.newAuthoredItemsEstimate, 0),
    generatorCellsToImprove: generatorCells.filter((c) => c.core).length,
    englishSplitCells: planCells.filter((c) => c.recommendedAction === "SPLIT_SHARED_POOL_BY_LEVEL").length,
  };

  const fullWork = {
    description: "All 412 NEEDS cells at PROFESSIONAL_READY; no undocumented thin inventory.",
    cellsRemaining: planCells.length,
    estimatedNewAuthoredItems: planCells.reduce((s, c) => s + c.newAuthoredItemsEstimate, 0),
    generatorCellsToImprove: generatorCells.length,
  };

  const hebrewReading = planCells.filter(
    (c) => c.subject === "hebrew" && c.topic === "reading" && c.core
  );

  const plan = {
    generatedAt: new Date().toISOString(),
    basedOn: {
      matrixGeneratedAt: matrix.generatedAt,
      readinessGeneratedAt: readiness?.generatedAt ?? null,
      currentDecision: readiness?.decision ?? matrix.decision,
      thresholds: {
        perLevel: PRO_LEVEL_MIN,
        topicTotal: PRO_TOPIC_MIN,
        topicIdeal: PRO_TOPIC_IDEAL,
        generatedMin: PRO_GENERATED_MIN,
        generatedIdeal: PRO_GENERATED_IDEAL,
      },
    },
    summary: {
      needsAuthoringCells: planCells.length,
      coreNeedsAuthoringCells: coreCells.length,
      batch1Cells: batch1.length,
      batch2Cells: batch2.length,
      batch3Cells: batch3.length,
      totalMissingAuthoredItemsBySubject: bySubjectAuthored,
      totalMissingAuthoredItemsDeduped: totalDedupedAuthored,
      totalMissingAuthoredItemsCellSum: planCells.reduce((s, c) => s + c.newAuthoredItemsEstimate, 0),
      totalGeneratorCellsNeedingImprovement: generatorCells.length,
      batch1NewAuthoredItemsEstimate: batch1Authored,
      batch1NewAuthoredItemsDedupedEstimate: dedupeBatchAuthored(batch1, topicAuthoringGap),
      batch1GeneratorCells: batch1Generator,
      hideBeforeLaunchCount: hideBeforeLaunch.length,
      keepActiveMarkThinCount: keepThin.length,
    },
    launchReadinessRoadmap: {
      minimumWorkToReady: minWork,
      recommendedFullProfessionalWork: fullWork,
      launchCriteriaReminder: [
        "CRITICAL_BLOCKING = 0 (met after Phase 1)",
        "All core topic/level cells PROFESSIONAL_READY or owner-approved exception",
        "Professional matrix is authoritative; technical QA alone is insufficient",
        "No lowered thresholds; no fake variants",
      ],
    },
    batches: {
      batch1: {
        name: "Batch 1 — launch blockers by user impact",
        cells: batch1,
        totals: {
          cells: batch1.length,
          newAuthoredItemsEstimate: batch1Authored,
          generatorCells: batch1Generator,
        },
      },
      batch2: {
        name: "Batch 2 — remaining core cells",
        cells: batch2,
        totals: {
          cells: batch2.length,
          newAuthoredItemsEstimate: batch2.reduce((s, c) => s + c.newAuthoredItemsEstimate, 0),
          generatorCells: batch2.filter((c) => c.recommendedAction === "IMPROVE_GENERATOR_VARIETY").length,
        },
      },
      batch3: {
        name: "Batch 3 — non-core enrichment / post-launch polish",
        cells: batch3,
        totals: {
          cells: batch3.length,
          newAuthoredItemsEstimate: batch3.reduce((s, c) => s + c.newAuthoredItemsEstimate, 0),
          generatorCells: batch3.filter((c) => c.recommendedAction === "IMPROVE_GENERATOR_VARIETY").length,
        },
      },
    },
    coreCellsDetail: coreCells.map((c) => ({
      ...c,
      whyCore: whyCore(c.subject, c.grade, c.topic),
      blocksLaunch: true,
      workType:
        c.recommendedAction === "IMPROVE_GENERATOR_VARIETY"
          ? "generator_improvement"
          : c.recommendedAction === "SPLIT_SHARED_POOL_BY_LEVEL"
            ? "pool_structure"
            : "authored_content",
      missingSummary:
        c.recommendedAction === "IMPROVE_GENERATOR_VARIETY"
          ? `Need ~${c.generatorVariantsNeeded} more unique procedural variants (current ${c.generatorCurrentUnique}, target ${PRO_GENERATED_MIN})`
          : `Need ~${Math.max(c.shortageCount, c.topicShortageCount > 0 ? Math.ceil(c.topicShortageCount / 3) : 0)} authored items (level shortage ${c.shortageCount}, topic shortage ${c.topicShortageCount})`,
    })),
    hebrewReadingPriority: hebrewReading,
    visibilityRecommendations: {
      hideBeforeLaunch,
      keepActiveMarkThin: keepThin,
    },
    allNeedsAuthoringCells: planCells,
  };

  await mkdir(OUT, { recursive: true });

  const csvHeader = [
    "subject",
    "grade",
    "topic",
    "level",
    "currentUniqueUsableCount",
    "professionalMinimumRequired",
    "shortageCount",
    "topicTotalCount",
    "topicShortageCount",
    "core",
    "priorityScore",
    "recommendedAction",
    "batch",
    "visibilityRecommendation",
    "newAuthoredItemsEstimate",
    "generatorVariantsNeeded",
    "inventorySource",
  ];
  const esc = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    csvHeader.join(","),
    ...planCells.map((c) => csvHeader.map((h) => esc(c[h])).join(",")),
  ].join("\n");

  const md = buildMarkdown(plan, readiness);

  await writeFile(join(OUT, "QUESTION_AUTHORING_PLAN.json"), JSON.stringify(plan, null, 2), "utf8");
  await writeFile(join(OUT, "QUESTION_AUTHORING_PLAN.csv"), csv, "utf8");
  await writeFile(join(OUT, "QUESTION_AUTHORING_PLAN.md"), md, "utf8");

  console.log(`Wrote authoring plan: ${planCells.length} NEEDS cells, ${coreCells.length} core`);
  console.log("Batch 1:", batch1.length, "cells,", batch1Authored, "authored items est.");
  console.log("Generator cells needing improvement:", generatorCells.length);
}

function dedupeBatchAuthored(batchCells, topicAuthoringGap) {
  const topics = new Set();
  let sum = 0;
  for (const c of batchCells) {
    const tk = topicKey(c);
    if (topics.has(tk)) continue;
    topics.add(tk);
    const t = topicAuthoringGap.get(tk);
    if (t) sum += Math.max(t.topicGap, t.levelGaps);
    else sum += c.newAuthoredItemsEstimate;
  }
  for (const c of batchCells) {
    if (c.recommendedAction === "IMPROVE_GENERATOR_VARIETY") continue;
    const tk = topicKey(c);
    if (topics.has(tk)) continue;
    sum += c.newAuthoredItemsEstimate;
  }
  return sum;
}

function buildMarkdown(plan, readiness) {
  const s = plan.summary;
  const b1 = plan.batches.batch1.cells.slice(0, 40);

  return `# Question authoring plan (Phase 2)

Generated: ${plan.generatedAt}

Based on \`QUESTION_INVENTORY_MATRIX.json\` (${plan.basedOn.matrixGeneratedAt}) and \`QUESTION_RELEASE_READINESS.json\`.

Current decision: **${plan.basedOn.currentDecision}**

Thresholds (unchanged): easy ≥${plan.basedOn.thresholds.perLevel.easy}, medium ≥${plan.basedOn.thresholds.perLevel.medium}, hard ≥${plan.basedOn.thresholds.perLevel.hard}; topic total ≥${plan.basedOn.thresholds.topicTotal}; generated ≥${plan.basedOn.thresholds.generatedMin} unique variants per cell (ideal ${plan.basedOn.thresholds.generatedIdeal}).

---

## Executive summary

| Metric | Value |
|--------|------:|
| NEEDS_AUTHORING cells | ${s.needsAuthoringCells} |
| Core NEEDS cells (launch-blocking) | ${s.coreNeedsAuthoringCells} |
| Batch 1 cells | ${s.batch1Cells} |
| Batch 1 estimated new authored items (cell sum) | ${s.batch1NewAuthoredItemsEstimate} |
| Batch 1 estimated new authored items (topic-deduped) | ${s.batch1NewAuthoredItemsDedupedEstimate} |
| Total authored gap (topic-deduped) | ${s.totalMissingAuthoredItemsDeduped} |
| Batch 1 generator cells | ${s.batch1GeneratorCells} |
| Total generator cells needing improvement | ${s.totalGeneratorCellsNeedingImprovement} |
| Cells recommended hide-before-launch | ${s.hideBeforeLaunchCount} |

### Missing authored items by subject (estimate, may overlap topic-level work)

${Object.entries(s.totalMissingAuthoredItemsBySubject)
  .sort((a, b) => b[1] - a[1])
  .map(([sub, n]) => `- **${sub}**: ~${n}`)
  .join("\n")}

---

## 1. All NEEDS_AUTHORING cells

Full list: \`QUESTION_AUTHORING_PLAN.csv\` and \`QUESTION_AUTHORING_PLAN.json\` → \`allNeedsAuthoringCells\` (${s.needsAuthoringCells} rows).

---

## 2. Core cells (${s.coreNeedsAuthoringCells})

See JSON → \`coreCellsDetail\`. Each includes why core, work type (authored vs generator), missing counts, and launch-blocking flag.

### Hebrew g3 reading (priority)

${plan.hebrewReadingPriority
  .map(
    (c) =>
      `- **${c.level}**: ${c.currentUniqueUsableCount}/${c.professionalMinimumRequired} (topic total ${c.topicTotalCount}/${PRO_TOPIC_MIN}) → ${c.recommendedAction}, ~${c.newAuthoredItemsEstimate} new passages/items`
  )
  .join("\n")}

---

## 3. Batches

### Batch 1 — launch blockers by user impact (${s.batch1Cells} cells)

${b1.map((c) => `- ${c.subject} ${c.grade} ${c.topic} ${c.level} (score ${c.priorityScore}, +${c.shortageCount} level / topic gap ${c.topicShortageCount}) → **${c.recommendedAction}**`).join("\n")}

${s.batch1Cells > 40 ? `\n_…and ${s.batch1Cells - 40} more in CSV/JSON._\n` : ""}

### Batch 2 — remaining core cells (${s.batch2Cells} cells)

### Batch 3 — non-core / post-launch (${s.batch3Cells} cells)

---

## 4. Authoring targets

- **Authored banks (Hebrew, English, Science, Moledet):** add real MCQ items / distinct reading passages; no wording-only clones.
- **English:** many cells need \`SPLIT_SHARED_POOL_BY_LEVEL\` or new items tagged by difficulty — pool is grade-scoped today.
- **Math/Geometry generated:** improve procedural variety to ≥${PRO_GENERATED_MIN} unique fingerprints per cell; see \`countingNote\` per row in JSON.

---

## 5. Visibility before launch

| Recommendation | Count |
|----------------|------:|
| hide_before_launch | ${s.hideBeforeLaunchCount} |
| keep_active_mark_thin | ${s.keepActiveMarkThinCount} |

Details: JSON → \`visibilityRecommendations\`.

---

## 6. Launch-readiness roadmap

### Minimum work to reach READY_FOR_LAUNCH

- ${plan.launchReadinessRoadmap.minimumWorkToReady.description}
- Core cells to clear: **${plan.launchReadinessRoadmap.minimumWorkToReady.coreCellsRemaining}**
- Estimated new authored items (core): **~${plan.launchReadinessRoadmap.minimumWorkToReady.estimatedNewAuthoredItems}**
- Core generator cells: **${plan.launchReadinessRoadmap.minimumWorkToReady.generatorCellsToImprove}**
- English split-by-level cells: **${plan.launchReadinessRoadmap.minimumWorkToReady.englishSplitCells}**

### Full professional work

- ${plan.launchReadinessRoadmap.recommendedFullProfessionalWork.description}
- All NEEDS cells: **${plan.launchReadinessRoadmap.recommendedFullProfessionalWork.cellsRemaining}**
- Estimated authored items: **~${plan.launchReadinessRoadmap.recommendedFullProfessionalWork.estimatedNewAuthoredItems}**
- Generator cells: **${plan.launchReadinessRoadmap.recommendedFullProfessionalWork.generatorCellsToImprove}**

---

## 7. No content written in this phase

This document is planning only. Approve Batch 1 before authoring/fixing.
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
