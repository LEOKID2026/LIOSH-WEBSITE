import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHebrewSpeechText } from "../../lib/game-audio/sanitize-hebrew-speech-text.js";

test("strips emoji after Hebrew product names", () => {
  assert.equal(sanitizeHebrewSpeechText("מים 💧"), "מים");
  assert.equal(sanitizeHebrewSpeechText("גבינה 🧀"), "גבינה");
  assert.equal(sanitizeHebrewSpeechText("אורז 🍚 וחלב 🥛"), "אורז וחלב");
});

test("preserves plain Hebrew and intentional English exercise content", () => {
  const hebrew = "מיינו כל פריט לפח הנכון - שמרו על הסביבה!";
  assert.equal(sanitizeHebrewSpeechText(hebrew), "מיינו כל פריט לפח הנכון - שמרו על הסביבה!");
  const english = "סדרו משפט: I like pizza";
  assert.equal(sanitizeHebrewSpeechText(english), english);
  assert.equal(sanitizeHebrewSpeechText("Build the word: water"), "Build the word: water");
});

test("normalizes list vav and UI separators for speech", () => {
  assert.equal(
    sanitizeHebrewSpeechText("אני רוצה תפוח 🍎, בננה 🍌 ו-מים 💧"),
    "אני רוצה תפוח, בננה ומים",
  );
  assert.equal(sanitizeHebrewSpeechText("3 עוגיות · בכל מגש 2"), "3 עוגיות, בכל מגש 2");
});

test("adds pause before lab-style second clause", () => {
  assert.equal(
    sanitizeHebrewSpeechText("אילו חפצים מגנטיים? בחרו 2 חפצים"),
    "אילו חפצים מגנטיים? בחרו 2 חפצים",
  );
  assert.equal(
    sanitizeHebrewSpeechText("מצאו חפצים שמוליכים חשמל בחרו 2 חפצים"),
    "מצאו חפצים שמוליכים חשמל. בחרו 2 חפצים",
  );
});

test("strips pizzeria ticket emojis without removing topping names", () => {
  assert.equal(
    sanitizeHebrewSpeechText("גבינה 🧀 - על כל הפיצה"),
    "גבינה - על כל הפיצה",
  );
  assert.equal(
    sanitizeHebrewSpeechText("1 עגבניה 🍅 + 3 גבינה 🧀"),
    "1 עגבניה + 3 גבינה",
  );
});
