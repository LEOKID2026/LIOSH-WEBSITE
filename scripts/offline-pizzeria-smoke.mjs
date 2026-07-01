#!/usr/bin/env node
/**
 * Offline smoke test for leo-pizzeria (production local).
 *
 * Requires:
 *   npm run build
 *   npx next start -p 3099
 *
 * Optional:
 *   OFFLINE_TEST_BASE=http://127.0.0.1:3099
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.OFFLINE_TEST_BASE || "http://127.0.0.1:3099";
const HUB = `${BASE}/student/offline/educational`;
const GAME = `${BASE}/student/offline/educational/leo-pizzeria`;
const ERROR_TEXT = "אופס! משהו השתבש";

function loadRequiredChunkUrls() {
  const buildId = fs.readFileSync(path.join(ROOT, ".next", "BUILD_ID"), "utf8").trim();
  const sandbox = { self: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, ".next", "static", buildId, "_buildManifest.js"), "utf8"),
    sandbox,
  );
  const files = sandbox.self.__BUILD_MANIFEST["/student/offline/educational/[gameKey]"] || [];
  return files.map((f) => (f.startsWith("static/") ? `/_next/${f}` : `/_next/static/${f}`));
}

async function registerServiceWorker(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/student/sw.js", { scope: "/student/" });
    await new Promise((r) => setTimeout(r, 3000));
  });
}

async function dismissPortraitModalIfVisible(page) {
  const btn = page.getByRole("button", { name: "המשך בכל זאת" });
  if ((await btn.count()) > 0) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function serveFirstEasyPizza(page) {
  await page.getByRole("button", { name: "גבינה" }).click();
  for (let i = 1; i <= 4; i += 1) {
    await page.getByRole("button", { name: new RegExp(`^חלק ${i}`) }).click();
  }
  await page.getByRole("button", { name: /הגש פיצה/ }).click();
  await page.waitForTimeout(1500);
}

async function main() {
  const chunkUrls = loadRequiredChunkUrls();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(HUB, { waitUntil: "networkidle", timeout: 60_000 });
  const hubTitle = await page.locator("h1, h2").first().textContent();
  if (!hubTitle || hubTitle.includes("404")) {
    throw new Error("offline educational hub did not load");
  }

  await registerServiceWorker(page);
  await page.reload({ waitUntil: "networkidle", timeout: 60_000 });

  await page.goto(GAME, { waitUntil: "networkidle", timeout: 60_000 });
  if ((await page.getByText(ERROR_TEXT).count()) > 0) {
    throw new Error("error boundary on game entry");
  }

  await page.getByRole("button", { name: "קל" }).click();
  await page.getByRole("button", { name: "התחל משחק" }).click({ timeout: 30_000 });
  await dismissPortraitModalIfVisible(page);

  await page.getByRole("button", { name: /הגש פיצה/ }).waitFor({ timeout: 30_000 });
  await serveFirstEasyPizza(page);

  const hasErrorBoundary = (await page.getByText(ERROR_TEXT).count()) > 0;
  const progressAfterSubmit =
    (await page.getByText(/לקוח\s*2/).count()) > 0 ||
    (await page.getByText(/2\s*מתוך\s*20/).count()) > 0 ||
    (await page.getByText(/נכון|מעולה|כל הכבוד|יופי/i).count()) > 0;

  const onlineOk = await page.evaluate(async (urls) => {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          return { url, ok: res.ok, status: res.status };
        } catch (err) {
          return { url, ok: false, error: String(err) };
        }
      }),
    );
    return results;
  }, chunkUrls);

  await page.context().setOffline(true);

  const offlineResults = await page.evaluate(async (urls) => {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url);
          return { url, ok: res.ok, status: res.status };
        } catch (err) {
          return { url, ok: false, error: String(err) };
        }
      }),
    );
    return results;
  }, chunkUrls);

  const offlineFailed = offlineResults.filter((r) => !r.ok);
  const ok =
    offlineFailed.length === 0 &&
    !hasErrorBoundary &&
    progressAfterSubmit &&
    onlineOk.every((r) => r.ok);

  console.log(
    JSON.stringify(
      {
        ok,
        hubLoaded: Boolean(hubTitle),
        difficultySelected: true,
        startedGame: true,
        submittedPizza: progressAfterSubmit,
        offlineFailed,
        hasErrorBoundary,
        onlineSample: onlineOk.slice(0, 3),
      },
      null,
      2,
    ),
  );

  await browser.close();
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }, null, 2));
  process.exit(1);
});
