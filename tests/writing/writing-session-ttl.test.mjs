/**
 * Session TTL constant test.
 */
import assert from "node:assert/strict";
import { WORKSHEET_PREVIEW_TTL_MS } from "../../lib/worksheets/worksheet-preview-session.client.js";

assert.equal(WORKSHEET_PREVIEW_TTL_MS, 2 * 60 * 60 * 1000);
console.log("writing-session-ttl.test.mjs OK");
