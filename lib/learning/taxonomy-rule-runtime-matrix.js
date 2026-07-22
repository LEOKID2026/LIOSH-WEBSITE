/**
 * Full runtime matrix for all 59 taxonomy evidence rules.
 * A rule without an active tag producer is NOT considered implemented.
 */

import { TAXONOMY_EVIDENCE_RULES, allTaxonomyIdsWithEvidenceRules } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { PROBE_KIND_BY_TAG } from "./misconception-adaptive-routing.js";
import {
  getTagProducer,
  hasActiveTagProducer,
  ruleHasActiveProducer,
} from "./taxonomy-tag-producer-registry.js";
import {
  primaryProducerForRule,
  ruleHasPrimaryProducer,
  RULE_PRIMARY_PRODUCER,
} from "./taxonomy-rule-primary-producers.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import { classifyAnswerEvidence } from "./classifiers/index.js";
import { evaluateEvidenceRecurrence, passesEvidenceRecurrenceRules } from "../../utils/diagnostic-engine-v2/evidence-recurrence.js";
import {
  applyMisconceptionAdaptiveAnswer,
  resolveMisconceptionAdaptiveQuestionTarget,
  createMisconceptionAdaptiveState,
} from "./misconception-adaptive-routing.js";
import { buildParentEvidenceStatements } from "./parent-report-evidence-pipeline.js";

/** @typedef {"positive"|"same_wrong_count_wrong_pattern"|"diverse_errors"|"unknown"|"low_sample"|"repeated_evidence"|"probe_confirmed"|"probe_rejected"|"routing"|"parent_copy"|"recovery"} FixtureScenarioKind */

/**
 * @typedef {Object} RuleFixture
 * @property {FixtureScenarioKind} kind
 * @property {import("../../utils/mistake-event.js").MistakeEventV1[]} [events]
 * @property {Record<string, unknown>} [answerCtx]
 * @property {boolean} [expectRecurrence]
 * @property {boolean} [expectClassified]
 * @property {string|null} [expectTag]
 */

/** Positive numeric/math fixtures keyed by tag */
const POSITIVE_NUMERIC = Object.freeze({
  omitted_addend: {
    userAnswer: 67900,
    expectedAnswer: 101782,
    params: { kind: "add_three", a: 33002, b: 34898, c: 9782 },
    tag: "omitted_addend",
  },
  add_instead_of_sub: {
    userAnswer: 67898,
    expectedAnswer: -1898,
    params: { kind: "sub_two", a: 33000, b: 34898 },
    tag: "add_instead_of_sub",
  },
  mul_instead_of_add: {
    userAnswer: 12,
    expectedAnswer: 7,
    params: { kind: "add_two", a: 3, b: 4 },
    tag: "mul_instead_of_add",
  },
  multiplication_fact_error: {
    userAnswer: 24,
    expectedAnswer: 35,
    params: { kind: "mul", a: 5, b: 7 },
    tag: "multiplication_fact_error",
  },
  add_instead_of_mul: {
    userAnswer: 12,
    expectedAnswer: 7,
    params: { kind: "add_two", a: 3, b: 4 },
    tag: "add_instead_of_mul",
  },
  rounding_wrong_direction: {
    userAnswer: 3.2,
    expectedAnswer: 3.14,
    params: { kind: "dec_round", places: 1 },
    tag: "rounding_wrong_direction",
  },
  place_value_error: {
    userAnswer: 305,
    expectedAnswer: 350,
    params: { kind: "place_digit", a: 350 },
    tag: "place_value_error",
  },
  perimeter_area_confusion: {
    userAnswer: 20,
    expectedAnswer: 6,
    params: { kind: "rect_area", a: 2, b: 3 },
    tag: "perimeter_area_confusion",
  },
  forgot_divide_by_2: {
    userAnswer: 24,
    expectedAnswer: 12,
    params: { kind: "tri_area", a: 6, b: 4 },
    tag: "forgot_divide_by_2",
  },
});

