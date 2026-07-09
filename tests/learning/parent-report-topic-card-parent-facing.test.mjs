import assert from "node:assert/strict";
import { getTopicName, normalizeReportTopicBucketKey } from "../../utils/math-report-generator.js";
import { explainPatternHe, explainActionHe } from "../../utils/parent-report-language/parent-report-hebrew-copy-spec.js";
import { sanitizeParentPatternLabel } from "../../utils/learning-pattern-decision/parent-pattern-label.js";
import {
  PARENT_TOPIC_HOME_ACTION_HEADING_HE,
  parentFacingErrorPatternMeaningHe,
  resolveParentFacingPatternLabelHe,
} from "../../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";
import { buildApprovedTopicCopyHe } from "../../lib/parent-ui/parent-report-approved-copy-he.js";
import { trendV1DisplayLineHe } from "../../utils/parent-report-topic-trend-v1.js";

{
  const label = resolveParentFacingPatternLabelHe("procedural_error");
  assert.ok(label.includes("דרך פתרון"));
  assert.ok(!/procedural_error/i.test(label));
  assert.equal(sanitizeParentPatternLabel("procedural_error"), label);
  const patternLine = explainPatternHe("procedural_error");
  assert.ok(patternLine.includes("הטעות שחוזרת:"));
  assert.ok(!/procedural_error/i.test(patternLine));
}

{
  const meaning = parentFacingErrorPatternMeaningHe("procedural_error");
  assert.ok(meaning.includes("דרך הפתרון"));
  const copy = buildApprovedTopicCopyHe(
    {
      label: "שברים",
      questions: 12,
      accuracy: 52,
      learningPatternDecision: {
        topicStatus: "difficulty_repeated",
        findingType: "difficulty_pattern",
        practicedQuestions: 12,
        repeatedMistakePatterns: [{ label: "procedural_error", count: 4 }],
        engineDecisionContract: { detectedPattern: "procedural_error" },
      },
    },
    "g5",
  );
  assert.ok(copy.whatItMeans);
  assert.ok(!/procedural_error/i.test(copy.whatItMeans));
  assert.ok(copy.whatItMeans.includes("דרך"));
}

{
  assert.equal(getTopicName("area::grade:g4"), "שטח");
  assert.equal(getTopicName("volume\u0001g5"), "נפח");
  assert.equal(normalizeReportTopicBucketKey("triangles::grade:g3"), "triangles");
  assert.notEqual(getTopicName("triangles::grade:g3"), "נושא");
  assert.notEqual(getTopicName("triangles::grade:g3"), "");
}

{
  const row = {
    rowKey: "geometry_area",
    label: "שטח",
    questions: 20,
    accuracy: 52,
    trendV1: {
      ok: true,
      direction: "stable",
      parentLineHe: "ignored",
    },
  };
  const trendLine = trendV1DisplayLineHe(row.trendV1);
  assert.ok(trendLine.includes("מגמה בתקופה: ללא שינוי משמעותי"));
  const copy = buildApprovedTopicCopyHe(row, "g5");
  assert.ok(copy.title === "שטח" || copy.title.includes("שטח"));
  assert.ok(!/^\s*נושא\s*$/u.test(copy.title));
}

{
  const action = explainActionHe("knowledge_gap", "knowledge_gap", "");
  assert.ok(action.startsWith(`${PARENT_TOPIC_HOME_ACTION_HEADING_HE}:`));
  assert.ok(!action.includes("בבית"));
}

console.log("parent-report-topic-card-parent-facing.test.mjs: ok");
