import assert from "node:assert/strict";
import { depthMapToLineArt } from "../../lib/coloring-upload/poc/depth-to-line-art.js";

const depth = {
  width: 3,
  height: 3,
  channels: 1,
  data: new Uint8Array([
    10, 10, 10,
    10, 200, 10,
    10, 10, 10,
  ]),
};

const lines = depthMapToLineArt(depth, { edgeThreshold: 30 });
assert.equal(lines.width, 3);
assert.equal(lines.height, 3);
const edgeIdx = (1 * 3 + 2) * 4;
assert.equal(lines.data[edgeIdx], 0, "depth discontinuity neighbor should produce ink");

console.log("depth-to-line-art.test OK");
