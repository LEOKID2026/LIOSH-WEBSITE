/**
 * Server-side variant buffer generation (sharp trim + resize).
 * Run: node scripts/tests/reward-card-variant-process-selftest.mjs
 */
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  buildRewardCardVariantBuffers,
  computeTrimBoundsFromBuffer,
} from "../../lib/rewards/server/reward-card-variant-process.server.js";

function ok(label) {
  console.log(`  ok  ${label}`);
}

async function makeLetterboxPng() {
  return sharp({
    create: {
      width: 120,
      height: 180,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 80,
            height: 120,
            channels: 4,
            background: { r: 200, g: 120, b: 80, alpha: 255 },
          },
        })
          .png()
          .toBuffer(),
        left: 20,
        top: 30,
      },
    ])
    .png()
    .toBuffer();
}

const input = await makeLetterboxPng();
const bounds = await computeTrimBoundsFromBuffer(input);
assert.equal(bounds.x, 20);
assert.equal(bounds.y, 30);
assert.equal(bounds.width, 80);
assert.equal(bounds.height, 120);
ok("computeTrimBoundsFromBuffer trims letterbox");

const built = await buildRewardCardVariantBuffers(input);
assert.ok(built.thumbBuffer.length > 0);
assert.ok(built.displayBuffer.length > 0);
assert.ok(built.downloadBuffer.length > 0);
assert.ok(built.originalBuffer.length > 0);

const thumbMeta = await sharp(built.thumbBuffer).metadata();
assert.ok((thumbMeta.width || 0) <= 280);
assert.ok((thumbMeta.height || 0) <= 280);
assert.equal(thumbMeta.format, "webp");
ok("thumb variant resized to max edge");

const downloadMeta = await sharp(built.downloadBuffer).metadata();
assert.equal(downloadMeta.format, "png");
assert.equal(downloadMeta.width, 80);
assert.equal(downloadMeta.height, 120);
ok("download variant keeps trimmed full size PNG");

const clean = await sharp({
  create: {
    width: 64,
    height: 96,
    channels: 4,
    background: { r: 210, g: 140, b: 90, alpha: 255 },
  },
})
  .png()
  .toBuffer();
const cleanBuilt = await buildRewardCardVariantBuffers(clean);
const cleanDownload = await sharp(cleanBuilt.downloadBuffer).metadata();
assert.equal(cleanDownload.width, 64);
assert.equal(cleanDownload.height, 96);
ok("clean cards keep full dimensions");

console.log("\nreward-card-variant-process-selftest: all passed");
