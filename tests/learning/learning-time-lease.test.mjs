/**
 * Lease accrual / visibility unit tests (no DOM — inject mocks).
 * Run: node --test tests/learning/learning-time-lease.test.mjs
 */
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  createLearningTimeLease,
  createVisibleLeaseAccrual,
} from "../../lib/learning-client/learning-time-lease.client.js";

describe("learning-time-lease", () => {
  /** @type {Map<string, string>} */
  let store;
  /** @type {string} */
  let visibility;

  beforeEach(() => {
    store = new Map();
    visibility = "visible";
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => {
        store.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
      },
    };
    globalThis.document = {
      visibilityState: visibility,
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(globalThis.document, "visibilityState", {
      get: () => visibility,
      configurable: true,
    });
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.document;
  });

  test("two tabs: only lease holder accrues", () => {
    const a = createLearningTimeLease({
      studentId: "stu-1",
      ownerId: "tab-a",
      source: "activity-a",
    });
    assert.equal(a.isActive(), true);

    const b = createLearningTimeLease({
      studentId: "stu-1",
      ownerId: "tab-b",
      source: "activity-b",
    });
    // b cannot steal while a heartbeat is fresh
    assert.equal(b.claim(), false);
    assert.equal(b.isActive(), false);
    assert.equal(a.isActive(), true);

    const accA = createVisibleLeaseAccrual(a, { maxSliceMs: 60_000 });
    const accB = createVisibleLeaseAccrual(b, { maxSliceMs: 60_000 });
    // Simulate 5s
    const realNow = Date.now;
    let t = realNow();
    Date.now = () => t;
    accA.reset(0);
    accB.reset(0);
    t += 5_000;
    accA.tick();
    accB.tick();
    Date.now = realNow;
    assert.ok(accA.getAccruedMs() >= 4_000);
    assert.equal(accB.getAccruedMs(), 0);
    a.dispose();
    b.dispose();
  });

  test("hidden tab does not accrue", () => {
    const lease = createLearningTimeLease({
      studentId: "stu-1",
      ownerId: "tab-a",
      source: "x",
    });
    const acc = createVisibleLeaseAccrual(lease, { maxSliceMs: 60_000 });
    const realNow = Date.now;
    let t = realNow();
    Date.now = () => t;
    acc.reset(0);
    visibility = "hidden";
    t += 10_000;
    acc.tick();
    Date.now = realNow;
    assert.equal(acc.getAccruedMs(), 0);
    lease.dispose();
  });

  test("sleep/wake large jump is not credited", () => {
    const lease = createLearningTimeLease({
      studentId: "stu-1",
      ownerId: "tab-a",
      source: "x",
    });
    const acc = createVisibleLeaseAccrual(lease, { maxSliceMs: 60_000 });
    const realNow = Date.now;
    let t = realNow();
    Date.now = () => t;
    acc.reset(0);
    t += 3 * 3600_000; // 3h sleep
    acc.tick();
    Date.now = realNow;
    assert.equal(acc.getAccruedMs(), 0);
    lease.dispose();
  });
});
