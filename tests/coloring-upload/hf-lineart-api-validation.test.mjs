import assert from "node:assert/strict";
import { parseHfLineArtRequestBody, HF_API_MAX_JSON_BYTES } from "../../lib/coloring-upload/hf-lineart-api-validation.server.js";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const parsed = parseHfLineArtRequestBody({
  imageBase64: tinyPng.toString("base64"),
  mimeType: "image/png",
});
assert.equal(parsed.ok, true);
assert.equal(parsed.mimeType, "image/png");

const badMime = parseHfLineArtRequestBody({
  imageBase64: tinyPng.toString("base64"),
  mimeType: "application/pdf",
});
assert.equal(badMime.ok, false);

const huge = "A".repeat(HF_API_MAX_JSON_BYTES + 10);
const tooBig = parseHfLineArtRequestBody({ imageBase64: huge, mimeType: "image/jpeg" });
assert.equal(tooBig.ok, false);

console.log("hf-lineart-api-validation.test OK");
