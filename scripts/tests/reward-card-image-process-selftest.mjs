/**
 * Unit tests for reward card trim + corner radius helpers.
 * Run: node scripts/tests/reward-card-image-process-selftest.mjs
 */
import assert from "node:assert/strict";
import {
  findRewardCardContentBounds,
  isRewardCardTrimPixel,
  rewardCardCornerRadiusPx,
  REWARD_CARD_BLACK_TRIM_THRESHOLD,
} from "../../lib/rewards/reward-card-display.js";

function ok(label) {
  console.log(`  ok  ${label}`);
}

function rgba(w, h, fillFn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const [r, g, b, a] = fillFn(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return data;
}

assert.equal(isRewardCardTrimPixel(0, 0, 0, 255), true);
assert.equal(isRewardCardTrimPixel(30, 30, 30, 255), false);
assert.equal(isRewardCardTrimPixel(255, 255, 255, 255), false);
assert.equal(isRewardCardTrimPixel(10, 10, 10, 8), true);
ok("isRewardCardTrimPixel");

const letterbox = rgba(10, 10, (x, y) => {
  if (x === 0 || x === 9 || y === 0 || y === 9) return [0, 0, 0, 255];
  return [200, 120, 80, 255];
});
const trimmed = findRewardCardContentBounds(letterbox, 10, 10);
assert.deepEqual(trimmed, { x: 1, y: 1, width: 8, height: 8 });
ok("findRewardCardContentBounds trims black letterbox");

const full = rgba(4, 4, () => [180, 90, 40, 255]);
const fullBounds = findRewardCardContentBounds(full, 4, 4);
assert.deepEqual(fullBounds, { x: 0, y: 0, width: 4, height: 4 });
ok("findRewardCardContentBounds keeps full art when no trim");

const empty = rgba(6, 6, () => [0, 0, 0, 255]);
const emptyBounds = findRewardCardContentBounds(empty, 6, 6, REWARD_CARD_BLACK_TRIM_THRESHOLD);
assert.deepEqual(emptyBounds, { x: 0, y: 0, width: 6, height: 6 });
ok("findRewardCardContentBounds falls back to full canvas when all dark");

const radiusSmall = rewardCardCornerRadiusPx(200, 300);
assert.ok(radiusSmall >= 8 && radiusSmall <= 20);
const radiusLarge = rewardCardCornerRadiusPx(2000, 3000);
assert.equal(radiusLarge, 20);
ok("rewardCardCornerRadiusPx clamped");

console.log("\nreward-card-image-process-selftest: all passed");
