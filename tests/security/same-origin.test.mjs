import test from "node:test";
import assert from "node:assert/strict";
import {
  isSameOriginBrowserMutation,
  rejectIfCrossOriginCookieMutation,
} from "../../lib/security/same-origin.js";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

test.afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

/**
 * @param {{ method?: string, host?: string, headers?: Record<string, string> }} opts
 */
function mockReq(opts = {}) {
  return {
    method: opts.method ?? "POST",
    headers: {
      host: opts.host ?? "app.example.com",
      ...(opts.headers || {}),
    },
  };
}

function mockRes() {
  const state = { statusCode: null, body: null };
  return {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(body) {
      state.body = body;
      return this;
    },
    state,
  };
}

function runInProduction(fn) {
  process.env.NODE_ENV = "production";
  return fn();
}

test("A: Authorization Bearer bypasses cross_origin rejection (no Origin/Referer)", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.test" },
    });
    const rejected = rejectIfCrossOriginCookieMutation(req, res);
    assert.equal(rejected, false);
    assert.equal(res.state.statusCode, null);
    assert.equal(res.state.body, null);
  });
});

test("A: Bearer bypass is case-insensitive on scheme", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      headers: { authorization: "bearer token-value" },
    });
    assert.equal(rejectIfCrossOriginCookieMutation(req, res), false);
  });
});

test("B: cookie mutation without Origin/Referer is rejected in production", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({ headers: {} });
    const rejected = rejectIfCrossOriginCookieMutation(req, res);
    assert.equal(rejected, true);
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body?.code, "cross_origin");
  });
});

test("C: cookie mutation with cross-origin Origin is rejected", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      headers: { origin: "https://evil.example.net" },
    });
    const rejected = rejectIfCrossOriginCookieMutation(req, res);
    assert.equal(rejected, true);
    assert.equal(res.state.statusCode, 403);
    assert.equal(res.state.body?.code, "cross_origin");
  });
});

test("D: same-origin Origin allows cookie mutation", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      host: "app.example.com",
      headers: { origin: "https://app.example.com" },
    });
    assert.equal(isSameOriginBrowserMutation(req), true);
    assert.equal(rejectIfCrossOriginCookieMutation(req, res), false);
  });
});

test("D: same-origin Referer prefix allows cookie mutation", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      host: "127.0.0.1:3002",
      headers: { referer: "http://127.0.0.1:3002/student/activity/abc" },
    });
    assert.equal(isSameOriginBrowserMutation(req), true);
    assert.equal(rejectIfCrossOriginCookieMutation(req, res), false);
  });
});

test("E: Authorization Basic does not bypass cross_origin", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    const rejected = rejectIfCrossOriginCookieMutation(req, res);
    assert.equal(rejected, true);
    assert.equal(res.state.body?.code, "cross_origin");
  });
});

test("E: Authorization Token does not bypass cross_origin", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      headers: { authorization: "Token some-opaque-token" },
    });
    assert.equal(rejectIfCrossOriginCookieMutation(req, res), true);
  });
});

test("E: bare Authorization header without Bearer scheme does not bypass", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      headers: { authorization: "opaque-secret" },
    });
    assert.equal(rejectIfCrossOriginCookieMutation(req, res), true);
  });
});

test("E: Bearer without token does not bypass", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({
      headers: { authorization: "Bearer" },
    });
    assert.equal(rejectIfCrossOriginCookieMutation(req, res), true);
  });
});

test("non-mutating GET is allowed without Origin in production", () => {
  runInProduction(() => {
    const res = mockRes();
    const req = mockReq({ method: "GET", headers: {} });
    assert.equal(isSameOriginBrowserMutation(req), true);
    assert.equal(rejectIfCrossOriginCookieMutation(req, res), false);
  });
});

test("development mode allows cookie mutation without Origin (existing dev behavior)", () => {
  process.env.NODE_ENV = "development";
  const res = mockRes();
  const req = mockReq({ headers: {} });
  assert.equal(isSameOriginBrowserMutation(req), true);
  assert.equal(rejectIfCrossOriginCookieMutation(req, res), false);
});
