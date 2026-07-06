import { isDbSchemaNotReadyError } from "../../teacher-server/teacher-audit.server.js";
import { getTodayIsraelMidnightUtc } from "../../learning-supabase/israel-calendar.server.js";
import { LEO_MINERS_GAME_KEY } from "../leo-miners-constants.js";

const DB_READY_CACHE_TTL_MS = 15_000;

/** @type {{ ready: boolean|null, checkedAt: number }} */
const dbReadyCache = { ready: null, checkedAt: 0 };

function defaultStateRow(studentId) {
  return {
    student_id: studentId,
    board_json: {},
    upgrades_json: {},
    mining_points_pending: 0,
    diamonds_pending: 0,
    offline_pending_json: {},
    last_seen_at: null,
    last_accrue_at: null,
    last_claim_at: null,
    reset_count: 0,
  };
}

/**
 * Detect whether leo_miners_state exists and is queryable.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function checkLeoMinersDbReady(supabase) {
  const now = Date.now();
  if (dbReadyCache.ready != null && now - dbReadyCache.checkedAt < DB_READY_CACHE_TTL_MS) {
    return dbReadyCache.ready;
  }

  const { error } = await supabase.from("leo_miners_state").select("student_id").limit(1);
  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      dbReadyCache.ready = false;
      dbReadyCache.checkedAt = now;
      return false;
    }
    throw error;
  }

  dbReadyCache.ready = true;
  dbReadyCache.checkedAt = now;
  return true;
}

export function invalidateLeoMinersDbReadyCache() {
  dbReadyCache.ready = null;
  dbReadyCache.checkedAt = 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getOrCreateMinersState(supabase, studentId) {
  const { data: existing, error: loadError } = await supabase
    .from("leo_miners_state")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (existing?.student_id) return existing;

  const seed = defaultStateRow(studentId);
  const { data: inserted, error: insertError } = await supabase
    .from("leo_miners_state")
    .insert(seed)
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function loadMinersStateView(supabase, studentId) {
  const row = await getOrCreateMinersState(supabase, studentId);
  return {
    ok: true,
    dbReady: true,
    gameKey: LEO_MINERS_GAME_KEY,
    state: {
      boardJson: row.board_json || {},
      upgradesJson: row.upgrades_json || {},
      miningPointsPending: Number(row.mining_points_pending || 0),
      diamondsPending: Math.floor(Number(row.diamonds_pending || 0)),
      offlinePendingJson: row.offline_pending_json || {},
      lastSeenAt: row.last_seen_at,
      lastAccrueAt: row.last_accrue_at,
      lastClaimAt: row.last_claim_at,
      resetCount: Math.floor(Number(row.reset_count || 0)),
      updatedAt: row.updated_at,
    },
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ boardJson?: unknown, upgradesJson?: unknown, clientSeenAt?: string|null }} payload
 */
export async function saveMinersBoardState(supabase, studentId, payload) {
  const now = new Date().toISOString();
  const patch = {
    updated_at: now,
    last_seen_at: payload.clientSeenAt || now,
  };

  if (payload.boardJson && typeof payload.boardJson === "object") {
    patch.board_json = payload.boardJson;
  }
  if (payload.upgradesJson && typeof payload.upgradesJson === "object") {
    patch.upgrades_json = payload.upgradesJson;
  }

  await getOrCreateMinersState(supabase, studentId);

  const { data, error } = await supabase
    .from("leo_miners_state")
    .update(patch)
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) throw error;
  return { ok: true, updatedAt: data.updated_at };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function resetMinersState(supabase, studentId) {
  const existing = await getOrCreateMinersState(supabase, studentId);
  const now = new Date().toISOString();
  const nextReset = Math.floor(Number(existing.reset_count || 0)) + 1;

  const { data, error } = await supabase
    .from("leo_miners_state")
    .update({
      board_json: {},
      upgrades_json: {},
      mining_points_pending: 0,
      diamonds_pending: 0,
      offline_pending_json: {},
      last_seen_at: now,
      last_accrue_at: null,
      last_claim_at: null,
      reset_count: nextReset,
      updated_at: now,
    })
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) throw error;
  return { ok: true, resetCount: data.reset_count, updatedAt: data.updated_at };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function sumDailyAccruedPoints(supabase, studentId) {
  const sinceIso = getTodayIsraelMidnightUtc().toISOString();
  const { data, error } = await supabase
    .from("leo_miners_accrue_log")
    .select("calculated_points")
    .eq("student_id", studentId)
    .eq("status", "applied")
    .gte("created_at", sinceIso);

  if (error) throw error;

  const total = (data || []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.calculated_points) || 0),
    0
  );
  return Number(total.toFixed(2));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function sumDailyClaimedCoins(supabase, studentId) {
  const sinceIso = getTodayIsraelMidnightUtc().toISOString();
  const { data, error } = await supabase
    .from("leo_miners_claim_log")
    .select("coins_granted")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .gte("created_at", sinceIso);

  if (error) throw error;

  return (data || []).reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row.coins_granted) || 0)),
    0
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function sumTotalClaimedCoins(supabase, studentId) {
  const { data, error } = await supabase
    .from("leo_miners_claim_log")
    .select("coins_granted")
    .eq("student_id", studentId)
    .eq("status", "completed");

  if (error) throw error;

  return (data || []).reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row.coins_granted) || 0)),
    0
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function sumDailyClaimedDiamonds(supabase, studentId) {
  const sinceIso = getTodayIsraelMidnightUtc().toISOString();
  const { data, error } = await supabase
    .from("leo_miners_claim_log")
    .select("diamonds_granted")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .gte("created_at", sinceIso);

  if (error) throw error;

  return (data || []).reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row.diamonds_granted) || 0)),
    0
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {number} pointsDelta
 * @param {{ lastAccrueAt?: string|null, lastSeenAt?: string|null }} [meta]
 */
