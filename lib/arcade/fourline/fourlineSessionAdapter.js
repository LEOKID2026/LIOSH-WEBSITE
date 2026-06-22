/**
 * LIOSH Fourline — fetch snapshot + play via arcade HTTP APIs (no Supabase RPC).
 */

/**
 * @param {Record<string, unknown>} raw — matches normalized Fourline snapshot from server
 */
export function normalizeFourlineSnapshot(raw) {
  if (!raw || typeof raw !== "object") return null;
  let mySeat = null;
  const myRaw = raw.mySeat;
  if (myRaw !== null && myRaw !== undefined && myRaw !== "null") {
    const n = Number(myRaw);
    if (Number.isInteger(n) && n >= 0 && n <= 1) mySeat = n;
  }
  let winnerSeat = null;
  const wRaw = raw.winnerSeat;
  if (wRaw !== null && wRaw !== undefined && wRaw !== "null") {
    const w = Number(wRaw);
    if (Number.isInteger(w) && (w === 0 || w === 1)) winnerSeat = w;
  }
  const cells = Array.isArray(raw.cells) ? raw.cells : raw.board?.cells;
  const lm = raw.lastMove && typeof raw.lastMove === "object" ? raw.lastMove : raw.board?.lastMove;
  const board = raw.board && typeof raw.board === "object" ? /** @type {Record<string, unknown>} */ (raw.board) : {};
  return {
    revision: raw.revision != null ? Number(raw.revision) : 0,
    sessionId: String(raw.sessionId ?? ""),
    roomId: String(raw.roomId ?? ""),
    phase: String(raw.phase ?? ""),
    activeSeats: Array.isArray(raw.activeSeats) ? raw.activeSeats.map((x) => Number(x)) : [0, 1],
    mySeat,
    board,
    cells: Array.isArray(cells) ? cells : [],
    lastMove:
      lm && typeof lm === "object" && lm !== null
        ? { row: lm.row != null ? Number(lm.row) : null, col: lm.col != null ? Number(lm.col) : null }
        : null,
    turnSeat: raw.turnSeat != null ? Number(raw.turnSeat) : null,
    winnerSeat,
    stakeMultiplier: 1,
    doublesAccepted: 0,
    pendingDouble: null,
    canOfferDouble: false,
    mustRespondDouble: false,
    turnDeadline: null,
    missedTurns: null,
    entryCost: raw.entryCost != null ? Number(raw.entryCost) : 0,
    prizePoolAmount:
      raw.prizePoolAmount != null && raw.prizePoolAmount !== ""
        ? Number(raw.prizePoolAmount)
        : null,
    mySettlementAmount:
      raw.mySettlementAmount != null && raw.mySettlementAmount !== ""
        ? Number(raw.mySettlementAmount)
        : null,
    walkaway: raw.walkaway === true,
  };
}

/**
 * @param {string} roomId
 */
export async function fetchFourlineSnapshot(roomId) {
  const b = await fetchArcadeRoomFourlineBundle(roomId);
  return b.ok ? b.fourline : null;
}

/**
 * Room snapshot bundle for UI labels + board state.
 * @param {string} roomId
 */
export async function fetchArcadeRoomFourlineBundle(roomId) {
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
    const fourline = body.fourline
      ? normalizeFourlineSnapshot(/** @type {Record<string, unknown>} */ (body.fourline))
      : null;
    return {
      ok: true,
      fourline,
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
 * @param {number} col
 * @param {{ revision?: number|null }} [opts]
 */
export async function requestFourlinePlayColumn(roomId, col, opts) {
  const rev = opts?.revision;
  try {
    const res = await fetch("/api/arcade/games/fourline/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        action: "play_column",
        column: Math.floor(Number(col)),
        revision: rev != null && rev !== "" ? Number(rev) : null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!body?.ok) {
      return {
        ok: false,
        error: typeof body.error === "string" ? body.error : "הבקשה נכשלה",
        code: typeof body.code === "string" ? body.code : undefined,
      };
    }
    const snap = body.fourline ? normalizeFourlineSnapshot(/** @type {Record<string, unknown>} */ (body.fourline)) : null;
    return { ok: true, snapshot: snap };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
