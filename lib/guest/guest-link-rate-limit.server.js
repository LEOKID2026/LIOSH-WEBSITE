/**
 * DB-backed rate limiting for parent guest-link attempts.
 *
 * Limits (per parentUserId):
 *   - max 3 attempts per 1 minute  → 1-hour block on breach
 *   - max 10 attempts per 10 minutes → 1-hour block on breach
 *
 * IP hash is recorded for audit but is NOT the primary key for limiting,
 * because X-Forwarded-For can be spoofed. parentUserId (from verified session)
 * is the authoritative limiter.
 *
 * Requires table: public.guest_link_attempts (migration 091).
 */

import crypto from "node:crypto";

const WINDOW_1MIN_MS = 60_000;
const WINDOW_10MIN_MS = 10 * 60_000;
const MAX_PER_1MIN = 3;
const MAX_PER_10MIN = 10;
const BLOCK_DURATION_MS = 60 * 60_000; // 1 hour

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

/**
 * One-way hash for IP address storage (audit only, not for rate limiting).
 * @param {string|undefined} ip
 * @returns {string|null}
 */
export function hashIpForGuestLink(ip) {
  if (!ip || ip === "unknown") return null;
  return sha256Hex(ip).slice(0, 32);
}

/**
 * One-way hash for leo_number storage — avoids persisting the plain number.
 * @param {string|null|undefined} leoNumber
 * @returns {string|null}
 */
export function hashLeoNumberForGuestLink(leoNumber) {
  if (!leoNumber) return null;
  return sha256Hex(leoNumber).slice(0, 32);
}

/**
 * Check whether this parent is currently rate-limited.
 * Fails open (returns allowed:true) on any DB error so core functionality
 * is never blocked by a rate-limit table outage.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase  service-role client
 * @param {string} parentUserId
 * @returns {Promise<{ allowed: boolean, shouldBlock?: boolean }>}
 */
export async function checkGuestLinkRateLimit(supabase, parentUserId) {
  try {
    const nowIso = new Date().toISOString();

    // 1. Active block?
    const { data: activeBlock, error: blockErr } = await supabase
      .from("guest_link_attempts")
      .select("id")
      .eq("parent_user_id", parentUserId)
      .not("blocked_until", "is", null)
      .gt("blocked_until", nowIso)
      .limit(1)
      .maybeSingle();

    if (blockErr) return { allowed: true };
    if (activeBlock?.id) return { allowed: false };

    // 2. Exceeded 1-minute window?
    const since1min = new Date(Date.now() - WINDOW_1MIN_MS).toISOString();
    const { count: count1min, error: err1 } = await supabase
      .from("guest_link_attempts")
      .select("id", { count: "exact", head: true })
      .eq("parent_user_id", parentUserId)
      .gte("created_at", since1min);

    if (err1) return { allowed: true };
    if ((count1min ?? 0) >= MAX_PER_1MIN) {
      return { allowed: false, shouldBlock: true };
    }

    // 3. Exceeded 10-minute window?
    const since10min = new Date(Date.now() - WINDOW_10MIN_MS).toISOString();
    const { count: count10min, error: err2 } = await supabase
      .from("guest_link_attempts")
      .select("id", { count: "exact", head: true })
      .eq("parent_user_id", parentUserId)
      .gte("created_at", since10min);

    if (err2) return { allowed: true };
    if ((count10min ?? 0) >= MAX_PER_10MIN) {
      return { allowed: false, shouldBlock: true };
    }

    return { allowed: true };
  } catch (_e) {
    return { allowed: true };
  }
}

/**
 * Persist one attempt row.
 * When shouldBlock=true, sets blocked_until = now + 1 hour so subsequent
 * requests see the active block immediately.
 *
 * Non-critical: errors are silently swallowed so a logging failure never
 * interrupts the main response flow.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase  service-role client
 * @param {{
 *   parentUserId: string,
 *   ipHash: string|null,
 *   leoNumberHash: string|null,
 *   outcome: "success"|"not_found"|"already_linked"|"blocked"|"error",
 *   shouldBlock?: boolean,
 * }} params
 */
export async function recordGuestLinkAttempt(supabase, {
  parentUserId,
  ipHash,
  leoNumberHash,
  outcome,
  shouldBlock = false,
}) {
  try {
    const blockedUntil = shouldBlock
      ? new Date(Date.now() + BLOCK_DURATION_MS).toISOString()
      : null;

    await supabase.from("guest_link_attempts").insert({
      parent_user_id: parentUserId,
      ip_hash: ipHash ?? null,
      leo_number_hash: leoNumberHash ?? null,
      outcome,
      action: "guest_link",
      blocked_until: blockedUntil,
    });
  } catch (_e) {
    // intentionally swallowed — audit logging must not break core flow
  }
}
