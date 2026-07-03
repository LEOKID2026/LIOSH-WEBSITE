/** @typedef {'happy'|'superHappy'|'hungry'|'dirty'|'tired'|'missing'|'veryDirtyAndMissing'} LeoDogMood */

/** @typedef {'idle'|'petHead'|'noseTap'|'bellyTap'|'pawTap'|'bodyTap'|'eat'|'bath'|'shake'|'playBall'|'sleep'|'missing'} LeoDogAnim */

/**
 * @typedef {Object} LeoDogState
 * @property {number} happiness
 * @property {number} cleanliness
 * @property {number} food
 * @property {number} energy
 * @property {number} missing
 * @property {number} bond
 * @property {number} lastSeenAt
 * @property {number} lastActionAt
 * @property {LeoDogMood} mood
 * @property {number} positiveStreak
 */

export const STORAGE_KEY = "leo-dog-prototype-v1";

const MIN = { food: 15, happiness: 20, energy: 15, cleanliness: 0 };
const MAX = 100;

/** @returns {LeoDogState} */
export function createDefaultState(now = Date.now()) {
  return {
    happiness: 80,
    cleanliness: 80,
    food: 80,
    energy: 80,
    missing: 10,
    bond: 0,
    lastSeenAt: now,
    lastActionAt: now,
    mood: "happy",
    positiveStreak: 0,
  };
}

/** @param {number} v @param {number} [floor] */
function clamp(v, floor = 0) {
  return Math.max(floor, Math.min(MAX, Math.round(v)));
}

/** @param {LeoDogState} s */
export function computeMood(s) {
  if (s.bond >= 55 || s.positiveStreak >= 3) return "superHappy";
  if (s.cleanliness < 25 && s.missing > 70) return "veryDirtyAndMissing";
  if (s.food < 35) return "hungry";
  if (s.cleanliness < 30) return "dirty";
  if (s.energy < 30) return "tired";
  if (s.missing > 60) return "missing";
  return "happy";
}

/** @param {LeoDogState} s */
export function withMood(s) {
  return { ...s, mood: computeMood(s) };
}

/**
 * Apply time-based decay since lastSeenAt.
 * @param {LeoDogState} state
 * @param {number} [now]
 */
export function applyTimeDecay(state, now = Date.now()) {
  const elapsedMs = Math.max(0, now - state.lastSeenAt);
  const hours = elapsedMs / (1000 * 60 * 60);

  if (hours < 0.05) {
    return withMood({ ...state, lastSeenAt: now });
  }

  const foodDrop = hours * 2.2;
  const cleanDrop = hours * 1.8;
  const energyDrop = hours * 1.2;
  const missingGain = hours * 3.5;
  const happyDrop = hours * 0.8;

  return withMood({
    ...state,
    food: clamp(state.food - foodDrop, MIN.food),
    cleanliness: clamp(state.cleanliness - cleanDrop, MIN.cleanliness),
    energy: clamp(state.energy - energyDrop, MIN.energy),
    missing: clamp(state.missing + missingGain),
    happiness: clamp(state.happiness - happyDrop, MIN.happiness),
    lastSeenAt: now,
  });
}

/** @param {LeoDogState} state @param {number} hours */
export function advanceTime(state, hours) {
  const ms = hours * 60 * 60 * 1000;
  const shifted = { ...state, lastSeenAt: state.lastSeenAt - ms };
  return applyTimeDecay(shifted);
}

/** @param {LeoDogState} state @param {Partial<LeoDogState>} patch @param {number} [now] */
function patchState(state, patch, now = Date.now()) {
  const next = withMood({
    ...state,
    ...patch,
    lastActionAt: now,
    lastSeenAt: now,
  });
  return next;
}

/** @param {LeoDogState} state */
export function actionFeed(state) {
  return patchState(state, {
    food: clamp(state.food + 28),
    happiness: clamp(state.happiness + 10),
    missing: clamp(state.missing - 12),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function actionBath(state) {
  return patchState(state, {
    cleanliness: clamp(state.cleanliness + 40),
    happiness: clamp(state.happiness + 12),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function actionPlay(state) {
  return patchState(state, {
    happiness: clamp(state.happiness + 18),
    bond: clamp(state.bond + 10),
    energy: clamp(state.energy - 14, MIN.energy),
    missing: clamp(state.missing - 18),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function actionPet(state) {
  return patchState(state, {
    happiness: clamp(state.happiness + 14),
    bond: clamp(state.bond + 8),
    missing: clamp(state.missing - 15),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function actionRest(state) {
  return patchState(state, {
    energy: clamp(state.energy + 32),
    happiness: clamp(state.happiness + 6),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** Touch zones — lighter stat bumps */
/** @param {LeoDogState} state */
export function touchHead(state) {
  return patchState(state, {
    happiness: clamp(state.happiness + 8),
    bond: clamp(state.bond + 4),
    missing: clamp(state.missing - 8),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function touchNose(state) {
  return patchState(state, {
    happiness: clamp(state.happiness + 5),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function touchBelly(state) {
  return patchState(state, {
    happiness: clamp(state.happiness + 10),
    bond: clamp(state.bond + 3),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function touchPaw(state) {
  return patchState(state, {
    happiness: clamp(state.happiness + 7),
    bond: clamp(state.bond + 5),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @param {LeoDogState} state */
export function touchBody(state) {
  return patchState(state, {
    happiness: clamp(state.happiness + 4),
    positiveStreak: state.positiveStreak + 1,
  });
}

/** @returns {LeoDogState | null} */
export function loadState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return withMood({ ...createDefaultState(), ...parsed });
  } catch {
    return null;
  }
}

/** @param {LeoDogState} state */
export function saveState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors in prototype */
  }
}

export const STAT_LABELS = {
  happiness: "שמחה",
  cleanliness: "ניקיון",
  food: "אוכל",
  energy: "אנרגיה",
  missing: "געגוע",
};
