#!/usr/bin/env node
/**
 * After `next build`, emits public/student/offline-precache-generated.js for the student SW.
 * Includes Next.js static chunks, navigation URLs, _next/data JSON routes, and asset URLs.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { EDUCATIONAL_GAME_KEYS } from "../lib/educational-games/educational-game-registry.js";
import {
  OFFLINE_FULL_PRECACHE_ASSET_URLS,
  OFFLINE_FULL_PRECACHE_NAV_URLS,
} from "../lib/offline/offline-precache-manifest.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_MANIFEST_PATH = path.join(ROOT, ".next", "build-manifest.json");
const BUILD_ID_PATH = path.join(ROOT, ".next", "BUILD_ID");
const OUT_PATH = path.join(ROOT, "public", "student", "offline-precache-generated.js");

const OFFLINE_BUILD_PAGES = [
  "/student/offline",
  "/student/offline/tic-tac-toe",
  "/student/offline/rock-paper-scissors",
  "/student/offline/tap-battle",
  "/student/offline/memory-match",
  "/student/offline/solo",
  "/student/offline/educational",
  "/student/offline/solo/[gameKey]",
  "/student/offline/educational/[gameKey]",
  ...EDUCATIONAL_GAME_KEYS.map((key) => `/student/educational-games/${key}`),
];

/** @param {string} pagePath @param {Record<string, string[]>} pages */
function chunksForPage(pagePath, pages) {
  return pages[pagePath] || [];
}

function readBuildId(buildManifest) {
  if (fs.existsSync(BUILD_ID_PATH)) {
    return fs.readFileSync(BUILD_ID_PATH, "utf8").trim();
  }
  const lowPriority = buildManifest.lowPriorityFiles || [];
  const manifestFile = lowPriority.find((f) => f.includes("_buildManifest.js"));
  if (!manifestFile) return null;
  const match = manifestFile.match(/static\/([^/]+)\/_buildManifest\.js/);
  return match ? match[1] : null;
}

/** Load Next production page→chunks map (includes shared async chunks). */
function loadProductionPageManifest(buildId) {
  if (!buildId) return null;
  const manifestPath = path.join(ROOT, ".next", "static", buildId, "_buildManifest.js");
  if (!fs.existsSync(manifestPath)) return null;

  const sandbox = { self: {} };
  const code = fs.readFileSync(manifestPath, "utf8");
  vm.runInNewContext(code, sandbox);
  const manifest = sandbox.self.__BUILD_MANIFEST;
  if (!manifest || typeof manifest !== "object") return null;

  /** @type {Record<string, string[]>} */
  const pages = {};
  for (const [pagePath, files] of Object.entries(manifest)) {
    if (!Array.isArray(files)) continue;
    pages[pagePath] = files;
  }
  return pages;
}

/** @param {string} navUrl @param {string} buildId */
function dataRouteForNavUrl(navUrl, buildId) {
  if (!buildId) return null;
  const suffix = navUrl === "/" ? "/index" : navUrl;
  return `/_next/data/${buildId}${suffix}.json`;
}

function main() {
  if (!fs.existsSync(BUILD_MANIFEST_PATH)) {
    console.warn(
      "[generate-student-offline-precache] .next/build-manifest.json missing — writing empty stub.",
    );
    writeOutput({
      generatedAt: new Date().toISOString(),
      buildId: null,
      chunkUrls: [],
      navUrls: [...OFFLINE_FULL_PRECACHE_NAV_URLS],
      dataUrls: [],
      assetUrls: [...OFFLINE_FULL_PRECACHE_ASSET_URLS],
    });
    return;
  }

  const buildManifest = JSON.parse(fs.readFileSync(BUILD_MANIFEST_PATH, "utf8"));
  const rootPages = buildManifest.pages || {};
  const buildId = readBuildId(buildManifest);
  const productionPages = loadProductionPageManifest(buildId);
  const pages = productionPages || rootPages;

  if (!productionPages) {
    console.warn(
      "[generate-student-offline-precache] Production _buildManifest.js missing — " +
        "using .next/build-manifest.json (may omit shared chunks).",
    );
  }

  const chunkSet = new Set();
  const toChunkUrl = (file) => (file.startsWith("static/") ? `/_next/${file}` : `/_next/static/${file}`);

  for (const file of buildManifest.polyfillFiles || []) {
    chunkSet.add(toChunkUrl(file));
  }
  for (const file of buildManifest.lowPriorityFiles || []) {
    chunkSet.add(toChunkUrl(file));
  }
  for (const pagePath of OFFLINE_BUILD_PAGES) {
    for (const file of chunksForPage(pagePath, pages)) {
      chunkSet.add(toChunkUrl(file));
    }
  }
  for (const file of chunksForPage("/_app", pages)) {
    chunkSet.add(toChunkUrl(file));
  }
  for (const file of chunksForPage("/_app", rootPages)) {
    chunkSet.add(toChunkUrl(file));
  }

  // Also include percent-encoded variants for dynamic-route chunks ([gameKey] → %5BgameKey%5D).
  // Browsers request these with encoded brackets; cache.match() requires exact URL match.
  const chunkArray = [...chunkSet].sort();
  const encodedVariants = chunkArray
    .filter((c) => c.includes("["))
    .map((c) => c.replace(/\[/g, "%5B").replace(/\]/g, "%5D"));

  const navUrls = [...OFFLINE_FULL_PRECACHE_NAV_URLS];
  const dataUrls = navUrls
    .map((url) => dataRouteForNavUrl(url, buildId))
    .filter(Boolean);

  writeOutput({
    generatedAt: new Date().toISOString(),
    buildId,
    chunkUrls: [...chunkArray, ...encodedVariants],
    navUrls,
    dataUrls,
    assetUrls: [...OFFLINE_FULL_PRECACHE_ASSET_URLS],
  });

  console.log(
    `[generate-student-offline-precache] Wrote ${path.relative(ROOT, OUT_PATH)} ` +
      `(${chunkSet.size} chunks, ${navUrls.length} nav, ${dataUrls.length} data, ` +
      `${OFFLINE_FULL_PRECACHE_ASSET_URLS.length} assets, buildId=${buildId || "?"})`,
  );
}

/** @param {object} payload */
function writeOutput(payload) {
  const body = `// Auto-generated by scripts/generate-student-offline-precache.mjs — do not edit.
self.__STUDENT_OFFLINE_PRECACHE__ = ${JSON.stringify(payload, null, 2)};
`;
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, body, "utf8");
}

main();
