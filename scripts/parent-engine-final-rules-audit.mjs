/**
 * READ-ONLY final rules audit for parent findings engine.
 * No DB writes, no threshold/code changes, no commit.
 *
 * Outputs (docs/audits/):
 *  - PARENT-ENGINE-FINAL-RULES-AUDIT.md
 *  - parent-engine-final-rules-matrix.csv
 *  - parent-engine-tags-coverage.csv
 *  - parent-engine-final-rules-audit.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_TAXONOMY_ROWS } from "../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { TAXONOMY_EVIDENCE_RULES } from "../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import {
  TAG_PRODUCER_REGISTRY,
  getTagProducer,
  hasActiveTagProducer,
} from "../lib/learning/taxonomy-tag-producer-registry.js";
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
  resolveParentTopicDisplayDecision,
} from "../utils/parent-report-surface/parent-topic-display-chrome.js";
import { isClearWeakTopicMetrics } from "../utils/learning-pattern-decision/subject-clear-weak-topic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKTREE = path.resolve(__dirname, "..");
const REPO = path.resolve(WORKTREE, "..");
const DOSSIERS_DIR = path.join(
  REPO,
  ".tmp/parent-engine-live-simulation-2026-07-25-v1/dossiers",
);
const OUT_DIR = path.join(WORKTREE, "docs/audits");

const SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet-geography",
  "history",
];

const SUBJECT_LABEL_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  hebrew: "עברית",
  english: "אנגלית",
  science: "מדעים",
  "moledet-geography": "מולדת / גאוגרפיה",
  history: "היסטוריה",
};

/** Exact thresholds extracted from production code (authority citations). */
const THRESHOLDS = Object.freeze({
  repeatedMistake: {
    MIN_WRONGS_FOR_REPEAT: 2,
    MIN_REPEAT_RATIO: 0.4,
    authority:
      "utils/learning-pattern-decision/resolve-repeated-mistake-patterns.js",
    includeCluster: "(count >= 2) AND (ratioAmongWrongs >= 0.4)",
    observedPatternLevel: [
      "IF !patterns.length OR q===0 → none",
      "ELSE IF q>=40 AND top.ratio>=0.5 → strong",
      "ELSE IF q>=12 AND top.ratio>=0.4 → consistent",
      "ELSE IF q>=5 AND top.count>=2 → repeated",
      "ELSE IF top.count>=2 → observed",
      "ELSE → none",
    ],
  },
  evidenceStrength: {
    authority: "utils/evidence-strength-policy.js + parent-evidence-matrix.js",
    rules: [
      "q===0 → none",
      "q<=4 → small_sample",
      "5<=q<8 → emerging",
      "8<=q<12 → supported",
      "q>=12 → strong",
    ],
  },
  engineDecision: {
    authority: "utils/parent-report-engine-v1-signals.js#buildEngineDiagnosticDecision",
    tiers: "n<5→T0; n<10→T1; n<20→T2; n<50→T3; else T4",
    accuracyBands:
      "n<5→insufficient_data; a>=90→mastery; a>=70→partial_good; a>=50→needs_strengthening; else clear_gap",
    decision: [
      "IF tier===T0 → insufficient_data",
      "ELSE IF mastery → (q>=10 ? mastery_stable : early_direction_only)",
      "ELSE IF partial_good → (tier>=T2 ? partial_stable : early_direction_only)",
      "ELSE IF needs_strengthening → topic_needs_strengthening",
      "ELSE IF clear_gap → (tier>=T1 ? clear_topic_gap : insufficient_data)",
      "THEN IF speedOnlyRisk AND mode===speed AND band!==clear_gap AND decision in gap/strengthen → speed_pressure_pattern",
    ],
  },
  factualEnrich: {
    authority:
      "utils/learning-pattern-decision/enrich-parent-finding-with-factual-pattern.js",
    condition:
      "observedPatternLevel IN {consistent,strong} AND evidenceStrength==='strong' AND engineDecision IN {clear_topic_gap,topic_needs_strengthening} AND parentFacingErrorPatternLabelHe(pattern.key) non-empty",
  },
  clearWeak: {
    authority: "subject-clear-weak-topic.js",
    condition: "(q>=5) AND (wrong>=2) AND (accuracy<70)",
  },
  de2RecurrenceDefaults: {
    authority: "utils/diagnostic-engine-v2/evidence-recurrence.js",
    minOccurrenceRatioDefault: 0.6,
    secondary_observed: "(distinctDays>=2) AND (evidenceCount>=3) AND (RECURRING OR low_occurrence_ratio OR recurrenceMet)",
    same_session_observed:
      "(evidenceCount>=3) AND tagCheck.ok AND same-session cluster (sessionId OR span<=3600000ms)",
    primary_dominant: "confirmed OR state===CONFIRMED",
  },
  taxonomyMinWrongTypical: 3,
  taxonomyMinWrongSome: 4,
});

const PIPELINE = [
  {
    stage: "answer→classifier",
    file: "lib/learning/classifiers/classify-answer-evidence.js",
    fn: "classifyAnswerEvidence / buildWriteTimeAnswerEvidenceFields",
  },
  {
    stage: "mistake event",
    file: "utils/mistake-event.js",
    fn: "normalizeMistakeEvent / mistakePatternClusterKey",
  },
  {
    stage: "repeated mistake pattern",
    file: "utils/learning-pattern-decision/resolve-repeated-mistake-patterns.js",
    fn: "resolveRepeatedMistakePatterns / resolveObservedPatternLevelFromPatterns",
  },
  {
    stage: "LPD",
    file: "utils/learning-pattern-decision/build-learning-pattern-decision.js",
    fn: "buildLearningPatternDecision",
  },
  {
    stage: "canonical topic state",
    file: "utils/canonical-topic-state/build-canonical-state.js",
    fn: "buildCanonicalState / evaluateDecisionTable",
  },
  {
    stage: "DE2",
    file: "utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js",
    fn: "runDiagnosticEngineV2",
  },
  {
    stage: "EDC",
    file: "utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js",
    fn: "buildParentReportEngineDecisionContract",
  },
  {
    stage: "ADC",
    file: "utils/action-decision-contract/action-decision-contract-v2.js",
    fn: "buildActionDecisionContractV2",
  },
  {
    stage: "parent-safe finding",
    file: "utils/learning-pattern-decision/build-parent-visible-finding.js + enrich-parent-finding-with-factual-pattern.js",
    fn: "buildParentVisibleFinding / enrichParentFindingWithConsistentStrongTag",
  },
  {
    stage: "parent report contract",
    file: "utils/contracts/parent-product-contract-v1.js",
    fn: "buildParentProductContractV1",
  },
  {
    stage: "reports",
    file: "utils/parent-report-v2.js / detailed-parent-report.js / short-report surfaces",
    fn: "generateParentReportV2 / buildDetailedParentReportFromBaseReport",
  },
  {
    stage: "badge/color/variant",
    file: "utils/parent-report-surface/parent-topic-display-chrome.js",
    fn: "parentTopicDisplayChromeFromRow / FromDecision",
  },
];

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.join(",");
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(","));
  return [header, ...lines].join("\n") + "\n";
}

