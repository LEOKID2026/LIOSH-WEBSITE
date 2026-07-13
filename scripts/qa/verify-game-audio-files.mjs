#!/usr/bin/env node
/**
 * Verify owner MP3 pack against game-audio-manifest.
 * Run: node scripts/qa/verify-game-audio-files.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GAME_AUDIO_MANIFEST_BY_ID,
  REQUIRED_MP3_ASSET_IDS,
  OPTIONAL_MP3_ASSET_IDS,
} from "../../lib/game-audio/game-audio-manifest.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIN_BYTES = 200;

function publicPath(urlPath) {
  return path.join(ROOT, "public", urlPath.replace(/^\//, ""));
}

const missing = [];
const corrupt = [];
const extra = new Set();
const sfxDir = path.join(ROOT, "public/audio/games/sfx");
const musicDir = path.join(ROOT, "public/audio/games/music");

for (const id of REQUIRED_MP3_ASSET_IDS) {
  const url = GAME_AUDIO_MANIFEST_BY_ID[id].path;
  const abs = publicPath(url);
  if (!fs.existsSync(abs)) {
    missing.push({ id, url });
    continue;
  }
  const size = fs.statSync(abs).size;
  if (size < MIN_BYTES) corrupt.push({ id, url, size });
}

for (const dir of [sfxDir, musicDir]) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".mp3")) continue;
    const id = name.replace(/\.mp3$/, "");
    const rel = dir.includes(`${path.sep}music${path.sep}`)
      ? `/audio/games/music/${name}`
      : `/audio/games/sfx/${name}`;
    if (!REQUIRED_MP3_ASSET_IDS.includes(id) && !OPTIONAL_MP3_ASSET_IDS.includes(id)) {
      extra.add(rel);
    }
    const size = fs.statSync(path.join(dir, name)).size;
    if (
      (REQUIRED_MP3_ASSET_IDS.includes(id) || OPTIONAL_MP3_ASSET_IDS.includes(id)) &&
      size < MIN_BYTES &&
      !corrupt.find((c) => c.id === id)
    ) {
      corrupt.push({ id, url: rel, size });
    }
  }
}

const sfxCount = fs.existsSync(sfxDir)
  ? fs.readdirSync(sfxDir).filter((n) => n.endsWith(".mp3")).length
  : 0;
const musicCount = fs.existsSync(musicDir)
  ? fs.readdirSync(musicDir).filter((n) => n.endsWith(".mp3")).length
  : 0;

const report = {
  verified_at: new Date().toISOString(),
  sfx_on_disk: sfxCount,
  music_on_disk: musicCount,
  total_mp3: sfxCount + musicCount,
  required_expected: REQUIRED_MP3_ASSET_IDS.length,
  missing,
  corrupt,
  extra_unexpected: [...extra],
  passed: missing.length === 0 && corrupt.length === 0,
};

fs.mkdirSync(path.join(ROOT, "docs/reports/game-audio"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "docs/reports/game-audio/audio-files-verify.json"),
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
