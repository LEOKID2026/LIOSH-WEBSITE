/**
 * Phase 0 read-only — builds level-migration-impact.json + copy inventory.
 * Does not modify production code.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { execSync } from "child_process";

const ROOT = join(import.meta.dirname, "..");
const REPORTS = join(ROOT, "reports");

const LAUNCH_SUBJECTS = [
  { id: "math", labelHe: "מתמטיקה", patterns: ["math-master", "math-question-generator", "math-constants", "math-report"] },
  { id: "geometry", labelHe: "גיאומטריה", patterns: ["geometry-master", "geometry-question-generator", "geometry-constants"] },
  { id: "hebrew", labelHe: "עברית", patterns: ["hebrew-master", "hebrew-question-generator", "hebrew-constants"] },
  { id: "english", labelHe: "אנגלית", patterns: ["english-master", "english-question-generator", "englishLevelKeysForGradeKey"] },
  { id: "science", labelHe: "מדעים", patterns: ["science-master", "science-questions", "science-internal"] },
  { id: "moledet", labelHe: "מולדת", patterns: ["moledet-master", "moledet-geography-master", "VISUAL_STRAND_MOLEDET", "moledet-geography-question-generator"] },
  { id: "geography", labelHe: "גיאוגרפיה", patterns: ["geography-master", "VISUAL_STRAND_GEOGRAPHY", "moledet-geography"] },
  { id: "history", labelHe: "היסטוריה", patterns: ["history-master", "history-questions", "history-curriculum"] },
];

function rg(pattern, globs, dirs = ["pages", "components", "lib", "utils"]) {
  const globArg = globs ? `--glob "${globs}"` : "";
  const paths = dirs.join(" ");
  try {
    return execSync(`rg -n "${pattern}" ${globArg} ${paths}`, {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    }).trim();
  } catch (e) {
    return e.stdout?.trim() || "";
  }
}

function rgFiles(pattern, globs, dirs) {
  try {
    return execSync(`rg -l "${pattern}" ${globs ? `--glob "${globs}"` : ""} ${(dirs || ["pages", "components", "lib", "utils", "scripts", "tests"]).join(" ")}`, {
      cwd: ROOT,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch (e) {
    return (e.stdout || "").trim().split("\n").filter(Boolean);
  }
}

function parseRgLines(raw) {
  if (!raw) return [];
  return raw.split("\n").map((line) => {
    const m = line.match(/^(.+?):(\d+):(.*)$/);
    if (!m) return { file: line, line: null, text: "" };
    return { file: m[1].replace(/\\/g, "/"), line: Number(m[2]), text: m[3].trim() };
  });
}

function walkJsFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (["node_modules", ".git", "review-packages", "tmp"].includes(name)) continue;
      walkJsFiles(p, out);
    } else if (/\.(js|jsx|mjs)$/.test(name)) {
      out.push(relative(ROOT, p).replace(/\\/g, "/"));
    }
  }
  return out;
}

function subjectHits(filePath) {
  const hits = [];
  for (const s of LAUNCH_SUBJECTS) {
    if (s.patterns.some((pat) => filePath.includes(pat))) hits.push(s.id);
  }
  return hits;
}

function isUserFacingCopy(entry) {
  const t = entry.text;
  if (!/קל|בינוני|קשה/.test(t)) return false;
  if (/קלט|קלות|קליל|קלוע|קליק|קלטה|hardReset|hardcoded|harder|hardness/i.test(t)) return false;
  if (/font-medium|font-bold|font-semibold/.test(t)) return false;
  if (/בינוני.*correctRate|labelHe.*בינוני/.test(t) && !/רמה|level|LEVEL/.test(t)) return false;
  return true;
}

function classifySurface(file) {
  if (file.includes("master.js")) return "student_master_ui";
  if (file.includes("AssignActivityModal")) return "parent_activity_ui";
  if (file.includes("teacher") && file.includes("activities")) return "teacher_activity_ui";
  if (file.includes("parent-report")) return "parent_report";
  if (file.includes("curriculum.js")) return "curriculum";
  if (file.includes("help-center")) return "help_center";
  if (file.includes("school/classes")) return "school_portal";
  if (file.includes("solo-games") || file.includes("educational-games") || file.includes("prototypes")) return "out_of_scope_games";
  if (file.includes("scripts/") || file.includes("tests/")) return "qa_or_scripts";
  if (file.includes("constants")) return "subject_constants";
  return "other";
}

// --- scans ---
const hebrewRaw = rg("קל|בינוני|קשה", "*.{js,jsx,mjs}");
const emhRaw = rg("\\beasy\\b|\\bmedium\\b|\\bhard\\b|difficulty", "*.{js,jsx}");
const constantsRaw = rg("LEVELS|LEVEL_ORDER|DIFFICULTY", "", ["utils", "pages", "lib"]);
const metadataRaw = rg("metadata\\.level|questionLevel|sourceDifficulty|displayLevel", "", ["pages/api", "utils", "lib"]);

const sixSubjectFiles = rgFiles("six-subject|6 subjects|6 masters|6 generators|6 מקצוע|שש מקצוע", "*.{js,jsx,mjs}");
const threeLevelFiles = rgFiles("easy.*medium.*hard|LEVEL_ORDER|levelKeys|קל.*בינוני.*קשה", "*.{js,jsx,mjs}");
const displayLevelFiles = rgFiles("displayLevel|sourceDifficulty", "*.{js,jsx,mjs}");

const hebrewEntries = parseRgLines(hebrewRaw).filter(isUserFacingCopy);
const emhFiles = [...new Set(parseRgLines(emhRaw).map((e) => e.file))];
const constantsFiles = [...new Set(parseRgLines(constantsRaw).map((e) => e.file))];

const criticalMasters = [
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/hebrew-master.js",
  "pages/learning/english-master.js",
  "pages/learning/science-master.js",
  "pages/learning/moledet-master.js",
  "pages/learning/geography-master.js",
  "pages/learning/history-master.js",
  "pages/learning/moledet-geography-master.js",
];

const criticalPaths = {
  newModules: [
    "lib/learning/display-level.js",
    "lib/learning/regular-internal-adaptive.js",
    "lib/learning/science-internal-adaptive.js",
  ].map((p) => ({ path: p, exists: existsSync(join(ROOT, p)) })),
  activityClient: "lib/classroom-activities/generate-activity-questions-client.js",
  mixedBugLine: 205,
  sessionApi: ["pages/api/learning/session/start.js", "pages/api/learning/answer.js"],
  reports: [
    "utils/parent-report-language/parent-report-display-labels.he.js",
    "utils/parent-report-v2.js",
    "utils/topic-next-step-engine.js",
    "lib/parent-server/report-data-aggregate.server.js",
  ],
  activities: [
    "components/parent/AssignActivityModal.js",
    "pages/teacher/class/[classId]/activities/new.js",
    "pages/teacher/students/activities/new.js",
  ],
};

const subjectImpact = LAUNCH_SUBJECTS.map((s) => {
  const files = walkJsFiles(ROOT).filter((f) =>
    s.patterns.some((pat) => f.includes(pat.replace(/\\/g, "/"))),
  );
  const levelRelated = files.filter((f) =>
    emhFiles.includes(f) || constantsFiles.includes(f) || hebrewEntries.some((e) => e.file === f),
  );
  return {
    id: s.id,
    labelHe: s.labelHe,
    fileCount: files.length,
    levelRelatedFiles: levelRelated,
    notes: s.id === "science"
      ? "regular-only; ADAPTIVE_LEVEL_ORDER easy→medium→hard; G1-G2 UI policy to remove"
      : s.id === "english"
        ? "englishLevelKeysForGradeKey hides hard for G1-G2 — must remove per plan"
        : s.id === "moledet" || s.id === "geography"
          ? "shared moledet-geography-master + generator; QA/UX separate strands"
          : s.id === "history"
            ? "bank-based selection; inline LEVELS with קל/בינוני/קשה"
            : "standard 3-level UI → רגיל/מתקדם",
  };
});

const risks = [
  {
    id: "R1",
    severity: "critical",
    title: "mixed→medium bug",
    location: "lib/classroom-activities/generate-activity-questions-client.js:205",
    mitigation: "Phase 2 resolveActivitySourceDifficulties",
  },
  {
    id: "R2",
    severity: "high",
    title: "displayLevel/sourceDifficulty not in learning path",
    detail: "Only 4 files in pages/api+lib+utils reference these fields; all learning code uses legacy level/easy-medium-hard",
    mitigation: "Phase 1 SSOT + Phase 3 evidence before UI",
  },
  {
    id: "R3",
    severity: "high",
    title: "topic-next-step-engine LEVEL_ORDER 3-tier",
    location: "utils/topic-next-step-engine.js:95",
    mitigation: "Phase 6 update to רגיל→מתקדם progression",
  },
  {
    id: "R4",
    severity: "high",
    title: "QA/scripts still six-subject",
    files: sixSubjectFiles.filter((f) => !f.includes("review-packages") && !f.includes("docs/")),
    mitigation: "Phase 7 update smoke + matrix to eight-subject",
  },
  {
    id: "R5",
    severity: "medium",
    title: "english G1-G2 hard hidden",
    location: "pages/learning/english-master.js:158-161",
    mitigation: "Phase 4 remove englishLevelKeysForGradeKey restriction",
  },
  {
    id: "R6",
    severity: "medium",
    title: "science inline adaptive + 3-level picker",
    location: "pages/learning/science-master.js",
    mitigation: "Phase 4 regular-only + science-internal-adaptive module",
  },
  {
    id: "R7",
    severity: "medium",
    title: "parent report labels still קל/בינוני/קשה",
    location: "utils/parent-report-language/parent-report-display-labels.he.js:93-95",
    mitigation: "Phase 6 labels → רגיל/מתקדם",
  },
  {
    id: "R8",
    severity: "low",
    title: "moledet/geography shared internal — conflation risk in QA",
    mitigation: "Probes per visual strand; plan already documents",
  },
];

const impact = {
  meta: {
    phase: 0,
    planName: "2-Level Migration Plan Final",
    planFile: ".cursor/plans/2-level_migration_plan_v2.plan.md",
    generatedAt: new Date().toISOString(),
    mode: "read-only-mapping",
    status: "phase0-complete-pending-phase1-approval",
  },
  scanScope: {
    appendixBGreps: [
      { pattern: "קל|בינוני|קשה", dirs: ["pages", "components", "lib", "utils"], glob: "*.{js,jsx,mjs}" },
      { pattern: "easy|medium|hard|difficulty", dirs: ["pages", "components", "lib"], glob: "*.{js,jsx}" },
      { pattern: "LEVELS|LEVEL_ORDER|DIFFICULTY", dirs: ["utils", "pages", "lib"] },
      { pattern: "metadata.level|questionLevel|sourceDifficulty|displayLevel", dirs: ["pages/api", "utils", "lib"] },
    ],
    launchSubjects: LAUNCH_SUBJECTS.map((s) => ({ id: s.id, labelHe: s.labelHe })),
    outOfScopeNoted: ["solo-games", "educational-games", "prototypes", "arcade", "review-packages", "tmp"],
  },
  grepSummary: {
    hebrewLevelCopy: { matchLines: parseRgLines(hebrewRaw).length, userFacingFiltered: hebrewEntries.length, uniqueFiles: new Set(hebrewEntries.map((e) => e.file)).size },
    easyMediumHardDifficulty: { matchLines: parseRgLines(emhRaw).length, uniqueFiles: emhFiles.length },
    levelConstants: { matchLines: parseRgLines(constantsRaw).length, uniqueFiles: constantsFiles.length },
    metadataFields: { matchLines: parseRgLines(metadataRaw).length, uniqueFiles: new Set(parseRgLines(metadataRaw).map((e) => e.file)).size },
    sixSubjectAssumptionFiles: sixSubjectFiles.length,
    threeLevelAssumptionFiles: threeLevelFiles.length,
    displayLevelExistingFiles: displayLevelFiles.length,
  },
  criticalFindings: {
    mixedToMediumBug: {
      file: criticalPaths.activityClient,
      line: 205,
      snippet: 'key === "mixed" ? "medium" : key',
      phase: 2,
    },
    displayLevelNotImplemented: {
      learningLibHasDisplayLevel: false,
      existingOnlyIn: displayLevelFiles.filter((f) => !f.includes("solo-games") && !f.includes("educational-games")),
      note: "SSOT modules from Phase 1 do not exist yet",
    },
    newModulesMissing: criticalPaths.newModules,
  },
  affectedAreas: {
    studentMasters: criticalMasters.map((p) => ({ path: p, exists: existsSync(join(ROOT, p)) })),
    generatorsAndSelection: [
      "utils/math-question-generator.js",
      "utils/geometry-question-generator.js",
      "utils/hebrew-question-generator.js",
      "utils/english-question-generator.js",
      "utils/moledet-geography-question-generator.js",
      "lib/classroom-activities/generate-activity-questions-client.js",
      "data/science-questions.js",
      "data/history-questions/index.js",
    ].map((p) => ({ path: p, exists: existsSync(join(ROOT, p)) })),
    sessionEvidence: criticalPaths.sessionApi.map((p) => ({ path: p, exists: existsSync(join(ROOT, p)) })),
    reportsAndNextStep: criticalPaths.reports.map((p) => ({ path: p, exists: existsSync(join(ROOT, p)) })),
    parentTeacherActivities: criticalPaths.activities.map((p) => ({ path: p, exists: existsSync(join(ROOT, p)) })),
    estimatedProductionFilesInScope: "60-75 per plan",
    estimatedQaTestFiles: "~25+ with six-subject references needing Phase 7 update",
  },
  subjectImpact,
  threeLevelAssumptions: {
    description: "Code assuming easy/medium/hard as user-visible tiers or progression",
    fileCount: threeLevelFiles.length,
    productionHighPriority: threeLevelFiles.filter(
      (f) =>
        !f.includes("scripts/") &&
        !f.includes("tests/") &&
        !f.includes("review-packages") &&
        !f.includes("tmp/") &&
        !f.includes("docs/"),
    ),
    examples: [
      { file: "utils/topic-next-step-engine.js", line: 95, pattern: 'LEVEL_ORDER = ["easy", "medium", "hard"]' },
      { file: "utils/math-constants.js", line: 30, pattern: "3 רמות: easy / medium / hard" },
      { file: "pages/learning/science-master.js", line: 227, pattern: "ADAPTIVE_LEVEL_ORDER" },
      { file: "components/parent/AssignActivityModal.js", line: 348, pattern: "קל / בינוני / קשה UI" },
    ],
  },
  sixSubjectAssumptions: {
    description: "QA/scripts/docs referencing 6 subjects instead of 8 launch subjects",
    files: sixSubjectFiles.filter((f) => !f.includes("review-packages") && !f.includes("docs/school-portal")),
    note: "Production pages/school/classes/index.js shows '6 מקצועות' — school portal scope; verify if in migration scope",
  },
  changesRequired: {
    phase1: ["lib/learning/display-level.js", "regular-internal-adaptive.js", "science-internal-adaptive.js"],
    phase2: ["generate-activity-questions-client.js mixed fix", "all 8 subject selection paths"],
    phase3: ["session/start.js", "answer.js", "diagnostic-evidence.js"],
    phase4: ["8 masters", "curriculum.js", "englishLevelKeysForGradeKey removal"],
    phase5: ["AssignActivityModal", "teacher activity forms"],
    phase6: ["parent-report-display-labels.he.js", "topic-next-step-engine.js", "report-data-aggregate.server.js"],
    phase7: ["eight-subject smoke scripts", "generator probes", "qa-question-inventory-matrix"],
  },
  risksBeforePhase1: risks,
  planValidation: {
    stillValidForExecution: true,
    confidence: "high",
    notes: [
      "8-subject scope in plan matches codebase (8 master entry points + shared moledet-geography)",
      "mixed→medium bug confirmed at generate-activity-questions-client.js:205",
      "displayLevel SSOT not yet created — expected before Phase 1",
      "Six-subject QA debt is in scripts/tests only; plan Phase 7 covers update",
      "School portal '6 מקצועות' string may be out of learning-level scope — flag for owner if school UI should show 8",
    ],
    suggestedPlanUpdatesBeforePhase1: [
      {
        optional: true,
        item: "Clarify whether pages/school/classes/index.js '6 מקצועות' is in scope for copy migration",
      },
      {
        optional: true,
        item: "Phase 0 grep raw outputs saved under reports/_grep-*.txt for audit trail",
      },
    ],
  },
  fixesAppliedInPhase0: false,
};

const copyInventory = {
  meta: {
    phase: 0,
    generatedAt: impact.meta.generatedAt,
    targetCopy: ["רגיל", "מתקדם"],
    forbiddenUserCopy: ["קל", "בינוני", "קשה"],
    filteredFromTotalHebrewMatches: hebrewEntries.length,
  },
  entries: hebrewEntries
    .filter((e) => !e.file.includes("review-packages") && !e.file.includes("tmp/"))
    .map((e) => ({
      file: e.file,
      line: e.line,
      text: e.text.slice(0, 200),
      surface: classifySurface(e.file),
      subjects: subjectHits(e.file),
      inScope: !classifySurface(e.file).includes("out_of_scope"),
      requiredChange: "replace with רגיל/מתקדם per displayLevel mapping",
    })),
  bySurface: {},
};

for (const entry of copyInventory.entries) {
  copyInventory.bySurface[entry.surface] = (copyInventory.bySurface[entry.surface] || 0) + 1;
}

writeFileSync(join(REPORTS, "level-migration-impact.json"), JSON.stringify(impact, null, 2), "utf8");
writeFileSync(join(REPORTS, "level-migration-copy-inventory.json"), JSON.stringify(copyInventory, null, 2), "utf8");

console.log("Wrote reports/level-migration-impact.json");
console.log("Wrote reports/level-migration-copy-inventory.json");
console.log(`Copy entries: ${copyInventory.entries.length}`);
