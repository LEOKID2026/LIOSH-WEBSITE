/**
 * Parse + validate surprise_box_general_settings (admin / runtime).
 */

const MAX_PENDING_BOXES_CAP = 10;
const MAX_PRIZE_SLOTS = 3;

/**
 * @param {unknown} raw
 */
export function parseSurpriseBoxGeneralSettings(raw) {
  const g = raw && typeof raw === "object" ? raw : {};
  const maxPendingBoxes = clampInt(g.max_pending_boxes, 1, MAX_PENDING_BOXES_CAP, 1);
  const cardsPerOpen = clampInt(g.cards_per_open, 0, MAX_PRIZE_SLOTS, 2);
  const coinPrizesPerOpen = clampInt(g.coin_prizes_per_open, 0, MAX_PRIZE_SLOTS, 1);
  const intervalMinutes = clampInt(g.box_interval_minutes, 1, 24 * 60, 180);

  return {
    box_interval_minutes: intervalMinutes,
    max_pending_boxes: maxPendingBoxes,
    first_box_immediate: g.first_box_immediate !== false,
    prevent_duplicate_in_box: g.prevent_duplicate_in_box !== false,
    cards_per_open: cardsPerOpen,
    coin_prizes_per_open: coinPrizesPerOpen,
  };
}

/**
 * @param {unknown} value
 * @returns {{ ok: true, value: object } | { ok: false, messageHe: string }}
 */
export function validateSurpriseBoxGeneralSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, messageHe: "הגדרות קופסה חייבות להיות אובייקט JSON." };
  }

  const parsed = parseSurpriseBoxGeneralSettings(value);

  if (parsed.cards_per_open + parsed.coin_prizes_per_open < 1) {
    return {
      ok: false,
      messageHe: "חייב להיות לפחות פרס אחד בקופסה - קלפים ו/או מטבעות.",
    };
  }

  return {
    ok: true,
    value: {
      ...value,
      box_interval_minutes: parsed.box_interval_minutes,
      max_pending_boxes: parsed.max_pending_boxes,
      first_box_immediate: parsed.first_box_immediate,
      prevent_duplicate_in_box: parsed.prevent_duplicate_in_box,
      cards_per_open: parsed.cards_per_open,
      coin_prizes_per_open: parsed.coin_prizes_per_open,
    },
  };
}

function clampInt(v, min, max, fallback) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export { MAX_PENDING_BOXES_CAP, MAX_PRIZE_SLOTS };

export function readPendingCount(state) {
  const n = Number(state?.pending_box_count);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return state?.has_pending_box ? 1 : 0;
}

/**
 * Advance accumulation timer; returns patch for DB or null if unchanged.
 * @param {object} state
 * @param {ReturnType<typeof parseSurpriseBoxGeneralSettings>} general
 * @param {Date} now
 */
export function tickSurpriseBoxAccumulation(state, general, now = new Date()) {
  let count = readPendingCount(state);
  const max = general.max_pending_boxes;
  let nextAt = state.next_available_at ? new Date(state.next_available_at) : null;
  const intervalMs = general.box_interval_minutes * 60 * 1000;
  let changed = false;

  if (count < max && !nextAt && state.last_opened_at) {
    nextAt = new Date(now.getTime() + intervalMs);
    changed = true;
  }

  while (count < max && nextAt && now >= nextAt) {
    count += 1;
    changed = true;
    if (count < max) {
      nextAt = new Date(nextAt.getTime() + intervalMs);
    } else {
      nextAt = null;
    }
  }

  if (!changed) return null;

  return {
    pending_box_count: count,
    has_pending_box: count > 0,
    next_available_at: nextAt ? nextAt.toISOString() : null,
  };
}
