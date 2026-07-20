import assert from "node:assert/strict";
import {
  getIsraelUsageDateKey,
  coloringUploadRemaining,
  COLORING_UPLOAD_AI_USER_DAILY_LIMIT,
} from "../../lib/coloring-upload/coloring-upload-quota-window.server.js";

const key = getIsraelUsageDateKey(new Date("2026-07-20T12:00:00+03:00"));
assert.match(key, /^\d{4}-\d{2}-\d{2}$/);

assert.equal(coloringUploadRemaining(3, COLORING_UPLOAD_AI_USER_DAILY_LIMIT), 7);
assert.equal(coloringUploadRemaining(10, COLORING_UPLOAD_AI_USER_DAILY_LIMIT), 0);

console.log("coloring-upload-quota-window.test OK");
