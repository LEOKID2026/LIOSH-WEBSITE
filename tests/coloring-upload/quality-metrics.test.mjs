import assert from "node:assert/strict";
import { computeQualityMetrics } from "../../lib/coloring-upload/quality-metrics.js";

function makeImageData(w, h, fillFn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const v = fillFn(x, y);
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

const white = makeImageData(100, 100, () => 255);
const m1 = computeQualityMetrics(white);
assert.ok(m1.blackPixelRatio < 0.01);

const mixed = makeImageData(100, 100, (x, y) =>
  x >= 40 && x < 60 && y >= 40 && y < 60 ? 0 : 255
);
const m2 = computeQualityMetrics(mixed);
assert.ok(m2.blackPixelRatio > 0.03);
assert.ok(Array.isArray(m2.warnings));
console.log("quality-metrics.test OK");
