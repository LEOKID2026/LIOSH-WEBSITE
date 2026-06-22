/**
 * LIOSH Ludo — fetch snapshot + play via arcade HTTP APIs.
 */

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeLudoSnapshot(raw) {
  if (!raw || typeof raw !== "object") return null;
  let mySeat = null;
  const myRaw = raw.mySeat;
  if (myRaw !== null && myRaw !== undefined && myRaw !== "null") {
    const n = Number(myRaw);
    if (Number.isInteger(n) && n >= 0 && n <= 3) mySeat = n;
  }
  let winnerSeat = null;
  const wRaw = raw.winnerSeat;
  if (wRaw !== null && wRaw !== undefined && wRaw !== "null") {
    const w = Number(wRaw);
    if (Number.isInteger(w) && w >= 0 && w <= 3) winnerSeat = w;
  }
  return {
    revision: raw.revision != null ? Number(raw.revision) : 0,
    sessionId: String(raw.sessionId ?? ""),
    roomId: String(raw.roomId ?? ""),
    phase: String(raw.phase ?? ""),
    mySeat,
    turnSeat: raw.turnSeat != null ? Number(raw.turnSeat) : null,
    winnerSeat,
    board: raw.board && typeof raw.board === "object" ? /** @type {Record<string, unknown>} */ (raw.board) : {},
    dice: raw.dice != null && raw.dice !== "null" ? Number(raw.dice) : null,
    lastDice: raw.lastDice != null && raw.lastDice !== "null" ? Number(raw.lastDice) : null,
    activeSeats: Array.isArray(raw.activeSeats) ? raw.activeSeats.map((x) => Number(x)) : [],
    canClientRoll: raw.canClientRoll === true,
    canClientMovePiece: raw.canClientMovePiece === true,
    boardViewReadOnly: raw.boardViewReadOnly === true,
    legalMovablePieceIndices: Array.isArray(raw.legalMovablePieceIndices)
      ? raw.legalMovablePieceIndices.map((x) => Number(x))
      : null,
  };
}

/**
 * @param {string} roomId
 */
export async function fetchArcadeRoomLudoBundle(roomId) {
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
    const ludo = body.ludo ? normalizeLudoSnapshot(/** @type {Record<string, unknown>} */ (body.ludo)) : null;
    return {
      ok: true,
      ludo,
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
 * @param {{ action: string, pieceIndex?: number|null, revision?: number|null }} payload
 */
export async function requestLudoGameAction(roomId, payload) {
  try {
    const res = await fetch("/api/arcade/games/ludo/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        action: payload.action,
        pieceIndex: payload.pieceIndex,
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
    const snap = body.ludo ? normalizeLudoSnapshot(/** @type {Record<string, unknown>} */ (body.ludo)) : null;
    return { ok: true, snapshot: snap };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
