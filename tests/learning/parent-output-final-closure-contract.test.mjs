/**
 * Deterministic CI gates for the parent report decision engine, scoped to the
 * decisionKeys/narrative envelopes registered in parent-engine-decision-contract-v2.js.
 * These are representative-fixture regression gates, not proof of a full/exhaustive
 * mapping of every runtime decision path.
 * Run: node tests/learning/parent-output-final-closure-contract.test.mjs
 *
 * These gates fail the build when:
 *  1. a runtime decision is not registered in the contract (unmapped decision)
 *  2. a registered, active decision cannot be produced by the real engine (unreachable)
 *  3. a parent-visible output is missing a templateId or provenance
 *  4. a claim not allowed by the contract for that decisionKey appears in the rendered text
 *  5. the same text asserts both "repeated pattern" and "insufficient data"
 *  6. q=1 / wrong=1 render in the plural ("1 שאלות" instead of "שאלה אחת")
 *  7. a technical/English identifier leaks into parent-visible text
 *  8. WE4 (highest-confidence envelope) asserts attention/fatigue/pressure without evidence
 *  9. speed_pressure_pattern is counted toward subject-level gaps.length, or alone
 *     produces focused_strengthening_needed/multiple_topic_gaps
 * 10. clear_topic_gap does not win over speed_pressure_pattern when accuracy is very low
 * 11. mixed_subject_profile fires for anything other than exactly gaps.length===1 &&
 *     stable.length>=1, or its rendered text says "כמה נושאים" (plural) for a single gap
 */
import assert from "node:assert/strict";
import {
  PARENT_ENGINE_DECISION_CONTRACT_V2,
  findDecisionContractEntry,
  activeDecisionKeys,
  findUnsupportedClaims,
  hasRepeatedVsInsufficientContradiction,
  HEBREW_SINGULAR_VIOLATION_RE,
  TECHNICAL_LEAK_RE,
} from "../../utils/learning-pattern-decision/parent-engine-decision-contract-v2.js";
import { buildParentReportEngineDecisionContract } from "../../utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import { buildParentVisibleFinding } from "../../utils/learning-pattern-decision/build-parent-visible-finding.js";
import {
  buildSubjectEngineDecisionContract,
  resolveSubjectSummaryTextFromEngineContract,
} from "../../utils/learning-pattern-decision/build-subject-engine-decision-contract.js";
import { buildNarrativeContractV1, validateNarrativeContractV1 } from "../../utils/contracts/narrative-contract-v1.js";
import {
  formatQuestionsTextHe,
  formatWrongOfQuestionsTextHe,
  formatCorrectTextHe,
  formatWrongTextHe,
} from "../../utils/learning-pattern-decision/normalize-parent-practice-metrics.js";
import { buildTopicDiagnosticExplainSectionsHe } from "../../utils/parent-report-ui-explain-he.js";
import { buildSubjectParentLetter } from "../../utils/detailed-report-parent-letter-he.js";
import { SP_SUBJECT_ENGINE_CONTRACT } from "../../utils/learning-pattern-decision/engine-decision-codes.js";

let failures = 0;
let checks = 0;
function check(name, fn) {
  checks++;
  try {
    fn();
  } catch (e) {
    failures++;
    console.error(`FAIL: ${name}\n  ${e.message}`);
  }
}

function topicRow({ subjectId, topicRowKey, topicName, q, c, w, acc, unit = {} }) {
  return {
    subjectId,
    topicRowKey,
    topicName,
    row: { questions: q, correct: c, wrong: w, accuracy: acc, displayName: topicName },
    unit: { subjectId, topicRowKey, displayName: topicName, ...unit },
  };
}

// ---------------------------------------------------------------------------
// Gate: every entry in the contract is reachable at runtime (unless disabled)
// ---------------------------------------------------------------------------

const topicEngineFixtures = {
  clear_topic_gap: buildParentReportEngineDecisionContract(
    topicRow({ subjectId: "math", topicRowKey: "addition::g1", topicName: "חיבור", q: 10, c: 2, w: 8, acc: 20 }),
  ),
  topic_needs_strengthening: buildParentReportEngineDecisionContract(
    topicRow({ subjectId: "math", topicRowKey: "subtraction::g3", topicName: "חיסור", q: 12, c: 7, w: 5, acc: 58 }),
  ),
  partial_stable: buildParentReportEngineDecisionContract(
    topicRow({ subjectId: "math", topicRowKey: "multiplication::g4", topicName: "כפל", q: 14, c: 10, w: 4, acc: 71 }),
  ),
  mastery_stable: buildParentReportEngineDecisionContract(
    topicRow({ subjectId: "math", topicRowKey: "division::g4", topicName: "חילוק", q: 16, c: 15, w: 1, acc: 94 }),
  ),
  early_direction_only: buildParentReportEngineDecisionContract(
    topicRow({ subjectId: "math", topicRowKey: "fractions::g5", topicName: "שברים", q: 6, c: 5, w: 1, acc: 83 }),
  ),
  insufficient_data: buildParentReportEngineDecisionContract(
    topicRow({ subjectId: "math", topicRowKey: "decimals::g5", topicName: "עשרוניים", q: 1, c: 1, w: 0, acc: 100 }),
  ),
  speed_pressure_pattern: buildParentReportEngineDecisionContract({
    subjectId: "math",
    topicRowKey: "sequences::g5",
    topicName: "סדרות",
    row: { questions: 28, correct: 16, wrong: 12, accuracy: 58, displayName: "סדרות", modeKey: "speed" },
    unit: {
      subjectId: "math",
      topicRowKey: "sequences::g5",
      displayName: "סדרות",
      modeKey: "speed",
      riskFlags: { speedOnlyRisk: true },
    },
  }),
};

