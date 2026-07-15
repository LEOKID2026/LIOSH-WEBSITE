/**
 * Public worksheets rate limits — wiring and production enforcement.
 * Run: node --test tests/worksheets/public-worksheets-rate-limit.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  rejectIfPublicWorksheetsCatalogRateLimited,
  rejectIfPublicWorksheetsGenerateRateLimited,
} from "../../lib/security/public-api-rate-limit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function mockReq(ip = "test-rate-limit-ip") {
  return { headers: {}, socket: { remoteAddress: ip } };
}

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  return res;
}

describe("public-worksheets-rate-limit", () => {
  test("rate limit functions wired in public API handlers", () => {
    const pairs = [
      ["pages/api/public/worksheets/catalog.js", "rejectIfPublicWorksheetsCatalogRateLimited"],
      ["pages/api/public/worksheets/generate.js", "rejectIfPublicWorksheetsGenerateRateLimited"],
      ["pages/api/public/worksheets/answer-key.js", "rejectIfPublicWorksheetsAnswerKeyRateLimited"],
      ["pages/api/public/worksheets/ready/[slug].js", "rejectIfPublicWorksheetsReadyRateLimited"],
    ];
    for (const [rel, fn] of pairs) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      assert.match(src, new RegExp(fn));
    }
  });

  test("generate rate limit blocks after 15 attempts in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const req = mockReq(`gen-limit-${Date.now()}`);
      const res = mockRes();
      for (let i = 0; i < 15; i++) {
        assert.equal(rejectIfPublicWorksheetsGenerateRateLimited(req, mockRes()), false, `attempt ${i}`);
      }
      const blocked = rejectIfPublicWorksheetsGenerateRateLimited(req, res);
      assert.equal(blocked, true);
      assert.equal(res.statusCode, 429);
      assert.equal(res.body?.error, "Too many requests");
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  test("catalog rate limit allows under threshold in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const req = mockReq(`cat-limit-${Date.now()}`);
      assert.equal(rejectIfPublicWorksheetsCatalogRateLimited(req, mockRes()), false);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
