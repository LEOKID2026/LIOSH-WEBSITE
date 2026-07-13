/** BGM canonical asset per game key */

export const SOLO_BGM_ARCADE = "bgm-arcade-upbeat";
export const SOLO_BGM_PUZZLE = "bgm-puzzle-calm";
export const EDU_BGM = "bgm-edu-warm";
export const MASTERS_BGM = "bgm-learning-focus";
export const MINERS_BGM = "bgm-miners-cave";

const SOLO_ARCADE = new Set([
  "catcher", "flyer", "leo-jump", "balloons", "target-tap", "fruit-slice",
]);

const SOLO_PUZZLE = new Set([
  "puzzle", "memory", "maze", "picture-puzzle", "sort-shapes", "smart-blocks",
]);

export function getSoloBgmAssetId(gameKey) {
  if (SOLO_ARCADE.has(gameKey)) return SOLO_BGM_ARCADE;
  if (SOLO_PUZZLE.has(gameKey)) return SOLO_BGM_PUZZLE;
  return null;
}

export function getEducationalBgmAssetId() {
  return EDU_BGM;
}

export function getMastersBgmAssetId() {
  return MASTERS_BGM;
}

export function getMinersBgmAssetId() {
  return MINERS_BGM;
}
