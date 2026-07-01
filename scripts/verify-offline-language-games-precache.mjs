#!/usr/bin/env node
/**
 * Verifies offline precache includes all webpack chunks required for
 * leo-word-train and leo-word-detective offline play.
 *
 * Requires: npm run build (generates offline-precache-generated.js)
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { EDUCATIONAL_GAME_KEYS } from "../lib/educational-games/educational-game-registry.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ID_PATH = path.join(ROOT, ".next", "BUILD_ID");
const PRECACHE_PATH = path.join(ROOT, "public", "student", "offline-precache-generated.js");

const LANGUAGE_GAME_KEYS = ["leo-word-train", "leo-word-detective"];

function loadProductionPageManifest(buildId) {
  const manifestPath = path.join(ROOT, ".next", "static", buildId, "_buildManifest.js");
  const sandbox = { self: {} };
  vm.runInNewContext(fs.readFileSync(manifestPath, "utf8"), sandbox);
  return sandbox.self.__BUILD_MANIFEST;
}

function loadPrecache() {
  const code = fs.readFileSync(PRECACHE_PATH, "utf8");
  const sandbox = { self: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.self.__STUDENT_OFFLINE_PRECACHE__;
}

function toChunkUrl(file) {
  return file.startsWith("static/") ? `/_next/${file}` : `/_next/static/${file}`;
}

const buildId = fs.readFileSync(BUILD_ID_PATH, "utf8").trim();
const manifest = loadProductionPageManifest(buildId);
const precache = loadPrecache();
const cached = new Set(precache.chunkUrls || []);

const requiredPages = [
  "/student/offline/educational/[gameKey]",
  "/student/offline/educational",
  ...LANGUAGE_GAME_KEYS.map((key) => `/student/educational-games/${key}`),
];

const requiredChunks = new Set();
for (const page of requiredPages) {
  for (const file of manifest[page] || []) {
    requiredChunks.add(toChunkUrl(file));
  }
}

const missing = [...requiredChunks].filter((url) => !cached.has(url));
const issues = [];

if (missing.length) {
  issues.push(`missing ${missing.length} required webpack chunks`);
}

for (const key of LANGUAGE_GAME_KEYS) {
  const nav = `/student/offline/educational/${key}`;
  if (precache.navUrls?.includes(nav) !== true) {
    issues.push(`missing nav URL ${nav}`);
  }
  const dataRoute = `/_next/data/${buildId}${nav}.json`;
  if (precache.dataUrls?.includes(dataRoute) !== true) {
    issues.push(`missing data URL ${dataRoute}`);
  }
  if (!EDUCATIONAL_GAME_KEYS.includes(key)) {
    issues.push(`${key} not in EDUCATIONAL_GAME_KEYS`);
  }
  const pageChunk = [...cached].find((u) => u.includes(`/educational-games/${key}-`));
  if (!pageChunk) {
    issues.push(`no precached page chunk for ${key}`);
  }
}

if (precache.buildId !== buildId) {
  issues.push(`precache buildId mismatch (${precache.buildId} vs ${buildId})`);
}

console.log(
  JSON.stringify(
    {
      ok: issues.length === 0,
      issues,
      buildId,
      precacheBuildId: precache.buildId,
      languageGameKeys: LANGUAGE_GAME_KEYS,
      requiredChunkCount: requiredChunks.size,
      precacheChunkCount: cached.size,
      missingChunks: missing.slice(0, 25),
      navUrlsPresent: LANGUAGE_GAME_KEYS.map((k) =>
        precache.navUrls?.includes(`/student/offline/educational/${k}`),
      ),
    },
    null,
    2,
  ),
);

process.exit(issues.length ? 1 : 0);
