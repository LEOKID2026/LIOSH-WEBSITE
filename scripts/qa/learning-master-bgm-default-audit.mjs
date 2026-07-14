#!/usr/bin/env node
/**
 * Verify Learning Master BGM uses scoped default (off) without changing global settings.
 * Run: node scripts/qa/learning-master-bgm-default-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEARNING_MASTER_MUSIC_SETTINGS_KEY,
  loadLearningMasterMusicEnabled,
} from "../../lib/game-audio/learning-master-music-settings.js";
import { DEFAULT_SETTINGS } from "../../lib/game-audio/game-audio-settings.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const MASTER_PAGES = [
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/english-master.js",
  "pages/learning/science-master.js",
  "pages/learning/history-master.js",
  "pages/learning/moledet-master.js",
  "pages/learning/geography-master.js",
  "pages/learning/hebrew-master.js",
  "pages/learning/moledet-geography-master.js",
];

assert(
  DEFAULT_SETTINGS.musicEnabled === true,
  "global DEFAULT_SETTINGS.musicEnabled must remain true",
);

assert(
  loadLearningMasterMusicEnabled() === false,
  "scoped learning master music default must be false",
);

assert(
  LEARNING_MASTER_MUSIC_SETTINGS_KEY === "leokids_learning_master_music_v1",
  "scoped storage key must be leokids_learning_master_music_v1",
);

const sessionSrc = read("lib/game-audio/learning-master-session-audio.js");
assert(
  sessionSrc.includes("loadLearningMasterMusicEnabled()") &&
    sessionSrc.includes("learningMasterScoped: true"),
  "session audio must gate BGM on scoped preference",
);

const managerSrc = read("lib/game-audio/game-audio-manager.js");
assert(
  managerSrc.includes("learningMasterScoped") &&
    managerSrc.includes("learningMasterMusicActive"),
  "game-audio-manager must support learning-master scoped BGM",
);

for (const rel of MASTER_PAGES) {
  const src = read(rel);
  if (rel.endsWith("moledet-master.js") || rel.endsWith("geography-master.js")) {
    assert(
      src.includes("MoledetGeographyMasterPage"),
      `${rel} must delegate to shared moledet-geography master`,
    );
    continue;
  }
  assert(
    src.includes("startLearningMasterSessionAudio"),
    `${rel} must use startLearningMasterSessionAudio`,
  );
  assert(
    !src.includes('playMusic("bgm-learning-focus")'),
    `${rel} must not auto-start BGM directly`,
  );
}

assert(
  read("components/learning/LearningMasterAudioButton.jsx").includes('musicScope="learning-master"'),
  "LearningMasterAudioButton must open scoped settings modal",
);

assert(
  read("hooks/educational-games/useEducationalGameAudio.js").includes("playMusic"),
  "educational games must still start BGM via shared hook",
);

assert(
  read("hooks/solo-games/useSoloGameAudio.js").includes("playMusic"),
  "solo games must still start BGM",
);

if (errors.length) {
  console.error("FAIL learning-master-bgm-default-audit");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}

console.log("OK learning-master-bgm-default-audit");
