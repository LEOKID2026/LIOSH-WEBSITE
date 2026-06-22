/**
 * דמקה — snapshot + מהלך דרך API
 */

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeCheckersSnapshot(raw) {
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
  const board = raw.board && typeof raw.board === "object" ? /** @type {Record<string, unknown>} */ (raw.board) : {};
  const grid = Array.isArray(board.grid) ? board.grid : Array.isArray(board.cells) ? board.cells : [];
  const legalMoves = Array.isArray(raw.legalMoves) ? raw.legalMoves : [];

  let mustContinueFrom = null;
  const mc = raw.mustContinueFrom ?? board.mustContinueFrom;
  if (mc && typeof mc === "object") {
    const r = Number(/** @type {Record<string, unknown>} */ (mc).r);
    const c = Number(/** @type {Record<string, unknown>} */ (mc).c);
    if (Number.isInteger(r) && Number.isInteger(c)) mustContinueFrom = { r, c };
  }

  return {
    revision: raw.revision != null ? Number(raw.revision) : 0,
    sessionId: String(raw.sessionId ?? ""),
    roomId: String(raw.roomId ?? ""),
    phase: String(raw.phase ?? ""),
    mySeat,
    turnSeat: raw.turnSeat != null ? Number(raw.turnSeat) : null,
    winnerSeat,
    mustContinueFrom,
    board: { ...board, grid },
    legalMoves,
    canClientMove: raw.canClientMove === true,
    boardViewReadOnly: raw.boardViewReadOnly === true,
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
export async function fetchArcadeRoomCheckersBundle(roomId) {
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
    const checkers = body.checkers
      ? normalizeCheckersSnapshot(/** @type {Record<string, unknown>} */ (body.checkers))
      : null;
    return {
      ok: true,
      checkers,
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
 *   fromRow: number,
 *   fromCol: number,
 *   toRow: number,
 *   toCol: number,
 *   revision?: number|null,
 * }} payload
 */
export async function requestCheckersMove(roomId, payload) {
  try {
    const res = await fetch("/api/arcade/games/checkers/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        fromRow: payload.fromRow,
        fromCol: payload.fromCol,
        toRow: payload.toRow,
        toCol: payload.toCol,
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
    const snap = body.checkers
      ? normalizeCheckersSnapshot(/** @type {Record<string, unknown>} */ (body.checkers))
      : null;
    return { ok: true, snapshot: snap };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
