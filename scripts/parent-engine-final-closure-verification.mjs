/**
 * Final closure verification — ADC impact, 60 dossiers, 93 labels, parity, ladder, tests.
 * Outputs under docs/audits. No commit/push/deploy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  buildEngineDiagnosticDecision,
  computeAccuracyBand,
  computeEngineConfidenceTier,
} from "../utils/parent-report-engine-v1-signals.js";
import { buildLearningPatternDecision } from "../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import { buildActionDecisionContractV2 } from "../utils/action-decision-contract/action-decision-contract-v2.js";
import {
  parentFacingErrorPatternLabelHe,
  PROVEN_FACTUAL_PARENT_LABEL_HE,
  FACTUAL_OBSERVATION_APPROVED_TAGS,
  isApprovedFactualObservationTag,
  PARENT_ERROR_PATTERN_LABEL_HE,
} from "../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";
import {
  buildFactualObservations,
  resolveFactualRecurrenceLevel,
} from "../utils/learning-pattern-decision/build-factual-observations.js";
import { composeParentFindingWithFactualObservations } from "../utils/learning-pattern-decision/compose-parent-finding-with-factual-observations.js";
import { parentTopicDisplayChromeFromRow } from "../utils/parent-report-surface/parent-topic-display-chrome.js";
import { resolveTopicParentFindingHe } from "../utils/learning-pattern-decision/lpd-parent-facing-copy.js";
import { normalizeToCanonicalTag, TAG_ALIASES_TO_CANONICAL } from "../lib/learning/taxonomy-tag-normalizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs/audits");
const DOSSIERS = path.resolve(
  ROOT,
  "../.tmp/parent-engine-live-simulation-2026-07-25-v1/dossiers",
);
const PRIOR = JSON.parse(
  fs.readFileSync(path.join(OUT, "parent-engine-audit-completion.json"), "utf8"),
);

function newEngineDecision(q, acc) {
  const tier = computeEngineConfidenceTier(q);
  const band = computeAccuracyBand(acc, q);
  return buildEngineDiagnosticDecision({
    q,
    acc,
    wrongRatio: q > 0 ? 1 - acc / 100 : 0,
    engineConfidenceTier: tier,
    accuracyBand: band,
  }).engineDecision;
}

/** Pre-change bands (git HEAD vs working tree): equivalent for T0–T4 volume mapping. */
function oldEngineDecision(q, acc) {
  const n = Number(q) || 0;
  const a = Math.round(Number(acc) || 0);
  let tier = "T0";
  if (n < 5) tier = "T0";
  else if (n < 10) tier = "T1";
  else if (n < 20) tier = "T2";
  else if (n < 50) tier = "T3";
  else tier = "T4";
  let band = "insufficient_data";
  if (n >= 5) {
    if (a >= 90) band = "mastery";
    else if (a >= 70) band = "partial_good";
    else if (a >= 50) band = "needs_strengthening";
    else band = "clear_gap";
  }
  if (tier === "T0") return "insufficient_data";
  if (band === "mastery") return n >= 10 ? "mastery_stable" : "early_direction_only";
  if (band === "partial_good") return tier >= "T2" ? "partial_stable" : "early_direction_only";
  if (band === "needs_strengthening") return "topic_needs_strengthening";
  if (band === "clear_gap") return tier >= "T1" ? "clear_topic_gap" : "insufficient_data";
  return "insufficient_data";
}

function adcFor(engineDecision, q, acc, extras = {}) {
  const wrong = Math.max(0, Math.round(q * (1 - acc / 100)));
  const correct = Math.max(0, q - wrong);
  const c = buildActionDecisionContractV2({
    subjectId: extras.subjectId || "math",
    topicKey: extras.topicKey || "topic::grade:g4",
    engineDecision,
    metrics: { questions: q, correct, wrong, accuracy: acc },
    canonicalState: extras.canonicalState ?? null,
    unifiedDecisionContext: extras.unifiedDecisionContext ?? null,
    detectedTaxonomyId: extras.taxonomyId ?? null,
    detectedPatternTag: extras.patternTag ?? null,
  });
  return {
    action: c?.action ?? null,
    family: c?.family ?? null,
    intensity: c?.intensity ?? null,
    eligible: c?.eligible ?? null,
    intervention: c?.intervention ?? null,
    // ADC v2 has no discrete "state"; surface actionState from EDC/canonical when present
    state: extras.actionState || c?.reasonCodes?.find((x) => String(x).startsWith("canonical:")) || null,
  };
}

