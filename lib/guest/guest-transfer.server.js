import { applyArcadeCoinMove } from "../arcade/server/arcade-coins.js";
import { getStudentCoinBalance } from "../rewards/server/reward-coins.server.js";
import {
  applyDiamondMove,
  getStudentDiamondBalance,
} from "../rewards/server/diamond-ledger.server.js";
import { GUEST_STATUS_LINKED } from "./constants.js";
import { normalizeLeoNumber } from "./guest-leo-number.server.js";
import { revokeGuestSessionsAndBindings } from "./guest-student.server.js";
import { transferGuestArcadeClubData } from "../arcade/club/guest-link-transfer.server.js";

/**
 * Transfer coins + cards from guest to target registered child only.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ guestStudentId: string, targetStudentId: string, parentId: string, leoNumber: string }} params
 */
export async function transferGuestCoinsAndCards(supabase, params) {
  const guestStudentId = params.guestStudentId;
  const targetStudentId = params.targetStudentId;
  const parentId = params.parentId;
  const leoNumber = normalizeLeoNumber(params.leoNumber);

  if (!guestStudentId || !targetStudentId || !parentId || !leoNumber) {
    return { ok: false, status: 400, code: "validation_failed", message: "נתונים לא תקינים" };
  }
  if (guestStudentId === targetStudentId) {
    return { ok: false, status: 400, code: "validation_failed", message: "נתונים לא תקינים" };
  }

  const { data: guest, error: guestErr } = await supabase
    .from("students")
    .select("id, account_kind, guest_status, leo_number, is_active")
    .eq("id", guestStudentId)
    .maybeSingle();

  if (guestErr || !guest?.id) {
    return { ok: false, status: 404, code: "guest_not_found", message: "מספר לא נמצא" };
  }
  if (guest.account_kind !== "guest" || guest.guest_status !== "active" || guest.leo_number !== leoNumber) {
    return { ok: false, status: 404, code: "guest_not_found", message: "מספר לא נמצא" };
  }

  const { data: target, error: targetErr } = await supabase
    .from("students")
    .select("id, account_kind, parent_id, is_active")
    .eq("id", targetStudentId)
    .maybeSingle();

  if (targetErr || !target?.id) {
    return { ok: false, status: 404, code: "target_not_found", message: "ילד/ה לא נמצא/ה" };
  }
  if (target.account_kind === "guest" || target.parent_id !== parentId || target.is_active !== true) {
    return { ok: false, status: 403, code: "target_not_owned", message: "ילד/ה לא נמצא/ה" };
  }

  const nowIso = new Date().toISOString();

  const { data: priorClaimEvent } = await supabase
    .from("guest_link_events")
    .select("id, target_student_id")
    .eq("guest_student_id", guestStudentId)
    .maybeSingle();

  if (priorClaimEvent?.id) {
    if (priorClaimEvent.target_student_id === targetStudentId) {
      return {
        ok: true,
        duplicate: true,
        coinsTransferred: 0,
        cardsTransferred: 0,
        diamondsTransferred: 0,
        messageHe: "המטבעות, היהלומים והקלפים נשמרו לילד.",
      };
    }
    return { ok: false, status: 404, code: "guest_not_found", message: "מספר לא נמצא" };
  }

  const { data: claimedGuest, error: claimErr } = await supabase
    .from("students")
    .update({
      guest_status: GUEST_STATUS_LINKED,
      guest_linked_at: nowIso,
      guest_linked_to_student_id: targetStudentId,
      is_active: false,
      updated_at: nowIso,
    })
    .eq("id", guestStudentId)
    .eq("guest_status", "active")
    .eq("account_kind", "guest")
    .select("id")
    .maybeSingle();

  if (claimErr || !claimedGuest?.id) {
    return { ok: false, status: 404, code: "guest_not_found", message: "מספר לא נמצא" };
  }

  const coinBalance = await getStudentCoinBalance(supabase, guestStudentId);
  let coinsTransferred = 0;

  if (coinBalance > 0) {
    const idempotencyKey = `guest_link:${guestStudentId}:${targetStudentId}`;
    const earnResult = await applyArcadeCoinMove(supabase, {
      studentId: targetStudentId,
      direction: "earn",
      amount: coinBalance,
      idempotencyKey: `${idempotencyKey}:earn`,
      sourceType: "guest_link",
      sourceId: guestStudentId,
      metadata: { leoNumber, parentId },
      reason: "guest_link_transfer",
    });
    if (!earnResult.ok) {
      return { ok: false, status: 500, code: earnResult.code || "coin_transfer_failed", message: "העברת מטבעות נכשלה" };
    }

    const spendResult = await applyArcadeCoinMove(supabase, {
      studentId: guestStudentId,
      direction: "spend",
      amount: coinBalance,
      idempotencyKey: `${idempotencyKey}:spend`,
      sourceType: "guest_link",
      sourceId: targetStudentId,
      metadata: { leoNumber, parentId },
      reason: "guest_link_transfer",
    });
    if (!spendResult.ok) {
      return { ok: false, status: 500, code: spendResult.code || "coin_transfer_failed", message: "העברת מטבעות נכשלה" };
    }
    coinsTransferred = coinBalance;
  }

  const { data: guestCards, error: cardsErr } = await supabase
    .from("student_reward_cards")
    .select("id, card_id, owned, duplicate_count, first_received_at, last_received_at")
    .eq("student_id", guestStudentId);

  if (cardsErr) {
    return { ok: false, status: 500, code: "cards_load_failed", message: "העברת קלפים נכשלה" };
  }

  let cardsTransferred = 0;

  for (const guestCard of guestCards || []) {
    if (!guestCard?.card_id) continue;

    const { data: targetCard } = await supabase
      .from("student_reward_cards")
      .select("id, owned, duplicate_count, first_received_at")
      .eq("student_id", targetStudentId)
      .eq("card_id", guestCard.card_id)
      .maybeSingle();

    if (targetCard?.id) {
      const addDup = guestCard.owned ? 1 + (guestCard.duplicate_count || 0) : guestCard.duplicate_count || 0;
      const { error: mergeErr } = await supabase
        .from("student_reward_cards")
        .update({
          owned: targetCard.owned || guestCard.owned,
          duplicate_count: (targetCard.duplicate_count || 0) + addDup,
          last_received_at: guestCard.last_received_at || nowIso,
          first_received_at: targetCard.first_received_at || guestCard.first_received_at || nowIso,
        })
        .eq("id", targetCard.id);
      if (mergeErr) {
        return { ok: false, status: 500, code: "cards_merge_failed", message: "העברת קלפים נכשלה" };
      }
      await supabase.from("student_reward_cards").delete().eq("id", guestCard.id);
    } else {
      const { error: moveErr } = await supabase
        .from("student_reward_cards")
        .update({ student_id: targetStudentId, updated_at: nowIso })
        .eq("id", guestCard.id);
      if (moveErr) {
        return { ok: false, status: 500, code: "cards_move_failed", message: "העברת קלפים נכשלה" };
      }
    }
    cardsTransferred += 1;
  }

  let diamondsTransferred = 0;
  const guestDiamondBalance = (await getStudentDiamondBalance(supabase, guestStudentId)).balance;
  if (guestDiamondBalance > 0) {
    const diamondIdempotencyKey = `guest_link:${guestStudentId}:${targetStudentId}:diamonds`;
    const earnDiamonds = await applyDiamondMove(supabase, {
      studentId: targetStudentId,
      direction: "earn",
      amount: guestDiamondBalance,
      idempotencyKey: `${diamondIdempotencyKey}:earn`,
      sourceType: "guest_link",
      sourceId: guestStudentId,
      metadata: { leoNumber, parentId },
      reason: "guest_link_transfer",
    });
    if (!earnDiamonds.ok && !earnDiamonds.skipped) {
      return {
        ok: false,
        status: 500,
        code: earnDiamonds.code || "diamond_transfer_failed",
        message: "העברת יהלומים נכשלה",
      };
    }

    const spendDiamonds = await applyDiamondMove(supabase, {
      studentId: guestStudentId,
      direction: "spend",
      amount: guestDiamondBalance,
      idempotencyKey: `${diamondIdempotencyKey}:spend`,
      sourceType: "guest_link",
      sourceId: targetStudentId,
      metadata: { leoNumber, parentId },
      reason: "guest_link_transfer",
    });
    if (!spendDiamonds.ok && !spendDiamonds.skipped) {
      return {
        ok: false,
        status: 500,
        code: spendDiamonds.code || "diamond_transfer_failed",
        message: "העברת יהלומים נכשלה",
      };
    }
    diamondsTransferred = guestDiamondBalance;
  }

  const arcadeTransfer = await transferGuestArcadeClubData(supabase, {
    guestStudentId,
    targetStudentId,
  });
  if (!arcadeTransfer.ok) {
    return {
      ok: false,
      status: 500,
      code: arcadeTransfer.code || "arcade_transfer_failed",
      message: "העברת נתוני מועדון משחקים נכשלה",
    };
  }

  await revokeGuestSessionsAndBindings(supabase, guestStudentId);

  await supabase.from("guest_link_events").insert({
    guest_student_id: guestStudentId,
    target_student_id: targetStudentId,
    parent_id: parentId,
    leo_number: leoNumber,
    coins_transferred: coinsTransferred,
    cards_transferred: cardsTransferred,
  });

  return {
    ok: true,
    coinsTransferred,
    cardsTransferred,
    diamondsTransferred,
    messageHe: "המטבעות, היהלומים והקלפים נשמרו לילד.",
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} leoNumber
 */
export async function findActiveGuestByLeoNumber(supabase, leoNumber) {
  const normalized = normalizeLeoNumber(leoNumber);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("students")
    .select("id, account_kind, guest_status, leo_number, is_active")
    .eq("leo_number", normalized)
    .eq("account_kind", "guest")
    .maybeSingle();

  if (error) throw error;
  return data;
}
