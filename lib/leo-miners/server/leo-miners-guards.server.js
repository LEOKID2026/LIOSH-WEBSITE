import { isGuestStudent } from "../../guest/guest-display.js";
import { loadGuestRuntimeConfig } from "../../guest/guest-settings.server.js";
import { isDbSchemaNotReadyError } from "../../teacher-server/teacher-audit.server.js";
import {
  LEO_MINERS_ACTION_TYPES,
  LEO_MINERS_CLAIM_TYPES,
  LEO_MINERS_ERROR_CODES,
} from "../leo-miners-constants.js";
import { normalizeStageCounts } from "./leo-miners-formulas.server.js";
import { minersDbNotReadyResult } from "./leo-miners-errors.server.js";
import { checkLeoMinersDbReady } from "./leo-miners-state.server.js";

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9:_-]{8,120}$/;

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function assertMinersDbReady(supabase) {
  const ready = await checkLeoMinersDbReady(supabase);
  if (!ready) return minersDbNotReadyResult();
  return { ok: true, dbReady: true };
}

/**
 * @param {unknown} raw
 */
export function normalizeIdempotencyKey(raw) {
  const key = String(raw || "").trim();
  if (!key || !IDEMPOTENCY_KEY_RE.test(key)) return null;
  return key;
}

/**
 * @param {unknown} body
 * @param {Record<string, unknown>} config
 */
export function validateAccruePayload(body, config) {
  const idempotencyKey = normalizeIdempotencyKey(body?.idempotencyKey);
  if (!idempotencyKey) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.invalid_idempotency_key,
      message: "מפתח idempotency לא תקין",
    };
  }

  const actionType = String(body?.actionType || "").trim();
  const allowed = Object.values(LEO_MINERS_ACTION_TYPES);
  if (!allowed.includes(actionType)) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.invalid_action_type,
      message: "סוג פעולה לא תקין",
    };
  }

  const maxStage = Math.floor(Number(config.maxStage ?? config.max_stage ?? 100000));
  const maxBatch = Math.floor(Number(config.maxBreaksPerBatch ?? config.max_breaks_per_batch ?? 120));
  const { stageCounts, totalBreaks } = normalizeStageCounts(body?.stageCounts, maxStage);

  if (actionType === LEO_MINERS_ACTION_TYPES.ROCK_BREAK && totalBreaks <= 0) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.empty_stage_counts,
      message: "חסרים נתוני שלבים לכרייה",
    };
  }

  if (totalBreaks > maxBatch) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.batch_too_large,
      message: "יותר מדי שבירות בבקשה אחת",
    };
  }

  const offlineElapsedSec = Math.max(0, Math.floor(Number(body?.offlineElapsedSec) || 0));

  return {
    ok: true,
    idempotencyKey,
    actionType,
    stageCounts,
    totalBreaks,
    offlineElapsedSec,
    clientSeenAt: body?.clientSeenAt ? String(body.clientSeenAt) : null,
  };
}

/**
 * @param {unknown} body
 */
export function validateClaimPayload(body) {
  const idempotencyKey = normalizeIdempotencyKey(body?.idempotencyKey);
  if (!idempotencyKey) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.invalid_idempotency_key,
      message: "מפתח idempotency לא תקין",
    };
  }

  const claimType = String(body?.claimType || "").trim();
  const allowed = Object.values(LEO_MINERS_CLAIM_TYPES);
  if (!allowed.includes(claimType)) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.invalid_claim_type,
      message: "סוג claim לא תקין",
    };
  }

  return {
    ok: true,
    idempotencyKey,
    claimType,
    diamondChestAction:
      body?.diamondChestAction != null ? String(body.diamondChestAction) : null,
  };
}

/**
 * @param {string|null|undefined} lastSeenAt
 * @param {number} offlineElapsedSec
 * @param {Record<string, unknown>} config
 */
export function validateOfflineElapsed(lastSeenAt, offlineElapsedSec, config) {
  const elapsed = Math.max(0, Math.floor(Number(offlineElapsedSec) || 0));
  if (elapsed <= 0) return { ok: true, elapsedSec: 0 };

  const capHours = Number(config.offlineCapHours ?? config.offline_cap_hours ?? 12);
  const configMaxSec = Math.floor(Number(config.max_offline_elapsed_sec ?? 0));
  const maxSec =
    configMaxSec > 0
      ? configMaxSec
      : Math.max(0, Math.floor(capHours * 3600));
  if (elapsed > maxSec) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.offline_elapsed_invalid,
      message: "זמן offline חורג מהמותר",
    };
  }

  if (lastSeenAt) {
    const lastMs = new Date(lastSeenAt).getTime();
    if (Number.isFinite(lastMs)) {
      const sinceSec = Math.floor((Date.now() - lastMs) / 1000);
      const toleranceSec = 120;
      if (elapsed > sinceSec + toleranceSec) {
        return {
          ok: false,
          code: LEO_MINERS_ERROR_CODES.offline_elapsed_invalid,
          message: "זמן offline לא תואם לנתוני השרת",
        };
      }
    }
  }

  return { ok: true, elapsedSec: elapsed };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {number} breaksCount
 * @param {Record<string, unknown>} config
 */
