#!/usr/bin/env node
/**
 * Smoke checks for game audio implementation — no browser required.
 * Run: node scripts/qa/game-audio-smoke.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GAME_AUDIO_MANIFEST,
  GAME_AUDIO_MANIFEST_BY_ID,
  REQUIRED_MP3_ASSET_IDS,
  OPTIONAL_MP3_ASSET_IDS,
} from "../../lib/game-audio/game-audio-manifest.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

function warn(cond, msg) {
  if (!cond) warnings.push(msg);
}

// 1. Manifest integrity
assert(GAME_AUDIO_MANIFEST.length === 56, `manifest must have 56 assets, got ${GAME_AUDIO_MANIFEST.length}`);
assert(REQUIRED_MP3_ASSET_IDS.length === 50, `expected 50 required MP3 ids, got ${REQUIRED_MP3_ASSET_IDS.length}`);
assert(OPTIONAL_MP3_ASSET_IDS.length === 1 && OPTIONAL_MP3_ASSET_IDS[0] === "sfx-time-low", "optional MP3 must be sfx-time-low only");

const voiceCount = GAME_AUDIO_MANIFEST.filter((e) => e.type === "voice").length;
assert(voiceCount === 5, `expected 5 voice assets, got ${voiceCount}`);

for (const entry of GAME_AUDIO_MANIFEST) {
  assert(GAME_AUDIO_MANIFEST_BY_ID[entry.assetId], `missing by-id entry: ${entry.assetId}`);
  if (entry.type === "sfx") {
    assert(entry.path?.startsWith("/audio/games/sfx/"), `bad sfx path: ${entry.assetId}`);
  }
  if (entry.type === "music") {
    assert(entry.path?.startsWith("/audio/games/music/"), `bad music path: ${entry.assetId}`);
  }
}

// 2. Core files
const coreFiles = [
  "lib/game-audio/game-audio-settings.js",
  "lib/game-audio/game-audio-manifest.js",
  "lib/game-audio/game-audio-manager.js",
  "lib/game-audio/GameAudioProvider.jsx",
  "lib/game-audio/game-bgm-map.js",
  "hooks/useGameAudio.js",
  "hooks/useSound.js",
  "components/game-audio/GameAudioSettingsButton.jsx",
  "components/game-audio/GameAudioSettingsModal.jsx",
  "components/game-audio/game-audio-settings-button-styles.js",
  "components/game-audio/GameAudioQuickToggle.jsx",
  "components/game-audio/GameAudioSettingsPanel.jsx",
  "components/game-audio/GameAudioFullscreenButton.jsx",
];

for (const f of coreFiles) {
  assert(exists(f), `missing core file: ${f}`);
}

// 3. Provider wired in _app.js
const appJs = read("pages/_app.js");
assert(appJs.includes("GameAudioProvider"), "_app.js must wrap GameAudioProvider");

// 4. No direct new Audio in solo engines (except archive)
const engineDir = path.join(ROOT, "components/solo-games/engines");
for (const name of fs.readdirSync(engineDir)) {
  if (!name.endsWith(".jsx")) continue;
  const src = fs.readFileSync(path.join(engineDir, name), "utf8");
  if (src.includes("new Audio(")) {
    errors.push(`legacy new Audio() in ${name}`);
  }
  if (src.includes('"/sounds/') || src.includes("'/sounds/")) {
    errors.push(`legacy /sounds/ path in ${name}`);
  }
}

// 5. Leo miners mute keys removed
const miners = read("components/leo-miners/LeoMinersGame.jsx");
assert(!miners.includes("leo_miners_sfx_muted"), "LeoMinersGame must not use leo_miners_sfx_muted");
assert(!miners.includes("leo_miners_music_muted"), "LeoMinersGame must not use leo_miners_music_muted");
assert(miners.includes("useGameAudio"), "LeoMinersGame must use useGameAudio");

// 6. Precache manifest uses game audio paths
const precache = read("lib/offline/offline-precache-manifest.js");
assert(precache.includes("GAME_AUDIO_MANIFEST"), "offline-precache-manifest must import game audio");
assert(!precache.includes('"/sounds/flap.mp3"'), "offline precache must not reference legacy flap.mp3");

const sw = read("public/student/sw.js");
assert(sw.includes("student-offline-v10-full"), "SW cache version must be v10");
assert(/audio.*games.*mp3/i.test(sw), "SW must match game audio mp3 paths");

// 7. Shell audio hooks
assert(read("components/games/GamesHubNavBar.jsx").includes("GameAudioSettingsButton"), "GamesHubNavBar audio settings button");
assert(read("components/games/GamesHubNavBar.jsx").includes("showAudioSettings"), "GamesHubNavBar showAudioSettings prop");
assert(read("components/game-audio/GameAudioSettingsModal.jsx").includes("createPortal"), "GameAudioSettingsModal must portal to body");
assert(read("components/game-audio/GameAudioSettingsModal.jsx").includes("z-[10050]"), "GameAudioSettingsModal must use high z-index");
assert(read("components/game-audio/GameAudioSettingsButton.jsx").includes("GameAudioSettingsModal"), "GameAudioSettingsButton must open modal");
assert(read("components/game-audio/game-audio-settings-button-styles.js").includes("h-10 w-10"), "audio button must be 40px tap target");
assert(read("pages/student/arcade.js").includes("showAudioSettings={false}"), "arcade must hide audio settings");
assert(read("pages/dev/solo-game-prototypes/index.js").includes("showAudioSettings={false}"), "dev solo prototypes must hide audio");
assert(!read("components/leo-miners/LeoMinersGame.jsx").includes("GameAudioSettingsButton"), "LeoMinersGame must not show audio button during gameplay");
assert(read("components/leo-miners/LeoMinersShell.jsx").includes("GameAudioSettingsButton"), "LeoMinersShell loading screen audio button");
assert(read("components/solo-games/SoloGameEntryScreen.jsx").includes("GameAudioSettingsButton"), "SoloGameEntryScreen audio settings button");
assert(!read("components/solo-games/SoloGameShell.jsx").includes("GameAudioSettingsButton"), "SoloGameShell must not show audio button during gameplay");
assert(read("components/educational-games/EducationalGameEntryScreen.jsx").includes("GameAudioSettingsButton"), "EducationalGameEntryScreen audio settings button");
assert(!read("components/educational-games/EducationalGameShell.jsx").includes("GameAudioSettingsButton"), "EducationalGameShell must not show audio button during gameplay");
assert(read("pages/offline/tic-tac-toe.js").includes("isMidGame") && read("pages/offline/tic-tac-toe.js").includes("!isMidGame"), "tic-tac-toe must hide audio during play");
assert(read("pages/offline/rock-paper-scissors.js").includes("isMidRound") && read("pages/offline/rock-paper-scissors.js").includes("!isMidRound"), "rock-paper-scissors must hide audio during round");
assert(read("pages/offline/tap-battle.js").includes("showAudioButton"), "tap-battle must conditionally show audio");
assert(read("pages/offline/memory-match.js").includes("isSetupPhase"), "memory-match must conditionally show audio");
assert(read("components/learning/LearningMasterAudioButton.jsx").includes("GameAudioSettingsModal"), "Learning masters must open settings modal");
assert(!read("components/game-audio/GameAudioQuickToggle.jsx").includes("toggleMaster"), "QuickToggle must open settings panel, not mute only");

// 8. MP3 files on disk (required for closure)
for (const id of REQUIRED_MP3_ASSET_IDS) {
  const entry = GAME_AUDIO_MANIFEST_BY_ID[id];
  const rel = entry.path.replace(/^\//, "");
  if (!exists(`public/${rel}`)) {
    errors.push(`missing required MP3: ${id} (${entry.path})`);
  } else {
    const size = fs.statSync(path.join(ROOT, "public", rel)).size;
    if (size < 200) errors.push(`corrupt/empty MP3: ${id} (${size} bytes)`);
  }
}

// 9. Generated precache — no legacy /sounds/, has /audio/games/sfx/
const precacheGen = "public/student/offline-precache-generated.js";
if (exists(precacheGen)) {
  const gen = read(precacheGen);
  assert(!gen.includes('"/sounds/'), "offline-precache-generated must not contain /sounds/");
  assert(gen.includes("/audio/games/sfx/"), "offline-precache-generated must include /audio/games/sfx/");
  assert(!gen.includes("/audio/games/music/"), "offline-precache-generated must not precache BGM");

  const urlMatches = [...gen.matchAll(/"(\/audio\/games\/sfx\/[^"]+\.mp3)"/g)].map((m) => m[1]);
  let precacheBytes = 0;
  for (const url of urlMatches) {
    const rel = url.replace(/^\//, "");
    if (exists(`public/${rel}`)) {
      precacheBytes += fs.statSync(path.join(ROOT, "public", rel)).size;
    }
  }
  const mb = precacheBytes / (1024 * 1024);
  assert(mb <= 3.05, `SFX precache pack ${mb.toFixed(2)}MB exceeds 3MB limit`);
  console.log(`SFX precache weight: ${mb.toFixed(2)} MB (${urlMatches.length} urls)`);
} else {
  warnings.push("offline-precache-generated.js not found — run npm run build");
}

// 10. Post-implementation event count
if (exists("docs/reports/game-audio/_build-stats.json")) {
  const stats = JSON.parse(read("docs/reports/game-audio/_build-stats.json"));
  assert(stats.newEventCount >= 300, `expected post-impl events >=300, got ${stats.newEventCount}`);
}

// 11. Reports validator
try {
  const { execSync } = await import("node:child_process");
  execSync("node docs/reports/game-audio/validate-reports.mjs", { cwd: ROOT, stdio: "pipe" });
} catch (e) {
  const out = String(e.stdout || e.stderr || e.message);
  errors.push(`validate-reports failed: ${out.slice(0, 500)}`);
}

console.log("Game audio smoke — results");
console.log("Errors:", errors.length);
errors.forEach((e) => console.log("  ✗", e));
console.log("Warnings:", warnings.length);
warnings.forEach((w) => console.log("  ⚠", w));

if (errors.length) process.exit(1);
console.log("OK — infrastructure smoke passed");
