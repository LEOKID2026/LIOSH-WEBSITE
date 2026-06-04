import assert from "node:assert/strict";
import test from "node:test";
import { STEP_BY_STEP_AUTO_PLAY_DELAY_MS } from "../utils/learning-step-by-step-config.js";

test("step-by-step auto-play delay is 5 seconds", () => {
  assert.equal(STEP_BY_STEP_AUTO_PLAY_DELAY_MS, 5000);
});
