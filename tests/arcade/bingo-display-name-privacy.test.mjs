/**
 * Regression guard: Bingo must never expose a child's real full_name (or last name)
 * as a public display_name to other players in the room. It must use the same safe
 * display-name mechanism (getArcadeDisplayName) as the rest of the arcade.
 * Run: node --test tests/arcade/bingo-display-name-privacy.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("bingo display name privacy", () => {
  const src = readFileSync(join(ROOT, "lib/arcade/server/bingo-game.js"), "utf8");

  test("bingo-game.js imports the safe getArcadeDisplayName helper", () => {
    assert.match(src, /import\s*\{\s*getArcadeDisplayName\s*\}\s*from\s*["']\.\.\/club\/player-profile\.server\.js["']/);
  });

  test("bingo-game.js never sets display_name / displayName directly from a raw full_name field", () => {
    // The historical bug: `nameById.set(id, String(s.full_name ...))` or
    // `displayName = String(st?.full_name ...)` — a real last-name-bearing string sent
    // straight to other players. Any remaining raw full_name usage must not feed a
    // display-name variable directly.
    assert.doesNotMatch(src, /nameById\.set\([^)]*full_name/);
    assert.doesNotMatch(src, /displayName\s*=\s*String\([^)]*full_name/);
    assert.doesNotMatch(src, /display_name\s*[:=]\s*[^,\n]*full_name/);
  });

  test("bingo-game.js resolves player names via getArcadeDisplayName", () => {
    assert.match(src, /getArcadeDisplayName\(supabase,\s*sid\)/);
    assert.match(src, /getArcadeDisplayName\(supabase,\s*studentId\)/);
  });

  test("bingo-game.js does not select full_name from students just to build a room-wide name map", () => {
    // A direct `.select("id, full_name")` batch query for the room's player list is the
    // exact pattern that leaked real names; it should no longer be present.
    assert.doesNotMatch(src, /\.select\(\s*["']id,\s*full_name["']\s*\)/);
  });
});
