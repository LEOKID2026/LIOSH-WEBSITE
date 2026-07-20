import assert from "node:assert/strict";
import {
  compositeSubjectOnWhite,
  extractBinaryMaskFromRgba,
  computeSubjectMaskRatio,
  isUsableSubjectMask,
} from "../../lib/coloring-upload/subject-mask.js";

/** Minimal ImageData stand-in for Node tests. */
class TestImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

const rgba = new TestImageData(2, 2);
rgba.data.set([
  10, 20, 30, 255, 0, 0, 0, 0,
  40, 50, 60, 200, 255, 255, 255, 255,
]);

const isolated = compositeSubjectOnWhite(rgba);
assert.equal(isolated.data[0], 10);
assert.equal(isolated.data[3], 255);
assert.equal(isolated.data[4], 255);
assert.equal(isolated.data[5], 255);
assert.equal(isolated.data[6], 255);

const mask = extractBinaryMaskFromRgba(rgba);
assert.deepEqual(Array.from(mask), [255, 0, 255, 255]);
assert.equal(computeSubjectMaskRatio(mask), 0.75);
assert.equal(isUsableSubjectMask(mask), true);
assert.equal(isUsableSubjectMask(new Uint8ClampedArray([255, 255, 255, 255])), false);

console.log("subject-mask.test OK");
