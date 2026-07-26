import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PARENT_TOPIC_INSUFFICIENT_BADGE_HE,
  parentTopicDisplayChromeFromRow,
  resolveParentTopicDisplayDecision,
  topicNextStepVisualVariantFromRowOrStep,
} from "../../utils/parent-report-surface/parent-topic-display-chrome.js";
import { topicUiFromLearningPatternDecision } from "../../utils/learning-pattern-decision/parent-report-ui-helpers.js";

function rowWithEngine(engineDecision, extras = {}) {
  return {
    questions: extras.questions ?? 10,
    correct: extras.correct ?? 5,
    wrong: extras.wrong ?? 5,
    accuracy: extras.accuracy ?? 50,
    engineDecisionContract: {
      engineDecision,
      patternLayer: extras.patternLayer || null,
      parentSafeFinding: extras.parentSafeFinding || "",
      actionDecisionContract: extras.actionDecisionContract || { version: "2.0.0", action: "maintain" },
    },
    parentActionDecision: extras.parentActionDecision || {
      state: "progress_or_mastery",
      label: "להמשיך במסלול",
    },
    learningPatternDecision: extras.learningPatternDecision || {
      practicedQuestions: extras.questions ?? 10,
      topicStatus: "mixed",
      findingType: "none",
      parentVisibleFinding: extras.parentSafeFinding || "",
      engineDecisionContract: {
        engineDecision,
        patternLayer: extras.patternLayer || null,
      },
    },
    ...extras,
  };
}

describe("parent-topic-display-chrome", () => {
  it("does not show טוב for 2 questions / 50% insufficient_data (even if PAD is progress_or_mastery)", () => {
    const row = rowWithEngine("insufficient_data", {
      questions: 2,
      correct: 1,
      wrong: 1,
      accuracy: 50,
      parentActionDecision: { state: "insufficient_information", label: "צריך עוד מידע" },
    });
    const chrome = parentTopicDisplayChromeFromRow(row);
    const ui = topicUiFromLearningPatternDecision(row);
    assert.equal(resolveParentTopicDisplayDecision(row), "insufficient_data");
    assert.equal(chrome.badgeHe, "מעט שאלות - נראו כמה טעויות");
    assert.equal(chrome.excellent, false);
    assert.equal(chrome.insufficientData, true);
    assert.equal(chrome.visualVariant, "neutral");
    assert.equal(ui.badgeHe.includes("טוב"), false);
    assert.equal(chrome.badgeHe.includes("טוב"), false);
  });

  it("maps clear_topic_gap to yellow remediate chrome even when PAD is not strengthening_needed", () => {
    const row = rowWithEngine("clear_topic_gap", {
      questions: 25,
      correct: 11,
      wrong: 14,
      accuracy: 44,
      parentSafeFinding: "בנושא שברים נראה קושי ברור.",
      parentActionDecision: { state: "verification_needed", label: "בדיקת אימות" },
    });
    const chrome = parentTopicDisplayChromeFromRow(row);
    assert.equal(chrome.displayDecision, "clear_topic_gap");
    assert.equal(chrome.visualVariant, "remediate");
    assert.equal(chrome.weakTopic, true);
    assert.equal(chrome.needsPractice, true);
    assert.match(chrome.cardClassName, /yellow/);
    assert.equal(topicNextStepVisualVariantFromRowOrStep(row), "remediate");
  });

  it("maps partial_stable decimals-like row to monitor chrome, not strength and not weak yellow", () => {
    const row = rowWithEngine("partial_stable", {
      questions: 15,
      correct: 10,
      wrong: 5,
      accuracy: 67,
      parentActionDecision: { state: "progress_or_mastery", label: "להמשיך במסלול" },
    });
    const chrome = parentTopicDisplayChromeFromRow(row);
    assert.equal(chrome.displayDecision, "partial_stable");
    assert.equal(chrome.excellent, false);
    assert.equal(chrome.weakTopic, false);
    assert.equal(chrome.visualVariant, "maintain");
    assert.equal(chrome.badgeHe, "במעקב");
    assert.equal(chrome.badgeHe.includes("טוב"), false);
  });

  it("maps mastery_stable to positive chrome", () => {
    const chrome = parentTopicDisplayChromeFromRow(rowWithEngine("mastery_stable", { questions: 20, accuracy: 92 }));
    assert.equal(chrome.excellent, true);
    assert.equal(chrome.visualVariant, "advance");
  });

  it("maps topic_needs_strengthening to amber remediate", () => {
    const chrome = parentTopicDisplayChromeFromRow(
      rowWithEngine("topic_needs_strengthening", { questions: 12, accuracy: 60 }),
    );
    assert.equal(chrome.needsPractice, true);
    assert.equal(chrome.visualVariant, "remediate");
    assert.equal(chrome.weakTopic, false);
  });
});
