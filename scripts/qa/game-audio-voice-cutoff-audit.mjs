#!/usr/bin/env node
/**
 * Static audit: voice-cutoff fixes + all 35 games wired to global audio.
 * Run: node scripts/qa/game-audio-voice-cutoff-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SOLO_GAMES = [
  "catcher",
  "flyer",
  "leo-jump",
  "balloons",
  "target-tap",
  "fruit-slice",
  "puzzle",
  "memory",
  "maze",
  "picture-puzzle",
  "sort-shapes",
  "smart-blocks",
];

const EDU_GAMES = [
  "recycling-factory",
  "leo-supermarket",
  "leo-lab",
  "leo-gifts",
  "leo-bakery",
  "leo-number-path",
  "leo-pizzeria",
  "leo-word-train",
  "leo-word-detective",
];

const OFFLINE_GAMES = ["tic-tac-toe", "rock-paper-scissors", "tap-battle", "memory-match"];

const LEARNING_MASTERS = [
  "math-master",
  "geometry-master",
  "english-master",
  "science-master",
  "history-master",
  "moledet-master",
  "geography-master",
  "hebrew-master",
  "moledet-geography-master",
];

const ALL_35 = [...SOLO_GAMES, "leo-miners", ...EDU_GAMES, ...OFFLINE_GAMES, ...LEARNING_MASTERS];

const errors = [];
const results = {};

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function fail(msg) {
  errors.push(msg);
}

function pass(game, note) {
  results[game] = note || "OK";
}

// --- Shared system checks ---
const eduHook = read("hooks/educational-games/useEducationalGameAudio.js");
if (/\[edu\]/s.test(eduHook)) {
  fail("useEducationalEngineAudio still depends on unstable [edu]");
}
if (!eduHook.includes("audioRef.current.stopVoice()")) {
  fail("useEducationalEngineAudio cleanup must use audioRef (unmount-only)");
}
if (!eduHook.includes("}, []);") || !eduHook.includes("maybeAutoInstructionRef")) {
  fail("useEducationalEngineAudio auto-play must use stable refs");
}

const provider = read("lib/game-audio/GameAudioProvider.jsx");
if (!provider.includes("stableActionsRef")) {
  fail("GameAudioProvider must expose stable action refs");
}

const manager = read("lib/game-audio/game-audio-manager.js");
if (/await el\.play\(\);\s*\n\s*finish\(\)/s.test(manager)) {
  fail("game-audio-manager stream path must not call finish() immediately after play()");
}
if (!/if \(payload\.stem\)/s.test(manager) || manager.indexOf("if (payload.stem)") > manager.indexOf("voice-question-english-phonics")) {
  // stem check must come before english-phonics browser-tts shortcut
  const stemIdx = manager.indexOf("if (payload.stem)");
  const phonicsIdx = manager.indexOf("voice-question-english-phonics");
  if (stemIdx === -1 || phonicsIdx === -1 || stemIdx > phonicsIdx) {
    fail("game-audio-manager must handle payload.stem before english-phonics browser-tts fallback");
  }
}

// --- Solo 12 ---
for (const key of SOLO_GAMES) {
  const engine = `components/solo-games/engines/Mleo${key.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")}Engine.jsx`;
  const alt = {
    catcher: "MleoCatcherEngine.jsx",
    flyer: "MleoFlyerEngine.jsx",
    "leo-jump": "MleoJumpEngine.jsx",
    balloons: "MleoBalloonsEngine.jsx",
    "target-tap": "MleoTargetTapEngine.jsx",
    "fruit-slice": "MleoFruitSliceEngine.jsx",
    puzzle: "MleoPuzzleEngine.jsx",
    memory: "MleoMemoryEngine.jsx",
    maze: "MleoMazeEngine.jsx",
    "picture-puzzle": "MleoPicturePuzzleEngine.jsx",
    "sort-shapes": "MleoSortShapesEngine.jsx",
    "smart-blocks": "MleoSmartBlocksEngine.jsx",
  }[key];
  const rel = `components/solo-games/engines/${alt}`;
  if (!exists(rel)) {
    fail(`missing solo engine: ${key} (${rel})`);
    continue;
  }
  const src = read(rel);
  if (!src.includes("useSoloEngineAudio")) fail(`${key}: engine must use useSoloEngineAudio`);
  if (src.includes("new Audio(")) fail(`${key}: legacy new Audio()`);
  pass(key, "Solo engine → useSoloEngineAudio, no legacy Audio");
}

const soloShell = read("components/solo-games/SoloGameShell.jsx");
if (!soloShell.includes("useSoloGameShellAudio")) fail("SoloGameShell missing useSoloGameShellAudio");
pass("solo-shell", "SoloGameShell → useSoloGameShellAudio");

// --- Leo Miners ---
const miners = read("components/leo-miners/LeoMinersGame.jsx");
if (!miners.includes("useGameAudio")) fail("leo-miners must use useGameAudio");
if (miners.includes("leo_miners_sfx_muted")) fail("leo-miners legacy mute keys");
pass("leo-miners", "useGameAudio, no legacy keys");

// --- Educational 9 ---
for (const key of EDU_GAMES) {
  const pascal = key
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  const gameRel = `components/educational-games/${key}/${pascal}Game.jsx`;
  if (!exists(gameRel)) {
    fail(`missing educational game: ${gameRel}`);
    continue;
  }
  const src = read(gameRel);
  if (!src.includes("useEducationalEngineAudio")) {
    fail(`${key}: must use useEducationalEngineAudio`);
  }
  pass(key, "useEducationalEngineAudio (TTS via shared hook)");
}

// --- Offline 4 ---
for (const key of OFFLINE_GAMES) {
  const page = `pages/offline/${key}.js`;
  if (!exists(page)) {
    fail(`missing offline page: ${page}`);
    continue;
  }
  const src = read(page);
  if (!src.includes("useGameAudio") && !src.includes("useSound")) {
    fail(`${key}: offline page must use global audio hook`);
  }
  pass(key, "offline page uses global audio");
}

// --- Learning masters 9 ---
for (const key of LEARNING_MASTERS) {
  const page = `pages/learning/${key}.js`;
  if (!exists(page)) {
    fail(`missing learning master: ${page}`);
    continue;
  }
  const src = read(page);
  const usesDirect = src.includes("useSound") || src.includes("useGameAudio");
  const usesSharedMaster = src.includes("moledet-geography-master");
  if (!usesDirect && !usesSharedMaster) {
    fail(`${key}: learning master must use useSound/useGameAudio or shared master page`);
  }
  if (key === "hebrew-master" && !src.includes("HebrewAudioBuild1Panel")) {
    fail("hebrew-master missing HebrewAudioBuild1Panel");
  }
  if (key === "english-master" && !src.includes("EnglishPhonicsAudioPanel")) {
    fail("english-master missing EnglishPhonicsAudioPanel");
  }
  pass(key, "learning master wired to global audio");
}

// --- Hebrew / English panels ---
for (const [file, needle] of [
  ["components/HebrewAudioBuild1Panel.js", "if (audio) return () => {};"],
  ["components/EnglishPhonicsAudioPanel.js", "if (audio) return () => {};"],
]) {
  const src = read(file);
  if (!src.includes(needle)) fail(`${file}: must skip local stem dispose when GameAudioProvider active`);
}

console.log(JSON.stringify({ total: ALL_35.length, games: results, errors }, null, 2));
console.log(`\nAudit: ${ALL_35.length} games checked, ${errors.length} errors`);
if (errors.length) {
  errors.forEach((e) => console.error("✗", e));
  process.exit(1);
}
console.log("OK — voice-cutoff audit passed");
