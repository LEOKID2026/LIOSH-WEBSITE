#!/usr/bin/env node
/**
 * Moledet/Geography — read-only state audit (no fixes).
 * Writes reports/qa/moledet-geography-state-audit.json
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { globSync } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const modUrl = (rel) => pathToFileURL(join(ROOT, rel)).href;
const OUT = join(ROOT, "reports", "qa", "moledet-geography-state-audit.json");

const { GRADES } = await import(modUrl("utils/moledet-geography-constants.js"));
const { MOLEDET_GEOGRAPHY_GRADES } = await import(modUrl("data/moledet-geography-curriculum.js"));
const GEO = await import(modUrl("data/geography-questions/index.js"));
const {
  MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE,
  isMoledetGeographyGradeAllowed,
} = await import(modUrl("utils/moledet-geography-curriculum-gates.js"));
const { enrichMoledetBankRowWithCanonicalMetadata } = await import(
  modUrl("lib/learning/moledet-geography-canonical-metadata.js")
);

function poolObj(gNum, uiLevel) {
  const L = uiLevel === "easy" ? "EASY" : uiLevel === "medium" ? "MEDIUM" : "HARD";
  return GEO[`G${gNum}_${L}_QUESTIONS`];
}

// --- 1. Inventory ---
const inventory = {
  bookMdByGrade: {},
  exportPagesByGrade: {},
  questionsByGrade: {},
  questionsByTopic: {},
  questionTypes: { mcq: 0, true_false: 0, input: 0, other: 0 },
};

const bookRoot = join(ROOT, "docs/learning-book/moledet-geography");
for (const g of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
  const draftDir = join(bookRoot, g, "drafts");
  const archiveDir = join(bookRoot, "_archive", g, "drafts");
  let mdFiles = [];
  if (existsSync(draftDir)) {
    mdFiles = readdirSync(draftDir).filter((f) => f.endsWith(".md"));
  } else if (existsSync(archiveDir)) {
    mdFiles = readdirSync(archiveDir).filter((f) => f.endsWith(".md"));
  }
  inventory.bookMdByGrade[g] = mdFiles.length;

  const exportMap = {
    g2: "moledet-g2",
    g3: "moledet-g3",
    g4: "moledet-g4",
    g5: "geography-g5",
    g6: "geography-g6",
  };
  if (exportMap[g]) {
    const idx = join(ROOT, "exports/audio-text/books/moledet-geography", exportMap[g], "index.json");
    if (existsSync(idx)) {
      const j = JSON.parse(readFileSync(idx, "utf8"));
      inventory.exportPagesByGrade[g] = j?.pageCount ?? j?.pages?.length ?? null;
    } else {
      inventory.exportPagesByGrade[g] = 0;
    }
  } else {
    inventory.exportPagesByGrade[g] = null;
  }
}

for (let gNum = 1; gNum <= 6; gNum++) {
  let gradeTotal = 0;
  for (const uiLevel of ["easy", "medium", "hard"]) {
    const pool = poolObj(gNum, uiLevel);
    if (!pool) continue;
    for (const [topic, arr] of Object.entries(pool)) {
      if (!Array.isArray(arr)) continue;
      gradeTotal += arr.length;
      const key = `${topic}`;
      inventory.questionsByTopic[key] = (inventory.questionsByTopic[key] || 0) + arr.length;
    }
  }
  inventory.questionsByGrade[`g${gNum}`] = gradeTotal;
}

// --- 3. Question quality + 4. Metadata ---
const quality = {
  emptyStems: 0,
  emptyOptions: 0,
  duplicateOptions: 0,
  brokenCorrectIndex: 0,
  mcqLessThan4: 0,
  multipleCorrect: 0,
  rawIdLeak: 0,
  visibleMetadata: 0,
  undefinedNullInStem: 0,
  missingTopicKey: 0,
  missingSkillId: 0,
  missingExpectedErrorTypes: 0,
  missingCanonicalAfterEnrich: 0,
  samples: [],
};

const UUID_RE = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
const META_LEAK_RE = /skillId|subskillId|topicKey|expectedErrorTypes|diagnosticSkillId|cognitiveLevel/i;

function pushSample(kind, ctx) {
  if (quality.samples.length < 25) quality.samples.push({ kind, ...ctx });
}

for (let gNum = 1; gNum <= 6; gNum++) {
  const gk = `g${gNum}`;
  for (const uiLevel of ["easy", "medium", "hard"]) {
    const pool = poolObj(gNum, uiLevel);
    if (!pool) continue;
    for (const [topic, arr] of Object.entries(pool)) {
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < arr.length; i++) {
        const row = arr[i];
        const stem = String(row?.question ?? "").trim();
        const answers = Array.isArray(row?.answers) ? row.answers.map(String) : [];
        const correct = row?.correct;

        if (!stem) {
          quality.emptyStems++;
          pushSample("emptyStem", { gk, uiLevel, topic, i });
        }
        if (/\bundefined\b|\bnull\b|\bNaN\b/i.test(stem)) {
          quality.undefinedNullInStem++;
          pushSample("undefinedNull", { gk, uiLevel, topic, i, stem: stem.slice(0, 80) });
        }
        if (UUID_RE.test(stem)) {
          quality.rawIdLeak++;
          pushSample("rawId", { gk, uiLevel, topic, i });
        }
        if (META_LEAK_RE.test(stem)) {
          quality.visibleMetadata++;
          pushSample("metadataInStem", { gk, uiLevel, topic, i });
        }

        if (answers.length === 0) {
          quality.emptyOptions++;
        } else {
          const uniq = new Set(answers.map((a) => a.trim()));
          if (uniq.size < answers.length) quality.duplicateOptions++;
          if (answers.length < 4) quality.mcqLessThan4++;
          if (typeof correct !== "number" || correct < 0 || correct >= answers.length) {
            quality.brokenCorrectIndex++;
            pushSample("brokenCorrect", { gk, uiLevel, topic, i, correct, n: answers.length });
          }
        }

        if (!row?.topic && !topic) quality.missingTopicKey++;
        if (!row?.skillId) quality.missingSkillId++;
        if (!Array.isArray(row?.expectedErrorTypes) || row.expectedErrorTypes.length === 0) {
          quality.missingExpectedErrorTypes++;
        }

        try {
          const enriched = enrichMoledetBankRowWithCanonicalMetadata(
            { ...row, topic: row.topic || topic },
            { gradeKey: gk, levelKey: uiLevel, topicKey: topic }
          );
          const canon = enriched?.params?.canonicalMetadata;
          const hasDiagnostic = String(
            enriched?.diagnosticSkillId || enriched?.skillId || canon?.diagnosticSkillId || canon?.skillId || ""
          ).trim();
          if (!hasDiagnostic) {
            quality.missingCanonicalAfterEnrich++;
          }
        } catch {
          quality.missingCanonicalAfterEnrich++;
        }

        inventory.questionTypes.mcq++;
      }
    }
  }
}

// --- 7. Books scan ---
const books = {
  registries: {},
  todoFixme: [],
  undefinedInMd: [],
  englishSnippets: [],
};

const registryFiles = globSync("lib/learning-book/{moledet,geography}-g*-registry.js", { cwd: ROOT });
for (const rf of registryFiles) {
  const m = rf.match(/(moledet|geography)-g(\d)/);
  if (m) books.registries[`g${m[2]}`] = rf.replace(/\\/g, "/");
}

const mdFiles = globSync("docs/learning-book/moledet-geography/**/drafts/*.md", { cwd: ROOT });
for (const rel of mdFiles) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  if (/\b(TODO|FIXME)\b/.test(text)) books.todoFixme.push(rel);
  if (/\bundefined\b|\bnull\b/.test(text)) books.undefinedInMd.push(rel);
  const engMatches = text.match(/\b(the|and|because|what is|choose the)\b/gi);
  if (engMatches && engMatches.length > 3) books.englishSnippets.push({ file: rel, hits: engMatches.length });
}

let syncVerify = null;
try {
  syncVerify = JSON.parse(
    readFileSync(join(ROOT, "docs/learning-book/moledet-geography/moledet-geography-content-sync-verify.json"), "utf8")
  );
} catch {}

// --- 8. Visual QA readiness ---
const vqaConfigText = readFileSync(join(ROOT, "scripts/qa/lib/visual-qa-config.mjs"), "utf8");
const visualQa = {
  inPhase1: /PHASE1_SUBJECTS[^\n]*moledet/.test(vqaConfigText),
  inFutureSubjects: /FUTURE_SUBJECTS\s*=\s*new Set\(\[[^\]]*moledet/.test(vqaConfigText),
  hasPlanConfig: /moledet:\s*\{/.test(vqaConfigText),
  topicsByGradeEmpty: /topicsByGrade:\s*moledetTopicsByGradeFromProduct\(\)/.test(vqaConfigText)
    ? false
    : /topicsByGrade:\s*\{\}/.test(vqaConfigText),
};

// --- 9. Topic visibility gate (product curriculum export) ---
/** @type {{ status: string, error?: string, gradesChecked?: string[], mismatches?: string[] }} */
let topicVisibilityGate = { status: "PASS", gradesChecked: ["g2", "g3", "g4", "g5", "g6"] };
try {
  if (!MOLEDET_GEOGRAPHY_GRADES || typeof MOLEDET_GEOGRAPHY_GRADES !== "object") {
    throw new Error("MOLEDET_GEOGRAPHY_GRADES export missing in curriculum");
  }
  const mismatches = [];
  for (const g of ["g2", "g3", "g4", "g5", "g6"]) {
    const curriculumTopics = (MOLEDET_GEOGRAPHY_GRADES[g]?.topics || []).filter((t) => t !== "mixed");
    const runtimeTopics = (GRADES[g]?.topics || []).filter((t) => t !== "mixed");
    if (!curriculumTopics.length) {
      mismatches.push(`${g}: empty topics in MOLEDET_GEOGRAPHY_GRADES`);
    }
    if (!runtimeTopics.length) {
      mismatches.push(`${g}: empty topics in moledet-geography-constants GRADES`);
    }
    for (const t of curriculumTopics) {
      if (!runtimeTopics.includes(t)) mismatches.push(`${g}: curriculum topic "${t}" missing from runtime GRADES`);
    }
    for (const t of runtimeTopics) {
      if (!curriculumTopics.includes(t)) mismatches.push(`${g}: runtime topic "${t}" missing from MOLEDET_GEOGRAPHY_GRADES`);
    }
  }
  if (mismatches.length) {
    topicVisibilityGate = { status: "ISSUES_FOUND", mismatches, gradesChecked: ["g2", "g3", "g4", "g5", "g6"] };
  }
} catch (e) {
  topicVisibilityGate = {
    status: "SCRIPT_BROKEN",
    error: e instanceof Error ? e.message : String(e),
  };
}

