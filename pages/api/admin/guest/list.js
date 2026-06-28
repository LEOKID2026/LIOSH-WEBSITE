import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import { normalizeLeoNumber } from "../../../../lib/guest/guest-leo-number.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  try {
    const leoQuery = normalizeLeoNumber(req.query?.leoNumber || req.query?.q);
    let query = ctx.serviceRole
      .from("students")
      .select("id, leo_number, guest_status, guest_linked_at, guest_last_seen_at, created_at, student_coin_balances(balance)")
      .eq("account_kind", "guest")
      .order("guest_last_seen_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (leoQuery) {
      query = query.eq("leo_number", leoQuery);
    }

    const { data, error } = await query;
    if (error) {
      return sendAdminApiError(res, 500, "db_error", error.message);
    }

    const ids = (data || []).map((r) => r.id).filter(Boolean);
    let cardCounts = Object.create(null);
    if (ids.length > 0) {
      const { data: cardRows } = await ctx.serviceRole
        .from("student_reward_cards")
        .select("student_id")
        .in("student_id", ids)
        .eq("owned", true);
      for (const row of cardRows || []) {
        cardCounts[row.student_id] = (cardCounts[row.student_id] || 0) + 1;
      }
    }

    const guests = (data || []).map((row) => {
      const rel = row.student_coin_balances;
      const balance = Array.isArray(rel) ? rel[0]?.balance ?? 0 : rel?.balance ?? 0;
      return {
        id: row.id,
        leoNumber: row.leo_number,
        guestStatus: row.guest_status,
        guestLinkedAt: row.guest_linked_at,
        guestLastSeenAt: row.guest_last_seen_at,
        createdAt: row.created_at,
        coinBalance: balance,
        cardCount: cardCounts[row.id] || 0,
      };
    });

    return res.status(200).json({ ok: true, guests });
  } catch (_e) {
    return sendAdminApiError(res, 500, "db_error", "db_error");
  }
}
