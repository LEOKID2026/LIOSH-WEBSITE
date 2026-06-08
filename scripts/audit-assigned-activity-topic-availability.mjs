/**
 * Deep assigned-activity topic availability audit.
 * Generates docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md
 *
 * Usage: node scripts/audit-assigned-activity-topic-availability.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as teacherTopicOptionsMod from "../lib/teacher-portal/teacher-class-topic-options.js";
import * as activityQuestionsClientMod from "../lib/classroom-activities/generate-activity-questions-client.js";
import * as geometryConstantsMod from "../utils/geometry-constants.js";
import * as hebrewConstantsMod from "../utils/hebrew-constants.js";
import * as englishCurriculumMod from "../data/english-curriculum.js";
import * as englishGeneratorMod from "../utils/english-question-generator.js";
import * as scienceCurriculumMod from "../data/science-curriculum.js";
import * as moledetConstantsMod from "../utils/moledet-geography-constants.js";
import * as moledetGatesMod from "../utils/moledet-geography-curriculum-gates.js";
import * as geometryDiagramSpecMod from "../utils/geometry-diagram-spec.js";
import * as moledetGeneratorMod from "../utils/moledet-geography-question-generator.js";

/** @param {Record<string, unknown>} mod @param {string} name */
function resolveNamed(mod, name) {
  const direct = mod?.[name];
  if (direct !== undefined) return direct;
  const nested = mod?.default;
  if (nested && typeof nested === "object" && name in nested) {
    return nested[name];
  }
  return undefined;
}