function practiceWrong(tag, i = 0) {
  return {
    isCorrect: false,
    subjectId: "math",
    mode: "practice",
    evidenceSource: "self_practice",
    timestamp: 1_700_000_000_000 + i,
    topicRowKey: "audit_topic::grade:g4",
    bucketKey: "audit_topic",
    misconceptionTag: tag,
  };
}

function practiceCorrect(i = 0) {
  return {
    isCorrect: true,
    subjectId: "math",
    mode: "practice",
    evidenceSource: "self_practice",
    timestamp: 1_700_000_000_000 + i,
    topicRowKey: "audit_topic::grade:g4",
    bucketKey: "audit_topic",
  };
}

function categoryFromDecision(engineDecision, enrichApplied, patternLevel) {
  if (
    engineDecision === "insufficient_data" ||
    engineDecision === "none"
  ) {
    return "A_insufficient_info";
  }
  if (
    engineDecision === "early_direction_only" ||
    patternLevel === "observed" ||
    patternLevel === "same_session_observed"
  ) {
    return "B_early_direction";
  }
  if (enrichApplied) return "C_factual_repeated_pattern";
  if (
    engineDecision === "clear_topic_gap" ||
    engineDecision === "topic_needs_strengthening"
  ) {
    return "D_topic_difficulty";
  }
  if (
    engineDecision === "partial_stable" ||
    engineDecision === "mastery_stable"
  ) {
    return "E_strength_or_mastery";
  }
  return "other";
}

/**
 * Run one scenario through production authority functions (no DE2 unit → taxonomy null path).
 */
function runScenario({
  scenarioId,
  q,
  wrong,
  patternCount,
  patternTag = "calculation_off_by_one",
  sessions = 1,
  days = 1,
}) {
  const correct = Math.max(0, q - wrong);
  const accuracy = q > 0 ? Math.round((correct / q) * 100) : 0;
  const wrongRatio = q > 0 ? wrong / q : 0;
  const tier = computeEngineConfidenceTier(q);
  const accuracyBand = computeAccuracyBand(accuracy, q);
  const engineDecision = buildEngineDiagnosticDecision({
    q,
    acc: accuracy,
    wrongRatio,
    engineConfidenceTier: tier,
    accuracyBand,
  }).engineDecision;

  const evidenceStrength = resolveEvidenceStrength(q);
  const events = [];
  for (let i = 0; i < patternCount; i++) {
    events.push(practiceWrong(patternTag, i));
  }
  for (let i = patternCount; i < wrong; i++) {
    events.push(practiceWrong(`singleton_${i}`, 1000 + i));
  }
  // correct events are not needed for repeated patterns; metrics come from row

  const patterns = resolveRepeatedMistakePatterns(events);
  const top =
    patterns.find((p) => p.key === `mt:${patternTag}`) || patterns[0] || null;
  const observedPatternLevel = resolveObservedPatternLevelFromPatterns(
    patterns,
    q,
  );
  const ratioAmongErrors =
    wrong > 0 && top ? Number((top.count / wrong).toFixed(4)) : 0;
  const ratioAmongQuestions =
    q > 0 && top ? Number((top.count / q).toFixed(4)) : 0;

  const baseFinding =
    engineDecision === "clear_topic_gap"
      ? `בנושא נושא בדיקה נראה קושי ברור. ${wrong} שגיאות מתוך ${q} שאלות (${accuracy}% דיוק). מבוסס על ${q} שאלות שנפתרו בנושא.`
      : engineDecision === "topic_needs_strengthening"
        ? `בנושא נושא בדיקה יש חלק שדורש חיזוק (${q} שאלות, ${accuracy}% דיוק). מבוסס על ${q} שאלות שנפתרו בנושא.`
        : engineDecision === "mastery_stable"
          ? `בנושא נושא בדיקה נראית שליטה יציבה. מבוסס על ${q} שאלות.`
          : engineDecision === "partial_stable"
            ? `בנושא נושא בדיקה יש הבנה חלקית יציבה. מבוסס על ${q} שאלות.`
            : engineDecision === "early_direction_only"
              ? `בנושא נושא בדיקה יש כיוון ראשוני בלבד. מבוסס על ${q} שאלות.`
              : engineDecision === "insufficient_data"
                ? `עדיין אין מספיק מידע בנושא נושא בדיקה.`
                : "";

  const enriched = enrichParentFindingWithConsistentStrongTag({
    finding: baseFinding,
    topicName: "נושא בדיקה",
    questions: q,
    engineDecision,
    observedPatternLevel,
    evidenceStrength,
    repeatedMistakePatterns: patterns,
  });
  const enrichApplied = enriched !== baseFinding;
  const parentLabel = parentFacingErrorPatternLabelHe(
    top?.key || `mt:${patternTag}`,
  );
  const chrome = parentTopicDisplayChromeFromDecision(engineDecision);

  // Full LPD path (no DE2 unit) for selected scenarios — engine fields without taxonomy
  let lpd = null;
  if (q > 0 && q <= 50) {
    const rawMistakes = [
      ...events,
      ...Array.from({ length: correct }, (_, i) => practiceCorrect(5000 + i)),
    ];
    lpd = buildLearningPatternDecision({
      subjectId: "math",
      topicRowKey: "audit_topic::grade:g4",
      row: {
        bucketKey: "audit_topic",
        topicNameHe: "נושא בדיקה",
        questions: q,
        correct,
        wrong,
        accuracy,
      },
      unit: null,
      rawMistakes,
    });
  }

  const edc = lpd?.engineDecisionContract || null;
  const findingFinal =
    String(lpd?.parentVisibleFinding || enriched || "").trim() || enriched;

  return {
    scenarioId,
    totalQuestions: q,
    correctAnswers: correct,
    totalErrors: wrong,
    accuracyPct: accuracy,
    patternTag: `mt:${patternTag}`,
    patternCount: top?.count ?? patternCount,
    patternRatioOfQuestions: ratioAmongQuestions,
    patternRatioOfErrors: ratioAmongErrors,
    sessions,
    days,
    sameSessionOnly: sessions === 1,
    crossSession: sessions >= 2,
    crossDay: days >= 2,
    observedPatternLevel,
    evidenceStrength,
    recurrence: "n/a_no_de2_unit",
    taxonomyMatch: false,
    taxonomyId: null,
    classificationState: "unclassified_no_de2_unit",
    patternLayer: edc?.patternLayer ?? null,
    engineDecision: edc?.engineDecision || engineDecision,
    engineDecisionAuthority: engineDecision,
    adcAction: edc?.actionDecisionContract?.action || null,
    blockPatternClaim: edc?.blockPatternClaim ?? null,
    patternKey: top?.key ?? null,
    patternLabel: top?.label ?? null,
    parentSafeLabelHe: parentLabel || "",
    parentFacingText: findingFinal,
    enrichApplied,
    badge: chrome.badgeHe,
    cardColorHint: chrome.cardClassName,
    visualVariant: chrome.visualVariant,
    category: categoryFromDecision(
      edc?.engineDecision || engineDecision,
      enrichApplied,
      observedPatternLevel,
    ),
    appearsRegular: true,
    appearsDetailed: true,
    appearsShort: true,
    clearWeak: isClearWeakTopicMetrics({
      questions: q,
      wrong,
      accuracy,
    }),
    detectedPattern: edc?.detectedPattern ?? null,
    lpdEngineDecision: edc?.engineDecision ?? null,
  };
}

