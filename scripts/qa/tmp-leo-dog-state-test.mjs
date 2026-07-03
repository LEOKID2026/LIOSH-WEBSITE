import {
  actionFeed,
  advanceTime,
  applyTimeDecay,
  computeMood,
  createDefaultState,
  touchHead,
} from "../../lib/prototypes/leo-dog/leo-dog-state.js";

const now = Date.now();
let s = createDefaultState(now);

// Actions change stats
const fed = actionFeed(s);
if (fed.food <= s.food) throw new Error("feed should increase food");
if (fed.happiness <= s.happiness) throw new Error("feed should increase happiness");

const petted = touchHead(fed);
if (petted.bond <= fed.bond) throw new Error("touch head should increase bond");

// Decay after 1 day
const dayLater = advanceTime(s, 24);
if (dayLater.food >= s.food) throw new Error("food should decay");
if (dayLater.missing <= s.missing) throw new Error("missing should increase");
if (dayLater.food < 15) throw new Error("food should not go below 15");

// 3 days — mood should reflect missing/dirty
const threeDays = advanceTime(s, 72);
const mood = computeMood(threeDays);
if (!["missing", "veryDirtyAndMissing", "dirty", "hungry", "tired"].includes(mood)) {
  throw new Error(`unexpected mood after 3 days: ${mood}`);
}

// applyTimeDecay with no elapsed time should not crash
applyTimeDecay(s, now);

console.log("leo-dog state tests: OK");
console.log("3-day mood:", mood, threeDays);
