/**
 * Guest child mode unit tests (no DB).
 * Run: node --test tests/guest/*.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeLeoNumber,
} from "../../lib/guest/guest-leo-number.server.js";
import {
  formatGuestDisplayNameHe,
  formatStudentGreetingHe,
  isGuestStudent,
} from "../../lib/guest/guest-display.js";
import {
  applyGuestLockToGameAccess,
  resolveDefaultGuestPlayableGameKeys,
  resolveDefaultGuestPlayableTopics,
} from "../../lib/guest/guest-access-policy.server.js";
import {
  parseGuestModeEnabled,
  parseGuestDefaults,
  parseGuestEconomy,
} from "../../lib/guest/guest-settings.server.js";
import { GAME_ACCESS_STATES } from "../../lib/games/game-catalog.constants.js";

describe("guest leo number", () => {
  test("normalize accepts 8 digits", () => {
    assert.equal(normalizeLeoNumber("48291301"), "48291301");
    assert.equal(normalizeLeoNumber("4829-1301"), "48291301");
  });

  test("normalize rejects wrong length and leading zero", () => {
    assert.equal(normalizeLeoNumber("1234567"), null);
    assert.equal(normalizeLeoNumber("123456789"), null);
    assert.equal(normalizeLeoNumber("01234567"), null);
    assert.equal(normalizeLeoNumber("482913"), null);
  });
});

describe("guest display", () => {
  test("formats guest greeting", () => {
    const student = { account_kind: "guest", leo_number: "48291301" };
    assert.equal(isGuestStudent(student), true);
    assert.equal(formatGuestDisplayNameHe(student), "אורח 48291301");
    assert.equal(formatStudentGreetingHe(student), "שלום אורח 48291301");
  });

  test("registered student keeps name greeting", () => {
    const student = { account_kind: "registered", full_name: "נועם" };
    assert.equal(formatStudentGreetingHe(student), "שלום נועם");
  });
});

describe("guest settings parsers", () => {
  test("defaults games/topics to 2", () => {
    const d = parseGuestDefaults({});
    assert.equal(d.gamesPerCategory, 2);
    assert.equal(d.topicsPerSubject, 2);
  });

  test("guest mode enabled flag", () => {
    assert.equal(parseGuestModeEnabled({ enabled: true }), true);
    assert.equal(parseGuestModeEnabled({ enabled: false }), false);
  });

  test("economy defaults open", () => {
    const e = parseGuestEconomy({});
    assert.equal(e.shopEnabled, true);
    assert.equal(e.cardsEnabled, true);
  });
});

describe("guest game access policy", () => {
  test("default picks first N enabled games per category", () => {
    const catalog = [
      { game_key: "a", category: "solo", is_enabled: true, sort_order: 1 },
      { game_key: "b", category: "solo", is_enabled: true, sort_order: 2 },
      { game_key: "c", category: "solo", is_enabled: true, sort_order: 3 },
    ];
    const map = resolveDefaultGuestPlayableGameKeys([], catalog, 2);
    assert.equal(map.get("a"), true);
    assert.equal(map.get("b"), true);
    assert.equal(map.get("c"), undefined);
  });

  test("applyGuestLockToGameAccess locks non-playable", () => {
    const base = { state: GAME_ACCESS_STATES.ALLOWED, category: "solo", gameKey: "c" };
    const row = { game_key: "c", category: "solo" };
    const playable = new Map([["a", true], ["b", true]]);
    const locked = applyGuestLockToGameAccess(base, row, playable);
    assert.equal(locked.state, GAME_ACCESS_STATES.GUEST_LOCKED);
  });
});

describe("guest learning topic policy", () => {
  test("default picks first N topics when no explicit rows", () => {
    const map = resolveDefaultGuestPlayableTopics([], "math", ["add", "sub", "mul"], 2);
    assert.equal(map.get("add"), true);
    assert.equal(map.get("sub"), true);
    assert.equal(map.get("mul"), undefined);
  });
});