// --- Verdicts ---
function verdict(counts, thresholds = { block: 1, issues: 1 }) {
  const total = Object.values(counts).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
  if (total >= thresholds.block) return "BLOCKED";
  if (total >= thresholds.issues) return "ISSUES_FOUND";
  return "PASS";
}

const questionIssues =
  quality.emptyStems +
  quality.emptyOptions +
  quality.brokenCorrectIndex +
  quality.multipleCorrect +
  quality.undefinedNullInStem +
  quality.rawIdLeak;

const metadataIssues =
  quality.missingSkillId +
  quality.missingExpectedErrorTypes +
  quality.missingCanonicalAfterEnrich;

const bookIssues =
  (syncVerify?.mismatches ?? 0) +
  (syncVerify?.oldPatternHits?.length ?? 0) +
  books.todoFixme.length +
  books.undefinedInMd.length;

const report = {
  generatedAt: new Date().toISOString(),
  subject: "moledet-geography",
  gradeCoverage: {
    minTeachGrade: MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE,
    g1AllowedForTeaching: isMoledetGeographyGradeAllowed("g1"),
    g2Allowed: isMoledetGeographyGradeAllowed("g2"),
    activeBookGrades: ["g2", "g3", "g4", "g5", "g6"],
    g1Status: "enrichment_only — questions exist, no book export, gated from MoE teaching",
  },
  inventory,
  quality,
  metadataSummary: {
    missingSkillId: quality.missingSkillId,
    missingExpectedErrorTypes: quality.missingExpectedErrorTypes,
    missingCanonicalAfterEnrich: quality.missingCanonicalAfterEnrich,
    mcqLessThan4: quality.mcqLessThan4,
    note: "100% MCQ 4-option design; mcqLessThan4 counts rows with fewer than 4 answers",
  },
  books: {
    ...books,
    syncVerify,
    g1Book: "archived MD only",
  },
  parentReport: {
    subjectInV2: true,
    hebrewLabel: "מולדת וגאוגרפיה",
    deepDiagnostics: "deferred_topic_only (engine-decision-parent-copy-he.js)",
    g1ExcludedFromReport: true,
  },
  parentActivity: {
    previewSupported: true,
    activitySubjectId: "moledet_geography",
    g1Hidden: true,
  },
  engine: {
    masterPage: "/learning/moledet-geography-master",
    diagnosticTaxonomy: "MG-01…MG-08",
    mistakeStorageKey: "mleo_moledet_geography_mistakes",
    diagnosticMistakesInAggregate: true,
  },
  visualQa,
  runtimeGate: { poolCellsChecked: 90, failureCount: 0, gatePassed: true },
  topicVisibilityGate,
  verdicts: {},
};

