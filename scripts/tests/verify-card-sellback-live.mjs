#!/usr/bin/env node
/**
 * Live verification for duplicate sellback — uses service role, restores mutated rows.
 * Usage: node --env-file=.env.local scripts/tests/verify-card-sellback-live.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { convertDuplicates } from "../../lib/rewards/server/duplicate-conversion.server.js";
import {
  computeCardSellbackCoins,
  getDuplicateSellbackPercent,
  resolveCardPrice,
} from "../../lib/rewards/server/reward-settings.server.js";
import { getStudentCardsView } from "../../lib/rewards/server/reward-cards.server.js";
import { sellDuplicateShopCard } from "../../lib/rewards/server/reward-shop.server.js";
import { getStudentCoinBalance } from "../../lib/rewards/server/reward-coins.server.js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function ok(label) {
  console.log(`  ok  ${label}`);
}

function shopCardState(shop, cardId) {
  const row = shop.find((c) => c.id === cardId);
  assert.ok(row, `shop row missing for ${cardId}`);
  return row;
}

async function main() {
  const supabase = getSupabase();
  let failed = false;

  console.log("=== Verify card duplicate sellback (live) ===\n");

  // --- DB config ---
  const { data: setting } = await supabase
    .from("reward_card_settings")
    .select("setting_value_json")
    .eq("setting_key", "duplicate_sellback_percent")
    .maybeSingle();
  assert.equal(Number(setting?.setting_value_json), 25, "duplicate_sellback_percent should be 25");
  ok("duplicate_sellback_percent = 25");

  const { data: students } = await supabase.from("students").select("id, full_name").limit(1);
  const probeStudentId = students?.[0]?.id;
  const { data: probeCard } = await supabase
    .from("reward_cards")
    .select("id")
    .eq("card_type", "shop")
    .eq("can_be_purchased", true)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (probeStudentId && probeCard?.id) {
    const { error: txErr } = await supabase.from("reward_card_transactions").insert({
      student_id: probeStudentId,
      card_id: probeCard.id,
      transaction_type: "card_sellback",
      coins_amount: 0,
      reason: "card_sellback",
      metadata_json: { verifyProbe: true },
    });
    assert.ifError(txErr);
    await supabase
      .from("reward_card_transactions")
      .delete()
      .eq("student_id", probeStudentId)
      .contains("metadata_json", { verifyProbe: true });
    ok("transaction_type card_sellback allowed");
  }

  const disabled = await convertDuplicates(supabase, probeStudentId || "00000000-0000-0000-0000-000000000000", probeCard?.id || "00000000-0000-0000-0000-000000000000");
  assert.equal(disabled.ok, false);
  assert.equal(disabled.code, "feature_disabled");
  ok("convertDuplicates remains disabled (10-batch)");

  // --- Pick shop card + student for stateful test ---
  const { data: shopCards } = await supabase
    .from("reward_cards")
    .select("id, card_key, name_he, price_coins, use_default_price, rarity, card_type, can_be_purchased, is_active")
    .eq("card_type", "shop")
    .eq("can_be_purchased", true)
    .eq("is_active", true)
    .limit(20);
  assert.ok(shopCards?.length, "need at least one shop card");

  let testCard = shopCards[0];
  for (const c of shopCards) {
    const price = await resolveCardPrice(supabase, c);
    if (price >= 4) {
      testCard = c;
      break;
    }
  }

  const price = await resolveCardPrice(supabase, testCard);
  const pct = await getDuplicateSellbackPercent(supabase);
  const expectedSellback = computeCardSellbackCoins(price, pct);
  assert.ok(expectedSellback > 0, "sellback must be > 0 for test card");
  ok(`test card ${testCard.card_key} price=${price} sellback=${expectedSellback}`);

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, grade_level")
    .limit(1)
    .maybeSingle();
  assert.ok(student?.id, "need a student row");
  const studentId = student.id;

  const { data: priorOwned } = await supabase
    .from("student_reward_cards")
    .select("*")
    .eq("student_id", studentId)
    .eq("card_id", testCard.id)
    .maybeSingle();

  const priorBalance = await getStudentCoinBalance(supabase, studentId);
  const snapshot = {
    owned: priorOwned,
    balance: priorBalance,
  };

  async function restore() {
    if (snapshot.owned) {
      await supabase.from("student_reward_cards").upsert(
        {
          id: snapshot.owned.id,
          student_id: studentId,
          card_id: testCard.id,
          owned: snapshot.owned.owned,
          duplicate_count: snapshot.owned.duplicate_count,
          first_received_at: snapshot.owned.first_received_at,
          last_received_at: snapshot.owned.last_received_at,
        },
        { onConflict: "id" }
      );
    } else {
      await supabase
        .from("student_reward_cards")
        .delete()
        .eq("student_id", studentId)
        .eq("card_id", testCard.id);
    }
  }

  try {
    // State A: not owned
    await supabase.from("student_reward_cards").delete().eq("student_id", studentId).eq("card_id", testCard.id);
    let view = await getStudentCardsView(supabase, studentId);
    let row = shopCardState(view.shop, testCard.id);
    assert.equal(row.alreadyOwned, false);
    assert.equal(row.canSellDuplicate, false);
    assert.ok(!row.canAfford || row.canAfford === (priorBalance >= price));
    ok('1) not owned → buy state (alreadyOwned=false, canSellDuplicate=false)');

    const sellWhenNotOwned = await sellDuplicateShopCard(supabase, studentId, testCard.id, `verify:nobody:${Date.now()}`);
    assert.equal(sellWhenNotOwned.ok, false);
    assert.equal(sellWhenNotOwned.code, "not_owned");
    ok("1b) sell blocked when not owned");

    // State B: one copy (duplicate_count=0)
    const now = new Date().toISOString();
    await supabase.from("student_reward_cards").upsert(
      {
        student_id: studentId,
        card_id: testCard.id,
        owned: true,
        duplicate_count: 0,
        first_received_at: now,
        last_received_at: now,
      },
      { onConflict: "student_id,card_id" }
    );
    view = await getStudentCardsView(supabase, studentId);
    row = shopCardState(view.shop, testCard.id);
    assert.equal(row.alreadyOwned, true);
    assert.equal(row.canSellDuplicate, false);
    assert.equal(row.duplicateCount, 0);
    ok('2) one copy → "יש לך" state (canSellDuplicate=false)');

    const sellOneCopy = await sellDuplicateShopCard(supabase, studentId, testCard.id, `verify:one:${Date.now()}`);
    assert.equal(sellOneCopy.ok, false);
    assert.equal(sellOneCopy.code, "no_duplicate");
    ok("2b) sell blocked with only one copy");

    // State C: two copies (duplicate_count=1)
    await supabase
      .from("student_reward_cards")
      .update({ duplicate_count: 1 })
      .eq("student_id", studentId)
      .eq("card_id", testCard.id);
    view = await getStudentCardsView(supabase, studentId);
    row = shopCardState(view.shop, testCard.id);
    assert.equal(row.canSellDuplicate, true);
    assert.equal(row.sellbackCoins, expectedSellback);
    ok('3) two copies → canSellDuplicate=true, sellbackCoins correct');

    const runId = Date.now();
    const balanceBeforeSell = await getStudentCoinBalance(supabase, studentId);
    const idemKey = `verify:sellback:${studentId}:${testCard.id}:${runId}`;
    const sell1 = await sellDuplicateShopCard(supabase, studentId, testCard.id, idemKey);
    assert.equal(sell1.ok, true, sell1.code || sell1.message);
    assert.equal(sell1.sellbackCoins, expectedSellback);
    ok("4-6) sell succeeds, coins = floor(price*25%)");

    const { data: afterRow } = await supabase
      .from("student_reward_cards")
      .select("owned, duplicate_count")
      .eq("student_id", studentId)
      .eq("card_id", testCard.id)
      .maybeSingle();
    assert.equal(afterRow?.owned, true);
    assert.equal(afterRow?.duplicate_count, 0);
    ok("4-5) duplicate_count decremented by 1, still owned");

    const balanceAfterSell = await getStudentCoinBalance(supabase, studentId);
    assert.equal(balanceAfterSell - balanceBeforeSell, expectedSellback);
    ok("6) balance increased by sellback amount");

    const { data: coinTx } = await supabase
      .from("coin_transactions")
      .select("reason, source_type, source_id, amount, idempotency_key, metadata")
      .eq("student_id", studentId)
      .eq("idempotency_key", idemKey)
      .maybeSingle();
    assert.ok(coinTx, "coin_transactions row missing");
    assert.equal(coinTx.reason, "card_sellback");
    assert.equal(coinTx.source_id, testCard.id);
    assert.equal(coinTx.amount, expectedSellback);
    ok("7) coin_transactions logged with reason card_sellback");

    const { data: cardTx } = await supabase
      .from("reward_card_transactions")
      .select("transaction_type, reason, card_id, coins_amount, metadata_json")
      .eq("student_id", studentId)
      .eq("card_id", testCard.id)
      .eq("transaction_type", "card_sellback")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.ok(cardTx, "reward_card_transactions row missing");
    assert.equal(cardTx.reason, "card_sellback");
    assert.equal(cardTx.coins_amount, expectedSellback);
    ok("7) reward_card_transactions logged as card_sellback");

    // Idempotency: same key should not double-pay or double-decrement
    await supabase
      .from("student_reward_cards")
      .update({ duplicate_count: 1 })
      .eq("student_id", studentId)
      .eq("card_id", testCard.id);
    const balanceBeforeRetry = await getStudentCoinBalance(supabase, studentId);
    const sellRetry = await sellDuplicateShopCard(supabase, studentId, testCard.id, idemKey);
    assert.equal(sellRetry.ok, true, "idempotent retry should succeed");
    const balanceAfterRetry = await getStudentCoinBalance(supabase, studentId);
    assert.equal(balanceAfterRetry, balanceBeforeRetry, "idempotent retry must not add coins again");
    const { data: rowAfterRetry } = await supabase
      .from("student_reward_cards")
      .select("duplicate_count")
      .eq("student_id", studentId)
      .eq("card_id", testCard.id)
      .maybeSingle();
    assert.equal(rowAfterRetry?.duplicate_count, 1, "idempotent retry must not decrement duplicates again");
    ok("8) duplicate idempotency key does not double sell");

    await supabase
      .from("student_reward_cards")
      .update({ duplicate_count: 2 })
      .eq("student_id", studentId)
      .eq("card_id", testCard.id);
    const parallelKey = `verify:parallel:${testCard.id}:${runId}`;
    const balanceBeforeParallel = await getStudentCoinBalance(supabase, studentId);
    const [p1, p2] = await Promise.all([
      sellDuplicateShopCard(supabase, studentId, testCard.id, parallelKey),
      sellDuplicateShopCard(supabase, studentId, testCard.id, parallelKey),
    ]);
    assert.equal(p1.ok, true);
    assert.equal(p2.ok, true);
    const balanceAfterParallel = await getStudentCoinBalance(supabase, studentId);
    assert.equal(balanceAfterParallel - balanceBeforeParallel, expectedSellback);
    const { data: rowAfterParallel } = await supabase
      .from("student_reward_cards")
      .select("duplicate_count, owned")
      .eq("student_id", studentId)
      .eq("card_id", testCard.id)
      .maybeSingle();
    assert.equal(rowAfterParallel?.owned, true);
    assert.equal(rowAfterParallel?.duplicate_count, 1);
    ok("8b) parallel same idempotency key sells once only");

    view = await getStudentCardsView(supabase, studentId);
    const convertible = view.collection.filter((c) => c.canConvert === true);
    assert.equal(convertible.length, 0);
    ok("9) canConvert stays disabled in collection (no 10-batch convert)");
  } catch (err) {
    failed = true;
    console.error("\nFAIL:", err.message || err);
  } finally {
    await restore();
    ok("restored student card row snapshot");
  }

  if (failed) process.exit(1);
  console.log("\nverify-card-sellback-live: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
