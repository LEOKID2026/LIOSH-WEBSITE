/**
 * Integration checks for diamond admin round-trip (requires .env.local + service role).
 * Run: node --env-file=.env.local scripts/verify-diamond-economy.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  listSoloDiamondRulesAdmin,
  updateSoloDiamondRulesAdmin,
  getSurpriseBoxDiamondRewardsAdmin,
  updateSurpriseBoxDiamondRewardsAdmin,
} from "../lib/rewards/server/diamond-admin.server.js";
import { calculateSoloGameDiamonds, adminAdjustDiamonds, getStudentDiamondBalance } from "../lib/rewards/server/diamond-ledger.server.js";
import { calculateSoloGameCoins } from "../lib/solo-games/server/solo-game-payout.server.js";

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env — skipping DB integration checks.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const TEST_GAME = "maze";
const ADMIN_ID = "00000000-0000-4000-8000-000000000099";

async function main() {
  console.log("Diamond economy integration checks…");

  const beforeList = await listSoloDiamondRulesAdmin(supabase);
  const beforeRow = beforeList.find((g) => g.gameKey === TEST_GAME);
  assert.ok(beforeRow, "maze row exists");

  const testRules = {
    enabled: true,
    mode: "win_only",
    fixedAmount: 7,
    tiers: [],
    inGameCollectMultiplier: 1,
    maxPerSession: 10,
    onlyOnWin: false,
  };

  const updated = await updateSoloDiamondRulesAdmin(
    supabase,
    ADMIN_ID,
    TEST_GAME,
    testRules
  );
  assert.equal(updated.ok, true, updated.messageHe || updated.code);

  const afterList = await listSoloDiamondRulesAdmin(supabase);
  const afterRow = afterList.find((g) => g.gameKey === TEST_GAME);
  assert.equal(afterRow?.diamondRules?.fixedAmount, 7, "admin API persisted fixedAmount to DB");

  const payout = calculateSoloGameDiamonds(afterRow.diamondRules, {
    didWin: true,
    score: 100,
  });
  assert.equal(payout.diamonds, 7, "solo finish path uses admin-updated fixedAmount");

  const disabled = await updateSoloDiamondRulesAdmin(supabase, ADMIN_ID, TEST_GAME, {
    ...testRules,
    enabled: false,
  });
  assert.equal(disabled.ok, true);

  const disabledList = await listSoloDiamondRulesAdmin(supabase);
  const disabledRow = disabledList.find((g) => g.gameKey === TEST_GAME);
  const noDiamonds = calculateSoloGameDiamonds(disabledRow.diamondRules, {
    didWin: true,
    score: 100,
  });
  assert.equal(noDiamonds.diamonds, 0, "disabled rules award 0");

  await updateSoloDiamondRulesAdmin(
    supabase,
    ADMIN_ID,
    TEST_GAME,
    beforeRow.diamondRules
  );

  const boxBefore = await getSurpriseBoxDiamondRewardsAdmin(supabase);
  const testBox = [{ amount: 9, weight: 100 }];
  const boxUpdated = await updateSurpriseBoxDiamondRewardsAdmin(
    supabase,
    ADMIN_ID,
    testBox
  );
  assert.equal(boxUpdated.ok, true);
  const boxLoaded = await getSurpriseBoxDiamondRewardsAdmin(supabase);
  assert.deepEqual(boxLoaded, testBox);

  if (boxBefore.length) {
    await updateSurpriseBoxDiamondRewardsAdmin(supabase, ADMIN_ID, boxBefore);
  }

  const { data: studentRow } = await supabase.from("students").select("id").limit(1).maybeSingle();
  if (studentRow?.id) {
    const beforeBal = await getStudentDiamondBalance(supabase, studentRow.id);
    const adjust = await adminAdjustDiamonds(supabase, {
      adminUserId: ADMIN_ID,
      studentId: studentRow.id,
      signedAmount: 1,
      note: "verify-diamond-economy test",
      clientRequestId: `verify-${Date.now()}`,
    });
    assert.equal(adjust.ok, true, adjust.message || adjust.code);
    assert.equal(adjust.balanceAfter, beforeBal.balance + (adjust.duplicate ? 0 : 1));

    const { data: txRows } = await supabase
      .from("diamond_transactions")
      .select("id,amount,direction,source_type")
      .eq("student_id", studentRow.id)
      .eq("source_type", "admin_adjustment")
      .order("created_at", { ascending: false })
      .limit(1);
    assert.ok(txRows?.length, "ledger row for admin adjust");

    const { data: auditRows } = await supabase
      .from("admin_audit_log")
      .select("id,action")
      .eq("target_id", studentRow.id)
      .eq("action", "admin_diamond_adjustment")
      .order("created_at", { ascending: false })
      .limit(1);
    assert.ok(auditRows?.length, "admin audit row for diamond adjust");

    await adminAdjustDiamonds(supabase, {
      adminUserId: ADMIN_ID,
      studentId: studentRow.id,
      signedAmount: -1,
      note: "verify-diamond-economy revert",
      clientRequestId: `verify-revert-${Date.now()}`,
    });

    const coinPayout = calculateSoloGameCoins(
      "catcher",
      "medium",
      { score: 30, levelReached: 1 },
      { baseCoins: 5, scoreUnitDivisor: 10, perScoreUnit: 1, maxCoins: 100 }
    );
    assert.ok(coinPayout.coins > 0, "coin payout path still works");
  }

  console.log("OK — solo rules + surprise box + admin adjust verified.");
}

main().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});