function buildMatrixRows() {
  const rows = [];
  let n = 0;

  // Representative question counts covering required ranges
  const qSamples = [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 15, 16, 20, 25, 26, 30, 40];

  // Absolute wrong counts
  for (const q of qSamples) {
    for (const wrong of [0, 1, 2, 3, 4, 5, 6]) {
      if (wrong > q) continue;
      const patternCount = Math.min(wrong, wrong);
      // when wrongs exist, put all on same pattern unless testing ratio
      n += 1;
      rows.push(
        runScenario({
          scenarioId: `q${q}_w${wrong}_allSame`,
          q,
          wrong,
          patternCount: wrong,
        }),
      );
    }
  }

  // Error-rate scenarios
  const errRates = [0.25, 0.33, 0.4, 0.5, 0.6, 0.75];
  for (const q of [8, 12, 16, 20, 25, 40]) {
    for (const rate of errRates) {
      const wrong = Math.max(0, Math.min(q, Math.round(q * rate)));
      n += 1;
      rows.push(
        runScenario({
          scenarioId: `q${q}_errRate${rate}`,
          q,
          wrong,
          patternCount: wrong,
        }),
      );
    }
  }

  // Pattern share among errors
  const patternShares = [0.2, 0.25, 0.33, 0.4, 0.5, 0.6, 0.75, 1];
  for (const q of [12, 20, 25, 40]) {
    for (const errRate of [0.5, 0.6]) {
      const wrong = Math.round(q * errRate);
      for (const share of patternShares) {
        const patternCount = Math.max(0, Math.min(wrong, Math.round(wrong * share)));
        n += 1;
        rows.push(
          runScenario({
            scenarioId: `q${q}_w${wrong}_share${share}`,
            q,
            wrong,
            patternCount,
          }),
        );
      }
    }
  }

  // Boundary triples for key thresholds
  const boundaries = [
    // count around MIN_WRONGS=2 with enough ratio
    { q: 5, wrong: 5, patternCount: 1, id: "bound_count_1" },
    { q: 5, wrong: 5, patternCount: 2, id: "bound_count_2" },
    { q: 5, wrong: 5, patternCount: 3, id: "bound_count_3" },
    // ratio around 0.4 among wrongs (5 wrongs → 2/5=0.4)
    { q: 10, wrong: 5, patternCount: 1, id: "bound_ratio_1of5" },
    { q: 10, wrong: 5, patternCount: 2, id: "bound_ratio_2of5" },
    { q: 10, wrong: 5, patternCount: 3, id: "bound_ratio_3of5" },
    // consistent gate q=12 ratio=0.4
    { q: 11, wrong: 8, patternCount: 4, id: "bound_consistent_q11" },
    { q: 12, wrong: 8, patternCount: 3, id: "bound_consistent_ratio_fail" },
    { q: 12, wrong: 8, patternCount: 4, id: "bound_consistent_ok" },
    { q: 12, wrong: 8, patternCount: 5, id: "bound_consistent_above" },
    // strong gate q=40 ratio=0.5
    { q: 39, wrong: 20, patternCount: 12, id: "bound_strong_q39" },
    { q: 40, wrong: 20, patternCount: 9, id: "bound_strong_ratio_fail" },
    { q: 40, wrong: 20, patternCount: 10, id: "bound_strong_ok" },
    { q: 40, wrong: 20, patternCount: 12, id: "bound_strong_above" },
    // engine q bands
    { q: 4, wrong: 3, patternCount: 3, id: "bound_T0_q4" },
    { q: 5, wrong: 3, patternCount: 3, id: "bound_T1_q5" },
    { q: 9, wrong: 1, patternCount: 1, id: "bound_mastery_q9_acc89" }, // will compute
    { q: 10, wrong: 1, patternCount: 1, id: "bound_mastery_q10" },
    { q: 10, wrong: 0, patternCount: 0, id: "bound_mastery_100_q10" },
    { q: 9, wrong: 0, patternCount: 0, id: "bound_mastery_100_q9_early" },
    // accuracy band edges at q=12
    { q: 12, wrong: 2, patternCount: 2, id: "bound_acc_83_partial" }, // 83%
    { q: 12, wrong: 4, patternCount: 4, id: "bound_acc_67_strengthen" }, // 67%
    { q: 12, wrong: 6, patternCount: 6, id: "bound_acc_50_strengthen" }, // 50%
    { q: 12, wrong: 7, patternCount: 7, id: "bound_acc_42_gap" }, // 42%
    // unmapped tag
    {
      q: 25,
      wrong: 14,
      patternCount: 8,
      id: "unmapped_measure_confusion",
      patternTag: "measure_confusion",
    },
    // procedure_break via misconception alias won't work — use calculation + mapped
    {
      q: 20,
      wrong: 10,
      patternCount: 6,
      id: "mapped_off_by_one_enrich",
      patternTag: "calculation_off_by_one",
    },
  ];

  for (const b of boundaries) {
    rows.push(
      runScenario({
        scenarioId: b.id,
        q: b.q,
        wrong: b.wrong,
        patternCount: b.patternCount,
        patternTag: b.patternTag || "calculation_off_by_one",
      }),
    );
  }

  // Combo matrix: count pass/fail × ratio pass/fail
  const combos = [
    { id: "combo_countFail_ratioFail", q: 12, wrong: 10, patternCount: 1 },
    { id: "combo_countPass_ratioFail", q: 12, wrong: 10, patternCount: 2 }, // 2/10=0.2 < 0.4
    { id: "combo_countFail_ratioPass", q: 12, wrong: 2, patternCount: 1 }, // count 1 < 2
    { id: "combo_bothPass", q: 12, wrong: 10, patternCount: 4 }, // 4/10=0.4
    { id: "combo_fewQuestions", q: 4, wrong: 4, patternCount: 3 },
    { id: "combo_enoughQuestions", q: 12, wrong: 8, patternCount: 4 },
  ];
  for (const c of combos) {
    rows.push(
      runScenario({
        scenarioId: c.id,
        q: c.q,
        wrong: c.wrong,
        patternCount: c.patternCount,
      }),
    );
  }

  void n;
  return rows;
}

