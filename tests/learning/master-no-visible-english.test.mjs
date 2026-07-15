/**
 * Regression guard: the "how to play" modal list items in Science/History master must not
 * show raw English ("XP") to the child - Hebrew wording only.
 * Run: node --test tests/learning/master-no-visible-english.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("master pages: no visible English XP text", () => {
  for (const file of ["pages/learning/science-master.js", "pages/learning/history-master.js"]) {
    test(`${file} "how to play" list has no visible "XP"`, () => {
      const src = readFileSync(join(ROOT, file), "utf8");
      assert.doesNotMatch(src, /כוכבים\s*ו\s*XP/);
      assert.match(src, /כוכבים ונקודות ניסיון/);
    });
  }
});
