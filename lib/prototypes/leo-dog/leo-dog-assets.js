/**
 * Leo dog prototype — sprite assets, resolver & debug gallery config.
 */

/** @typedef {'svg'|'cards'|'photos'} LeoDogDebugPanelMode */
/** @typedef {'sprites'|'svg'} LeoDogGameVisualMode */

/** @typedef {import('./leo-dog-state.js').LeoDogMood} LeoDogMood */
/** @typedef {import('./leo-dog-state.js').LeoDogAnim} LeoDogAnim */

export const DEBUG_PANEL_STORAGE_KEY = "leo-dog-debug-panel-v1";
export const GAME_VISUAL_STORAGE_KEY = "leo-dog-game-visual-v1";

const ASSET_BASE = "/images/prototypes/leo-dog/assets";

/** @type {Record<string, string>} */
export const LEO_SPRITES = {
  standing: `${ASSET_BASE}/leo-standing-transparent.png`,
  sittingCalm: `${ASSET_BASE}/leo-sitting-calm.png`,
  sitting: `${ASSET_BASE}/leo-sitting-transparent.png`,
  superHappy: `${ASSET_BASE}/leo-super-happy.png`,
  playing: `${ASSET_BASE}/leo-playing.png`,
  sleeping: `${ASSET_BASE}/leo-sleeping.png`,
  sleepingDirty: `${ASSET_BASE}/leo-sleeping-dirty.png`,
  dirty: `${ASSET_BASE}/leo-dirty.png`,
};

export const LEO_FOOD_STEAK = `${ASSET_BASE}/leo-food-steak.png`;

export const HAS_CLEAN_TRANSPARENT_SPRITE = true;

export const GAME_VISUAL_MODES = /** @type {LeoDogGameVisualMode[]} */ (["sprites", "svg"]);

export const GAME_VISUAL_LABELS = {
  sprites: "ליאו החדש",
  svg: "SVG ישן",
};

/** New Leo PNG set — gameplay sprites. */
export const LEO_DOG_SPRITE_GALLERY = [
  { src: LEO_SPRITES.standing, label: "standing", note: "idle / happy" },
  { src: LEO_SPRITES.sittingCalm, label: "sitting-calm", note: "געגוע / ליטוף" },
  { src: LEO_SPRITES.sitting, label: "sitting", note: "alt calm" },
  { src: LEO_SPRITES.superHappy, label: "super-happy", note: "שמח מאוד / אוכל" },
  { src: LEO_SPRITES.playing, label: "playing", note: "משחק" },
  { src: LEO_SPRITES.sleeping, label: "sleeping", note: "מנוחה" },
  { src: LEO_SPRITES.dirty, label: "dirty", note: "מלוכלך" },
  { src: LEO_SPRITES.sleepingDirty, label: "sleeping-dirty", note: "מלוכלך + עייף" },
];

/** Legacy card art — debug viewing only. */
export const LEO_DOG_CARD_GALLERY = [
  { src: "/images/card/shiba40.png", label: "shiba40", note: "legacy · רקע קלף" },
  { src: "/images/card/shiba45.png", label: "shiba45", note: "legacy · רקע קלף" },
  { src: "/images/card/shiba50.png", label: "shiba50", note: "legacy · רקע קלף" },
];

/** Real-life reference photos — debug viewing only. */
export const LEO_DOG_REFERENCE_PHOTOS = Array.from({ length: 10 }, (_, i) => ({
  src: `/images/prototypes/leo-dog/reference/leo-ref-${String(i + 1).padStart(2, "0")}.jpeg`,
  label: `תמונה ${i + 1}`,
  note: "reference · לא למשחק",
}));

export const DEBUG_PANEL_MODES = /** @type {LeoDogDebugPanelMode[]} */ (["svg", "cards", "photos"]);

export const DEBUG_PANEL_LABELS = {
  svg: "גלריה - הודעה",
  cards: "sprites + קלפים",
  photos: "תמונות reference",
};

/**
 * Resolve sprite from persistent mood + temporary action.
 * @param {LeoDogMood} mood
 * @param {import('./leo-dog-action-state.js').LeoDogCurrentAction} currentAction
 * @param {{ cleanliness: number, energy: number }} stats
 * @param {boolean} isSleeping
 */
export function resolveLeoSprite(mood, currentAction, stats, isSleeping) {
  const { cleanliness, energy } = stats;
  const isDirtyStat = cleanliness <= 45;
  const veryLowClean = cleanliness <= 30;
  const veryTired = energy < 25;
  const isDirtyMood = mood === "dirty" || mood === "veryDirtyAndMissing";

  if (isSleeping || currentAction === "sleeping") {
    if ((veryLowClean || isDirtyStat) && veryTired) return LEO_SPRITES.sleepingDirty;
    return LEO_SPRITES.sleeping;
  }

  switch (currentAction) {
    case "eating":
      return LEO_SPRITES.superHappy;
    case "petting":
      return LEO_SPRITES.sittingCalm;
    case "playing":
      return LEO_SPRITES.playing;
    case "playingAfterglow":
    case "bathAfterglow":
      return LEO_SPRITES.superHappy;
    case "bathing":
      if (isDirtyStat || isDirtyMood || veryLowClean) return LEO_SPRITES.dirty;
      return LEO_SPRITES.sittingCalm;
    case "shaking":
      return LEO_SPRITES.superHappy;
    default:
      break;
  }

  if (veryLowClean && veryTired) return LEO_SPRITES.sleepingDirty;
  if (isDirtyStat || isDirtyMood) return LEO_SPRITES.dirty;

  if (mood === "superHappy") return LEO_SPRITES.superHappy;
  if (mood === "missing") return LEO_SPRITES.sittingCalm;
  if (mood === "hungry") return LEO_SPRITES.standing;

  return LEO_SPRITES.standing;
}

/** @param {string} src */
export function spriteLabelFromSrc(src) {
  const entry = Object.entries(LEO_SPRITES).find(([, url]) => url === src);
  return entry ? entry[0] : "unknown";
}

/** @param {string} src */
export function spriteUsesBuiltInDirtyArt(src) {
  return src === LEO_SPRITES.dirty || src === LEO_SPRITES.sleepingDirty;
}

/** @returns {LeoDogDebugPanelMode} */
export function loadDebugPanelMode() {
  if (typeof window === "undefined") return "svg";
  try {
    const v = localStorage.getItem(DEBUG_PANEL_STORAGE_KEY);
    if (v === "svg" || v === "cards" || v === "photos") return v;
  } catch {
    /* ignore */
  }
  return "svg";
}

/** @param {LeoDogDebugPanelMode} mode */
export function saveDebugPanelMode(mode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEBUG_PANEL_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** @returns {LeoDogGameVisualMode} */
export function loadGameVisualMode() {
  if (typeof window === "undefined") return "sprites";
  try {
    const v = localStorage.getItem(GAME_VISUAL_STORAGE_KEY);
    if (v === "sprites" || v === "svg") return v;
    if (v === "transparent") return "sprites";
  } catch {
    /* ignore */
  }
  return "sprites";
}

/** @param {LeoDogGameVisualMode} mode */
export function saveGameVisualMode(mode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GAME_VISUAL_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
