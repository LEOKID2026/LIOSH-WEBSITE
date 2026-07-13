#!/usr/bin/env node
/**
 * Audit Hebrew UI + TTS instruction wiring for 9 educational games.
 * Run: node scripts/qa/game-audio-edu-instructions-hebrew-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE = "e79eeac7";

const errors = [];
const results = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function hasHebrew(text) {
  return /[\u0590-\u05FF]/.test(text);
}

function looksLikeEnglishUiOnly(text) {
  const t = String(text || "").trim();
  if (!t || hasHebrew(t)) return false;
  return /^[A-Za-z0-9\s.,!?'":\-_/]+$/.test(t);
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

function extractConstString(src, name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*\\n?\\s*["\`]([^"\`]+)["\`]`, "m");
  const m = src.match(re);
  return m ? m[1] : null;
}

function baselineString(rel, pattern) {
  try {
    const out = execSync(`git show ${BASELINE}:${rel}`, { cwd: ROOT, encoding: "utf8" });
    const m = out.match(pattern);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const EDU_GAMES = [
  {
    id: "recycling-factory",
    game: "components/educational-games/recycling-factory/RecyclingFactoryGame.jsx",
    constName: "RECYCLING_INSTRUCTION",
  },
  {
    id: "leo-supermarket",
    game: "components/educational-games/leo-supermarket/LeoSupermarketGame.jsx",
    fn: "components/educational-games/leo-supermarket/leo-supermarket-data.js",
    fnName: "customerRequestText",
    sample: "return `אני רוצה",
  },
  {
    id: "leo-lab",
    game: "components/educational-games/leo-lab/LeoLabGame.jsx",
    check: (src) => src.includes("בחרו") && src.includes("currentExperiment.prompt"),
  },
  {
    id: "leo-gifts",
    game: "components/educational-games/leo-gifts/LeoGiftsGame.jsx",
    fn: "components/educational-games/leo-gifts/leo-gifts-data.js",
    fnName: "giftsPrompt",
    sample: "return `לליאו יש",
  },
  {
    id: "leo-bakery",
    game: "components/educational-games/leo-bakery/LeoBakeryGame.jsx",
    fn: "components/educational-games/leo-bakery/leo-bakery-data.js",
    fnName: "bakeryPrompt",
    sample: "return `הגדירו",
  },
  {
    id: "leo-number-path",
    game: "components/educational-games/leo-number-path/LeoNumberPathGame.jsx",
    data: "components/educational-games/leo-number-path/leo-number-path-data.js",
    field: "promptHe",
  },
  {
    id: "leo-pizzeria",
    game: "components/educational-games/leo-pizzeria/LeoPizzeriaGame.jsx",
    check: (src) => src.includes("customer.greeting") && src.includes("customer.ticketLine"),
  },
  {
    id: "leo-word-train",
    game: "components/educational-games/leo-word-train/LeoWordTrainGame.jsx",
    data: "components/educational-games/leo-word-train/leo-word-train-data.js",
    field: "missionHe",
  },
  {
    id: "leo-word-detective",
    game: "components/educational-games/leo-word-detective/LeoWordDetectiveGame.jsx",
    data: "components/educational-games/leo-word-detective/leo-word-detective-data.js",
    field: "missionHe",
  },
];

// Hook must pass Hebrew locale for TTS
const hook = read("hooks/educational-games/useEducationalGameAudio.js");
assert(hook.includes('locale: "he-IL"'), "useEducationalGameAudio must pass locale: he-IL");
assert(
  hook.match(/playInstruction[\s\S]*locale:\s*"he-IL"/),
  "playInstruction must include locale: he-IL",
);
assert(
  hook.match(/playFeedback[\s\S]*locale:\s*"he-IL"/),
  "playFeedback must include locale: he-IL",
);
assert(
  hook.includes("useEffect(() => {\n    return () => {") || hook.includes("useEffect(() => {\r\n    return () => {"),
  "useEducationalEngineAudio cleanup must be unmount-only",
);

for (const game of EDU_GAMES) {
  const gameSrc = read(game.game);
  const entry = { id: game.id, ui: "ok", tts: "ok", notes: [] };

  assert(gameSrc.includes("useEducationalEngineAudio"), `${game.id}: must use useEducationalEngineAudio`);
  assert(gameSrc.includes("instructionText"), `${game.id}: must define instructionText`);
  assert(gameSrc.includes("EducationalGameInstructionReplay"), `${game.id}: must show instruction replay UI`);

  if (game.constName) {
    const text = extractConstString(gameSrc, game.constName);
    if (!text) {
      entry.ui = "fail";
      errors.push(`${game.id}: missing ${game.constName}`);
    } else if (!hasHebrew(text)) {
      entry.ui = "fail";
      errors.push(`${game.id}: ${game.constName} is not Hebrew: ${text}`);
    } else {
      const baseline = baselineString(game.game, new RegExp(`const\\s+${game.constName}[\\s\\S]*?["\`]([^"\`]+)["\`]`));
      if (baseline && baseline !== text) {
        entry.notes.push(`instruction changed since ${BASELINE}`);
      }
    }
    entry.tts = text && hasHebrew(text) ? "he-IL" : "fail";
  }

  if (game.fn) {
    const fnSrc = read(game.fn);
    assert(fnSrc.includes(`function ${game.fnName}`), `${game.id}: missing ${game.fnName}`);
    if (game.sample && !fnSrc.includes(game.sample)) {
      entry.ui = "fail";
      errors.push(`${game.id}: ${game.fnName} missing expected Hebrew sample`);
    }
    entry.tts = "he-IL";
  }

  if (game.data && game.field) {
    const dataSrc = read(game.data);
    const matches = [...dataSrc.matchAll(new RegExp(`${game.field}:\\s*["\`]([^"\`]+)["\`]`, "g"))];
    const englishOnly = matches.map((m) => m[1]).filter(looksLikeEnglishUiOnly);
    if (englishOnly.length) {
      entry.ui = "warn";
      entry.notes.push(`${englishOnly.length} ${game.field} entries are English-only UI (may be intentional word tasks)`);
    }
    const hebrewCount = matches.filter((m) => hasHebrew(m[1])).length;
    if (hebrewCount === 0) {
      entry.ui = "fail";
      errors.push(`${game.id}: no Hebrew ${game.field} entries found`);
    }
    entry.tts = "he-IL";
  }

  if (game.check && !game.check(gameSrc)) {
    entry.ui = "fail";
    errors.push(`${game.id}: instruction wiring check failed`);
  }

  if (gameSrc.match(/playVoice\s*\(\s*["']voice-edu-instruction["']/)) {
    entry.tts = "fail";
    errors.push(`${game.id}: direct playVoice call bypasses locale hook`);
  }

  results.push(entry);
}

console.log("Educational instructions Hebrew audit");
console.log("Baseline:", BASELINE);
console.log("");
for (const r of results) {
  console.log(`  ${r.id}: UI=${r.ui} TTS=${r.tts}${r.notes.length ? ` (${r.notes.join("; ")})` : ""}`);
}
console.log("");
console.log("Errors:", errors.length);
errors.forEach((e) => console.log("  ✗", e));

if (errors.length) process.exit(1);
console.log("OK — all 9 educational games have Hebrew instruction wiring");
