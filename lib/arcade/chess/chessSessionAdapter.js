/**
 * שחמט — snapshot + מהלך דרך API
 */

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeChessSnapshot(raw) {
  if (!raw || typeof raw !== "object") return null;
  let mySeat = null;
  if (raw.mySeat !== null && raw.mySeat !== undefined && raw.mySeat !== "null") {
    const n = Number(raw.mySeat);
    if (n === 0 || n === 1) mySeat = n;
  }
  let winnerSeat = null;
  if (raw.winnerSeat !== null && raw.winnerSeat !== undefined && raw.winnerSeat !== "null") {
    const w = Number(raw.winnerSeat);
    if (w === 0 || w === 1) winnerSeat = w;
  }

  const pieces = Array.isArray(raw.pieces) ? raw.pieces : [];
  const legalMoves = Array.isArray(raw.legalMoves) ? raw.legalMoves : [];

  return {
    revision: raw.revision != null ? Number(raw.revision) : 0,
    sessionId: String(raw.sessionId ?? ""),
    roomId: String(raw.roomId ?? ""),
    phase: String(raw.phase ?? ""),
    fen: String(raw.fen ?? ""),
    mySeat,
    turnSeat: raw.turnSeat != null ? Number(raw.turnSeat) : null,
    winnerSeat,
    pieces,
    legalMoves,
    canClientMove: raw.canClientMove === true,
    boardViewReadOnly: raw.boardViewReadOnly === true,
    inCheck: raw.inCheck === true,
    prizePoolAmount:
      raw.prizePoolAmount != null && raw.prizePoolAmount !== "" ? Number(raw.prizePoolAmount) : null,
    mySettlementAmount:
      raw.mySettlementAmount != null && raw.mySettlementAmount !== ""
        ? Number(raw.mySettlementAmount)
        : null,
    entryCost: raw.entryCost != null ? Number(raw.entryCost) : 0,
  };
}

/**
 * @param {string} roomId
 */
export async function fetchArcadeRoomChessBundle(roomId) {
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
    const chess = body.chess ? normalizeChessSnapshot(/** @type {Record<string, unknown>} */ (body.chess)) : null;
    return {
      ok: true,
      chess,
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
 * @param {{
 *   fromSquare: string,
 *   toSquare: string,
 *   promotion?: string|null,
 *   revision?: number|null,
 * }} payload
 */
export async function requestChessMove(roomId, payload) {
  try {
    const res = await fetch("/api/arcade/games/chess/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        fromSquare: payload.fromSquare,
        toSquare: payload.toSquare,
        promotion:
          payload.promotion != null && payload.promotion !== "" ? String(payload.promotion) : null,
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
    const snap = body.chess ? normalizeChessSnapshot(/** @type {Record<string, unknown>} */ (body.chess)) : null;
    return { ok: true, snapshot: snap };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