function buildTagsCoverage() {
  /** @type {Map<string, object>} */
  const byTag = new Map();

  function ensure(tag) {
    const t = String(tag || "").trim();
    if (!t) return null;
    if (!byTag.has(t)) {
      byTag.set(t, {
        internalTag: t,
        subjects: new Set(),
        taxonomyIds: new Set(),
        topicsHe: new Set(),
        evidenceSource: "",
        classifierProducer: "",
        producerActive: false,
        hasTaxonomy: false,
        parentSafeLabelHe: parentFacingErrorPatternLabelHe(t) || parentFacingErrorPatternLabelHe(`mt:${t}`),
        canPrimaryFinding: false,
        canSecondaryFinding: false,
        canFactualOnly: false,
        alwaysBlocked: false,
        consistentStrongNoTaxonomy: "",
        riskInternalTagExposure: false,
        notes: "",
      });
    }
    return byTag.get(t);
  }

  for (const [taxId, rule] of Object.entries(TAXONOMY_EVIDENCE_RULES)) {
    const row = ALL_TAXONOMY_ROWS.find((r) => r.id === taxId);
    const subject = row?.subjectId || "";
    for (const tag of rule.requiredTags || []) {
      const rec = ensure(tag);
      if (!rec) continue;
      if (subject) rec.subjects.add(subject);
      rec.taxonomyIds.add(taxId);
      if (row?.topicHe) rec.topicsHe.add(row.topicHe);
      if (row?.subskillHe) rec.topicsHe.add(row.subskillHe);
      rec.evidenceSource = rule.evidenceSource || rec.evidenceSource;
      rec.hasTaxonomy = true;
      const producer = getTagProducer(tag);
      if (producer) {
        rec.classifierProducer = producer.module || producer.generator || "";
        rec.producerActive = !!producer.active;
      } else {
        rec.notes = [rec.notes, "no_active_producer"].filter(Boolean).join("|");
      }
    }
  }

  for (const [tag, producer] of Object.entries(TAG_PRODUCER_REGISTRY)) {
    const rec = ensure(tag);
    if (!rec) continue;
    rec.classifierProducer =
      rec.classifierProducer || producer.module || producer.generator || "";
    rec.producerActive = !!producer.active;
    if (!rec.hasTaxonomy) {
      rec.notes = [rec.notes, "producer_without_taxonomy_rule"].filter(Boolean).join("|");
    }
  }

  for (const key of Object.keys(PARENT_ERROR_PATTERN_LABEL_HE)) {
    const rec = ensure(key);
    if (!rec) continue;
    rec.parentSafeLabelHe = PARENT_ERROR_PATTERN_LABEL_HE[key];
  }

  // Exposure / reachability classification (existing behavior)
  for (const rec of byTag.values()) {
    const label = rec.parentSafeLabelHe;
    const mapped = !!label;
    rec.canFactualOnly = mapped; // enrich path key-only
    rec.canPrimaryFinding = rec.hasTaxonomy && rec.producerActive; // DE2 primary when classified
    rec.canSecondaryFinding = rec.hasTaxonomy && rec.producerActive;
    rec.alwaysBlocked = !mapped && !rec.hasTaxonomy;
    rec.consistentStrongNoTaxonomy = mapped
      ? "factual_enrich_allowed_when_consistent_strong_and_gap_or_strengthen"
      : "stays_generic_topic_finding_label_unknown";
    rec.riskInternalTagExposure = !mapped; // label becomes unknown; key must not surface
    if (!mapped) {
      rec.notes = [rec.notes, "no_parent_safe_hebrew"].filter(Boolean).join("|");
    }
    if (rec.hasTaxonomy && !rec.producerActive) {
      rec.notes = [rec.notes, "taxonomy_without_active_producer"].filter(Boolean).join("|");
      rec.canPrimaryFinding = false;
      rec.canSecondaryFinding = false;
    }
  }

  return [...byTag.values()]
    .sort((a, b) => a.internalTag.localeCompare(b.internalTag))
    .map((r) => ({
      internalTag: r.internalTag,
      subjects: [...r.subjects].join("|") || "",
      taxonomyIds: [...r.taxonomyIds].join("|") || "",
      topicsOrSubskillsHe: [...r.topicsHe].join("|") || "",
      evidenceSource: r.evidenceSource,
      classifierProducer: r.classifierProducer,
      producerActive: r.producerActive,
      hasTaxonomy: r.hasTaxonomy,
      parentSafeLabelHe: r.parentSafeLabelHe || "",
      canPrimaryFinding: r.canPrimaryFinding,
      canSecondaryFinding: r.canSecondaryFinding,
      canFactualOnly: r.canFactualOnly,
      alwaysBlocked: r.alwaysBlocked,
      consistentStrongNoTaxonomy: r.consistentStrongNoTaxonomy,
      riskInternalTagExposure: r.riskInternalTagExposure,
      notes: r.notes,
    }));
}

