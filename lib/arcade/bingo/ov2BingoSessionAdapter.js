/**
 * OV2 Bingo — session adapter (single client boundary for fetch / subscribe / RPC).
 * Supabase: `ov2_bingo_*` migrations. Safe when SQL missing - soft null / errors.
 *
 * Do not import UI or legacy bingo modules.
 *
 * LIOSH: fetch/subscribe use HTTP (אין RPC/Realtime).
 */

import { getCardForSeat, resolveCallerSeat } from "./ov2BingoEngine.js";

/** @typedef {{ room?: object|null, members?: unknown[], self?: { participant_key?: string, display_name?: string } }} Ov2BingoContextInput */

export const OV2_BINGO_PRODUCT_GAME_ID = "ov2_bingo";

export const OV2_BINGO_PLAY_MODE = Object.freeze({
  PREVIEW_LOCAL: "preview_local",
  LIVE_ROOM_NO_MATCH_YET: "live_room_no_match_yet",
  LIVE_MATCH_ACTIVE: "live_match_active",
  /** @deprecated Use {@link OV2_BINGO_PLAY_MODE.PREVIEW_LOCAL} */
  PREVIEW_ONLY: "preview_local",
  /** @deprecated Use {@link OV2_BINGO_PLAY_MODE.LIVE_ROOM_NO_MATCH_YET} */
  ROOM_CONTEXT_NO_MATCH_YET: "live_room_no_match_yet",
});

/**
 * @typedef {Object} Ov2BingoMemberVm
 * @property {string} participantKey
 * @property {string} displayName
 * @property {number|null} seatIndex
 * @property {boolean} isReady
 * @property {string} walletState
 * @property {number} amountLocked
 * @property {boolean} rematchRequested
 */

/**
 * @typedef {Object} Ov2BingoClaimVm
 * @property {string} id
 * @property {string} prizeKey
 * @property {string} claimedByParticipantKey
 * @property {string} claimedByName
 * @property {number} seatIndex
 * @property {number} amount
 * @property {string} lineKind
 */

/**
 * Normalized bundle for hook + UI (VM-friendly).
 *
 * @typedef {Object} Ov2BingoAuthoritativeSnapshot
 * @property {string} roomId
 * @property {string|null} roomLifecyclePhase
 * @property {string|null} roomHostParticipantKey
 * @property {number} roomMatchSeq
 * @property {string|null} roomActiveSessionId
 * @property {string|null} sessionId
 * @property {string|null} sessionPhase
 * @property {number} matchSeq
 * @property {number} revision
 * @property {string|null} roundId
 * @property {string|null} seed
 * @property {number[]} activeSeats
 * @property {Ov2BingoMemberVm[]} members
 * @property {string|null} callerParticipantKey
 * @property {number|null} callerSeatIndex
 * @property {number|null} lastNumber
 * @property {number[]} calledNumbers
 * @property {number} deckPosition
 * @property {number} deckTotal
 * @property {string|null} nextCallAtIso
 * @property {string|null} startedAtIso
 * @property {string|null} finishedAtIso
 * @property {Ov2BingoClaimVm[]} claims
 * @property {{ participantKey: string|null, name: string|null }} winner
 * @property {number} entryFee
 * @property {number} potTotal
 * @property {number} rowPrizeAmount
 * @property {number|null} walkoverPayoutAmount — set when match ended via last-player-standing (vault credit amount)
 * @property {Record<string, number[][]>|null} deckCardsBySeat — authoritative 5×5 grids from session.deck.cards (seat key → rows)
 * @property {string[]} availablePrizeKeys
 * @property {boolean} canOpenSession
 * @property {boolean} canCallNext
 * @property {boolean} canClaimAnyPrize
 * @property {boolean} canRequestRematch
 * @property {boolean} canCancelRematch
 * @property {boolean} canStartNextMatch
 */

/**
 * @param {Ov2BingoContextInput|null|undefined} baseContext
 * @param {Ov2BingoAuthoritativeSnapshot|null|undefined} bundle
 */
