#!/usr/bin/env node
/**
 * Contract audit: game-audio-manager ↔ POST /api/hebrew-audio-ensure
 * Run: node scripts/qa/game-hebrew-audio-ensure-contract-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

/** Mirrors pages/api/hebrew-audio-ensure.js validation */
function validateEnsureBody(body) {
  const text = String(body?.text ?? body?.narration_plaintext ?? "").trim();
  if (!text || text.length > 2200) {
    return { ok: false, status: 400, error: "invalid_text" };
  }
  return { ok: true, status: 200 };
}

const manager = read("lib/game-audio/game-audio-manager.js");
const api = read("pages/api/hebrew-audio-ensure.js");

assert(
  manager.includes('JSON.stringify({ text: narration_plaintext })'),
  "game-audio-manager must POST { text } to hebrew-audio-ensure",
);
assert(
  !manager.match(/hebrew-audio-ensure[\s\S]{0,120}narration_plaintext\s*\}/),
  "game-audio-manager must not POST { narration_plaintext } alone",
);
assert(
  manager.includes("pickHebrewTtsVoice(voices, lang)"),
  "playBrowserTts must pass synth.getVoices() to pickHebrewTtsVoice",
);
assert(
  !manager.includes("pickHebrewTtsVoice(synth)"),
  "playBrowserTts must not pass speechSynthesis object as voices array",
);
assert(
  manager.includes("hebrew_voice_unavailable"),
  "Hebrew browser TTS must fail when no he-* voice exists",
);
assert(
  manager.includes("do not fall back to English"),
  "playVoice must document/skip English fallback for Hebrew",
);

assert(
  api.includes("req.body?.text ?? req.body?.narration_plaintext"),
  "API must accept text (and legacy narration_plaintext alias)",
);

const sampleHe = "מיינו כל פריט לפח הנכון — שמרו על הסביבה!";
const badMissing = validateEnsureBody({});
const badLegacyOnly = validateEnsureBody({ narration_plaintext: sampleHe });
const goodText = validateEnsureBody({ text: sampleHe });
const goodLegacy = validateEnsureBody({ narration_plaintext: sampleHe });

assert(badMissing.ok === false && badMissing.error === "invalid_text", "empty body must 400 invalid_text");
assert(goodText.ok === true, "Hebrew payload with text must pass validation");
assert(goodLegacy.ok === true, "Hebrew payload with narration_plaintext alias must pass validation");

console.log("Hebrew audio ensure contract audit");
console.log("  sample validation (text):", goodText);
console.log("  sample validation (legacy alias):", goodLegacy);
console.log("  missing text:", badMissing);
console.log("");
console.log("Errors:", errors.length);
errors.forEach((e) => console.log("  ✗", e));

if (errors.length) process.exit(1);
console.log("OK — client/server Hebrew ensure contract aligned");
