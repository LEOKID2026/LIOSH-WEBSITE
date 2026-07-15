/**
 * Subject-level summary must not show insufficient copy when a topic has clear weakness.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildSubjectParentLetter } from "../../utils/detailed-report-parent-letter-he.js";
import { withholdSummaryCopyHe } from "../../utils/parent-report-language/subject-withhold-summary-he.js";
import {
  INSUFFICIENT_SUBJECT_SUMMARY_RE,
  isClearWeakTopicMetrics,
} from "../../utils/learning-pattern-decision/subject-clear-weak-topic.js";

describe("subject summary clear weak topic", () => {
  test("buildSubjectParentLetter - math/addition q=10 acc=20% avoids insufficient copy", () => {
    const sp = {
      subjectLabelHe: "מתמטיקה",
      subjectConclusionReadiness: "not_ready",
      dominantRootCauseLabelHe: "קושי ביסוד",
      topWeaknesses: [
        {
          labelHe: "חיבור",
          questions: 10,
          correct: 2,
          wrong: 8,
          accuracy: 20,
        },
      ],
      topicRecommendations: [
        {
          displayName: "חיבור",
          questions: 10,
          correct: 2,
          wrong: 8,
          accuracy: 20,
          contractsV1: { narrative: { wordingEnvelope: "WE0" } },
        },
      ],
    };

    const letter = buildSubjectParentLetter(sp);
    const all = [letter.opening, letter.diagnosisHe, letter.homeAction, letter.closing]
      .filter(Boolean)
      .join(" ");

    assert.ok(isClearWeakTopicMetrics({ questions: 10, correct: 2, wrong: 8, accuracy: 20 }));
    assert.ok(!INSUFFICIENT_SUBJECT_SUMMARY_RE.test(all), all);
    assert.match(all, /חיבור/);
    assert.match(all, /חיזוק|חזק/);
  });

  test("withholdSummaryCopyHe - subject q=10 acc=20% names weak topic", () => {
    const line = withholdSummaryCopyHe("subject", {
      subjectReportQuestions: 10,
      sumUnitQuestions: 10,
      reportSubjectAccuracy: 20,
      reportTotalQuestions: 10,
      subjectLabelHe: "מתמטיקה",
      clearWeakTopicLabelHe: "חיבור",
      clearWeakTopicQuestions: 10,
      clearWeakTopicAccuracy: 20,
    });
    assert.ok(!INSUFFICIENT_SUBJECT_SUMMARY_RE.test(line), line);
    assert.match(line, /חיבור/);
    assert.match(line, /חיזוק|חזק/);
  });
});