export function resolveOv2BingoPlayMode(baseContext, bundle = null) {
  const room = baseContext?.room && typeof baseContext.room === "object" ? baseContext.room : null;
  const roomId = room?.id != null ? String(room.id).trim() : "";
  if (!roomId) return OV2_BINGO_PLAY_MODE.PREVIEW_LOCAL;
  if (!bundle || !bundle.sessionId) return OV2_BINGO_PLAY_MODE.LIVE_ROOM_NO_MATCH_YET;
  return OV2_BINGO_PLAY_MODE.LIVE_MATCH_ACTIVE;
}

/**
 * @param {unknown} err
 */
export function isOv2BingoBackendUnavailableError(err) {
  const code = err && typeof err === "object" ? /** @type {{ code?: string }} */ (err).code : undefined;
  const msg = String(err && typeof err === "object" && "message" in err ? err.message : err || "").toLowerCase();
  if (code === "PGRST202" || code === "42P01" || code === "42704" || code === "42883") return true;
  if (msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("undefined table")) return true;
  return false;
}

/**
 * @param {unknown} v
 * @param {number} d
 */
function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/**
 * @param {unknown} raw
 * @returns {number[]}
 */
function parseJsonNumberArray(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const x of raw) {
    const n = typeof x === "number" ? x : Number.parseInt(String(x), 10);
    if (Number.isInteger(n)) out.push(n);
  }
  return out;
}

/**
 * @param {unknown} val
 * @returns {number[][]|null}
 */
function parseAuthoritativeCardGrid(val) {
  if (!Array.isArray(val) || val.length !== 5) return null;
  /** @type {number[][]} */
  const rows = [];
  for (const row of val) {
    if (!Array.isArray(row) || row.length !== 5) return null;
    /** @type {number[]} */
    const nums = [];
    for (const cell of row) {
      const n =
        typeof cell === "number" && Number.isInteger(cell) ? cell : Number.parseInt(String(cell ?? ""), 10);
      if (!Number.isFinite(n)) return null;
      nums.push(Math.trunc(n));
    }
    rows.push(nums);
  }
  return rows;
}

/**
 * @param {unknown} cardsRaw
 * @returns {Record<string, number[][]>|null}
 */
