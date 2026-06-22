/**
 * דומינו — snapshot + פעולות דרך API
 */

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeDominoesSnapshot(raw) {
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

  /** @type {{ tileId: number, side: 'left'|'right' }[]} */
  const legalPlays = [];
  if (Array.isArray(raw.legalPlays)) {
    for (const lp of raw.legalPlays) {
      if (!lp || typeof lp !== "object") continue;
      const o = /** @type {Record<string, unknown>} */ (lp);
      const tid = Number(o.tileId);
      const sd = String(o.side || "").toLowerCase();
      const side = sd === "left" || sd === "right" ? sd : null;
      if (!Number.isFinite(tid) || !side) continue;
      legalPlays.push({ tileId: tid, side });
    }
  }

  return {
    revision: raw.revision != null ? Number(raw.revision) : 0,
    sessionId: String(raw.sessionId ?? ""),
    roomId: String(raw.roomId ?? ""),
    phase: String(raw.phase ?? ""),
    mySeat,
    winnerSeat,
    chain: Array.isArray(raw.chain) ? raw.chain : [],
    openEnds: raw.openEnds && typeof raw.openEnds === "object" ? raw.openEnds : null,
    myHand: Array.isArray(raw.myHand) ? raw.myHand : [],
    opponentHandCount:
      raw.opponentHandCount != null && raw.opponentHandCount !== ""
        ? Number(raw.opponentHandCount)
        : 0,
    legalPlays,
    canClientAct: raw.canClientAct === true,
    mustPass: raw.mustPass === true,
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
export async function fetchArcadeRoomDominoesBundle(roomId) {
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
    const dominoes = body.dominoes ? normalizeDominoesSnapshot(/** @type {Record<string, unknown>} */ (body.dominoes)) : null;
    return {
      ok: true,
      dominoes,
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
 *   action: 'play'|'pass',
 *   tileId?: number|null,
 *   side?: 'left'|'right'|null,
 *   revision?: number|null,
 * }} payload
 */
export async function requestDominoesAction(roomId, payload) {
  try {
    const res = await fetch("/api/arcade/games/dominoes/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        action: payload.action,
        tileId: payload.tileId != null ? Number(payload.tileId) : null,
        side: payload.side ?? null,
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
    const snap = body.dominoes ? normalizeDominoesSnapshot(/** @type {Record<string, unknown>} */ (body.dominoes)) : null;
    return { ok: true, snapshot: snap };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