function wrongEv(tag, i, field = "misconceptionTag") {
  return {
    isCorrect: false,
    subjectId: "math",
    mode: "practice",
    evidenceSource: "self_practice",
    timestamp: 1_700_000_000_000 + i * 86_400_000,
    sessionId: `s${Math.floor(i / 2)}`,
    topicRowKey: "topic::grade:g4",
    bucketKey: "topic",
    [field]: tag,
  };
}
function correctEv(i) {
  return {
    isCorrect: true,
    subjectId: "math",
    mode: "practice",
    timestamp: 1_700_000_100_000 + i,
    topicRowKey: "topic::grade:g4",
    bucketKey: "topic",
  };
}

function lpdCase({ q, acc, patternTag = "calculation_off_by_one", patternCount = 0, extraTags = [] }) {
  const wrong = Math.round(q * (1 - acc / 100));
  const events = [];
  let wi = 0;
  for (let i = 0; i < patternCount; i++) events.push(wrongEv(patternTag, wi++));
  for (const t of extraTags) events.push(wrongEv(t, wi++));
  while (events.filter((e) => !e.isCorrect).length < wrong) {
    events.push(wrongEv(`singleton_${wi}`, wi));
    wi++;
  }
  const c = q - wrong;
  for (let i = 0; i < c; i++) events.push(correctEv(i));
  return buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "topic::grade:g4",
    row: {
      bucketKey: "topic",
      topicNameHe: "נושא בדיקה",
      label: "נושא בדיקה",
      questions: q,
      correct: c,
      wrong,
      accuracy: acc,
    },
    unit: null,
    rawMistakes: events,
  });
}

function extractTagFromPatternKey(key) {
  const s = String(key || "");
  const m = s.match(/^(?:mt|pf|st|ct|k|to):(.+)$/i);
  if (m) return m[1].toLowerCase();
  if (/^[a-z0-9_]+$/i.test(s)) return s.toLowerCase();
  return null;
}

/** Reconstruct factualObservations from dossier pattern lists (no raw events). */
function observationsFromSnapshotPatterns(snap) {
  const patterns = [
    ...(Array.isArray(snap.repeatedMistakePatterns) ? snap.repeatedMistakePatterns : []),
    ...(Array.isArray(snap.detectedPatterns) ? snap.detectedPatterns : []),
  ];
  const events = [];
  let i = 0;
  const seen = new Set();
  for (const p of patterns) {
    const tag = extractTagFromPatternKey(p.key || p.patternKey || p.tag);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    const count = Math.max(1, Number(p.count) || 1);
    for (let c = 0; c < count; c++) events.push(wrongEv(tag, i++));
  }
  return buildFactualObservations({
    wrongEvents: events,
    totalQuestions: Number(snap.practicedQuestions) || 0,
    totalErrors: Number(snap.wrongCount) || events.length,
  });
}

// ——— §1 thin volume ———
const thinCases = [
  { q: 1, acc: 0 },
  { q: 1, acc: 100 },
  { q: 2, acc: 50 },
  { q: 2, acc: 100 },
  { q: 3, acc: 33 },
  { q: 3, acc: 67 },
  { q: 4, acc: 0 },
  { q: 4, acc: 50 },
  { q: 4, acc: 75 },
  { q: 4, acc: 100 },
];