check("every active topic-engine decisionKey is reachable via buildParentReportEngineDecisionContract", () => {
  for (const key of [
    "clear_topic_gap",
    "topic_needs_strengthening",
    "partial_stable",
    "mastery_stable",
    "early_direction_only",
    "insufficient_data",
    "speed_pressure_pattern",
  ]) {
    const entry = findDecisionContractEntry(key);
    assert.ok(entry, `decisionKey "${key}" must be registered in the contract`);
    assert.equal(entry.status, "active");
    const fixture = topicEngineFixtures[key];
    assert.ok(fixture, `must have a fixture for ${key}`);
    assert.equal(fixture.engineDecision, key, `fixture for ${key} produced engineDecision="${fixture.engineDecision}"`);
    assert.ok(String(fixture.parentSafeFinding || "").length > 0 || key === "early_direction_only" || key === "insufficient_data",
      `${key} must produce non-empty parentSafeFinding when evidence supports it`);
  }
});

check("speed_pressure_pattern uses the single approved sentence at topic level - reports wrong/question counts and recommends an untimed check, never claims speed IS the problem or a knowledge gap", () => {
  const finding = topicEngineFixtures.speed_pressure_pattern.parentSafeFinding;
  assert.match(finding, /בתרגול\s*המהיר/u, "must reference the fast/timed practice context");
  assert.match(finding, /ללא\s*הגבלת\s*זמן/u, "must recommend checking in untimed practice");
  assert.match(finding, /12\s*שגיאות\s*מתוך\s*28\s*שאלות/u, "must use formatWrongOfQuestionsTextHe, never '1 שגויות'-style wording");
  assert.doesNotMatch(finding, /קשור\S*\s*ל(מהירות|לחץ)|רק\s*מהירות|בעיה\s*במהירות|פער\s*ידע|נקודת\s*ידע/u,
    "must never present speed as a proven cause, nor conclude a knowledge gap");
  assert.doesNotMatch(finding, /^בנושא .+ היו (הרבה|כמה) טעויות בשאלות שנפתרו/u,
    "must not silently fall back to the generic difficulty sentence");
});

check("speed_pressure_pattern uses the exact same sentence source in engine-decision-parent-copy-he.js (single source across surfaces)", async () => {
  const { buildEngineDecisionParentTopicCopyHe } = await import("../../utils/parent-report-language/engine-decision-parent-copy-he.js");
  const copy = buildEngineDecisionParentTopicCopyHe({
    subjectId: "math",
    subjectLabelHe: "מתמטיקה",
    topic: "סדרות",
    topicKey: "sequences::g5",
    q: 28,
    acc: 58,
    wrong: 12,
    topicEngineRowSignals: { engineDiagnosticDecision: { engineDecision: "speed_pressure_pattern" } },
  });
  assert.ok(copy, "must produce copy for speed_pressure_pattern");
  assert.match(copy.summaryHe, /בתרגול\s*המהיר/u);
  assert.match(copy.summaryHe, /ללא\s*הגבלת\s*זמן/u);
  // The diagnostic body must equal the exact canonical sentence used at topic level
  // (no second, independently-worded "speed" remark appended for the same decision).
  const speedMentions = (copy.summaryHe.match(/בתרגול\s*המהיר/gu) || []).length;
  assert.equal(speedMentions, 1, `summaryHe must mention the canonical speed sentence exactly once, got ${speedMentions}: "${copy.summaryHe}"`);
});

check("speed_pressure_pattern is NOT counted as a subject-level gap, and alone never creates focused_strengthening_needed", () => {
  const speedTopic = {
    topicRowKey: "sequences::g5",
    displayName: "סדרות",
    questions: 28,
    correct: 16,
    wrong: 12,
    accuracy: 58,
    engineDecisionContract: topicEngineFixtures.speed_pressure_pattern,
    parentVisibleFinding: topicEngineFixtures.speed_pressure_pattern.parentSafeFinding,
  };
  const contract = buildSubjectEngineDecisionContract("math", [speedTopic], { subjectLabelKey: "math" });
  assert.equal(contract.mainGaps.length, 0, "speed_pressure_pattern must not count toward mainGaps");
  assert.notEqual(contract.subjectDecision, "focused_strengthening_needed",
    "a speed_pressure_pattern topic alone must never produce focused_strengthening_needed");
  assert.notEqual(contract.subjectDecision, "multiple_topic_gaps");
  assert.ok(contract.speedCheckTopics.includes("sequences::g5"),
    "speed_pressure_pattern topic must be tracked separately as a topic to check in untimed practice");
});

