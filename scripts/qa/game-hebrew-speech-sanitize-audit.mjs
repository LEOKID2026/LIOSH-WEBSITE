#!/usr/bin/env node
/**
 * Verify educational game instruction strings lose emoji before TTS (shared sanitize path).
 * Run: node scripts/qa/game-hebrew-speech-sanitize-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHebrewSpeechText } from "../../lib/game-audio/sanitize-hebrew-speech-text.js";
import { customerRequestText } from "../../components/educational-games/leo-supermarket/leo-supermarket-data.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

function hasEmoji(text) {
  return /(?:\p{Regional_Indicator}{2})|(?:\p{Extended_Pictographic})/u.test(String(text || ""));
}

assert(
  read("lib/game-audio/game-audio-manager.js").includes("sanitizeHebrewSpeechText"),
  "game-audio-manager must sanitize Hebrew before TTS",
);

assert(
  !read("pages/learning/index.js").includes("GameAudioSettingsButton"),
  "/learning hub must not render GameAudioSettingsButton",
);

for (const master of [
  "LearningMasterDesktopHeader.jsx",
  "LearningMasterMobileNavTitle.jsx",
]) {
  assert(
    read(`components/learning/${master}`).includes("LearningMasterAudioButton"),
    `${master} must keep LearningMasterAudioButton`,
  );
}

const sampleCustomer = {
  items: [
    { name: "אורז", requestIcon: "🍚" },
    { name: "חלב", requestIcon: "🥛" },
  ],
};
const supermarketUi = customerRequestText(sampleCustomer);
assert(hasEmoji(supermarketUi), "supermarket UI text still includes emoji for display");
const supermarketSpeech = sanitizeHebrewSpeechText(supermarketUi);
assert(!hasEmoji(supermarketSpeech), "supermarket speech must not include emoji");
assert(supermarketSpeech === "אני רוצה אורז וחלב", `supermarket speech expected natural list, got: ${supermarketSpeech}`);

const pizzeriaSrc = read("components/educational-games/leo-pizzeria/leo-pizzeria-data.js");
const ticketMatch = pizzeriaSrc.match(/ticketLine: "([^"]+)"/);
assert(ticketMatch, "pizzeria ticketLine sample");
const pizzeriaSpeech = sanitizeHebrewSpeechText(ticketMatch[1]);
assert(!hasEmoji(pizzeriaSpeech), "pizzeria ticket speech must not include emoji");
assert(!/🧀|🍅|🫒/.test(pizzeriaSpeech), "pizzeria speech must not include topping emoji");

const EDU_GAME_FILES = [
  "components/educational-games/recycling-factory/RecyclingFactoryGame.jsx",
  "components/educational-games/leo-supermarket/LeoSupermarketGame.jsx",
  "components/educational-games/leo-lab/LeoLabGame.jsx",
  "components/educational-games/leo-gifts/LeoGiftsGame.jsx",
  "components/educational-games/leo-bakery/LeoBakeryGame.jsx",
  "components/educational-games/leo-number-path/LeoNumberPathGame.jsx",
  "components/educational-games/leo-pizzeria/LeoPizzeriaGame.jsx",
  "components/educational-games/leo-word-train/LeoWordTrainGame.jsx",
  "components/educational-games/leo-word-detective/LeoWordDetectiveGame.jsx",
];

for (const rel of EDU_GAME_FILES) {
  assert(read(rel).includes("useEducationalEngineAudio"), `${rel} must use shared edu audio hook`);
}

if (errors.length) {
  console.error("FAIL game-hebrew-speech-sanitize-audit");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}

console.log("OK game-hebrew-speech-sanitize-audit");
