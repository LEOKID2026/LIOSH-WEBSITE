#!/usr/bin/env node
import { chromium } from "playwright";

const BASE = `http://127.0.0.1:${process.argv[2] || 3012}`;

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
const errs = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));

await page.goto(`${BASE}/learning/history-master?topic=what_is_history`, {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
await page.waitForTimeout(8000);
const mcq = await page.locator('[data-testid="science-mcq-0"]').count();
const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 150);
console.log("mcq=", mcq, "text=", text, "errors=", errs.join("|") || "none");
await browser.close();