check("clear_topic_gap wins over speed_pressure_pattern when accuracy is very low, even in speed mode (same topic never gets both)", () => {
  const veryLowAccSpeed = buildParentReportEngineDecisionContract({
    subjectId: "math",
    topicRowKey: "sequences::g5",
    topicName: "סדרות",
    row: { questions: 28, correct: 8, wrong: 20, accuracy: 29, displayName: "סדרות", modeKey: "speed" },
    unit: {
      subjectId: "math",
      topicRowKey: "sequences::g5",
      displayName: "סדרות",
      modeKey: "speed",
      riskFlags: { speedOnlyRisk: true },
    },
  });
  assert.equal(veryLowAccSpeed.engineDecision, "clear_topic_gap",
    "very-low-accuracy speed-mode topic must resolve to clear_topic_gap, not speed_pressure_pattern");
});

check("regular (non-speed) mode with the same question/accuracy numbers as the speed_pressure_pattern fixture resolves to topic_needs_strengthening, not speed_pressure_pattern", () => {
  const regularMode = buildParentReportEngineDecisionContract({
    subjectId: "math",
    topicRowKey: "sequences::g5",
    topicName: "סדרות",
    row: { questions: 28, correct: 16, wrong: 12, accuracy: 58, displayName: "סדרות" },
    unit: {
      subjectId: "math",
      topicRowKey: "sequences::g5",
      displayName: "סדרות",
    },
  });
  assert.equal(regularMode.engineDecision, "topic_needs_strengthening");
});

// ---------------------------------------------------------------------------
// Gate: speed_check_only_subject is reachable, and buildExplainIdentifiedLineHe no
// longer emits a second, non-canonical "קשורות למהירות" sentence for speed_pressure_pattern
// ---------------------------------------------------------------------------

check("buildSpeedPressurePatternFindingHe is the ONLY text speed_pressure_pattern produces on the detailed-report explain surface - buildExplainIdentifiedLineHe's 'identified' line is empty", () => {
  const sig = {
    engineDiagnosticDecision: { engineDecision: "speed_pressure_pattern" },
    riskFlags: { speedOnlyRisk: true },
    diagnosticType: "speed_pressure",
  };
  const sections = buildTopicDiagnosticExplainSectionsHe({
    subjectId: "math",
    subjectLabelHe: "מתמטיקה",
    label: "סדרות",
    topicKey: "sequences::g5",
    questions: 28,
    accuracy: 58,
    wrong: 12,
    topicEngineRowSignals: sig,
  });
  assert.ok(sections, "must produce explain sections");
  assert.equal(sections.identified, "", "identified line must be empty for speed_pressure_pattern - no second sentence");
  assert.equal(sections.action, "", "speed_pressure_pattern has no separate home-action line to avoid a duplicate recommendation");

  const combined = `${sections.identified} ${sections.data} ${sections.pattern} ${sections.meaning} ${sections.action}`;
  const canonicalMentions = (combined.match(/בתרגול\s*המהיר/gu) || []).length;
  assert.equal(canonicalMentions, 1, `"בתרגול המהיר" must appear exactly once across all explain sections, got ${canonicalMentions}: "${combined}"`);
  assert.doesNotMatch(combined, /קשור\S*\s*ל?מהירות/u, "must never claim mistakes are CAUSED BY speed - only that they occurred during fast practice");

  const recommendationMentions = (combined.match(/לפני\s*שמחליטים\s*אם\s*נדרש\s*חיזוק\s*בידע/gu) || []).length;
  assert.equal(recommendationMentions, 1, `the single recommendation must appear exactly once (no duplicate recommendation), got ${recommendationMentions}`);
});

function speedTopicFixture(topicRowKey, displayName, { q = 28, c = 16, w = 12, acc = 58 } = {}) {
  const fixture = buildParentReportEngineDecisionContract({
    subjectId: "math",
    topicRowKey,
    topicName: displayName,
    row: { questions: q, correct: c, wrong: w, accuracy: acc, displayName, modeKey: "speed" },
    unit: {
      subjectId: "math",
      topicRowKey,
      displayName,
      modeKey: "speed",
      riskFlags: { speedOnlyRisk: true },
    },
  });
  return {
    topicRowKey,
    displayName,
    questions: q,
    correct: c,
    wrong: w,
    accuracy: acc,
    engineDecisionContract: fixture,
    parentVisibleFinding: fixture.parentSafeFinding,
  };
}