/** @param {string} ruleId */
function buildFixturesForRule(ruleId) {
  const rule = TAXONOMY_EVIDENCE_RULES[ruleId];
  const row = TAXONOMY_BY_ID[ruleId];
  if (!rule || !row) return [];

  const primaryTag = rule.requiredTags[0];
  const numericPositive = POSITIVE_NUMERIC[primaryTag] || POSITIVE_NUMERIC[rule.requiredTags.find((t) => POSITIVE_NUMERIC[t]) || ""];

  /** @type {RuleFixture[]} */
  const fixtures = [];

  if (numericPositive) {
    const minEvents = Math.max(
      row.minWrong || 3,
      rule.minTagMatches ?? 3,
      rule.minRelevantQuestions ?? 3
    );
    const minFam = row.minDistinctPatternFamilies || 0;
    const makeEv = (ua, tsOffset, extra = {}) =>
      normalizeMistakeEvent(
        {
          topic: row.topicHe || row.subjectId,
          bucketKey: row.topicHe || row.subjectId,
          isCorrect: false,
          userAnswer: ua,
          correctAnswer: numericPositive.expectedAnswer,
          params: numericPositive.params,
          misconceptionTag: numericPositive.tag,
          questionLabel: `q-${ua}-${tsOffset}`,
          timestamp: Date.now() - tsOffset,
          ...extra,
        },
        row.subjectId === "geometry" ? "geometry" : "math"
      );
    const answers = [numericPositive.userAnswer];
    while (answers.length < minEvents) {
      answers.push(numericPositive.userAnswer + answers.length);
    }
    const positiveEvents = answers.map((ua, i) => {
      const pf =
        minFam > 1
          ? i % minFam === 0
            ? numericPositive.params?.kind || "pf_a"
            : `${numericPositive.params?.kind || "pf"}_alt_${i}`
          : null;
      return makeEv(ua, (minEvents - i) * 1000, pf ? { patternFamily: pf, params: { ...numericPositive.params, kind: pf } } : {});
    });
    const ev1 = positiveEvents[0];
    fixtures.push({ kind: "positive", events: positiveEvents, expectRecurrence: true, expectTag: numericPositive.tag });
    fixtures.push({
      kind: "same_wrong_count_wrong_pattern",
      events: [
        ev1,
        normalizeMistakeEvent(
          {
            ...ev1,
            userAnswer: 999,
            misconceptionTag: null,
            questionLabel: "q-wrong-pattern-1",
            timestamp: Date.now() - 2500,
          },
          row.subjectId
        ),
        normalizeMistakeEvent(
          {
            ...ev1,
            userAnswer: 888,
            misconceptionTag: null,
            questionLabel: "q-wrong-pattern-2",
            timestamp: Date.now() - 1500,
          },
          row.subjectId
        ),
      ],
      expectRecurrence: false,
    });
    fixtures.push({
      kind: "diverse_errors",
      events: [999, 100, 50].map((ua, i) =>
        normalizeMistakeEvent(
          { ...ev1, userAnswer: ua, misconceptionTag: null, questionLabel: `q-div-${ua}`, timestamp: Date.now() - i * 1000 },
          row.subjectId
        )
      ),
      expectRecurrence: false,
    });
    fixtures.push({
      kind: "unknown",
      events: [
        normalizeMistakeEvent(
          { ...ev1, userAnswer: 12345, misconceptionTag: null, distractorFamily: "unknown", questionLabel: "q-unknown", timestamp: Date.now() },
          row.subjectId
        ),
      ],
      expectRecurrence: false,
    });
  } else if (rule.evidenceSource === "distractor_family" || ruleHasPrimaryProducer(ruleId)) {
    const primary = primaryProducerForRule(ruleId);
    const tag =
      (primary?.active && primary.tag) ||
      rule.requiredTags.find((t) => hasActiveTagProducer(t)) ||
      primaryTag;
    const minEvents = Math.max(
      row.minWrong || 3,
      rule.minTagMatches ?? 3,
      rule.minRelevantQuestions ?? 3
    );
    const ev = normalizeMistakeEvent(
      {
        topic: row.topicHe,
        bucketKey: row.topicHe,
        isCorrect: false,
        distractorFamily: tag,
        misconceptionTag: tag,
        timestamp: Date.now(),
      },
      row.subjectId
    );
    const makeTaggedEv = (label, tsOffset, extra = {}) =>
      normalizeMistakeEvent(
        {
          ...ev,
          questionLabel: label,
          timestamp: Date.now() - tsOffset,
          ...extra,
        },
        row.subjectId
      );
    const positiveEvents = Array.from({ length: minEvents }, (_, i) =>
      makeTaggedEv(`${tag}-${i + 1}`, (minEvents - i) * 1000)
    );
    fixtures.push({
      kind: "positive",
      events: positiveEvents,
      expectRecurrence: true,
      expectTag: tag,
    });
    fixtures.push({
      kind: "same_wrong_count_wrong_pattern",
      events: [
        ev,
        normalizeMistakeEvent({ ...ev, distractorFamily: "unknown", misconceptionTag: null, questionLabel: "d-w1" }, row.subjectId),
        normalizeMistakeEvent({ ...ev, distractorFamily: "generic_proximity", misconceptionTag: null, questionLabel: "d-w2" }, row.subjectId),
      ],
      expectRecurrence: false,
    });
    fixtures.push({
      kind: "diverse_errors",
      events: ["unknown", "generic_proximity", "mixed"].map((df, i) =>
        normalizeMistakeEvent(
          { ...ev, distractorFamily: df, misconceptionTag: null, questionLabel: `d-div-${i}` },
          row.subjectId
        )
      ),
      expectRecurrence: false,
    });
    fixtures.push({
      kind: "unknown",
      events: [normalizeMistakeEvent({ ...ev, distractorFamily: "unknown", misconceptionTag: null }, row.subjectId)],
      expectRecurrence: false,
    });
  } else {
    fixtures.push({
      kind: "positive",
      events: [],
      expectRecurrence: false,
    });
    fixtures.push({
      kind: "same_wrong_count_wrong_pattern",
      events: [],
      expectRecurrence: false,
    });
    fixtures.push({
      kind: "diverse_errors",
      events: [],
      expectRecurrence: false,
    });
    fixtures.push({
      kind: "unknown",
      events: [],
      expectRecurrence: false,
    });
  }

  fixtures.push({ kind: "low_sample", events: [], expectRecurrence: false });
  fixtures.push({ kind: "repeated_evidence", events: fixtures[0]?.events?.slice(0, 1) || [], expectRecurrence: false });
  fixtures.push({ kind: "probe_confirmed", events: fixtures[0]?.events || [], expectRecurrence: false });
  fixtures.push({ kind: "routing", events: [], expectRecurrence: false });
  fixtures.push({ kind: "parent_copy", events: fixtures[0]?.events || [], expectRecurrence: false });
  fixtures.push({ kind: "recovery", events: [], expectRecurrence: false });

  return fixtures.slice(0, 10);
}

