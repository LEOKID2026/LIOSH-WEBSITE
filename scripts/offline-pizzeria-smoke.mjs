#!/usr/bin/env node
/**
 * Offline asset smoke test for leo-pizzeria chunks (airplane-style).
 * Requires: npm run build && npx next start -p 3099
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.OFFLINE_TEST_BASE || "http://127.0.0.1:3099";
const GAME = `${BASE}/student/offline/educational/leo-pizzeria`;

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

async function main() {
  const chunkUrls = loadRequiredChunkUrls();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${BASE}/student/offline/educational`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/student/sw.js", { scope: "/student/" });
    await new Promise((r) => setTimeout(r, 3000));
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.goto(GAME, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "התחל משחק" }).click();
  await page.waitForTimeout(2000);

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
  const hasErrorBoundary = (await page.getByText("אופס! משהו השתבש").count()) > 0;
  const hasSubmit = (await page.getByRole("button", { name: "הגש פיצה" }).count()) > 0;

  console.log(
    JSON.stringify(
      {
        ok: offlineFailed.length === 0 && !hasErrorBoundary && hasSubmit,
        offlineFailed,
        hasErrorBoundary,
        hasSubmit,
        onlineSample: onlineOk.slice(0, 3),
      },
      null,
      2,
    ),
  );

  await browser.close();
  if (offlineFailed.length || hasErrorBoundary || !hasSubmit) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }, null, 2));
  process.exit(1);
});