check("speed_check_only_subject (0 gaps, 0 stable, 1 speedCheckTopic, 28q/12wrong): reachable, and does NOT fall back to insufficient_subject_data", () => {
  const speedTopic = speedTopicFixture("sequences::g5", "סדרות");
  const contract = buildSubjectEngineDecisionContract("math", [speedTopic], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "speed_check_only_subject");
  assert.notEqual(contract.subjectDecision, "insufficient_subject_data",
    "a subject with real, sufficient speed-check data must not be reported as if there were not enough data");
  assert.deepEqual(contract.mainGaps, []);
  assert.deepEqual(contract.stableStrengths, []);
  assert.ok(contract.speedCheckTopics.includes("sequences::g5"));
  assert.equal(contract.blockedLegacySummary, true,
    "sufficient evidence (28 questions >= 20) must block the legacy engine-unaware fallback paths");

  const entry = findDecisionContractEntry("speed_check_only_subject");
  assert.ok(entry, "speed_check_only_subject must be registered in the contract");
  assert.equal(entry.status, "active");
  assert.equal(entry.ownerApprovalStatus, "owner_approved");
});

check("speed_check_only_subject never produces 'נקודת חיזוק ברורה' / 'המיקוד המעשי כרגע' / 'חזרה עקבית' or any knowledge-gap claim, across subject summary AND parent letter", () => {
  const speedTopic = speedTopicFixture("sequences::g5", "סדרות");
  const contract = buildSubjectEngineDecisionContract("math", [speedTopic], { subjectLabelKey: "math" });

  const banned = /נקודת\s*חיזוק\s*ברורה|המיקוד\s*המעשי\s*כרגע|חזרה\s*עקבית/u;

  const summary = resolveSubjectSummaryTextFromEngineContract(contract, { subjectLabelHe: "חשבון" });
  assert.ok(summary && summary.length > 0, "speed_check_only_subject must produce non-empty subject summary text");
  assert.doesNotMatch(summary, banned);
  assert.doesNotMatch(summary, TECHNICAL_LEAK_RE);
  assert.match(summary, /עדיין\s*מוקדם\s*לקבוע\s*אם\s*נדרש\s*חיזוק\s*בידע/u, "must use the approved wording");
  assert.match(summary, /סדרות/u, "must name the priority speed-check topic");

  const sp = {
    subjectLabelHe: "חשבון",
    subjectQuestionCount: 28,
    [SP_SUBJECT_ENGINE_CONTRACT]: contract,
    topicRecommendations: [{ topicRowKey: "sequences::g5", engineDecisionContract: speedTopic.engineDecisionContract }],
    topWeaknesses: [{ labelHe: "סדרות", accuracy: 58, questions: 28, mistakeCount: 12, engineDecisionContract: speedTopic.engineDecisionContract }],
    excellence: [],
    topStrengths: [],
    improving: [],
    maintain: [],
  };
  const letter = buildSubjectParentLetter(sp);
  assert.doesNotMatch(letter.opening, banned, `parent letter opening must not overclaim a gap: "${letter.opening}"`);
  assert.doesNotMatch(letter.diagnosisHe, banned, `parent letter diagnosis must not overclaim a gap: "${letter.diagnosisHe}"`);
  assert.doesNotMatch(letter.homeAction, banned, `parent letter home action must not overclaim a gap: "${letter.homeAction}"`);
  assert.doesNotMatch(letter.closing, banned, `parent letter closing must not overclaim a gap: "${letter.closing}"`);
  assert.match(letter.opening, /עדיין\s*מוקדם\s*לקבוע\s*אם\s*נדרש\s*חיזוק\s*בידע/u, "parent letter opening must use the approved subject-level sentence");
});

check("multiple speedCheckTopics: subject-level sentence names only the single highest-priority topic, never 'נושא אחד'", () => {
  const speedTopicA = speedTopicFixture("sequences::g5", "סדרות", { q: 28, c: 16, w: 12, acc: 58 });
  const speedTopicB = speedTopicFixture("geometry-angles::g5", "זוויות", { q: 20, c: 13, w: 7, acc: 65 });
  const contract = buildSubjectEngineDecisionContract("math", [speedTopicA, speedTopicB], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "speed_check_only_subject");
  assert.equal(contract.speedCheckTopics.length, 2);
  const summary = resolveSubjectSummaryTextFromEngineContract(contract, { subjectLabelHe: "חשבון" });
  assert.doesNotMatch(summary, /נושא\s*אחד/u, "must not say 'one topic' - it simply names the priority topic without counting");
  const topicMentions = (summary.match(/סדרות|זוויות/gu) || []).length;
  assert.equal(topicMentions, 1, `must name exactly one (the priority) topic, got ${topicMentions} mentions: "${summary}"`);
});

check("clear_topic_gap under very-low-accuracy speed mode still produces focused_strengthening_needed at subject level (not speed_check_only_subject)", () => {
  const veryLowAccSpeed = buildParentReportEngineDecisionContract({
    subjectId: "math",
    topicRowKey: "sequences::g5",
    topicName: "סדרות",
    row: { questions: 28, correct: 8, wrong: 20, accuracy: 29, displayName: "סדרות", modeKey: "speed" },
    unit: {
      subjectId: "math",
      topicRowKey: "sequences::g5",
      displayName: "סדרות",
      modeKey: "speed",
      riskFlags: { speedOnlyRisk: true },
    },
  });
  assert.equal(veryLowAccSpeed.engineDecision, "clear_topic_gap");
  const gapTopic = {
    topicRowKey: "sequences::g5",
    displayName: "סדרות",
    questions: 28,
    correct: 8,
    wrong: 20,
    accuracy: 29,
    engineDecisionContract: veryLowAccSpeed,
    parentVisibleFinding: veryLowAccSpeed.parentSafeFinding,
  };
  const contract = buildSubjectEngineDecisionContract("math", [gapTopic], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "focused_strengthening_needed",
    "a real clear_topic_gap topic must still win, even though it happened in speed mode");
  assert.notEqual(contract.subjectDecision, "speed_check_only_subject");
});

