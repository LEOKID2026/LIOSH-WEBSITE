/**
 * Unit tests for reward card trim + corner radius helpers.
 * Run: node scripts/tests/reward-card-image-process-selftest.mjs
 */
import assert from "node:assert/strict";
import {
  findRewardCardContentBounds,
  isRewardCardTrimPixel,
  refineRewardCardEdgeCrop,
  resolveRewardCardContentBounds,
  rewardCardCornerRadiusPx,
  rewardCardEdgeCropMaxPx,
  rewardCardEdgeDarkRatio,
  REWARD_CARD_BLACK_TRIM_THRESHOLD,
} from "../../lib/rewards/reward-card-display.js";
import {
  REWARD_CARD_PROCESSING_VERSION,
  resolveRewardCardDisplaySource,
} from "../../lib/rewards/reward-card-image-process.client.js";

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
const refinedFull = refineRewardCardEdgeCrop(full, 4, 4, fullBounds);
assert.deepEqual(refinedFull, fullBounds);
ok("refineRewardCardEdgeCrop leaves clean cards unchanged");

const empty = rgba(6, 6, () => [0, 0, 0, 255]);
const emptyBounds = findRewardCardContentBounds(empty, 6, 6, REWARD_CARD_BLACK_TRIM_THRESHOLD);
assert.deepEqual(emptyBounds, { x: 0, y: 0, width: 6, height: 6 });
ok("findRewardCardContentBounds falls back to full canvas when all dark");

const grayTopBar = rgba(12, 12, (x, y) => {
  if (x === 0 || x === 11 || y === 0 || y === 11) return [0, 0, 0, 255];
  if (y === 1) return [30, 30, 30, 255];
  return [200, 120, 80, 255];
});
const grayInitial = findRewardCardContentBounds(grayTopBar, 12, 12);
assert.deepEqual(grayInitial, { x: 1, y: 1, width: 10, height: 10 });
assert.equal(rewardCardEdgeDarkRatio(grayTopBar, 12, grayInitial, "top"), 1);
const grayRefined = refineRewardCardEdgeCrop(grayTopBar, 12, 12, grayInitial);
assert.deepEqual(grayRefined, { x: 1, y: 2, width: 10, height: 9 });
ok("refineRewardCardEdgeCrop removes near-black edge bar missed by global trim");

const resolved = resolveRewardCardContentBounds(grayTopBar, 12, 12);
assert.deepEqual(resolved, grayRefined);
ok("resolveRewardCardContentBounds applies edge refinement");

const thickEdge = rgba(460, 460, (x, y) => {
  if (x < 10 || x >= 450 || y < 10 || y >= 450) return [0, 0, 0, 255];
  if (x < 30 || x >= 430 || y < 30 || y >= 430) return [30, 30, 30, 255];
  return [210, 140, 90, 255];
});
const thickInitial = findRewardCardContentBounds(thickEdge, 460, 460);
assert.deepEqual(thickInitial, { x: 10, y: 10, width: 440, height: 440 });
const maxCrop = rewardCardEdgeCropMaxPx(thickInitial.height);
const thickRefined = refineRewardCardEdgeCrop(thickEdge, 460, 460, thickInitial);
assert.equal(thickRefined.x - thickInitial.x, maxCrop);
assert.equal(thickRefined.y - thickInitial.y, maxCrop);
assert.equal(thickInitial.width - thickRefined.width, maxCrop * 2);
ok("refineRewardCardEdgeCrop respects per-side max crop");

const radiusSmall = rewardCardCornerRadiusPx(200, 300);
assert.ok(radiusSmall >= 8 && radiusSmall <= 20);
const radiusLarge = rewardCardCornerRadiusPx(2000, 3000);
assert.equal(radiusLarge, 20);
ok("rewardCardCornerRadiusPx clamped");

assert.equal(typeof REWARD_CARD_PROCESSING_VERSION, "number");
const svg = resolveRewardCardDisplaySource("/rewards/cards/placeholders/regular/default.svg");
assert.equal(svg.immediate.includes(".svg"), true);
assert.equal(svg.upgrade, null);
ok("resolveRewardCardDisplaySource skips SVG processing");

console.log("\nreward-card-image-process-selftest: all passed");
