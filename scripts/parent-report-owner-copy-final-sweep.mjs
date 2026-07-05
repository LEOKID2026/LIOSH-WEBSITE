#!/usr/bin/env node
/**
 * Final rendered sweep — owner copy map outputs only.
 * Run: node scripts/parent-report-owner-copy-final-sweep.mjs
 */
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { findParentReportEnglishEnumLeaks } = await import(
  u("utils/parent-report-language/parent-report-display-labels.he.js")
);
const {
  parentReportOwnerCopyTemplatesHe,
  renderOwnerSubjectCopyTemplateHe,
  buildSubjectOwnerCopySlots,
  SUBJECT_OWNER_COPY_TEMPLATE_IDS,
} = await import(u("utils/parent-report-language/parent-report-owner-copy-templates-he.js"));
const { parentReportOwnerTopicCopyTemplatesHe } = await import(
  u("utils/parent-report-language/parent-report-owner-topic-copy-templates-he.js")
);
const { EDC_CONTRACT_KEY } = await import(u("utils/learning-pattern-decision/engine-decision-codes.js"));
const {
  resolveTopicOwnerCopyHe,
  resolveTopicExplainOwnerSectionsHe,
  resolveTopicRecommendationOwnerCopyHe,
  resolveNarrativeOwnerCopyHe,
  resolveTopicOwnerBaseTemplateId,
} = await import(u("utils/learning-pattern-decision/resolve-topic-owner-copy.js"));

const FORBIDDEN = [
  "remediate same level",
  "undefined",
  "null",
  "unknown",
  "engineDecision",
  "clear_topic_gap",
  "topic_needs_strengthening",
  "recommendedAction",
  "parentSafeFinding",
];

const LEGACY_MARKERS = [
  "בחלק מהשורות",
  "אין תמונה מספיק ברורה",
  "עדיין לא מספיק",
  "בנושא הזה עדיין לא קובעים כיוון חזק",
  "remediate same level",
];

/** @param {string} text @param {string} label @param {{ allowEarly?: boolean, allowInitial?: boolean }} [opts] */
function assertRenderedClean(text, label, opts = {}) {
  const s = String(text || "").trim();
  if (!s) return;
  for (const frag of FORBIDDEN) {
    assert.doesNotMatch(s, new RegExp(frag, "i"), `${label} forbidden: ${frag}`);
  }
  for (const legacy of LEGACY_MARKERS) {
    if (opts.allowInitial && legacy === "עדיין לא מספיק") continue;
    assert.doesNotMatch(s, new RegExp(legacy, "i"), `${label} legacy: ${legacy}`);
  }
  if (!opts.allowEarly && !opts.allowInitial) {
    assert.doesNotMatch(s, /עדיין מוקדם/u, `${label} forbidden early phrase`);
  }
  const enumHits = findParentReportEnglishEnumLeaks(s);
  assert.equal(enumHits.length, 0, `${label} english leak: ${enumHits.join(", ")}`);
}

/** @param {Record<string, unknown>} body @param {Record<string, unknown>} contract */
function rowWithLpd(body, contract) {
  const lpdBody =
    body.learningPatternDecision && typeof body.learningPatternDecision === "object"
      ? body.learningPatternDecision
      : {};
  return {
    subjectLabelHe: "מתמטיקה",
    ...body,
    learningPatternDecision: { ...lpdBody, [EDC_CONTRACT_KEY]: contract },
  };
}

/** @type {string[]} */
const rendered = [];

// Subject-level templates
const subjectFixtures = [
  {
    subjectLabelHe: "מתמטיקה",
    contract: {
      subjectDecision: "multiple_topic_gaps",
      recommendedSubjectAction: "remediate_priority_topics_same_level",
      blockedLegacySummary: true,
      priorityTopics: [
        {
          topicLabelKey: "שברים",
          questions: 206,
          correct: 108,
          wrong: 98,
          accuracy: 52,
          detectedPattern: "השוואה לפי מונה בלבד",
          evidenceStrength: "strong",
        },
        {
          topicLabelKey: "כפל",
          questions: 32,
          correct: 22,
          wrong: 10,
          accuracy: 69,
          detectedPattern: "אותם זוגות שגויים",
          evidenceStrength: "strong",
        },
      ],
    },
  },
  {
    subjectLabelHe: "מתמטיקה",
    contract: {
      subjectDecision: "focused_strengthening_needed",
      recommendedSubjectAction: "remediate_priority_topics_same_level",
      blockedLegacySummary: true,
      priorityTopics: [
        {
          topicLabelKey: "חיבור",
          questions: 10,
          correct: 2,
          wrong: 8,
          accuracy: 20,
          detectedPattern: null,
          evidenceStrength: "supported",
        },
      ],
    },
  },
];

for (const fx of subjectFixtures) {
  const slots = buildSubjectOwnerCopySlots(fx.contract, fx.subjectLabelHe);
  for (const templateId of Object.values(SUBJECT_OWNER_COPY_TEMPLATE_IDS)) {
    const text = renderOwnerSubjectCopyTemplateHe(templateId, slots);
    if (text) rendered.push({ scope: "subject", templateId, text });
  }
}