function analyzeDossiers() {
  if (!fs.existsSync(DOSSIERS_DIR)) {
    return { error: `missing dossiers dir: ${DOSSIERS_DIR}`, dossiers: [], anomalies: [] };
  }
  const files = fs.readdirSync(DOSSIERS_DIR).filter((f) => f.endsWith(".json")).sort();
  const dossiers = [];
  const anomalies = [];

  for (const file of files) {
    const dossier = JSON.parse(fs.readFileSync(path.join(DOSSIERS_DIR, file), "utf8"));
    const student = dossier?.student?.label || file.replace(/\.json$/i, "");
    const lpdBySubject = dossier?.engine?.lpd || {};
    const topicRows = [];

    for (const subjectId of Object.keys(lpdBySubject)) {
      const topics = lpdBySubject[subjectId] || {};
      for (const [topicRowKey, lpd] of Object.entries(topics)) {
        if (!lpd || typeof lpd !== "object") continue;
        const edc = lpd.engineDecisionContract || {};
        const patterns = Array.isArray(lpd.repeatedMistakePatterns)
          ? lpd.repeatedMistakePatterns
          : Array.isArray(lpd.detectedPatterns)
            ? lpd.detectedPatterns
            : [];
        const top = patterns[0] || null;
        const finding = String(
          lpd.parentVisibleFinding || edc.parentSafeFinding || "",
        );
        const level = String(lpd.observedPatternLevel || "");
        const strength = String(lpd.evidenceStrength || "");
        const hasSpecific =
          /חזר אותו סוג של טעות|ב-\d+\s*תשובות חזרה/.test(finding);
        const hasGenericGap =
          /קושי ברור|חלק שדורש חיזוק/.test(finding) && !hasSpecific;
        const strongLost =
          (level === "consistent" || level === "strong") &&
          strength === "strong" &&
          top &&
          Number(top.count) >= 1 &&
          hasGenericGap &&
          !parentFacingErrorPatternLabelHe(top.key);

        const strongEnrichable =
          (level === "consistent" || level === "strong") &&
          strength === "strong" &&
          top &&
          parentFacingErrorPatternLabelHe(top.key) &&
          (edc.engineDecision === "clear_topic_gap" ||
            edc.engineDecision === "topic_needs_strengthening");

        const chrome = parentTopicDisplayChromeFromDecision(
          edc.engineDecision || "unknown",
        );

        // Label safety: label must not equal key / contain mt: or pf:
        if (top?.label) {
          const lab = String(top.label);
          if (
            lab === top.key ||
            /^(mt|pf|st|ct|k|to):/i.test(lab) ||
            (top.key && lab.includes(String(top.key).replace(/^(mt|pf):/i, "")) && !/[\u0590-\u05FF]/.test(lab))
          ) {
            anomalies.push({
              type: "internal_label_exposure",
              student,
              file,
              subjectId,
              topicRowKey,
              key: top.key,
              label: top.label,
            });
          }
        }

        if (
          (level === "consistent" || level === "strong") &&
          strength === "strong" &&
          top &&
          parentFacingErrorPatternLabelHe(top.key) &&
          (edc.engineDecision === "clear_topic_gap" ||
            edc.engineDecision === "topic_needs_strengthening") &&
          hasGenericGap
        ) {
          anomalies.push({
            type: "strong_mapped_pattern_still_generic_in_dossier_snapshot",
            student,
            file,
            subjectId,
            topicRowKey,
            key: top.key,
            finding,
            note: "dossier snapshot may predate enricher; live LPD path should enrich",
          });
        }

        if (
          edc.engineDecision === "insufficient_data" &&
          chrome.excellent
        ) {
          anomalies.push({
            type: "insufficient_shown_as_excellent",
            student,
            file,
            subjectId,
            topicRowKey,
          });
        }

        topicRows.push({
          subjectId,
          topicRowKey,
          q: lpd.practicedQuestions,
          correct: lpd.correctCount,
          wrong: lpd.wrongCount,
          accuracy: lpd.accuracy,
          observedPatternLevel: level,
          evidenceStrength: strength,
          topPatternKey: top?.key || null,
          topPatternLabel: top?.label || null,
          topPatternCount: top?.count ?? null,
          taxonomyId:
            lpd?.unifiedDecisionContext?.signals?.pattern?.taxonomyId || null,
          classificationState:
            lpd?.unifiedDecisionContext?.signals?.pattern?.classificationState ||
            null,
          patternLayer: edc.patternLayer ?? null,
          engineDecision: edc.engineDecision || null,
          adcAction: edc.actionDecisionContract?.action || null,
          blockPatternClaim: edc.blockPatternClaim ?? null,
          detectedPattern: edc.detectedPattern ?? null,
          parentVisibleFinding: finding,
          hasSpecificPatternCopy: hasSpecific,
          hasGenericGapOnly: hasGenericGap,
          strongLostUnmapped: !!strongLost,
          strongEnrichableMapped: !!strongEnrichable,
          badge: chrome.badgeHe,
          visualVariant: chrome.visualVariant,
        });
      }
    }

    // Report surface consistency (best-effort from stored report blobs)
    const reports = dossier.reports || {};
    const reportTexts = {
      regular: JSON.stringify(reports.regular || ""),
      detailed: JSON.stringify(reports.detailed || ""),
      short: JSON.stringify(reports.short || reports.shortContract || ""),
    };
    const subjectsRaw = dossier.subjects;
    const subjectsList = Array.isArray(subjectsRaw)
      ? subjectsRaw
      : subjectsRaw && typeof subjectsRaw === "object"
        ? Object.entries(subjectsRaw).map(([id, s]) => ({
            ...(s && typeof s === "object" ? s : {}),
            subjectId: s?.subjectId || s?.id || id,
          }))
        : [];
    const practicedSubjects = new Set(
      subjectsList
        .filter(
          (s) =>
            Number(s?.questions || s?.practicedQuestions || s?.answers || 0) > 0,
        )
        .map((s) => s.subjectId || s.id),
    );
    const parentFacingSubjects = new Set();
    const pf = dossier.parentFacing;
    if (pf && typeof pf === "object") {
      for (const k of Object.keys(pf)) parentFacingSubjects.add(k);
    }

    // Weak→good contradiction heuristic across report strings for topic findings
    for (const tr of topicRows) {
      if (!tr.parentVisibleFinding) continue;
      const gapLike =
        tr.engineDecision === "clear_topic_gap" ||
        tr.engineDecision === "topic_needs_strengthening";
      if (!gapLike) continue;
      const topicHint = String(tr.topicRowKey).split("::")[0];
      const detailedSaysGood =
        reportTexts.detailed.includes(topicHint) &&
        /מצוין|שליטה יציבה|הצלחה טובה/.test(reportTexts.detailed) &&
        reportTexts.detailed.includes(tr.parentVisibleFinding.slice(0, 20)) ===
          false;
      // softer check: if engine gap but chrome would be excellent — already covered
      if (
        tr.engineDecision === "clear_topic_gap" &&
        tr.visualVariant === "advance"
      ) {
        anomalies.push({
          type: "gap_decision_advance_chrome",
          student,
          file,
          topicRowKey: tr.topicRowKey,
        });
      }
      void detailedSaysGood;
    }

    dossiers.push({
      file,
      student,
      grade: dossier.student?.grade || null,
      checkpoint: dossier.checkpoint,
      simDate: dossier.simDate,
      aggregateCounts: dossier.aggregateCounts || null,
      topicCount: topicRows.length,
      topics: topicRows,
      practicedSubjects: [...practicedSubjects],
      reportSizes: {
        regular: reportTexts.regular.length,
        detailed: reportTexts.detailed.length,
        short: reportTexts.short.length,
      },
    });
  }

  return { dossiers, anomalies, fileCount: files.length };
}

function subjectChapters(tags, dossiersAnalysis) {
  const chapters = {};
  for (const sid of SUBJECTS) {
    const taxRows = ALL_TAXONOMY_ROWS.filter((r) => r.subjectId === sid);
    const taxIds = new Set(taxRows.map((r) => r.id));
    const subjectTags = tags.filter(
      (t) =>
        t.subjects.split("|").includes(sid) ||
        [...taxIds].some((id) => t.taxonomyIds.split("|").includes(id)),
    );
    const reachParent = subjectTags.filter(
      (t) => t.canPrimaryFinding || t.canFactualOnly,
    );
    const genericOnly = subjectTags.filter(
      (t) => !t.parentSafeLabelHe && t.hasTaxonomy,
    );
    const blocked = subjectTags.filter((t) => t.alwaysBlocked || (!t.producerActive && t.hasTaxonomy));

    const dossierTopics = [];
    for (const d of dossiersAnalysis.dossiers || []) {
      for (const t of d.topics) {
        if (t.subjectId === sid) dossierTopics.push({ ...t, student: d.student });
      }
    }

    const pick = (pred) => dossierTopics.find(pred) || null;
    chapters[sid] = {
      labelHe: SUBJECT_LABEL_HE[sid],
      taxonomyRowCount: taxRows.length,
      taxonomyIds: taxRows.map((r) => r.id),
      tagCount: subjectTags.length,
      tagsReachingParent: reachParent.length,
      tagsGenericOnly: genericOnly.length,
      tagsBlockedOrNoProducer: blocked.length,
      preciseDifficultiesParentCanSee: reachParent
        .filter((t) => t.parentSafeLabelHe)
        .map((t) => ({ tag: t.internalTag, he: t.parentSafeLabelHe }))
        .slice(0, 40),
      topicOnlyDifficulties: genericOnly.map((t) => t.internalTag).slice(0, 40),
      coverageGaps: subjectTags
        .filter((t) => t.notes.includes("taxonomy_without_active_producer") || t.notes.includes("no_parent_safe_hebrew"))
        .map((t) => ({ tag: t.internalTag, notes: t.notes }))
        .slice(0, 50),
      examples: {
        weak: pick((t) => t.engineDecision === "clear_topic_gap"),
        medium: pick((t) => t.engineDecision === "topic_needs_strengthening"),
        strongPattern: pick(
          (t) =>
            (t.observedPatternLevel === "consistent" ||
              t.observedPatternLevel === "strong") &&
            t.hasSpecificPatternCopy,
        ),
        mastery: pick((t) => t.engineDecision === "mastery_stable"),
        thinData: pick(
          (t) =>
            t.engineDecision === "insufficient_data" ||
            t.engineDecision === "early_direction_only",
        ),
      },
    };
  }
  return chapters;
}

