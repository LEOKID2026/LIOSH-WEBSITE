import { LEO_SPRITES, resolveLeoSprite } from "../../lib/prototypes/leo-dog/leo-dog-assets.js";

const stats = { cleanliness: 80, energy: 80 };

if (resolveLeoSprite("happy", "idle", stats, false) !== LEO_SPRITES.standing) {
  throw new Error("idle happy should be standing");
}
if (resolveLeoSprite("happy", "eating", stats, false) !== LEO_SPRITES.superHappy) {
  throw new Error("eating should be superHappy");
}
if (resolveLeoSprite("happy", "playing", stats, false) !== LEO_SPRITES.playing) {
  throw new Error("playing should be playing");
}
if (resolveLeoSprite("happy", "idle", stats, true) !== LEO_SPRITES.sleeping) {
  throw new Error("sleeping should be sleeping");
}
if (resolveLeoSprite("missing", "idle", stats, false) !== LEO_SPRITES.sittingCalm) {
  throw new Error("missing mood should be sittingCalm");
}
if (resolveLeoSprite("happy", "idle", { cleanliness: 40, energy: 80 }, false) !== LEO_SPRITES.dirty) {
  throw new Error("cleanliness 40 idle should be dirty sprite");
}
if (resolveLeoSprite("happy", "idle", { cleanliness: 20, energy: 80 }, false) !== LEO_SPRITES.dirty) {
  throw new Error("cleanliness 20 idle should be dirty sprite");
}
if (
  resolveLeoSprite("happy", "idle", { cleanliness: 25, energy: 20 }, false) !==
  LEO_SPRITES.sleepingDirty
) {
  throw new Error("very dirty + tired should be sleepingDirty");
}
if (resolveLeoSprite("happy", "bathing", { cleanliness: 20, energy: 80 }, false) !== LEO_SPRITES.dirty) {
  throw new Error("bathing when dirty should use dirty sprite");
}
if (resolveLeoSprite("happy", "bathing", stats, false) !== LEO_SPRITES.sittingCalm) {
  throw new Error("bathing when clean should use sittingCalm");
}
if (resolveLeoSprite("happy", "bathAfterglow", stats, false) !== LEO_SPRITES.superHappy) {
  throw new Error("bath afterglow should be superHappy");
}

console.log("leo sprite resolver tests: OK");
