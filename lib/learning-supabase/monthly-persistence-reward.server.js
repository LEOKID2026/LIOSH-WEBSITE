/**
 * Child World — Phase 2.6+: Incremental monthly persistence rewards.
 *
 * Awards Learning Coins per Israel calendar month tier as minutes accumulate.
 * Cumulative tier targets from Admin/DB (e.g. 100→10K, 250→30K total).
 * Delta per tier = target cumulative minus already paid this month.
 *
 * Source of truth: sumStudentLearningCreditedMinutesInIsraelMonth (answers + parent + books + orphan).
 * Month boundaries: Asia/Jerusalem — never UTC.
 */

import { applyArcadeCoinMove } from "../arcade/server/arcade-coins.js";
import { isQaTestAccountEmail } from "../admin-server/admin-all-accounts.server.js";
import { isQaSimulationParentEmail } from "../parent-server/parent-student-limit.server.js";
import { getIsraelMonthBounds, getIsraelMonthBoundsForYearMonth } from "./israel-calendar.server.js";
import { sumStudentLearningCreditedMinutesInIsraelMonth } from "./learning-time-monthly-aggregate.server.js";
import { getMonthlyPersistenceTiersFromSettings } from "../rewards/server/reward-economy.server.js";
import { requireEconomyConfig } from "../rewards/server/economy-config.server.js";

export const MONTHLY_PERSISTENCE_SOURCE_TYPE = "monthly_persistence";
export const MONTHLY_PERSISTENCE_REASON = "monthly_persistence_reward";

const PRODUCTION_REWARD_EXCLUDED_PARENT_EMAILS = new Set(["demofamily@leo-k.com"]);

/** Production monthly rewards — exclude QA/simulation/demo parents. */
export function isMonthlyPersistenceProductionParentEmail(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email) return false;
  if (PRODUCTION_REWARD_EXCLUDED_PARENT_EMAILS.has(email)) return false;
  if (isQaSimulationParentEmail(email)) return false;
  if (isQaTestAccountEmail(email)) return false;
  if (email.endsWith("@leo.test")) return false;
  return true;
}

/**
 * @param {{ is_active?: boolean, account_kind?: string }} student
 * @param {string|null|undefined} parentEmail
 */
export function isProductionMonthlyPersistenceStudent(student, parentEmail) {
  if (student?.is_active !== true) return false;
  if (student?.account_kind && student.account_kind !== "registered") return false;
  return isMonthlyPersistenceProductionParentEmail(parentEmail);
}

async function loadAuthUserEmailById(supabase) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`auth_users_list_failed: ${error.message}`);
    }
    for (const user of data?.users || []) {
      if (user?.id) map.set(String(user.id), String(user.email || ""));
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return map;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function isStudentEligibleForMonthlyPersistenceAward(supabase, studentId) {
  const { data: student, error } = await supabase
    .from("students")
    .select("id, parent_id, is_active, account_kind")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !student) return false;

  let parentEmail = "";
  if (student.parent_id) {
    const { data: authData } = await supabase.auth.admin.getUserById(String(student.parent_id));
    parentEmail = authData?.user?.email ?? "";
  }
  return isProductionMonthlyPersistenceStudent(student, parentEmail);
}

/**
 * Resolve tiers from Admin/DB only.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function resolveMonthlyTiers(supabase) {
  return getMonthlyPersistenceTiersFromSettings(supabase);
}

/**
 * Highest tier reached (cumulative coins target). Returns null below minimum threshold.
 * @param {number} activeMinutes
 * @param {{ minutes: number, coins: number }[]} tiers
 */
export function resolveMonthlyPersistenceTier(activeMinutes, tiers) {
  if (!Array.isArray(tiers) || !tiers.length) return null;
  const minutes = Number(activeMinutes);
  const sorted = [...tiers].sort((a, b) => a.minutes - b.minutes);
  const minThreshold = sorted[0]?.minutes ?? 100;
  if (!Number.isFinite(minutes) || minutes < minThreshold) return null;

  let tier = null;
  for (const t of sorted) {
    if (minutes >= t.minutes) tier = t;
  }
  return tier;
}

