/**
 * Every active arcade board game must resolve to a Hebrew display title — never a raw
 * English gameKey (invite banners, open-room lists, etc.).
 * Run: node --test tests/arcade/game-titles-hebrew.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARCADE_GAME_TITLES_HE,
  displayArcadeGameTitle,
} from "../../components/arcade/club/arcadeGameTitles.he.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const ACTIVE_ARCADE_GAME_KEYS = [
  "fourline",
  "ludo",
  "snakes-and-ladders",
  "checkers",
  "chess",
  "dominoes",
  "bingo",
];

const HEBREW_RANGE = /[\u0590-\u05FF]/;

describe("arcade game titles are Hebrew for all 7 active games", () => {
  for (const gameKey of ACTIVE_ARCADE_GAME_KEYS) {
    test(`"${gameKey}" resolves to a Hebrew title, never the raw key`, () => {
      const title = displayArcadeGameTitle(gameKey);
      assert.ok(HEBREW_RANGE.test(title), `expected Hebrew title for "${gameKey}", got: "${title}"`);
      assert.notEqual(title, gameKey);
      assert.ok(ARCADE_GAME_TITLES_HE[gameKey], `missing explicit mapping for "${gameKey}"`);
    });
  }

  test("unmapped/unknown gameKey falls back to a generic Hebrew word, never the raw key", () => {
    const title = displayArcadeGameTitle("some-future-game-key");
    assert.equal(title, "משחק");
  });

  test("ArcadeInviteBanner.jsx uses the shared Hebrew title helper for invite.gameKey", () => {
    const src = readFileSync(
      join(ROOT, "components/arcade/club/ArcadeInviteBanner.jsx"),
      "utf8",
    );
    assert.match(src, /displayArcadeGameTitle\(invite\.gameKey\)/);
    assert.doesNotMatch(src, /\$\{invite\.gameKey\}/);
  });
});