export async function checkAccrueRateLimit(supabase, studentId, breaksCount, config) {
  const maxPerMinute = Math.floor(
    Number(config.maxBreaksPerMinute ?? config.max_breaks_per_minute ?? 60)
  );
  if (maxPerMinute <= 0) return { ok: true };

  const since = new Date(Date.now() - 60_000).toISOString();
  const { data, error } = await supabase
    .from("leo_miners_accrue_log")
    .select("breaks_count")
    .eq("student_id", studentId)
    .eq("status", "applied")
    .gte("created_at", since);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return minersDbNotReadyResult();
    }
    throw error;
  }

  const recentBreaks = (data || []).reduce(
    (sum, row) => sum + Math.max(0, Math.floor(Number(row.breaks_count) || 0)),
    0
  );

  if (recentBreaks + breaksCount > maxPerMinute) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.rate_limited,
      message: "יותר מדי שבירות - נסו שוב בעוד רגע",
      status: 429,
    };
  }

  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Record<string, unknown>|null|undefined} studentRow
 * @param {Record<string, unknown>} config
 */
export async function resolveGuestMinersMultiplier(supabase, studentRow, config) {
  if (!isGuestStudent(studentRow || {})) {
    return { isGuest: false, multiplier: 1 };
  }

  await loadGuestRuntimeConfig(supabase);
  const multiplier = Number(config.guestMultiplier ?? config.guest_multiplier ?? 0.5);
  return {
    isGuest: true,
    multiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 0.5,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Record<string, unknown>|null|undefined} studentRow
 * @param {Record<string, unknown>} config
 */
export async function assertGuestMinersClaimAllowed(supabase, studentRow, config) {
  if (!isGuestStudent(studentRow || {})) return { ok: true, isGuest: false };

  const guestClaimEnabled = config.guestClaimEnabled !== false && config.guest_claim_enabled !== false;
  if (!guestClaimEnabled) {
    return {
      ok: false,
      isGuest: true,
      code: LEO_MINERS_ERROR_CODES.guest_claim_blocked,
      message: "אורחים לא יכולים לאסוף פרסים - יש לקשר חשבון",
      status: 403,
    };
  }

  return { ok: true, isGuest: true };
}

/**
 * @param {Record<string, unknown>} config
 */
export function assertMinersFeatureEnabled(config) {
  if (config.isActive !== true) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.miners_disabled,
      message: "Leo Miners עדיין לא הופעל - יש להפעיל migration ו-config",
    };
  }
  if (config.enabled !== true) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.miners_disabled,
      message: "Leo Miners כבוי בהגדרות Admin",
    };
  }
  return { ok: true };
}

/**
 * @param {Record<string, unknown>} config
 */
export function assertMinersEconomyEnabled(config) {
  if (config.economy_enabled === true) return { ok: true };
  return {
    ok: false,
    code: LEO_MINERS_ERROR_CODES.economy_disabled,
    message: "כלכלת Leo Miners כבויה",
  };
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} actionType
 */
export function assertMinersAccrueEnabled(config, actionType) {
  if (config.accrue_enabled !== true) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.accrue_disabled,
      message: "צבירת נקודות Leo Miners כבויה",
    };
  }

  if (actionType === LEO_MINERS_ACTION_TYPES.OFFLINE_BATCH && config.offline_enabled !== true) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.offline_disabled,
      message: "איסוף offline כבוי",
    };
  }

  if (actionType === LEO_MINERS_ACTION_TYPES.GIFT && config.gifts_enabled !== true) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.gifts_disabled,
      message: "מתנות Leo Miners כבויות",
    };
  }

  return { ok: true };
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} claimType
 * @param {{ isGuest?: boolean }} [opts]
 */
export function assertMinersClaimEnabled(config, claimType, opts = {}) {
  if (config.claim_enabled !== true) {
    return {
      ok: false,
      code: LEO_MINERS_ERROR_CODES.claim_disabled,
      message: "Claim Leo Miners כבוי",
    };
  }

  if (claimType === LEO_MINERS_CLAIM_TYPES.DIAMONDS_CHEST) {
    if (config.diamond_chest_enabled !== true) {
      return {
        ok: false,
        code: LEO_MINERS_ERROR_CODES.diamond_chest_disabled,
        message: "Diamond chest כבוי",
      };
    }
    if (opts.isGuest && config.guest_diamond_enabled !== true) {
      return {
        ok: false,
        code: LEO_MINERS_ERROR_CODES.guest_diamond_blocked,
        message: "אורחים לא יכולים לאסוף יהלומים",
        status: 403,
      };
    }
  }

  return { ok: true };
}
