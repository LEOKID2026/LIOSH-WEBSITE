/**
 * Regression guard: live countdown timers in active production games must show the Hebrew
 * seconds abbreviation ("שנ׳"), never a raw English "s" suffix (e.g. "12s").
 * Dev-only prototype copies under components/prototypes/dev/** are intentionally out of
 * scope (Low finding, not user-facing production surface).
 * Run: node --test tests/learning/game-timer-no-english-suffix.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const ACTIVE_TIMER_FILES = [
  "components/educational-games/leo-supermarket/LeoSupermarketGame.jsx",
  "components/educational-games/leo-pizzeria/LeoPizzeriaGame.jsx",
  "components/educational-games/leo-word-detective/LeoWordDetectiveGame.jsx",
  "components/educational-games/leo-word-train/LeoWordTrainGame.jsx",
  "components/solo-games/engines/MleoSortShapesEngine.jsx",
  "components/solo-games/engines/MleoMemoryEngine.jsx",
  "components/solo-games/engines/MleoPuzzleEngine.jsx",
  "components/solo-games/engines/MleoPicturePuzzlePlacementPlay.jsx",
  "components/solo-games/engines/MleoTargetTapEngine.jsx",
  "components/solo-games/engines/MleoBalloonsEngine.jsx",
  "components/solo-games/engines/MleoPicturePuzzleSlidingPlay.jsx",
  "components/solo-games/engines/MleoMazeEngine.jsx",
];

describe("game timers show Hebrew seconds, not a raw English 's' suffix", () => {
  for (const file of ACTIVE_TIMER_FILES) {
    test(`${file} has no "{...}s" raw English timer suffix`, () => {
      const src = readFileSync(join(ROOT, file), "utf8");
      assert.doesNotMatch(src, /\{(timeLeft|time)\}s\b/);
    });
  }
});
