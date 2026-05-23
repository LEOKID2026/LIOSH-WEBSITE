#!/usr/bin/env node
/**
 * Wave 1 non-ENV security selftests — no HTTP server, no Supabase writes.
 */
import assert from "node:assert/strict";

import {
  rejectIfProductionApi,
  isProductionRuntime,
} from "../../lib/security/production-guard.js";
import { guardDevOnlyApiRoute } from "../../lib/security/api-guards.js";
import {
  isSameOriginBrowserMutation,
  rejectIfCrossOriginCookieMutation,
} from "../../lib/security/same-origin.js";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
  _resetLoginRateLimitStateForTests,
} from "../../lib/security/login-rate-limit.js";
import {
  safeLogObject,
  isSensitiveLogKey,
  normalizeLogKey,
} from "../../lib/security/safe-log.js";
import {
  resolveParentStudentLimit,
  isQaSimulationParentEmail,
  QA_SIMULATION_PARENT_EMAIL,
  DEFAULT_PARENT_STUDENT_LIMIT,
  QA_SIMULATION_PARENT_STUDENT_LIMIT,
} from "../../lib/parent-server/parent-student-limit.server.js";

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    ended: false,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end() {
      this.ended = true;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function mockReq(method = "POST", headers = {}) {
  return { method, headers };
}

async function testProductionGuard() {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert.equal(isProductionRuntime(), true);
  const res = mockRes();
  assert.equal(rejectIfProductionApi(res), true);
  assert.equal(res.statusCode, 404);
  assert.equal(res.ended, true);
  process.env.NODE_ENV = prev;
}

function testDevRouteGuards() {
  const prev = process.env.NODE_ENV;

  process.env.NODE_ENV = "production";
  const prodRes = mockRes();
  assert.equal(guardDevOnlyApiRoute(mockReq(), prodRes), true);
  assert.equal(prodRes.statusCode, 404);

  process.env.NODE_ENV = "development";
  const devRes = mockRes();
  assert.equal(guardDevOnlyApiRoute(mockReq(), devRes), false);
  assert.equal(devRes.statusCode, 200);

  process.env.NODE_ENV = prev;
}

function testSameOrigin() {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  assert.equal(isSameOriginBrowserMutation(mockReq("POST", {})), true);

  process.env.NODE_ENV = "production";
  assert.equal(
    isSameOriginBrowserMutation(mockReq("POST", { host: "example.com", origin: "https://evil.test" })),
    false
  );
  assert.equal(
    isSameOriginBrowserMutation(
      mockReq("POST", { host: "example.com", origin: "https://example.com" })
    ),
    true
  );
  assert.equal(
    isSameOriginBrowserMutation(mockReq("GET", { host: "example.com", origin: "https://evil.test" })),
    true
  );

  const req = mockReq("POST", { host: "example.com", origin: "https://evil.test" });
  const res = mockRes();
  assert.equal(rejectIfCrossOriginCookieMutation(req, res), true);
  assert.equal(res.statusCode, 403);

  process.env.NODE_ENV = "development";
  assert.equal(rejectIfCrossOriginCookieMutation(req, mockRes()), false);

  process.env.NODE_ENV = prev;
}

function testLoginRateLimit() {
  _resetLoginRateLimitStateForTests();
  const req = {
    headers: { "x-forwarded-for": "203.0.113.10" },
    socket: { remoteAddress: "203.0.113.10" },
  };
  assert.equal(checkLoginRateLimit(req, "aaa1").allowed, true);
  for (let i = 0; i < 5; i += 1) recordLoginFailure(req, "aaa1");
  assert.equal(checkLoginRateLimit(req, "aaa1").allowed, false);
  recordLoginSuccess(req, "aaa1");
  assert.equal(checkLoginRateLimit(req, "aaa1").allowed, true);
  _resetLoginRateLimitStateForTests();
}

function testSafeLog() {
  assert.equal(normalizeLogKey("accessCode"), "access_code");
  assert.equal(isSensitiveLogKey("accessCode"), true);
  assert.equal(isSensitiveLogKey("sessionToken"), true);
  assert.equal(isSensitiveLogKey("serviceRoleKey"), true);
  assert.equal(isSensitiveLogKey("apiKey"), true);
  assert.equal(isSensitiveLogKey("studentId"), false);

  const redacted = safeLogObject({
    pin: "1234",
    accessCode: "abcd",
    sessionToken: "tok",
    apiKey: "key",
    studentId: "abc",
    nested: { password: "x", ok: true },
    list: [{ token: "t" }, { name: "ok" }],
    utterance: "hello",
    payload: { a: 1 },
  });
  assert.equal(redacted.pin, "[redacted]");
  assert.equal(redacted.accessCode, "[redacted]");
  assert.equal(redacted.sessionToken, "[redacted]");
  assert.equal(redacted.apiKey, "[redacted]");
  assert.equal(redacted.studentId, "abc");
  assert.equal(redacted.nested.password, "[redacted]");
  assert.equal(redacted.nested.ok, true);
  assert.equal(redacted.list[0].token, "[redacted]");
  assert.equal(redacted.list[1].name, "ok");
  assert.equal(redacted.utterance, "[redacted]");
  assert.equal(redacted.payload, "[redacted]");
}

function testParentStudentLimit() {
  assert.equal(resolveParentStudentLimit("parent@example.com"), DEFAULT_PARENT_STUDENT_LIMIT);
  assert.equal(resolveParentStudentLimit("ADMIN@ADMIN.COM"), QA_SIMULATION_PARENT_STUDENT_LIMIT);
  assert.equal(resolveParentStudentLimit("admin@admin.com"), QA_SIMULATION_PARENT_STUDENT_LIMIT);
  assert.equal(isQaSimulationParentEmail(QA_SIMULATION_PARENT_EMAIL), true);
  assert.equal(isQaSimulationParentEmail("other@example.com"), false);
}

function testOwnershipContractDoc() {
  const foreignUuid = "00000000-0000-4000-8000-000000000001";
  assert.match(foreignUuid, /^[0-9a-f-]{36}$/i);
}

async function main() {
  await testProductionGuard();
  testDevRouteGuards();
  testSameOrigin();
  testLoginRateLimit();
  testSafeLog();
  testParentStudentLimit();
  testOwnershipContractDoc();
  console.log("wave1-security-selftest: PASS");
}

main().catch((err) => {
  console.error("wave1-security-selftest: FAIL", err);
  process.exit(1);
});
