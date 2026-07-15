/**
 * Regression guard: joining an existing arcade room (by room ID) must not be gated by the
 * "room_public_create" Admin feature flag - that flag is for creating a public room, not for
 * joining a room someone else already created. Otherwise disabling room *creation* would
 * accidentally also block guests from *joining*.
 * Run: node --test tests/arcade/rooms-join-feature-flag.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("rooms/join.js feature flag", () => {
  const src = readFileSync(join(ROOT, "pages/api/arcade/rooms/join.js"), "utf8");

  test("join.js does not gate joining behind room_public_create", () => {
    assert.doesNotMatch(src, /featureKey:\s*["']room_public_create["']/);
  });

  test("join.js still runs the per-game guest access check", () => {
    assert.match(src, /assertArcadePlayAccess\(\s*auth\.supabase,\s*auth\.studentId,\s*roomPreview\.game_key,?\s*\)/);
  });

  test("room creation (create.js) still correctly gates on public/private create flags", () => {
    const createSrc = readFileSync(join(ROOT, "pages/api/arcade/rooms/create.js"), "utf8");
    assert.match(createSrc, /roomAction:\s*roomType === "private" \? "private" : "public"/);
  });

  test("join-by-code still correctly gates on its own dedicated feature flag", () => {
    const joinByCodeSrc = readFileSync(join(ROOT, "pages/api/arcade/rooms/join-by-code.js"), "utf8");
    assert.match(joinByCodeSrc, /roomAction:\s*["']join_by_code["']/);
  });
});
