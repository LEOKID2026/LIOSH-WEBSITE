import test from "node:test";
import assert from "node:assert/strict";

import { COLORING_UPLOAD_REPLICATE_STYLES } from "../../lib/coloring-upload/style-transfer-styles.js";
import { REPLICATE_STYLE_CONFIGS } from "../../lib/coloring-upload/style-transfer-styles.server.js";
import { parseStyleTransferRequestBody } from "../../lib/coloring-upload/style-transfer-api-validation.server.js";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("parseStyleTransferRequestBody accepts replicate styles", () => {
  for (const style of COLORING_UPLOAD_REPLICATE_STYLES) {
    const parsed = parseStyleTransferRequestBody({
      style,
      imageBase64: TINY_PNG_BASE64,
      mimeType: "image/png",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.style, style);
  }
});

test("every replicate style has a server config", () => {
  for (const style of COLORING_UPLOAD_REPLICATE_STYLES) {
    assert.ok(REPLICATE_STYLE_CONFIGS[style], `missing config for ${style}`);
  }
});

test("parseStyleTransferRequestBody rejects coloring style on style-transfer route", () => {
  const parsed = parseStyleTransferRequestBody({
    style: "coloring",
    imageBase64: TINY_PNG_BASE64,
    mimeType: "image/png",
  });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.code, "invalid_style");
});

test("parseStyleTransferRequestBody rejects unknown style", () => {
  const parsed = parseStyleTransferRequestBody({
    style: "oil-painting",
    imageBase64: TINY_PNG_BASE64,
    mimeType: "image/png",
  });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.code, "invalid_style");
});