function summarizeMatrix(matrix) {
  const firstFactual = matrix.find((r) => r.enrichApplied);
  const firstGap = matrix.find(
    (r) => r.engineDecisionAuthority === "clear_topic_gap",
  );
  const firstStrengthen = matrix.find(
    (r) => r.engineDecisionAuthority === "topic_needs_strengthening",
  );
  const firstMastery = matrix.find(
    (r) => r.engineDecisionAuthority === "mastery_stable",
  );
  const firstInsufficient = matrix.find(
    (r) => r.engineDecisionAuthority === "insufficient_data",
  );
  const firstEarly = matrix.find(
    (r) => r.engineDecisionAuthority === "early_direction_only",
  );

  const byCategory = {};
  for (const r of matrix) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  }

  return {
    scenarioCount: matrix.length,
    byCategory,
    firstInsufficient,
    firstEarly,
    firstFactual,
    firstGap,
    firstStrengthen,
    firstMastery,
    masteryImpossibleAt50pct: matrix
      .filter((r) => r.accuracyPct === 50)
      .every((r) => r.engineDecisionAuthority !== "mastery_stable"),
    masteryImpossibleBelowQ10: matrix
      .filter((r) => r.totalQuestions < 10 && r.accuracyPct >= 90)
      .every((r) => r.engineDecisionAuthority !== "mastery_stable"),
  };
}

