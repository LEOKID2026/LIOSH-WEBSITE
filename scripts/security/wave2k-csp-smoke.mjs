#!/usr/bin/env node
/**
 * Wave 2K focused CSP / API smoke — requires `next start` already running.
 * Usage: node scripts/security/wave2k-csp-smoke.mjs [baseUrl]
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:3010").replace(/\/$/, "");

const PAGE_PATHS = [
  "/",
  "/student/login",
  "/parent/login",
  "/parent/dashboard",
  "/learning",
  "/learning/math",
  "/gallery",
];

async function fetchJson(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function checkCspHeader(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const csp = res.headers.get("content-security-policy");
  const reportOnly = res.headers.get("content-security-policy-report-only");
  assert.ok(csp, `missing enforcing CSP on ${path}`);
  assert.ok(csp.includes("report-uri /api/security/csp-report"), `report-uri missing on ${path}`);
  assert.equal(reportOnly, null, `Report-Only still present on ${path}`);
  return csp;
}

async function browserCspViolations() {
  const browser = await chromium.launch({ headless: true });
  const violations = [];
  try {
    const page = await browser.newPage();
    page.on("console", (msg) => {
      const t = msg.text();
      if (/content security policy|csp/i.test(t)) {
        violations.push({ url: page.url(), text: t.slice(0, 500) });
      }
    });
    for (const p of PAGE_PATHS) {
      await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(400);
    }
  } finally {
    await browser.close();
  }
  return violations;
}

async function main() {
  console.log(`wave2k-csp-smoke: base=${BASE}`);

  await checkCspHeader("/");

  const { res: galleryRes, body: galleryBody } = await fetchJson("/api/gallery");
  assert.equal(galleryRes.status, 200);
  assert.ok(Array.isArray(galleryBody?.images));

  const { res: nakdanRes } = await fetchJson("/api/hebrew-nakdan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: [{ id: "smoke-1", text: "שלום" }] }),
  });
  assert.ok([200, 502].includes(nakdanRes.status), `nakdan unexpected ${nakdanRes.status}`);

  const { res: copilotRes } = await fetchJson("/api/parent/copilot-turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ utterance: "test", studentId: "11111111-1111-4111-8111-111111111111" }),
  });
  assert.ok(copilotRes.status >= 400 && copilotRes.status < 500, `copilot should reject unauth, got ${copilotRes.status}`);

  const { res: rootRes } = await fetch(`${BASE}/`, { redirect: "manual" });
  assert.ok(rootRes.status >= 200 && rootRes.status < 500, `GET / unexpected ${rootRes.status}`);

  const { res: cspReportRes } = await fetchJson("/api/security/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/csp-report" },
    body: JSON.stringify({
      "csp-report": {
        "violated-directive": "script-src",
        "blocked-uri": "inline",
        "document-uri": `${BASE}/`,
      },
    }),
  });
  assert.equal(cspReportRes.status, 204);

  const violations = await browserCspViolations();
  if (violations.length > 0) {
    console.error("CSP console violations:", JSON.stringify(violations, null, 2));
    process.exit(1);
  }

  console.log("wave2k-csp-smoke: PASS");
}

main().catch((err) => {
  console.error("wave2k-csp-smoke: FAIL", err);
  process.exit(1);
});