// ---------------------------------------------------------------------------
// Gate: mixed_subject_profile is reachable (previously unreachable dead code)
// ---------------------------------------------------------------------------

function gapTopicFixture(topicRowKey, displayName) {
  return {
    topicRowKey,
    displayName,
    questions: 10,
    correct: 2,
    wrong: 8,
    accuracy: 20,
    engineDecisionContract: topicEngineFixtures.clear_topic_gap,
    parentVisibleFinding: topicEngineFixtures.clear_topic_gap.parentSafeFinding,
  };
}

function stableTopicFixture(topicRowKey, displayName) {
  return {
    topicRowKey,
    displayName,
    questions: 16,
    correct: 15,
    wrong: 1,
    accuracy: 94,
    engineDecisionContract: topicEngineFixtures.mastery_stable,
    parentVisibleFinding: topicEngineFixtures.mastery_stable.parentSafeFinding,
  };
}

check("mixed_subject_profile (1 gap + 1 stable): correct decision, approved singular text, no 'כמה נושאים'", () => {
  const gapTopic = gapTopicFixture("addition::g1", "חיבור");
  const stableTopic = stableTopicFixture("division::g4", "חילוק");
  const contract = buildSubjectEngineDecisionContract("math", [gapTopic, stableTopic], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "mixed_subject_profile");
  assert.equal(contract.recommendedSubjectAction, "remediate_priority_topics_same_level");

  const summary = resolveSubjectSummaryTextFromEngineContract(contract, { subjectLabelHe: "חשבון" });
  assert.ok(summary && summary.length > 0, "mixed_subject_profile must produce non-empty subject summary text");
  assert.doesNotMatch(summary, TECHNICAL_LEAK_RE);
  assert.doesNotMatch(summary, /כמה\s*נושאים/u, "must never say 'several topics' when only 1 topic is a gap");
  assert.match(summary, /נושא\s*אחד\s*שכדאי\s*לחזק/u, "must use the approved 'one topic to strengthen' wording");
  assert.match(summary, /נראית\s*יציבות\s*בחלק\s*מהנושאים/u, "must use the approved 'stability in some of the topics' wording, not 'topics where stability is seen' (imprecise for exactly 1 stable topic)");
  assert.match(summary, /חיבור/u, "must recommend starting with the actual priority topic name");
});

check("mixed_subject_profile (1 gap + 5 stable): same decision and same approved singular text as 1+1", () => {
  const gapTopic = gapTopicFixture("addition::g1", "חיבור");
  const stableTopics = [
    stableTopicFixture("division::g4", "חילוק"),
    stableTopicFixture("multiplication::g4", "כפל"),
    stableTopicFixture("fractions::g5", "שברים"),
    stableTopicFixture("geometry::g4", "גיאומטריה"),
    stableTopicFixture("decimals::g5", "עשרוניים"),
  ];
  const contract = buildSubjectEngineDecisionContract("math", [gapTopic, ...stableTopics], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "mixed_subject_profile");
  const summary = resolveSubjectSummaryTextFromEngineContract(contract, { subjectLabelHe: "חשבון" });
  assert.doesNotMatch(summary, /כמה\s*נושאים/u);
  assert.match(summary, /נושא\s*אחד\s*שכדאי\s*לחזק/u);
  assert.match(summary, /נראית\s*יציבות\s*בחלק\s*מהנושאים/u,
    "1-stable and 5-stable cases must render the exact same wording - the sentence never counts stable topics");
});

check("multiple_topic_gaps (2 gaps + 1 stable): 2+ gaps always win over mixed_subject_profile, even with stable topics present", () => {
  const gap1 = gapTopicFixture("addition::g1", "חיבור");
  const gap2 = {
    topicRowKey: "subtraction::g3",
    displayName: "חיסור",
    questions: 12,
    correct: 7,
    wrong: 5,
    accuracy: 58,
    engineDecisionContract: topicEngineFixtures.topic_needs_strengthening,
    parentVisibleFinding: topicEngineFixtures.topic_needs_strengthening.parentSafeFinding,
  };
  const stableTopic = stableTopicFixture("division::g4", "חילוק");
  const contract = buildSubjectEngineDecisionContract("math", [gap1, gap2, stableTopic], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "multiple_topic_gaps");
  assert.notEqual(contract.subjectDecision, "mixed_subject_profile");
  const summary = resolveSubjectSummaryTextFromEngineContract(contract, { subjectLabelHe: "חשבון" });
  assert.match(summary, /כמה\s*נושאים/u, "plural wording IS accurate here (2 real gaps)");
});

