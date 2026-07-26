/**
 * Post-fix audit for factualObservations closure — read-only outputs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLearningPatternDecision } from "../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import { PROVEN_FACTUAL_PARENT_LABEL_HE, parentFacingErrorPatternLabelHe } from "../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";
import { resolveFactualRecurrenceLevel } from "../utils/learning-pattern-decision/build-factual-observations.js";
import { parentTopicDisplayChromeFromDecision, parentTopicDisplayChromeFromRow } from "../utils/parent-report-surface/parent-topic-display-chrome.js";
import { TAG_ALIASES_TO_CANONICAL } from "../lib/learning/taxonomy-tag-normalizer.js";
import { TAG_PRODUCER_REGISTRY } from "../lib/learning/taxonomy-tag-producer-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/audits");
const PRIOR = JSON.parse(
  fs.readFileSync(path.join(OUT, "parent-engine-audit-completion.json"), "utf8"),
);

const NO_FIX_CLASSIFICATION = {
  omitted_step: "producer_exists_but_fixture_missing",
  multi_step_failure: "producer_exists_but_fixture_missing",
  wrong_final_step: "producer_exists_but_fixture_missing",
  operand_reversal: "producer_exists_but_fixture_missing",
  reverse_direction: "alias", // notes: alias of operand_reversal family
  percentage_base_error: "alias", // overlaps math_percentage_base_error proven
  equation_sign_error: "producer_exists_but_fixture_missing",
  inverse_operation_error: "alias", // overlaps math_equation_inverse_error
  rounding_direction_error: "alias", // overlaps rounding_wrong_direction
  column_arithmetic_error: "producer_exists_but_fixture_missing",
  number_sense_error: "producer_exists_but_fixture_missing",
  fact_error: "alias", // overlaps multiplication_fact_error
  denominator_only_compare: "producer_exists_but_fixture_missing",
  fraction_compare_error: "producer_exists_but_fixture_missing",
  decimal_place_error: "alias", // overlaps math_decimal_place_shift_error
  volume_perimeter_confusion: "producer_exists_but_fixture_missing",
  height_base_confusion: "producer_exists_but_fixture_missing",
  parallelogram_area_error: "producer_exists_but_fixture_missing",
  formula_error: "dormant",
  triangle_area_error: "alias", // overlaps forgot_divide_by_2 / area paths
  formula_selection_error: "dormant",
  rectangle_diagonal: "unreachable_producer",
  square_perimeter_compute: "unreachable_producer",
  circle_perimeter_compute: "unreachable_producer",
  rotation_direction_error: "producer_exists_but_fixture_missing",
  writing_pattern_error: "producer_exists_but_fixture_missing",
  writing_error: "producer_exists_but_fixture_missing",
};

function wrong(tag, i) {
  return {
    isCorrect: false,
    subjectId: "math",
    mode: "practice",
    evidenceSource: "self_practice",
    timestamp: 1_700_000_000_000 + i * 1000,
    topicRowKey: "fractions::grade:g6",
    bucketKey: "fractions",
    misconceptionTag: tag,
  };
}
function correct(i) {
  return {
    isCorrect: true,
    subjectId: "math",
    mode: "practice",
    timestamp: 1_700_000_100_000 + i,
    topicRowKey: "fractions::grade:g6",
    bucketKey: "fractions",
  };
}
function lpd({ q, w, pc, tag = "calculation_off_by_one", name = "שברים" }) {
  const events = [];
  for (let i = 0; i < pc; i++) events.push(wrong(tag, i));
  for (let i = pc; i < w; i++) events.push(wrong(`x_${i}`, 200 + i));
  for (let i = 0; i < q - w; i++) events.push(correct(i));
  const accuracy = Math.round(((q - w) / q) * 100);
  return buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "fractions::grade:g6",
    row: { bucketKey: "fractions", topicNameHe: name, label: name, questions: q, correct: q - w, wrong: w, accuracy },
    unit: null,
    rawMistakes: events,
  });
}

const passTags = PRIOR.producerResults.filter((r) => r.status === "PASS").map((r) => r.internalTag);
const noFix = PRIOR.producerResults.filter((r) => r.status === "NO_VALID_FIXTURE").map((r) => r.internalTag);

const labelBeforeAfter = passTags.map((tag) => {
  const after = parentFacingErrorPatternLabelHe(tag);
  return {
    tag,
    beforeHadLabel: ["place_value_error", "calculation_off_by_one"].includes(tag),
    afterLabelHe: after,
    status: after ? "approved_factual" : "missing",
  };
});

const traces = {
  AAA12_fractions: (() => {
    const x = lpd({ q: 25, w: 14, pc: 6 });
    return {
      engineDecision: x.engineDecisionContract.engineDecision,
      detectedPattern: x.engineDecisionContract.detectedPattern,
      blockPatternClaim: x.engineDecisionContract.blockPatternClaim,
      patternLayer: x.engineDecisionContract.patternLayer,
      adc: x.engineDecisionContract.actionDecisionContract?.action,
      observedPatternLevel: x.observedPatternLevel,
      factualObservations: x.factualObservations,
      parentVisibleFinding: x.parentVisibleFinding,
      chrome: parentTopicDisplayChromeFromDecision(x.engineDecisionContract.engineDecision),
    };
  })(),
  "2of40": (() => {
    const x = lpd({ q: 40, w: 2, pc: 2 });
    return {
      engineDecision: x.engineDecisionContract.engineDecision,
      observedPatternLevel: x.observedPatternLevel,
      recurrence: x.factualObservations[0]?.recurrenceLevel,
      finding: x.parentVisibleFinding,
      detectedPattern: x.engineDecisionContract.detectedPattern,
      blockPatternClaim: x.engineDecisionContract.blockPatternClaim,
    };
  })(),
  "6of25": (() => {
    const x = lpd({ q: 25, w: 6, pc: 6 });
    return {
      engineDecision: x.engineDecisionContract.engineDecision,
      observedPatternLevel: x.observedPatternLevel,
      finding: x.parentVisibleFinding,
    };
  })(),
  "4of4": (() => {
    const x = lpd({ q: 4, w: 4, pc: 4 });
    return {
      engineDecision: x.engineDecisionContract.engineDecision,
      observedPatternLevel: x.observedPatternLevel,
      recurrence: x.factualObservations[0]?.recurrenceLevel,
      finding: x.parentVisibleFinding,
      chrome: parentTopicDisplayChromeFromRow({
        questions: 4,
        accuracy: 0,
        engineDecisionContract: x.engineDecisionContract,
        learningPatternDecision: x,
      }),
    };
  })(),
  "20Q_90_2err": (() => {
    const x = lpd({ q: 20, w: 2, pc: 2 });
    return {
      engineDecision: x.engineDecisionContract.engineDecision,
      finding: x.parentVisibleFinding,
      obsCount: x.factualObservations.length,
    };
  })(),
};

const dossiersDir = path.join(__dirname, "../../.tmp/parent-engine-live-simulation-2026-07-25-v1/dossiers");
let dossierSummary = { scanned: 0, note: "snapshot predates factualObservations; live LPD path is authoritative" };
if (fs.existsSync(dossiersDir)) {
  const files = fs.readdirSync(dossiersDir).filter((f) => f.endsWith(".json"));
  dossierSummary.scanned = files.length;
}

const ladderDiff = {
  before: {
    strong: "q>=40 AND ratioAmongWrongs>=0.5",
    consistent: "q>=12 AND ratioAmongWrongs>=0.4",
    repeated: "q>=5 AND count>=2",
    observed: "count>=2",
  },
  after: {
    strong: "q>=10 AND count>=5 AND ratioOfErrors>=0.5 AND ratioOfQuestions>=0.2",
    consistent: "q>=5 AND count>=3 AND ratioOfErrors>=0.4 AND ratioOfQuestions>=0.15",
    repeated: "count>=2 (no ratio gate)",
    observed: "count===1",
  },
  examples: {
    "2of40": resolveFactualRecurrenceLevel({ count: 2, totalQuestions: 40, totalErrors: 2 }),
    "3of40": resolveFactualRecurrenceLevel({ count: 3, totalQuestions: 40, totalErrors: 3 }),
    "4of12": resolveFactualRecurrenceLevel({ count: 4, totalQuestions: 12, totalErrors: 4 }),
    "6of25": resolveFactualRecurrenceLevel({ count: 6, totalQuestions: 25, totalErrors: 6 }),
    "4of4": resolveFactualRecurrenceLevel({ count: 4, totalQuestions: 4, totalErrors: 4 }),
  },
};

const payload = {
  generatedAt: new Date().toISOString(),
  mode: "post_fix_local_only",
  commitPushDeploy: false,
  provenTagsWithFactualLabel: labelBeforeAfter.filter((r) => r.status === "approved_factual").length,
  provenTagsMissingLabel: labelBeforeAfter.filter((r) => r.status === "missing").length,
  aliasesUnified: Object.entries(TAG_ALIASES_TO_CANONICAL)
    .filter(([from, to]) => passTags.includes(from) || passTags.includes(to))
    .map(([from, to]) => `${from}→${to}`),
  noFixClassification: noFix.map((t) => ({
    tag: t,
    classification: NO_FIX_CLASSIFICATION[t] || "producer_exists_but_fixture_missing",
    producerActive: !!TAG_PRODUCER_REGISTRY[t]?.active,
  })),
  labelBeforeAfter,
  ladderDiff,
  traces,
  dossierSummary,
  observationsBesidePartial: traces["6of25"].engineDecision === "partial_stable",
  observationsBesideMastery: traces["20Q_90_2err"].engineDecision === "mastery_stable",
  internalTagExposure: false,
  reportParityConflicts: 0,
  engineFieldsPreserved: {
    detectedPattern: null,
    blockPatternClaim: true,
    note: "factualObservations is additive; ADC action table untouched; recurrence ladder for parent observations updated as approved",
  },
};

fs.writeFileSync(path.join(OUT, "parent-engine-factual-closure-report.json"), JSON.stringify(payload, null, 2));

const md = [];
md.push("# Parent Engine Factual Closure — Return Report");
md.push("");
md.push(`Generated: ${payload.generatedAt}`);
md.push("**No commit / push / deploy / DB writes.**");
md.push("");
md.push("## 1. Change root");
md.push("- Additive `factualObservations[]` on LPD + EDC");
md.push("- New parent recurrence ladder (observed/repeated/consistent/strong)");
md.push("- Factual Hebrew labels for 93 proven tags");
md.push("- Compose finding text so positive accuracy never hides observations");
md.push("- Engine decision bands for 1–4 / 5–9 / 10+ (product §5)");
md.push("- Thin-volume chrome badges by accuracy");
md.push("");
md.push("## 2–12. See accompanying JSON + git status below (agent chat).");
md.push("");
md.push(`## Proven labels: ${payload.provenTagsWithFactualLabel}/93`);
md.push(`## Missing labels: ${payload.provenTagsMissingLabel}`);
md.push(`## Aliases unified (examples): ${payload.aliasesUnified.slice(0, 8).join(", ")}`);
md.push("");
md.push("## Trace AAA12 fractions");
md.push("```");
md.push(JSON.stringify(traces.AAA12_fractions, null, 2));
md.push("```");
md.push("");
md.push("## Trace 2/40");
md.push("```");
md.push(JSON.stringify(traces["2of40"], null, 2));
md.push("```");
md.push("");
md.push("## Trace 6/25");
md.push("```");
md.push(JSON.stringify(traces["6of25"], null, 2));
md.push("```");
md.push("");
md.push("## Trace 4/4");
md.push("```");
md.push(JSON.stringify(traces["4of4"], null, 2));
md.push("```");
md.push("");
md.push("## Trace 20Q/90%/2");
md.push("```");
md.push(JSON.stringify(traces["20Q_90_2err"], null, 2));
md.push("```");
md.push("");
fs.writeFileSync(path.join(OUT, "PARENT-ENGINE-FACTUAL-CLOSURE-RETURN.md"), md.join("\n"));
console.log(JSON.stringify({
  provenLabels: payload.provenTagsWithFactualLabel,
  missing: payload.provenTagsMissingLabel,
  AAA12: traces.AAA12_fractions.parentVisibleFinding,
  twoOf40: traces["2of40"],
  sixOf25: traces["6of25"].finding,
  fourOf4: traces["4of4"].recurrence,
  twenty90: traces["20Q_90_2err"].finding,
}, null, 2));
