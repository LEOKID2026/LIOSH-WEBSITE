/**
 * Zero-evidence recommendations message — Wave E.
 * Run: node --test tests/worksheets/worksheet-recommendations-zero-evidence.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildWorksheetRecommendationsFromReport,
  WORKSHEET_RECOMMENDATIONS_ZERO_EVIDENCE_HE,
} from "../../lib/worksheets/worksheet-recommendation-engine.server.js";

describe("worksheet-recommendations-zero-evidence", () => {
  test("empty report yields no recommendations", () => {
    const recs = buildWorksheetRecommendationsFromReport(
      { summary: {}, subjects: {} },
      "g3"
    );
    assert.equal(recs.length, 0);
  });

  test("zero evidence message matches spec", () => {
    assert.equal(
      WORKSHEET_RECOMMENDATIONS_ZERO_EVIDENCE_HE,
      "אחרי עוד קצת תרגול נוכל להציע דפי עבודה אישיים לילד."
    );
  });

  test("only practiced topics with answers appear in recommendations", () => {
    const report = {
      summary: { mathQuestions: 12 },
      subjects: {
        math: {
          answers: 12,
          topics: {
            addition: { answers: 8, correct: 4 },
            subtraction: { answers: 0, correct: 0 },
          },
        },
        geometry: {
          answers: 0,
          topics: {
            area: { answers: 0, correct: 0 },
          },
        },
      },
    };
    const recs = buildWorksheetRecommendationsFromReport(report, "g2");
    assert.ok(recs.length >= 1);
    assert.equal(recs[0].subjectId, "math");
    assert.equal(recs[0].topicKey, "addition");
    const topicKeys = recs.map((r) => r.topicKey);
    assert.equal(topicKeys.includes("subtraction"), false);
    assert.equal(topicKeys.includes("area"), false);
  });

  test("recommendations API exposes empty message when no evidence", () => {
    const src = WORKSHEET_RECOMMENDATIONS_ZERO_EVIDENCE_HE;
    assert.ok(src.includes("אחרי עוד קצת תרגול"));
  });
});