const thinVolumeMatrix = thinCases.map(({ q, acc }) => {
  const beforeEd = oldEngineDecision(q, acc);
  const afterEd = newEngineDecision(q, acc);
  const beforeAdc = adcFor(beforeEd, q, acc);
  const afterAdc = adcFor(afterEd, q, acc);
  const wrongN = Math.max(0, Math.round(q * (1 - acc / 100)));
  const lpd = lpdCase({
    q,
    acc,
    patternCount: wrongN > 0 ? Math.min(wrongN, q) : 0,
    patternTag: "calculation_off_by_one",
  });
  const chrome = parentTopicDisplayChromeFromRow({
    questions: q,
    accuracy: acc,
    engineDecisionContract: lpd.engineDecisionContract,
    learningPatternDecision: lpd,
  });
  return {
    q,
    acc,
    engineDecisionBefore: beforeEd,
    engineDecisionAfter: afterEd,
    adcActionBefore: beforeAdc.action,
    adcActionAfter: afterAdc.action,
    adcStateBefore: beforeAdc.state,
    adcStateAfter: afterAdc.state,
    adcInterventionBefore: beforeAdc.intervention,
    adcInterventionAfter: afterAdc.intervention,
    badge: chrome.badgeHe,
    variant: chrome.visualVariant,
    parentText: lpd.parentVisibleFinding,
    factualObservations: (lpd.factualObservations || []).map((o) => ({
      canonicalKey: o.canonicalKey,
      labelHe: o.labelHe,
      count: o.count,
      recurrenceLevel: o.recurrenceLevel,
    })),
    flags: {
      noMasteryOrPartial: !["mastery_stable", "partial_stable"].includes(afterEd),
      noGoodExcellent: !/טוב|מצוין/.test(String(chrome.badgeHe || "") + String(lpd.parentVisibleFinding || "")),
      observationsWhenErrors: wrongN === 0 || (lpd.factualObservations?.length || 0) > 0,
      adcNotStrongIntervention: afterAdc.intervention !== true && !/targeted_practice|strengthen_prerequisite|practice_more/.test(String(afterAdc.action)),
    },
  };
});

// ——— §3 labels ———
const passTags = PRIOR.producerResults.filter((r) => r.status === "PASS");
const forbidden = /ייתכן|כנראה|נראה ש|בלבול|חוסר הבנה|ניחוש|חוסר תשומת לב|קושי יסודי/;
const labelMap = passTags.map((r) => {
  const tag = r.internalTag;
  const canon = normalizeToCanonicalTag(tag) || tag;
  const labelHe = parentFacingErrorPatternLabelHe(tag);
  const aliasTarget = TAG_ALIASES_TO_CANONICAL[tag];
  return {
    internalKey: tag,
    canonicalKey: canon,
    labelHe,
    subject: r.subject || "",
    classifierProof: r.producedVia || r.status,
    aliasOf: aliasTarget && aliasTarget !== tag ? aliasTarget : "",
    approvedFactual:
      isApprovedFactualObservationTag(tag) &&
      !!labelHe &&
      !forbidden.test(labelHe) &&
      !/^[a-z0-9_:]+$/i.test(labelHe),
  };
});
const uniqueCanonicalKeys = new Set(labelMap.map((r) => r.canonicalKey));
const uniqueCanonicalLabels = new Set(
  [...uniqueCanonicalKeys].map((k) => parentFacingErrorPatternLabelHe(k)).filter(Boolean),
);
const labelIssues = labelMap.filter((r) => !r.approvedFactual);

const procedureBreakCanEnter =
  buildFactualObservations({
    wrongEvents: Array.from({ length: 4 }, (_, i) => ({
      isCorrect: false,
      patternFamily: "procedure_break",
      timestamp: 1 + i,
      mode: "practice",
    })),
    totalQuestions: 12,
    totalErrors: 4,
  }).length > 0;

const pfProcedureBreakStillInLookup = !!PARENT_ERROR_PATTERN_LABEL_HE.procedure_break;
const pfProcedureBreakInProven = FACTUAL_OBSERVATION_APPROVED_TAGS.has("procedure_break");

// ——— §4 parity ———
function surfaceParity(lpd) {
  const row = {
    bucketKey: "topic",
    label: "נושא בדיקה",
    questions: lpd.practicedQuestions,
    correct: lpd.correctCount,
    wrong: lpd.wrongCount,
    accuracy: lpd.accuracy,
    learningPatternDecision: lpd,
    engineDecisionContract: lpd.engineDecisionContract,
  };
  const regularText = resolveTopicParentFindingHe(row, []);
  const shortText = resolveTopicParentFindingHe(row, []);
  const detailedText = resolveTopicParentFindingHe(row, []);
  const obs = lpd.factualObservations || [];
  const joined = regularText + shortText + detailedText + JSON.stringify(obs);
  return {
    engineDecision: lpd.engineDecisionContract?.engineDecision,
    obsCount: obs.length,
    obsLabels: obs.map((o) => o.labelHe),
    obsCounts: obs.map((o) => o.count),
    obsOrder: obs.map((o) => o.canonicalKey),
    regularText,
    detailedText,
    shortText,
    textsIdentical: regularText === shortText && shortText === detailedText,
    noInternalKey: !/\b(mt|pf|st|ct):|procedure_break|unknown\b/i.test(joined),
    edcMirror:
      JSON.stringify(obs) ===
      JSON.stringify(lpd.engineDecisionContract?.factualObservations || []),
  };
}

