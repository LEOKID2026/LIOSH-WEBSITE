#!/usr/bin/env node
import { chromium } from "playwright";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const BASE = `http://127.0.0.1:${process.argv[2] || 3012}`;

const { generateActivityQuestionSetClient } = await import(
  pathToFileURL(join(ROOT, "lib/classroom-activities/generate-activity-questions-client.js")).href
);

const res = await fetch(`${BASE}/api/student/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: BASE,
    Referer: `${BASE}/student/login`,
  },
  body: JSON.stringify({ username: "aaa1", pin: "1234" }),
});
const m = (res.headers.get("set-cookie") || "").match(/liosh_student_session=([^;]+)/);
const cv = decodeURIComponent(m[1]);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: "he-IL", serviceWorkers: "block" });
await ctx.addCookies([{ name: "liosh_student_session", value: cv, url: `${BASE}/` }]);
const page = await ctx.newPage();

const failed = [];
const consoleLogs = [];
page.on("console", (m) => consoleLogs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
page.on("pageerror", (e) => consoleLogs.push(`[pageerror] ${e.message.slice(0, 300)}`));
page.on("requestfailed", (r) => failed.push(`${r.failure()?.errorText} ${r.url().slice(0, 120)}`));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().includes("_next")) {
    failed.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`);
  }
});

await page.goto(`${BASE}/student/activity/00000000-0000-0000-0000-000000000001`, {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
await page.waitForTimeout(6000);

console.log("=== failed requests ===");
console.log(failed.slice(0, 20).join("\n") || "(none)");
console.log("=== console (last 25) ===");
console.log(consoleLogs.slice(-25).join("\n") || "(none)");
await browser.close();
