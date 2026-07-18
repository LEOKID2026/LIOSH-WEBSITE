/**
 * Student navigation feedback delay tests.
 * Run: node --test tests/student-ui/student-navigation-feedback.test.mjs
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getCachedCardsTab,
  getCachedCardsSummary,
  setCachedCardsTab,
  setCachedCardsSummary,
  invalidateStudentCardsCache,
} from "../../lib/learning-client/studentCardsCacheClient.js";

describe("studentCardsCacheClient", () => {
  beforeEach(() => {
    invalidateStudentCardsCache();
  });

  test("stores and reads tab payload by student and tab", () => {
    setCachedCardsTab("kid-1", "shop", { shop: [{ id: "c1" }] });
    const cached = getCachedCardsTab("kid-1", "shop");
    assert.ok(cached);
    assert.equal(cached.shop[0].id, "c1");
    assert.equal(getCachedCardsTab("kid-1", "collection"), null);
  });

  test("stores and reads summary by student", () => {
    setCachedCardsSummary("kid-2", { coinBalance: 42, counts: { owned: 3 } });
    assert.deepEqual(getCachedCardsSummary("kid-2"), { coinBalance: 42, counts: { owned: 3 } });
    assert.equal(getCachedCardsSummary("kid-1"), null);
  });

  test("invalidate clears student cache", () => {
    setCachedCardsSummary("kid-3", { coinBalance: 1, counts: {} });
    invalidateStudentCardsCache("kid-3");
    assert.equal(getCachedCardsSummary("kid-3"), null);
  });
});

describe("student-navigation-feedback policy", () => {
  test("default navigation delay is 600ms", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile("components/student-ui/StudentNavigationFeedback.jsx", "utf8");
    assert.match(src, /DEFAULT_DELAY_MS = 600/);
    assert.match(src, /pointer-events-none fixed inset-0/);
  });
});