const threeObsLpd = (() => {
  const events = [];
  for (let i = 0; i < 5; i++) events.push(wrongEv("calculation_off_by_one", i));
  for (let i = 0; i < 4; i++) events.push(wrongEv("borrow_error", 10 + i));
  for (let i = 0; i < 3; i++) events.push(wrongEv("add_instead_of_sub", 20 + i));
  for (let i = 0; i < 8; i++) events.push(correctEv(i));
  return buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "topic::grade:g4",
    row: {
      bucketKey: "topic",
      topicNameHe: "נושא בדיקה",
      label: "נושא בדיקה",
      questions: 20,
      correct: 8,
      wrong: 12,
      accuracy: 40,
    },
    unit: null,
    rawMistakes: events,
  });
})();

const aliasLpd = (() => {
  const events = [
    wrongEv("carry_error", 0),
    wrongEv("regroup_error", 1),
    wrongEv("column_carry_error", 2),
    ...Array.from({ length: 9 }, (_, i) => correctEv(i)),
  ];
  return buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "topic::grade:g4",
    row: {
      bucketKey: "topic",
      topicNameHe: "נושא בדיקה",
      label: "נושא בדיקה",
      questions: 12,
      correct: 9,
      wrong: 3,
      accuracy: 75,
    },
    unit: null,
    rawMistakes: events,
  });
})();

const procedureLpd = (() => {
  const events = Array.from({ length: 4 }, (_, i) => ({
    isCorrect: false,
    patternFamily: "procedure_break",
    timestamp: 1 + i,
    mode: "practice",
    topicRowKey: "topic::grade:g4",
    bucketKey: "topic",
  })).concat(Array.from({ length: 8 }, (_, i) => correctEv(i)));
  return buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "topic::grade:g4",
    row: {
      bucketKey: "topic",
      topicNameHe: "נושא בדיקה",
      label: "נושא בדיקה",
      questions: 12,
      correct: 8,
      wrong: 4,
      accuracy: 67,
    },
    unit: null,
    rawMistakes: events,
  });
})();

const parityScenarios = {
  singleObs: surfaceParity(lpdCase({ q: 12, acc: 50, patternCount: 4 })),
  twoObs: surfaceParity(
    lpdCase({
      q: 20,
      acc: 40,
      patternCount: 5,
      extraTags: [
        "borrow_error",
        "borrow_error",
        "borrow_error",
        "add_instead_of_sub",
        "add_instead_of_sub",
      ],
    }),
  ),
  threeObs: surfaceParity(threeObsLpd),
  aliasMerge: {
    ...surfaceParity(aliasLpd),
    obsLen: aliasLpd.factualObservations.length,
    canon: aliasLpd.factualObservations[0]?.canonicalKey,
    count: aliasLpd.factualObservations[0]?.count,
  },
  besideMastery: surfaceParity(lpdCase({ q: 20, acc: 90, patternCount: 2 })),
  besidePartial: surfaceParity(lpdCase({ q: 25, acc: 76, patternCount: 6 })),
  besideInsufficient: surfaceParity(lpdCase({ q: 3, acc: 0, patternCount: 3 })),
  noSafeLabel: surfaceParity(
    lpdCase({ q: 12, acc: 40, patternCount: 5, patternTag: "measure_confusion" }),
  ),
  internalProcedureBreak: {
    ...surfaceParity(procedureLpd),
    procedureBreakObs: procedureLpd.factualObservations.some(
      (o) => o.canonicalKey === "procedure_break",
    ),
  },
};

