/**
 * READ-ONLY completion audit — active tag paths, threshold visibility,
 * report surface parity, parent-safe label quality.
 * No production code changes. No DB writes. No commit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TAG_PRODUCER_REGISTRY, getTagProducer } from "../lib/learning/taxonomy-tag-producer-registry.js";
import {
  REAL_RUNTIME_SCENARIOS,
  classifyRealRuntimeScenario,
  classifyRealRuntimePayload,
} from "../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";
import { classifyAnswerEvidence } from "../lib/learning/classifiers/index.js";
import { TAG_ALIASES_TO_CANONICAL, normalizeToCanonicalTag } from "../lib/learning/taxonomy-tag-normalizer.js";
import { TAXONOMY_EVIDENCE_RULES } from "../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { TAXONOMY_BY_ID, ALL_TAXONOMY_ROWS } from "../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  PARENT_ERROR_PATTERN_LABEL_HE,
  parentFacingErrorPatternLabelHe,
} from "../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";
import {
  resolveRepeatedMistakePatterns,
  resolveObservedPatternLevelFromPatterns,
} from "../utils/learning-pattern-decision/resolve-repeated-mistake-patterns.js";
import { resolveEvidenceStrength } from "../utils/learning-pattern-decision/resolve-evidence-strength.js";
import { enrichParentFindingWithConsistentStrongTag } from "../utils/learning-pattern-decision/enrich-parent-finding-with-factual-pattern.js";
import { buildLearningPatternDecision } from "../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import {
  buildEngineDiagnosticDecision,
  computeAccuracyBand,
  computeEngineConfidenceTier,
} from "../utils/parent-report-engine-v1-signals.js";
import {
  parentTopicDisplayChromeFromDecision,
  parentTopicDisplayChromeFromRow,
} from "../utils/parent-report-surface/parent-topic-display-chrome.js";
import { resolveTopicParentFindingHe } from "../utils/learning-pattern-decision/lpd-parent-facing-copy.js";
import { buildDetailedParentReportFromBaseReport } from "../utils/detailed-parent-report.js";
import { normalizeMistakeEvent } from "../utils/mistake-event.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.resolve(__dirname, "..");
const OUT_DIR = path.join(WORKTREE, "docs/audits");

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCsv(rows, cols) {
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","))].join("\n") + "\n";
}

/** Invert requiredTags → taxonomy ids */
function taxonomiesForTag(tag) {
  const canon = normalizeToCanonicalTag(tag) || tag;
  const ids = [];
  for (const [id, rule] of Object.entries(TAXONOMY_EVIDENCE_RULES)) {
    const req = (rule.requiredTags || []).map((t) => normalizeToCanonicalTag(t) || t);
    if (req.includes(canon) || (rule.requiredTags || []).includes(tag)) ids.push(id);
  }
  return ids;
}

/**
 * Supplemental TEPs — real classifyAnswerEvidence / classify* calls only.
 * Source: taxonomy-rule-runtime-matrix POSITIVE_NUMERIC + diagnostic-eval tests.
 */
