#!/usr/bin/env node
/**
 * Science audit — stages 2–5 (engine, metadata, MCQ, grade fit, repetition/inventory).
 * Read-only; no content mutations.
 *
 * Usage: node scripts/audit-science-stages-2-5.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SCIENCE_QUESTIONS } from "../data/science-questions.js";
import { SCIENCE_GRADES, SCIENCE_GRADE_ORDER } from "../data/science-curriculum.js";
import {
  auditMcqQuality,
  buildNearDuplicateStemKey,
  buildQuestionFingerprint,
  normalizeOptionForCompare,
  normalizeStemForFingerprint,
} from "../utils/question-quality.js";
import { buildScanRecord } from "../utils/question-metadata-qa/question-metadata-scanner.js";
import {
  ALL_VALID_COGNITIVE_LEVELS,
  ALL_VALID_DIFFICULTY,
} from "../utils/question-metadata-qa/question-metadata-taxonomy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "reports", "science-audit");
const STAMP = new Date().toISOString().slice(0, 10);

const LEVEL_ORDER = ["easy", "medium", "hard"];
const VALID_TOPICS = new Set([
  "body",
  "animals",
  "plants",
  "materials",
  "earth_space",
  "environment",
  "experiments",
  "mixed",
]);

const BAD_LITERAL = [
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bNaN\b/i,
  /\[object Object\]/i,
];

const RAW_ID_PATTERNS = [
  /\b(?:patternFamily|diagnosticSkillId|subtopicId|skillKey|gradeBand|conceptTag)\b/i,
  /\bsci_[a-z0-9_]+\b/i,
  /\b(?:body|animals|plants|materials|earth_space|environment|experiments)_[a-z0-9_]+\b/i,
  /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i,
];

const ENGLISH_IN_HEBREW =
  /\b(?:the|and|or|what|when|where|which|choose|select|true|false|DNA|RNA|CO2|H2O|pH)\b/i;

const GRADE_MARKER_RE =
  /בכיתה\s*[א-ו׳'"]|בכיתה\s*[1-6]|grade\s*[1-6]/i;

const ADVANCED_TERMS_G12 = [
  /מולקול/i,
  /תא\s/i,
  /אנד\s?וס\s?כ\s?י/i,
  /פוטוסינתז/i,
  /אקולוג/i,
  /מערכת\s+עצבים/i,
  /מטבול/i,
  /DNA|RNA/i,
];

const STEM_LEN_LIMITS = { g1: 140, g2: 160, g3: 200, g4: 240, g5: 280, g6: 320 };
const G12_STEM_HARD = 320;

function levelAllowed(q, levelKey) {
  const order = { easy: 1, medium: 2, hard: 3 };
  const min = order[q.minLevel] || 1;
  const max = order[q.maxLevel] || 3;
  const cur = order[levelKey] || 1;
  return cur >= min && cur <= max;
}

function parseGk(gk) {
  const m = String(gk || "").match(/^g([1-6])$/);
  return m ? parseInt(m[1], 10) : null;
}

function visibleBlob(q) {
  return [
    q.stem,
    ...(Array.isArray(q.options) ? q.options : []),
    q.explanation,
    ...(Array.isArray(q.theoryLines) ? q.theoryLines : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function scanLeaks(text) {
  const issues = [];
  for (const re of BAD_LITERAL) {
    if (re.test(text)) issues.push({ code: "bad_literal", detail: re.source });
  }
  for (const re of RAW_ID_PATTERNS) {
    if (re.test(text)) issues.push({ code: "raw_id_leak", detail: re.source });
  }
  if (/\([^)]*(?:בלי|pattern|diagnostic|subtype)[^)]*\)/i.test(text)) {
    issues.push({ code: "metadata_paren", detail: "suspicious parenthetical" });
  }
  return issues;
}

function metadataRowPass(q) {
  const fails = [];
  const params = q.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    fails.push("missing_params");
    return fails;
  }
  const cog = String(params.cognitiveLevel || "").toLowerCase();
  if (!cog || !ALL_VALID_COGNITIVE_LEVELS.has(cog)) fails.push("invalid_cognitiveLevel");
  const et = params.expectedErrorTypes;
  if (!Array.isArray(et) || et.length === 0) fails.push("missing_expectedErrorTypes");
  const diff = String(params.difficulty || "").toLowerCase();
  if (!diff || !ALL_VALID_DIFFICULTY.has(diff)) fails.push("invalid_difficulty");
  const rec = buildScanRecord(q, "data/science-questions.js", q.id, "science", 0);
  if (!rec.subskillId) fails.push("empty_subskillId");
  if (!params.patternFamily && !params.conceptTag && !params.subtype) {
    fails.push("missing_pattern_or_subtype");
  }
  return fails;
}

const INTERNAL_STEM_METADATA =
  /(?:^|\s)(?:כיתה\s*[א-ו׳'"]\s*·\s*רמה|·\s*מוקד\s+[a-z0-9_]+)/i;

function structuralPass(q) {
  const fails = [];
  const id = q.id || "(no-id)";
  const stem = String(q.stem ?? "").trim();
  if (!stem) fails.push("empty_stem");
  if (INTERNAL_STEM_METADATA.test(stem)) fails.push("internal_stem_metadata");
  if (!q.topic || !VALID_TOPICS.has(q.topic)) fails.push(`invalid_topic:${q.topic}`);
  if (!Array.isArray(q.grades) || q.grades.length === 0) fails.push("missing_grades");
  else {
    for (const gk of q.grades) {
      if (!/^g[1-6]$/.test(gk)) fails.push(`invalid_grade_key:${gk}`);
      else if (!(SCIENCE_GRADES[gk]?.topics || []).includes(q.topic)) {
        fails.push(`topic_not_in_curriculum:${gk}`);
      }
    }
  }
  const t = String(q.type || "mcq").toLowerCase();
  const opts = q.options;
  if (!Array.isArray(opts) || opts.length === 0) fails.push("missing_options");
  else {
    opts.forEach((o, i) => {
      if (String(o ?? "").trim() === "") fails.push(`empty_option_${i}`);
      if (String(o).includes("[object Object]")) fails.push(`object_option_${i}`);
    });
  }
  if (q.correctIndex == null) fails.push("missing_correctIndex");
  else {
    const ci = Number(q.correctIndex);
    if (!Number.isInteger(ci) || ci < 0) fails.push("invalid_correctIndex");
    else if (Array.isArray(opts) && ci >= opts.length) fails.push("correctIndex_oob");
  }
  if (Array.isArray(opts) && q.correctIndex != null && opts[q.correctIndex] == null) {
    fails.push("correctAnswer_missing");
  }
  const leaks = scanLeaks(visibleBlob(q));
  for (const l of leaks) fails.push(l.code);
  if (ENGLISH_IN_HEBREW.test(stem) && !/\b(?:DNA|RNA|CO2|H2O)\b/.test(stem)) {
    fails.push("unwanted_english_in_stem");
  }
  return fails.map((f) => ({ id, code: f }));
}

function mcqIssues(q) {
  const t = String(q.type || "mcq").toLowerCase();
  const issues = [];
  const opts = Array.isArray(q.options) ? q.options : [];

  if (t === "true_false") {
    issues.push({
      code: "true_false_two_options_runtime",
      severity: "fail",
      detail: "Rendered as 2-option MCQ grid (science-master maps options as-is; no 4-option expansion)",
      optionCount: opts.length,
    });
    if (opts.length !== 2) {
      issues.push({
        code: "true_false_wrong_option_count",
        severity: "fail",
        detail: `Expected 2 options for true_false, got ${opts.length}`,
      });
    }
    return issues;
  }

  if (t !== "mcq") {
    issues.push({ code: "unknown_type", severity: "fail", detail: t });
    return issues;
  }

  if (opts.length !== 4) {
    issues.push({
      code: "mcq_option_count_not_4",
      severity: "fail",
      detail: `Got ${opts.length} options`,
    });
  }

  const audit = auditMcqQuality(q, { subject: "science", topic: q.topic });
  for (const f of audit.failures) {
    issues.push({ code: f.code, severity: "fail", detail: f.message, extra: f });
  }
  for (const w of audit.warnings) {
    issues.push({ code: w.code, severity: "warn", detail: w.message, extra: w });
  }

  const correct = opts[q.correctIndex];
  const distractors = opts.filter((_, i) => i !== q.correctIndex);
  const plausible = distractors.filter((d) => {
    const dl = String(d).trim().length;
    return dl >= 3 && !/^לא\s/.test(String(d).trim()) && !/^אין\s/.test(String(d).trim());
  });
  if (distractors.length >= 2 && plausible.length < 2) {
    issues.push({
      code: "weak_distractors",
      severity: "warn",
      detail: "Fewer than 2 plausible distractors",
    });
  }

  const stemWords = new Set(
    String(q.stem || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  for (const d of distractors) {
    const dw = String(d).toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const overlap = dw.filter((w) => stemWords.has(w));
    if (overlap.length >= 2 && overlap.join(" ").length > 8) {
      issues.push({
        code: "distractor_stem_overlap",
        severity: "warn",
        detail: `Distractor may echo stem: "${d}"`,
      });
      break;
    }
  }

  return issues;
}

function gradeFitIssues(q) {
  const issues = [];
  const stem = String(q.stem || "").trim();
  const grades = Array.isArray(q.grades) ? q.grades : [];

  if (GRADE_MARKER_RE.test(stem)) {
    for (const gk of grades) {
      const n = parseGk(gk);
      const markers = [
        ["א", 1],
        ["ב", 2],
        ["ג", 3],
        ["ד", 4],
        ["ה", 5],
        ["ו", 6],
      ];
      for (const [heb, gn] of markers) {
        if (stem.includes(`כיתה ${heb}`) && n != null && n !== gn) {
          issues.push({
            code: "grade_marker_mismatch",
            severity: "warn",
            grade: gk,
            detail: `Stem mentions כיתה ${heb} but question tagged ${gk}`,
          });
        }
      }
    }
  }

  for (const gk of grades) {
    const n = parseGk(gk);
    if (n == null) continue;
    const limit = STEM_LEN_LIMITS[gk] ?? 280;
    if (stem.length > limit) {
      issues.push({
        code: "stem_too_long_for_grade",
        severity: n <= 2 ? "fail" : "warn",
        grade: gk,
        detail: `len=${stem.length} limit=${limit}`,
      });
    }
    if (n <= 2) {
      for (const re of ADVANCED_TERMS_G12) {
        if (re.test(stem)) {
          issues.push({
            code: "advanced_term_in_g12",
            severity: "warn",
            grade: gk,
            detail: re.source,
          });
        }
      }
      if (stem.length > G12_STEM_HARD) {
        issues.push({
          code: "g12_stem_advisory_exceeded",
          severity: "warn",
          grade: gk,
          detail: `len=${stem.length}`,
        });
      }
    }
    const cog = String(q.params?.cognitiveLevel || "").toLowerCase();
    if (n <= 2 && (cog === "analysis" || cog === "evaluation")) {
      issues.push({
        code: "high_cognitive_for_g12",
        severity: "warn",
        grade: gk,
        detail: cog,
      });
    }
  }

  return issues;
}

function classifyThinBucket({ grade, topic, level, n }) {
  if (n >= 8) return { launch: "ok", repetition: "ok", label: "מספיק" };
  if (n < 5) {
    return {
      launch: "blocks",
      repetition: "high",
      label: "דל וחוסם launch",
      recommendation: `הוסף ≥${8 - n} שאלות ל-${grade}/${topic}/${level} או הרחב minLevel/maxLevel`,
    };
  }
  if (n <= 6) {
    return {
      launch: "risk",
      repetition: "high",
      label: "דל וגורם לחזרתיות",
      recommendation: `העלה ל-8+ שאלות; בינתיים צפוי חזרה ב-${topic} ${level}`,
    };
  }
  return {
    launch: "advisory",
    repetition: "medium",
    label: "דל אבל סביר",
    recommendation: "מעקב — לא חוסם launch אם שאר הכיתה מכוסה",
  };
}

function statusFromCounts(failCount, warnCount, blockers = 0) {
  if (blockers > 0 || failCount > 0) return "ISSUES_FOUND";
  if (warnCount > 0) return "ISSUES_FOUND";
  return "PASS";
}

async function main() {
  const questions = SCIENCE_QUESTIONS;
  const total = questions.length;

  /** @type {Map<string, object>} */
  const byId = new Map();
  const dupIds = [];
  for (const q of questions) {
    const id = String(q.id || "");
    if (!id) continue;
    if (byId.has(id)) dupIds.push(id);
    else byId.set(id, q);
  }

  const stage2 = {
    byGrade: {},
    structuralFailures: [],
    metadataFailures: [],
    leakFailures: [],
  };

  for (const gk of SCIENCE_GRADE_ORDER) {
    const n = parseGk(gk);
    const allowedTopics = SCIENCE_GRADES[gk]?.topics || [];
    const pool = questions.filter(
      (q) => q.grades.includes(gk) && allowedTopics.includes(q.topic)
    );
    const byTopic = {};
    for (const t of allowedTopics) {
      if (t === "mixed") continue;
      byTopic[t] = pool.filter((q) => q.topic === t).length;
    }
    const byLevel = {};
    for (const lvl of LEVEL_ORDER) {
      byLevel[lvl] = pool.filter((q) => levelAllowed(q, lvl)).length;
    }
    let metaPass = 0;
    let metaFail = 0;
    let structFail = 0;
    for (const q of pool) {
      const mf = metadataRowPass(q);
      if (mf.length === 0) metaPass += 1;
      else {
        metaFail += 1;
        stage2.metadataFailures.push({ id: q.id, grade: gk, codes: mf });
      }
      const sf = structuralPass(q);
      if (sf.length) {
        structFail += 1;
        stage2.structuralFailures.push(...sf.map((s) => ({ ...s, grade: gk })));
      }
    }
    stage2.byGrade[gk] = {
      gradeNumber: n,
      gradeDisplay: SCIENCE_GRADES[gk]?.name,
      questionsPullable: pool.length,
      topics: byTopic,
      byLevel,
      metadataPass: metaPass,
      metadataFail: metaFail,
      structuralFail: structFail,
    };
  }

  const typeCounts = { mcq: 0, true_false: 0, other: 0 };
  for (const q of questions) {
    const t = String(q.type || "mcq").toLowerCase();
    if (t === "mcq") typeCounts.mcq += 1;
    else if (t === "true_false") typeCounts.true_false += 1;
    else typeCounts.other += 1;
  }

  const stage3 = {
    typeCounts,
    issueCounts: {},
    issuesByCode: {},
    trueFalseSamples: [],
    mcqFailExamples: [],
  };

  for (const q of questions) {
    const issues = mcqIssues(q);
    for (const iss of issues) {
      stage3.issueCounts[iss.code] = (stage3.issueCounts[iss.code] || 0) + 1;
      if (!stage3.issuesByCode[iss.code]) stage3.issuesByCode[iss.code] = [];
      if (stage3.issuesByCode[iss.code].length < 5) {
        stage3.issuesByCode[iss.code].push({
          id: q.id,
          topic: q.topic,
          grades: q.grades,
          stem: String(q.stem || "").slice(0, 120),
          options: q.options,
          severity: iss.severity,
          detail: iss.detail,
        });
      }
    }
    if (String(q.type).toLowerCase() === "true_false" && stage3.trueFalseSamples.length < 3) {
      stage3.trueFalseSamples.push({
        id: q.id,
        stem: q.stem,
        options: q.options,
        correctIndex: q.correctIndex,
        runtimeDisplay: "2 buttons via science-mcq-0/1 (no 4-option expansion in science-master.js)",
      });
    }
    const hardFails = issues.filter((i) => i.severity === "fail");
    if (hardFails.length && stage3.mcqFailExamples.length < 15) {
      stage3.mcqFailExamples.push({
        id: q.id,
        codes: hardFails.map((x) => x.code),
        stem: q.stem,
        options: q.options,
      });
    }
  }

  const stage4 = { borderline: [], issueCounts: {} };
  for (const q of questions) {
    const issues = gradeFitIssues(q);
    for (const iss of issues) {
      stage4.issueCounts[iss.code] = (stage4.issueCounts[iss.code] || 0) + 1;
      if (stage4.borderline.length < 20) {
        stage4.borderline.push({
          id: q.id,
          grades: q.grades,
          topic: q.topic,
          stem: q.stem,
          why: iss.detail,
          code: iss.code,
          fixSuggestion:
            iss.code === "stem_too_long_for_grade"
              ? "קצר ניסוח או העבר לכיתה גבוהה יותר"
              : iss.code === "advanced_term_in_g12"
                ? "החלף מונח מתקדם בניסוח יומיומי לג1–ג2"
                : iss.code === "grade_marker_mismatch"
                  ? "הסר 'בכיתה X' מהשאלה או יישר grades[]"
                  : "בדוק cognitiveLevel ואורך מסיחים",
        });
      }
    }
  }

  const thin = [];
  for (const g of SCIENCE_GRADE_ORDER) {
    const topics = (SCIENCE_GRADES[g]?.topics || []).filter((t) => t !== "mixed");
    for (const topic of topics) {
      for (const lvl of LEVEL_ORDER) {
        const n = questions.filter(
          (q) =>
            q.topic === topic &&
            q.grades.includes(g) &&
            levelAllowed(q, lvl)
        ).length;
        if (n > 0 && n < 8) {
          thin.push({ grade: g, topic, level: lvl, count: n, ...classifyThinBucket({ grade: g, topic, level: lvl, n }) });
        }
      }
    }
  }

  const patternFamilies = {};
  for (const q of questions) {
    const pf = q.params?.patternFamily || "(none)";
    if (!patternFamilies[pf]) {
      patternFamilies[pf] = { count: 0, grades: new Set(), ids: [], stems: [] };
    }
    patternFamilies[pf].count += 1;
    for (const gk of q.grades || []) patternFamilies[pf].grades.add(gk);
    if (patternFamilies[pf].ids.length < 3) patternFamilies[pf].ids.push(q.id);
    if (patternFamilies[pf].stems.length < 2) patternFamilies[pf].stems.push(String(q.stem || "").slice(0, 80));
  }

  const stemKeyGroups = {};
  for (const q of questions) {
    const key = buildNearDuplicateStemKey(q);
    if (!stemKeyGroups[key]) stemKeyGroups[key] = [];
    stemKeyGroups[key].push(q.id);
  }
  const nearDupStems = Object.entries(stemKeyGroups)
    .filter(([, ids]) => ids.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  const fpGroups = {};
  for (const q of questions) {
    const fp = buildQuestionFingerprint(q, { subject: "science", topic: q.topic });
    if (!fpGroups[fp]) fpGroups[fp] = [];
    fpGroups[fp].push(q.id);
  }
  const exactDupFp = Object.entries(fpGroups).filter(([, ids]) => ids.length > 1);

  const correctAnswerFreq = {};
  for (const gk of SCIENCE_GRADE_ORDER) {
    correctAnswerFreq[gk] = {};
    for (const q of questions.filter((x) => x.grades.includes(gk))) {
      const ans = normalizeOptionForCompare(q.options?.[q.correctIndex]);
      const k = `${q.topic}|${ans}`;
      correctAnswerFreq[gk][k] = (correctAnswerFreq[gk][k] || 0) + 1;
    }
  }
  const hotCorrectAnswers = [];
  for (const [gk, map] of Object.entries(correctAnswerFreq)) {
    for (const [k, c] of Object.entries(map)) {
      if (c >= 8) hotCorrectAnswers.push({ grade: gk, key: k, count: c });
    }
  }
  hotCorrectAnswers.sort((a, b) => b.count - a.count);

  const patternFamilyIssues = Object.entries(patternFamilies)
    .filter(([, v]) => v.count >= 12)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([pf, v]) => ({
      patternFamily: pf,
      count: v.count,
      grades: [...v.grades].sort(),
      issue: v.count >= 25 ? "cluster_large" : "cluster_moderate",
      examples: v.stems,
      recommendation:
        v.count >= 25
          ? "פזר stems/מסיחים או הוסף variant families"
          : "מעקב חזרתיות — לא חוסם launch",
    }));

  const stage5 = {
    thinBuckets: thin,
    thinSummary: {
      total: thin.length,
      blocksLaunch: thin.filter((t) => t.launch === "blocks").length,
      repetitionRisk: thin.filter((t) => t.repetition === "high").length,
    },
    patternFamilyIssues,
    nearDuplicateStemGroups: nearDupStems.slice(0, 25).map(([key, ids]) => ({
      key,
      count: ids.length,
      sampleIds: ids.slice(0, 5),
    })),
    exactFingerprintDuplicates: exactDupFp.slice(0, 10).map(([fp, ids]) => ({ fp, ids })),
    hotCorrectAnswers: hotCorrectAnswers.slice(0, 20),
  };

  const tfFailCount = stage3.issueCounts.true_false_two_options_runtime || 0;
  const mcqHardFails = Object.entries(stage3.issueCounts).filter(([code]) =>
    ["mcq_option_count_not_4", "duplicate_options", "multiple_correct_options", "banned_option_phrase"].includes(code)
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    totalQuestions: total,
    uniqueIds: byId.size,
    duplicateIds: [...new Set(dupIds)],
    stage2_engine: statusFromCounts(stage2.structuralFailures.length, 0),
    stage2_metadata: statusFromCounts(stage2.metadataFailures.length, 0),
    stage3_mcq: statusFromCounts(
      mcqHardFails.reduce((a, [, c]) => a + c, 0),
      Object.values(stage3.issueCounts).reduce((a, c) => a + c, 0) - tfFailCount
    ),
    stage3_true_false: tfFailCount > 0 ? "ISSUES_FOUND" : "PASS",
    stage4_grade_fit: statusFromCounts(
      Object.values(stage4.issueCounts).reduce((a, c) => a + c, 0),
      0
    ),
    stage5_inventory: stage5.thinSummary.blocksLaunch > 0 ? "ISSUES_FOUND" : "ISSUES_FOUND",
    launchBlockers: [
      ...(stage5.thinSummary.blocksLaunch > 0
        ? [`${stage5.thinSummary.blocksLaunch} thin buckets with count<5`]
        : []),
      ...(stage2.structuralFailures.length ? [`${stage2.structuralFailures.length} structural failures`] : []),
      ...(dupIds.length ? ["duplicate question ids"] : []),
      ...(typeCounts.true_false > 0
        ? [`${typeCounts.true_false} true_false items render as 2-option UI (product inconsistency)`]
        : []),
    ],
    nonBlockingIssues: [
      `${stage5.thinSummary.total} thin buckets (count<8)`,
      `${typeCounts.true_false} true_false two-option displays`,
      `${nearDupStems.length} near-duplicate stem groups`,
      `${Object.keys(stage4.issueCounts).length ? Object.values(stage4.issueCounts).reduce((a, b) => a + b, 0) : 0} grade-fit advisories`,
    ],
  };

  const payload = {
    summary,
    stage2,
    stage3,
    stage4,
    stage5,
    gradeTable: SCIENCE_GRADE_ORDER.map((gk) => ({
      grade: gk,
      display: SCIENCE_GRADES[gk]?.name,
      questions: stage2.byGrade[gk].questionsPullable,
      topicCount: Object.keys(stage2.byGrade[gk].topics).length,
      metadataPass: stage2.byGrade[gk].metadataPass,
      failures: stage2.byGrade[gk].structuralFail + stage2.byGrade[gk].metadataFail,
    })),
    mcqIssueTable: Object.entries(stage3.issueCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([issueType, count]) => ({
        issueType,
        count,
        examples: (stage3.issuesByCode[issueType] || []).slice(0, 2),
        recommendation:
          issueType === "true_false_two_options_runtime"
            ? "המר ל-MCQ 4 אפשרויות או הוסף שני מסיחים הגיוניים"
            : issueType === "mcq_option_count_not_4"
              ? "השלם ל-4 options"
              : issueType === "correct_answer_length_bias"
                ? "איזון אורך מסיחים"
                : "ראה דוגמאות ב-JSON",
      })),
  };

  await mkdir(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, `stages-2-5-${STAMP}.json`);
  const mdPath = join(OUT_DIR, `stages-2-5-${STAMP}.md`);
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const md = [
    `# Science audit — stages 2–5 (${STAMP})`,
    "",
    "## Summary verdicts",
    "",
    `| Area | Status |`,
    `| --- | --- |`,
    `| Engine | ${summary.stage2_engine} |`,
    `| Metadata | ${summary.stage2_metadata} |`,
    `| MCQ / distractors | ${summary.stage3_mcq} |`,
    `| true_false runtime | ${summary.stage3_true_false} |`,
    `| Grade fit | ${summary.stage4_grade_fit} |`,
    `| Repetition / inventory | ${summary.stage5_inventory} |`,
    "",
    "## Grade table (stage 2)",
    "",
    "| כיתה | שאלות | topics | metadata pass | failures |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...payload.gradeTable.map(
      (r) =>
        `| ${r.display} | ${r.questions} | ${r.topicCount} | ${r.metadataPass} | ${r.failures} |`
    ),
    "",
    "## MCQ issues (stage 3)",
    "",
    "| issue type | count | recommendation |",
    "| --- | ---: | --- |",
    ...payload.mcqIssueTable.slice(0, 20).map(
      (r) => `| ${r.issueType} | ${r.count} | ${r.recommendation} |`
    ),
    "",
    "## true_false samples",
    "",
    ...stage3.trueFalseSamples.map(
      (s) =>
        `- **${s.id}**: "${s.stem}" → options: ${JSON.stringify(s.options)} (${s.runtimeDisplay})`
    ),
    "",
    "## Thin buckets (stage 5)",
    "",
    "| grade | topic | level | count | launch | label |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...thin.map(
      (t) =>
        `| ${t.grade} | ${t.topic} | ${t.level} | ${t.count} | ${t.launch} | ${t.label} |`
    ),
    "",
    "## Launch blockers",
    "",
    ...(summary.launchBlockers.length
      ? summary.launchBlockers.map((x) => `- ${x}`)
      : ["- None structural"]),
    "",
    `_Full JSON: ${jsonPath}_`,
  ].join("\n");

  await writeFile(mdPath, md, "utf8");

  console.log(JSON.stringify({ summary, jsonPath, mdPath }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