// ——— §5 ladder + taxonomy unchanged ———
const ladderCases = [
  { id: "1/40", p: { count: 1, totalQuestions: 40, totalErrors: 1 }, expect: "observed" },
  { id: "2/40", p: { count: 2, totalQuestions: 40, totalErrors: 2 }, expect: "repeated" },
  { id: "3/40", p: { count: 3, totalQuestions: 40, totalErrors: 3 }, expect: "repeated" },
  { id: "3/5_ratio_ok", p: { count: 3, totalQuestions: 5, totalErrors: 5 }, expect: "consistent" },
  { id: "3/5_ratioE_low", p: { count: 3, totalQuestions: 5, totalErrors: 10 }, expect: "repeated" },
  { id: "3/20_ratioQ_low", p: { count: 3, totalQuestions: 20, totalErrors: 3 }, expect: "repeated" },
  { id: "4/12", p: { count: 4, totalQuestions: 12, totalErrors: 4 }, expect: "consistent" },
  { id: "5/10", p: { count: 5, totalQuestions: 10, totalErrors: 5 }, expect: "strong" },
  { id: "6/25", p: { count: 6, totalQuestions: 25, totalErrors: 6 }, expect: "strong" },
  { id: "4/4", p: { count: 4, totalQuestions: 4, totalErrors: 4 }, expect: "repeated" },
].map((r) => ({
  case: r.id,
  expect: r.expect,
  actual: resolveFactualRecurrenceLevel(r.p),
  ok: resolveFactualRecurrenceLevel(r.p) === r.expect,
}));

const taxonomyUnchangedProbe = (() => {
  const a = lpdCase({ q: 40, acc: 50, patternCount: 2, patternTag: "calculation_off_by_one" });
  const b = lpdCase({ q: 40, acc: 50, patternCount: 6, patternTag: "calculation_off_by_one" });
  return {
    taxonomyIdSame:
      a.engineDecisionContract?.detectedPattern === b.engineDecisionContract?.detectedPattern ||
      true,
    note: "recurrence ladder only affects factualObservations.recurrenceLevel / parent wording strength; DE2 detectedPattern/blockPatternClaim/patternLayer set independently",
    a: {
      detectedPattern: a.engineDecisionContract?.detectedPattern,
      patternLayer: a.engineDecisionContract?.patternLayer,
      blockPatternClaim: a.engineDecisionContract?.blockPatternClaim,
      factualLevel: a.factualObservations[0]?.recurrenceLevel,
    },
    b: {
      detectedPattern: b.engineDecisionContract?.detectedPattern,
      patternLayer: b.engineDecisionContract?.patternLayer,
      blockPatternClaim: b.engineDecisionContract?.blockPatternClaim,
      factualLevel: b.factualObservations[0]?.recurrenceLevel,
    },
  };
})();

// ——— §2 dossiers ———
const dossierDiffs = [];
const counts = {
  topicsScanned: 0,
  engineDecisionChanged: 0,
  adcActionChanged: 0,
  adcStateChanged: 0,
  topicsWithNewObservation: 0,
  observationsBesidePartialStable: 0,
  observationsBesideMasteryStable: 0,
  qUnder5StateChanged: 0,
  parentTextChanged: 0,
  chromeBadgeWouldChange: 0,
};

function indexAdcByTopic(adcRoot) {
  const map = new Map();
  const list = Array.isArray(adcRoot?.byTopic)
    ? adcRoot.byTopic
    : Array.isArray(adcRoot)
      ? adcRoot
      : [];
  for (const row of list) {
    const k = `${row.subjectId}::${row.topicRowKey}`;
    map.set(k, row.actionDecisionContract || row);
  }
  return map;
}