check("multiple_topic_gaps (5 gaps + 1 stable): still multiple_topic_gaps, not mixed_subject_profile", () => {
  const gaps = [
    gapTopicFixture("addition::g1", "חיבור"),
    { topicRowKey: "subtraction::g3", displayName: "חיסור", questions: 12, correct: 7, wrong: 5, accuracy: 58, engineDecisionContract: topicEngineFixtures.topic_needs_strengthening, parentVisibleFinding: topicEngineFixtures.topic_needs_strengthening.parentSafeFinding },
    gapTopicFixture("geometry::g4", "גיאומטריה"),
    gapTopicFixture("fractions::g5", "שברים"),
    gapTopicFixture("decimals::g5", "עשרוניים"),
  ];
  const stableTopic = stableTopicFixture("division::g4", "חילוק");
  const contract = buildSubjectEngineDecisionContract("math", [...gaps, stableTopic], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "multiple_topic_gaps");
});

check("subject_strength_stable (0 gaps, stable topics) still reachable", () => {
  const stableTopic = {
    topicRowKey: "division::g4",
    displayName: "חילוק",
    questions: 16,
    correct: 15,
    wrong: 1,
    accuracy: 94,
    engineDecisionContract: topicEngineFixtures.mastery_stable,
    parentVisibleFinding: topicEngineFixtures.mastery_stable.parentSafeFinding,
    recommendedAction: "maintain_and_strengthen",
  };
  const partial = {
    topicRowKey: "multiplication::g4",
    displayName: "כפל",
    questions: 14,
    correct: 10,
    wrong: 4,
    accuracy: 71,
    engineDecisionContract: topicEngineFixtures.partial_stable,
    parentVisibleFinding: topicEngineFixtures.partial_stable.parentSafeFinding,
  };
  const contract = buildSubjectEngineDecisionContract("math", [stableTopic, partial], { subjectLabelKey: "math" });
  assert.equal(contract.subjectDecision, "subject_strength_stable");
});

// ---------------------------------------------------------------------------
// Gate: unsupported claims (attention/fatigue/pressure without evidence, mastery
// on early_direction_only, strengthening on mastery_stable, etc.)
// ---------------------------------------------------------------------------

check("no unsupported claims in any topic-engine fixture text", () => {
  for (const [key, contract] of Object.entries(topicEngineFixtures)) {
    const text = String(contract.parentSafeFinding || "");
    if (!text) continue;
    const violations = findUnsupportedClaims(key, text);
    assert.deepEqual(violations, [], `decisionKey="${key}" text contains forbidden claim(s): ${violations.join(",")} - text: "${text}"`);
  }
});

check("early_direction_only is never rendered as a stable success or mastery claim", () => {
  const text = String(topicEngineFixtures.early_direction_only.parentSafeFinding || "");
  assert.doesNotMatch(text, /שליטה|יציב(ה|ות)?\s*(טובה)/u);
});

check("mastery_stable never receives partial/strengthening wording", () => {
  const text = String(topicEngineFixtures.mastery_stable.parentSafeFinding || "");
  assert.doesNotMatch(text, /כדאי\s*(לחזק|חיזוק)|חיזוק\s*ממוקד|הבנה\s*חלקית/u);
});

check("no repeated-pattern vs insufficient-data contradiction in any fixture", () => {
  for (const [key, contract] of Object.entries(topicEngineFixtures)) {
    const text = String(contract.parentSafeFinding || "");
    assert.equal(hasRepeatedVsInsufficientContradiction(text), false, `decisionKey="${key}" text: "${text}"`);
  }
});

// ---------------------------------------------------------------------------
// Gate: LPD no_clear_pattern disambiguation (insufficient vs difficulty-fallback)
// ---------------------------------------------------------------------------

check("LPD: genuinely insufficient no_clear_pattern (templateId='no_clear_pattern') never produces a strengthening claim", () => {
  // q>=5 but w<2 -> does not meet the difficulty-evidence gate (q>=5 && w>=2 && acc<70).
  const result = buildParentVisibleFinding({
    topicName: "גיאומטריה",
    questionCount: 6,
    topicStatus: "no_clear_pattern",
    findingType: "none",
    evidenceStrength: "emerging",
    canUseRepeatedWording: false,
    repeatedMistakePatterns: [],
    wrongCount: 1,
    accuracy: 83,
  });
  assert.equal(result.templateId, "no_clear_pattern");
  assert.equal(result.parentVisibleFinding, "", "insufficient no_clear_pattern must render empty text, not a strengthening claim");
});

