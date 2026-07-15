/**
 * Guest child mode unit tests (no DB).
 * Run: node --test tests/guest/*.test.mjs
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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
import {
  shouldClearGuestResumeTokenOnLogout,
  shouldClearGuestResumeTokenOnResumeFailure,
} from "../../lib/guest/guest-resume-token.client.js";
import {
  guestResumeFailureBannerFromPayload,
  shouldBlockGuestStartAfterResumeFailure,
} from "../../lib/guest/guest-resume-ui.client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

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

  test("economy respects cards_enabled false", () => {
    const e = parseGuestEconomy({ cards_enabled: false });
    assert.equal(e.cardsEnabled, false);
  });
});

describe("guest economy guard", () => {
  test("assertGuestCardsAllowed skips registered students", async () => {
    const { assertGuestCardsAllowed } = await import("../../lib/guest/guest-economy-guard.server.js");
    const r = await assertGuestCardsAllowed(null, { account_kind: "registered" });
    assert.equal(r.ok, true);
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

  test("explicit false overrides baseline without dropping other defaults", () => {
    const catalog = [
      { game_key: "a", category: "solo", is_enabled: true, sort_order: 1 },
      { game_key: "b", category: "solo", is_enabled: true, sort_order: 2 },
      { game_key: "c", category: "solo", is_enabled: true, sort_order: 3 },
      { game_key: "x", category: "online", is_enabled: true, sort_order: 1 },
    ];
    const rows = [{ game_key: "a", guest_playable: false }];
    const map = resolveDefaultGuestPlayableGameKeys(rows, catalog, 2);
    assert.equal(map.get("a"), undefined);
    assert.equal(map.get("b"), true);
    assert.equal(map.get("x"), true);
  });

  test("explicit true opens game beyond gamesPerCategory", () => {
    const catalog = [
      { game_key: "a", category: "solo", is_enabled: true, sort_order: 1 },
      { game_key: "b", category: "solo", is_enabled: true, sort_order: 2 },
      { game_key: "c", category: "solo", is_enabled: true, sort_order: 3 },
    ];
    const rows = [{ game_key: "c", guest_playable: true }];
    const map = resolveDefaultGuestPlayableGameKeys(rows, catalog, 2);
    assert.equal(map.get("a"), true);
    assert.equal(map.get("b"), true);
    assert.equal(map.get("c"), true);
  });

  test("gamesPerCategory increase opens more baseline games even with explicit rows", () => {
    const catalog = [
      { game_key: "a", category: "solo", is_enabled: true, sort_order: 1 },
      { game_key: "b", category: "solo", is_enabled: true, sort_order: 2 },
      { game_key: "c", category: "solo", is_enabled: true, sort_order: 3 },
      { game_key: "d", category: "solo", is_enabled: true, sort_order: 4 },
    ];
    const rows = [
      { game_key: "a", guest_playable: false },
      { game_key: "b", guest_playable: false },
    ];
    const mapAt2 = resolveDefaultGuestPlayableGameKeys(rows, catalog, 2);
    assert.equal(mapAt2.get("a"), undefined);
    assert.equal(mapAt2.get("b"), undefined);
    assert.equal(mapAt2.get("c"), undefined);

    const mapAt4 = resolveDefaultGuestPlayableGameKeys(rows, catalog, 4);
    assert.equal(mapAt4.get("a"), undefined);
    assert.equal(mapAt4.get("b"), undefined);
    assert.equal(mapAt4.get("c"), true);
    assert.equal(mapAt4.get("d"), true);
  });

  test("applyGuestLockToGameAccess locks non-playable", () => {
    const base = { state: GAME_ACCESS_STATES.ALLOWED, category: "solo", gameKey: "c" };
    const row = { game_key: "c", category: "solo" };
    const playable = new Map([["a", true], ["b", true]]);
    const locked = applyGuestLockToGameAccess(base, row, playable);
    assert.equal(locked.state, GAME_ACCESS_STATES.GUEST_LOCKED);
  });
});

describe("guest resume token client", () => {
  test("logout keeps token for active unlinked guest", () => {
    const guest = { account_kind: "guest", guest_status: "active" };
    assert.equal(shouldClearGuestResumeTokenOnLogout(guest, true), false);
  });

  test("logout clears token for registered student", () => {
    assert.equal(shouldClearGuestResumeTokenOnLogout({ account_kind: "registered" }, false), true);
  });

  test("logout clears token for linked guest", () => {
    const guest = { account_kind: "guest", guest_status: "linked" };
    assert.equal(shouldClearGuestResumeTokenOnLogout(guest, true), true);
  });

  test("resume failure clears linked tokens only", () => {
    assert.equal(shouldClearGuestResumeTokenOnResumeFailure("guest_resume_invalid"), false);
    assert.equal(shouldClearGuestResumeTokenOnResumeFailure("guest_already_linked"), true);
    assert.equal(shouldClearGuestResumeTokenOnResumeFailure("guest_mode_disabled"), false);
  });
});

describe("guest resume ui helpers", () => {
  test("linked resume failure shows parent login guidance", () => {
    const banner = guestResumeFailureBannerFromPayload({
      code: "guest_already_linked",
      message: "המספר כבר שויך להורה - התחבר/י עם שם משתמש ו-PIN",
    });
    assert.equal(banner?.code, "guest_already_linked");
    assert.match(banner?.messageHe || "", /התחבר/);
    assert.equal(shouldBlockGuestStartAfterResumeFailure("guest_already_linked"), true);
  });
});

describe("guest login resume behavior", () => {
  test("login page does not auto-resume guest on mount", async () => {
    const src = await readFile(join(repoRoot, "pages", "student", "login.js"), "utf8");
    assert.doesNotMatch(src, /\/api\/student\/guest\/resume/);
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
