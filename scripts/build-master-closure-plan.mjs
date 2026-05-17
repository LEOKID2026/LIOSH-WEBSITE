/**
 * build-master-closure-plan.mjs
 *
 * Phase 2A planning artifact generator.
 * Reads QUESTION_INVENTORY_MATRIX.json + QUESTION_AUTHORING_PLAN.json
 * and produces:
 *   - QUESTION_CELL_WORKPLAN.csv  (one row per non-PROFESSIONAL_READY cell)
 *   - QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json (structured plan)
 *   - QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv  (phase/batch summary)
 *
 * Launch rule: EVERY active selectable cell must reach PROFESSIONAL_READY.
 * - THIN_AS_BLOCKING = true  → LAUNCH_ACCEPTABLE_THIN is treated as launch-blocking
 * - No POST_LAUNCH_BACKLOG   → all active non-PROFESSIONAL_READY cells are BLOCKS_LAUNCH
 * - No owner decisions       → every active topic ships complete
 * - READY_FOR_LAUNCH requires 771/771 PROFESSIONAL_READY, 0 THIN, 0 NEEDS
 *
 * No content changes, no banks, no generators, no UI.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPORT_DIR = join(ROOT, "reports", "question-audit");

// ─── Launch rule constants ────────────────────────────────────────────────────

const THIN_AS_BLOCKING = true; // LAUNCH_ACCEPTABLE_THIN is launch-blocking under new rule
const GENERATED_MIN = 100;     // Every generated cell must reach 100 unique variants

// ─── Load source data ─────────────────────────────────────────────────────────

const matrix = JSON.parse(readFileSync(join(REPORT_DIR, "QUESTION_INVENTORY_MATRIX.json"), "utf8"));
const authoringPlan = JSON.parse(readFileSync(join(REPORT_DIR, "QUESTION_AUTHORING_PLAN.json"), "utf8"));

// ─── Build authoring-cell lookup: (subject|grade|topic|level) → authoring cell ─

const authoringLookup = new Map();
for (const batchKey of ["batch1", "batch2", "batch3"]) {
  const batch = authoringPlan.batches[batchKey];
  if (!batch?.cells) continue;
  for (const cell of batch.cells) {
    const key = `${cell.subject}|${cell.grade}|${cell.topic}|${cell.level}`;
    authoringLookup.set(key, { ...cell, batchKey });
  }
}

// ─── Subtopic map ──────────────────────────────────────────────────────────────

const TOPIC_SUBTOPICS = {
  reading: "main_idea/detail/sequence/inference/vocabulary_in_context/cause_effect/genre_structure",
  comprehension: "main_idea/detail/inference/genre_structure",
  grammar: "verb_conjugation/noun_agreement/sentence_structure/tense",
  vocabulary: "translation/sentence_completion/grammar_in_context",
  writing: "sentence_completion/paragraph_completion",
  speaking: "conversation/pronunciation/oral_response",
  body: "senses/skeleton_muscles/hygiene/nutrition/systems/safety",
  animals: "classification/habitat/diet/lifecycle/adaptations",
  plants: "parts/growth/photosynthesis/lifecycle",
  materials: "properties/states/natural_vs_manufactured/classification",
  earth_space: "seasons/weather/day_night/solar_system/water_cycle",
  environment: "pollution/recycling/ecosystems/conservation",
  experiments: "hypothesis/observation/measurement/conclusion",
  fractions: "recognition/comparison/arithmetic/mixed_numbers/word_problems",
  addition: "single_digit/multi_digit/carrying/word_problems",
  subtraction: "no_regrouping/regrouping/vertical/word_problems/missing_number",
  multiplication: "tables/multi_digit/word_problems/area_model",
  division: "basic/with_remainder/word_problems",
  powers: "squares/cubes/notation/evaluation",
  transformations: "reflection/rotation/translation",
  parallel_perpendicular: "identification/properties/real_world_examples",
  triangles: "classification_by_side/classification_by_angle/properties",
  symmetry: "axis_of_symmetry/symmetric_shapes/number_of_axes",
  tiling: "tessellation_identification/which_tiles",
  rotation: "angle/direction/center_point",
  quadrilaterals: "classification/properties/area_perimeter",
  shapes_basic: "sides/vertices/properties/classification",
  solids: "faces/edges/vertices/classification",
  area: "rectangle/triangle/composite_shapes",
  perimeter: "rectangle/polygon/missing_side/formula",
  volume: "cuboid/formula/units",
  angles: "types/measurement/sum_of_angles",
  circles: "radius/diameter/circumference/area",
  pythagoras: "theorem/missing_side/word_problems",
  homeland: "national_symbols/institutions/landmarks/historical_events",
  community: "roles/services/infrastructure/local_institutions",
  citizenship: "rights/responsibilities/civic_concepts/voting",
  geography: "regions/climate/terrain/map_reading",
  values: "social_values/ethical_scenarios/civic_responsibility",
  maps: "compass/scale/legend/reading_maps",
  sentences: "sentence_completion/grammar_in_context/reading_short_sentence",
  translation: "hebrew_to_english/english_to_hebrew/word_matching",
};

// ─── Risk mapping ──────────────────────────────────────────────────────────────

function getReportMappingRisk(subject, topic) {
  if (subject === "moledet_geography") return "HIGH";
  if (subject === "hebrew" && ["reading", "comprehension"].includes(topic)) return "MEDIUM";
  if (subject === "science") return "MEDIUM";
  if (subject === "english") return "MEDIUM";
  return "LOW";
}

function getEngineMappingRisk(subject, topic) {
  return getReportMappingRisk(subject, topic);
}

// ─── Launch impact ─────────────────────────────────────────────────────────────
// Under the new rule: every active non-PROFESSIONAL_READY cell BLOCKS_LAUNCH.
// THIN cells are treated as blocking (THIN_AS_BLOCKING = true).

function getLaunchImpact() {
  return "BLOCKS_LAUNCH";
}

// ─── Work type ────────────────────────────────────────────────────────────────

function getWorkType(matrixRow) {
  if (matrixRow.inventorySource === "generated") return "IMPROVE_GENERATOR_VARIETY";
  return "AUTHOR_MORE_ITEMS";
}

// ─── Planned phase ────────────────────────────────────────────────────────────
//
// Phase 2B — Core authored: Hebrew g1–g3 (reading/comprehension/grammar),
//             Science g1–g4 (body + g1–g3 animals), English g1–g2 (sentences/vocabulary)
// Phase 2C — Core generator: Math (fractions g2–g4, powers g4),
//             Moledet g3–g4 (all 6 topics)
// Phase 2D — All remaining authored content (no deferrals)
// Phase 2E — All remaining generator improvement (no deferrals)

const PHASE_2B_AUTHORED = new Set([
  // Hebrew g1–g3 core topics
  "hebrew|g1|reading|medium", "hebrew|g1|reading|hard",
  "hebrew|g1|comprehension|easy", "hebrew|g1|comprehension|medium", "hebrew|g1|comprehension|hard",
  "hebrew|g1|grammar|easy", "hebrew|g1|grammar|medium", "hebrew|g1|grammar|hard",
  "hebrew|g2|reading|easy", "hebrew|g2|reading|medium", "hebrew|g2|reading|hard",
  "hebrew|g2|comprehension|easy", "hebrew|g2|comprehension|medium", "hebrew|g2|comprehension|hard",
  "hebrew|g2|grammar|easy", "hebrew|g2|grammar|medium", "hebrew|g2|grammar|hard",
  "hebrew|g3|reading|easy", "hebrew|g3|reading|medium", "hebrew|g3|reading|hard",
  "hebrew|g3|comprehension|easy", "hebrew|g3|comprehension|medium", "hebrew|g3|comprehension|hard",
  "hebrew|g3|grammar|easy", "hebrew|g3|grammar|medium", "hebrew|g3|grammar|hard",
  // Science g1–g4 core topics
  "science|g1|body|easy", "science|g1|body|medium", "science|g1|body|hard",
  "science|g1|animals|easy", "science|g1|animals|medium", "science|g1|animals|hard",
  "science|g2|body|easy", "science|g2|body|medium", "science|g2|body|hard",
  "science|g2|animals|easy", "science|g2|animals|medium", "science|g2|animals|hard",
  "science|g3|body|easy", "science|g3|body|medium", "science|g3|body|hard",
  "science|g3|animals|easy", "science|g3|animals|medium", "science|g3|animals|hard",
  "science|g4|body|easy", "science|g4|body|medium", "science|g4|body|hard",
]);

const PHASE_2C_GENERATOR_SUBJECTS = new Set(["math"]);
const PHASE_2C_MOLEDET_GRADES = new Set(["g3", "g4"]);

function getPlannedPhase(matrixRow) {
  const key = `${matrixRow.subject}|${matrixRow.grade}|${matrixRow.topic}|${matrixRow.level}`;
  const isGenerated = matrixRow.inventorySource === "generated";

  if (isGenerated) {
    // Math generator cells → Phase 2C (highest priority generator work)
    if (PHASE_2C_GENERATOR_SUBJECTS.has(matrixRow.subject)) return "2C";
    // Moledet g3–g4 → Phase 2C (core moledet grades)
    if (matrixRow.subject === "moledet_geography" && PHASE_2C_MOLEDET_GRADES.has(matrixRow.grade)) return "2C";
    // All other generator cells → Phase 2E (remaining generator completion)
    return "2E";
  }

  // Authored cells
  if (PHASE_2B_AUTHORED.has(key)) return "2B";
  // All other authored cells → Phase 2D (remaining authored completion)
  return "2D";
}

// ─── Core status ──────────────────────────────────────────────────────────────
// Core = included in Phase 2B or 2C (highest priority first batch)

function getCoreStatus(matrixRow) {
  const key = `${matrixRow.subject}|${matrixRow.grade}|${matrixRow.topic}|${matrixRow.level}`;
  const phase = getPlannedPhase(matrixRow);
  if (phase === "2B" || phase === "2C") return "CORE";
  // Also check authoring plan core flag as fallback
  const ac = authoringLookup.get(key);
  if (ac?.core === true) return "CORE";
  return "NON_CORE";
}

// ─── Owner review ─────────────────────────────────────────────────────────────

function getOwnerReviewRequired(matrixRow) {
  const phase = getPlannedPhase(matrixRow);
  // Core cells (2B/2C) always require owner review of the authored/improved content
  if (phase === "2B" || phase === "2C") return true;
  return false;
}

// ─── Build QUESTION_CELL_WORKPLAN rows ────────────────────────────────────────

const nonReadyCells = matrix.rows.filter(
  (r) => r.status !== "PROFESSIONAL_READY" && r.status !== "NOT_APPLICABLE"
);

const workplanRows = nonReadyCells.map((row) => {
  const key = `${row.subject}|${row.grade}|${row.topic}|${row.level}`;
  const ac = authoringLookup.get(key) || null;

  const shortage = Math.max(0, (row.professionalMinimumRequired || 0) - row.uniqueUsableQuestionCount);
  const topicTotalTarget = 100;
  const coreStatus = getCoreStatus(row);
  const launchImpact = getLaunchImpact();
  const workType = getWorkType(row);
  const recommendedAction = workType === "IMPROVE_GENERATOR_VARIETY"
    ? "IMPROVE_GENERATOR_VARIETY"
    : "AUTHOR_MORE_ITEMS";
  const estimatedNewItemsNeeded = row.inventorySource !== "generated"
    ? (ac?.newAuthoredItemsEstimate ?? shortage)
    : 0;
  const estimatedGeneratorVariantsNeeded = row.inventorySource === "generated"
    ? Math.max(0, GENERATED_MIN - (row.uniqueUsableQuestionCount || 0))
    : 0;
  const reportMappingRisk = getReportMappingRisk(row.subject, row.topic);
  const engineMappingRisk = getEngineMappingRisk(row.subject, row.topic);
  const plannedPhase = getPlannedPhase(row);
  const plannedBatch = ac
    ? (ac.batchKey === "batch1" ? "Batch1" : ac.batchKey === "batch2" ? "Batch2" : "Batch3")
    : "Batch3";
  const ownerReviewRequired = getOwnerReviewRequired(row);
  const subtopic = TOPIC_SUBTOPICS[row.topic] || "";

  // Build notes — no owner-decision references under new rule
  const noteParts = [];
  if (row.status === "LAUNCH_ACCEPTABLE_THIN") {
    noteParts.push(`Thin under old rule — must reach PROFESSIONAL_READY before launch (THIN_AS_BLOCKING=true)`);
  }
  if (row.inventorySource === "generated" && (row.generatorVariantCount ?? 99) <= 2) {
    noteParts.push("Very low generator variety — structural improvement required");
  }
  if (row.inventorySource === "generated") {
    noteParts.push(`procedural pool ${row.uniqueUsableQuestionCount} unique variants < generated minimum ${GENERATED_MIN} (ideal 150)`);
  } else {
    noteParts.push(`${row.uniqueUsableQuestionCount} usable < professional minimum ${row.professionalMinimumRequired} for ${row.level}`);
  }

  return {
    subject: row.subject,
    grade: row.grade,
    topic: row.topic,
    subtopic_or_skill_if_known: subtopic,
    level: row.level,
    curriculumStatus: row.curriculumStatus || "VALID",
    currentUniqueUsableCount: row.uniqueUsableQuestionCount,
    professionalMinimumRequired: row.professionalMinimumRequired,
    topicTotalCurrent: row.topicTotalUniqueCount,
    topicTotalTarget,
    shortage,
    coreStatus,
    launchImpact,
    workType,
    recommendedAction,
    estimatedNewItemsNeeded,
    estimatedGeneratorVariantsNeeded,
    reportMappingRisk,
    engineMappingRisk,
    priorityScore: ac?.priorityScore ?? 0,
    plannedPhase,
    plannedBatch,
    ownerReviewRequired,
    notes: noteParts.filter(Boolean).join(" | "),
  };
});

// Sort: Phase 2B first, then 2C, 2D, 2E; within phase by priorityScore desc
const phaseOrder = { "2B": 0, "2C": 1, "2D": 2, "2E": 3 };
workplanRows.sort((a, b) => {
  const pa = phaseOrder[a.plannedPhase] ?? 4;
  const pb = phaseOrder[b.plannedPhase] ?? 4;
  if (pa !== pb) return pa - pb;
  return (b.priorityScore || 0) - (a.priorityScore || 0);
});

// ─── Write QUESTION_CELL_WORKPLAN.csv ─────────────────────────────────────────

const CSV_COLS = [
  "subject", "grade", "topic", "subtopic_or_skill_if_known", "level",
  "curriculumStatus", "currentUniqueUsableCount", "professionalMinimumRequired",
  "topicTotalCurrent", "topicTotalTarget", "shortage",
  "coreStatus", "launchImpact", "workType", "recommendedAction",
  "estimatedNewItemsNeeded", "estimatedGeneratorVariantsNeeded",
  "reportMappingRisk", "engineMappingRisk",
  "priorityScore", "plannedPhase", "plannedBatch",
  "ownerReviewRequired", "notes",
];

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const csvLines = [
  CSV_COLS.join(","),
  ...workplanRows.map((r) => CSV_COLS.map((c) => csvEscape(r[c])).join(",")),
];
writeFileSync(join(REPORT_DIR, "QUESTION_CELL_WORKPLAN.csv"), csvLines.join("\n"), "utf8");
console.log(`✓ QUESTION_CELL_WORKPLAN.csv — ${workplanRows.length} rows`);

// ─── Build phase summary data ─────────────────────────────────────────────────

function cellsForPhase(phase) {
  return workplanRows.filter((r) => r.plannedPhase === phase);
}
function sumItems(cells) {
  return cells.reduce((s, r) => s + (Number(r.estimatedNewItemsNeeded) || 0), 0);
}
function sumVariants(cells) {
  return cells.reduce((s, r) => s + (Number(r.estimatedGeneratorVariantsNeeded) || 0), 0);
}

const phase2B = cellsForPhase("2B");
const phase2C = cellsForPhase("2C");
const phase2D = cellsForPhase("2D");
const phase2E = cellsForPhase("2E");

// ─── Build QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json ───────────────────────────

// Total cells that need work (all non-PROFESSIONAL_READY)
const totalCellsNeedingWork = workplanRows.length;
const totalAuthoredCells = workplanRows.filter(r => r.workType === "AUTHOR_MORE_ITEMS").length;
const totalGeneratorCells = workplanRows.filter(r => r.workType === "IMPROVE_GENERATOR_VARIETY").length;
const totalAuthoredShortage = workplanRows.reduce((s, r) => s + (Number(r.estimatedNewItemsNeeded) || 0), 0);
const totalGeneratorShortage = workplanRows.reduce((s, r) => s + (Number(r.estimatedGeneratorVariantsNeeded) || 0), 0);

const masterPlanJson = {
  generatedAt: new Date().toISOString(),
  version: "2.0",
  launchRule: "EVERY_ACTIVE_CELL_MUST_BE_PROFESSIONAL_READY",
  thinAsBlocking: THIN_AS_BLOCKING,
  status: "PHASE_2A_PLANNING",
  currentDecision: matrix.decision,

  meta: {
    activeSelectableCells: matrix.activeSelectableCells ?? 771,
    statusCounts: matrix.statusCounts,
    totalCellsNeedingWork,
    authoredCellsNeedingWork: totalAuthoredCells,
    generatorCellsNeedingWork: totalGeneratorCells,
    totalAuthoredItemsNeeded: totalAuthoredShortage,
    totalGeneratorVariantsNeeded: totalGeneratorShortage,
    openOwnerDecisions: 0,
    workplanRowCount: workplanRows.length,
    readyForLaunchRequires: "771/771 PROFESSIONAL_READY, 0 THIN, 0 NEEDS, 0 CRITICAL",
  },

  inventorySummaryBySubject: (() => {
    const bySubject = {};
    for (const r of matrix.rows) {
      if (!bySubject[r.subject]) {
        bySubject[r.subject] = {
          activeCells: 0, PROFESSIONAL_READY: 0, LAUNCH_ACCEPTABLE_THIN: 0,
          NEEDS_AUTHORING_BEFORE_LAUNCH: 0, generatorCellsNeedingWork: 0,
          authoredCellsNeedingWork: 0, totalCurrentUniqueUsable: 0,
          authoredShortage: 0, generatorShortage: 0,
        };
      }
      const s = bySubject[r.subject];
      s.activeCells++;
      if (r.status === "PROFESSIONAL_READY") {
        s.PROFESSIONAL_READY++;
      } else if (r.status !== "NOT_APPLICABLE") {
        if (r.status === "LAUNCH_ACCEPTABLE_THIN") s.LAUNCH_ACCEPTABLE_THIN++;
        else s.NEEDS_AUTHORING_BEFORE_LAUNCH++;
        if (r.inventorySource === "generated") {
          s.generatorCellsNeedingWork++;
          s.generatorShortage += Math.max(0, GENERATED_MIN - (r.uniqueUsableQuestionCount || 0));
        } else {
          s.authoredCellsNeedingWork++;
          s.authoredShortage += Math.max(0, (r.professionalMinimumRequired || 0) - (r.uniqueUsableQuestionCount || 0));
        }
      }
      s.totalCurrentUniqueUsable += r.uniqueUsableQuestionCount || 0;
    }
    return bySubject;
  })(),

  inventorySummaryByGrade: (() => {
    const byGrade = {};
    for (const r of matrix.rows) {
      if (!byGrade[r.grade]) {
        byGrade[r.grade] = {
          activeCells: 0, PROFESSIONAL_READY: 0, LAUNCH_ACCEPTABLE_THIN: 0,
          NEEDS_AUTHORING_BEFORE_LAUNCH: 0, totalCurrentUniqueUsable: 0,
          authoredShortage: 0, generatorShortage: 0,
        };
      }
      const g = byGrade[r.grade];
      g.activeCells++;
      if (r.status === "PROFESSIONAL_READY") {
        g.PROFESSIONAL_READY++;
      } else if (r.status !== "NOT_APPLICABLE") {
        if (r.status === "LAUNCH_ACCEPTABLE_THIN") g.LAUNCH_ACCEPTABLE_THIN++;
        else g.NEEDS_AUTHORING_BEFORE_LAUNCH++;
        if (r.inventorySource === "generated") {
          g.generatorShortage += Math.max(0, GENERATED_MIN - (r.uniqueUsableQuestionCount || 0));
        } else {
          g.authoredShortage += Math.max(0, (r.professionalMinimumRequired || 0) - (r.uniqueUsableQuestionCount || 0));
        }
      }
      g.totalCurrentUniqueUsable += r.uniqueUsableQuestionCount || 0;
    }
    return byGrade;
  })(),

  phases: [
    {
      phase: "2A",
      name: "Planning and approval",
      goal: "Finalize all planning artifacts under the full-launch rule. No open decisions. No content changes.",
      cellsIncluded: [],
      estimatedNewAuthoredItems: 0,
      estimatedGeneratorVariants: 0,
      filesExpectedToChange: [
        "reports/question-audit/QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.md",
        "reports/question-audit/QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json",
        "reports/question-audit/QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv",
        "reports/question-audit/QUESTION_CELL_WORKPLAN.csv",
        "reports/question-audit/QUESTION_FINAL_DEFINITION_OF_DONE.md",
      ],
      qaCommands: [],
      acceptanceCriteria: [
        "All planning artifacts exist and are complete",
        "QUESTION_CELL_WORKPLAN.csv has 470 rows, all launchImpact=BLOCKS_LAUNCH",
        "QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json openOwnerDecisions=0",
        "QUESTION_FINAL_DEFINITION_OF_DONE.md requires 771/771 PROFESSIONAL_READY",
        "Owner approves this plan document before Phase 2B begins",
      ],
      ownerReviewRequired: true,
    },
    {
      phase: "2B",
      name: "Core authored content — highest priority",
      goal: "Author core Hebrew g1–g3 and Science g1–g4 gaps. These are the original 56 launch-blocking authored cells.",
      cellsIncluded: phase2B.map(r => `${r.subject}/${r.grade}/${r.topic}/${r.level}`),
      cellCount: phase2B.length,
      estimatedNewAuthoredItems: sumItems(phase2B),
      estimatedGeneratorVariants: 0,
      bySubject: (() => {
        const out = {};
        for (const r of phase2B) {
          if (!out[r.subject]) out[r.subject] = { cells: 0, items: 0 };
          out[r.subject].cells++;
          out[r.subject].items += Number(r.estimatedNewItemsNeeded) || 0;
        }
        return out;
      })(),
      filesExpectedToChange: [
        "Hebrew question bank files (g1–g3 reading/comprehension/grammar)",
        "Science question bank files (g1–g4 body/animals)",
      ],
      qaCommands: [
        "npm run qa:question-quality",
        "npm run qa:question-inventory-matrix",
        "npm run qa:question-selector-consistency",
      ],
      acceptanceCriteria: [
        "All 47 Phase 2B cells reach PROFESSIONAL_READY",
        "qa:question-quality exits 0",
        "qa:question-selector-consistency shows 0 ERRORS for Phase 2B cells",
        "Owner review pack for Phase 2B approved",
      ],
      ownerReviewRequired: true,
    },
    {
      phase: "2C",
      name: "Core generator improvement — highest priority",
      goal: "Math fractions/powers and Moledet g3–g4 reach 100 unique variants (PROFESSIONAL_READY).",
      cellsIncluded: phase2C.map(r => `${r.subject}/${r.grade}/${r.topic}/${r.level}`),
      cellCount: phase2C.length,
      estimatedNewAuthoredItems: 0,
      estimatedGeneratorVariants: sumVariants(phase2C),
      bySubject: (() => {
        const out = {};
        for (const r of phase2C) {
          if (!out[r.subject]) out[r.subject] = { cells: 0, variants: 0 };
          out[r.subject].cells++;
          out[r.subject].variants += Number(r.estimatedGeneratorVariantsNeeded) || 0;
        }
        return out;
      })(),
      filesExpectedToChange: [
        "Math question generator (fractions g2–g4, powers g4)",
        "Moledet/geography question generator (all 6 topics g3–g4)",
      ],
      qaCommands: [
        "npm run qa:session-question-variety",
        "npm run qa:question-inventory-matrix",
        "npm run qa:question-selector-consistency",
      ],
      acceptanceCriteria: [
        "All 48 Phase 2C generator cells reach ≥100 unique variants",
        "qa:session-question-variety exits 0 for math and moledet",
        "qa:question-selector-consistency shows 0 ERRORS for Phase 2C cells",
      ],
      ownerReviewRequired: true,
    },
    {
      phase: "2D",
      name: "All remaining authored content — no deferrals",
      goal: "Every remaining authored/bank cell reaches PROFESSIONAL_READY. This includes Hebrew g4–g6, Hebrew speaking/vocabulary/writing g1–g6, all English, all Science non-core.",
      cellsIncluded: phase2D.map(r => `${r.subject}/${r.grade}/${r.topic}/${r.level}`),
      cellCount: phase2D.length,
      estimatedNewAuthoredItems: sumItems(phase2D),
      estimatedGeneratorVariants: 0,
      bySubject: (() => {
        const out = {};
        for (const r of phase2D) {
          if (!out[r.subject]) out[r.subject] = { cells: 0, items: 0 };
          out[r.subject].cells++;
          out[r.subject].items += Number(r.estimatedNewItemsNeeded) || 0;
        }
        return out;
      })(),
      filesExpectedToChange: [
        "Hebrew bank files (g1–g6 speaking/vocabulary/writing; g4–g6 reading/comprehension/grammar)",
        "English bank files (g1–g6 all topics including translation)",
        "Science bank files (all non-core topics g1–g6; g5–g6 body/animals)",
      ],
      qaCommands: [
        "npm run qa:question-quality",
        "npm run qa:question-inventory-matrix",
        "npm run qa:question-selector-consistency",
        "npm run qa:session-question-variety",
      ],
      acceptanceCriteria: [
        "All 240 Phase 2D authored cells reach PROFESSIONAL_READY",
        "qa:question-quality exits 0",
        "qa:question-selector-consistency: 0 ERRORS, 0 WARNINGS for authored subjects",
        "Owner review packs for Phase 2D approved",
      ],
      ownerReviewRequired: true,
    },
    {
      phase: "2E",
      name: "All remaining generator improvement — no deferrals",
      goal: "Every remaining generator cell reaches 100 unique variants (PROFESSIONAL_READY). This includes all Geometry and Moledet g1–g2+g5–g6.",
      cellsIncluded: phase2E.map(r => `${r.subject}/${r.grade}/${r.topic}/${r.level}`),
      cellCount: phase2E.length,
      estimatedNewAuthoredItems: 0,
      estimatedGeneratorVariants: sumVariants(phase2E),
      bySubject: (() => {
        const out = {};
        for (const r of phase2E) {
          if (!out[r.subject]) out[r.subject] = { cells: 0, variants: 0 };
          out[r.subject].cells++;
          out[r.subject].variants += Number(r.estimatedGeneratorVariantsNeeded) || 0;
        }
        return out;
      })(),
      filesExpectedToChange: [
        "Geometry question generator(s) (all non-READY geometry topics)",
        "Moledet/geography question generator (g1–g2 and g5–g6)",
      ],
      qaCommands: [
        "npm run qa:session-question-variety",
        "npm run qa:question-inventory-matrix",
        "npm run qa:question-selector-consistency",
        "npm run test:e2e:question-display",
      ],
      acceptanceCriteria: [
        "All 135 Phase 2E generator cells reach ≥100 unique variants",
        "Total non-PROFESSIONAL_READY = 0 across all 771 cells",
        "qa:question-selector-consistency --strict exits 0 (0 errors, 0 warnings)",
      ],
      ownerReviewRequired: false,
    },
    {
      phase: "2F",
      name: "Final QA closure",
      goal: "All gates pass. 771/771 PROFESSIONAL_READY. READY_FOR_LAUNCH confirmed.",
      cellsIncluded: [],
      estimatedNewAuthoredItems: 0,
      estimatedGeneratorVariants: 0,
      filesExpectedToChange: [
        "QUESTION_RELEASE_READINESS.json (final — decision = READY_FOR_LAUNCH)",
        "QUESTION_FINAL_DEFINITION_OF_DONE.md (freeze note appended)",
      ],
      qaCommands: [
        "npm run qa:question-inventory-matrix",
        "npm run qa:question-selector-consistency --strict",
        "npm run qa:question-quality",
        "npm run qa:session-question-variety",
        "npm run test:e2e:question-display",
        "npm run qa:student-question-stem-metadata",
        "npm run qa:parent-report-grade-aware",
        "npm run qa:questions:release",
        "npm run build",
      ],
      acceptanceCriteria: [
        "QUESTION_RELEASE_READINESS.json .decision === 'READY_FOR_LAUNCH'",
        "statusCounts.PROFESSIONAL_READY === 771",
        "statusCounts.LAUNCH_ACCEPTABLE_THIN === 0",
        "statusCounts.NEEDS_AUTHORING_BEFORE_LAUNCH === 0",
        "statusCounts.CRITICAL_BLOCKING === 0",
        "All 9 QA commands exit 0",
        "Owner review packs for Phases 2B and 2D signed",
        "Freeze note appended",
      ],
      ownerReviewRequired: true,
    },
  ],

  openOwnerDecisions: [],

  fullLaunchWork: {
    description: "All 470 non-PROFESSIONAL_READY cells must reach PROFESSIONAL_READY. No hiding. No thin approvals. No post-launch deferrals.",
    totalCellsNeedingWork,
    authoredCellsNeedingWork: totalAuthoredCells,
    generatorCellsNeedingWork: totalGeneratorCells,
    totalNewAuthoredItemsNeeded: totalAuthoredShortage,
    totalGeneratorVariantsNeeded: totalGeneratorShortage,
    breakdown: {
      "Phase 2B (core authored)": { cells: phase2B.length, items: sumItems(phase2B) },
      "Phase 2C (core generator)": { cells: phase2C.length, variants: sumVariants(phase2C) },
      "Phase 2D (remaining authored)": { cells: phase2D.length, items: sumItems(phase2D) },
      "Phase 2E (remaining generator)": { cells: phase2E.length, variants: sumVariants(phase2E) },
    },
  },

  finalGates: [
    "npm run qa:question-inventory-matrix",
    "npm run qa:question-selector-consistency --strict",
    "npm run qa:question-quality",
    "npm run qa:session-question-variety",
    "npm run test:e2e:question-display",
    "npm run qa:student-question-stem-metadata",
    "npm run qa:parent-report-grade-aware",
    "npm run qa:questions:release",
    "npm run build",
  ],
};

writeFileSync(
  join(REPORT_DIR, "QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json"),
  JSON.stringify(masterPlanJson, null, 2),
  "utf8"
);
console.log("✓ QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json");

// ─── Write QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv ────────────────────────────

const planCsvCols = [
  "phase", "phaseName", "subject", "grade", "topic", "level",
  "coreStatus", "launchImpact", "workType",
  "estimatedNewAuthoredItems", "estimatedGeneratorVariants",
  "plannedBatch", "ownerReviewRequired",
];

const planCsvRows = [planCsvCols.join(",")];

planCsvRows.push(["2A", "Planning and approval", "all", "all", "all", "all", "", "N/A", "", 0, 0, "Phase2A", true].join(","));

for (const row of workplanRows) {
  if (!["2B", "2C", "2D", "2E"].includes(row.plannedPhase)) continue;
  const phaseNames = {
    "2B": "Core authored content highest priority",
    "2C": "Core generator improvement highest priority",
    "2D": "All remaining authored content no deferrals",
    "2E": "All remaining generator improvement no deferrals",
  };
  planCsvRows.push([
    row.plannedPhase,
    phaseNames[row.plannedPhase] || "",
    row.subject,
    row.grade,
    row.topic,
    row.level,
    row.coreStatus,
    row.launchImpact,
    row.workType,
    row.estimatedNewItemsNeeded,
    row.estimatedGeneratorVariantsNeeded,
    row.plannedBatch,
    row.ownerReviewRequired,
  ].map(csvEscape).join(","));
}

planCsvRows.push(["2F", "Final QA closure", "all", "all", "all", "all", "", "N/A", "", 0, 0, "Phase2F", true].join(","));

writeFileSync(join(REPORT_DIR, "QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv"), planCsvRows.join("\n"), "utf8");
console.log(`✓ QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv — ${planCsvRows.length - 1} data rows`);

// ─── Print summary ─────────────────────────────────────────────────────────────

console.log("\n=== MASTER CLOSURE PLAN SUMMARY (Full Launch — All Cells PROFESSIONAL_READY) ===");
console.log(`Active cells: ${matrix.activeSelectableCells ?? 771}`);
console.log(`PROFESSIONAL_READY now: ${matrix.statusCounts.PROFESSIONAL_READY}`);
console.log(`LAUNCH_ACCEPTABLE_THIN (now launch-blocking): ${matrix.statusCounts.LAUNCH_ACCEPTABLE_THIN}`);
console.log(`NEEDS_AUTHORING_BEFORE_LAUNCH: ${matrix.statusCounts.NEEDS_AUTHORING_BEFORE_LAUNCH}`);
console.log(`CRITICAL_BLOCKING: ${matrix.statusCounts.CRITICAL_BLOCKING}`);
console.log(`\nTotal cells needing work: ${totalCellsNeedingWork}`);
console.log(`  Authored bank cells: ${totalAuthoredCells} cells, ${totalAuthoredShortage} items needed`);
console.log(`  Generator cells: ${totalGeneratorCells} cells, ${totalGeneratorShortage} variants needed`);
console.log(`\nPhase 2B (core authored):    ${phase2B.length} cells, ~${sumItems(phase2B)} items`);
console.log(`Phase 2C (core generator):   ${phase2C.length} cells, ~${sumVariants(phase2C)} variants`);
console.log(`Phase 2D (remaining authored):${phase2D.length} cells, ~${sumItems(phase2D)} items`);
console.log(`Phase 2E (remaining generator):${phase2E.length} cells, ~${sumVariants(phase2E)} variants`);
console.log(`\nREADY_FOR_LAUNCH requires: 771/771 PROFESSIONAL_READY, 0 THIN, 0 NEEDS, 0 CRITICAL`);
console.log(`Open owner decisions: 0`);
console.log(`\nOutput files: QUESTION_CELL_WORKPLAN.csv, QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.json, QUESTION_SYSTEM_MASTER_CLOSURE_PLAN.csv`);