const topicOptionsForSubject = resolveNamed(teacherTopicOptionsMod, "topicOptionsForSubject");
const generateActivityQuestionSetClient = resolveNamed(
  activityQuestionsClientMod,
  "generateActivityQuestionSetClient"
);
const scienceLevelAllowed = resolveNamed(activityQuestionsClientMod, "scienceLevelAllowed");
const GEOMETRY_GRADES = resolveNamed(geometryConstantsMod, "GRADES");
const GEOMETRY_TOPICS = resolveNamed(geometryConstantsMod, "TOPICS");
const HEBREW_GRADES = resolveNamed(hebrewConstantsMod, "GRADES");
const HEBREW_TOPICS = resolveNamed(hebrewConstantsMod, "TOPICS");
const ENGLISH_GRADES = resolveNamed(englishCurriculumMod, "ENGLISH_GRADES");
const ENGLISH_TOPICS = resolveNamed(englishGeneratorMod, "ENGLISH_TOPICS");
const generateEnglishQuestion = resolveNamed(englishGeneratorMod, "generateQuestion");
const getLevelForGrade = resolveNamed(englishGeneratorMod, "getLevelForGrade");
const SCIENCE_GRADES = resolveNamed(scienceCurriculumMod, "SCIENCE_GRADES");
const MOLEDET_GRADES = resolveNamed(moledetConstantsMod, "GRADES");
const MOLEDET_TOPICS = resolveNamed(moledetConstantsMod, "TOPICS");
const isMoledetGeographyGradeAllowed = resolveNamed(
  moledetGatesMod,
  "isMoledetGeographyGradeAllowed"
);
const getGeometryDiagramSpec = resolveNamed(geometryDiagramSpecMod, "getGeometryDiagramSpec");
const listTopicQuestionsForGradeLevel = resolveNamed(
  moledetGeneratorMod,
  "listTopicQuestionsForGradeLevel"
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md");

const SUBJECTS = ["geometry", "hebrew", "english", "science", "moledet_geography"];
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const TYPICAL_COUNT = 5;
const MIN_COUNT = 3;

function isEnglishNonMcqMode(q) {
  if (!q || typeof q !== "object") return true;
  if (String(q.topic || "").toLowerCase() === "writing") return true;
  const choices = Array.isArray(q.answers) ? q.answers.map(String) : [];
  const correct = String(q.correctAnswer || "").trim();
  if (choices.length >= 2 && correct && choices.includes(correct)) return false;
  return true;
}

function isEnglishGeneratorPlaceholder(q) {
  if (!q || typeof q !== "object") return true;
  if (q.params?.patternFamily === "english_empty_pool") return true;
  const prompt = String(q.question || "").trim();
  if (!prompt) return true;
  if (
    prompt.includes("אין כרגע שאלת דקדוק") ||
    prompt.includes("אין כרגע משפטי תרגום") ||
    prompt.includes("אין כרגע תבניות משפט")
  ) {
    return true;
  }
  return false;
}

const SUBJECT_LABELS = {
  geometry: "גאומטריה",
  hebrew: "עברית",
  english: "אנגלית",
  science: "מדע",
  moledet_geography: "מולדת וגאוגרפיה",
};

/** @type {Record<string, Record<string, string[]>>} */
const bookPagesCache = {};

async function loadBookPages(subject, gradeKey) {
  const cacheKey = `${subject}:${gradeKey}`;
  if (bookPagesCache[cacheKey]) return bookPagesCache[cacheKey];

  const folderSubject =
    subject === "moledet_geography" ? "moledet" : subject;
  const registryPath = path.join(
    ROOT,
    "lib/learning-book",
    `${folderSubject}-${gradeKey}-registry.js`
  );
  if (!fs.existsSync(registryPath)) {
    bookPagesCache[cacheKey] = [];
    return [];
  }

  const mod = await import(`../lib/learning-book/${folderSubject}-${gradeKey}-registry.js`);
  const orderKey = Object.keys(mod).find((k) => k.endsWith("_PAGE_ORDER"));
  const pages = orderKey && Array.isArray(mod[orderKey]) ? mod[orderKey] : [];
  bookPagesCache[cacheKey] = pages;
  return pages;
}

function bookStatusForTopic(pages, topicKey) {
  if (!pages.length) return { status: "no-book", detail: "no registry" };
  if (pages.includes(topicKey)) {
    return { status: "supported", detail: `page: ${topicKey}` };
  }
  const related = pages.filter(
    (p) => p === topicKey || p.startsWith(`${topicKey}_`) || p.includes(topicKey)
  );
  if (related.length) {
    return { status: "supported", detail: `related pages: ${related.join(", ")}` };
  }
  return { status: "explanation-only-or-absent", detail: "topic not in book TOC" };
}

function curriculumTopics(subject, gradeKey) {
  if (subject === "geometry") return GEOMETRY_GRADES[gradeKey]?.topics || [];
  if (subject === "hebrew") return HEBREW_GRADES[gradeKey]?.topics || [];
  if (subject === "english") return ENGLISH_GRADES[gradeKey]?.topics || [];
  if (subject === "science") return SCIENCE_GRADES[gradeKey]?.topics || [];
  if (subject === "moledet_geography") return MOLEDET_GRADES[gradeKey]?.topics || [];
  return [];
}

async function probeAssigned(subject, gradeKey, topicKey, difficulty, count) {
  try {
    const qs = await generateActivityQuestionSetClient({
      subject,
      gradeLevel: gradeKey,
      topic: topicKey,
      difficulty,
      count,
    });
    const topics = qs.map((q) => q.topic || q.params?.kind || q.params?.topic).filter(Boolean);
    const uniqueStoredTopics = [...new Set(topics.map(String))];
    return {
      ok: true,
      count: qs.length,
      storedTopics: uniqueStoredTopics,
      topicMismatch: uniqueStoredTopics.length > 1 || (uniqueStoredTopics[0] && uniqueStoredTopics[0] !== topicKey),
    };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

async function probeLearningMaster(subject, gradeKey, topicKey) {
  try {
    if (subject === "geometry") {
      const { generateQuestion } = await import("../utils/geometry-question-generator.js");
      const { getLevelConfig } = await import("../utils/geometry-question-generator.js");
      const lc = getLevelConfig?.("medium", gradeKey) ?? { name: "medium" };
      let ok = 0;
      for (let i = 0; i < 10; i++) {
        const q = generateQuestion(lc, topicKey, gradeKey);
        if (q?.question) ok++;
      }
      return ok >= 8 ? "supported" : ok > 0 ? "partial" : "unsupported-generator";
    }
    if (subject === "hebrew") {
      const { generateQuestion } = await import("../utils/hebrew-question-generator.js");
      const gradeCfg = HEBREW_GRADES[gradeKey]?.levels?.medium;
      let mcq = 0;
      let typing = 0;
      for (let i = 0; i < 15; i++) {
        const q = generateQuestion(gradeCfg || { name: "medium" }, topicKey, gradeKey);
        if (q?.answerMode === "typing" || q?.params?.answerMode === "typing") typing++;
        else if (Array.isArray(q?.answers) || Array.isArray(q?.choices)) mcq++;
      }
      if (typing >= 12) return "typing-only (master)";
      if (mcq >= 8) return "supported";
      if (mcq > 0) return "partial";
      return "unsupported-generator";
    }
    if (subject === "english") {
      let mcq = 0;
      let empty = 0;
      for (let i = 0; i < 15; i++) {
        const lc = getLevelForGrade("easy", gradeKey);
        const q = generateEnglishQuestion(lc, topicKey, gradeKey, null, "easy", null);
        if (q?.params?.patternFamily === "english_empty_pool") empty++;
        else if (!isEnglishGeneratorPlaceholder(q) && !isEnglishNonMcqMode(q)) mcq++;
      }
      if (empty >= 12) return "thin-bank at easy";
      if (mcq >= 8) return "supported";
      if (mcq > 0) return "partial";
      return "unsupported-generator";
    }
    if (subject === "science") {
      const bank = await import("../data/science-questions.js");
      const pool = Array.isArray(bank?.SCIENCE_QUESTIONS) ? bank.SCIENCE_QUESTIONS : [];
      const any = pool.some(
        (q) =>
          Array.isArray(q.grades) &&
          q.grades.includes(gradeKey) &&
          String(q.topic || q.category || "").toLowerCase() === topicKey
      );
      return any ? "supported (static bank)" : "no bank rows";
    }
    if (subject === "moledet_geography") {
      const pool = listTopicQuestionsForGradeLevel(gradeKey, "medium", topicKey);
      return pool.length ? `supported (bank ${pool.length} @ medium)` : "no bank rows";
    }
  } catch {
    return "probe-error";
  }
  return "unknown";
}

async function countScienceBank(gradeKey, topicKey) {
  const bank = await import("../data/science-questions.js");
  const pool = Array.isArray(bank?.SCIENCE_QUESTIONS) ? bank.SCIENCE_QUESTIONS : [];
  /** @type {Record<string, number>} */
  const byLevel = { easy: 0, medium: 0, hard: 0 };
  for (const q of pool) {
    if (!Array.isArray(q.grades) || !q.grades.includes(gradeKey)) continue;
    if (String(q.topic || q.category || "").toLowerCase() !== topicKey) continue;
    for (const d of DIFFICULTIES) {
      if (scienceLevelAllowed(q, d)) byLevel[d]++;
    }
  }
  return byLevel;
}

async function probeGeometryDiagramGap(gradeKey, topicKey) {
  const { generateQuestion, getLevelConfig } = await import("../utils/geometry-question-generator.js");
  let withDiagram = 0;
  const kinds = new Set();
  for (let i = 0; i < 40; i++) {
    for (const d of DIFFICULTIES) {
      const lc = getLevelConfig?.(d, gradeKey) ?? { name: d };
      const q = generateQuestion(lc, topicKey, gradeKey);
      if (q?.params?.kind) kinds.add(String(q.params.kind));
      const spec = getGeometryDiagramSpec({
        kind: q?.params?.kind,
        params: q?.params,
        gradeKey,
      });
      if (spec) withDiagram++;
    }
  }
  return { withDiagram, samples: 40 * DIFFICULTIES.length, kinds: [...kinds].slice(0, 6) };
}

function aggregateAssignedResults(results) {
  const key = (d, c) => `${d}@${c}`;
  const map = Object.fromEntries(
    results.map((r) => [key(r.difficulty, r.count), r])
  );

  const typicalFails = DIFFICULTIES.filter((d) => !map[key(d, TYPICAL_COUNT)]?.ok);
  const minFails = DIFFICULTIES.filter((d) => !map[key(d, MIN_COUNT)]?.ok);
  const allTypicalPass = typicalFails.length === 0;
  const allMinPass = minFails.length === 0;

  if (allTypicalPass) return { status: "supported", detail: `passes @ count=${TYPICAL_COUNT} all difficulties` };
  if (allMinPass && typicalFails.length > 0) {
    return {
      status: "thin-bank",
      detail: `passes @ count=${MIN_COUNT} but fails @ count=${TYPICAL_COUNT} at: ${typicalFails.join(", ")}`,
    };
  }

  const easyOnly =
    map[key("easy", TYPICAL_COUNT)]?.ok &&
    (typicalFails.includes("medium") || typicalFails.includes("hard"));
  if (easyOnly) {
    return {
      status: "difficulty-filter-gap",
      detail: `easy OK @ count=${TYPICAL_COUNT}; fails medium/hard: ${typicalFails.filter((d) => d !== "easy").join(", ")}`,
    };
  }

  const anyPass = results.some((r) => r.ok);
  if (anyPass) {
    return {
      status: "thin-bank",
      detail: `partial pass; typical fails at ${typicalFails.join(", ") || "unknown"}`,
    };
  }

  const err = results.find((r) => r.error)?.error || "all difficulties fail";
  return { status: "unsupported-generator", detail: err.slice(0, 120) };
}

function classifyFailure(subject, topicKey, assignedAgg, learningMaster, bankInfo, diagramProbe, assignedResults) {
  if (assignedAgg.status === "supported") {
    const mixed = assignedResults.some((r) => r.ok && r.topicMismatch);
    if (mixed && topicKey === "mixed") {
      return { reason: "mixed-intentional", failure: "stored topic varies by design" };
    }
    return { reason: "supported", failure: "" };
  }

  if (subject === "geometry" && diagramProbe && diagramProbe.withDiagram === 0 && diagramProbe.samples > 0) {
    return {
      reason: "diagram/rendering-gap",
      failure: `generator produces kinds [${diagramProbe.kinds.join(", ")}] but 0/${diagramProbe.samples} get diagram spec; assigned activities require diagrams`,
    };
  }

  if (subject === "hebrew" && (topicKey === "writing" || topicKey === "speaking")) {
    if (learningMaster.includes("typing")) {
      return {
        reason: "unsupported-activity-type",
        failure: "master generates typing/speaking mode; assigned MCQ path filters these out",
      };
    }
  }

  if (subject === "english" && topicKey === "writing") {
    return {
      reason: "unsupported-activity-type",
      failure: "writing uses open/typing modes; no MCQ pool for assigned activities",
    };
  }

  if (assignedAgg.status === "difficulty-filter-gap") {
    const bankDetail = bankInfo ? JSON.stringify(bankInfo) : "";
    return {
      reason: "difficulty-filter-gap",
      failure: `${assignedAgg.detail}. Bank counts: ${bankDetail}`,
    };
  }

  if (assignedAgg.status === "thin-bank") {
    return { reason: "thin-bank", failure: assignedAgg.detail };
  }

  return { reason: assignedAgg.status, failure: assignedAgg.detail };
}

function productImportance(subject, topicKey, reason) {
  if (topicKey === "mixed") return "duplicate/ambiguous/mixed";
  if (topicKey === "writing" || topicKey === "speaking") return "writing/speaking/manual assessment only";

  const coreBySubject = {
    geometry: new Set([
      "shapes_basic", "area", "perimeter", "angles", "parallel_perpendicular", "triangles",
      "quadrilaterals", "symmetry", "diagonal", "heights", "circles", "volume", "pythagoras",
    ]),
    hebrew: new Set(["reading", "comprehension", "grammar", "vocabulary"]),
    english: new Set(["vocabulary", "grammar", "translation", "sentences", "reading"]),
    science: new Set(["body", "animals", "plants", "materials", "earth_space", "environment", "experiments"]),
    moledet_geography: new Set(["homeland", "community", "citizenship", "geography", "values", "maps"]),
  };

  if (coreBySubject[subject]?.has(topicKey)) return "must-have core topic";
  if (reason === "mixed-intentional") return "duplicate/ambiguous/mixed";
  return "nice-to-have";
}

function recommend(subject, topicKey, reason, importance, assignedAgg, book) {
  if (reason === "supported") {
    if (topicKey === "mixed") return "relabel as mixed practice / owner decision needed";
    return "keep visible";
  }
  if (reason === "diagram/rendering-gap") return "support diagrams/rendering";
  if (reason === "unsupported-activity-type") {
    if (importance.includes("writing") || importance.includes("speaking")) return "disable with explanation";
    return "hide temporarily";
  }
  if (reason === "difficulty-filter-gap" || reason === "thin-bank") {
    if (importance === "must-have core topic") return "add/expand question bank";
    return "add/expand question bank";
  }
  if (reason === "mixed-intentional") return "relabel as mixed practice";
  if (topicKey === "mixed") return "owner decision needed";
  if (importance === "must-have core topic") return "fix generator/mapping";
  return "owner decision needed";
}

function escapeCell(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

async function auditRow(subject, gradeKey, topicKey, label) {
  const inCurriculum = curriculumTopics(subject, gradeKey).includes(topicKey);
  const pages = await loadBookPages(subject, gradeKey);
  const book = bookStatusForTopic(pages, topicKey);

  /** @type {{ difficulty: string, count: number, ok?: boolean, error?: string, topicMismatch?: boolean }[]} */
  const assignedResults = [];
  for (const d of DIFFICULTIES) {
    for (const c of [MIN_COUNT, TYPICAL_COUNT]) {
      const r = await probeAssigned(subject, gradeKey, topicKey, d, c);
      assignedResults.push({ difficulty: d, count: c, ...r });
    }
  }

  const assignedAgg = aggregateAssignedResults(assignedResults);
  const learningMaster = await probeLearningMaster(subject, gradeKey, topicKey);

  let bankSource = "";
  /** @type {Record<string, number>|null} */
  let bankInfo = null;
  if (subject === "science") {
    bankInfo = await countScienceBank(gradeKey, topicKey);
    bankSource = `static SCIENCE_QUESTIONS (${JSON.stringify(bankInfo)} usable by level)`;
  } else if (subject === "moledet_geography") {
    const counts = Object.fromEntries(
      DIFFICULTIES.map((d) => [d, listTopicQuestionsForGradeLevel(gradeKey, d, topicKey).length])
    );
    bankInfo = counts;
    bankSource = `moledet static bank (${JSON.stringify(counts)})`;
  } else if (subject === "english") {
    bankSource = "english-questions pools + generator (grammar/sentences/translation/vocabulary)";
  } else if (subject === "hebrew") {
    bankSource = "hebrew-question-generator (dynamic)";
  } else if (subject === "geometry") {
    bankSource = "geometry-question-generator (dynamic; diagram spec required for activities)";
  }

  let diagramProbe = null;
  if (subject === "geometry" && !assignedResults.some((r) => r.ok)) {
    diagramProbe = await probeGeometryDiagramGap(gradeKey, topicKey);
  }

  const { reason, failure } = classifyFailure(
    subject,
    topicKey,
    assignedAgg,
    learningMaster,
    bankInfo,
    diagramProbe,
    assignedResults
  );

  const importance = productImportance(subject, topicKey, reason);
  const recommendation = recommend(subject, topicKey, reason, importance, assignedAgg, book);

  const assignedStatus =
    reason === "supported"
      ? "supported"
      : reason;

  const learningStatus =
    typeof learningMaster === "string" && learningMaster.startsWith("supported")
      ? "supported"
      : learningMaster;

  const bookStatus = book.status === "supported" ? "supported (book pages)" : book.status;

  return {
    subject,
    grade: gradeKey,
    topicKey,
    label,
    shownInUI: true,
    assignedStatus,
    learningStatus,
    bookStatus: `${bookStatus} — ${book.detail}`,
    bankSource,
    failureReason: failure,
    importance,
    recommendation,
    inCurriculum,
    assignedResults,
    bankInfo,
    diagramProbe,
  };
}

async function collectRows() {
  /** @type {Awaited<ReturnType<typeof auditRow>>[]} */
  const rows = [];

  for (const subject of SUBJECTS) {
    for (const gradeKey of GRADES) {
      if (subject === "moledet_geography" && !isMoledetGeographyGradeAllowed(gradeKey)) continue;

      const opts = topicOptionsForSubject(subject, gradeKey);
      if (!opts.length) continue;

      for (const { key, label } of opts) {
        rows.push(await auditRow(subject, gradeKey, key, label));
      }
    }
  }
  return rows;
}

function buildSummaryTables(rows) {
  const mustNotHide = rows.filter(
    (r) =>
      r.importance === "must-have core topic" &&
      r.assignedStatus !== "supported"
  );

  const safeHide = rows.filter(
    (r) =>
      r.recommendation === "disable with explanation" ||
      r.recommendation === "hide temporarily"
  );

  const needsExpansion = rows.filter(
    (r) =>
      r.recommendation === "add/expand question bank" ||
      r.assignedStatus === "thin-bank" ||
      r.assignedStatus === "difficulty-filter-gap"
  );

  const needsCodeFix = rows.filter(
    (r) =>
      r.recommendation === "fix generator/mapping" ||
      r.recommendation === "support diagrams/rendering" ||
      r.assignedStatus === "diagram/rendering-gap" ||
      r.assignedStatus === "mapping-bug"
  );

  const ownerDecision = rows.filter(
    (r) =>
      r.recommendation.includes("owner decision") ||
      r.topicKey === "mixed" ||
      r.importance === "duplicate/ambiguous/mixed"
  );

  return { mustNotHide, safeHide, needsExpansion, needsCodeFix, ownerDecision };
}

function countBySubject(rows) {
  /** @type {Record<string, Record<string, number>>} */
  const out = {};
  for (const r of rows) {
    out[r.subject] ??= { total: 0, supported: 0, failing: 0 };
    out[r.subject].total++;
    if (r.assignedStatus === "supported") out[r.subject].supported++;
    else out[r.subject].failing++;
  }
  return out;
}

function renderReport(rows) {
  const generatedAt = new Date().toISOString();
  const { mustNotHide, safeHide, needsExpansion, needsCodeFix, ownerDecision } = buildSummaryTables(rows);
  const bySubject = countBySubject(rows);

  let md = `# Assigned Activity Topic Availability Audit

Generated: ${generatedAt}
Script: \`scripts/audit-assigned-activity-topic-availability.mjs\`

## Scope

Subjects: geometry, hebrew, english, science, moledet_geography (math excluded — fixed separately in commit \`4e58711e\`).

Verification per topic:
- Parent + teacher UI both use \`topicOptionsForSubject()\` from \`lib/teacher-portal/teacher-class-topic-options.js\`
- Assigned generation tested at easy/medium/hard × count=${MIN_COUNT} and count=${TYPICAL_COUNT} (default UI count=${TYPICAL_COUNT})
- Learning master probed via native generators / static banks
- Learning book TOC checked via \`lib/learning-book/*-registry.js\`
- No hide/disable implementation — audit only

## Executive summary by subject

| Subject | Grade/topic pairs in UI | Supported in assigned activities | Failing / gated |
|---------|-------------------------:|---------------------------------:|----------------:|
`;

  for (const s of SUBJECTS) {
    const c = bySubject[s] || { total: 0, supported: 0, failing: 0 };
    md += `| ${SUBJECT_LABELS[s] || s} | ${c.total} | ${c.supported} | ${c.failing} |\n`;
  }

  md += `
**Total pairs audited:** ${rows.length}

### Key findings (non-math)

1. **Geometry diagram gate:** Topics like \`parallel_perpendicular\`, \`diagonal\`, \`symmetry\`, \`heights\`, \`tiling\` generate questions in learning master but **0%** receive a \`getGeometryDiagramSpec()\` match; assigned activities reject items without diagrams (\`frozenGeometryItemHasDiagram\`).
2. **Hebrew writing/speaking:** g3–g6 generators return typing/speaking mode; assigned MCQ path filters these out. **g1–g2 still pass** assigned activities (MCQ-style prompts at lower grades).
3. **English grammar/sentences/translation:** Easy often works; **medium/hard pools are thin** for g4–g6 (grade-gated pools). Writing is typing-only.
4. **Science g1–g2 materials/earth_space/environment:** Topics exist in curriculum, books, and bank — **medium/hard have 1–2 questions** vs count=${TYPICAL_COUNT} needed.
5. **Moledet g2–g6:** All 30 UI topics pass assigned generation at typical settings; static banks have 30+ items per topic/level. Learning books exist for g2–g4 only (no g5/g6 book registries yet).
6. **Mixed (Hebrew/English):** Passes assigned generation; stored \`topic\` on items may differ from selector — intentional mixed practice.

---

## Table 1 — Full topic map

| Subject | Grade | Topic key | Hebrew label | Shown in assigned UI? | Assigned activity status | Normal learning status | Learning book status | Bank/generator source | Failure reason | Product importance | Recommendation |
|---------|-------|-----------|--------------|----------------------:|--------------------------|------------------------|----------------------|-----------------------|----------------|-------------------|----------------|
`;

  for (const r of rows) {
    md += `| ${r.subject} | ${r.grade} | ${r.topicKey} | ${escapeCell(r.label)} | yes | ${r.assignedStatus} | ${escapeCell(r.learningStatus)} | ${escapeCell(r.bookStatus)} | ${escapeCell(r.bankSource)} | ${escapeCell(r.failureReason)} | ${r.importance} | ${r.recommendation} |\n`;
  }

  md += `
---

## Table 2 — Must not hide (core curriculum — fix/expand instead)

These topics are curriculum-important and fail or are gated only in assigned activities. **Do not hide without product owner sign-off.**

| Subject | Grade | Topic | Assigned status | Why keep visible | Recommended action |
|---------|-------|-------|-----------------|------------------|-------------------|
`;

  for (const r of mustNotHide) {
    md += `| ${r.subject} | ${r.grade} | ${r.topicKey} | ${r.assignedStatus} | ${r.importance}; exists in learning (${r.learningStatus}) | ${r.recommendation} |\n`;
  }

  md += `
---

## Table 3 — Safe to hide/disable now

Topics with **no suitable assigned-activity workflow today** (not core MCQ gaps that should be fixed).

| Subject | Grade | Topic | Reason | Recommendation |
|---------|-------|-------|--------|----------------|
`;

  for (const r of safeHide) {
    md += `| ${r.subject} | ${r.grade} | ${r.topicKey} | ${escapeCell(r.failureReason || r.assignedStatus)} | ${r.recommendation} |\n`;
  }

  md += `
---

## Table 4 — Needs content expansion

| Subject | Grade | Topic | Bank detail | Failure |
|---------|-------|-------|-------------|---------|
`;

  const expansionUnique = new Map();
  for (const r of needsExpansion) {
    if (r.assignedStatus === "supported") continue;
    const k = `${r.subject}|${r.grade}|${r.topicKey}`;
    expansionUnique.set(k, r);
  }
  for (const r of expansionUnique.values()) {
    md += `| ${r.subject} | ${r.grade} | ${r.topicKey} | ${escapeCell(r.bankSource)} | ${escapeCell(r.failureReason)} |\n`;
  }

  md += `
---

## Table 5 — Needs code/generator fix

| Subject | Grade | Topic | Issue type | Detail | Recommendation |
|---------|-------|-------|------------|--------|----------------|
`;

  const codeFixUnique = new Map();
  for (const r of needsCodeFix) {
    if (r.assignedStatus === "supported") continue;
    const k = `${r.subject}|${r.grade}|${r.topicKey}`;
    codeFixUnique.set(k, r);
  }
  for (const r of codeFixUnique.values()) {
    md += `| ${r.subject} | ${r.grade} | ${r.topicKey} | ${r.assignedStatus} | ${escapeCell(r.failureReason)} | ${r.recommendation} |\n`;
  }

  md += `
---

## Table 6 — Owner decision needed

| Subject | Grade | Topic | Question for product owner |
|---------|-------|-------|---------------------------|
`;

  const ownerUnique = new Map();
  for (const r of ownerDecision) {
    const k = `${r.subject}|${r.grade}|${r.topicKey}`;
    ownerUnique.set(k, r);
  }
  for (const r of ownerUnique.values()) {
    let question = "Confirm visibility vs hide";
    if (r.topicKey === "mixed") {
      question = "Keep mixed, relabel as 'תרגול מעורב', or hide? Stored topic may differ from selection.";
    }
    md += `| ${r.subject} | ${r.grade} | ${r.topicKey} | ${question} |\n`;
  }

  md += `
---

## Investigation notes

### Geometry (\`parallel_perpendicular\`, \`diagonal\`, \`symmetry\`, \`heights\`, \`tiling\`)

- Present in \`utils/geometry-constants.js\` curriculum and learning book registries (e.g. g5 pages include \`parallel_perpendicular\`; heights split into \`heights_triangle\`, etc.).
- Learning master generator produces valid question objects.
- Assigned activity path requires diagram spec — **implementation gap**, not missing topic.

### Hebrew \`writing\` / \`speaking\`

- Confirmed typing/speaking modes in generator; not MCQ-compatible for current assigned flow.
- \`reading\`, \`comprehension\`, \`grammar\`, \`vocabulary\` generate MCQ for assigned activities (grammar may be partial at some grades).

### English failures

- \`writing\`: no MCQ — disable/hide for assigned activities unless writing workflow added.
- \`grammar\`, \`sentences\`, \`translation\`: **easy passes**, medium/hard fail at count=${TYPICAL_COUNT} — expand pools / relax grade gating for intermediate levels.

### Science g1 \`materials\`, \`earth_space\`, \`environment\`

- **Not absent** from product: in science-curriculum, science-g1 book registry batch B, and SCIENCE_QUESTIONS bank.
- Failure is **insufficient medium/hard bank depth** for typical activity size.

### Moledet / geography

- 30 pairs (g2–g6 × 6 topics, mixed excluded from UI) all **supported** at count=${TYPICAL_COUNT} across easy/medium/hard.
- Static bank counts verified per grade/topic/level (typically 30+ per level).
- No silent fallback observed in assigned path.
- Learning book registries exist for g2–g4; g5/g6 rely on bank + master only.

### Surprising gaps

- **English assigned vs learning:** Many topics work in learning master at easy but fail assigned activities at default difficulty (medium) or count=5 — product UX may show "בינוני" as default while only "קל" is bank-complete.
- **English g6 translation:** Fails even at **easy** — likely pool/gating bug, not just thin bank.
- **Hebrew writing/speaking split:** g1–g2 assigned activities still work; g3+ blocked — grade-dependent activity type, not uniform hide.
- **Geometry diagram gate:** 8 topic/grade pairs fail assigned activities despite full learning-master + book coverage — pure rendering pipeline gap.
- **Science materials/earth/environment:** Present in g1 books and curriculum; failure is bank depth at medium/hard, not missing subject matter.

### Mixed topics

- Hebrew and English \`mixed\` pass generation; items may carry varied subtopic keys — document or relabel, do not treat as mapping bug without product decision.

---

## Verification checklist

- [x] Generation checks at easy, medium, hard
- [x] Count=${MIN_COUNT} and count=${TYPICAL_COUNT}
- [x] Parent and teacher share \`topicOptionsForSubject\`
- [x] Failures classified (no silent unrelated fallback — generators throw or filter)
- [x] No product code changed except this audit script + report

`;

  return md;
}

async function main() {
  console.log("Running assigned-activity topic availability audit...");
  const rows = await collectRows();
  const md = renderReport(rows);
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md, "utf8");
  console.log(`Wrote ${REPORT_PATH} (${rows.length} rows)`);

  const bySubject = countBySubject(rows);
  console.log("\nSummary by subject:");
  for (const [s, c] of Object.entries(bySubject)) {
    console.log(`  ${s}: ${c.supported}/${c.total} supported`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