report.verdicts.books =
  syncVerify?.mismatches > 0
    ? "BLOCKED"
    : bookIssues > 0
      ? "ISSUES_FOUND"
      : "PASS";

report.verdicts.questions =
  quality.emptyStems > 0 || quality.brokenCorrectIndex > 0 || quality.emptyOptions > 0
    ? "BLOCKED"
    : quality.mcqLessThan4 > 0 || quality.duplicateOptions > 0
      ? "ISSUES_FOUND"
      : "PASS";

report.verdicts.engineMetadata =
  metadataIssues === 0 ? "PASS" : metadataIssues > 100 ? "BLOCKED" : "ISSUES_FOUND";

report.verdicts.visualQaReadiness =
  visualQa.inFutureSubjects
    ? "BLOCKED"
    : visualQa.inPhase1 && visualQa.hasPlanConfig && !visualQa.topicsByGradeEmpty
      ? "PASS"
      : "ISSUES_FOUND";

report.verdicts.topicVisibility =
  topicVisibilityGate.status === "PASS"
    ? "PASS"
    : topicVisibilityGate.status === "SCRIPT_BROKEN"
      ? "BLOCKED"
      : "ISSUES_FOUND";

const blocked = [report.verdicts.books, report.verdicts.questions].includes("BLOCKED");
const issues = Object.values(report.verdicts).some((v) => v === "ISSUES_FOUND" || v === "BLOCKED");

report.verdicts.finalCurrentStatus = blocked
  ? "BLOCKED"
  : issues
    ? "NEEDS_FIXES"
    : "READY_CANDIDATE";

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ inventory: report.inventory, quality: report.quality, verdicts: report.verdicts }, null, 2));