/** Legacy lump-sum key (read-only compat — not written by incremental sync). */
export function buildMonthlyPersistenceIdempotencyKey(studentId, yearMonthIsrael) {
  return `monthly_persistence_${studentId}_${yearMonthIsrael}`;
}

/**
 * @param {string} studentId
 * @param {string} yearMonthIsrael
 * @param {number} tierMinutes
 */
export function buildMonthlyPersistenceTierIdempotencyKey(studentId, yearMonthIsrael, tierMinutes) {
  return `monthly_persistence_${studentId}_${yearMonthIsrael}_t${Math.floor(Number(tierMinutes))}`;
}

/**
 * @param {string} studentId
 * @param {string} yearMonthIsrael
 * @param {number} tierMinutes
 * @param {number} targetCoins
 */
export function buildMonthlyPersistenceTopupIdempotencyKey(
  studentId,
  yearMonthIsrael,
  tierMinutes,
  targetCoins
) {
  return `monthly_persistence_${studentId}_${yearMonthIsrael}_topup_t${Math.floor(Number(tierMinutes))}_c${Math.floor(Number(targetCoins))}`;
}

/**
 * @param {string} [yearMonthIsrael] - defaults to current Israel month
 */
export function resolveIsraelMonthContext(yearMonthIsrael) {
  if (yearMonthIsrael) {
    return getIsraelMonthBoundsForYearMonth(yearMonthIsrael);
  }
  return getIsraelMonthBounds();
}

/**
 * Sum completed session minutes for one student within Israel month bounds.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function sumCompletedSessionMinutesForIsraelMonth(
  supabase,
  studentId,
  startIso,
  endIso
) {
  let economyMonthlyCap = 0;
  try {
    const economy = await requireEconomyConfig(supabase);
    economyMonthlyCap = Math.floor(Number(economy?.globalCaps?.monthlyMinutesCap) || 0);
  } catch {
    /* economy config unavailable — use uncapped sum */
  }

  const result = await sumStudentLearningCreditedMinutesInIsraelMonth(
    supabase,
    studentId,
    startIso,
    endIso,
    {
      applyEconomyMonthlyCap: economyMonthlyCap > 0,
      economyMonthlyCap,
    }
  );

  return result.minutes;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} yearMonthIsrael
 */
export async function sumMonthlyPersistenceAlreadyPaid(supabase, studentId, yearMonthIsrael) {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("amount, direction")
    .eq("student_id", studentId)
    .eq("reason", MONTHLY_PERSISTENCE_REASON)
    .eq("source_id", yearMonthIsrael)
    .eq("direction", "earn");

  if (error) {
    throw new Error(`coin_transactions_sum_failed: ${error.message}`);
  }

  let total = 0;
  for (const row of data || []) {
    const amt = Math.floor(Number(row.amount) || 0);
    if (amt > 0) total += amt;
  }
  return total;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} yearMonthIsrael
 */
async function loadMonthlyPersistenceIdempotencyKeys(supabase, studentId, yearMonthIsrael) {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("idempotency_key")
    .eq("student_id", studentId)
    .eq("reason", MONTHLY_PERSISTENCE_REASON)
    .eq("source_id", yearMonthIsrael);

  if (error) {
    throw new Error(`coin_transactions_keys_failed: ${error.message}`);
  }

  return new Set(
    (data || [])
      .map((row) => (row?.idempotency_key != null ? String(row.idempotency_key) : ""))
      .filter(Boolean)
  );
}

/**
 * Pure: compute incremental awards needed to reach cumulative tier targets.
 * @param {number} activeMinutes
 * @param {{ minutes: number, coins: number }[]} tiers
 * @param {number} alreadyPaid
 * @param {{ studentId: string, yearMonthIsrael: string, existingKeys?: Set<string> }} ctx
 */