function buildMarkdown(payload) {
  const { thresholds, pipeline, matrixSummary, tags, subjects, dossiers, anomalies, problems } =
    payload;
  const noLabel = tags.filter((t) => !t.parentSafeLabelHe);
  const noProducer = tags.filter(
    (t) => t.hasTaxonomy && !t.producerActive,
  );
  const producerNoTax = tags.filter(
    (t) => t.notes.includes("producer_without_taxonomy_rule"),
  );

  const lines = [];
  lines.push("# Parent Engine Final Rules Audit");
  lines.push("");
  lines.push(`Generated: ${payload.generatedAt}`);
  lines.push(`Worktree: LIOSH-CLEAN-MAIN-PUSH`);
  lines.push(`Mode: READ-ONLY (no code/threshold changes)`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## חלק א — ההתנהגות הקיימת בפועל");
  lines.push("");
  lines.push("### 1. צינור סמכות (authority chain)");
  lines.push("");
  lines.push("| שלב | קובץ | פונקציה |");
  lines.push("|---|---|---|");
  for (const p of pipeline) {
    lines.push(`| ${p.stage} | \`${p.file}\` | \`${p.fn}\` |`);
  }
  lines.push("");
  lines.push("**הערה על מקצועות:** DE2 משתמש ב-`moledet-geography` כמקצוע אחד (מולדת+גאוגרפיה). אין subject נפרד ל-geography בלבד.");
  lines.push("");
  lines.push("### 2. Thresholds מדויקים מהקוד");
  lines.push("");
  lines.push("#### Repeated mistake patterns");
  lines.push(`- Authority: \`${thresholds.repeatedMistake.authority}\``);
  lines.push(`- Include cluster: \`${thresholds.repeatedMistake.includeCluster}\``);
  lines.push(`- MIN_WRONGS_FOR_REPEAT = **${thresholds.repeatedMistake.MIN_WRONGS_FOR_REPEAT}**`);
  lines.push(`- MIN_REPEAT_RATIO = **${thresholds.repeatedMistake.MIN_REPEAT_RATIO}** (מכלל השגיאות באירוע, לא מכלל השאלות)`);
  lines.push("- observedPatternLevel (first match):");
  for (const r of thresholds.repeatedMistake.observedPatternLevel) {
    lines.push(`  - ${r}`);
  }
  lines.push("");
  lines.push("#### Evidence strength");
  lines.push(`- Authority: \`${thresholds.evidenceStrength.authority}\``);
  for (const r of thresholds.evidenceStrength.rules) lines.push(`- ${r}`);
  lines.push("");
  lines.push("#### Engine decision (EDC base)");
  lines.push(`- Authority: \`${thresholds.engineDecision.authority}\``);
  lines.push(`- Tiers: ${thresholds.engineDecision.tiers}`);
  lines.push(`- Accuracy bands: ${thresholds.engineDecision.accuracyBands}`);
  lines.push("- Decision:");
  for (const r of thresholds.engineDecision.decision) lines.push(`  - ${r}`);
  lines.push("");
  lines.push("#### Factual parent pattern enrich (ללא taxonomy)");
  lines.push(`- Authority: \`${thresholds.factualEnrich.authority}\``);
  lines.push(`- Condition: \`${thresholds.factualEnrich.condition}\``);
  lines.push("- `pattern.key` נשאר פנימי; `pattern.label` = עברית מאושרת או `unknown` בלבד.");
  lines.push("");
  lines.push("#### DE2 pattern layers");
  lines.push(`- Authority: \`${thresholds.de2RecurrenceDefaults.authority}\``);
  lines.push(`- Default minOccurrenceRatio: **${thresholds.de2RecurrenceDefaults.minOccurrenceRatioDefault}**`);
  lines.push(`- primary_dominant: ${thresholds.de2RecurrenceDefaults.primary_dominant}`);
  lines.push(`- secondary_observed: ${thresholds.de2RecurrenceDefaults.secondary_observed}`);
  lines.push(`- same_session_observed: ${thresholds.de2RecurrenceDefaults.same_session_observed}`);
  lines.push(`- Taxonomy minWrong טיפוסי: **${thresholds.taxonomyMinWrongTypical}** (חלק מהשורות **${thresholds.taxonomyMinWrongSome}**)`);
  lines.push("");
  lines.push("### 3. מתי ההורה רואה משהו? (קטגוריות)");
  lines.push("");
  lines.push("#### א. אין מספיק מידע");
  lines.push("- `engineDecision = insufficient_data` כאשר `q < 5` (T0), או clear_gap עם T0.");
  lines.push("- Badge: `מעט שאלות - עדיין אין מספיק נתונים`; variant: `neutral`.");
  lines.push(
    `- דוגמת מטריצה: ${matrixSummary.firstInsufficient?.scenarioId || "n/a"} (q=${matrixSummary.firstInsufficient?.totalQuestions}, acc=${matrixSummary.firstInsufficient?.accuracyPct}).`,
  );
  lines.push("");
  lines.push("#### ב. כיוון ראשוני");
  lines.push("- `early_direction_only`: mastery עם `q < 10`, או partial_good עם tier T1 (5≤q<10).");
  lines.push("- Pattern level `observed`/`repeated` אינו מספיק לבדו לממצא עובדתי ספציפי.");
  lines.push("- מותר: ניסוח זהיר / מעט נתונים. אסור: טענת דפוס חוזר חזק.");
  lines.push(
    `- דוגמה: ${matrixSummary.firstEarly?.scenarioId || "n/a"}.`,
  );
  lines.push("");
  lines.push("#### ג. ממצא עובדתי חוזר");
  lines.push("- נדרש: `observedPatternLevel ∈ {consistent,strong}` AND `evidenceStrength==='strong'` AND `engineDecision ∈ {clear_topic_gap,topic_needs_strengthening}` AND מיפוי parent-safe ל-`pattern.key`.");
  lines.push("- consistent דורש גם: `q>=12` AND `top.ratio>=0.4` (יחס מכלל השגיאות) AND cluster עם `count>=2`.");
  lines.push("- strong דורש: `q>=40` AND `top.ratio>=0.5`.");
  lines.push("- **taxonomy אינו נדרש** למסלול enrich העובדתי; כן נדרש ל-`detectedPattern` / primary DE2 claim (`blockPatternClaim` נשאר true כשאין taxonomy).");
  lines.push(
    `- דוגמה ראשונה במטריצה: ${matrixSummary.firstFactual?.scenarioId || "n/a"} → «${(matrixSummary.firstFactual?.parentFacingText || "").slice(0, 120)}…»`,
  );
  lines.push("");
  lines.push("#### ד. קושי בנושא");
  lines.push("- `topic_needs_strengthening`: `q>=5` AND `50<=acc<70`.");
  lines.push("- `clear_topic_gap`: `q>=5` AND `acc<50` (T1+).");
  lines.push("- תלוי **בעיקר בדיוק הכללי** (accuracy band), לא בדפוס. הדפוס יכול להעשיר את הנוסח כשמתקיימים תנאי ג.");
  lines.push("- Chrome: strengthen → amber `כדאי לחזק`; gap → yellow `כדאי לתרגל עוד`.");
  lines.push("");
  lines.push("#### ה. חוזקה / שליטה");
  lines.push("- `mastery_stable`: `acc>=90` AND `q>=10`.");
  lines.push("- `partial_stable`: `70<=acc<90` AND `q>=10` (tier≥T2).");
  lines.push(`- הוכחת מטריצה: 50% לעולם לא mastery: **${matrixSummary.masteryImpossibleAt50pct}**`);
  lines.push(`- acc≥90 עם q<10 לא mastery: **${matrixSummary.masteryImpossibleBelowQ10}**`);
  lines.push("");
  lines.push("### 4. האם thresholds אחידים בין מקצועות?");
  lines.push("");
  lines.push("- **כן ברמת EDC/LPD/chrome:** אותם מספרי שאלות ואחוזי דיוק לכל המקצועות.");
  lines.push("- **לא ברמת DE2 taxonomy:** `minWrong` / `minOccurrenceRatio` / `requiredTags` / candidate order שונים לפי מקצוע ו-taxonomyId.");
  lines.push("- מולדת וגאוגרפיה מאוחדים תחת `moledet-geography`.");
  lines.push("");
  lines.push("### 5. Tags coverage (סיכום)");
  lines.push("");
  lines.push(`- סה״כ tags ייחודיים במערכת (registry+rules+labels): **${tags.length}**`);
  lines.push(`- ללא תווית עברית parent-safe: **${noLabel.length}**`);
  lines.push(`- taxonomy בלי producer פעיל: **${noProducer.length}**`);
  lines.push(`- producer בלי taxonomy rule: **${producerNoTax.length}**`);
  lines.push("- פירוט מלא: `parent-engine-tags-coverage.csv`");
  lines.push("");
  lines.push("### 6. לפי מקצוע");
  lines.push("");
  for (const sid of SUBJECTS) {
    const ch = subjects[sid];
    lines.push(`#### ${ch.labelHe} (\`${sid}\`)`);
    lines.push(`- שורות taxonomy: **${ch.taxonomyRowCount}** (${ch.taxonomyIds.join(", ")})`);
    lines.push(`- tags מקושרים: **${ch.tagCount}** | מגיעים להורה (primary או factual): **${ch.tagsReachingParent}** | כלליים בלבד: **${ch.tagsGenericOnly}** | חסומים/ללא producer: **${ch.tagsBlockedOrNoProducer}**`);
    lines.push(`- דוגמת קושי חזק (dossier): ${ch.examples.weak ? `${ch.examples.weak.student}/${ch.examples.weak.topicRowKey} → ${ch.examples.weak.engineDecision}` : "אין ב-60"}`);
    lines.push(`- דוגמת חיזוק: ${ch.examples.medium ? `${ch.examples.medium.student}/${ch.examples.medium.topicRowKey}` : "אין"}`);
    lines.push(`- דוגמת דפוס ספציפי: ${ch.examples.strongPattern ? `${ch.examples.strongPattern.student}/${ch.examples.strongPattern.topicRowKey} (${ch.examples.strongPattern.topPatternKey})` : "אין ב-snapshot"}`);
    lines.push(`- דוגמת mastery: ${ch.examples.mastery ? `${ch.examples.mastery.student}/${ch.examples.mastery.topicRowKey}` : "אין"}`);
    lines.push(`- דוגמת מעט נתונים: ${ch.examples.thinData ? `${ch.examples.thinData.student}/${ch.examples.thinData.topicRowKey}` : "אין"}`);
    lines.push("");
  }
  lines.push("### 7. שלושת הדוחות");
  lines.push("");
  lines.push("- מקור האמת לטקסט/החלטה הוא אותו LPD/EDC על שורת נושא (`generateParentReportV2` → detailed/short נגזרים).");
  lines.push("- Chrome display מיושר דרך `parentTopicDisplayChromeFromRow` (display-only).");
  lines.push("- מותר קיצור נוסח; אסור שינוי משמעות. חריגות שנמצאו ב-60 dossiers מפורטות למטה.");
  lines.push("");
  lines.push("### 8. 60 דוסיירים");
  lines.push("");
  lines.push(`- קבצים: **${dossiers.fileCount || 0}**`);
  lines.push(`- חריגות שזוהו: **${(anomalies || []).length}**`);
  if ((anomalies || []).length) {
    lines.push("");
    lines.push("| type | student | topic | detail |");
    lines.push("|---|---|---|---|");
    for (const a of anomalies.slice(0, 80)) {
      lines.push(
        `| ${a.type} | ${a.student || ""} | ${a.topicRowKey || ""} | ${(a.key || a.note || a.finding || "").toString().slice(0, 80)} |`,
      );
    }
  } else {
    lines.push("- לא נמצאו חריגות קשות של חשיפת label פנימי או chrome סותר ב-snapshot.");
  }
  lines.push("");
  lines.push("### 9. מטריצת תרחישים");
  lines.push("");
  lines.push(`- תרחישים שהורצו בפונקציות פרודקשן: **${matrixSummary.scenarioCount}**`);
  lines.push(`- התפלגות קטגוריות: ${JSON.stringify(matrixSummary.byCategory)}`);
  lines.push("- פירוט שורה-שורה: `parent-engine-final-rules-matrix.csv`");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## חלק ב — בעיות והצעה למדיניות סופית (לא ליישם)");
  lines.push("");
  for (const p of problems) {
    lines.push(`### ${p.title}`);
    lines.push(`- **מצב קיים:** ${p.current}`);
    lines.push(`- **למה בעייתי:** ${p.why}`);
    lines.push(`- **כלל מוצע:** ${p.proposed}`);
    lines.push(`- **מקרים שישתנו:** ${p.impact}`);
    lines.push(`- **סוג שינוי:** ${p.changeType}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("## נקודת עצירה");
  lines.push("");
  lines.push("אין תיקון קוד בשלב זה. ממתינים לאישור מדיניות מוצר מרוכז.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Building matrix…");
  const matrix = buildMatrixRows();
  const matrixSummary = summarizeMatrix(matrix);

  console.log("Building tags coverage…");
  const tags = buildTagsCoverage();

  console.log("Analyzing dossiers…");
  const dossiersAnalysis = analyzeDossiers();

  console.log("Building subject chapters…");
  const subjects = subjectChapters(tags, dossiersAnalysis);

  const noLabel = tags.filter((t) => !t.parentSafeLabelHe);
  const problems = [
    {
      title: "רבים מה-tags ללא תווית parent-safe",
      current: `${noLabel.length}/${tags.length} tags ללא מיפוי ב-PARENT_ERROR_PATTERN_LABEL_HE`,
      why: "גם כש-consistent+strong, ההורה מקבל רק קושי כללי בנושא; המנוע יודע יותר ממה שמוצג",
      proposed: "השלמת מיפוי עברית מאושר לכל tag פעיל שמיוצר בפועל, או מדיניות מפורשת 'תמיד כללי'",
      impact: "תרחישי enrich נוספים יעברו מקושי כללי לממצא עובדתי",
      changeType: "מוצר + תצוגה (מיפוי), לא thresholds",
    },
    {
      title: "יחס הדפוס מחושב מכלל השגיאות, לא מכלל השאלות",
      current: "MIN_REPEAT_RATIO=0.4 על wrongs; consistent דורש גם q>=12",
      why: "קל לבלבל בין '40% מהשגיאות' ל-'40% מהשאלות'; הורה עלול להבין אחרת",
      proposed: "להגדיר במדיניות מוצר האם הסף הוא מתוך שגיאות או מתוך שאלות, ולשקף בנוסח",
      impact: "ייתכן שינוי סיווג observedPatternLevel אם יוחלף הבסיס",
      changeType: "מנוע (אם משנים חישוב) או מוצר/הסבר בלבד",
    },
    {
      title: "ממצא עובדתי דורש evidenceStrength=strong (q>=12) בנוסף ל-consistent",
      current: "consistent כבר דורש q>=12; החפיפה כפולה אבל clear",
      why: "אין מסלול factual ב-q=10-11 גם אם יש חזרתיות חזקה יחסית",
      proposed: "להחליט אם factual מותר גם ב-supported (8-11) או רק strong",
      impact: "נושאים עם 8-11 שאלות",
      changeType: "מוצר + enricher (לא DE2)",
    },
    {
      title: "blockPatternClaim נשאר true בלי taxonomy גם כשיש enrich",
      current: "detectedPattern=null, blockPatternClaim=true, אבל parentSafeFinding יכול להיות ספציפי",
      why: "שדות מנוע אומרים 'חסום' בעוד שההורה רואה דפוס — עלול לבלבל מעקב פנימי",
      proposed: "להפריד במפורש factualParentObservation משדה detectedPattern, או לתעד את ההפרדה",
      impact: "תיעוד/חוזה; לא בהכרח שינוי תצוגה",
      changeType: "חוזה/מוצר",
    },
    {
      title: "מולדת וגאוגרפיה מאוחדים",
      current: "subjectId אחד: moledet-geography",
      why: "בדיקת 'כל מקצוע בנפרד' לא משקפת את מודל הנתונים",
      proposed: "להשאיר מאוחד או לפצל במוצר בלבד בשכבת תצוגה",
      impact: "סיכומי מקצוע בדוח",
      changeType: "מוצר/תצוגה",
    },
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: "read_only",
    thresholds: THRESHOLDS,
    pipeline: PIPELINE,
    matrixSummary,
    matrix,
    tags,
    tagStats: {
      total: tags.length,
      withoutParentSafeLabel: noLabel.length,
      taxonomyWithoutProducer: tags.filter((t) => t.hasTaxonomy && !t.producerActive).length,
      producerWithoutTaxonomy: tags.filter((t) =>
        t.notes.includes("producer_without_taxonomy_rule"),
      ).length,
      canFactualOnly: tags.filter((t) => t.canFactualOnly).length,
    },
    subjects,
    dossiers: {
      fileCount: dossiersAnalysis.fileCount,
      anomalies: dossiersAnalysis.anomalies,
      // compact per-dossier summary (full topics in JSON may be large — keep topics)
      items: (dossiersAnalysis.dossiers || []).map((d) => ({
        file: d.file,
        student: d.student,
        grade: d.grade,
        checkpoint: d.checkpoint,
        topicCount: d.topicCount,
        topics: d.topics,
        practicedSubjects: d.practicedSubjects,
        reportSizes: d.reportSizes,
      })),
    },
    anomalies: dossiersAnalysis.anomalies,
    problems,
    chatSummaryHints: {
      thresholdsUniformAcrossSubjects:
        "EDC/LPD/chrome uniform; DE2 taxonomy thresholds subject-specific",
      firstParentFinding: "q>=5 leaves T0; first non-insufficient decisions start at q=5",
      firstSpecificPattern:
        "consistent+strong+gap/strengthen+mapped label (typically q>=12, pattern ratio among wrongs>=0.4, count>=2)",
      generalDifficulty: "accuracy bands at q>=5: strengthen 50-69, gap <50",
      strength: "partial_stable q>=10 & 70-89; mastery_stable q>=10 & >=90",
      tagsNotReachingParent: noLabel.length,
    },
  };

  const md = buildMarkdown(payload);
  const matrixCols = [
    "scenarioId",
    "totalQuestions",
    "correctAnswers",
    "totalErrors",
    "accuracyPct",
    "patternTag",
    "patternCount",
    "patternRatioOfQuestions",
    "patternRatioOfErrors",
    "sessions",
    "days",
    "sameSessionOnly",
    "crossSession",
    "crossDay",
    "observedPatternLevel",
    "evidenceStrength",
    "taxonomyId",
    "classificationState",
    "patternLayer",
    "engineDecision",
    "engineDecisionAuthority",
    "adcAction",
    "blockPatternClaim",
    "patternKey",
    "patternLabel",
    "parentSafeLabelHe",
    "enrichApplied",
    "parentFacingText",
    "badge",
    "visualVariant",
    "cardColorHint",
    "category",
    "clearWeak",
    "detectedPattern",
    "appearsRegular",
    "appearsDetailed",
    "appearsShort",
  ];

  const tagCols = [
    "internalTag",
    "subjects",
    "taxonomyIds",
    "topicsOrSubskillsHe",
    "evidenceSource",
    "classifierProducer",
    "producerActive",
    "hasTaxonomy",
    "parentSafeLabelHe",
    "canPrimaryFinding",
    "canSecondaryFinding",
    "canFactualOnly",
    "alwaysBlocked",
    "consistentStrongNoTaxonomy",
    "riskInternalTagExposure",
    "notes",
  ];

  fs.writeFileSync(
    path.join(OUT_DIR, "PARENT-ENGINE-FINAL-RULES-AUDIT.md"),
    md,
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "parent-engine-final-rules-matrix.csv"),
    toCsv(matrix, matrixCols),
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "parent-engine-tags-coverage.csv"),
    toCsv(tags, tagCols),
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "parent-engine-final-rules-audit.json"),
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  console.log("Wrote:", OUT_DIR);
  console.log("matrix scenarios:", matrix.length);
  console.log("tags:", tags.length, "noLabel:", noLabel.length);
  console.log("dossiers:", dossiersAnalysis.fileCount, "anomalies:", (dossiersAnalysis.anomalies || []).length);
  console.log(
    "first factual:",
    matrixSummary.firstFactual?.scenarioId,
    matrixSummary.firstFactual?.parentFacingText?.slice(0, 100),
  );
}

main();
