import test from "node:test";
import assert from "node:assert/strict";

import { trimStylizedArtWhiteBorder } from "../../lib/coloring-upload/stylized-postprocess.js";

class MockImageData {
  constructor(width, height, data) {
    this.width = width;
    this.height = height;
    this.data = data ?? new Uint8ClampedArray(width * height * 4);
  }
}

global.ImageData = MockImageData;

function fillWhite(data) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
}

function makeUniformBorderImage(borderPx) {
  const width = 100;
  const height = 80;
  const data = new Uint8ClampedArray(width * height * 4);
  fillWhite(data);
  for (let y = borderPx; y < height - borderPx; y += 1) {
    for (let x = borderPx; x < width - borderPx; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 120;
      data[i + 1] = 80;
      data[i + 2] = 40;
      data[i + 3] = 255;
    }
  }
  return new ImageData(width, height, data);
}

function makeSubjectTouchingBottomEdge() {
  const width = 100;
  const height = 80;
  const borderPx = 5;
  const data = new Uint8ClampedArray(width * height * 4);
  fillWhite(data);
  for (let y = 0; y < height; y += 1) {
    for (let x = borderPx; x < width - borderPx; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = 120;
      data[i + 1] = 80;
      data[i + 2] = 40;
      data[i + 3] = 255;
    }
  }
  return new ImageData(width, height, data);
}

test("trimStylizedArtWhiteBorder removes uniform outer white margins", () => {
  const trimmed = trimStylizedArtWhiteBorder(makeUniformBorderImage(5));
  assert.equal(trimmed.width, 90);
  assert.equal(trimmed.height, 70);
  assert.equal(trimmed.data[0], 120);
});

test("trimStylizedArtWhiteBorder does not crop when subject touches the bottom edge", () => {
  const source = makeSubjectTouchingBottomEdge();
  const trimmed = trimStylizedArtWhiteBorder(source);
  assert.equal(trimmed.height, source.height);
  assert.equal(trimmed.width, 90);
});