// Topic-level resolver fixtures
const topicFixtures = [
  {
    label: "initial",
    row: rowWithLpd(
      {
        label: "חילוק עם שארית",
        questions: 2,
        correct: 1,
        wrong: 1,
        accuracy: 50,
        learningPatternDecision: {
          templateId: "initial_topic_data",
          topicStatus: "initial_data",
          findingType: "initial_topic_data",
          practicedQuestions: 2,
        },
        contractsV1: { narrative: { wordingEnvelope: "WE0" } },
      },
      { engineDecision: "early_direction_only", detectedPattern: null },
    ),
    allowEarly: true,
  },
  {
    label: "practice_focus",
    row: rowWithLpd(
      {
        label: "סדרות",
        questions: 3,
        correct: 2,
        wrong: 1,
        accuracy: 67,
        learningPatternDecision: {
          templateId: "practice_focus",
          topicStatus: "practice_focus",
          findingType: "practice_focus",
          practicedQuestions: 3,
        },
      },
      { engineDecision: "early_direction_only", detectedPattern: null },
    ),
  },
  {
    label: "difficulty",
    row: rowWithLpd(
      {
        label: "שברים",
        questions: 206,
        correct: 108,
        wrong: 98,
        accuracy: 52,
        learningPatternDecision: {
          templateId: "difficulty_observed",
          topicStatus: "difficulty_observed",
          practicedQuestions: 206,
        },
        contractsV1: { narrative: { wordingEnvelope: "WE1" } },
      },
      {
        engineDecision: "topic_needs_strengthening",
        detectedPattern: "השוואה לפי מונה בלבד",
        affectedSubskill: "חלק כלל",
      },
    ),
  },
  {
    label: "positive",
    row: rowWithLpd(
      {
        label: "חיבור",
        questions: 8,
        correct: 6,
        wrong: 2,
        accuracy: 75,
        learningPatternDecision: {
          templateId: "positive_observed",
          topicStatus: "positive_observed",
          practicedQuestions: 8,
        },
        contractsV1: { narrative: { wordingEnvelope: "WE0" } },
      },
      { engineDecision: "early_direction_only", detectedPattern: null },
    ),
    allowEarly: true,
  },
];

for (const fx of topicFixtures) {
  const base = resolveTopicOwnerBaseTemplateId(fx.row.learningPatternDecision);
  const we = String(fx.row.contractsV1?.narrative?.wordingEnvelope || "").toUpperCase();
  const templateIds = [
    ...Object.keys(parentReportOwnerTopicCopyTemplatesHe).filter((id) => {
      if (id.startsWith("NARRATIVE_")) return we && id.startsWith(`NARRATIVE_${we}_`);
      return id === base || id.startsWith(`${base}:`);
    }),
  ];
  for (const templateId of templateIds) {
    const text = resolveTopicOwnerCopyHe(fx.row, templateId);
    if (text) rendered.push({ scope: "topic", templateId, text, fixture: fx.label });
  }
  const explain = resolveTopicExplainOwnerSectionsHe(fx.row);
  if (explain) {
    for (const [sec, text] of Object.entries(explain)) {
      if (text) rendered.push({ scope: "topicExplain", section: sec, text, fixture: fx.label });
    }
  }
  for (const field of ["stepLabel", "finding", "interventionPlan", "doNow", "caution"]) {
    const text = resolveTopicRecommendationOwnerCopyHe(fx.row, field);
    if (text) rendered.push({ scope: "recommendation", field, text, fixture: fx.label });
  }
  for (const section of ["snapshot", "cautionLineHe"]) {
    const text = resolveNarrativeOwnerCopyHe(fx.row, section);
    if (text) rendered.push({ scope: "narrative", section, text, fixture: fx.label });
  }
}

// Positive caution override simulation (gated legacy replaced by owner)
const positiveGatedRow = rowWithLpd(
  {
    label: "חיבור",
    questions: 8,
    correct: 6,
    wrong: 2,
    accuracy: 75,
    learningPatternDecision: {
      templateId: "positive_observed",
      topicStatus: "positive_observed",
      practicedQuestions: 8,
    },
    cautionLineHe: "בנושא הזה עדיין לא קובעים כיוון חזק — קודם עוד תרגול ממוקד באותו נושא.",
  },
  { engineDecision: "early_direction_only", detectedPattern: null },
);
const ownerCaution = resolveTopicRecommendationOwnerCopyHe(positiveGatedRow, "caution");
assert.ok(ownerCaution, "positive_observed:RECOMMENDATION_CAUTION must resolve");
const finalCaution =
  ownerCaution && positiveGatedRow.cautionLineHe ? ownerCaution : positiveGatedRow.cautionLineHe;
rendered.push({ scope: "positiveCautionOverride", text: finalCaution });
assert.match(String(finalCaution), /גם כשנראית הצלחה/u);
assert.doesNotMatch(String(finalCaution), /עדיין לא קובעים כיוון חזק/u);

for (const item of rendered) {
  const label = `${item.scope}:${item.templateId || item.section || item.field || "text"}`;
  assertRenderedClean(item.text, label, {
    allowEarly:
      item.fixture === "initial" ||
      item.fixture === "positive" ||
      item.scope === "positiveCautionOverride",
    allowInitial: item.fixture === "initial",
  });
}

console.log(
  JSON.stringify(
    {
      totalRenderedSamples: rendered.length,
      subjectTemplateCount: Object.keys(parentReportOwnerCopyTemplatesHe).length,
      topicTemplateCount: Object.keys(parentReportOwnerTopicCopyTemplatesHe).length,
      positiveCautionSample: finalCaution,
    },
    null,
    2,
  ),
);
console.error(`\nparent-report-owner-copy-final-sweep: OK (${rendered.length} samples)\n`);