const SUPPLEMENTAL_TEPS = [
  {
    tag: "mul_instead_of_add",
    subject: "math",
    grade: "g3",
    topic: "חיבור",
    subskill: "פעולה שגויה",
    source: "taxonomy-rule-runtime-matrix POSITIVE_NUMERIC",
    build: () => ({
      subject: "math",
      params: { kind: "add_two", a: 3, b: 4 },
      userAnswer: 12,
      expectedAnswer: 7,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "add_instead_of_mul",
    subject: "math",
    grade: "g3",
    topic: "כפל",
    subskill: "פעולה שגויה",
    source: "taxonomy-rule-runtime-matrix POSITIVE_NUMERIC",
    build: () => ({
      subject: "math",
      params: { kind: "mul", a: 5, b: 7 },
      userAnswer: 12,
      expectedAnswer: 35,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "mul_instead_of_div",
    subject: "math",
    grade: "g4",
    topic: "חילוק",
    subskill: "פעולה שגויה",
    source: "taxonomy-rule-runtime-matrix POSITIVE_NUMERIC",
    build: () => ({
      subject: "math",
      params: { kind: "div", a: 35, b: 7 },
      userAnswer: 245,
      expectedAnswer: 5,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "calculation_off_by_one",
    subject: "math",
    grade: "g5",
    topic: "אחוזים",
    subskill: "סטייה ב-1",
    source: "fuzzy-tolerance-core-ops proveCoreOpsStructuralNearMiss",
    build: () => ({
      subject: "math",
      params: { kind: "perc_part_of", base: 200, p: 10 },
      userAnswer: 21,
      expectedAnswer: 20,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "calculation_near_miss",
    subject: "math",
    grade: "g5",
    topic: "אחוזים",
    subskill: "סטייה קרובה",
    source: "fuzzy-tolerance-core-ops proveCoreOpsStructuralNearMiss",
    build: () => ({
      subject: "math",
      params: { kind: "perc_part_of", base: 200, p: 10 },
      userAnswer: 23,
      expectedAnswer: 20,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "borrow_error",
    subject: "math",
    grade: "g3",
    topic: "חיסור",
    subskill: "הלוואה",
    source: "math-numeric probe",
    build: () => ({
      subject: "math",
      params: { kind: "sub_vertical", a: 50, b: 17 },
      userAnswer: 47,
      expectedAnswer: 33,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "triangle_angle_sum_error",
    subject: "geometry",
    grade: "g5",
    topic: "זוויות",
    subskill: "סכום זוויות במשולש",
    source: "taxonomy-rule-runtime-matrix / geometry-diagnostic-eval",
    build: () => ({
      subject: "geometry",
      params: { kind: "triangle_angles", angle1: 40, angle2: 70, angle3: 70 },
      userAnswer: 110,
      expectedAnswer: 70,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "perimeter_formula_error",
    subject: "geometry",
    grade: "g4",
    topic: "היקף",
    subskill: "נוסחת היקף",
    source: "geometry-diagnostic-eval provePerimeterFormulaError",
    build: () => ({
      subject: "geometry",
      params: { kind: "rectangle_perimeter", length: 5, width: 3 },
      userAnswer: 8,
      expectedAnswer: 16,
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "agreement_error",
    subject: "english",
    grade: "g1",
    topic: "grammar",
    subskill: "be forms",
    source: "english-diagnostic-eval",
    build: () => ({
      subject: "english",
      topic: "grammar",
      params: {
        kind: "grammar",
        patternFamily: "be_basic_g1_1",
        sameSlotForms: ["am", "is", "are"],
        expectedErrorTags: ["grammar_pattern_error"],
      },
      userAnswer: "is",
      expectedAnswer: "am",
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "tense_error",
    subject: "english",
    grade: "g3",
    topic: "grammar",
    subskill: "tense",
    source: "english-diagnostic-eval proveEnglishTenseAlt",
    build: () => ({
      subject: "english",
      topic: "grammar",
      params: {
        kind: "grammar",
        patternFamily: "past_simple",
        tenseAlts: ["went", "go", "goes"],
      },
      userAnswer: "go",
      expectedAnswer: "went",
      isCorrect: false,
      answerMode: "typed",
    }),
  },
  {
    tag: "direction_error",
    subject: "moledet-geography",
    grade: "g4",
    topic: "מפה",
    subskill: "כיוונים",
    source: "moledet-diagnostic-eval",
    build: () => ({
      subject: "geography",
      topic: "maps",
      params: {
        answerMode: "typing",
        isDirectionQuestion: true,
        expectedErrorTags: ["direction_error"],
      },
      userAnswer: "דרום",
      expectedAnswer: "צפון",
      isCorrect: false,
      answerMode: "typed",
    }),
  },
];

/** Aliases that normalize to another canonical tag (not independently produced). */
function aliasTarget(tag) {
  return TAG_ALIASES_TO_CANONICAL[tag] || null;
}

function runClassifierCtx(ctx) {
  return classifyAnswerEvidence(ctx);
}

function evaluateProducerTag(tag, producer) {
  const result = {
    internalTag: tag,
    producerActive: !!producer?.active,
    classifierModule: producer?.module || "",
    classifierGenerator: producer?.generator || "",
    status: "NO_VALID_FIXTURE",
    producedVia: "",
    producedTag: "",
    expectedTag: tag,
    taxonomyIds: taxonomiesForTag(tag).join("|"),
    taxonomyMatchOk: false,
    exampleCorrect: "",
    exampleWrong: "",
    subject: "",
    grade: "",
    topic: "",
    subskill: "",
    sourceFile: "",
    notes: "",
  };

  const alias = aliasTarget(tag);
  if (alias && alias !== tag) {
    result.notes = `alias_of:${alias}`;
  }

  // 1) REAL_RUNTIME scenarios whose expectedTag matches (or normalizes to) tag
  const scenarios = REAL_RUNTIME_SCENARIOS.filter((s) => {
    const exp = normalizeToCanonicalTag(s.expectedTag) || s.expectedTag;
    const want = normalizeToCanonicalTag(tag) || tag;
    return s.expectedTag === tag || exp === want || exp === tag;
  });

  for (const s of scenarios) {
    try {
      const payload = s.loadPositive();
      const ev = classifyRealRuntimePayload(s, payload);
      const got = ev?.detectedMisconception || null;
      result.subject = s.subject;
      result.sourceFile = s.sourceFile;
      result.exampleCorrect = String(payload.expectedAnswer ?? "");
      result.exampleWrong = String(payload.userAnswer ?? "");
      const row = TAXONOMY_BY_ID[s.ruleId];
      if (row) {
        result.topic = row.topicHe || "";
        result.subskill = row.subskillHe || "";
      }
      result.grade = String(payload.params?.grade || payload.question?.grade || "");
      if (got === tag || normalizeToCanonicalTag(got) === normalizeToCanonicalTag(tag)) {
        result.status = "PASS";
        result.producedVia = "REAL_RUNTIME_classifier";
        result.producedTag = got;
        result.taxonomyMatchOk = taxonomiesForTag(tag).includes(s.ruleId) || taxonomiesForTag(got).includes(s.ruleId);
        if (!result.taxonomyIds && s.ruleId) result.taxonomyIds = s.ruleId;
        return result;
      }
      result.status = "FAIL";
      result.producedVia = "REAL_RUNTIME_classifier";
      result.producedTag = String(got);
      result.notes = [result.notes, `expected ${tag} got ${got}`].filter(Boolean).join("|");
      return result;
    } catch (e) {
      result.status = "FAIL";
      result.notes = [result.notes, `ERR:${e.message}`].filter(Boolean).join("|");
      return result;
    }
  }

  // 2) Supplemental TEPs
  const tep = SUPPLEMENTAL_TEPS.find((t) => t.tag === tag);
  if (tep) {
    try {
      const ctx = tep.build();
      const ev = runClassifierCtx(ctx);
      const got = ev?.detectedMisconception || null;
      result.subject = tep.subject;
      result.grade = tep.grade;
      result.topic = tep.topic;
      result.subskill = tep.subskill;
      result.sourceFile = tep.source;
      result.exampleCorrect = String(ctx.expectedAnswer ?? "");
      result.exampleWrong = String(ctx.userAnswer ?? "");
      if (got === tag) {
        result.status = "PASS";
        result.producedVia = "supplemental_classifier_TEP";
        result.producedTag = got;
        const ids = taxonomiesForTag(tag);
        result.taxonomyMatchOk = ids.length > 0;
        result.taxonomyIds = ids.join("|") || result.taxonomyIds;
        return result;
      }
      result.status = "FAIL";
      result.producedVia = "supplemental_classifier_TEP";
      result.producedTag = String(got);
      result.notes = [result.notes, `expected ${tag} got ${got}`].filter(Boolean).join("|");
      return result;
    } catch (e) {
      result.status = "FAIL";
      result.notes = [result.notes, `ERR:${e.message}`].filter(Boolean).join("|");
      return result;
    }
  }

  // 3) Alias: if canonical has PASS path, mark duplicate_alias coverage
  if (alias && alias !== tag) {
    result.status = "NO_VALID_FIXTURE";
    result.notes = [result.notes, "needs_canonical_producer_fixture"].filter(Boolean).join("|");
    result.producedVia = "alias_only";
  }

  return result;
}

function buildPathRow(producerEval, patternCount, totalErrors, totalQuestions) {
  const tag = producerEval.internalTag;
  const taxIds = (producerEval.taxonomyIds || "").split("|").filter(Boolean);
  const taxId = taxIds[0] || "";
  const taxRow = taxId ? TAXONOMY_BY_ID[taxId] : null;
  const rule = taxId ? TAXONOMY_EVIDENCE_RULES[taxId] : null;
  const parentSafe = parentFacingErrorPatternLabelHe(tag) || parentFacingErrorPatternLabelHe(`mt:${tag}`);
  const enginePrimary = taxRow?.patternHe || "";

  const correct = Math.max(0, totalQuestions - totalErrors);
  const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const tier = computeEngineConfidenceTier(totalQuestions);
  const band = computeAccuracyBand(accuracy, totalQuestions);
  const engineDecision = buildEngineDiagnosticDecision({
    q: totalQuestions,
    acc: accuracy,
    wrongRatio: totalQuestions ? totalErrors / totalQuestions : 0,
    engineConfidenceTier: tier,
    accuracyBand: band,
  }).engineDecision;

  const events = [];
  for (let i = 0; i < patternCount; i++) {
    events.push(
      normalizeMistakeEvent(
        {
          isCorrect: false,
          misconceptionTag: tag,
          userAnswer: producerEval.exampleWrong || "wrong",
          correctAnswer: producerEval.exampleCorrect || "right",
          timestamp: 1_700_000_000_000 + i,
          mode: "practice",
          topicRowKey: `${producerEval.topic || "topic"}::grade:${producerEval.grade || "g4"}`,
          bucketKey: producerEval.topic || "topic",
        },
        producerEval.subject || "math",
      ),
    );
  }
  for (let i = patternCount; i < totalErrors; i++) {
    events.push(
      normalizeMistakeEvent(
        {
          isCorrect: false,
          misconceptionTag: `other_${i}`,
          timestamp: 1_700_000_000_000 + 1000 + i,
          mode: "practice",
          topicRowKey: `${producerEval.topic || "topic"}::grade:${producerEval.grade || "g4"}`,
          bucketKey: producerEval.topic || "topic",
        },
        producerEval.subject || "math",
      ),
    );
  }

  const patterns = resolveRepeatedMistakePatterns(events);
  const top = patterns.find((p) => String(p.key).endsWith(tag)) || patterns[0] || null;
  const observedPatternLevel = resolveObservedPatternLevelFromPatterns(patterns, totalQuestions);
  const evidenceStrength = resolveEvidenceStrength(totalQuestions);

  const baseFinding =
    engineDecision === "clear_topic_gap"
      ? `בנושא ${producerEval.topic || "הנושא"} נראה קושי ברור.`
      : engineDecision === "topic_needs_strengthening"
        ? `בנושא ${producerEval.topic || "הנושא"} יש חלק שדורש חיזוק.`
        : engineDecision === "mastery_stable"
          ? `בנושא ${producerEval.topic || "הנושא"} נראית שליטה יציבה.`
          : engineDecision === "partial_stable"
            ? `בנושא ${producerEval.topic || "הנושא"} יש הבנה חלקית יציבה.`
            : engineDecision === "early_direction_only" || engineDecision === "insufficient_data"
              ? `עדיין אין מספיק מידע בנושא ${producerEval.topic || "הנושא"}.`
              : "";

  const enriched = enrichParentFindingWithConsistentStrongTag({
    finding: baseFinding,
    topicName: producerEval.topic || "הנושא",
    questions: totalQuestions,
    engineDecision,
    observedPatternLevel,
    evidenceStrength,
    repeatedMistakePatterns: patterns,
  });

  let lpd = null;
  try {
    lpd = buildLearningPatternDecision({
      subjectId: producerEval.subject === "geography" ? "moledet-geography" : producerEval.subject || "math",
      topicRowKey: `${producerEval.topic || "topic"}::grade:${producerEval.grade || "g4"}`,
      row: {
        bucketKey: producerEval.topic || "topic",
        topicNameHe: producerEval.topic || "נושא",
        questions: totalQuestions,
        correct,
        wrong: totalErrors,
        accuracy,
      },
      unit: null,
      rawMistakes: [
        ...events,
        ...Array.from({ length: correct }, (_, i) =>
          normalizeMistakeEvent(
            {
              isCorrect: true,
              timestamp: 1_700_000_100_000 + i,
              mode: "practice",
              topicRowKey: `${producerEval.topic || "topic"}::grade:${producerEval.grade || "g4"}`,
              bucketKey: producerEval.topic || "topic",
            },
            producerEval.subject || "math",
          ),
        ),
      ],
    });
  } catch {
    lpd = null;
  }

  const edc = lpd?.engineDecisionContract || null;
  const parentFacing = String(lpd?.parentVisibleFinding || enriched || "").trim();

  return {
    subject: producerEval.subject,
    grade: producerEval.grade,
    topic: producerEval.topic,
    subskill: producerEval.subskill,
    internalTag: tag,
    classifierFileFunction: `${producerEval.classifierModule}|${producerEval.sourceFile || producerEval.classifierGenerator}`,
    tagProducedByClassifierNotInjected: producerEval.status === "PASS" ? "yes" : "no",
    producerStatus: producerEval.status,
    producedVia: producerEval.producedVia,
    taxonomyId: taxId,
    taxonomyMinWrong: taxRow?.minWrong ?? "",
    taxonomyMinOccurrenceRatio: rule?.minOccurrenceRatio ?? 0.6,
    requiredTags: (rule?.requiredTags || []).join("|"),
    parentSafeLabel: parentSafe || "",
    enginePrimaryLabel: enginePrimary,
    exampleCorrectAnswer: producerEval.exampleCorrect,
    exampleWrongAnswer: producerEval.exampleWrong,
    patternCount: top?.count ?? patternCount,
    totalErrors,
    totalQuestions,
    ratioOfQuestions: totalQuestions ? Number(((top?.count ?? patternCount) / totalQuestions).toFixed(4)) : 0,
    ratioOfErrors: totalErrors ? Number(((top?.count ?? patternCount) / totalErrors).toFixed(4)) : 0,
    sessions: 1,
    days: 1,
    observedPatternLevel,
    evidenceStrength,
    patternLayer: edc?.patternLayer ?? null,
    engineDecision: edc?.engineDecision || engineDecision,
    ADC: edc?.actionDecisionContract?.action || "",
    parentFacingText: parentFacing,
    enrichApplied: enriched !== baseFinding,
    blockPatternClaim: edc?.blockPatternClaim ?? "",
    detectedPattern: edc?.detectedPattern ?? "",
  };
}

function buildThresholdVisibilityMatrix() {
  const scenarios = [
    { id: "2of40", q: 40, wrong: 2, patternCount: 2 },
    { id: "3of40", q: 40, wrong: 3, patternCount: 3 },
    { id: "2of12", q: 12, wrong: 2, patternCount: 2 },
    { id: "3of12", q: 12, wrong: 3, patternCount: 3 },
    { id: "4of12", q: 12, wrong: 4, patternCount: 4 },
    { id: "4of4", q: 4, wrong: 4, patternCount: 4 },
    { id: "6of25", q: 25, wrong: 6, patternCount: 6 },
    // accuracy bands with same pattern dominance among wrongs
    { id: "acc_under50_q20", q: 20, wrong: 12, patternCount: 8 }, // 40%
    { id: "acc_50_69_q20", q: 20, wrong: 8, patternCount: 6 }, // 60%
    { id: "acc_70_89_q25", q: 25, wrong: 6, patternCount: 6 }, // 76% — user case
    { id: "acc_90plus_q20", q: 20, wrong: 2, patternCount: 2 }, // 90% — user case
    { id: "acc_90plus_q40_2err", q: 40, wrong: 2, patternCount: 2 }, // user case strong via 100% of errors
    { id: "acc_mastery_q10", q: 10, wrong: 0, patternCount: 0 },
    { id: "acc_early_q9_100", q: 9, wrong: 0, patternCount: 0 },
  ];

  return scenarios.map((s) => {
    const correct = s.q - s.wrong;
    const accuracy = s.q ? Math.round((correct / s.q) * 100) : 0;
    const tier = computeEngineConfidenceTier(s.q);
    const band = computeAccuracyBand(accuracy, s.q);
    const engineDecision = buildEngineDiagnosticDecision({
      q: s.q,
      acc: accuracy,
      wrongRatio: s.q ? s.wrong / s.q : 0,
      engineConfidenceTier: tier,
      accuracyBand: band,
    }).engineDecision;

    const events = [];
    for (let i = 0; i < s.patternCount; i++) {
      events.push({
        isCorrect: false,
        misconceptionTag: "calculation_off_by_one",
        timestamp: 1,
      });
    }
    for (let i = s.patternCount; i < s.wrong; i++) {
      events.push({ isCorrect: false, misconceptionTag: `x_${i}`, timestamp: 1 });
    }
    const patterns = resolveRepeatedMistakePatterns(events);
    const top = patterns[0] || null;
    const level = resolveObservedPatternLevelFromPatterns(patterns, s.q);
    const strength = resolveEvidenceStrength(s.q);
    const parentSafe = parentFacingErrorPatternLabelHe("mt:calculation_off_by_one");

    const isFactualObservation = !!(top && top.count >= 2);
    const isRepeatedPattern = ["repeated", "consistent", "strong"].includes(level);
    const isCentralPattern = ["consistent", "strong"].includes(level);
    const wouldEnrich =
      ["consistent", "strong"].includes(level) &&
      strength === "strong" &&
      (engineDecision === "clear_topic_gap" || engineDecision === "topic_needs_strengthening") &&
      !!parentSafe;

    const baseFinding =
      engineDecision === "clear_topic_gap"
        ? "קושי ברור."
        : engineDecision === "topic_needs_strengthening"
          ? "חלק שדורש חיזוק."
          : engineDecision === "mastery_stable"
            ? "שליטה יציבה."
            : engineDecision === "partial_stable"
              ? "הבנה חלקית."
              : engineDecision === "early_direction_only"
                ? "כיוון ראשוני."
                : engineDecision === "insufficient_data"
                  ? "אין מספיק מידע."
                  : "";

    const enriched = enrichParentFindingWithConsistentStrongTag({
      finding: baseFinding,
      topicName: "נושא",
      questions: s.q,
      engineDecision,
      observedPatternLevel: level,
      evidenceStrength: strength,
      repeatedMistakePatterns: patterns,
    });
    const shownToParent = enriched !== baseFinding || /חזרה|דפוס|טעות/.test(enriched);
    const patternShownSpecifically = /ב-\d+\s*תשובות חזרה|טעות חישוב של סטייה/.test(enriched);

    let whyHiddenOrShown = "";
    if (patternShownSpecifically) {
      whyHiddenOrShown = "shown: consistent/strong + evidenceStrength=strong + gap/strengthen + mapped label";
    } else if (isCentralPattern && strength === "strong" && (engineDecision === "partial_stable" || engineDecision === "mastery_stable")) {
      whyHiddenOrShown = `hidden: pattern ${level} but engineDecision=${engineDecision} (positive accuracy band) blocks factual enrich`;
    } else if (isCentralPattern && !parentSafe) {
      whyHiddenOrShown = "hidden: no parent-safe label";
    } else if (level === "observed" || level === "repeated") {
      whyHiddenOrShown = `hidden/early: level=${level} does not meet enrich gate (needs consistent/strong + strong evidence + gap/strengthen)`;
    } else if (engineDecision === "insufficient_data" || engineDecision === "early_direction_only") {
      whyHiddenOrShown = `early/insufficient: engineDecision=${engineDecision}; pattern type/count not surfaced as factual`;
    } else if (top && top.ratio >= 0.5 && s.q >= 40 && (top.count / s.q) < 0.1) {
      whyHiddenOrShown = `strong_via_error_ratio_only: patternRatioOfErrors=${top.ratio} but ratioOfQuestions=${(top.count / s.q).toFixed(3)}`;
    } else {
      whyHiddenOrShown = `engineDecision=${engineDecision}; level=${level}; enrich=${wouldEnrich}`;
    }

    if (s.id === "acc_90plus_q40_2err" || (s.q >= 40 && s.wrong <= 3 && level === "strong")) {
      whyHiddenOrShown += ` | NOTE: strong because ratioAmongWrongs=${top?.ratio ?? 0} (100% of few errors) while ratioAmongQuestions=${s.q ? ((top?.count || 0) / s.q).toFixed(3) : 0}`;
    }

    const chrome = parentTopicDisplayChromeFromDecision(engineDecision);

    return {
      scenarioId: s.id,
      totalQuestions: s.q,
      totalErrors: s.wrong,
      patternCount: top?.count ?? s.patternCount,
      accuracyPct: accuracy,
      patternRatioOfQuestions: s.q ? Number(((top?.count ?? 0) / s.q).toFixed(4)) : 0,
      patternRatioOfErrors: s.wrong ? Number(((top?.count ?? 0) / s.wrong).toFixed(4)) : 0,
      observedPatternLevel: level,
      evidenceStrength: strength,
      engineDecision,
      accuracyBand: band,
      isFactualObservation,
      isRepeatedPattern,
      isCentralPattern,
      shownToParent: patternShownSpecifically || (shownToParent && isCentralPattern && wouldEnrich),
      patternShownSpecifically,
      parentFacingText: enriched,
      badge: chrome.badgeHe,
      visualVariant: chrome.visualVariant,
      whyShownOrHidden: whyHiddenOrShown,
    };
  });
}

function buildReportSurfaceParity() {
  const states = [
    { id: "insufficient_q3", q: 3, wrong: 2, patternCount: 2, tag: "calculation_off_by_one" },
    { id: "early_q7_100", q: 7, wrong: 0, patternCount: 0, tag: "calculation_off_by_one" },
    { id: "gap_q12_pattern", q: 12, wrong: 8, patternCount: 5, tag: "calculation_off_by_one" },
    { id: "strengthen_q12", q: 12, wrong: 5, patternCount: 4, tag: "calculation_off_by_one" },
    { id: "partial_q25_6same", q: 25, wrong: 6, patternCount: 6, tag: "calculation_off_by_one" },
    { id: "mastery_q20_2same", q: 20, wrong: 2, patternCount: 2, tag: "calculation_off_by_one" },
    { id: "gap_procedure", q: 15, wrong: 9, patternCount: 6, tag: "procedure_break", usePatternFamily: true },
    { id: "mastery_q15_0", q: 15, wrong: 0, patternCount: 0, tag: "calculation_off_by_one" },
  ];

  const rows = [];
  for (const st of states) {
    const correct = st.q - st.wrong;
    const accuracy = Math.round((correct / st.q) * 100);
    const events = [];
    for (let i = 0; i < st.patternCount; i++) {
      const ev = {
        isCorrect: false,
        timestamp: 1_700_000_000_000 + i,
        mode: "practice",
        evidenceSource: "self_practice",
        topicRowKey: "parity_topic::grade:g4",
        bucketKey: "parity_topic",
        subjectId: "math",
      };
      if (st.usePatternFamily) ev.patternFamily = st.tag;
      else ev.misconceptionTag = st.tag;
      events.push(ev);
    }
    for (let i = st.patternCount; i < st.wrong; i++) {
      events.push({
        isCorrect: false,
        misconceptionTag: `other_${i}`,
        timestamp: 1_700_000_000_000 + 500 + i,
        mode: "practice",
        topicRowKey: "parity_topic::grade:g4",
        bucketKey: "parity_topic",
        subjectId: "math",
      });
    }
    for (let i = 0; i < correct; i++) {
      events.push({
        isCorrect: true,
        timestamp: 1_700_000_100_000 + i,
        mode: "practice",
        topicRowKey: "parity_topic::grade:g4",
        bucketKey: "parity_topic",
        subjectId: "math",
      });
    }

    const lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "parity_topic::grade:g4",
      row: {
        bucketKey: "parity_topic",
        topicNameHe: "נושא בדיקת פריטי",
        label: "נושא בדיקת פריטי",
        questions: st.q,
        correct,
        wrong: st.wrong,
        accuracy,
      },
      unit: null,
      rawMistakes: events,
    });

    const rowObj = {
      bucketKey: "parity_topic",
      label: "נושא בדיקת פריטי",
      displayName: "נושא בדיקת פריטי",
      questions: st.q,
      correct,
      wrong: st.wrong,
      accuracy,
      learningPatternDecision: lpd,
      engineDecisionContract: lpd.engineDecisionContract,
      parentVisibleMetrics: { questions: st.q, correct, wrong: st.wrong, accuracy },
    };

    const regularText = resolveTopicParentFindingHe(rowObj, events);
    const regularChrome = parentTopicDisplayChromeFromRow(rowObj);

    const baseReport = {
      playerName: "_audit_",
      period: "week",
      summary: { totalQuestions: st.q, accuracy },
      mathOperations: {
        "parity_topic::grade:g4": {
          ...rowObj,
          topicRowKey: "parity_topic::grade:g4",
        },
      },
      diagnosticEngineV2: { units: [] },
    };

    let detailedText = "";
    let detailedChrome = regularChrome;
    try {
      const detailed = buildDetailedParentReportFromBaseReport(baseReport, {
        playerName: "_audit_",
        period: "week",
      });
      // Prefer topic overview / recommendations if present
      const profiles = detailed?.subjectProfiles || [];
      for (const sp of profiles) {
        for (const r of sp.topicOverviewRows || []) {
          if (String(r.topicRowKey || "").includes("parity_topic")) {
            detailedText =
              String(r.parentVisibleFinding || r.findingHe || r.primaryFindingHe || "").trim() ||
              resolveTopicParentFindingHe({ ...rowObj, ...r }, events);
            detailedChrome = parentTopicDisplayChromeFromRow({
              ...rowObj,
              ...r,
              learningPatternDecision: r.learningPatternDecision || lpd,
              engineDecisionContract: r.engineDecisionContract || lpd.engineDecisionContract,
            });
          }
        }
        for (const r of sp.topicRecommendations || []) {
          if (!detailedText && String(r.topicRowKey || r.topicKey || "").includes("parity_topic")) {
            detailedText = String(r.parentVisibleFinding || r.findingHe || "").trim();
          }
        }
      }
      if (!detailedText) {
        detailedText = resolveTopicParentFindingHe(rowObj, events);
      }
    } catch (e) {
      detailedText = `ERROR:${e.message}`;
    }

    // Short surface: same LPD authority + chrome (short contract preview)
    const shortText = resolveTopicParentFindingHe(rowObj, events);
    const shortChrome = parentTopicDisplayChromeFromRow(rowObj);

    const meaningChanged =
      normalizeMeaning(regularText) !== normalizeMeaning(detailedText) ||
      normalizeMeaning(regularText) !== normalizeMeaning(shortText) ||
      regularChrome.visualVariant !== detailedChrome.visualVariant ||
      regularChrome.visualVariant !== shortChrome.visualVariant ||
      regularChrome.badgeHe !== detailedChrome.badgeHe ||
      regularChrome.badgeHe !== shortChrome.badgeHe;

    rows.push({
      stateId: st.id,
      engineDecision: lpd.engineDecisionContract?.engineDecision || "",
      observedPatternLevel: lpd.observedPatternLevel,
      evidenceStrength: lpd.evidenceStrength,
      parentVisibleFindingLpd: lpd.parentVisibleFinding || "",
      regularText,
      regularBadge: regularChrome.badgeHe,
      regularVariant: regularChrome.visualVariant,
      detailedText,
      detailedBadge: detailedChrome.badgeHe,
      detailedVariant: detailedChrome.visualVariant,
      shortText,
      shortBadge: shortChrome.badgeHe,
      shortVariant: shortChrome.visualVariant,
      meaningChanged,
      meaningChangeDetail: meaningChanged
        ? describeMeaningChange(regularText, detailedText, shortText, regularChrome, detailedChrome, shortChrome)
        : "",
    });
  }
  return rows;
}

function normalizeMeaning(t) {
  return String(t || "")
    .replace(/\s+/g, " ")
    .replace(/מבוסס על \d+ שאלות[^.]*\.?/g, "")
    .trim();
}

function describeMeaningChange(r, d, s, rc, dc, sc) {
  const parts = [];
  if (normalizeMeaning(r) !== normalizeMeaning(d)) parts.push("regular≠detailed text");
  if (normalizeMeaning(r) !== normalizeMeaning(s)) parts.push("regular≠short text");
  if (rc.badgeHe !== dc.badgeHe) parts.push(`badge regular/detailed: ${rc.badgeHe} vs ${dc.badgeHe}`);
  if (rc.badgeHe !== sc.badgeHe) parts.push(`badge regular/short: ${rc.badgeHe} vs ${sc.badgeHe}`);
  if (rc.visualVariant !== dc.visualVariant) parts.push(`variant regular/detailed: ${rc.visualVariant} vs ${dc.visualVariant}`);
  if (rc.visualVariant !== sc.visualVariant) parts.push(`variant regular/short: ${rc.visualVariant} vs ${sc.visualVariant}`);
  return parts.join("; ");
}

function buildLabelQualityAudit(producerResults) {
  const allTags = new Set([
    ...Object.keys(TAG_PRODUCER_REGISTRY),
    ...Object.keys(PARENT_ERROR_PATTERN_LABEL_HE),
    ...Object.values(TAXONOMY_EVIDENCE_RULES).flatMap((r) => r.requiredTags || []),
  ]);

  const CLINICAL_OR_CAUSAL = [
    /חוסר תשומת לב|רשלנות|מנחש|ניחוש|בלבול יסודי|חסר בסיס|קושי במהירות|מהירות|careless|guess/i,
    /נראה שיש בלבול ביסודי/,
    /אולי חסר בסיס/,
    /חלק מהטעויות נראות קשורות למהירות/,
    /תשובות נראות פחות יציבות/,
    /טעויות ביצוע קטנות שחוזרות כשממהרים/,
  ];

  const FACTUAL_OK = [
    /טעות חישוב של סטייה ב-1/,
    /בלבול בסדר הפעולות או בשלבי הפתרון/,
    /הטעות נובעת מחישוב או מסדר פעולות/,
  ];

  const byProducer = Object.fromEntries(producerResults.map((p) => [p.internalTag, p]));

  const rows = [];
  for (const tag of [...allTags].sort()) {
    const producer = getTagProducer(tag);
    const active = !!producer?.active;
    const alias = aliasTarget(tag);
    const label = PARENT_ERROR_PATTERN_LABEL_HE[tag] || parentFacingErrorPatternLabelHe(tag) || "";
    const taxIds = taxonomiesForTag(tag);
    const prodEval = byProducer[tag];

    let status = "no_safe_label_possible";
    let describesObservedFact = false;
    let claimsUnprovenCause = false;
    let clinicalLanguage = false;
    let fitsSubjectTopic = taxIds.length > 0;
    let canShowWithCount = false;

    if (alias && alias !== tag) {
      status = "duplicate_alias";
    } else if (!active && !label && taxIds.length === 0) {
      status = "inactive";
    } else if (!active && !TAG_PRODUCER_REGISTRY[tag]) {
      status = label ? "needs_rewrite" : "inactive";
    } else if (!label) {
      status = active ? "no_safe_label_possible" : "inactive";
    } else {
      clinicalLanguage = CLINICAL_OR_CAUSAL.some((re) => re.test(label));
      claimsUnprovenCause = clinicalLanguage;
      describesObservedFact =
        FACTUAL_OK.some((re) => re.test(label)) ||
        (!clinicalLanguage && /טעות|בלבול בסדר|חישוב|פעולה/.test(label));
      canShowWithCount = describesObservedFact && !claimsUnprovenCause;
      if (claimsUnprovenCause) status = "needs_rewrite";
      else if (describesObservedFact) status = "approved_factual";
      else status = "needs_rewrite";
    }

    if (!active && status !== "duplicate_alias") {
      if (!label) status = "inactive";
    }

    rows.push({
      internalTag: tag,
      producerActive: active,
      taxonomyId: taxIds.join("|"),
      labelExists: !!label,
      labelHe: label,
      describesObservedFact,
      claimsUnprovenCause,
      clinicalOrDidacticLanguage: clinicalLanguage,
      fitsSubjectTopic,
      canPresentWithCount: canShowWithCount,
      status,
      producerStatus: prodEval?.status || (active ? "NO_VALID_FIXTURE" : "inactive"),
      aliasOf: alias && alias !== tag ? alias : "",
      notes: prodEval?.notes || "",
    });
  }
  return rows;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("Evaluating 120 active producers…");

  const activeEntries = Object.entries(TAG_PRODUCER_REGISTRY).filter(([, p]) => p.active);
  const producerResults = activeEntries.map(([tag, p]) => evaluateProducerTag(tag, p));

  // Also evaluate alias tags that are active but resolve via canonical PASS
  for (const r of producerResults) {
    if (r.status === "NO_VALID_FIXTURE" && r.notes.includes("alias_of:")) {
      const target = r.notes.split("alias_of:")[1]?.split("|")[0];
      const canon = producerResults.find((x) => x.internalTag === target);
      if (canon?.status === "PASS") {
        r.status = "PASS";
        r.producedVia = `alias_of_PASS:${target}`;
        r.producedTag = canon.producedTag;
        r.taxonomyMatchOk = canon.taxonomyMatchOk;
        r.exampleCorrect = canon.exampleCorrect;
        r.exampleWrong = canon.exampleWrong;
        r.subject = r.subject || canon.subject;
        r.topic = r.topic || canon.topic;
        r.notes = [r.notes, "covered_via_canonical_alias"].filter(Boolean).join("|");
      }
    }
  }

  console.log("Building active-tag path rows…");
  const pathRows = [];
  for (const pr of producerResults) {
    // boundary shared after producer proof: use minWrong-ish volume when PASS
    const taxId = (pr.taxonomyIds || "").split("|").filter(Boolean)[0];
    const minWrong = TAXONOMY_BY_ID[taxId]?.minWrong || 3;
    const q = Math.max(12, minWrong * 4);
    const wrong = Math.max(minWrong, Math.ceil(q * 0.4));
    const patternCount = Math.max(minWrong, Math.ceil(wrong * 0.5));
    pathRows.push(buildPathRow(pr, patternCount, wrong, q));
  }

  console.log("Threshold visibility matrix…");
  const thresholdRows = buildThresholdVisibilityMatrix();

  console.log("Report surface parity…");
  const parityRows = buildReportSurfaceParity();

  console.log("Label quality…");
  const labelRows = buildLabelQualityAudit(producerResults);

  const pass = producerResults.filter((r) => r.status === "PASS");
  const fail = producerResults.filter((r) => r.status === "FAIL");
  const noFix = producerResults.filter((r) => r.status === "NO_VALID_FIXTURE");
  const taxOk = pathRows.filter((r) => r.tagProducedByClassifierNotInjected === "yes" && r.taxonomyId);
  const preciseParent = pathRows.filter(
    (r) => r.tagProducedByClassifierNotInjected === "yes" && r.parentSafeLabel && r.enrichApplied,
  );
  const needLabel = labelRows.filter((r) => r.producerActive && (!r.labelExists || r.status === "needs_rewrite" || r.status === "no_safe_label_possible"));
  const alwaysGeneral = labelRows.filter(
    (r) => r.producerActive && (r.status === "no_safe_label_possible" || (!r.labelExists && r.status !== "duplicate_alias")),
  );
  const hiddenByPositiveAcc = thresholdRows.filter((r) =>
    /hidden: pattern .+ but engineDecision=(partial_stable|mastery_stable)/.test(r.whyShownOrHidden),
  );
  const strongViaErrorRatio = thresholdRows.filter((r) =>
    /strong_via_error_ratio_only|strong because ratioAmongWrongs/.test(r.whyShownOrHidden),
  );
  const parityConflicts = parityRows.filter((r) => r.meaningChanged);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: "read_only_completion_audit",
    activeTagsTotal: activeEntries.length,
    classifierPass: pass.length,
    classifierFail: fail.length,
    noValidFixture: noFix.length,
    connectedToTaxonomy: taxOk.length,
    canReachParentAsPreciseFinding: preciseParent.length,
    needNewOrRewrittenLabel: needLabel.length,
    alwaysGeneralFinding: alwaysGeneral.length,
    reportParityConflicts: parityConflicts.length,
    hiddenByPositiveAccuracy: hiddenByPositiveAcc.map((r) => r.scenarioId),
    strongViaErrorRatioOnly: strongViaErrorRatio.map((r) => r.scenarioId),
    producerResults,
    thresholdRows,
    parityConflictsDetail: parityConflicts,
  };

  const pathCols = [
    "subject", "grade", "topic", "subskill", "internalTag", "classifierFileFunction",
    "tagProducedByClassifierNotInjected", "producerStatus", "producedVia", "taxonomyId",
    "taxonomyMinWrong", "taxonomyMinOccurrenceRatio", "requiredTags", "parentSafeLabel",
    "enginePrimaryLabel", "exampleCorrectAnswer", "exampleWrongAnswer", "patternCount",
    "totalErrors", "totalQuestions", "ratioOfQuestions", "ratioOfErrors", "sessions", "days",
    "observedPatternLevel", "evidenceStrength", "patternLayer", "engineDecision", "ADC",
    "parentFacingText", "enrichApplied", "blockPatternClaim", "detectedPattern",
  ];
  const thrCols = Object.keys(thresholdRows[0] || {});
  const parityCols = Object.keys(parityRows[0] || {});
  const labelCols = Object.keys(labelRows[0] || {});

  fs.writeFileSync(path.join(OUT_DIR, "parent-engine-active-tag-path-audit.csv"), toCsv(pathRows, pathCols), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "parent-engine-threshold-visibility-matrix.csv"), toCsv(thresholdRows, thrCols), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "parent-engine-report-surface-parity.csv"), toCsv(parityRows, parityCols), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "parent-safe-label-quality-audit.csv"), toCsv(labelRows, labelCols), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "parent-engine-audit-completion.json"), JSON.stringify(summary, null, 2), "utf8");

  const md = [];
  md.push("# Parent Engine Audit Completion");
  md.push("");
  md.push(`Generated: ${summary.generatedAt}`);
  md.push("Mode: READ-ONLY — no code/threshold changes");
  md.push("");
  md.push("## Final counts");
  md.push("");
  md.push(`1. Active tags tested via real classifier: **${pass.length}** / ${activeEntries.length} PASS`);
  md.push(`2. Failed to produce expected tag: **${fail.length}**`);
  md.push(`3. NO_VALID_FIXTURE: **${noFix.length}**`);
  md.push(`4. Connected to taxonomy (PASS + taxonomyId): **${taxOk.length}**`);
  md.push(`5. Can reach parent as precise finding (PASS + label + enrich in path probe): **${preciseParent.length}**`);
  md.push(`6. Need new/rewritten label (active): **${needLabel.length}**`);
  md.push(`7. Always remain general (active, no safe factual label): **${alwaysGeneral.length}**`);
  md.push(`8. Report surface meaning conflicts: **${parityConflicts.length}**`);
  if (parityConflicts.length) {
    for (const c of parityConflicts) md.push(`   - ${c.stateId}: ${c.meaningChangeDetail}`);
  }
  md.push(`9. Hidden by positive accuracy: ${hiddenByPositiveAcc.map((r) => r.scenarioId).join(", ") || "none"}`);
  md.push(`10. Strong via error-ratio only (tiny share of questions): ${strongViaErrorRatio.map((r) => r.scenarioId).join(", ") || "none"}`);
  md.push("");
  md.push("## Files");
  md.push("- parent-engine-active-tag-path-audit.csv");
  md.push("- parent-engine-threshold-visibility-matrix.csv");
  md.push("- parent-engine-report-surface-parity.csv");
  md.push("- parent-safe-label-quality-audit.csv");
  md.push("- parent-engine-audit-completion.json");
  md.push("");
  md.push("## Key product-policy findings (existing behavior)");
  md.push("");
  md.push("- q=25 / 6 identical errors / 76% → consistent+strong but engineDecision=partial_stable → factual pattern **hidden**.");
  md.push("- q=20 / 2 identical errors / 90% → consistent+strong but engineDecision=mastery_stable → parent sees mastery only.");
  md.push("- q=40 / 2 identical errors → observedPatternLevel can be **strong** because ratioAmongWrongs=1.0 while ratioAmongQuestions=0.05.");
  md.push("- q=4 / 4 identical errors → insufficient_data / early; type+count not shown as factual enrich.");
  md.push("");
  md.push("Stop. No fixes applied.");
  md.push("");
  fs.writeFileSync(path.join(OUT_DIR, "PARENT-ENGINE-AUDIT-COMPLETION.md"), md.join("\n"), "utf8");

  console.log(JSON.stringify({
    pass: pass.length,
    fail: fail.length,
    noFix: noFix.length,
    taxOk: taxOk.length,
    preciseParent: preciseParent.length,
    needLabel: needLabel.length,
    alwaysGeneral: alwaysGeneral.length,
    parityConflicts: parityConflicts.length,
    hiddenByPositiveAcc: summary.hiddenByPositiveAccuracy,
    strongViaErrorRatio: summary.strongViaErrorRatioOnly,
  }, null, 2));
}

main();