check("LPD: evidence-backed no_clear_pattern (q>=5,w>=2,acc<70) gets a distinct templateId and a grounded claim only", () => {
  const result = buildParentVisibleFinding({
    topicName: "גיאומטריה",
    questionCount: 8,
    topicStatus: "no_clear_pattern",
    findingType: "none",
    evidenceStrength: "emerging",
    canUseRepeatedWording: false,
    repeatedMistakePatterns: [],
    wrongCount: 5,
    accuracy: 38,
  });
  assert.equal(result.templateId, "no_clear_pattern_difficulty_fallback");
  assert.notEqual(result.templateId, "no_clear_pattern", "must not share the bare insufficient-data templateId");
  assert.ok(String(result.parentVisibleFinding || "").length > 0);
  assert.doesNotMatch(String(result.parentVisibleFinding), /דפוס\s*חוזר/u, "must not claim a specific repeated pattern it did not identify");
  const violations = findUnsupportedClaims("lpd_difficulty_no_specific_pattern", result.parentVisibleFinding);
  assert.deepEqual(violations, []);
});

// ---------------------------------------------------------------------------
// Gate: Hebrew singular/plural (q=1, wrong=1)
// ---------------------------------------------------------------------------

check("q=1 topic-engine finding never renders '1 שאלות'", () => {
  const c = buildParentReportEngineDecisionContract(
    topicRow({ subjectId: "math", topicRowKey: "decimals::g5", topicName: "עשרוניים", q: 1, c: 1, w: 0, acc: 100 }),
  );
  const text = String(c.parentSafeFinding || "");
  assert.doesNotMatch(text, HEBREW_SINGULAR_VIOLATION_RE, `text: "${text}"`);
});

check("formatWrongOfQuestionsTextHe(1, q) - the phrase every clear_topic_gap/speed_pressure_pattern finding uses - renders 'שגיאה אחת', never '1 שגיאות'/'1 שגויות'", () => {
  const text = formatWrongOfQuestionsTextHe(1, 8);
  assert.equal(text, "שגיאה אחת מתוך 8 שאלות");
  assert.doesNotMatch(text, HEBREW_SINGULAR_VIOLATION_RE);
});

check("formatWrongOfQuestionsTextHe(5, q) renders plural 'שגיאות', not the ungrammatical 'שגויות' adjective-without-noun form", () => {
  const text = formatWrongOfQuestionsTextHe(5, 12);
  assert.equal(text, "5 שגיאות מתוך 12 שאלות");
});

check("formatQuestionsTextHe(1) / formatCorrectTextHe(1) / formatWrongTextHe(1) all render singular Hebrew", () => {
  assert.equal(formatQuestionsTextHe(1), "שאלה אחת");
  assert.equal(formatCorrectTextHe(1), "תשובה אחת נכונה");
  assert.equal(formatWrongTextHe(1), "תשובה אחת שגויה");
});

check("LPD initial_data (q=1) never renders '1 שאלות'", () => {
  const lpd = buildLearningPatternDecision({
    subjectId: "math",
    topicRowKey: "history::g5",
    row: { questions: 1, correct: 1, wrong: 0, accuracy: 100, displayName: "היסטוריה" },
    rawMistakes: [],
  });
  assert.doesNotMatch(String(lpd.parentVisibleFinding || ""), HEBREW_SINGULAR_VIOLATION_RE);
});

// ---------------------------------------------------------------------------
// Gate: no technical/English leak in any fixture
// ---------------------------------------------------------------------------

check("no technical identifiers leak into any topic-engine fixture text", () => {
  for (const [key, contract] of Object.entries(topicEngineFixtures)) {
    const text = String(contract.parentSafeFinding || "");
    assert.doesNotMatch(text, TECHNICAL_LEAK_RE, `decisionKey="${key}" text: "${text}"`);
  }
});

// ---------------------------------------------------------------------------
// Gate: narrative envelopes WE0-WE4 reachable + WE4 has no unsupported claims
// ---------------------------------------------------------------------------

const narrativeFixtures = {
  narrative_we0: buildNarrativeContractV1({
    topicKey: "t0", subjectId: "math", displayName: "נושא", questions: 3, accuracy: 30,
    contractsV1: { readiness: { readiness: "insufficient" }, confidence: { confidenceBand: "low" }, decision: { decisionTier: 0 }, recommendation: { eligible: false } },
  }),
  narrative_we1: buildNarrativeContractV1({
    topicKey: "t1", subjectId: "math", displayName: "נושא", questions: 10, accuracy: 45,
    contractsV1: { readiness: { readiness: "forming" }, confidence: { confidenceBand: "medium" }, decision: { decisionTier: 1 }, recommendation: { eligible: false } },
  }),
  narrative_we2: buildNarrativeContractV1({
    topicKey: "t2", subjectId: "math", displayName: "נושא", questions: 15, accuracy: 65,
    contractsV1: { readiness: { readiness: "ready" }, confidence: { confidenceBand: "low" }, decision: { decisionTier: 2 }, recommendation: { eligible: false } },
  }),
  narrative_we3: buildNarrativeContractV1({
    topicKey: "t3", subjectId: "math", displayName: "נושא", questions: 15, accuracy: 76,
    contractsV1: { readiness: { readiness: "ready" }, confidence: { confidenceBand: "high" }, decision: { decisionTier: 2 }, recommendation: { eligible: false } },
  }),
  narrative_we4: buildNarrativeContractV1({
    topicKey: "t4", subjectId: "math", displayName: "נושא", questions: 45, accuracy: 82,
    contractsV1: {
      readiness: { readiness: "ready" }, confidence: { confidenceBand: "high" }, decision: { decisionTier: 3 },
      recommendation: { eligible: true, intensity: "RI2" },
    },
  }),
};