export function computeOutstandingTierDeltas(activeMinutes, tiers, alreadyPaid, ctx) {
  const { studentId, yearMonthIsrael, existingKeys = new Set() } = ctx;
  const sorted = [...(tiers || [])].sort((a, b) => a.minutes - b.minutes);
  /** @type {Array<{ tierMinutes: number, targetCoins: number, amount: number, idempotencyKey: string, kind: 'tier'|'topup' }>} */
  const deltas = [];
  let paid = Math.max(0, Math.floor(Number(alreadyPaid) || 0));

  for (const tier of sorted) {
    if (Number(activeMinutes) < tier.minutes) break;

    const target = Math.floor(Number(tier.coins) || 0);
    if (target <= 0 || paid >= target) continue;

    const amount = target - paid;
    if (amount <= 0) continue;

    const tierKey = buildMonthlyPersistenceTierIdempotencyKey(
      studentId,
      yearMonthIsrael,
      tier.minutes
    );
    const hasTierKey = existingKeys.has(tierKey);

    const idempotencyKey = hasTierKey
      ? buildMonthlyPersistenceTopupIdempotencyKey(
          studentId,
          yearMonthIsrael,
          tier.minutes,
          target
        )
      : tierKey;

    if (existingKeys.has(idempotencyKey)) {
      paid = Math.max(paid, target);
      continue;
    }

    deltas.push({
      tierMinutes: tier.minutes,
      targetCoins: target,
      amount,
      idempotencyKey,
      kind: hasTierKey ? "topup" : "tier",
    });
    paid = target;
  }

  return deltas;
}

/**
 * Build per-tier status for UI (read-only).
 * @param {number} activeMinutes
 * @param {{ minutes: number, coins: number }[]} tiers
 * @param {number} alreadyPaid
 */
