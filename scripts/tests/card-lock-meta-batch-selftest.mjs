#!/usr/bin/env node
/**
 * Verify batched lock-meta cache matches per-rule async evaluation.
 * Run: node --env-file=.env.local scripts/tests/card-lock-meta-batch-selftest.mjs
 */
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  buildStudentRuleProgressCache,
  cardRulesAllMatch,
  cardRulesAllMatchFromCache,
  evaluateRuleProgress,
  evaluateRuleProgressFromCache,
  loadRulesGroupedByCardId,
} from "../../lib/rewards/server/card-acquisition-engine.server.js";
import { fetchActiveCardsWithSeries } from "../../lib/rewards/server/reward-cards.server.js";
import { getGradeBand } from "../../lib/learning-supabase/mission-progress.server.js";

const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const serviceRole = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const studentId = process.env.AUDIT_STUDENT_ID?.trim();
  let sid = studentId;
  if (!sid) {
    const { data } = await serviceRole.from("students").select("id").limit(1).maybeSingle();
    sid = data?.id;
  }
  assert.ok(sid, "need student id");

  const [allCards, rulesByCard, studentRow] = await Promise.all([
    fetchActiveCardsWithSeries(serviceRole),
    loadRulesGroupedByCardId(serviceRole),
    serviceRole.from("students").select("grade_level").eq("id", sid).maybeSingle(),
  ]);

  const ctx = { gradeBand: getGradeBand(studentRow.data?.grade_level), monthlyMinutes: 0 };
  const progressCache = await buildStudentRuleProgressCache(serviceRole, sid, rulesByCard, ctx);

  let compared = 0;
  for (const card of allCards.slice(0, 40)) {
    const rules = rulesByCard.get(card.id) || [];
    if (!rules.length) continue;

    const asyncResult = await cardRulesAllMatch(serviceRole, sid, rules, ctx);
    const cacheResult = cardRulesAllMatchFromCache(rules, ctx, progressCache);

    assert.equal(cacheResult.matches, asyncResult.matches, `${card.card_key} matches`);
    assert.equal(cacheResult.anyProgress, asyncResult.anyProgress, `${card.card_key} anyProgress`);
    assert.equal(
      cacheResult.primaryProgress?.current ?? null,
      asyncResult.primaryProgress?.current ?? null,
      `${card.card_key} current`
    );
    assert.equal(
      cacheResult.primaryProgress?.target ?? null,
      asyncResult.primaryProgress?.target ?? null,
      `${card.card_key} target`
    );
    compared += 1;

    for (const rule of rules.slice(0, 2)) {
      const asyncProg = await evaluateRuleProgress(serviceRole, sid, rule, ctx);
      const cacheProg = evaluateRuleProgressFromCache(rule, ctx, progressCache);
      assert.deepEqual(
        {
          matches: cacheProg.matches,
          current: cacheProg.current,
          target: cacheProg.target,
          hasProgress: cacheProg.hasProgress,
        },
        {
          matches: asyncProg.matches,
          current: asyncProg.current,
          target: asyncProg.target,
          hasProgress: asyncProg.hasProgress,
        },
        `${card.card_key}/${rule.rule_type}`
      );
    }
  }

  console.log(
    `card-lock-meta-batch-selftest: ok (${compared} cards, progress cache queries=${progressCache.queryCount})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
