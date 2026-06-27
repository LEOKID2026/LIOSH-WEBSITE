#!/usr/bin/env node
/** Sample parent-report copy for moledet-geography launch verification. */
import { buildEngineDecisionParentTopicCopyHe } from "../../utils/parent-report-language/engine-decision-parent-copy-he.js";

function sample(label, p) {
  const copy = buildEngineDecisionParentTopicCopyHe(p);
  return { label, engineDecision: copy?.engineDecision, summaryHe: copy?.summaryHe, actionHe: copy?.actionHe, safeSubskill: copy?.safeSubskill };
}

const base = {
  subjectId: "moledet-geography",
  subjectLabelHe: "מולדת וגאוגרפיה",
  gradeKey: "g4",
};

const out = [
  sample("0 נתונים", { ...base, topic: "מפות", q: 0, acc: 0 }),
  sample("מעט נתונים", {
    ...base,
    topic: "מפות",
    q: 3,
    acc: 67,
    topicKey: "maps::grade:g4",
    topicEngineRowSignals: { engineDiagnosticDecision: { engineDecision: "insufficient_data", safeSubskillToShow: false } },
  }),
  sample("חולשה — מפות MG-01", {
    ...base,
    topic: "מפות",
    q: 12,
    acc: 42,
    topicKey: "maps::grade:g4",
    topicEngineRowSignals: {
      engineDiagnosticDecision: {
        engineDecision: "clear_topic_gap",
        safeSubskillToShow: true,
        taxonomyMatchId: "MG-01",
        subskillCandidate: { taxonomyId: "MG-01" },
      },
    },
  }),
  sample("חולשה — אזרחות MG-03", {
    ...base,
    topic: "אזרחות",
    q: 14,
    acc: 48,
    topicKey: "citizenship::grade:g4",
    topicEngineRowSignals: {
      engineDiagnosticDecision: {
        engineDecision: "topic_needs_strengthening",
        safeSubskillToShow: true,
        taxonomyMatchId: "MG-03",
        subskillCandidate: { taxonomyId: "MG-03" },
      },
    },
  }),
  sample("חולשה — קהילה MG-07", {
    ...base,
    topic: "קהילה",
    q: 11,
    acc: 55,
    topicKey: "community::grade:g4",
    topicEngineRowSignals: {
      engineDiagnosticDecision: {
        engineDecision: "topic_needs_strengthening",
        safeSubskillToShow: true,
        taxonomyMatchId: "MG-07",
        subskillCandidate: { taxonomyId: "MG-07" },
      },
    },
  }),
  sample("שליטה טובה", {
    ...base,
    topic: "גאוגרפיה",
    q: 18,
    acc: 92,
    topicKey: "geography::grade:g4",
    topicEngineRowSignals: {
      engineDiagnosticDecision: { engineDecision: "mastery_stable", safeSubskillToShow: false },
    },
  }),
];

console.log(JSON.stringify(out, null, 2));