export function buildMonthlyPersistenceTiersStatus(activeMinutes, tiers, alreadyPaid) {
  const sorted = [...(tiers || [])].sort((a, b) => a.minutes - b.minutes);
  const paid = Math.max(0, Math.floor(Number(alreadyPaid) || 0));

  return sorted.map((tier) => {
    const reached = Number(activeMinutes) >= tier.minutes;
    const target = Math.floor(Number(tier.coins) || 0);
    return {
      minutes: tier.minutes,
      targetCoins: target,
      reached,
      awarded: reached && paid >= target,
      locked: !reached,
    };
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function hasExistingMonthlyPersistenceAward(supabase, studentId, idempotencyKey) {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("id, amount, created_at")
    .eq("student_id", studentId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`coin_transactions_lookup_failed: ${error.message}`);
  }

  return data ?? null;
}

/**
 * Evaluate one student's monthly persistence (read-only).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ studentId: string, yearMonthIsrael?: string }} params
 */
export async function evaluateMonthlyPersistenceReward(supabase, { studentId, yearMonthIsrael }) {
  if (!studentId) {
    return { ok: false, code: "missing_student_id" };
  }

  const month = resolveIsraelMonthContext(yearMonthIsrael);
  const activeMinutes = await sumCompletedSessionMinutesForIsraelMonth(
    supabase,
    studentId,
    month.startIso,
    month.endIso
  );

  const tiers = await resolveMonthlyTiers(supabase);
  const tier = resolveMonthlyPersistenceTier(activeMinutes, tiers);
  const alreadyPaid = await sumMonthlyPersistenceAlreadyPaid(supabase, studentId, month.ym);
  const existingKeys = await loadMonthlyPersistenceIdempotencyKeys(supabase, studentId, month.ym);
  const targetCoins = tier?.coins ?? 0;
  const outstandingCoins = Math.max(0, targetCoins - alreadyPaid);
  const deltas = computeOutstandingTierDeltas(activeMinutes, tiers, alreadyPaid, {
    studentId,
    yearMonthIsrael: month.ym,
    existingKeys,
  });
  const totalWouldAward = deltas.reduce((sum, d) => sum + d.amount, 0);
  const tiersStatus = buildMonthlyPersistenceTiersStatus(activeMinutes, tiers, alreadyPaid);

  let skippedReason = null;
  if (!tier) {
    skippedReason = "below_minutes_threshold";
  } else if (totalWouldAward <= 0) {
    skippedReason = alreadyPaid >= targetCoins ? "already_awarded" : "no_outstanding_delta";
  }

  const legacyKey = buildMonthlyPersistenceIdempotencyKey(studentId, month.ym);
  const legacyTx = existingKeys.has(legacyKey)
    ? await hasExistingMonthlyPersistenceAward(supabase, studentId, legacyKey)
    : null;

  return {
    ok: true,
    studentId,
    yearMonthIsrael: month.ym,
    monthBounds: { startIso: month.startIso, endIso: month.endIso },
    activeMinutes,
    tierMinutes: tier?.minutes ?? null,
    targetCoins,
    alreadyPaid,
    outstandingCoins,
    wouldAward: totalWouldAward,
    totalWouldAward,
    deltas,
    tiersStatus,
    eligible: totalWouldAward > 0,
    skippedReason,
    alreadyAwarded: tier != null && alreadyPaid >= targetCoins,
    existingTransactionId: legacyTx?.id ?? null,
    idempotencyKey: legacyKey,
  };
}

/**
 * Incremental sync — award only outstanding tier deltas (idempotent).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ yearMonthIsrael?: string, dryRun?: boolean, skipProductionFilter?: boolean }} [options]
 */
export async function syncIncrementalMonthlyPersistenceRewards(
  supabase,
  studentId,
  { yearMonthIsrael, dryRun = false, skipProductionFilter = false } = {}
) {
  if (!studentId) {
    return { ok: false, code: "missing_student_id" };
  }

  if (!skipProductionFilter) {
    const eligible = await isStudentEligibleForMonthlyPersistenceAward(supabase, studentId);
    if (!eligible) {
      return {
        ok: true,
        skipped: true,
        reason: "student_not_eligible",
        studentId,
      };
    }
  }

  const evaluation = await evaluateMonthlyPersistenceReward(supabase, {
    studentId,
    yearMonthIsrael,
  });
  if (!evaluation.ok) return evaluation;

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      skipped: evaluation.totalWouldAward <= 0,
      reason: evaluation.skippedReason,
      ...evaluation,
    };
  }

  if (evaluation.totalWouldAward <= 0 || !evaluation.deltas?.length) {
    return {
      ok: true,
      skipped: true,
      duplicate: evaluation.skippedReason === "already_awarded",
      reason: evaluation.skippedReason,
      coinsAwarded: 0,
      awards: [],
      ...evaluation,
    };
  }

  /** @type {Array<Record<string, unknown>>} */
  const awards = [];
  let totalCoinsAwarded = 0;
  let lastBalanceAfter = null;

  for (const delta of evaluation.deltas) {
    const result = await applyArcadeCoinMove(supabase, {
      studentId,
      direction: "earn",
      amount: delta.amount,
      idempotencyKey: delta.idempotencyKey,
      sourceType: MONTHLY_PERSISTENCE_SOURCE_TYPE,
      sourceId: evaluation.yearMonthIsrael,
      metadata: {
        activeMinutes: evaluation.activeMinutes,
        tierMinutes: delta.tierMinutes,
        targetCoins: delta.targetCoins,
        yearMonthIsrael: evaluation.yearMonthIsrael,
        awardKind: delta.kind,
      },
      reason: MONTHLY_PERSISTENCE_REASON,
    });

    if (!result.ok) {
      return {
        ok: false,
        code: result.code || "rpc_failed",
        message: result.message,
        awards,
        coinsAwarded: totalCoinsAwarded,
        ...evaluation,
      };
    }

    if (!result.duplicate) {
      totalCoinsAwarded += delta.amount;
    }

    awards.push({
      ...delta,
      duplicate: result.duplicate === true,
      transactionId: result.transactionId,
      balanceAfter: result.balanceAfter,
    });
    lastBalanceAfter = result.balanceAfter;
  }

  if (totalCoinsAwarded > 0) {
    try {
      const { evaluateAndGrantAcquisitionCards } = await import(
        "../rewards/server/card-acquisition-engine.server.js"
      );
      await evaluateAndGrantAcquisitionCards(supabase, studentId);
    } catch {
      /* card grants are best-effort after monthly coins */
    }
  }

  return {
    ok: true,
    awarded: totalCoinsAwarded > 0,
    skipped: totalCoinsAwarded <= 0,
    duplicate: totalCoinsAwarded <= 0 && awards.every((a) => a.duplicate),
    coinsAwarded: totalCoinsAwarded,
    balanceAfter: lastBalanceAfter,
    awards,
    ...evaluation,
  };
}

