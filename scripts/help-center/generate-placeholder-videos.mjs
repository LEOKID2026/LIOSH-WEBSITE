#!/usr/bin/env node
/**
 * Demo scaffold ONLY — seeds qa-evidence-audit/help-center/videos/ from /help hub templates.
 * Output is NOT publishable and must not be shown to users (assetKind stays "placeholder").
 */
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { resolveBaseUrl } from "../virtual-student-qa/lib/config.mjs";
import {
  ASSET_KIND_PLACEHOLDER,
  PLACEHOLDER_PROVENANCE_FILE,
  hashFile,
} from "./video-asset-guards.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "videos-manifest.json");
const auditVideosRoot = join(root, "qa-evidence-audit", "help-center", "videos");
const templateDir = join(auditVideosRoot, "_templates");

function assertAllowedBaseUrl(baseUrl) {
  const host = new URL(baseUrl).hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")) {
    throw new Error(`Refusing: ${baseUrl}`);
  }
}

function auditPath(rel) {
  return join(root, "qa-evidence-audit", ...rel.split("/"));
}

async function recordTemplate(browser, baseUrl, vp) {
  const size = vp === "mobile" ? { width: 390, height: 844 } : { width: 1366, height: 900 };
  const recordDir = join(templateDir, vp, "_record");
  mkdirSync(recordDir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: size,
    recordVideo: { dir: recordDir, size },
    locale: "he-IL",
    ...(vp === "mobile" ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await ctx.newPage();
  await page.goto(new URL("/help", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2800);
  const poster = join(templateDir, vp, "poster.jpg");
  await page.screenshot({ path: poster, type: "jpeg", quality: 82 });
  await ctx.close();
  const webmName = readdirSync(recordDir).find((f) => f.endsWith(".webm"));
  if (!webmName) throw new Error(`no template webm for ${vp}`);
  const webmOut = join(templateDir, vp, "main.webm");
  copyFileSync(join(recordDir, webmName), webmOut);
  return { webm: webmOut, poster };
}

async function main() {
  const baseUrl = resolveBaseUrl(process.argv.find((a) => a.startsWith("--base-url="))?.slice(11));
  assertAllowedBaseUrl(baseUrl);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.assetKindDefault = ASSET_KIND_PLACEHOLDER;
  manifest.publishPolicy = {
    allowPlaceholderInPublic: false,
    note: "Placeholder bytes must never be published to public/ or shown in Help Center UI.",
  };

  const browser = await chromium.launch({ headless: true });
  const templates = {};
  for (const vp of ["desktop", "mobile"]) {
    templates[vp] = await recordTemplate(browser, baseUrl, vp);
  }
  await browser.close();

  const provenance = {
    source: "help:placeholders-videos",
    recordedAt: new Date().toISOString(),
    baseUrl,
    route: "/help",
    warning:
      "Demo scaffold only — not article-specific captures. Do not publish or mark internalReview passed.",
    templates: {
      desktop: {
        webmSha256: hashFile(templates.desktop.webm),
        posterSha256: hashFile(templates.desktop.poster),
      },
      mobile: {
        webmSha256: hashFile(templates.mobile.webm),
        posterSha256: hashFile(templates.mobile.poster),
      },
    },
  };
  writeFileSync(
    join(auditVideosRoot, PLACEHOLDER_PROVENANCE_FILE),
    `${JSON.stringify(provenance, null, 2)}\n`,
    "utf8"
  );

  let copied = 0;
  for (const rel of manifest.publicPaths || []) {
    const vp = rel.includes("/mobile/") ? "mobile" : "desktop";
    const kind = rel.endsWith(".webm") ? "webm" : "poster";
    const src = templates[vp][kind];
    const dest = auditPath(rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    copied++;
  }

  for (const entry of manifest.videos) {
    entry.assetKind = ASSET_KIND_PLACEHOLDER;
    entry.internalReview = {
      desktop: {
        status: "excluded",
        reason: "placeholder scaffold — not a real article capture",
      },
      mobile: {
        status: "excluded",
        reason: "placeholder scaffold — not a real article capture",
      },
    };
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    `Seeded ${copied} placeholder file(s) in qa-evidence-audit only (NOT publishable). ` +
      `Manifest assetKind=placeholder; provenance written.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
