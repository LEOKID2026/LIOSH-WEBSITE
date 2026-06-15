import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVITY_MODES,
  shouldRevealCorrectAnswerToStudent,
} from "../lib/classroom-activities/classroom-activities-shared.server.js";

test("discussion mode is registered in ACTIVITY_MODES", () => {
  assert.equal(ACTIVITY_MODES.has("discussion"), true);
});

test("assigned activities: student never sees correct answer reveal", () => {
  assert.equal(shouldRevealCorrectAnswerToStudent("discussion"), false);
  assert.equal(
    shouldRevealCorrectAnswerToStudent("discussion", { submitted: true }),
    false
  );
  assert.equal(shouldRevealCorrectAnswerToStudent("quiz"), false);
  assert.equal(
    shouldRevealCorrectAnswerToStudent("quiz", { submitted: true }),
    false
  );
  assert.equal(shouldRevealCorrectAnswerToStudent("guided_practice"), false);
  assert.equal(
    shouldRevealCorrectAnswerToStudent("guided_practice", { submitted: true }),
    false
  );
  assert.equal(shouldRevealCorrectAnswerToStudent("homework"), false);
  assert.equal(
    shouldRevealCorrectAnswerToStudent("homework", { submitted: true }),
    false
  );
});