for (const [key, contract] of Object.entries(narrativeFixtures)) {
  check(`${key} is reachable via buildNarrativeContractV1 and matches its contract entry`, () => {
    const entry = findDecisionContractEntry(key);
    assert.ok(entry, `${key} must be registered`);
    const expectedWe = key.replace("narrative_", "").toUpperCase();
    assert.equal(contract.wordingEnvelope, expectedWe, `expected envelope ${expectedWe}, got ${contract.wordingEnvelope}`);
    const v = validateNarrativeContractV1(contract);
    assert.equal(v.ok, true, `narrative contract invalid: ${v.errors.join(", ")}`);
  });
}

check("WE4 (highest-confidence envelope) never asserts attention/fatigue/pressure - no such evidence is computed", () => {
  // Sample every deterministic seed variant, not just the first pickVariant outcome.
  for (let i = 0; i < 12; i++) {
    const c = buildNarrativeContractV1({
      topicKey: `we4-seed-${i}`,
      subjectId: "math",
      displayName: `נושא ${i}`,
      questions: 45,
      accuracy: 82,
      contractsV1: {
        readiness: { readiness: "ready" },
        confidence: { confidenceBand: "high" },
        decision: { decisionTier: 3 },
        recommendation: { eligible: true, intensity: "RI2" },
      },
    });
    if (c.wordingEnvelope !== "WE4") continue;
    const text = String(c.textSlots.interpretation || "");
    const violations = findUnsupportedClaims("narrative_we4", text);
    assert.deepEqual(violations, [], `seed ${i} WE4 text contains forbidden claim(s): ${violations.join(",")} - "${text}"`);
  }
});

// ---------------------------------------------------------------------------
// Gate: broken Hebrew sentence must not exist anywhere in the contract's own scope
// ---------------------------------------------------------------------------

check('broken sentence "אין מספיק מה שרואים בשורות" is gone from the live withhold-summary renderer', async () => {
  const { withholdSummaryCopyHe } = await import("../../utils/parent-report-language/subject-withhold-summary-he.js");
  const text = withholdSummaryCopyHe("subject", { subjectReportQuestions: 2, sumUnitQuestions: 2 });
  assert.doesNotMatch(text, /מה\s*שרואים\s*בשורות/u, `text: "${text}"`);
});

check('broken sentence "אין מספיק מה שרואים בשורות" is gone from summarizeV2UnitsForSubject\'s withhold branch (parent-report-v2.js)', async () => {
  const { summarizeV2UnitsForSubjectForTests } = await import("../../utils/parent-report-v2.js");
  const result = summarizeV2UnitsForSubjectForTests(
    [
      {
        subjectId: "math",
        topicRowKey: "geometry::grade:g4",
        displayName: "גיאומטריה",
        evidenceTrace: [{ type: "volume", value: { questions: 3, correct: 2, wrong: 1, accuracy: 67 } }],
      },
    ],
    { subjectId: "math", subjectReportQuestions: 3, subjectLabelHe: "מתמטיקה" },
  );
  assert.match(result.summaryHe, /עדיין אין מספיק נתונים כדי לקבוע תמונה ברורה/u, `summaryHe: "${result.summaryHe}"`);
  assert.doesNotMatch(result.summaryHe, /מה\s*שרואים\s*בשורות/u, `summaryHe: "${result.summaryHe}"`);
});

// ---------------------------------------------------------------------------
// Gate: contract completeness — every entry has all required fields
// ---------------------------------------------------------------------------

check("every contract entry has all required fields populated", () => {
  for (const entry of PARENT_ENGINE_DECISION_CONTRACT_V2) {
    for (const field of [
      "decisionKey", "scope", "evidenceRequirement", "allowedClaims", "forbiddenClaims",
      "requiredTemplateIds", "supportedSurfaces", "fallbackPolicy", "ownerApprovalStatus",
      "provenance", "sourceFile", "sourceFunction", "status",
    ]) {
      assert.ok(entry[field] !== undefined && entry[field] !== null && entry[field] !== "",
        `decisionKey="${entry.decisionKey}" missing field "${field}"`);
    }
    assert.ok(["topic", "subject"].includes(entry.scope));
    assert.ok(["active", "disabled"].includes(entry.status));
  }
});

check("no duplicate decisionKey entries in the contract", () => {
  const keys = PARENT_ENGINE_DECISION_CONTRACT_V2.map((e) => e.decisionKey);
  assert.equal(new Set(keys).size, keys.length);
});

console.log(`parent-output-final-closure-contract.test.mjs - ${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} check(s) FAILED`);
  process.exit(1);
}
console.log(`Active decision keys covered: ${activeDecisionKeys().length}`);
