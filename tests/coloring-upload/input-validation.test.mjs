import assert from "node:assert/strict";
import {
  validateColoringUploadFile,
  isHeicFile,
} from "../../lib/coloring-upload/input-validation.js";

const big = new File([new Uint8Array(16 * 1024 * 1024)], "x.jpg", { type: "image/jpeg" });
assert.equal(validateColoringUploadFile(big).ok, false);

const ok = new File([new Uint8Array(100)], "photo.jpg", { type: "image/jpeg" });
assert.equal(validateColoringUploadFile(ok).ok, true);

const heic = new File([new Uint8Array(10)], "img.heic", { type: "image/heic" });
assert.equal(isHeicFile(heic), true);
console.log("input-validation.test OK");