function parseDeckCardsBySeat(cardsRaw) {
  if (!cardsRaw || typeof cardsRaw !== "object" || Array.isArray(cardsRaw)) return null;
  const obj = /** @type {Record<string, unknown>} */ (cardsRaw);
  /** @type {Record<string, number[][]>} */
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const grid = parseAuthoritativeCardGrid(v);
    if (grid) out[k] = grid;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * @param {Record<string, number[][]>|null|undefined} deckCardsBySeat
 * @param {string|null|undefined} seed
 * @param {string|null|undefined} roundId
 * @param {number|null|undefined} seatIndex
 * @returns {number[][]|null}
 */
export function resolveOv2BingoSeatCard(deckCardsBySeat, seed, roundId, seatIndex) {
  if (seatIndex == null || !Number.isInteger(seatIndex)) return null;
  const fromDeck = deckCardsBySeat?.[String(seatIndex)];
  if (fromDeck) return fromDeck;
  if (seed && roundId != null) {
    try {
      return getCardForSeat({ seed, roundId, seatIndex });
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {unknown} row
 * @returns {Ov2BingoMemberVm}
 */
export function normalizeMemberRow(row) {
  const r = row && typeof row === "object" ? /** @type {Record<string, unknown>} */ (row) : {};
  const meta = r.meta && typeof r.meta === "object" ? /** @type {Record<string, unknown>} */ (r.meta) : {};
  const bingo = meta.bingo && typeof meta.bingo === "object" ? /** @type {Record<string, unknown>} */ (meta.bingo) : {};
  const rr = bingo.rematch_requested;
  const rematchRequested =
    rr === true || rr === "true" || rr === "t" || rr === "1" || (typeof rr === "string" && rr.toLowerCase() === "true");
  const si = r.seat_index;
  const seatIndex = si == null || si === "" ? null : num(si, NaN);
  return {
    participantKey: String(r.participant_key ?? "").trim(),
    displayName: String(r.display_name ?? "").trim() || "שחקן",
    seatIndex: Number.isInteger(seatIndex) && seatIndex >= 0 && seatIndex <= 7 ? seatIndex : null,
    isReady: r.is_ready === true,
    walletState: String(r.wallet_state ?? "none"),
    amountLocked: Math.floor(num(r.amount_locked, 0)),
    rematchRequested,
  };
}

/**
 * @param {unknown[]} members
 * @returns {boolean}
 */
function allSeatedCommitted(members) {
  const seated = members.filter(m => m && m.seatIndex != null);
  if (seated.length < 2) return false;
  return seated.every(m => m.walletState === "committed");
}

/**
 * PostgREST sometimes wraps JSON/JSONB RPC bodies in a single-element array.
 * @param {unknown} data
 */
function unwrapRpcJsonBody(data) {
  if (Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === "object") {
    return data[0];
  }
  return data;
}

/**
 * @param {unknown} v
 */
function rpcOkTruthy(v) {
  return v === true || v === "true" || v === "t" || v === 1;
}

/**
 * Recompute {@link Ov2BingoAuthoritativeSnapshot} capability flags after a merge or partial update.
 *
 * @param {Ov2BingoAuthoritativeSnapshot|null|undefined} snap
 * @param {string|null|undefined} viewerParticipantKey
 * @returns {Ov2BingoAuthoritativeSnapshot|null}
 */
export function applyOv2BingoSnapshotCapabilities(snap, viewerParticipantKey) {
  if (!snap || typeof snap !== "object") return null;
  const pk = viewerParticipantKey != null ? String(viewerParticipantKey).trim() : "";
  const caps = computeCapabilityFlags(pk, /** @type {Ov2BingoAuthoritativeSnapshot} */ (snap));
  return { ...snap, ...caps };
}

/**
 * Prefer a fresh `ov2_bingo_get_snapshot` payload but keep an in-memory session row when the server
 * returns `session: null` while `room.active_session_id` still matches the last known session
 * (avoids dropping into "waiting for host" after a successful `open_session` + poll race).
 *
 * @param {Ov2BingoAuthoritativeSnapshot|null|undefined} prev
 * @param {Ov2BingoAuthoritativeSnapshot|null|undefined} next
 * @param {string|null|undefined} viewerParticipantKey
 * @returns {Ov2BingoAuthoritativeSnapshot|null}
 */
export function coalesceOv2BingoLiveSnapshots(prev, next, viewerParticipantKey) {
  if (!next) return prev ?? null;
  const pk = viewerParticipantKey != null ? String(viewerParticipantKey).trim() : "";

  if (!prev || String(prev.roomId) !== String(next.roomId)) {
    return next;
  }

  if (next.sessionId) {
    return next;
  }

  if (!prev.sessionId) {
    return next;
  }

  const life = String(next.roomLifecyclePhase || "");
  if (life !== "active") {
    return next;
  }

  const nextRoomSid = next.roomActiveSessionId != null ? String(next.roomActiveSessionId).trim() : "";
  if (!nextRoomSid || nextRoomSid !== String(prev.sessionId)) {
    return next;
  }

  const merged = {
    ...next,
    sessionId: prev.sessionId,
    sessionPhase: prev.sessionPhase,
    matchSeq: prev.matchSeq,
    revision: prev.revision,
    roundId: prev.roundId,
    seed: prev.seed,
    activeSeats: Array.isArray(next.activeSeats) && next.activeSeats.length ? next.activeSeats : prev.activeSeats,
    callerParticipantKey: prev.callerParticipantKey ?? next.callerParticipantKey,
    lastNumber: prev.lastNumber,
    calledNumbers: Array.isArray(prev.calledNumbers) ? prev.calledNumbers : [],
    deckPosition: prev.deckPosition,
    deckTotal: prev.deckTotal || next.deckTotal,
    nextCallAtIso: prev.nextCallAtIso,
    startedAtIso: prev.startedAtIso,
    finishedAtIso: prev.finishedAtIso,
    entryFee: prev.entryFee,
    potTotal: prev.potTotal,
    rowPrizeAmount: prev.rowPrizeAmount,
    walkoverPayoutAmount: prev.walkoverPayoutAmount,
    winner: prev.winner,
    deckCardsBySeat: prev.deckCardsBySeat ?? next.deckCardsBySeat,
    claims: Array.isArray(prev.claims) ? prev.claims : next.claims,
    availablePrizeKeys: Array.isArray(next.availablePrizeKeys) && next.availablePrizeKeys.length
      ? next.availablePrizeKeys
      : prev.availablePrizeKeys,
  };
  merged.callerSeatIndex = resolveCallerSeat(merged.activeSeats);

  return applyOv2BingoSnapshotCapabilities(merged, pk);
}

/**
 * @param {string|null|undefined} viewerPk
 * @param {Ov2BingoAuthoritativeSnapshot} snap
 */
function computeCapabilityFlags(viewerPk, snap) {
  const pk = viewerPk != null ? String(viewerPk).trim() : "";
  const host = snap.roomHostParticipantKey != null ? String(snap.roomHostParticipantKey).trim() : "";
  const isHost = Boolean(pk && host && pk === host);
  const life = snap.roomLifecyclePhase != null ? String(snap.roomLifecyclePhase) : "";
  const activeRoom = life === "active";
  const sess = snap.sessionId != null ? String(snap.sessionId) : "";
  const phase = snap.sessionPhase != null ? String(snap.sessionPhase) : "";
  const playing = phase === "playing";

  const canOpenSession =
    isHost &&
    activeRoom &&
    !sess &&
    allSeatedCommitted(snap.members);

  const nextAt = snap.nextCallAtIso ? Date.parse(snap.nextCallAtIso) : NaN;
  const nowOk = !Number.isFinite(nextAt) || Date.now() >= nextAt;
  const deckLeft = snap.deckTotal > 0 ? snap.deckPosition < snap.deckTotal : false;

  const isCaller = Boolean(pk && snap.callerParticipantKey && pk === snap.callerParticipantKey);
  const canCallNext = Boolean(playing && isCaller && nowOk && deckLeft && sess);

  const canClaimAnyPrize = false;

  const finished = phase === "finished";
  const seatedCommitted = (snap.members || []).filter(
    m => m && m.seatIndex != null && String(m.walletState || "").trim() === "committed"
  );
  const eligibleRematch = seatedCommitted.length;
  const viewerRow = pk ? (snap.members || []).find(m => m && String(m.participantKey || "").trim() === pk) : null;
  const myRematchRequested = Boolean(viewerRow?.rematchRequested);
  const readyRematch = seatedCommitted.filter(m => m.rematchRequested).length;
  let canRequestRematch = false;
  let canCancelRematch = false;
  let canStartNextMatch = false;
  if (finished && sess && eligibleRematch >= 2) {
    canRequestRematch = Boolean(
      pk && viewerRow && viewerRow.seatIndex != null && String(viewerRow.walletState || "").trim() === "committed" && !myRematchRequested
    );
    canCancelRematch = Boolean(pk && myRematchRequested);
    canStartNextMatch = Boolean(isHost && eligibleRematch >= 2 && readyRematch >= eligibleRematch);
  }

  return {
    canOpenSession,
    canCallNext,
    canClaimAnyPrize,
    canRequestRematch,
    canCancelRematch,
    canStartNextMatch,
  };
}

/**
 * @param {unknown} rawSnapshot - RPC `snapshot` object
 * @param {{ viewerParticipantKey?: string|null }} [opts]
 * @returns {Ov2BingoAuthoritativeSnapshot|null}
 */
export function normalizeOv2BingoAuthoritativeSnapshot(rawSnapshot, opts) {
  if (!rawSnapshot || typeof rawSnapshot !== "object") return null;
  const root = /** @type {Record<string, unknown>} */ (rawSnapshot);
  const roomRaw = root.room && typeof root.room === "object" ? /** @type {Record<string, unknown>} */ (root.room) : null;
  const sessionRaw =
    root.session && typeof root.session === "object" ? /** @type {Record<string, unknown>} */ (root.session) : null;
  const membersRaw = Array.isArray(root.members) ? /** @type {unknown[]} */ (root.members) : [];
  const claimsRaw = Array.isArray(root.claims) ? /** @type {unknown[]} */ (root.claims) : [];

  const roomId = roomRaw?.id != null ? String(roomRaw.id) : "";
  if (!roomId) return null;

  const members = membersRaw.map(normalizeMemberRow);
  const memberSeatByPk = new Map(
    members.map(m => [m.participantKey, m.seatIndex]).filter(([pk]) => Boolean(pk && String(pk).trim()))
  );
  const claims = claimsRaw.map(c => {
    const r = c && typeof c === "object" ? /** @type {Record<string, unknown>} */ (c) : {};
    const pkClaim = String(r.claimed_by_participant_key ?? "").trim();
    const rawSeat = num(r.seat_index, NaN);
    const memSeat = memberSeatByPk.get(pkClaim);
    let seatIndex = rawSeat;
    if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex > 7) {
      seatIndex =
        memSeat != null && Number.isInteger(memSeat) && memSeat >= 0 && memSeat <= 7 ? memSeat : 0;
    }
    return {
      id: String(r.id ?? ""),
      prizeKey: String(r.prize_key ?? ""),
      claimedByParticipantKey: pkClaim,
      claimedByName: String(r.claimed_by_name ?? ""),
      seatIndex,
      amount: num(r.amount, 0),
      lineKind: String(r.line_kind ?? ""),
    };
  });

  let sessionId = null;
  let sessionPhase = null;
  let matchSeq = num(roomRaw?.match_seq, 0);
  let revision = 0;
  let roundId = null;
  let seed = null;
  let activeSeats = [];
  let callerParticipantKey = null;
  let lastNumber = null;
  let calledNumbers = [];
  let deckPosition = 0;
  let deckTotal = 75;
  let nextCallAtIso = null;
  let startedAtIso = null;
  let finishedAtIso = null;
  let entryFee = 0;
  let potTotal = 0;
  let rowPrizeAmount = 0;
  /** @type {number|null} */
  let walkoverPayoutAmount = null;
  let winner = { participantKey: null, name: null };
  /** @type {Record<string, number[][]>|null} */
  let deckCardsBySeat = null;

  if (sessionRaw) {
    sessionId = sessionRaw.id != null ? String(sessionRaw.id) : null;
    sessionPhase = sessionRaw.phase != null ? String(sessionRaw.phase) : null;
    matchSeq = num(sessionRaw.match_seq, matchSeq);
    revision = Math.floor(num(sessionRaw.revision, 0));
    roundId = sessionRaw.round_id != null ? String(sessionRaw.round_id) : null;
    seed = sessionRaw.seed != null ? String(sessionRaw.seed) : null;
    activeSeats = parseJsonNumberArray(sessionRaw.active_seats);
    callerParticipantKey = sessionRaw.caller_participant_key != null ? String(sessionRaw.caller_participant_key) : null;
    lastNumber = sessionRaw.last_number == null ? null : num(sessionRaw.last_number, NaN);
    if (!Number.isInteger(lastNumber)) lastNumber = null;
    calledNumbers = parseJsonNumberArray(sessionRaw.called);
    deckPosition = Math.floor(num(sessionRaw.deck_pos, 0));
    const deckObj = sessionRaw.deck && typeof sessionRaw.deck === "object" ? /** @type {Record<string, unknown>} */ (sessionRaw.deck) : null;
    deckCardsBySeat = parseDeckCardsBySeat(deckObj?.cards);
    const order = deckObj && Array.isArray(deckObj.order) ? deckObj.order : [];
    deckTotal = order.length > 0 ? order.length : 75;
    nextCallAtIso = sessionRaw.next_call_at != null ? String(sessionRaw.next_call_at) : null;
    startedAtIso = sessionRaw.started_at != null ? String(sessionRaw.started_at) : null;
    finishedAtIso = sessionRaw.finished_at != null ? String(sessionRaw.finished_at) : null;
    entryFee = num(sessionRaw.entry_fee, 0);
    potTotal = num(sessionRaw.pot_total, 0);
    rowPrizeAmount = num(sessionRaw.row_prize_amount, 0);
    if (sessionRaw.walkover_payout_amount != null && sessionRaw.walkover_payout_amount !== "") {
      const wv = num(sessionRaw.walkover_payout_amount, NaN);
      walkoverPayoutAmount = Number.isFinite(wv) && wv >= 0 ? Math.floor(wv) : null;
    }
    const wpk = sessionRaw.winner_participant_key;
    const wn = sessionRaw.winner_name;
    winner = {
      participantKey: wpk != null ? String(wpk) : null,
      name: wn != null ? String(wn) : null,
    };
  }

  const callerSeatIndex = resolveCallerSeat(activeSeats);

  const viewerPk = opts?.viewerParticipantKey != null ? String(opts.viewerParticipantKey).trim() : "";
  const availablePrizeKeys = [];

  /** @type {Ov2BingoAuthoritativeSnapshot} */
  const snap = {
    roomId,
    roomLifecyclePhase: roomRaw?.lifecycle_phase != null ? String(roomRaw.lifecycle_phase) : null,
    roomHostParticipantKey: roomRaw?.host_participant_key != null ? String(roomRaw.host_participant_key) : null,
    roomMatchSeq: num(roomRaw?.match_seq, 0),
    roomActiveSessionId: roomRaw?.active_session_id != null ? String(roomRaw.active_session_id) : null,
    sessionId,
    sessionPhase,
    matchSeq,
    revision,
    roundId,
    seed,
    activeSeats,
    members,
    callerParticipantKey,
    callerSeatIndex,
    lastNumber,
    calledNumbers,
    deckPosition,
    deckTotal,
    nextCallAtIso,
    startedAtIso,
    finishedAtIso,
    claims,
    winner,
    entryFee,
    potTotal,
    rowPrizeAmount,
    walkoverPayoutAmount,
    deckCardsBySeat,
    availablePrizeKeys,
    canOpenSession: false,
    canCallNext: false,
    canClaimAnyPrize: false,
    canRequestRematch: false,
    canCancelRematch: false,
    canStartNextMatch: false,
  };

  return applyOv2BingoSnapshotCapabilities(snap, viewerPk);
}

/**
 * @param {unknown} data — raw RPC body
 * @param {{ viewerParticipantKey?: string|null }} [opts]
 * @returns {{ ok: true, snapshot: Ov2BingoAuthoritativeSnapshot } | { ok: false, error?: string, code?: string }}
 */
export function parseOv2BingoRpcSnapshotPayload(data, opts) {
  const unwrapped = unwrapRpcJsonBody(data);
  if (!unwrapped || typeof unwrapped !== "object") {
    return { ok: false, error: "תגובה לא תקינה" };
  }
  const d = /** @type {Record<string, unknown>} */ (unwrapped);
  if (rpcOkTruthy(d.ok) && d.snapshot != null && typeof d.snapshot === "object") {
    const snap = normalizeOv2BingoAuthoritativeSnapshot(d.snapshot, opts);
    if (!snap) return { ok: false, error: "תמונת מצב לא תקינה" };
    return { ok: true, snapshot: snap };
  }
  if (d.ok === false) {
    const msg = typeof d.message === "string" ? d.message : "הבקשה נכשלה";
    const code = typeof d.code === "string" ? d.code : undefined;
    return { ok: false, error: msg, code };
  }
  return { ok: false, error: "תגובה לא תקינה" };
}

/**
 * @param {string} roomId
 * @param {{ signal?: AbortSignal, viewerParticipantKey?: string|null }} [_opts]
 * @returns {Promise<
 *   | { ok: true, snapshot: Ov2BingoAuthoritativeSnapshot }
 *   | { ok: false, forbidden?: boolean, httpStatus?: number }
 * >}
 */
export async function fetchOv2BingoLiveRoundSnapshot(roomId, _opts) {
  if (!roomId) return { ok: false };
  const viewerParticipantKey = _opts?.viewerParticipantKey != null ? String(_opts.viewerParticipantKey).trim() : "";
  try {
    const res = await fetch(`/api/arcade/rooms/${encodeURIComponent(roomId)}/bingo-snapshot`, {
      credentials: "same-origin",
    });
    if (res.status === 403) {
      return { ok: false, forbidden: true, httpStatus: 403 };
    }
    const body = await res.json().catch(() => ({}));
    if (!body || typeof body !== "object") return { ok: false, httpStatus: res.status };
    const b = /** @type {Record<string, unknown>} */ (body);
    if (!rpcOkTruthy(b.ok) || b.snapshot == null || typeof b.snapshot !== "object") {
      return { ok: false, httpStatus: res.status };
    }
    const snapshot = normalizeOv2BingoAuthoritativeSnapshot(b.snapshot, { viewerParticipantKey });
    if (!snapshot) return { ok: false, httpStatus: res.status };
    return { ok: true, snapshot };
  } catch {
    return { ok: false };
  }
}

/**
 * @typedef {Object} Ov2BingoSnapshotSubscriptionHandlers
 * @property {string|null} [viewerParticipantKey]
 * @property {(snapshot: Ov2BingoAuthoritativeSnapshot) => void} onSnapshot
 * @property {() => void} [onAccessLost]
 * @property {(err: Error) => void} [onError]
 */

/**
 * @param {string} roomId
 * @param {Ov2BingoSnapshotSubscriptionHandlers} handlers
 * @returns {() => void} unsubscribe
 */
export function subscribeOv2BingoAuthoritativeSnapshot(roomId, handlers) {
  if (!roomId || typeof handlers?.onSnapshot !== "function") {
    return () => {};
  }
  const viewerParticipantKey = handlers.viewerParticipantKey != null ? String(handlers.viewerParticipantKey).trim() : "";
  let cancelled = false;
  /** @type {ReturnType<typeof setInterval>|0} */
  let poll = 0;

  const stop = () => {
    cancelled = true;
    if (typeof window !== "undefined" && poll) window.clearInterval(poll);
    poll = 0;
  };

  const pushLatest = async () => {
    if (cancelled) return;
    try {
      const result = await fetchOv2BingoLiveRoundSnapshot(roomId, { viewerParticipantKey });
      if (cancelled) return;
      if (!result.ok) {
        if (result.forbidden) {
          stop();
          handlers.onAccessLost?.();
        }
        return;
      }
      handlers.onSnapshot(result.snapshot);
    } catch (e) {
      if (handlers.onError) handlers.onError(e instanceof Error ? e : new Error(String(e)));
    }
  };

  void pushLatest();
  poll =
    typeof window !== "undefined"
      ? window.setInterval(() => {
          void pushLatest();
        }, 2500)
      : 0;

  return stop;
}

/**
 * @param {string} roomId
 * @param {string} hostParticipantKey
 * @returns {Promise<{ ok: boolean, snapshot?: Ov2BingoAuthoritativeSnapshot, error?: string, code?: string, idempotent?: boolean }>}
 */
export async function openOv2BingoSession(roomId, hostParticipantKey) {
  const host = hostParticipantKey != null ? String(hostParticipantKey).trim() : "";
  if (!roomId || !host) return { ok: false, error: "נדרש מזהה חדר ומארח" };
  const result = await fetchOv2BingoLiveRoundSnapshot(roomId, { viewerParticipantKey: host });
  if (result.ok) return { ok: true, snapshot: result.snapshot, idempotent: true };
  return { ok: false, error: "אין סשן פעיל" };
}

/**
 * @param {string} roomId
 * @param {string} participantKey
 * @param {number|null|undefined} expectedRevision
 */
export async function callOv2BingoNext(roomId, participantKey, expectedRevision) {
  const pk = participantKey != null ? String(participantKey).trim() : "";
  if (!roomId || !pk) return { ok: false, error: "נדרש מזהה חדר ושחקן" };
  try {
    const res = await fetch("/api/arcade/games/bingo/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        action: "call_next",
        expectedRevision:
          expectedRevision != null && Number.isFinite(Number(expectedRevision)) ? Math.floor(Number(expectedRevision)) : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return parseOv2BingoRpcSnapshotPayload(data, { viewerParticipantKey: pk });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @param {string} roomId
 * @param {string} prizeKey
 * @param {string} participantKey
 * @param {number|null|undefined} expectedRevision
 */
export async function claimOv2BingoPrize(roomId, prizeKey, participantKey, expectedRevision) {
  const pk = participantKey != null ? String(participantKey).trim() : "";
  const key = prizeKey != null ? String(prizeKey).trim() : "";
  if (!roomId || !pk || !key) return { ok: false, error: "חסרים פרטי חדר, פרס או שחקן" };
  try {
    const res = await fetch("/api/arcade/games/bingo/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        action: "claim_prize",
        prizeKey: key,
        expectedRevision:
          expectedRevision != null && Number.isFinite(Number(expectedRevision)) ? Math.floor(Number(expectedRevision)) : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return parseOv2BingoRpcSnapshotPayload(data, { viewerParticipantKey: pk });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @param {string} roomId
 * @param {string} participantKey
 */
export async function requestOv2BingoRematch(roomId, participantKey) {
  const pk = participantKey != null ? String(participantKey).trim() : "";
  if (!roomId || !pk) return { ok: false, error: "נדרש מזהה חדר ושחקן" };
  try {
    const res = await fetch("/api/arcade/games/bingo/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, action: "request_rematch" }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && typeof data === "object" && /** @type {Record<string, unknown>} */ (data).ok === true) {
      return { ok: true, idempotent: true };
    }
    return { ok: false, error: "תגובה לא תקינה" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @param {string} roomId
 * @param {string} participantKey
 */
export async function cancelOv2BingoRematch(roomId, participantKey) {
  const pk = participantKey != null ? String(participantKey).trim() : "";
  if (!roomId || !pk) return { ok: false, error: "נדרש מזהה חדר ושחקן" };
  try {
    const res = await fetch("/api/arcade/games/bingo/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, action: "cancel_rematch" }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && typeof data === "object" && /** @type {Record<string, unknown>} */ (data).ok === true) {
      return { ok: true, idempotent: true };
    }
    return { ok: false, error: "תגובה לא תקינה" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @param {string} roomId
 * @param {string} hostParticipantKey
 * @param {number|null|undefined} expectedMatchSeq
 */
export async function startOv2BingoNextMatch(roomId, hostParticipantKey, expectedMatchSeq) {
  const host = hostParticipantKey != null ? String(hostParticipantKey).trim() : "";
  if (!roomId || !host) return { ok: false, error: "נדרש מזהה חדר ומארח" };
  try {
    const res = await fetch("/api/arcade/games/bingo/action", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        action: "start_next_match",
        expectedMatchSeq:
          expectedMatchSeq != null && Number.isFinite(Number(expectedMatchSeq)) ? Math.floor(Number(expectedMatchSeq)) : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && typeof data === "object" && /** @type {Record<string, unknown>} */ (data).ok === true) {
      return { ok: true };
    }
    return { ok: false, error: "תגובה לא תקינה" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Deprecated alias — use {@link claimOv2BingoPrize}. */
export async function submitOv2BingoClaimIntent(payload) {
  const p = payload && typeof payload === "object" ? /** @type {Record<string, unknown>} */ (payload) : {};
  const roomId = p.roomId != null ? String(p.roomId) : "";
  const prizeKey = p.prizeKey != null ? String(p.prizeKey) : "";
  const participantKey = p.participantKey != null ? String(p.participantKey) : "";
  const rev = p.expectedRevision;
  if (!roomId || !prizeKey || !participantKey) return { ok: false, error: "חסרים פרטי בקשה" };
  const r = await claimOv2BingoPrize(roomId, prizeKey, participantKey, rev != null ? Number(rev) : null);
  if (r.ok && "snapshot" in r) return { ok: true };
  return { ok: false, error: "error" in r ? r.error : "נכשל" };
}
