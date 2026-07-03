/**
 * Internal coin moves via DB function `arcade_coin_apply` (idempotent per student).
 */

export const ARCADE_SOURCE_TYPES = {
  ENTRY: "arcade_entry",
  REFUND: "arcade_refund",
  REWARD: "arcade_reward",
};

function normalizeRpcResult(data) {
  if (data == null) return null;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(String(data));
  } catch {
    return null;
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} params
 * @param {string} params.studentId - authenticated student only (caller-enforced)
 */
export async function applyArcadeCoinMove(supabase, params) {
  const {
    studentId,
    direction,
    amount,
    idempotencyKey,
    sourceType,
    sourceId,
    metadata,
    reason,
  } = params;

  const { data, error } = await supabase.rpc("arcade_coin_apply", {
    p_student_id: studentId,
    p_direction: direction,
    p_amount: Math.floor(Number(amount)),
    p_idempotency_key: idempotencyKey || null,
    p_source_type: sourceType || null,
    p_source_id: sourceId != null ? String(sourceId) : null,
    p_metadata: metadata && typeof metadata === "object" ? metadata : {},
    p_reason: reason || "arcade",
  });

  if (error) {
    return {
      ok: false,
      code: "rpc_error",
      message: error.message || "coin_rpc_failed",
    };
  }

  const payload = normalizeRpcResult(data);
  if (!payload || payload.ok !== true) {
    const code = payload?.code || "coin_failed";
    const err = payload?.error || "coin_failed";
    return {
      ok: false,
      code,
      message: err,
      balance: payload?.balance,
    };
  }

  return {
    ok: true,
    duplicate: payload.duplicate === true,
    transactionId: payload.transaction_id,
    balanceAfter: payload.balance_after,
  };
}

export async function spendArcadeEntry(supabase, studentId, amount, idempotencyKey, meta = {}) {
  const result = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "spend",
    amount,
    idempotencyKey,
    sourceType: ARCADE_SOURCE_TYPES.ENTRY,
    sourceId: meta.sourceId != null ? String(meta.sourceId) : null,
    metadata: { ...meta },
    reason: "arcade_entry",
  });

  if (result.ok && meta.gameKey) {
    const { recordArcadeClubActivity } = await import("../club/game-hooks.server.js");
    await recordArcadeClubActivity(supabase, studentId, String(meta.gameKey), {
      joinedPublic: meta.roomType === "public" || meta.roomType === "quick",
    });
  }

  return result;
}

export async function refundArcadeEntry(supabase, studentId, amount, idempotencyKey, meta = {}) {
  return applyArcadeCoinMove(supabase, {
    studentId,
    direction: "earn",
    amount,
    idempotencyKey,
    sourceType: ARCADE_SOURCE_TYPES.REFUND,
    sourceId: meta.sourceId != null ? String(meta.sourceId) : null,
    metadata: { ...meta },
    reason: "arcade_refund",
  });
}

/** זיכוי מתנה לאחר ניצחון (קופת החדר). מפתח idempotency חובה למניעת כפילות. */
export async function earnArcadeReward(supabase, studentId, amount, idempotencyKey, meta = {}) {
  const result = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "earn",
    amount,
    idempotencyKey,
    sourceType: ARCADE_SOURCE_TYPES.REWARD,
    sourceId: meta.sourceId != null ? String(meta.sourceId) : null,
    metadata: { ...meta },
    reason: "arcade_reward",
  });

  if (result.ok && meta.gameKey) {
    const { recordArcadeClubActivity } = await import("../club/game-hooks.server.js");
    await recordArcadeClubActivity(supabase, studentId, String(meta.gameKey), { won: true });
  }

  return result;
}
