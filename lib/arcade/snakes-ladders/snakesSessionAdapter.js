/**
 * נחשים וסולמות — טעינת snapshot וביצוע פעולות דרך ה-API.
 */

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeSnakesLaddersSnapshot(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    revision: raw.revision != null ? Number(raw.revision) : 0,
    sessionId: String(raw.sessionId ?? ""),
    roomId: String(raw.roomId ?? ""),
    phase: String(raw.phase ?? ""),
    mySeat: raw.mySeat != null && raw.mySeat !== "null" ? Number(raw.mySeat) : null,
    turnSeat: raw.turnSeat != null ? Number(raw.turnSeat) : null,
    winnerSeat: raw.winnerSeat != null && raw.winnerSeat !== "null" ? Number(raw.winnerSeat) : null,
    positions: Array.isArray(raw.positions) ? raw.positions.map((x) => Number(x)) : [],
    lastRoll: raw.lastRoll != null && raw.lastRoll !== "null" ? Number(raw.lastRoll) : null,
    activeSeats: Array.isArray(raw.activeSeats) ? raw.activeSeats.map((x) => Number(x)) : [],
    canClientRoll: raw.canClientRoll === true,
    boardViewReadOnly: raw.boardViewReadOnly === true,
    board: raw.board && typeof raw.board === "object" ? /** @type {Record<string, unknown>} */ (raw.board) : {},
  };
}

/**
 * @param {string} roomId
 */
export async function fetchArcadeRoomSnakesLaddersBundle(roomId) {
  if (!roomId?.trim()) {
    return { ok: false, code: "bad_request", httpStatus: 0, error: "חסר מזהה חדר" };
  }
  try {
    const res = await fetch(`/api/arcade/rooms/${encodeURIComponent(roomId.trim())}/snapshot`, {
      credentials: "same-origin",
    });
    const body = await res.json().catch(() => ({}));
    if (!body?.ok) {
      return {
        ok: false,
        code: typeof body.code === "string" ? body.code : undefined,
        httpStatus: res.status,
        error: typeof body.error === "string" ? body.error : undefined,
      };
    }
    const snakesAndLadders = body.snakesAndLadders
      ? normalizeSnakesLaddersSnapshot(/** @type {Record<string, unknown>} */ (body.snakesAndLadders))
      : null;
    return {
      ok: true,
      snakesAndLadders,
      room: body.room && typeof body.room === "object" ? /** @type {Record<string, unknown>} */ (body.room) : null,
      players: Array.isArray(body.players) ? body.players : [],
      gameSession: body.gameSession && typeof body.gameSession === "object" ? /** @type {Record<string, unknown>} */ (body.gameSession) : null,
    };
  } catch (e) {
    return {
      ok: false,
      code: "network",
      httpStatus: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * @param {string} roomId
 * @param {{ action: string, revision?: number|null }} payload
 */
export async function requestSnakesAndLaddersGameAction(roomId, payload) {
  try {
    const res = await fetch("/api/arcade/games/snakes-and-ladders/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        action: payload.action,
        revision:
          payload.revision != null && payload.revision !== "" ? Number(payload.revision) : null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!body?.ok) {
      return {
        ok: false,
        error: typeof body.error === "string" ? body.error : "הבקשה נכשלה",
        code: typeof body.code === "string" ? body.code : undefined,
        httpStatus: res.status,
        revision: body.revision,
      };
    }
    const snap = body.snakesAndLadders
      ? normalizeSnakesLaddersSnapshot(/** @type {Record<string, unknown>} */ (body.snakesAndLadders))
      : null;
    return { ok: true, snapshot: snap };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
