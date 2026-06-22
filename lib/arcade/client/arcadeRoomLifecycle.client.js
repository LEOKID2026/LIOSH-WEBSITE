/** Client-side active arcade room tracking + global poll stop registry. */

export const ARCADE_ACTIVE_ROOM_STORAGE_KEY = "liosh_arcade_active_room_v1";

export const ARCADE_ROOM_INACTIVE_MESSAGE = "המשחק הסתיים";
export const ARCADE_ROOM_FORBIDDEN_MESSAGE = "החדר כבר לא פעיל";

/** @type {Set<() => void>} */
const pollStopCallbacks = new Set();

/** @param {() => void} fn */
export function registerArcadeRoomPollStop(fn) {
  if (typeof fn !== "function") return () => {};
  pollStopCallbacks.add(fn);
  return () => pollStopCallbacks.delete(fn);
}

export function stopAllArcadeRoomPolls() {
  for (const fn of pollStopCallbacks) {
    try {
      fn();
    } catch {
      /* */
    }
  }
}

/**
 * @param {{ roomId: string, gameKey?: string|null }} payload
 */
export function setArcadeActiveRoom({ roomId, gameKey = null }) {
  if (typeof window === "undefined") return;
  const id = String(roomId || "").trim();
  if (!id) return;
  try {
    window.sessionStorage.setItem(
      ARCADE_ACTIVE_ROOM_STORAGE_KEY,
      JSON.stringify({
        roomId: id,
        gameKey: gameKey != null ? String(gameKey) : null,
        at: Date.now(),
      }),
    );
  } catch {
    /* private mode */
  }
}

/** @returns {{ roomId: string, gameKey: string|null, at: number }|null} */
export function getArcadeActiveRoom() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ARCADE_ACTIVE_ROOM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const roomId = parsed?.roomId != null ? String(parsed.roomId).trim() : "";
    if (!roomId) return null;
    return {
      roomId,
      gameKey: parsed?.gameKey != null ? String(parsed.gameKey) : null,
      at: Number(parsed?.at) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string|null|undefined} [roomId] — when set, clears only if it matches stored room
 */
export function clearArcadeActiveRoom(roomId) {
  if (typeof window === "undefined") return;
  const target = roomId != null ? String(roomId).trim() : "";
  try {
    if (target) {
      const current = getArcadeActiveRoom();
      if (current?.roomId && current.roomId !== target) return;
    }
    window.sessionStorage.removeItem(ARCADE_ACTIVE_ROOM_STORAGE_KEY);
  } catch {
    /* */
  }
}

/**
 * @param {string|null|undefined} roomId
 */
export function clearArcadeRoomClientState(roomId) {
  clearArcadeActiveRoom(roomId);
  stopAllArcadeRoomPolls();
}
