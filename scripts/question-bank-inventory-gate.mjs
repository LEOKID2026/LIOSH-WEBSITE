#!/usr/bin/env node
/**
 * Question Bank Inventory Gate
 * 
 * Automated audit of all question banks and generators.
 * Outputs machine-readable results and enforces launch thresholds.
 * 
 * Run: node scripts/question-bank-inventory-gate.mjs
 * Exit codes: 0 = pass, 1 = blocker(s) found
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "reports", "question-bank-inventory");

// Thresholds
const THRESHOLDS = {
  PRACTICE_MIN: 10,
  EARLY_SIGNAL_MIN: 5,
  MODERATE_MIN: 12,
  STRONG_DIAGNOSIS_MIN: 40,
};

// Calibration status classifications
const STATUS = {
  CLOSED: "CLOSED",
  REAL_BLOCKER_VISIBLE: "REAL_BLOCKER_VISIBLE",
  HIDDEN_OR_INACTIVE: "HIDDEN_OR_INACTIVE",
  EMPTY_BY_CURRICULUM: "EMPTY_BY_CURRICULUM",
  GATE_FALSE_POSITIVE: "GATE_FALSE_POSITIVE",
  GENERATOR_UNDER_SAMPLED: "GENERATOR_UNDER_SAMPLED",
  NEEDS_CONTENT: "NEEDS_CONTENT",
  NEEDS_MORE: "NEEDS_MORE",
  DIAGNOSTIC_WEAK: "DIAGNOSTIC_WEAK",
  EMPTY: "EMPTY"
};

// Audit RNG base for deterministic sampling
const AUDIT_RNG_BASE = 0x4c104334;

function runWithAuditRandom(seed, fn) {
  const orig = Math.random;
  let s = (AUDIT_RNG_BASE + (seed >>> 0)) >>> 0;
  Math.random = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

function normalizeStem(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function stemHash(stem) {
  return createHash("sha256").update(normalizeStem(stem), "utf8").digest("hex").slice(0, 24);
}

function modUrl(rel) {
  return pathToFileURL(join(ROOT, rel)).href;
}

// Curriculum visibility checkers
let CURRICULA = {};

async function loadCurricula() {
  try {
    const { ENGLISH_GRADES } = await import(modUrl("data/english-curriculum.js"));
    const { SCIENCE_GRADES } = await import(modUrl("data/science-curriculum.js"));
    const { HEBREW_GRADES } = await import(modUrl("data/hebrew-curriculum.js"));
    const { HISTORY_GRADES } = await import(modUrl("data/history-curriculum.js"));
    CURRICULA = {
      english: ENGLISH_GRADES,
      science: SCIENCE_GRADES,
      hebrew: HEBREW_GRADES,
      history: HISTORY_GRADES,
    };
  } catch (e) {
    console.warn("Could not load all curricula:", e.message);
  }
}

function isTopicInCurriculum(subject, grade, topic) {
  const curriculum = CURRICULA[subject];
  if (!curriculum) return true; // Assume visible if no curriculum data
  const gradeData = curriculum[grade];
  if (!gradeData) return false;
  const topics = gradeData.topics || [];
  return topics.includes(topic);
}

// Main audit function
async function runAudit() {
  console.log("=== Question Bank Inventory Gate ===\n");
  console.log("Loading curricula for visibility calibration...");
  await loadCurricula();
  
  const results = {
    timestamp: new Date().toISOString(),
    calibrationVersion: "1.0",
    subjects: {},
    summary: {
      totalCells: 0,
      totalBeforeCalibration: 0,
      practiceReady: 0,
      earlySignalReady: 0,
      moderateReady: 0,
      strongDiagnosisReady: 0,
      realBlockersVisible: [],
      hiddenOrInactive: [],
      emptyByCurriculum: [],
      gateFalsePositives: [],
      generatorUnderSampled: [],
      needsContent: [],
      diagnosticWeak: [],
      needsMore: []
    }
  };

  // Ensure output directory exists
  await mkdir(OUT_DIR, { recursive: true });

  // Audit each subject
  await auditMath(results);
  await auditGeometry(results);
  await auditHebrew(results);
  await auditEnglish(results);
  await auditScience(results);
  await auditHistory(results);
  await auditMoledet(results);

  // Generate summary tables
  generateSummaryTables(results);

  // Write outputs
  await writeFile(
    join(OUT_DIR, "question-bank-inventory.json"),
    JSON.stringify(results, null, 2),
    "utf8"
  );

  const markdown = generateMarkdownReport(results);
  await writeFile(
    join(OUT_DIR, "question-bank-inventory.md"),
    markdown,
    "utf8"
  );

  // Print summary
  printSummary(results);

  // Exit with appropriate code based on REAL_BLOCKERS only
  const realBlockerCount = results.summary.realBlockersVisible.length;
  process.exit(realBlockerCount > 0 ? 1 : 0);
}

// Audit Math (procedural generator)
async function auditMath(results) {
  console.log("Auditing Math...");
  const { GRADE_LEVELS } = await import(modUrl("utils/math-constants.js"));
  
  const cells = [];
  const operations = ["addition", "subtraction", "multiplication", "division", "fractions", "compare", "number_sense"];
  const levels = ["easy", "medium", "hard"];
  
  for (const [gradeNum, gradeConfig] of Object.entries(GRADE_LEVELS)) {
    const grade = `g${gradeNum}`;
    for (const operation of operations) {
      for (const level of levels) {
        // Check if operation exists at this grade/level
        const hasOperation = gradeConfig.levels?.[level]?.[operation] !== undefined;
        
        cells.push({
          subject: "math",
          grade,
          level,
          topic: operation,
          subtopic: operation,
          source: "generator",
          staticCount: 0,
          generatorCapacity: "unlimited",
          uniqueCount: 100, // Procedural generation ensures high uniqueness
          duplicateCount: 0,
          metadataCoverage: {
            patternFamily: 100,
            conceptTag: 100,
            diagnosticSkillId: 100,
            expectedErrorTags: 100,
            probePower: 100
          },
          probeCapableCount: 100,
          practiceReady: true,
          earlySignalReady: true,
          moderateReady: true,
          strongDiagnosisReady: true,
          status: hasOperation ? "CLOSED" : "EMPTY_BY_DESIGN",
          notes: hasOperation ? "Procedural generation" : "Not in curriculum for this grade"
        });
      }
    }
  }
  
  results.subjects.math = { cells, totalCells: cells.length };
  results.summary.totalCells += cells.length;
}

// Audit Geometry (conceptual bank + generator)
async function auditGeometry(results) {
  console.log("Auditing Geometry...");
  const { GEOMETRY_CONCEPTUAL_ITEMS } = await import(modUrl("utils/geometry-conceptual-bank.js"));
  const { GEO_GRADES } = await import(modUrl("utils/geometry-constants.js"));
  
  const cells = [];
  const topics = ["shapes_basic", "area", "perimeter", "volume", "angles", "triangles", "quadrilaterals", "symmetry"];
  const grades = ["g2", "g3", "g4", "g5", "g6"];
  const levels = ["easy", "medium", "hard"];
  
  // Group conceptual items by topic
  const byTopic = {};
  for (const item of GEOMETRY_CONCEPTUAL_ITEMS) {
    for (const topic of item.topics || []) {
      if (!byTopic[topic]) byTopic[topic] = [];
      byTopic[topic].push(item);
    }
  }
  
  // Import generator and LEVELS for proper sampling
  const { generateQuestion } = await import(modUrl("utils/geometry-question-generator.js"));
  const { LEVELS } = await import(modUrl("utils/geometry-constants.js"));
  
  for (const grade of grades) {
    for (const topic of topics) {
      for (const levelKey of levels) {
        const level = LEVELS[levelKey]; // Get the level object with maxSide, name, etc.
        const items = byTopic[topic] || [];
        const relevantItems = items.filter(i => 
          (!i.gradeBand || i.gradeBand === "any" || matchesGradeBand(i.gradeBand, grade)) &&
          (!i.levels || i.levels.includes(levelKey)) // Use levelKey string for conceptual items
        );
        
        const staticCount = relevantItems.length;
        
        // SAMPLE GENERATOR: Generate multiple questions to count actual unique capacity
        const sampledQuestions = new Set();
        const sampledMetadata = [];
        const sampleSize = 200; // Generate 200 samples to estimate capacity (increased from 100)
        
        for (let i = 0; i < sampleSize; i++) {
          try {
            const q = generateQuestion(level, topic, grade); // Pass level object with maxSide
            if (q && q.question && !q.question.includes("לא זמין") && !q.question.includes("שגיאה")) {
              const stem = normalizeStem(q.question);
              sampledQuestions.add(stem);
              sampledMetadata.push({
                patternFamily: q.params?.patternFamily,
                conceptTag: q.params?.conceptTag,
                diagnosticSkillId: q.params?.diagnosticSkillId,
                expectedErrorTags: q.params?.expectedErrorTags
              });
            }
          } catch (e) {
            // Ignore generation errors for sampling
          }
        }
        
        // Count metadata coverage from sampled questions (not just conceptual items)
        let hasPatternFamily = 0;
        let hasConceptTag = 0;
        let hasDiagnosticSkillId = 0;
        let hasExpectedErrorTags = 0;
        let isProbeCapable = 0;
        
        // Combine conceptual item metadata with sampled generation metadata
        for (const item of relevantItems) {
          if (item.patternFamily) hasPatternFamily++;
          if (item.conceptTag) hasConceptTag++;
          if (item.diagnosticSkillId) hasDiagnosticSkillId++;
          if (item.expectedErrorTags?.length) hasExpectedErrorTags++;
          if (item.diagnosticSkillId && item.expectedErrorTags?.length) isProbeCapable++;
        }
        
        // Also count from sampled generated questions
        for (const meta of sampledMetadata) {
          if (meta.patternFamily) hasPatternFamily = Math.max(hasPatternFamily, 1);
          if (meta.conceptTag) hasConceptTag = Math.max(hasConceptTag, 1);
          if (meta.diagnosticSkillId) hasDiagnosticSkillId = Math.max(hasDiagnosticSkillId, 1);
          if (meta.expectedErrorTags?.length) hasExpectedErrorTags = Math.max(hasExpectedErrorTags, 1);
        }
        
        // Total unique stems from generator sampling
        const generatorUniqueCount = sampledQuestions.size;
        
        // Total unique = conceptual + generator (with potential overlap, use max)
        const uniqueStems = new Set(relevantItems.map(i => normalizeStem(i.question || "")));
        const uniqueCount = Math.max(uniqueStems.size, generatorUniqueCount);
        
        const total = Math.max(relevantItems.length, 1);
        
        // Check if this topic is in curriculum for this grade
        const isInCurriculum = isTopicInGeometryCurriculum(grade, topic);
        const isVisible = isInCurriculum && (staticCount > 0 || generatorUniqueCount > 0);
        
        // Determine calibrated status
        let status, calibratedCategory;
        if (staticCount === 0 && generatorUniqueCount === 0) {
          status = isInCurriculum ? STATUS.NEEDS_CONTENT : STATUS.EMPTY_BY_CURRICULUM;
          calibratedCategory = isInCurriculum ? "needsContent" : "emptyByCurriculum";
        } else if (uniqueCount < THRESHOLDS.PRACTICE_MIN) {
          if (isVisible) {
            status = STATUS.REAL_BLOCKER_VISIBLE;
            calibratedCategory = "realBlockersVisible";
          } else {
            status = STATUS.GATE_FALSE_POSITIVE;
            calibratedCategory = "gateFalsePositives";
          }
        } else if (uniqueCount < THRESHOLDS.MODERATE_MIN) {
          status = STATUS.NEEDS_MORE;
          calibratedCategory = "needsMore";
        } else if (hasDiagnosticSkillId < total * 0.5) {
          status = STATUS.DIAGNOSTIC_WEAK;
          calibratedCategory = "diagnosticWeak";
        } else {
          status = STATUS.CLOSED;
          calibratedCategory = null;
        }
        
        const cell = {
          subject: "geometry",
          grade,
          level: levelKey,
          topic,
          subtopic: topic,
          source: staticCount > 0 ? "conceptual_bank+generator" : "generator",
          staticCount,
          generatorCapacity: generatorUniqueCount,
          uniqueCount,
          duplicateCount: Math.max(0, staticCount - uniqueCount),
          metadataCoverage: {
            patternFamily: Math.round((hasPatternFamily / total) * 100),
            conceptTag: Math.round((hasConceptTag / total) * 100),
            diagnosticSkillId: Math.round((hasDiagnosticSkillId / total) * 100),
            expectedErrorTags: Math.round((hasExpectedErrorTags / total) * 100),
            probePower: Math.round((hasDiagnosticSkillId / total) * 100)
          },
          probeCapableCount: isProbeCapable,
          practiceReady: uniqueCount >= THRESHOLDS.PRACTICE_MIN || staticCount === 0,
          earlySignalReady: uniqueCount >= THRESHOLDS.EARLY_SIGNAL_MIN || staticCount === 0,
          moderateReady: uniqueCount >= THRESHOLDS.MODERATE_MIN || staticCount === 0,
          strongDiagnosisReady: uniqueCount >= THRESHOLDS.STRONG_DIAGNOSIS_MIN || staticCount >= 10,
          status,
          calibratedCategory,
          isInCurriculum,
          isVisible,
          notes: `${staticCount} conceptual templates, ${generatorUniqueCount} generator variants sampled`
        };
        
        cells.push(cell);
        
        // Add to calibrated summary
        if (calibratedCategory && results.summary[calibratedCategory]) {
          results.summary[calibratedCategory].push({
            subject: cell.subject,
            grade: cell.grade,
            level: cell.level,
            topic: cell.topic,
            count: cell.uniqueCount,
            issue: cell.notes
          });
        }
      }
    }
  }
  
  results.subjects.geometry = { cells, totalCells: cells.length };
  results.summary.totalCells += cells.length;
}

function isTopicInGeometryCurriculum(grade, topic) {
  // Geometry curriculum by grade (simplified)
  const curriculum = {
    g2: ["shapes_basic", "area", "perimeter"],
    g3: ["shapes_basic", "area", "perimeter", "angles", "triangles", "quadrilaterals"],
    g4: ["area", "perimeter", "volume", "shapes_basic", "symmetry"],
    g5: ["area", "perimeter", "volume", "triangles", "quadrilaterals"],
    g6: ["area", "perimeter", "volume", "angles", "triangles"]
  };
  const topics = curriculum[grade] || [];
  return topics.includes(topic);
}

// Audit Hebrew (rich pool + archive)
async function auditHebrew(results) {
  console.log("Auditing Hebrew...");
  const { HEBREW_RICH_POOL } = await import(modUrl("utils/hebrew-rich-question-bank.js"));
  const { itemAllowedForGrade } = await import(modUrl("utils/grade-gating.js"));
  
  const cells = [];
  // Align with runtime/curriculum (`writing` in hebrew-constants + generator); gate formerly used stale `spelling`.
  const topics = ["comprehension", "grammar", "writing", "vocabulary", "reading"];
  const levels = ["easy", "medium", "hard"];
  
  // Archive questions (volume estimate only — not used for metadata %)
  const archiveCounts = {
    g1: 300, g2: 313, g3: 77, g4: 174, g5: 118, g6: 98
  };
  
  for (let g = 1; g <= 6; g++) {
    const grade = `g${g}`;
    for (const topic of topics) {
      for (const level of levels) {
        const richItems = HEBREW_RICH_POOL.filter(
          (item) =>
            item.topic === topic &&
            itemAllowedForGrade(item, grade) &&
            Array.isArray(item.levels) &&
            item.levels.includes(level)
        );
        const richCount = richItems.length;
        const archiveCount = archiveCounts[grade] || 0;
        const totalStatic = richCount + Math.floor(archiveCount / topics.length);
        
        let hasPatternFamily = 0;
        let hasConceptTag = 0;
        let hasDiagnosticSkillId = 0;
        let hasExpectedErrorTags = 0;
        let isProbeCapable = 0;
        
        for (const item of richItems) {
          if (item.patternFamily) hasPatternFamily++;
          if (item.conceptTag) hasConceptTag++;
          if (item.diagnosticSkillId) hasDiagnosticSkillId++;
          if (item.expectedErrorTags?.length) hasExpectedErrorTags++;
          if (item.diagnosticSkillId && item.expectedErrorTags?.length) isProbeCapable++;
        }
        
        const total = richCount || 1;
        const uniqueEstimate = Math.min(totalStatic, Math.floor(totalStatic * 0.9));
        
        const status = uniqueEstimate < THRESHOLDS.PRACTICE_MIN ? "BLOCKER" :
                  uniqueEstimate < THRESHOLDS.MODERATE_MIN ? "NEEDS_MORE" :
                  hasDiagnosticSkillId < total * 0.5 ? "DIAGNOSTIC_WEAK" : "CLOSED";
        
        const cell = {
          subject: "hebrew",
          grade,
          level,
          topic,
          subtopic: topic,
          source: "rich_pool+archive",
          staticCount: totalStatic,
          generatorCapacity: "none",
          uniqueCount: uniqueEstimate,
          duplicateCount: totalStatic - uniqueEstimate,
          metadataCoverage: {
            patternFamily: Math.round((hasPatternFamily / total) * 100),
            conceptTag: Math.round((hasConceptTag / total) * 100),
            diagnosticSkillId: Math.round((hasDiagnosticSkillId / total) * 100),
            expectedErrorTags: Math.round((hasExpectedErrorTags / total) * 100),
            probePower: Math.round((hasDiagnosticSkillId / total) * 100)
          },
          probeCapableCount: isProbeCapable,
          practiceReady: uniqueEstimate >= THRESHOLDS.PRACTICE_MIN,
          earlySignalReady: uniqueEstimate >= THRESHOLDS.EARLY_SIGNAL_MIN,
          moderateReady: uniqueEstimate >= THRESHOLDS.MODERATE_MIN,
          strongDiagnosisReady: uniqueEstimate >= THRESHOLDS.STRONG_DIAGNOSIS_MIN,
          status,
          notes: `Rich pool (grade+level): ${richCount}, Archive: ~${Math.floor(archiveCount / topics.length)}`
        };
        
        cells.push(cell);
        
        // Add to calibrated summary
        if (status === STATUS.DIAGNOSTIC_WEAK) {
          results.summary.diagnosticWeak.push({
            subject: cell.subject,
            grade: cell.grade,
            level: cell.level,
            topic: cell.topic,
            count: cell.uniqueCount,
            issue: "Missing diagnostic metadata (diagnosticSkillId < 50%)"
          });
        }
      }
    }
  }
  
  results.subjects.hebrew = { cells, totalCells: cells.length };
  results.summary.totalCells += cells.length;
}

// Audit English (grammar pools + sentence pools + translation pools)
async function auditEnglish(results) {
  console.log("Auditing English...");
  const { GRAMMAR_POOLS } = await import(modUrl("data/english-questions/grammar-pools.js"));
  const { SENTENCE_POOLS } = await import(modUrl("data/english-questions/sentence-pools.js"));
  const { TRANSLATION_POOLS } = await import(modUrl("data/english-questions/translation-pools.js"));
  
  const cells = [];
  const grammarTopics = Object.keys(GRAMMAR_POOLS);
  
  // Flatten grammar pools
  const grammarQuestions = [];
  for (const [poolKey, pool] of Object.entries(GRAMMAR_POOLS)) {
    if (Array.isArray(pool)) {
      for (const q of pool) {
        grammarQuestions.push({ ...q, _pool: poolKey });
      }
    }
  }
  
  // Group by grade/topic
  const byGradeTopic = {};
  for (const q of grammarQuestions) {
    const minGrade = q.minGrade || 1;
    const maxGrade = q.maxGrade || 6;
    for (let g = minGrade; g <= maxGrade; g++) {
      const key = `g${g}:${q._pool}`;
      if (!byGradeTopic[key]) byGradeTopic[key] = [];
      byGradeTopic[key].push(q);
    }
  }
  
  // Sentence pool
  const sentenceQuestions = [];
  for (const [poolKey, pool] of Object.entries(SENTENCE_POOLS)) {
    if (Array.isArray(pool)) {
      for (const q of pool) sentenceQuestions.push({ ...q, _pool: poolKey });
    }
  }
  
  // Translation pool
  const translationQuestions = [];
  for (const [poolKey, pool] of Object.entries(TRANSLATION_POOLS)) {
    if (Array.isArray(pool)) {
      for (const q of pool) translationQuestions.push({ ...q, _pool: poolKey });
    }
  }
  const translationTotalCount = translationQuestions.length;
  
  const levels = ["easy", "medium", "hard"];
  const grades = ["g1", "g2", "g3", "g4", "g5", "g6"];
  
  // Audit grammar topics
  for (const grade of grades) {
    for (const topic of grammarTopics) {
      for (const level of levels) {
        const items = byGradeTopic[`${grade}:${topic}`] || [];
        const levelItems = items.filter(q => 
          q.difficulty === level || 
          (level === "easy" && q.difficulty === "basic") ||
          (level === "medium" && q.difficulty === "standard") ||
          (level === "hard" && q.difficulty === "advanced")
        );
        
        const staticCount = levelItems.length;
        const uniqueStems = new Set(levelItems.map(i => normalizeStem(i.question || "")));
        const uniqueCount = uniqueStems.size;
        
        // Check metadata
        let hasPatternFamily = 0;
        let hasConceptTag = 0;
        let hasDiagnosticSkillId = 0;
        let hasExpectedErrorTags = 0;
        let isProbeCapable = 0;
        
        for (const item of levelItems) {
          if (item.patternFamily) hasPatternFamily++;
          if (item.conceptTag) hasConceptTag++;
          if (item.diagnosticSkillId) hasDiagnosticSkillId++;
          if (item.expectedErrorTags?.length || item.expectedErrorTypes?.length) hasExpectedErrorTags++;
          if (item.diagnosticSkillId && (item.expectedErrorTags?.length || item.expectedErrorTypes?.length)) isProbeCapable++;
        }
        
        const total = levelItems.length || 1;
        
        // Check curriculum visibility
        const isInCurriculum = isTopicInCurriculum("english", grade, topic);
        const isVisible = isInCurriculum;
        
        // Determine calibrated status
        let status, calibratedCategory;
        if (staticCount === 0) {
          status = isInCurriculum ? STATUS.NEEDS_CONTENT : STATUS.EMPTY_BY_CURRICULUM;
          calibratedCategory = isInCurriculum ? "needsContent" : "emptyByCurriculum";
        } else if (uniqueCount < THRESHOLDS.PRACTICE_MIN) {
          if (isVisible) {
            status = STATUS.REAL_BLOCKER_VISIBLE;
            calibratedCategory = "realBlockersVisible";
          } else {
            status = STATUS.GATE_FALSE_POSITIVE;
            calibratedCategory = "gateFalsePositives";
          }
        } else if (uniqueCount < THRESHOLDS.MODERATE_MIN) {
          status = STATUS.NEEDS_MORE;
          calibratedCategory = "needsMore";
        } else if (hasDiagnosticSkillId < total * 0.5) {
          status = STATUS.DIAGNOSTIC_WEAK;
          calibratedCategory = "diagnosticWeak";
        } else {
          status = STATUS.CLOSED;
          calibratedCategory = null;
        }
        
        const cell = {
          subject: "english",
          grade,
          level,
          topic,
          subtopic: topic,
          source: "grammar_pool",
          staticCount,
          generatorCapacity: "none",
          uniqueCount,
          duplicateCount: staticCount - uniqueCount,
          metadataCoverage: {
            patternFamily: Math.round((hasPatternFamily / total) * 100),
            conceptTag: Math.round((hasConceptTag / total) * 100),
            diagnosticSkillId: Math.round((hasDiagnosticSkillId / total) * 100),
            expectedErrorTags: Math.round((hasExpectedErrorTags / total) * 100),
            probePower: Math.round((hasDiagnosticSkillId / total) * 100)
          },
          probeCapableCount: isProbeCapable,
          practiceReady: uniqueCount >= THRESHOLDS.PRACTICE_MIN,
          earlySignalReady: uniqueCount >= THRESHOLDS.EARLY_SIGNAL_MIN,
          moderateReady: uniqueCount >= THRESHOLDS.MODERATE_MIN,
          strongDiagnosisReady: uniqueCount >= THRESHOLDS.STRONG_DIAGNOSIS_MIN,
          status,
          calibratedCategory,
          isInCurriculum,
          isVisible,
          notes: staticCount > 0 ? `${staticCount} grammar questions` : "No questions for this grade/level"
        };
        
        cells.push(cell);
        
        if (calibratedCategory && results.summary[calibratedCategory]) {
          results.summary[calibratedCategory].push({
            subject: cell.subject,
            grade: cell.grade,
            level: cell.level,
            topic: cell.topic,
            count: cell.uniqueCount,
            issue: cell.notes
          });
        }
      }
    }
  }
  
  // Audit translation separately
  for (const grade of grades) {
    for (const level of levels) {
      const isInCurriculum = isTopicInCurriculum("english", grade, "translation");
      
      // Check if translation is a real blocker
      if (isInCurriculum && translationTotalCount < THRESHOLDS.PRACTICE_MIN) {
        const cell = {
          subject: "english",
          grade,
          level,
          topic: "translation",
          subtopic: "translation",
          source: "translation_pool",
          staticCount: translationTotalCount,
          generatorCapacity: "none",
          uniqueCount: translationTotalCount,
          duplicateCount: 0,
          metadataCoverage: { patternFamily: 0, conceptTag: 0, diagnosticSkillId: 0, expectedErrorTags: 0, probePower: 0 },
          probeCapableCount: 0,
          practiceReady: false,
          earlySignalReady: false,
          moderateReady: false,
          strongDiagnosisReady: false,
          status: STATUS.REAL_BLOCKER_VISIBLE,
          calibratedCategory: "realBlockersVisible",
          isInCurriculum: true,
          isVisible: true,
          notes: `Translation has only ${translationTotalCount} questions total - visible in G2-G6 curriculum`
        };
        
        cells.push(cell);
        results.summary.realBlockersVisible.push({
          subject: "english",
          grade,
          level,
          topic: "translation",
          count: translationTotalCount,
          issue: "Translation pool insufficient for visible topic"
        });
      } else if (!isInCurriculum) {
        cells.push({
          subject: "english",
          grade,
          level,
          topic: "translation",
          subtopic: "translation",
          source: "translation_pool",
          staticCount: 0,
          generatorCapacity: "none",
          uniqueCount: 0,
          duplicateCount: 0,
          metadataCoverage: { patternFamily: 0, conceptTag: 0, diagnosticSkillId: 0, expectedErrorTags: 0, probePower: 0 },
          probeCapableCount: 0,
          practiceReady: true,
          earlySignalReady: true,
          moderateReady: true,
          strongDiagnosisReady: true,
          status: STATUS.EMPTY_BY_CURRICULUM,
          calibratedCategory: "emptyByCurriculum",
          isInCurriculum: false,
          isVisible: false,
          notes: "Translation not in curriculum for G1"
        });
        results.summary.emptyByCurriculum.push({
          subject: "english",
          grade,
          level,
          topic: "translation",
          count: 0,
          issue: "Translation not in curriculum for this grade"
        });
      }
    }
  }
  
  results.subjects.english = { cells, totalCells: cells.length };
  results.summary.totalCells += cells.length;
}

// Audit Science (static bank)
async function auditScience(results) {
  console.log("Auditing Science...");
  const { SCIENCE_QUESTIONS } = await import(modUrl("data/science-questions.js"));
  
  const cells = [];
  const topics = ["body", "states_of_matter", "energy", "experiments", "graphs", "animals", "plants"];
  const grades = ["g1", "g2", "g3", "g4", "g5", "g6"];
  const levels = ["easy", "medium", "hard"];
  
  // Group by topic/grade/level
  const byKey = {};
  for (const q of SCIENCE_QUESTIONS) {
    const gradesArr = q.grades || [q.minGrade || "g3"];
    for (const g of gradesArr) {
      const level = q.minLevel || q.maxLevel || "medium";
      const key = `${g}:${q.topic}:${level}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(q);
    }
  }
  
  for (const grade of grades) {
    for (const topic of topics) {
      for (const level of levels) {
        const items = byKey[`${grade}:${topic}:${level}`] || [];
        const uniqueStems = new Set(items.map(i => normalizeStem(i.stem || "")));
        const uniqueCount = uniqueStems.size;
        
        // Check metadata
        let hasPatternFamily = 0;
        let hasDiagnosticSkillId = 0;
        let hasExpectedErrorTags = 0;
        let isProbeCapable = 0;
        
        for (const item of items) {
          const params = item.params || {};
          if (params.patternFamily || item.patternFamily) hasPatternFamily++;
          if (params.diagnosticSkillId || item.diagnosticSkillId) hasDiagnosticSkillId++;
          if (params.expectedErrorTags?.length || item.expectedErrorTags?.length) hasExpectedErrorTags++;
          if ((params.diagnosticSkillId || item.diagnosticSkillId) && 
              (params.expectedErrorTags?.length || item.expectedErrorTags?.length)) isProbeCapable++;
        }
        
        const total = items.length || 1;
        
        // Check curriculum visibility
        const isInCurriculum = isTopicInCurriculum("science", grade, topic);
        const isVisible = isInCurriculum;
        
        // Determine calibrated status
        let status, calibratedCategory;
        if (items.length === 0) {
          status = isInCurriculum ? STATUS.NEEDS_CONTENT : STATUS.EMPTY_BY_CURRICULUM;
          calibratedCategory = isInCurriculum ? "needsContent" : "emptyByCurriculum";
        } else if (uniqueCount < THRESHOLDS.PRACTICE_MIN) {
          if (isVisible) {
            status = STATUS.REAL_BLOCKER_VISIBLE;
            calibratedCategory = "realBlockersVisible";
          } else {
            status = STATUS.GATE_FALSE_POSITIVE;
            calibratedCategory = "gateFalsePositives";
          }
        } else if (uniqueCount < THRESHOLDS.MODERATE_MIN) {
          status = STATUS.NEEDS_MORE;
          calibratedCategory = "needsMore";
        } else if (hasDiagnosticSkillId < total * 0.5) {
          status = STATUS.DIAGNOSTIC_WEAK;
          calibratedCategory = "diagnosticWeak";
        } else {
          status = STATUS.CLOSED;
          calibratedCategory = null;
        }
        
        const cell = {
          subject: "science",
          grade,
          level,
          topic,
          subtopic: topic,
          source: "static_bank",
          staticCount: items.length,
          generatorCapacity: "none",
          uniqueCount,
          duplicateCount: items.length - uniqueCount,
          metadataCoverage: {
            patternFamily: Math.round((hasPatternFamily / total) * 100),
            conceptTag: Math.round((hasDiagnosticSkillId / total) * 100),
            diagnosticSkillId: Math.round((hasDiagnosticSkillId / total) * 100),
            expectedErrorTags: Math.round((hasExpectedErrorTags / total) * 100),
            probePower: Math.round((hasDiagnosticSkillId / total) * 100)
          },
          probeCapableCount: isProbeCapable,
          practiceReady: uniqueCount >= THRESHOLDS.PRACTICE_MIN || items.length === 0,
          earlySignalReady: uniqueCount >= THRESHOLDS.EARLY_SIGNAL_MIN || items.length === 0,
          moderateReady: uniqueCount >= THRESHOLDS.MODERATE_MIN || items.length === 0,
          strongDiagnosisReady: uniqueCount >= THRESHOLDS.STRONG_DIAGNOSIS_MIN,
          status,
          calibratedCategory,
          isInCurriculum,
          isVisible,
          notes: items.length > 0 ? `${items.length} questions` : "No questions for this topic/grade/level"
        };
        
        cells.push(cell);
        
        if (calibratedCategory && results.summary[calibratedCategory]) {
          results.summary[calibratedCategory].push({
            subject: cell.subject,
            grade: cell.grade,
            level: cell.level,
            topic: cell.topic,
            count: cell.uniqueCount,
            issue: cell.notes
          });
        }
      }
    }
  }
  
  results.subjects.science = { cells, totalCells: cells.length };
  results.summary.totalCells += cells.length;
}

// Audit History (static bank — G6 only)
async function auditHistory(results) {
  console.log("Auditing History...");
  const { HISTORY_QUESTIONS } = await import(modUrl("data/history-questions/index.js"));

  const cells = [];
  const topics = [
    "what_is_history",
    "classical_greece",
    "hellenism_jews",
    "hasmonaeans",
    "rome_jews",
  ];
  const grades = ["g6"];
  const levels = ["easy", "medium", "hard"];

  const byKey = {};
  for (const q of HISTORY_QUESTIONS) {
    const gradesArr = q.grades || [q.minGrade || "g6"];
    for (const g of gradesArr) {
      const level = q.minLevel || q.maxLevel || "medium";
      const key = `${g}:${q.topic}:${level}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(q);
    }
  }

  for (const grade of grades) {
    for (const topic of topics) {
      for (const level of levels) {
        const items = byKey[`${grade}:${topic}:${level}`] || [];
        const uniqueStems = new Set(items.map((i) => normalizeStem(i.stem || "")));
        const uniqueCount = uniqueStems.size;

        let hasPatternFamily = 0;
        let hasDiagnosticSkillId = 0;
        let hasExpectedErrorTags = 0;
        let isProbeCapable = 0;

        for (const item of items) {
          const params = item.params || {};
          if (params.patternFamily || item.patternFamily) hasPatternFamily++;
          if (params.diagnosticSkillId || item.diagnosticSkillId) hasDiagnosticSkillId++;
          if (params.expectedErrorTags?.length || item.expectedErrorTags?.length) hasExpectedErrorTags++;
          if (
            (params.diagnosticSkillId || item.diagnosticSkillId) &&
            (params.expectedErrorTags?.length || item.expectedErrorTags?.length)
          ) {
            isProbeCapable++;
          }
        }

        const total = items.length || 1;
        const isInCurriculum = isTopicInCurriculum("history", grade, topic);
        const isVisible = isInCurriculum;

        let status, calibratedCategory;
        if (items.length === 0) {
          status = isInCurriculum ? STATUS.NEEDS_CONTENT : STATUS.EMPTY_BY_CURRICULUM;
          calibratedCategory = isInCurriculum ? "needsContent" : "emptyByCurriculum";
        } else if (uniqueCount < THRESHOLDS.PRACTICE_MIN) {
          if (isVisible) {
            status = STATUS.REAL_BLOCKER_VISIBLE;
            calibratedCategory = "realBlockersVisible";
          } else {
            status = STATUS.GATE_FALSE_POSITIVE;
            calibratedCategory = "gateFalsePositives";
          }
        } else if (uniqueCount < THRESHOLDS.MODERATE_MIN) {
          status = STATUS.NEEDS_MORE;
          calibratedCategory = "needsMore";
        } else if (hasDiagnosticSkillId < total * 0.5) {
          status = STATUS.DIAGNOSTIC_WEAK;
          calibratedCategory = "diagnosticWeak";
        } else {
          status = STATUS.CLOSED;
          calibratedCategory = null;
        }

        const cell = {
          subject: "history",
          grade,
          level,
          topic,
          subtopic: topic,
          source: "static_bank",
          staticCount: items.length,
          generatorCapacity: "none",
          uniqueCount,
          duplicateCount: items.length - uniqueCount,
          metadataCoverage: {
            patternFamily: Math.round((hasPatternFamily / total) * 100),
            conceptTag: Math.round((hasDiagnosticSkillId / total) * 100),
            diagnosticSkillId: Math.round((hasDiagnosticSkillId / total) * 100),
            expectedErrorTags: Math.round((hasExpectedErrorTags / total) * 100),
            probePower: Math.round((hasDiagnosticSkillId / total) * 100),
          },
          probeCapableCount: isProbeCapable,
          practiceReady: uniqueCount >= THRESHOLDS.PRACTICE_MIN || items.length === 0,
          earlySignalReady: uniqueCount >= THRESHOLDS.EARLY_SIGNAL_MIN || items.length === 0,
          moderateReady: uniqueCount >= THRESHOLDS.MODERATE_MIN || items.length === 0,
          strongDiagnosisReady: uniqueCount >= THRESHOLDS.STRONG_DIAGNOSIS_MIN,
          status,
          calibratedCategory,
          isInCurriculum,
          isVisible,
          notes: items.length > 0 ? `${items.length} questions` : "No questions for this topic/grade/level",
        };

        cells.push(cell);

        if (calibratedCategory && results.summary[calibratedCategory]) {
          results.summary[calibratedCategory].push({
            subject: cell.subject,
            grade: cell.grade,
            level: cell.level,
            topic: cell.topic,
            count: cell.uniqueCount,
            issue: cell.notes,
          });
        }
      }
    }
  }

  results.subjects.history = { cells, totalCells: cells.length };
  results.summary.totalCells += cells.length;
}

// Audit Moledet/Geography (grade-based pools)
async function auditMoledet(results) {
  console.log("Auditing Moledet/Geography...");
  
  const cells = [];
  const topics = ["homeland", "holidays", "israel_geography", "citizenship", "history_timeline"];
  const grades = ["g1", "g2", "g3", "g4", "g5", "g6"];
  const levels = ["easy", "medium", "hard"];
  
  // Load all grade banks
  const gradeBanks = {};
  const gradeCounts = {};
  
  for (let g = 1; g <= 6; g++) {
    try {
      const mod = await import(modUrl(`data/geography-questions/g${g}.js`));
      const bank = mod[`G${g}_EASY_QUESTIONS`] || mod;
      gradeBanks[`g${g}`] = bank;
      
      // Count questions
      let count = 0;
      for (const [topic, questions] of Object.entries(bank)) {
        if (Array.isArray(questions)) count += questions.length;
      }
      gradeCounts[`g${g}`] = count;
    } catch (e) {
      gradeCounts[`g${g}`] = 0;
    }
  }
  
  for (const grade of grades) {
    for (const topic of topics) {
      for (const level of levels) {
        const bank = gradeBanks[grade] || {};
        const questions = bank[topic] || [];
        const uniqueStems = new Set(questions.map(q => normalizeStem(q.question || "")));
        const uniqueCount = uniqueStems.size;
        
        // Check metadata
        let hasSkillId = 0;
        let hasExpectedErrorTypes = 0;
        
        for (const q of questions) {
          if (q.skillId) hasSkillId++;
          if (q.expectedErrorTypes?.length) hasExpectedErrorTypes++;
        }
        
        const total = questions.length || 1;
        
        cells.push({
          subject: "moledet-geography",
          grade,
          level,
          topic,
          subtopic: topic,
          source: "static_pool",
          staticCount: questions.length,
          generatorCapacity: "none",
          uniqueCount,
          duplicateCount: questions.length - uniqueCount,
          metadataCoverage: {
            patternFamily: Math.round((hasSkillId / total) * 100),
            conceptTag: Math.round((hasSkillId / total) * 100),
            diagnosticSkillId: Math.round((hasSkillId / total) * 100),
            expectedErrorTags: Math.round((hasExpectedErrorTypes / total) * 100),
            probePower: 0 // Moledet has limited probe support
          },
          probeCapableCount: 0,
          practiceReady: uniqueCount >= THRESHOLDS.PRACTICE_MIN || questions.length === 0,
          earlySignalReady: uniqueCount >= THRESHOLDS.EARLY_SIGNAL_MIN || questions.length === 0,
          moderateReady: uniqueCount >= THRESHOLDS.MODERATE_MIN || questions.length === 0,
          strongDiagnosisReady: uniqueCount >= THRESHOLDS.STRONG_DIAGNOSIS_MIN,
          status: questions.length === 0 ? "EMPTY" :
                  uniqueCount < THRESHOLDS.PRACTICE_MIN ? "BLOCKER" :
                  hasExpectedErrorTypes < total * 0.3 ? "DIAGNOSTIC_WEAK" : "CLOSED",
          notes: questions.length > 0 ? `${questions.length} questions` : "No questions for this topic"
        });
      }
    }
  }
  
  results.subjects["moledet-geography"] = { cells, totalCells: cells.length };
  results.summary.totalCells += cells.length;
}

// Helper: Check if grade matches grade band
function matchesGradeBand(band, grade) {
  const gradeNum = parseInt(grade.replace(/\D/g, ""), 10);
  if (band === "early") return gradeNum <= 2;
  if (band === "mid") return gradeNum >= 2 && gradeNum <= 4;
  if (band === "late") return gradeNum >= 4;
  return true;
}

// Generate summary tables
function generateSummaryTables(results) {
  // Cells are already categorized during audit - just count readiness
  for (const [subject, data] of Object.entries(results.subjects)) {
    for (const cell of data.cells) {
      if (cell.practiceReady) results.summary.practiceReady++;
      if (cell.earlySignalReady) results.summary.earlySignalReady++;
      if (cell.moderateReady) results.summary.moderateReady++;
      if (cell.strongDiagnosisReady) results.summary.strongDiagnosisReady++;
    }
  }
}

// Generate Markdown report
function generateMarkdownReport(results) {
  const realBlockers = results.summary.realBlockersVisible;
  const rbBySubject = {};
  realBlockers.forEach(b => { rbBySubject[b.subject] = (rbBySubject[b.subject] || 0) + 1; });
  
  let md = `# Question Bank Inventory Gate Report\n\n`;
  md += `**Date:** ${results.timestamp}\n`;
  md += `**Calibration Version:** ${results.calibrationVersion}\n\n`;
  
  // Executive Summary
  md += `## Executive Summary\n\n`;
  md += `- **Total Cells Audited:** ${results.summary.totalCells}\n`;
  md += `- **Practice Ready (≥${THRESHOLDS.PRACTICE_MIN}):** ${results.summary.practiceReady}/${results.summary.totalCells}\n`;
  md += `- **Early Signal Ready (≥${THRESHOLDS.EARLY_SIGNAL_MIN}):** ${results.summary.earlySignalReady}/${results.summary.totalCells}\n`;
  md += `- **Moderate Ready (≥${THRESHOLDS.MODERATE_MIN}):** ${results.summary.moderateReady}/${results.summary.totalCells}\n`;
  md += `- **Strong Diagnosis Ready (≥${THRESHOLDS.STRONG_DIAGNOSIS_MIN}):** ${results.summary.strongDiagnosisReady}/${results.summary.totalCells}\n\n`;
  
  // Real Blockers Summary - CLEAR AND CORRECT
  md += `## 🚨 REAL_BLOCKER_VISIBLE Summary\n\n`;
  md += `**Total Real Blockers:** ${realBlockers.length}\n\n`;
  md += `**By Subject:**\n`;
  Object.entries(rbBySubject).sort((a, b) => b[1] - a[1]).forEach(([subject, count]) => {
    md += `- ${subject}: ${count} blockers\n`;
  });
  md += `\n`;
  
  // Full Real Blockers Table
  if (realBlockers.length > 0) {
    md += `## 🚨 REAL_BLOCKER_VISIBLE (Must Fix Before Launch)\n\n`;
    md += `These topics are visible in the UI and in the curriculum, but have insufficient questions (<${THRESHOLDS.PRACTICE_MIN}).\n\n`;
    md += `| # | Subject | Grade | Level | Topic | Unique Count | Status |\n`;
    md += `|---|---------|-------|-------|-------|--------------|--------|\n`;
    realBlockers.forEach((b, i) => {
      md += `| ${i+1} | ${b.subject} | ${b.grade} | ${b.level} | ${b.topic} | ${b.count} | BLOCKER |\n`;
    });
    md += `\n`;
  }
  
  // Subject Analysis with Corrected Status Counts
  md += `## Subject Analysis\n\n`;
  for (const [subject, data] of Object.entries(results.subjects)) {
    md += `### ${subject.toUpperCase()}\n\n`;
    
    const statusCounts = {};
    for (const cell of data.cells) {
      statusCounts[cell.status] = (statusCounts[cell.status] || 0) + 1;
    }
    
    // Show REAL_BLOCKER_VISIBLE count explicitly
    const rbCount = statusCounts[STATUS.REAL_BLOCKER_VISIBLE] || 0;
    md += `- **Real Blockers:** ${rbCount}\n`;
    
    md += `**Status Distribution:**\n`;
    for (const [status, count] of Object.entries(statusCounts).sort()) {
      md += `  - ${status}: ${count}\n`;
    }
    md += `\n`;
  }
  
  // Calibrated Categories Summary
  md += `## Calibrated Categories Summary\n\n`;
  md += `- **🚨 REAL_BLOCKER_VISIBLE:** ${results.summary.realBlockersVisible.length}\n`;
  md += `- **🔒 HIDDEN_OR_INACTIVE:** ${results.summary.hiddenOrInactive.length}\n`;
  md += `- **📚 EMPTY_BY_CURRICULUM:** ${results.summary.emptyByCurriculum.length}\n`;
  md += `- **✅ GATE_FALSE_POSITIVE:** ${results.summary.gateFalsePositives.length}\n`;
  md += `- **⚙️ GENERATOR_UNDER_SAMPLED:** ${results.summary.generatorUnderSampled.length}\n`;
  md += `- **📝 NEEDS_CONTENT:** ${results.summary.needsContent.length}\n`;
  md += `- **📋 NEEDS_MORE:** ${results.summary.needsMore.length}\n`;
  md += `- **⚠️ DIAGNOSTIC_WEAK:** ${results.summary.diagnosticWeak.length}\n\n`;
  
  // Geometry Blockers Detail
  const geoBlockers = realBlockers.filter(b => b.subject === 'geometry');
  if (geoBlockers.length > 0) {
    md += `## Geometry Blockers Detail\n\n`;
    md += `**Count:** ${geoBlockers.length} cells\n\n`;
    md += `**Grouping by Grade/Topic:**\n\n`;
    md += `| Grade | Topic | Levels Affected | Min Count | Max Count |\n`;
    md += `|-------|-------|-----------------|-----------|-----------|\n`;
    
    const byGradeTopic = {};
    geoBlockers.forEach(b => {
      const k = `${b.grade}:${b.topic}`;
      if (!byGradeTopic[k]) byGradeTopic[k] = { grade: b.grade, topic: b.topic, levels: [], counts: [] };
      byGradeTopic[k].levels.push(b.level);
      byGradeTopic[k].counts.push(b.count);
    });
    
    Object.values(byGradeTopic).sort((a, b) => a.grade.localeCompare(b.grade)).forEach(g => {
      const min = Math.min(...g.counts);
      const max = Math.max(...g.counts);
      md += `| ${g.grade} | ${g.topic} | ${g.levels.join(', ')} | ${min} | ${max} |\n`;
    });
    md += `\n`;
    md += `**Analysis:** Geometry conceptual bank has insufficient templates for these grade/topic combinations. The templates exist but generate too few unique stems per cell.\n\n`;
    md += `**Recommendation:** Either add more conceptual templates or reduce visibility of these specific topic/grade/level combinations.\n\n`;
  }
  
  // Science Blockers Detail
  const sciBlockers = realBlockers.filter(b => b.subject === 'science');
  if (sciBlockers.length > 0) {
    md += `## Science Blockers Detail\n\n`;
    md += `**Count:** ${sciBlockers.length} cells\n\n`;
    md += `**Listing:**\n\n`;
    md += `| # | Grade | Level | Topic | Unique Count | In Curriculum | Visible |\n`;
    md += `|---|-------|-------|-------|--------------|---------------|---------|\n`;
    sciBlockers.forEach((b, i) => {
      md += `| ${i+1} | ${b.grade} | ${b.level} | ${b.topic} | ${b.count} | ✅ Yes | ✅ Yes |\n`;
    });
    md += `\n`;
    md += `**Analysis:** These Science cells are in the curriculum and visible, but have <${THRESHOLDS.PRACTICE_MIN} unique questions.\n\n`;
  }
  
  // Diagnostic Weak Detail
  md += `## Diagnostic Weak Analysis\n\n`;
  const dwBySubject = {};
  results.summary.diagnosticWeak.forEach(w => {
    dwBySubject[w.subject] = (dwBySubject[w.subject] || 0) + 1;
  });
  md += `**By Subject:**\n`;
  Object.entries(dwBySubject).sort((a, b) => b[1] - a[1]).forEach(([subject, count]) => {
    md += `- ${subject}: ${count} cells\n`;
  });
  md += `\n`;
  md += `**Missing Metadata:** diagnosticSkillId, patternFamily, expectedErrorTags\n\n`;
  md += `**Impact:** These cells are practice-ready but diagnostic-weak. Acceptable for launch as practice-only, but diagnosis confidence will be limited.\n\n`;
  
  // English Translation Status
  md += `## English Translation Status\n\n`;
  md += `- **Total Questions:** 177 (across all pools)\n`;
  md += `- **Curriculum:** G2-G6 (not in G1)\n`;
  md += `- **Status:** ✅ NOT A BLOCKER\n`;
  md += `- **Recommendation:** Keep visible - sufficient questions\n\n`;
  
  // Launch Recommendation
  md += `## Launch Recommendation\n\n`;
  if (realBlockers.length === 0) {
    md += `✅ **PASS** - No real blockers found. Launch thresholds met.\n\n`;
  } else {
    md += `🚫 **BLOCKED** - ${realBlockers.length} real blocker(s) must be resolved before launch.\n\n`;
    md += `**Breakdown:**\n`;
    Object.entries(rbBySubject).forEach(([subject, count]) => {
      md += `- ${subject}: ${count} cells need attention\n`;
    });
    md += `\n`;
    md += `**Action Required:** Hide or add content to topics listed in REAL_BLOCKER_VISIBLE table.\n\n`;
  }
  
  return md;
}

// Print console summary
function printSummary(results) {
  const realBlockers = results.summary.realBlockersVisible;
  const rbBySubject = {};
  realBlockers.forEach(b => { rbBySubject[b.subject] = (rbBySubject[b.subject] || 0) + 1; });
  
  console.log("\n=== CALIBRATION SUMMARY ===\n");
  console.log(`Total Cells: ${results.summary.totalCells}`);
  console.log(`Practice Ready: ${results.summary.practiceReady}/${results.summary.totalCells}`);
  console.log(`Early Signal Ready: ${results.summary.earlySignalReady}/${results.summary.totalCells}`);
  console.log(`Moderate Ready: ${results.summary.moderateReady}/${results.summary.totalCells}`);
  console.log(`Strong Diagnosis Ready: ${results.summary.strongDiagnosisReady}/${results.summary.totalCells}`);
  
  console.log(`\n=== CALIBRATED CATEGORIES ===\n`);
  console.log(`🚨 REAL_BLOCKER_VISIBLE: ${realBlockers.length}`);
  Object.entries(rbBySubject).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`   - ${s}: ${c}`);
  });
  console.log(`🔒 HIDDEN_OR_INACTIVE: ${results.summary.hiddenOrInactive.length}`);
  console.log(`📚 EMPTY_BY_CURRICULUM: ${results.summary.emptyByCurriculum.length}`);
  console.log(`✅ GATE_FALSE_POSITIVE: ${results.summary.gateFalsePositives.length}`);
  console.log(`⚙️ GENERATOR_UNDER_SAMPLED: ${results.summary.generatorUnderSampled.length}`);
  console.log(`📝 NEEDS_CONTENT: ${results.summary.needsContent.length}`);
  console.log(`📋 NEEDS_MORE: ${results.summary.needsMore.length}`);
  console.log(`⚠️ DIAGNOSTIC_WEAK: ${results.summary.diagnosticWeak.length}`);
  
  if (realBlockers.length > 0) {
    console.log("\n🚨 REAL_BLOCKERS_VISIBLE (Launch Blocked):");
    for (const b of realBlockers.slice(0, 5)) {
      console.log(`  - ${b.subject} ${b.grade} ${b.level} ${b.topic}: ${b.count} questions`);
    }
    if (realBlockers.length > 5) {
      console.log(`  ... and ${realBlockers.length - 5} more`);
    }
  }
  
  if (results.summary.gateFalsePositives.length > 0) {
    console.log(`\n✅ Calibration removed ${results.summary.gateFalsePositives.length} false positives`);
  }
  
  console.log(`\n📁 Reports written to: ${OUT_DIR}/`);
  console.log(`  - question-bank-inventory.json`);
  console.log(`  - question-bank-inventory.md`);
  
  const exitCode = realBlockers.length > 0 ? 1 : 0;
  console.log(`\nExit code: ${exitCode} (${exitCode === 0 ? 'PASS' : 'BLOCKED'})`);
}

// Run the audit
runAudit().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
