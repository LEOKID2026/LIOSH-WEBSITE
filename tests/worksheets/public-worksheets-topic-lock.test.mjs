/**
 * Public demo topic lock — grade-aware allowlist, mixed blocked.
 * Run: node --test tests/worksheets/public-worksheets-topic-lock.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_DEMO_ALLOWED_BY_GRADE,
  isPublicDemoTopicAllowed,
} from "../../lib/worksheets/worksheet-public-demo.constants.js";
import { validatePublicDemoGenerationParams } from "../../lib/worksheets/worksheet-public-demo-allowlist.server.js";

describe("public-worksheets-topic-lock", () => {
  test("only allowlisted topic per subject+grade is accepted", () => {
    for (const [subjectId, grades] of Object.entries(PUBLIC_DEMO_ALLOWED_BY_GRADE)) {
      for (const [gradeKey, entry] of Object.entries(grades)) {
        assert.equal(isPublicDemoTopicAllowed(subjectId, gradeKey, entry.topicKey), true);
        const blocked = entry.topicKey === "addition" ? "subtraction" : "addition";
        assert.equal(isPublicDemoTopicAllowed(subjectId, gradeKey, blocked), false);
      }
    }
  });

  test("mixed topic rejected", () => {
    const res = validatePublicDemoGenerationParams({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "mixed",
      levelKey: "regular",
      mixedTopicKeys: ["addition"],
    });
    assert.equal(res.ok, false);
    assert.equal(res.error, "TOPIC_NOT_ALLOWED_IN_PUBLIC_DEMO");
  });

  test("wrong topic for grade returns 403 error code", () => {
    const res = validatePublicDemoGenerationParams({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "multiplication",
      levelKey: "regular",
    });
    assert.equal(res.ok, false);
    assert.equal(res.error, "TOPIC_NOT_ALLOWED_IN_PUBLIC_DEMO");
  });

  test("geometry uses גאומטריה spelling in allowlist subjects only", () => {
    assert.ok(PUBLIC_DEMO_ALLOWED_BY_GRADE.geometry);
    assert.equal(PUBLIC_DEMO_ALLOWED_BY_GRADE.g1, undefined);
    assert.equal(PUBLIC_DEMO_ALLOWED_BY_GRADE.giometry, undefined);
  });
});
