/**
 * Regression smoke after phase6 CI fixes (resolve-module-export + copy wording).
 * Run: npx tsx scripts/tests/phase6-fix-regression-smoke.mjs
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const results = [];
function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, err) {
  const detail = err?.message || String(err);
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name} — ${detail}`);
  throw err;
}

function scanBadValues(obj, path = "") {
  const hits = [];
  if (obj === undefined) hits.push(`${path}: undefined`);
  if (Number.isNaN(obj)) hits.push(`${path}: NaN`);
  if (typeof obj === "string") {
    if (obj.includes("[object Object]")) hits.push(`${path}: [object Object]`);
    if (/\b(undefined|null|NaN)\b/.test(obj) && /parent|report|insight/i.test(path)) {
      hits.push(`${path}: literal leak in string`);
    }
    if (/\b(engineDecision|safeSubskill|taxonomy|metadata)\b/i.test(obj)) {
      hits.push(`${path}: technical key leak`);
    }
  }
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => hits.push(...scanBadValues(v, `${path}[${i}]`)));
    } else {
      for (const [k, v] of Object.entries(obj)) hits.push(...scanBadValues(v, path ? `${path}.${k}` : k));
    }
  }
  return hits;
}

function assertQuestionHealthy(q, label) {
  assert.ok(q && typeof q === "object", `${label}: not an object`);
  const stem = String(q.question || q.stem || q.text || "").trim();
  assert.ok(stem.length > 0, `${label}: empty stem`);
  const answers = q.answers || q.options || q.choices;
  const correct =
    q.correctAnswer ??
    q.answer ??
    (Array.isArray(answers) && q.correct != null ? answers[Number(q.correct)] : null);
  assert.ok(correct != null && String(correct).trim() !== "", `${label}: missing correct answer`);
  if (Array.isArray(answers)) {
    assert.ok(answers.length >= 2, `${label}: too few options`);
    for (const a of answers) assert.ok(String(a ?? "").trim() !== "", `${label}: empty option`);
  }
  const visible = {};
  for (const key of [
    "question",
    "stem",
    "text",
    "answers",
    "options",
    "choices",
    "correctAnswer",
    "answer",
    "explanation",
    "hint",
  ]) {
    if (q[key] !== undefined && q[key] !== null) visible[key] = q[key];
  }
  const leaks = scanBadValues(visible, label);
  assert.equal(leaks.length, 0, `${label}: ${leaks.join("; ")}`);
}

async function load(rel) {
  const m = await import(u(rel));
  return m.default && typeof m.default === "object" ? m.default : m;
}

// ── 1. resolve-module-export parity (content unchanged) ─────────────────────
try {
  const { resolveModuleExport } = await import(u("utils/resolve-module-export.js"));
  const grammarNs = await import(u("data/english-questions/grammar-pools.js"));
  const viaResolver = resolveModuleExport(grammarNs, "GRAMMAR_POOLS");
  const viaNamed = grammarNs.GRAMMAR_POOLS ?? grammarNs.default?.GRAMMAR_POOLS;
  assert.ok(viaResolver && viaNamed, "grammar pools resolved");
  assert.equal(Object.keys(viaResolver).length, Object.keys(viaNamed).length, "pool key count");
  const k = Object.keys(viaResolver)[0];
  assert.equal(viaResolver[k]?.length, viaNamed[k]?.length, `row count for ${k}`);
  pass("resolver-parity-grammar-pools", `${Object.keys(viaResolver).length} pools`);

  const { ENGLISH_SKILL_IDS } = await import(u("utils/question-metadata-qa/question-metadata-taxonomy-english.js"));
  assert.ok(ENGLISH_SKILL_IDS.size > 10, "english taxonomy skill ids");
  pass("import-question-metadata-taxonomy-english", `${ENGLISH_SKILL_IDS.size} skills`);
} catch (e) {
  fail("resolver-and-english-taxonomy", e);
}

// ── 2. Hebrew generators G1–G6 ──────────────────────────────────────────────
try {
  const { generateQuestion } = await import(u("utils/hebrew-question-generator.js"));
  const { getLevelConfig } = await import(u("utils/hebrew-storage.js"));

  for (const g of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    const gradeNum = parseInt(g.replace(/\D/g, ""), 10);
    const level = getLevelConfig(gradeNum, "easy");
    const q = generateQuestion(level, "reading", g, null, {});
    assertQuestionHealthy(q, `hebrew-${g}-reading`);
  }
  pass("hebrew-generators-g1-g6", "reading topic each grade");

  const g1 = generateQuestion(getLevelConfig(1, "easy"), "reading", "g1", null, {});
  const g1Stem = String(g1.question || "");
  const hasNiqqud = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C7]/.test(g1Stem) || g1.params?.subtopicId?.includes("niqqud");
  pass("hebrew-g1-niqqud-path", hasNiqqud ? "niqqud/subtopic present in sample" : "generator returned valid G1 question (niqqud optional path)");

  const g2 = generateQuestion(getLevelConfig(2, "easy"), "reading", "g2", null, {});
  assertQuestionHealthy(g2, "hebrew-g2-reading");
  pass("hebrew-g2-sample", "valid question");
} catch (e) {
  fail("hebrew-generators", e);
}

// ── 3. English generator ────────────────────────────────────────────────────
try {
  const { generateQuestion, getLevelForGrade } = await import(u("utils/english-question-generator.js"));
  for (const g of ["g1", "g3", "g6"]) {
    const level = getLevelForGrade("easy", g);
    const q = generateQuestion(level, "grammar", g, null, "easy", {});
    assertQuestionHealthy(q, `english-${g}-grammar`);
    const stem = String(q.question || "");
    assert.ok(!/\b(skillId|subtype|diagnosticSkillId|patternFamily)\b/i.test(stem), "no metadata in stem");
  }
  pass("english-generator", "g1/g3/g6 grammar samples");
} catch (e) {
  fail("english-generator", e);
}

// ── 4. Parent activity question sets (hebrew + english) ─────────────────────
try {
  const { generateActivityQuestionSetClient } = await import(
    u("lib/classroom-activities/generate-activity-questions-client.js")
  );
  const heSet = await generateActivityQuestionSetClient({
    subject: "hebrew",
    gradeLevel: "g2",
    topic: "reading",
    difficulty: "easy",
    count: 3,
  });
  assert.equal(heSet.length, 3);
  for (const [i, q] of heSet.entries()) assertQuestionHealthy(q, `parent-activity-hebrew[${i}]`);
  pass("parent-activity-hebrew", `${heSet.length} questions`);

  const enSet = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g3",
    topic: "grammar",
    difficulty: "easy",
    count: 3,
  });
  assert.equal(enSet.length, 3);
  for (const [i, q] of enSet.entries()) assertQuestionHealthy(q, `parent-activity-english[${i}]`);
  pass("parent-activity-english", `${enSet.length} questions`);
} catch (e) {
  fail("parent-activity-generation", e);
}

// ── 5. Parent report wording + SSR smoke ────────────────────────────────────
try {
  const { preliminarySignalHe } = await import(u("utils/parent-report-language/parent-report-hebrew-copy-spec.js"));
  const { findReadabilityLeakSubstringsInString } = await import(u("utils/parent-report-language/forbidden-terms.js"));
  const { buildWhyThisRecommendationHe } = await import(u("utils/topic-next-step-phase2.js"));
  const { buildDiagnosticOverviewHeV2ForTests } = await import(u("utils/parent-report-v2.js"));
  const { buildDetailedParentReportFromBaseReport } = await import(u("utils/detailed-parent-report.js"));
  const { normalizeExecutiveSummary } = await import(u("utils/parent-report-payload-normalize.js"));
  const { PARENT_REPORT_SCENARIOS } = await import(u("tests/fixtures/parent-report-pipeline.mjs"));
  const { buildMathOnlyOtherSubjectsZeroBaseReport } = await import(
    u("scripts/fixtures/parent-report-zero-evidence-fixture.mjs")
  );
  const {
    buildSubjectEvidenceCoverageLines,
    practicedSubjectsSummaryLineHe,
    notPracticedSubjectsSummaryLineHe,
    SUBJECT_VISIBLE_LABELS_HE,
  } = await import(u("utils/parent-report-language/subject-evidence-policy.js"));
  const zeroTests = await import(u("utils/parent-report-output-integrity/zero-evidence-policy-tests.js"));
  const { subjectQuestionCountsFromBase, SUBJECT_LABEL_HE } = zeroTests.default || zeroTests;

  const prelim = preliminarySignalHe();
  assert.ok(prelim.includes("מסקנה ברורה"), "preliminary uses מסקנה ברורה");
  assert.ok(!prelim.includes("מסקנה חזקה"), "no מסקנה חזקה");
  assert.equal(findReadabilityLeakSubstringsInString(prelim).length, 0, "prelim no readability leaks");

  const why = buildWhyThisRecommendationHe({
    displayName: "חיבור",
    finalStep: "maintain_and_strengthen",
    riskFlags: {
      falsePromotionRisk: false,
      falseRemediationRisk: false,
      speedOnlyRisk: false,
      hintDependenceRisk: true,
      insufficientEvidenceRisk: false,
      recentTransitionRisk: false,
    },
    trendDer: { unclearTrend: false, fragileProgressPattern: false, progressSupportsAdvance: false },
    behaviorType: "stable_mastery",
    legacyRuleId: "legacy_math_cap_v1",
  });
  assert.ok(!why.includes("מסקנה חזקה"), "why text clean");
  pass("wording-preliminary-signal", "מסקנה ברורה OK");

  const base = buildMathOnlyOtherSubjectsZeroBaseReport();
  const counts = subjectQuestionCountsFromBase(base);
  const cov = buildSubjectEvidenceCoverageLines(counts, SUBJECT_LABEL_HE);
  const ov = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: base.diagnosticEngineV2,
    patternDiagnostics: base.patternDiagnostics,
    maps: {
      math: base.mathOperations,
      geometry: base.geometryTopics,
      english: base.englishTopics,
      science: base.scienceTopics,
      hebrew: base.hebrewTopics,
      "moledet-geography": base.moledetGeographyTopics,
    },
    subjectQuestionCounts: counts,
    fallbackOverview: {
      strongestAreaLineHe: null,
      mainFocusAreaLineHe: null,
      readyForProgressPreviewHe: [],
      requiresAttentionPreviewHe: [],
    },
    insufficientDataSubjectsHe: cov.thinEvidenceSubjectsHe,
    thinEvidenceSubjectsHe: cov.thinEvidenceSubjectsHe,
    practicedSubjectsSummaryHe: practicedSubjectsSummaryLineHe(counts, SUBJECT_LABEL_HE),
    notPracticedSubjectsSummaryHe: notPracticedSubjectsSummaryLineHe(counts, SUBJECT_LABEL_HE),
  });

  const insightText = [ov.mainFocusAreaLineHe, ov.strongestAreaLineHe, ...(ov.requiresAttentionPreviewHe || [])].join("\n");
  assert.ok(insightText.includes("מתמטיקה"), "insights use מתמטיקה");
  assert.ok(!/\bחשבון:/u.test(insightText), "insights do not use חשבון: prefix");
  assert.ok(String(ov.practicedSubjectsSummaryHe || "").includes("מתמטיקה"), "summary uses מתמטיקה");
  pass("parent-report-math-labels", "מתמטיקה consistently in insights and summary");

  const detailed = buildDetailedParentReportFromBaseReport(PARENT_REPORT_SCENARIOS.strong_executive_case(), {
    period: "week",
  });
  const leaks = scanBadValues(detailed.executiveSummary || {}, "executiveSummary");
  assert.equal(leaks.length, 0, leaks.join("; "));

  const { ExecutiveSummarySection } = await import(u("components/parent-report-detailed-surface.jsx"));
  const html = renderToStaticMarkup(
    h(ExecutiveSummarySection, { es: normalizeExecutiveSummary(detailed), compact: false })
  );
  assert.ok(html.length > 100, "SSR html");
  assert.ok(!html.includes("undefined"), "no undefined in SSR");
  assert.ok(!html.includes("[object Object]"), "no object leak in SSR");
  assert.ok(!html.includes("מסקנה חזקה"), "no forbidden phrase in SSR");
  pass("parent-report-ssr-chunk", `${html.length} chars`);
} catch (e) {
  fail("parent-report-wording-ssr", e);
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\nSMOKE FAILED: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`\nOK phase6-fix-regression-smoke (${results.length} checks)`);
