import { writeAdminAuditRow } from "../../admin-server/admin-audit.server.js";

const DIAMOND_SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

const DEFAULT_SETTINGS = Object.freeze({
  system_enabled: true,
  daily_cap_mode: "none",
  global_daily_cap: null,
  solo_daily_cap: null,
  surprise_box_daily_cap: null,
  per_game_daily_cap: null,
});

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getDiamondSettings(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_diamond_settings")
    .select("settings_json")
    .eq("id", DIAMOND_SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...(data?.settings_json || {}) };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Record<string, unknown>} patch
 */
export async function updateDiamondSettings(supabase, patch) {
  const current = await getDiamondSettings(supabase);
  const next = { ...current, ...patch };
  const { data, error } = await supabase
    .from("reward_economy_diamond_settings")
    .update({ settings_json: next, updated_at: new Date().toISOString() })
    .eq("id", DIAMOND_SETTINGS_ID)
    .select("settings_json")
    .single();

  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...(data?.settings_json || {}) };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentDiamondBalance(supabase, studentId) {
  const { data, error } = await supabase
    .from("student_diamond_balances")
    .select("balance, lifetime_earned, lifetime_spent")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  return {
    balance: Math.floor(Number(data?.balance ?? 0)),
    lifetimeEarned: Math.floor(Number(data?.lifetime_earned ?? 0)),
    lifetimeSpent: Math.floor(Number(data?.lifetime_spent ?? 0)),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} params
 */
export async function applyDiamondMove(supabase, params) {
  const {
    studentId,
    direction = "earn",
    amount,
    idempotencyKey = null,
    sourceType,
    sourceId = null,
    metadata = {},
    reason,
  } = params;

  const amt = Math.floor(Number(amount) || 0);
  if (!studentId || amt <= 0) {
    return { ok: false, code: "invalid_amount", message: "Invalid diamond amount" };
  }

  const settings = await getDiamondSettings(supabase);
  if (settings.system_enabled === false && direction === "earn") {
    const bal = await getStudentDiamondBalance(supabase, studentId);
    return { ok: true, skipped: true, amount: 0, balanceAfter: bal.balance, duplicate: false };
  }

  const { data, error } = await supabase.rpc("diamond_apply", {
    p_student_id: studentId,
    p_direction: direction,
    p_amount: amt,
    p_idempotency_key: idempotencyKey,
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_metadata: metadata,
    p_reason: reason,
  });

  if (error) {
    return { ok: false, code: "rpc_error", message: error.message };
  }

  const result = typeof data === "string" ? JSON.parse(data) : data;
  if (!result?.ok) {
    return {
      ok: false,
      code: result?.code || "diamond_failed",
      message: result?.error || "diamond_failed",
    };
  }

  return {
    ok: true,
    duplicate: result.duplicate === true,
    transactionId: result.transaction_id || null,
    balanceAfter: Math.floor(Number(result.balance_after ?? 0)),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ studentId?: string, limit?: number, offset?: number }} [opts]
 */
export async function listDiamondTransactions(supabase, { studentId, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from("diamond_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (studentId) query = query.eq("student_id", studentId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * @param {Record<string, unknown>|null|undefined} diamondRules
 * @param {Record<string, unknown>} metrics
 */
export function calculateSoloGameDiamonds(diamondRules, metrics) {
  const rules = diamondRules && typeof diamondRules === "object" ? diamondRules : null;
  if (!rules?.enabled) {
    return { diamonds: 0, breakdownHe: "-" };
  }

  const didWin = metrics?.didWin === true;
  if (rules.onlyOnWin === true && !didWin) {
    return { diamonds: 0, breakdownHe: "אין יהלומים - לא הושג ניצחון" };
  }

  const score = Math.floor(Number(metrics?.score) || 0);
  const inGameCollected = Math.floor(
    Number(metrics?.diamondsCollected ?? metrics?.inGameDiamonds) || 0
  );
  const mode = String(rules.mode || "win_only");
  let total = 0;
  const breakdown = [];

  if (mode === "in_game_collect") {
    const mult = Number(rules.inGameCollectMultiplier || 1);
    total = Math.floor(inGameCollected * mult);
    if (total > 0) breakdown.push(`במשחק: ${total}`);
  } else {
    const fixed = Math.floor(Number(rules.fixedAmount || 0));
    if (fixed > 0) {
      total += fixed;
      breakdown.push(`בסיס: ${fixed}`);
    }
    for (const tier of Array.isArray(rules.tiers) ? rules.tiers : []) {
      const minScore = Math.floor(Number(tier?.minScore) || 0);
      const tierAmount = Math.floor(Number(tier?.amount) || 0);
      if (tierAmount > 0 && score >= minScore) {
        total += tierAmount;
        breakdown.push(`ניקוד ${minScore}+: +${tierAmount}`);
      }
    }
  }

  const cap = Math.floor(Number(rules.maxPerSession || 0));
  if (cap > 0) total = Math.min(total, cap);
  total = Math.max(0, Math.floor(total));

  return {
    diamonds: total,
    breakdownHe: breakdown.length ? breakdown.join(" · ") : total > 0 ? "יהלומים" : "-",
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} params
 */
export async function adminAdjustDiamonds(supabase, params) {
  const { adminUserId, studentId, signedAmount, note, clientRequestId } = params;
  const amount = Math.floor(Number(signedAmount) || 0);
  if (!studentId || amount === 0) {
    return { ok: false, status: 400, code: "invalid_amount" };
  }

  const before = await getStudentDiamondBalance(supabase, studentId);
  const direction = amount > 0 ? "adjust" : "adjust";
  const absAmount = Math.abs(amount);
  const idempotencyKey = `admin_diamond:${adminUserId}:${clientRequestId}`;

  const result = await applyDiamondMove(supabase, {
    studentId,
    direction,
    amount: absAmount,
    idempotencyKey,
    sourceType: "admin_adjustment",
    sourceId: clientRequestId,
    metadata: {
      adjust_kind: amount > 0 ? "credit" : "debit",
      admin_user_id: adminUserId,
      note: note || null,
    },
    reason: note?.trim() || "admin_adjustment",
  });

  if (!result.ok) {
    return { ok: false, status: 500, code: result.code || "diamond_failed", message: result.message };
  }

  await writeAdminAuditRow(supabase, {
    adminUserId,
    targetType: "student",
    targetId: studentId,
    action: "admin_diamond_adjustment",
    beforeState: { balance: before.balance, studentId },
    afterState: {
      balance: result.balanceAfter,
      amountAdjusted: result.duplicate ? 0 : amount,
      duplicate: result.duplicate === true,
      note: note || null,
    },
    notes: note || null,
  });

  return {
    ok: true,
    duplicate: result.duplicate === true,
    balanceBefore: before.balance,
    balanceAfter: result.balanceAfter,
    amountAdjusted: result.duplicate ? 0 : amount,
  };
}