export async function incrementMinersPendingPoints(supabase, studentId, pointsDelta, meta = {}) {
  const state = await getOrCreateMinersState(supabase, studentId);
  const now = new Date().toISOString();
  const nextPending = Number(
    (Number(state.mining_points_pending || 0) + Number(pointsDelta || 0)).toFixed(2)
  );

  const { data, error } = await supabase
    .from("leo_miners_state")
    .update({
      mining_points_pending: Math.max(0, nextPending),
      last_accrue_at: meta.lastAccrueAt || now,
      last_seen_at: meta.lastSeenAt || state.last_seen_at || now,
      updated_at: now,
    })
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atomically claim all pending mining points (prevents parallel double-claim).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function atomicClaimMinersPendingPoints(supabase, studentId) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const state = await getOrCreateMinersState(supabase, studentId);
    const pending = Number(state.mining_points_pending || 0);
    if (pending <= 0) {
      return { ok: false, pointsClaimed: 0 };
    }

    const now = new Date().toISOString();
    const { data: claimed, error } = await supabase
      .from("leo_miners_state")
      .update({
        mining_points_pending: 0,
        last_claim_at: now,
        last_seen_at: now,
        updated_at: now,
      })
      .eq("student_id", studentId)
      .eq("mining_points_pending", pending)
      .gt("mining_points_pending", 0)
      .select("mining_points_pending")
      .maybeSingle();

    if (error) throw error;
    if (claimed) {
      return { ok: true, pointsClaimed: pending };
    }
  }

  return { ok: false, pointsClaimed: 0 };
}

/**
 * Atomically claim all pending diamonds for chest open.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function atomicClaimMinersPendingDiamonds(supabase, studentId) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const state = await getOrCreateMinersState(supabase, studentId);
    const pending = Math.floor(Number(state.diamonds_pending || 0));
    if (pending <= 0) {
      return { ok: false, diamondsClaimed: 0 };
    }

    const now = new Date().toISOString();
    const { data: claimed, error } = await supabase
      .from("leo_miners_state")
      .update({
        diamonds_pending: 0,
        last_claim_at: now,
        last_seen_at: now,
        updated_at: now,
      })
      .eq("student_id", studentId)
      .eq("diamonds_pending", pending)
      .gt("diamonds_pending", 0)
      .select("diamonds_pending")
      .maybeSingle();

    if (error) throw error;
    if (claimed) {
      return { ok: true, diamondsClaimed: pending };
    }
  }

  return { ok: false, diamondsClaimed: 0 };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {number} pointsUsed
 * @param {number} diamondsUsed
 */
export async function decrementMinersPendingRewards(supabase, studentId, pointsUsed, diamondsUsed) {
  const state = await getOrCreateMinersState(supabase, studentId);
  const now = new Date().toISOString();
  const nextPoints = Math.max(
    0,
    Number((Number(state.mining_points_pending || 0) - Number(pointsUsed || 0)).toFixed(2))
  );
  const nextDiamonds = Math.max(
    0,
    Math.floor(Number(state.diamonds_pending || 0)) - Math.floor(Number(diamondsUsed || 0))
  );

  const { data, error } = await supabase
    .from("leo_miners_state")
    .update({
      mining_points_pending: nextPoints,
      diamonds_pending: nextDiamonds,
      last_claim_at: now,
      last_seen_at: now,
      updated_at: now,
    })
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