/**
 * @deprecated Use syncIncrementalMonthlyPersistenceRewards — kept for test compat.
 */
export async function awardMonthlyPersistenceReward(supabase, { studentId, yearMonthIsrael }) {
  return syncIncrementalMonthlyPersistenceRewards(supabase, studentId, {
    yearMonthIsrael,
    dryRun: false,
    skipProductionFilter: true,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string[]} [studentIds]
 */
async function resolveTargetStudentIds(supabase, studentIds) {
  if (Array.isArray(studentIds) && studentIds.length > 0) {
    return studentIds.map(String).filter(Boolean);
  }

  const parentEmailById = await loadAuthUserEmailById(supabase);
  const pageSize = 1000;
  const ids = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("students")
      .select("id, parent_id, is_active, account_kind")
      .eq("is_active", true)
      .eq("account_kind", "registered")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error(`students_query_failed: ${error.message}`);
    }
    const chunk = data || [];
    for (const row of chunk) {
      const parentEmail = parentEmailById.get(String(row.parent_id)) || "";
      if (isProductionMonthlyPersistenceStudent(row, parentEmail)) {
        ids.push(String(row.id));
      }
    }
    if (chunk.length < pageSize) break;
  }

  return ids;
}

/**
 * Run monthly persistence award job for one or all students (incremental sync).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ yearMonthIsrael?: string, studentIds?: string[], dryRun?: boolean }} params
 */
export async function runMonthlyPersistenceAwardJob(
  supabase,
  { yearMonthIsrael, studentIds, dryRun = false } = {}
) {
  const month = resolveIsraelMonthContext(yearMonthIsrael);
  const targets = await resolveTargetStudentIds(supabase, studentIds);

  const results = [];
  let eligibleCount = 0;
  let awardedCount = 0;
  let skippedCount = 0;

  for (const studentId of targets) {
    const outcome = await syncIncrementalMonthlyPersistenceRewards(supabase, studentId, {
      yearMonthIsrael: month.ym,
      dryRun,
      skipProductionFilter: true,
    });
    results.push(outcome);

    if (outcome.totalWouldAward > 0 || outcome.coinsAwarded > 0) {
      eligibleCount += 1;
    }

    if (outcome.skipped || outcome.duplicate) {
      skippedCount += 1;
    } else if (outcome.awarded) {
      awardedCount += 1;
    } else if (outcome.ok === false) {
      skippedCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  return {
    ok: true,
    dryRun: dryRun === true,
    yearMonthIsrael: month.ym,
    monthBounds: { startIso: month.startIso, endIso: month.endIso },
    studentCount: targets.length,
    eligibleCount,
    awardedCount,
    skippedCount,
    results,
  };
}

/**
 * Slim payload for GET/home/profile (read-only — never awards).
 * @param {Record<string, unknown>} evalResult
 */
export function buildMonthlyPersistenceStatusPayload(evalResult) {
  if (!evalResult?.ok) return null;
  return {
    yearMonthIsrael: evalResult.yearMonthIsrael,
    activeMinutes: evalResult.activeMinutes,
    tierMinutes: evalResult.tierMinutes,
    wouldAward: evalResult.totalWouldAward ?? evalResult.wouldAward ?? 0,
    alreadyAwarded: evalResult.alreadyAwarded,
    alreadyPaid: evalResult.alreadyPaid,
    targetCoins: evalResult.targetCoins,
    outstandingCoins: evalResult.outstandingCoins,
    tiersStatus: evalResult.tiersStatus,
    eligible: evalResult.eligible,
  };
}