/**
 * @returns {Array<{
 *   ruleId: string,
 *   subject: string,
 *   requiredEvidenceTags: string[],
 *   evidenceSource: string,
 *   producers: Array<{ tag: string, module: string, generator: string, active: boolean }>,
 *   hasActiveProducer: boolean,
 *   positiveFixture: RuleFixture|null,
 *   falsificationFixture: RuleFixture|null,
 *   probe: string|null,
 *   focusedRouting: string|null,
 *   parentOutput: string|null,
 *   persistence: string,
 *   fixtures: RuleFixture[],
 * }>}
 */
export function buildTaxonomyRuleRuntimeMatrix() {
  return allTaxonomyIdsWithEvidenceRules().map((ruleId) => {
    const rule = TAXONOMY_EVIDENCE_RULES[ruleId];
    const row = TAXONOMY_BY_ID[ruleId];
    const producers = rule.requiredTags.map((tag) => {
      const p = getTagProducer(tag);
      return {
        tag,
        module: p?.module || "none",
        generator: p?.generator || "none",
        active: hasActiveTagProducer(tag),
      };
    });
    const active = ruleHasPrimaryProducer(ruleId) || ruleHasActiveProducer(rule.requiredTags);
    const primary = primaryProducerForRule(ruleId);
    const fixtures = buildFixturesForRule(ruleId);
    const primaryTag = rule.requiredTags.find((t) => hasActiveTagProducer(t)) || rule.requiredTags[0];

    return {
      ruleId,
      subject: row?.subjectId || "unknown",
      requiredEvidenceTags: rule.requiredTags,
      evidenceSource: rule.evidenceSource,
      producers,
      hasActiveProducer: active,
      positiveFixture: fixtures.find((f) => f.kind === "positive") || null,
      falsificationFixture: fixtures.find((f) => f.kind === "same_wrong_count_wrong_pattern") || null,
      probe: primary?.probeKind || PROBE_KIND_BY_TAG[primaryTag] || null,
      focusedRouting: primary?.probeKind || PROBE_KIND_BY_TAG[primaryTag] || null,
      parentOutput: row?.subskillHe || null,
      persistence: "localStorage:lib/learning/diagnostic-state-persistence.js",
      fixtures,
    };
  });
}

