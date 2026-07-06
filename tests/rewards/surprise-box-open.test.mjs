/**
 * Surprise box open/rollback contracts.
 * Run: node --test tests/rewards/surprise-box-open.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { rollbackSurpriseBoxClaim } from "../../lib/rewards/server/surprise-box.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

/**
 * @param {object} initialState
 * @param {{ failRestore?: boolean }} [opts]
 */
function createSurpriseBoxStateMock(initialState, opts = {}) {
  let state = { ...initialState };

  return {
    state: () => ({ ...state }),
    supabase: {
      from(table) {
        assert.equal(table, "surprise_box_state");
        const builder = {
          _filters: [],
          select() {
            return builder;
          },
          eq(col, val) {
            builder._filters.push([col, val]);
            return builder;
          },
          update(patch) {
            builder._patch = patch;
            return builder;
          },
          maybeSingle() {
            if (builder._patch) {
              const countFilter = builder._filters.find(([c]) => c === "pending_box_count");
              if (countFilter && readPendingCount(state) !== countFilter[1]) {
                return Promise.resolve({ data: null, error: null });
              }
              if (opts.failRestore) {
                return Promise.resolve({ data: null, error: { message: "restore blocked" } });
              }
              state = { ...state, ...builder._patch };
              return Promise.resolve({ data: { student_id: state.student_id, ...state }, error: null });
            }
            return Promise.resolve({ data: { ...state }, error: null });
          },
        };
        return builder;
      },
    },
  };
}

function readPendingCount(state) {
  if (state?.pending_box_count != null) return Math.max(0, Number(state.pending_box_count) || 0);
  return state?.has_pending_box ? 1 : 0;
}

describe("rollbackSurpriseBoxClaim", () => {
  test("restores pending_box_count after failed grant path", async () => {
    const studentId = "stu-1";
    const mock = createSurpriseBoxStateMock({
      student_id: studentId,
      pending_box_count: 0,
      has_pending_box: false,
      last_opened_at: "2026-07-01T12:00:00Z",
      next_available_at: "2026-07-01T13:00:00Z",
      first_box_given: true,
    });

    const result = await rollbackSurpriseBoxClaim(mock.supabase, studentId, {
      claimedCount: 0,
      preClaim: {
        pendingCount: 1,
        lastOpenedAt: null,
        nextAvailableAt: null,
        firstBoxGiven: false,
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.pendingBoxCount, 1);
    assert.equal(mock.state().pending_box_count, 1);
    assert.equal(mock.state().has_pending_box, true);
    assert.equal(mock.state().last_opened_at, null);
  });

  test("is idempotent when count already restored", async () => {
    const studentId = "stu-2";
    const mock = createSurpriseBoxStateMock({
      student_id: studentId,
      pending_box_count: 2,
      has_pending_box: true,
    });

    const result = await rollbackSurpriseBoxClaim(mock.supabase, studentId, {
      claimedCount: 1,
      preClaim: { pendingCount: 2, lastOpenedAt: null, nextAvailableAt: null, firstBoxGiven: true },
    });

    assert.equal(result.ok, true);
    assert.equal(result.alreadyRestored, true);
    assert.equal(mock.state().pending_box_count, 2);
  });

  test("fails when count changed unexpectedly (concurrent open won)", async () => {
    const studentId = "stu-3";
    const mock = createSurpriseBoxStateMock({
      student_id: studentId,
      pending_box_count: 0,
      has_pending_box: false,
    });

    const result = await rollbackSurpriseBoxClaim(mock.supabase, studentId, {
      claimedCount: 2,
      preClaim: { pendingCount: 3, lastOpenedAt: null, nextAvailableAt: null, firstBoxGiven: true },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "rollback_count_mismatch");
  });
});

describe("openSurpriseBox server contracts", () => {
  const src = readFileSync(join(ROOT, "lib/rewards/server/surprise-box.server.js"), "utf8");

  test("imports mapRewardCardImageFields for card prize response", () => {
    assert.match(src, /import \{ mapRewardCardImageFields \} from "\.\.\/reward-card-image-urls\.js"/);
  });

  test("does not fail entire open on partial card pool — grants available prizes", () => {
    assert.doesNotMatch(src, /insufficient_card_pool/);
    assert.match(src, /cardsGranted/);
  });

  test("guest cards guard zeroes cardsWanted before pick", () => {
    assert.match(src, /const cardsWanted = guestCardsGuard\.ok \? general\.cards_per_open : 0/);
  });

  test("all post-claim failure paths roll back pending_box_count", () => {
    assert.match(src, /failOpenAfterClaim\(supabase, studentId, claim, coinResult\.code/);
    assert.match(src, /failOpenAfterClaim\(supabase, studentId, claim, diamondResult\.code/);
    assert.match(src, /failOpenAfterClaim\(supabase, studentId, claim, grant\.code/);
    assert.match(src, /failOpenAfterClaim\(supabase, studentId, claim, "opening_log_failed"/);
    assert.match(src, /failOpenAfterClaim\(supabase, studentId, claim, "no_rewards_available"/);
  });

  test("claim uses CAS on pending_box_count", () => {
    assert.match(src, /\.eq\("pending_box_count", pendingCount\)/);
    assert.match(src, /rollbackSurpriseBoxClaim/);
  });
});

describe("surprise box client contracts", () => {
  test("widget does not optimistically decrement pendingBoxCount on open click", () => {
    const widget = readFileSync(
      join(ROOT, "components/student/rewards/StudentSurpriseBoxWidget.jsx"),
      "utf8"
    );
    assert.doesNotMatch(widget, /setPendingBoxCount\([^)]*-\s*1/);
    assert.doesNotMatch(widget, /pendingBoxCount\s*-\s*1/);
    assert.match(widget, /loadStatus/);
  });

  test("open modal refetches status on error and success", () => {
    const modal = readFileSync(
      join(ROOT, "components/student/rewards/StudentSurpriseBoxOpenModal.jsx"),
      "utf8"
    );
    assert.match(modal, /onError\?\.\(\)/);
    assert.match(modal, /onOpened\?\.\(json\)/);
  });

  test("home wires refresh token on error and close", () => {
    const home = readFileSync(join(ROOT, "pages/student/home.js"), "utf8");
    assert.match(home, /onError=\{\(\) => setBoxRefreshToken/);
    assert.match(home, /onClose=\{\(\) => \{[\s\S]*setBoxRefreshToken/);
  });
});
