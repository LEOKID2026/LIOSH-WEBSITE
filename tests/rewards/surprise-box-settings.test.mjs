/**
 * Surprise box admin settings + accumulation cap.
 * Run: node --test tests/rewards/surprise-box-settings.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseSurpriseBoxGeneralSettings,
  validateSurpriseBoxGeneralSettings,
  tickSurpriseBoxAccumulation,
} from "../../lib/rewards/server/surprise-box-settings.server.js";
import { patchSurpriseBoxStatusFromOpenResult } from "../../lib/rewards/surprise-box-status-patch.client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("surprise-box-settings validation", () => {
  test("blocks 0 cards + 0 coin prizes", () => {
    const result = validateSurpriseBoxGeneralSettings({
      cards_per_open: 0,
      coin_prizes_per_open: 0,
    });
    assert.equal(result.ok, false);
    assert.match(result.messageHe, /לפחות פרס אחד/);
  });

  test("allows composition: 2 cards + 1 coin", () => {
    const result = validateSurpriseBoxGeneralSettings({
      cards_per_open: 2,
      coin_prizes_per_open: 1,
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.cards_per_open, 2);
    assert.equal(result.value.coin_prizes_per_open, 1);
  });

  test("allows composition: 1 card + 2 coins", () => {
    const parsed = parseSurpriseBoxGeneralSettings({
      cards_per_open: 1,
      coin_prizes_per_open: 2,
    });
    assert.equal(parsed.cards_per_open, 1);
    assert.equal(parsed.coin_prizes_per_open, 2);
  });

  test("allows composition: 0 cards + 2 coins", () => {
    const parsed = parseSurpriseBoxGeneralSettings({
      cards_per_open: 0,
      coin_prizes_per_open: 2,
    });
    assert.equal(parsed.cards_per_open, 0);
    assert.equal(parsed.coin_prizes_per_open, 2);
  });

  test("allows composition: 1 card + 0 coins", () => {
    const parsed = parseSurpriseBoxGeneralSettings({
      cards_per_open: 1,
      coin_prizes_per_open: 0,
    });
    assert.equal(parsed.cards_per_open, 1);
    assert.equal(parsed.coin_prizes_per_open, 0);
  });

  test("clamps max_pending_boxes to 1..10", () => {
    assert.equal(parseSurpriseBoxGeneralSettings({ max_pending_boxes: -5 }).max_pending_boxes, 1);
    assert.equal(parseSurpriseBoxGeneralSettings({ max_pending_boxes: 99 }).max_pending_boxes, 10);
    assert.equal(parseSurpriseBoxGeneralSettings({ max_pending_boxes: 5 }).max_pending_boxes, 5);
  });

  test("clamps prize slots to 0..3", () => {
    assert.equal(parseSurpriseBoxGeneralSettings({ cards_per_open: 9 }).cards_per_open, 3);
    assert.equal(parseSurpriseBoxGeneralSettings({ coin_prizes_per_open: -1 }).coin_prizes_per_open, 0);
  });
});

describe("surprise-box accumulation cap", () => {
  const general = parseSurpriseBoxGeneralSettings({
    max_pending_boxes: 2,
    box_interval_minutes: 60,
  });

  test("child at 0 can accumulate up to max", () => {
    const t0 = new Date("2026-06-01T10:00:00Z");
    const t1 = new Date("2026-06-01T11:00:00Z");
    const t2 = new Date("2026-06-01T12:00:00Z");

    let state = {
      pending_box_count: 0,
      has_pending_box: false,
      last_opened_at: t0.toISOString(),
      next_available_at: null,
    };

    const first = tickSurpriseBoxAccumulation(state, general, t0);
    assert.ok(first);
    assert.equal(first.pending_box_count, 0);
    assert.ok(first.next_available_at);

    state = { ...state, ...first };
    const second = tickSurpriseBoxAccumulation(state, general, t1);
    assert.ok(second);
    assert.equal(second.pending_box_count, 1);

    state = { ...state, ...second };
    const third = tickSurpriseBoxAccumulation(state, general, t2);
    assert.ok(third);
    assert.equal(third.pending_box_count, 2);
    assert.equal(third.next_available_at, null);
  });

  test("child at max does not receive a third box", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const patch = tickSurpriseBoxAccumulation(
      {
        pending_box_count: 2,
        has_pending_box: true,
        last_opened_at: "2026-06-01T08:00:00Z",
        next_available_at: "2026-06-01T11:00:00Z",
      },
      general,
      now
    );
    assert.equal(patch, null);
  });

  test("legacy has_pending_box without pending_box_count counts as 1", () => {
    const generalOne = parseSurpriseBoxGeneralSettings({ max_pending_boxes: 2 });
    const patch = tickSurpriseBoxAccumulation(
      {
        has_pending_box: true,
        last_opened_at: "2026-06-01T08:00:00Z",
        next_available_at: "2026-06-01T09:00:00Z",
      },
      generalOne,
      new Date("2026-06-01T10:00:00Z")
    );
    assert.ok(patch);
    assert.equal(patch.pending_box_count, 2);
  });
});

describe("surprise-box runtime uses admin settings (no hardcoded 2+1)", () => {
  test("openSurpriseBox reads cards_per_open and coin_prizes_per_open from settings", () => {
    const src = readFileSync(join(ROOT, "lib/rewards/server/surprise-box.server.js"), "utf8");
    assert.match(src, /general\.cards_per_open/);
    assert.match(src, /general\.coin_prizes_per_open/);
    assert.doesNotMatch(src, /cardsWanted\s*=\s*2\b/);
    assert.doesNotMatch(src, /coinsWanted\s*=\s*1\b/);
  });

  test("student modal does not hardcode two cards text", () => {
    const src = readFileSync(
      join(ROOT, "components/student/rewards/StudentSurpriseBoxOpenModal.jsx"),
      "utf8"
    );
    assert.doesNotMatch(src, /שני קלפים/);
    assert.match(src, /coinAmounts/);
    assert.doesNotMatch(src, /\[open,\s*onOpened\]/);
    assert.match(src, /onOpenedRef/);
    assert.match(src, /flushSync/);
    assert.match(src, /loading="eager"/);
    assert.match(src, /OPEN_TIMEOUT_MS/);
    assert.match(src, /OPEN_ERROR_HE/);
    assert.match(src, /pendingBoxCountAfter/);
    assert.match(src, /פתח קופסה נוספת/);
    assert.match(src, /NO_MORE_BOX_HE/);
    assert.match(src, /openAttempt/);
  });

  test("surprise box status patch uses open API pendingBoxCountAfter", () => {
    assert.deepEqual(patchSurpriseBoxStatusFromOpenResult({ ok: true, pendingBoxCountAfter: 2 }), {
      ready: true,
      pendingBoxCount: 2,
    });
    assert.deepEqual(patchSurpriseBoxStatusFromOpenResult({ ok: true, pendingBoxCountAfter: 0 }), {
      ready: false,
      pendingBoxCount: 0,
    });
    assert.deepEqual(patchSurpriseBoxStatusFromOpenResult({ code: "no_pending_box" }), {
      ready: false,
      pendingBoxCount: 0,
    });
    assert.equal(patchSurpriseBoxStatusFromOpenResult({ code: "coin_failed" }), null);
  });

  test("admin card grant uses parent email search component", () => {
    const cardsTab = readFileSync(
      join(ROOT, "components/admin/rewards/AdminCardsTab.jsx"),
      "utf8"
    );
    assert.match(cardsTab, /AdminCardGrantByParent/);
    assert.doesNotMatch(cardsTab, /grantStudentId/);
    assert.doesNotMatch(cardsTab, /מזהה תלמיד/);

    const grant = readFileSync(
      join(ROOT, "components/admin/rewards/AdminCardGrantByParent.jsx"),
      "utf8"
    );
    assert.match(grant, /מייל הורה/);
    assert.match(grant, /חיפוש ילדים/);
    assert.match(grant, /הענק קלף לילד/);
    assert.match(grant, /\/api\/admin\/parents\/by-email/);
  });
});
