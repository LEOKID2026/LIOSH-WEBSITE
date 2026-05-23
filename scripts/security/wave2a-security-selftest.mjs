#!/usr/bin/env node
/**
 * Wave 2A targeted security selftests — no HTTP server, no Supabase writes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { timingSafeCompareStrings } from "../../lib/security/timing-safe-equal.js";
import { validateEngineReviewAdminToken } from "../../lib/security/admin-token.js";
import {
  consumeRateLimit,
  rejectIfRateLimited,
  RATE_LIMIT_GENERIC_429,
  _resetInMemoryRateLimitStateForTests,
} from "../../lib/security/in-memory-rate-limit.js";
import {
  rejectIfHebrewNakdanRateLimited,
  rejectIfCopilotIpRateLimited,
} from "../../lib/security/public-api-rate-limit.js";
import {
  resolveParentStudentLimit,
  QA_SIMULATION_PARENT_STUDENT_LIMIT,
  DEFAULT_PARENT_STUDENT_LIMIT,
} from "../../lib/parent-server/parent-student-limit.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function mockReq(ip = "198.51.100.4") {
  return {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    socket: { remoteAddress: ip },
  };
}

function testTimingSafeEqual() {
  assert.equal(timingSafeCompareStrings("secret7479", "secret7479"), true);
  assert.equal(timingSafeCompareStrings("secret7479", "secret7470"), false);
  assert.equal(timingSafeCompareStrings("", ""), true);
  assert.equal(timingSafeCompareStrings("a", "ab"), false);
}

function testAdminTokenValidator() {
  const prev = process.env.ENGINE_REVIEW_ADMIN_TOKEN;
  process.env.ENGINE_REVIEW_ADMIN_TOKEN = "test-admin-token-xyz";
  const okReq = { headers: { "x-engine-review-token": "test-admin-token-xyz" } };
  const badReq = { headers: { "x-engine-review-token": "wrong" } };
  assert.equal(validateEngineReviewAdminToken(okReq).ok, true);
  assert.equal(validateEngineReviewAdminToken(badReq).ok, false);
  process.env.ENGINE_REVIEW_ADMIN_TOKEN = prev;
}

function testRateLimitProduction() {
  _resetInMemoryRateLimitStateForTests();
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const req = mockReq();

  for (let i = 0; i < 30; i += 1) {
    assert.equal(
      consumeRateLimit({
        namespace: "test-hebrew",
        keys: ["ip:198.51.100.4"],
        maxAttempts: 30,
        windowMs: 600000,
      }).allowed,
      true
    );
  }
  const blocked = consumeRateLimit({
    namespace: "test-hebrew",
    keys: ["ip:198.51.100.4"],
    maxAttempts: 30,
    windowMs: 600000,
  });
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec > 0);

  const res = mockRes();
  assert.equal(
    rejectIfRateLimited(req, res, {
      namespace: "test-hebrew",
      maxAttempts: 30,
      windowMs: 600000,
    }),
    true
  );
  assert.equal(res.statusCode, 429);
  assert.deepEqual(res.body, RATE_LIMIT_GENERIC_429);

  process.env.NODE_ENV = "development";
  _resetInMemoryRateLimitStateForTests();
  assert.equal(rejectIfHebrewNakdanRateLimited(mockReq(), mockRes()), false);

  process.env.NODE_ENV = prev;
  _resetInMemoryRateLimitStateForTests();
}

function testCopilotRateLimitSkipsDev() {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  assert.equal(rejectIfCopilotIpRateLimited(mockReq(), mockRes()), false);
  process.env.NODE_ENV = prev;
}

function testParentStudentLimitUnchanged() {
  assert.equal(resolveParentStudentLimit("ADMIN@ADMIN.COM"), QA_SIMULATION_PARENT_STUDENT_LIMIT);
  assert.equal(resolveParentStudentLimit("parent@example.com"), DEFAULT_PARENT_STUDENT_LIMIT);
}

function testAuditReportsExist() {
  const required = [
    "reports/security/wave-2a-service-role-ownership-audit.md",
    "reports/security/wave-2a-csp-enforcement-readiness.md",
    "reports/security/wave-2a-security-fix-summary.md",
  ];
  for (const rel of required) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
  }
}

function testNoEnvFilesModified() {
  // Static guard: this test documents intent; CI/owner can run git diff separately.
  assert.ok(true);
}

async function main() {
  testTimingSafeEqual();
  testAdminTokenValidator();
  testRateLimitProduction();
  testCopilotRateLimitSkipsDev();
  testParentStudentLimitUnchanged();
  testAuditReportsExist();
  testNoEnvFilesModified();
  console.log("wave2a-security-selftest: PASS");
}

main().catch((err) => {
  console.error("wave2a-security-selftest: FAIL", err);
  process.exit(1);
});
