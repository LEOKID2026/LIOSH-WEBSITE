import crypto from "node:crypto";
import { spendArcadeEntry, refundArcadeEntry } from "./arcade-coins";
import { fetchGameRow, validateEntryCost } from "./arcade-rooms";
import { assertGameAllowsArcadeSpend } from "./arcade-game-policy";

const QM_TTL_MS = 15 * 60 * 1000;

/**
 * Enqueue for quick match; spends entry once per queue row.
 * Auto-pairing disabled until safe RPC exists (Arcade-1B).
 */
export async function enqueueQuickMatch(supabase, params) {
  const { studentId, gameKey, entryCost } = params;

  const gameLookup = await fetchGameRow(supabase, gameKey);
  if (gameLookup.error) return gameLookup;

  const game = gameLookup.game;

  const spendOk = assertGameAllowsArcadeSpend(game);
  if (spendOk.error) return spendOk;

  const costCheck = await validateEntryCost(supabase, game, entryCost);
  if (costCheck.error) return costCheck;

  const { data: existingQueued } = await supabase
    .from("arcade_quick_match_queue")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "queued")
    .maybeSingle();

  if (existingQueued?.id) {
    return { queue: existingQueued, alreadyQueued: true };
  }

  const expiresAt = new Date(Date.now() + QM_TTL_MS).toISOString();
  const queueId = crypto.randomUUID();

  const insQ = await supabase
    .from("arcade_quick_match_queue")
    .insert({
      id: queueId,
      student_id: studentId,
      game_key: gameKey,
      entry_cost: costCheck.entryCost,
      status: "queued",
      expires_at: expiresAt,
      metadata: {},
    })
    .select("*")
    .single();

  if (insQ.error || !insQ.data) {
    const msg = String(insQ.error?.message || "");
    const codePg = String(insQ.error?.code || "");
    const dup =
      codePg === "23505" ||
      msg.includes("arcade_qm_one_queued_per_student") ||
      msg.includes("duplicate key");
    if (dup) {
      const { data: again } = await supabase
        .from("arcade_quick_match_queue")
        .select("*")
        .eq("student_id", studentId)
        .eq("status", "queued")
        .maybeSingle();
      if (again?.id) {
        return { queue: again, alreadyQueued: true };
      }
    }
    return { error: { code: "enqueue_failed", message: insQ.error?.message || "תור נכשל" } };
  }

  const spend = await spendArcadeEntry(
    supabase,
    studentId,
    costCheck.entryCost,
    `arcade:qm:${queueId}:entry`,
    { sourceId: queueId },
  );

  if (!spend.ok) {
    await supabase.from("arcade_quick_match_queue").delete().eq("id", queueId);
    if (spend.code === "insufficient_funds") {
      return { error: { code: "insufficient_funds", message: "אין מספיק מטבעות" } };
    }
    return { error: { code: spend.code || "spend_failed", message: spend.message || "שגיאת חיוב" } };
  }

  return { queue: insQ.data, spend, matched: null };
}

/**
 * Cancel queued quick match: conditional update first, refund only if transitioned queued→cancelled.
 */
export async function cancelQuickMatch(supabase, studentId) {
  const { data: updatedRows, error: upErr } = await supabase
    .from("arcade_quick_match_queue")
    .update({
      status: "cancelled",
      metadata: { cancelled_at: new Date().toISOString() },
    })
    .eq("student_id", studentId)
    .eq("status", "queued")
    .select("*");

  if (upErr) {
    return { error: { code: "db_error", message: upErr.message } };
  }

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;

  if (updated?.id) {
    const refund = await refundArcadeEntry(
      supabase,
      studentId,
      updated.entry_cost,
      `arcade:refund:qm_cancel:${updated.id}`,
      { sourceId: updated.id },
    );

    if (!refund.ok) {
      await supabase
        .from("arcade_quick_match_queue")
        .update({ status: "queued", metadata: {} })
        .eq("id", updated.id)
        .eq("status", "cancelled");

      return { error: { code: "refund_failed", message: refund.message || "החזר נכשל" } };
    }

    return { ok: true, cancelledQueueId: updated.id, refund };
  }

  const { data: latest } = await supabase
    .from("arcade_quick_match_queue")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest?.id) {
    return { error: { code: "nothing_to_cancel", message: "אין רישום בתור" } };
  }

  return {
    error: {
      code: "qm_not_cancellable",
      message: "לא ניתן לבטל את התור במצב הנוכחי",
      queueStatus: latest.status,
    },
  };
}
