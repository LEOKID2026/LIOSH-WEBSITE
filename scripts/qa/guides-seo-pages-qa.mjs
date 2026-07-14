#!/usr/bin/env node
/**
 * Guides SEO pages QA — /guides/*
 * Run: node scripts/qa/guides-seo-pages-qa.mjs
 */
import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GUIDE_PUBLIC_PATHS,
  checkPage,
  checkSitemap,
  checkGuide11,
  createQaContext,
  makeResultTracker,
  writeResults,
} from "./seo-public-pages-qa-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const BASE = (process.env.SEO_QA_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT_DIR = join(ROOT, "docs", "qa", "_artifacts", "guides-seo-pages-qa");

async function main() {
  const tracker = makeResultTracker();
  console.log(`Guides SEO QA base: ${BASE}\n`);

  console.log("Sitemap:");
  checkSitemap(ROOT, GUIDE_PUBLIC_PATHS, tracker);

  let browser;
  try {
    const ctx = await createQaContext(chromium);
    browser = ctx.browser;
    const { page } = ctx;

    console.log("\nPages:");
    for (const path of GUIDE_PUBLIC_PATHS) {
      await checkPage(page, path, BASE, tracker);
    }

    console.log("\nGuide #11:");
    await checkGuide11(page, BASE, tracker);
  } catch (e) {
    tracker.fail("qa-runner", e.message);
  } finally {
    if (browser) await browser.close();
  }

  const summary = writeResults(OUT_DIR, BASE, tracker, "guides");
  console.log(`\nDone: ${summary.pass} pass, ${summary.fail} fail, ${summary.skip} skip`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main();