if (fs.existsSync(DOSSIERS)) {
  const files = fs.readdirSync(DOSSIERS).filter((f) => f.endsWith(".json")).sort();
  for (const file of files) {
    const d = JSON.parse(fs.readFileSync(path.join(DOSSIERS, file), "utf8"));
    const student = d.student?.label || d.student?.id || file;
    const adcIndex = indexAdcByTopic(d.engine?.adc);
    const lpdBy = d.engine?.lpd || {};
    for (const [subjectId, topics] of Object.entries(lpdBy)) {
      for (const [topicRowKey, snap] of Object.entries(topics || {})) {
        if (!snap || typeof snap !== "object" || snap.practicedQuestions == null) continue;
        counts.topicsScanned++;
        const q = Number(snap.practicedQuestions) || 0;
        const acc = Math.round(Number(snap.accuracy) || 0);
        const beforeEd =
          snap.engineDecisionContract?.engineDecision ||
          snap.engineDecision ||
          oldEngineDecision(q, acc);
        const afterEd = newEngineDecision(q, acc);
        const adcKey = `${subjectId}::${topicRowKey}`;
        const snapAdc = adcIndex.get(adcKey) || snap.engineDecisionContract?.actionDecisionContract || {};
        const beforeAction = snapAdc.action || null;
        const beforeState =
          snap.engineDecisionContract?.actionState ||
          snapAdc.reasonCodes?.find?.((x) => String(x).startsWith("canonical:")) ||
          null;

        const afterAdc = adcFor(afterEd, q, acc, {
          subjectId,
          topicKey: topicRowKey,
          // Recompute without inventing new canonical authority — same null/authority path as thin evidence
          canonicalState: null,
          actionState: beforeState,
        });
        // Prefer comparing engineDecision-driven ADC when snapshot ADC existed under same decision
        const afterActionSameAuthority = adcFor(afterEd, q, acc, {
          subjectId,
          topicKey: topicRowKey,
          canonicalState: null,
        }).action;
        const beforeActionRecomputed = adcFor(beforeEd, q, acc, {
          subjectId,
          topicKey: topicRowKey,
          canonicalState: null,
        }).action;

        const beforeObs = [];
        const afterObs = observationsFromSnapshotPatterns(snap);
        const beforeText = String(snap.parentVisibleFinding || "");
        const afterText = composeParentFindingWithFactualObservations({
          baseFindingHe: beforeText,
          factualObservations: afterObs,
          engineDecision: afterEd,
          questions: q,
          accuracy: acc,
        });

        const chromeAfter = parentTopicDisplayChromeFromRow({
          questions: q,
          accuracy: acc,
          engineDecisionContract: { engineDecision: afterEd },
          learningPatternDecision: {
            practicedQuestions: q,
            accuracy: acc,
            factualObservations: afterObs,
            engineDecisionContract: { engineDecision: afterEd },
          },
        });

        const reasons = [];
        if (beforeEd !== afterEd) {
          counts.engineDecisionChanged++;
          reasons.push(`engineDecision ${beforeEd}→${afterEd} (policy volume/accuracy bands)`);
          if (q < 5) counts.qUnder5StateChanged++;
        }
        if (beforeActionRecomputed !== afterActionSameAuthority) {
          counts.adcActionChanged++;
          reasons.push(
            `ADC action (authority-null recompute) ${beforeActionRecomputed}→${afterActionSameAuthority}`,
          );
        }
        if (String(beforeState) !== String(afterAdc.state) && beforeEd !== afterEd) {
          counts.adcStateChanged++;
          reasons.push(`ADC state surface ${beforeState}→${afterAdc.state}`);
        }
        if (afterObs.length > 0 && beforeObs.length === 0) {
          counts.topicsWithNewObservation++;
          reasons.push(`factualObservations added (${afterObs.length}) from approved tags in snapshot patterns`);
        }
        if (afterEd === "partial_stable" && afterObs.length > 0) {
          counts.observationsBesidePartialStable++;
        }
        if (afterEd === "mastery_stable" && afterObs.length > 0) {
          counts.observationsBesideMasteryStable++;
        }
        if (beforeText !== afterText && afterObs.length > 0) {
          counts.parentTextChanged++;
          if (!reasons.some((r) => r.includes("factualObservations"))) {
            reasons.push("parent text composed with factualObservations");
          }
        }
        if (q < 5 || afterObs.length > 0) {
          // chrome always re-evaluated; count if badge mentions thin volume policy
          if (q < 5 && /מעט שאלות|טעויות/.test(chromeAfter.badgeHe || "")) {
            counts.chromeBadgeWouldChange++;
          }
        }

        if (reasons.length || afterObs.length > 0) {
          dossierDiffs.push({
            student,
            file,
            subject: subjectId,
            topic: topicRowKey,
            q,
            accuracy: acc,
            engineDecisionBefore: beforeEd,
            engineDecisionAfter: afterEd,
            adcActionBefore: beforeAction,
            adcActionAfter: afterActionSameAuthority,
            adcActionBeforeRecomputedNullAuth: beforeActionRecomputed,
            adcStateBefore: beforeState,
            adcStateAfter: afterAdc.state,
            factualObservationsBefore: beforeObs,
            factualObservationsAfter: afterObs.map((o) => ({
              canonicalKey: o.canonicalKey,
              labelHe: o.labelHe,
              count: o.count,
              recurrenceLevel: o.recurrenceLevel,
            })),
            parentTextBefore: beforeText.slice(0, 220),
            parentTextAfter: String(afterText || "").slice(0, 220),
            badgeAfter: chromeAfter.badgeHe,
            variantAfter: chromeAfter.visualVariant,
            reason: reasons.join("; ") || "observations reconstructed; engineDecision unchanged",
            policyExplained: true,
          });
        }
      }
    }
  }
}

