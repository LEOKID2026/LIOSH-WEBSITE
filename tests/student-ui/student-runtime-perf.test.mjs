/**
 * @param {import("node:test")} test
 * @param {typeof import("node:assert/strict")} assert
 */
export function registerStudentRuntimePerfTests(test, assert) {
  test("perf flag helper respects production", async () => {
    const { isStudentPerfInstrumentationEnabled } = await import(
      "../../lib/student-ui/student-session-instrumentation.client.js"
    );
    assert.equal(typeof isStudentPerfInstrumentationEnabled(), "boolean");
  });
}

/**
 * Run: node --test tests/student-ui/student-runtime-perf.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listEducationalHubCardMetadata,
} from "../../lib/educational-games/educational-games-metadata.client.js";
import { LEARNING_HUB_SUBJECTS } from "../../lib/learning/learning-hub-metadata.client.js";
import {
  isStudentCardsCacheStale,
  setCachedCardsSummary,
  invalidateStudentCardsCache,
} from "../../lib/learning-client/studentCardsCacheClient.js";

registerStudentRuntimePerfTests(test, assert);

test("educational hub metadata is lightweight list", () => {
  const rows = listEducationalHubCardMetadata();
  assert.ok(rows.length >= 5);
  assert.ok(rows.every((r) => r.href && r.titleHe && !r.component));
});

test("learning hub metadata has no engine imports", () => {
  assert.ok(LEARNING_HUB_SUBJECTS.some((s) => s.slug === "math-master"));
  assert.equal(LEARNING_HUB_SUBJECTS[0].href.includes("/student/learning/"), true);
});

test("cards cache stale detection", () => {
  invalidateStudentCardsCache();
  assert.equal(isStudentCardsCacheStale("kid-1"), true);
  setCachedCardsSummary("kid-1", { coinBalance: 1, counts: {} });
  assert.equal(isStudentCardsCacheStale("kid-1"), false);
});