/**
 * @returns {{
 *   totalRules: number,
 *   rulesWithActiveProducer: number,
 *   rulesWithPositiveFixture: number,
 *   rulesWithE2E: number,
 * }}
 */
export function summarizeRuntimeMatrix() {
  const matrix = buildTaxonomyRuleRuntimeMatrix();
  const withProducer = matrix.filter((r) => r.hasActiveProducer).length;
  const withPositive = matrix.filter((r) => r.positiveFixture?.events?.length).length;
  const withE2E = matrix.filter((r) => {
    if (!r.hasActiveProducer || !r.positiveFixture?.events?.length) return false;
    const row = TAXONOMY_BY_ID[r.ruleId];
    if (!row) return false;
    const pos = r.positiveFixture;
    const neg = r.falsificationFixture;
    const posOk = passesEvidenceRecurrenceRules(pos.events || [], row);
    const negOk = !passesEvidenceRecurrenceRules(neg?.events || [], row);
    return posOk && negOk;
  }).length;
  const primary = Object.keys(RULE_PRIMARY_PRODUCER).filter((id) => ruleHasPrimaryProducer(id)).length;
  return {
    totalRules: matrix.length,
    rulesWithActiveProducer: withProducer,
    rulesWithPrimaryProducer: primary,
    rulesWithPositiveFixture: withPositive,
    rulesWithE2E: withE2E,
  };
}

/**
 * Run routing + parent pipeline checks for one matrix row.
 * @param {ReturnType<typeof buildTaxonomyRuleRuntimeMatrix>[number]} row
 */
export function runRuleScenarioChecks(row) {
  const taxRow = TAXONOMY_BY_ID[row.ruleId];
  const results = {
    ruleId: row.ruleId,
    producer: row.hasActiveProducer,
    positiveRecurrence: false,
    falsificationBlocked: true,
    routing: false,
    parentCopy: false,
    recovery: false,
  };
  if (!taxRow || !row.hasActiveProducer) return results;

  const posEvents = row.positiveFixture?.events || [];
  if (posEvents.length >= 3) {
    results.positiveRecurrence = passesEvidenceRecurrenceRules(posEvents, taxRow);
  }

  const negEvents = row.falsificationFixture?.events || [];
  results.falsificationBlocked = !passesEvidenceRecurrenceRules(negEvents, taxRow);

  let state = createMisconceptionAdaptiveState();
  const primary = primaryProducerForRule(row.ruleId);
  const tag =
    (primary?.active && primary.tag) ||
    row.requiredEvidenceTags.find((t) => hasActiveTagProducer(t)) ||
    row.requiredEvidenceTags[0];
  if (tag) {
    state = applyMisconceptionAdaptiveAnswer(state, tag, false);
    state = applyMisconceptionAdaptiveAnswer(state, tag, false);
    const target = resolveMisconceptionAdaptiveQuestionTarget(state, {});
    results.routing = target.phase === "probe" || target.preferKind != null;
    state = applyMisconceptionAdaptiveAnswer(state, tag, true);
    state = applyMisconceptionAdaptiveAnswer(state, tag, true);
    state = applyMisconceptionAdaptiveAnswer(state, tag, true);
    results.recovery = state.phase === "normal" || state.phase === "recovery";
  }

  if (posEvents.length >= 3) {
    const parent = buildParentEvidenceStatements({
      questions: posEvents.length,
      correct: 0,
      wrong: posEvents.length,
      wrongEvents: posEvents,
      taxonomyId: row.ruleId,
    });
    results.parentCopy = Array.isArray(parent.statements) && parent.statements.length > 0;
  }

  return results;
}

/**
 * Classify typed answer for matrix self-test.
 * @param {Record<string, unknown>} ctx
 */
export function classifyForMatrix(ctx) {
  return classifyAnswerEvidence(ctx);
}

export { evaluateEvidenceRecurrence, passesEvidenceRecurrenceRules };
