import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import { requireParentApiContext } from "../../../../../lib/auth/persona-guard.server.js";
import { getIsraelMonthBounds, getIsraelMonthBoundsForYearMonth } from "../../../../../lib/learning-supabase/israel-calendar.server.js";
import { safeString } from "../../../../../lib/parent-server/report-data-aggregate.server.js";

const MAX_ROWS = 200;

/**
 * GET /api/parent/students/[studentId]/coin-history
 * Read-only coin ledger for a owned child (no UI in Phase 9).
 *
 * Query: yearMonthIsrael (optional, YYYY-MM)
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const studentId = safeString(req.query?.studentId, 64);
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }

  const yearMonthRaw = safeString(req.query?.yearMonthIsrael, 7);
  let monthBounds;
  try {
    monthBounds = yearMonthRaw
      ? getIsraelMonthBoundsForYearMonth(yearMonthRaw)
      : getIsraelMonthBounds();
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid yearMonthIsrael" });
  }

  try {
    const ctx = await requireParentApiContext(res, authHeader, { requireFeature: "reports_enabled" });
    if (ctx.stopped) return undefined;

    const { data: student, error: studentErr } = await ctx.bearerSupabase
      .from("students")
      .select("id,full_name,grade_level,is_active,parent_id")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();

    if (studentErr) {
      return res.status(403).json({ ok: false, error: "Could not verify student ownership" });
    }
    if (!student?.id) {
      return res.status(404).json({ ok: false, error: "Student not found for this parent" });
    }

    const serviceClient = getLearningSupabaseServiceRoleClient();
    const { data: balanceRow } = await serviceClient
      .from("student_coin_balances")
      .select("balance")
      .eq("student_id", studentId)
      .maybeSingle();

    const { data: rows, error: txErr } = await serviceClient
      .from("coin_transactions")
      .select("id,amount,direction,reason,source_type,source_id,idempotency_key,metadata,created_at")
      .eq("student_id", studentId)
      .gte("created_at", monthBounds.startIso)
      .lt("created_at", monthBounds.endIso)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);

    if (txErr) {
      return res.status(500).json({ ok: false, error: "Failed to load coin history" });
    }

    let earned = 0;
    let spent = 0;
    for (const row of rows || []) {
      const amt = Number(row.amount) || 0;
      if (row.direction === "earn") earned += amt;
      else if (row.direction === "spend") spent += amt;
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).json({
      ok: true,
      studentId,
      yearMonthIsrael: monthBounds.ym,
      monthBounds: { startIso: monthBounds.startIso, endIso: monthBounds.endIso },
      balance: Number(balanceRow?.balance) || 0,
      summary: {
        earned,
        spent,
        net: earned - spent,
        transactionCount: (rows || []).length,
      },
      transactions: rows || [],
      meta: {
        source: "coin_transactions",
        version: "phase-9-single-truth",
        maxRows: MAX_ROWS,
      },
    });
  } catch {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