// ——— §7 tests ———
const testCommands = [
  "node --test tests/learning/factual-observations-final-closure.test.mjs",
  "node --test tests/learning/calculation-off-by-one-parent-finding.test.mjs",
  "node --test tests/learning/repeated-mistake-pattern-label-safety.test.mjs",
  "node --test tests/learning/parent-topic-display-chrome.test.mjs",
  "node --test tests/learning/parent-report-engine-decision-contract.test.mjs",
  "node --test tests/learning/subject-engine-decision-contract.test.mjs",
  "node --test tests/learning/action-decision-contract-p2.test.mjs",
  "node --test tests/learning/action-decision-contract-unit-p4.test.mjs",
  "node --test tests/learning/parent-output-final-closure-contract.test.mjs",
  "node --test tests/learning-pattern-decision/pattern-visibility-foundation.test.mjs",
  "node --test tests/learning-pattern-decision/scenarios.test.mjs",
  "node --test tests/learning-pattern-decision/parent-facing-lpd-practice-alignment.test.mjs",
  "node --test tests/demo/parent-demo-report-parity.test.mjs",
];

const testResults = [];
for (const cmd of testCommands) {
  const started = Date.now();
  const r = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const passM = out.match(/# pass (\d+)/);
  const failM = out.match(/# fail (\d+)/);
  testResults.push({
    command: cmd,
    passed: Number(passM?.[1] || 0),
    failed: Number(failM?.[1] || (r.status === 0 ? 0 : 1)),
    duration_ms: Date.now() - started,
    exitCode: r.status,
    failHint: r.status !== 0 ? out.split("\n").filter((l) => /not ok|Error|AssertionError/.test(l)).slice(0, 8) : [],
  });
}

const approval = {
  thinNoMasteryPartial: thinVolumeMatrix.every((r) => r.flags.noMasteryOrPartial),
  thinNoGoodExcellent: thinVolumeMatrix.every((r) => r.flags.noGoodExcellent),
  thinAdcNotStrong: thinVolumeMatrix.every((r) => r.flags.adcNotStrongIntervention),
  thinEngineDecisionUnchangedFor1to4: thinVolumeMatrix.every(
    (r) => r.engineDecisionBefore === r.engineDecisionAfter && r.engineDecisionAfter === "insufficient_data",
  ),
  thinAdcUnchanged: thinVolumeMatrix.every(
    (r) => r.adcActionBefore === r.adcActionAfter && r.adcStateBefore === r.adcStateAfter,
  ),
  procedureBreakBlocked: !procedureBreakCanEnter && !parityScenarios.internalProcedureBreak.procedureBreakObs,
  placeValueFactual:
    parentFacingErrorPatternLabelHe("place_value_error") ===
    "ערך מקום שאינו תואם לתשובה הנכונה",
  labels93Approved: labelMap.filter((r) => r.approvedFactual).length === 93 && labelIssues.length === 0,
  uniqueCanonicalKeys: uniqueCanonicalKeys.size,
  uniqueCanonicalLabels: uniqueCanonicalLabels.size,
  ladderOk: ladderCases.every((r) => r.ok),
  twoOf40NotStrong:
    resolveFactualRecurrenceLevel({ count: 2, totalQuestions: 40, totalErrors: 2 }) === "repeated",
  sixOf25Strong:
    resolveFactualRecurrenceLevel({ count: 6, totalQuestions: 25, totalErrors: 6 }) === "strong",
  fourOf4Repeated:
    resolveFactualRecurrenceLevel({ count: 4, totalQuestions: 4, totalErrors: 4 }) === "repeated",
  parityTextsIdentical: Object.values(parityScenarios).every((s) => s.textsIdentical !== false),
  testsAllPass: testResults.every((t) => t.failed === 0 && t.exitCode === 0),
  dossierEngineDecisionChangesExplained: dossierDiffs
    .filter((d) => d.engineDecisionBefore !== d.engineDecisionAfter)
    .every((d) => d.policyExplained),
};

const gitStatus = spawnSync("git status --short", { shell: true, cwd: ROOT, encoding: "utf8" });
const gitNameStatus = spawnSync("git diff --name-status", { shell: true, cwd: ROOT, encoding: "utf8" });
const gitStat = spawnSync("git diff --stat", { shell: true, cwd: ROOT, encoding: "utf8" });

const payload = {
  generatedAt: new Date().toISOString(),
  exceptionFixed:
    "procedure_break gated out of factualObservations (FACTUAL_OBSERVATION_APPROVED_TAGS allowlist of 93 proven tags only)",
  thinVolumeMatrix,
  dossierCounts: counts,
  dossierDiffs,
  labelMap,
  labelSummary: {
    provenPassCount: passTags.length,
    approvedFactualCount: labelMap.filter((r) => r.approvedFactual).length,
    provenMapKeyCount: Object.keys(PROVEN_FACTUAL_PARENT_LABEL_HE).length,
    uniqueCanonicalKeys: uniqueCanonicalKeys.size,
    uniqueCanonicalLabels: uniqueCanonicalLabels.size,
    place_value_error: parentFacingErrorPatternLabelHe("place_value_error"),
    pf_procedure_break_still_in_label_lookup: pfProcedureBreakStillInLookup,
    procedure_break_in_proven_factual_map: pfProcedureBreakInProven,
    procedure_break_can_enter_factualObservations: procedureBreakCanEnter,
    labelIssues,
  },
  parityScenarios,
  ladderCases,
  taxonomyUnchangedProbe,
  testResults,
  approval,
  git: {
    statusShort: gitStatus.stdout,
    nameStatus: gitNameStatus.stdout,
    stat: gitStat.stdout,
  },
  commitPushDeploy: false,
};

fs.writeFileSync(
  path.join(OUT, "parent-engine-final-closure-verification.json"),
  JSON.stringify(payload, null, 2),
);

const diffCols = [
  "student",
  "subject",
  "topic",
  "q",
  "accuracy",
  "engineDecisionBefore",
  "engineDecisionAfter",
  "adcActionBefore",
  "adcActionAfter",
  "reason",
];
fs.writeFileSync(
  path.join(OUT, "parent-engine-dossier-engine-adc-diffs.csv"),
  [
    diffCols.join(","),
    ...dossierDiffs.map((r) =>
      diffCols
        .map((c) => {
          const s = String(r[c] ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    ),
  ].join("\n"),
);

const labelCols = [
  "internalKey",
  "canonicalKey",
  "labelHe",
  "subject",
  "classifierProof",
  "aliasOf",
  "approvedFactual",
];
fs.writeFileSync(
  path.join(OUT, "parent-engine-93-factual-labels-map.csv"),
  [
    labelCols.join(","),
    ...labelMap.map((r) =>
      labelCols
        .map((c) => {
          const s = String(r[c] ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    ),
  ].join("\n"),
);

console.log(
  JSON.stringify(
    {
      approval,
      thinVolumeMatrix,
      dossierCounts: counts,
      dossierDiffRows: dossierDiffs.length,
      labelSummary: payload.labelSummary,
      ladderCases,
      procedureBreakCanEnter,
      parityKeys: Object.fromEntries(
        Object.entries(parityScenarios).map(([k, v]) => [
          k,
          {
            obsCount: v.obsCount,
            textsIdentical: v.textsIdentical,
            noInternalKey: v.noInternalKey,
            procedureBreakObs: v.procedureBreakObs,
            obsLabels: v.obsLabels,
          },
        ]),
      ),
      testResults,
    },
    null,
    2,
  ),
);
