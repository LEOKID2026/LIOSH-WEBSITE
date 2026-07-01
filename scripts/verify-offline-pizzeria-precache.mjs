#!/usr/bin/env node
/**
 * Verifies offline precache includes all webpack chunks required for leo-pizzeria offline play.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { EDUCATIONAL_GAME_KEYS } from "../lib/educational-games/educational-game-registry.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ID_PATH = path.join(ROOT, ".next", "BUILD_ID");
const PRECACHE_PATH = path.join(ROOT, "public", "student", "offline-precache-generated.js");

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
  "/student/educational-games/leo-pizzeria",
];

const requiredChunks = new Set();
for (const page of requiredPages) {
  for (const file of manifest[page] || []) {
    requiredChunks.add(toChunkUrl(file));
  }
}

const missing = [...requiredChunks].filter((url) => !cached.has(url));
const hasPizzeriaGameChunk = [...cached].some(
  (url) => url.includes("355-") || url.includes("LeoPizzeria"),
);

const issues = [];
if (missing.length) issues.push(`missing ${missing.length} required chunks`);
if (!cached.has(`/_next/static/chunks/355-`)) {
  const chunk355 = [...requiredChunks].find((u) => u.includes("/355-"));
  if (chunk355 && !cached.has(chunk355)) issues.push(`missing pizzeria shared chunk ${chunk355}`);
}
if (precache.navUrls?.includes("/student/offline/educational/leo-pizzeria") !== true) {
  issues.push("missing leo-pizzeria nav URL");
}
if (!EDUCATIONAL_GAME_KEYS.includes("leo-pizzeria")) {
  issues.push("leo-pizzeria not in EDUCATIONAL_GAME_KEYS");
}

console.log(
  JSON.stringify(
    {
      ok: issues.length === 0,
      issues,
      buildId,
      precacheBuildId: precache.buildId,
      requiredChunkCount: requiredChunks.size,
      precacheChunkCount: cached.size,
      missingChunks: missing.slice(0, 20),
      has355InRequired: [...requiredChunks].some((u) => u.includes("/355-")),
      sampleRequired: [...requiredChunks].slice(0, 8),
    },
    null,
    2,
  ),
);

process.exit(issues.length ? 1 : 0);
