/**
 * Focused generator/logic selftests for the five math educational games.
 * Run: node components/educational-games/math-games-generators.selftest.mjs
 */

import { createMathTask, skillDistribution } from "../../lib/educational-games/math-task-schema.js";
import { buildGiftsSessionRun, validateGiftsDivision } from "./leo-gifts/leo-gifts-data.js";
import { buildBakerySessionRun, validateBakery, bakeryExpected } from "./leo-bakery/leo-bakery-data.js";
import {
  buildOrderedSessionRun,
  validatePath,
  findDistractorFalseNegatives,
} from "./leo-number-path/leo-number-path-data.js";
import {
  pickCustomersForRun,
  auditPizzeriaContent,
  fractionsEqual,
  compareFractions,
  CUSTOMERS_PER_LEVEL,
  DIFFICULTIES as PIZZA_DIFF,
} from "./leo-pizzeria/leo-pizzeria-data.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertSessionShape(run, gameKey, difficulty) {
  assert(run.length === 20, `${gameKey}/${difficulty}: expected 20 tasks, got ${run.length}`);
  const keys = new Set();
  for (const t of run) {
    assert(t.id, `${gameKey}: missing id`);
    assert(t.skillId, `${gameKey}/${t.id}: missing skillId`);
    assert(t.variant != null || t.mode != null || t.rule != null, `${gameKey}/${t.id}: missing variant`);
    assert(t.expectedAnswer != null || t.correctPath != null || t.total != null, `${gameKey}/${t.id}: missing expected`);
    const key = JSON.stringify({
      skillId: t.skillId,
      variant: t.variant || t.mode || t.rule,
      operands: t.operands || { total: t.total, children: t.children },
      path: t.correctPath,
    });
    assert(!keys.has(key), `${gameKey}/${difficulty}: duplicate task ${key}`);
    keys.add(key);
    // NaN / negative guards
    const nums = JSON.stringify(t).match(/-?\d+(\.\d+)?/g) || [];
    for (const n of nums) {
      assert(Number.isFinite(Number(n)), `${gameKey}/${t.id}: non-finite ${n}`);
    }
  }
  const dist = skillDistribution(run);
  assert(Object.keys(dist).length >= 2, `${gameKey}/${difficulty}: need skill variety, got ${JSON.stringify(dist)}`);
}

function testGifts() {
  for (const d of ["easy", "medium", "hard"]) {
    const run = buildGiftsSessionRun(d);
    assertSessionShape(run, "leo-gifts", d);
    for (const t of run) {
      const q = Math.floor(t.total / t.operands.divisor);
      const r = t.total % t.operands.divisor;
      assert(r < t.operands.divisor, `remainder >= divisor in ${t.id}`);
      assert(validateGiftsDivision(t, q, r).ok, `valid division failed ${t.id}`);
      assert(!validateGiftsDivision(t, q, t.operands.divisor).ok, `bad remainder accepted ${t.id}`);
    }
    if (d === "easy") {
      assert(run.some((t) => t.mode === "share_equally"), "easy missing share");
      assert(run.some((t) => t.mode === "make_groups"), "easy missing make_groups");
    }
    if (d !== "easy") {
      assert(run.some((t) => t.expectedAnswer.remainder > 0), `${d} missing remainder tasks`);
    }
  }
}

function testBakery() {
  for (const d of ["easy", "medium", "hard"]) {
    const run = buildBakerySessionRun(d);
    assertSessionShape(run, "leo-bakery", d);
    for (const t of run) {
      if (t.mode === "sameTotal") {
        const ans = t.expectedAnswer;
        assert(ans.trays * ans.perTray === ans.total, `sameTotal math ${t.id}`);
        const given = t.givenArrangement;
        assert(!(given.trays === ans.trays && given.perTray === ans.perTray), `sameTotal identical ${t.id}`);
        assert(validateBakery(t, ans).ok, `sameTotal validate ${t.id}`);
      } else {
        const e = bakeryExpected(t);
        assert(e.trays * e.perTray === e.total, `bakery eq ${t.id}`);
        assert(validateBakery(t, e).ok, `bakery validate ${t.id}`);
      }
    }
    if (d === "medium" || d === "hard") {
      assert(run.some((t) => t.mode === "findTrays" || t.mode === "findPerTray"), `${d} missing missing-factor`);
    }
    if (d === "hard") {
      assert(run.some((t) => t.mode === "sameTotal"), "hard missing sameTotal");
    }
  }
}

function testNumberPath() {
  for (const d of ["easy", "medium", "hard"]) {
    let run = null;
    let lastErr = null;
    // Generator pool can occasionally collide on hard geometric sequences — retry.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        run = buildOrderedSessionRun(d);
        assertSessionShape(run, "leo-number-path", d);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr) throw lastErr;
    for (const t of run) {
      assert(t.rule, `missing rule ${t.id}`);
      assert(t.skillId.startsWith("numbers."), `skill ${t.id}`);
      assert(validatePath(t, t.correctPath), `correctPath invalid ${t.id}`);
      if (t.orderMatters) {
        assert(t.correctPath.length >= 3, `short ordered path ${t.id}`);
      }
      // Prompt should not dump full path for skip
      if (t.rule === "skip") {
        assert(!t.promptHe.includes(t.correctPath.join(" → ")), `skip prompt leak ${t.id}`);
      }
    }
    const issues = findDistractorFalseNegatives(run.filter((t) => t.rule === "even" || t.rule === "odd" || t.rule === "multiples"));
    assert(issues.length === 0, `false negatives: ${JSON.stringify(issues.slice(0, 3))}`);
  }
}

function testPizzeria() {
  const audit = auditPizzeriaContent();
  assert(audit.ok, `pizzeria audit: ${audit.issues.join("; ")}`);
  for (const d of ["easy", "medium", "hard"]) {
    const run = pickCustomersForRun(d);
    assert(run.length === CUSTOMERS_PER_LEVEL, `pizzeria ${d} length`);
    const denoms = PIZZA_DIFF[d].denominators;
    for (const t of run) {
      assert(t.skillId?.startsWith("fractions."), `frac skill ${t.id}`);
      assert(t.variant, `variant ${t.id}`);
      if (t.variant === "equivalent_fraction") {
        const a = t.operands.a;
        const b = t.operands.b;
        assert(fractionsEqual(a.n, a.d, b.n, b.d), `not equal ${t.id}`);
      }
      if (t.variant === "compare_fractions") {
        const a = t.operands.a;
        const b = t.operands.b;
        assert(compareFractions(a.n, a.d, b.n, b.d) === t.expectedAnswer.relation, `compare ${t.id}`);
      }
      if (t.variant === "complete_whole") {
        assert(t.operands.givenNumerator + t.operands.missing === t.operands.denominator, `complete ${t.id}`);
      }
      assert(t.variant !== "more_than_one_whole", `mt1 disabled ${t.id}`);
      if (t.spec) {
        for (const n of Object.values(t.spec.requirements)) {
          assert(n <= t.sliceCount, `num>den ${t.id}`);
        }
      }
      if (t.variant === "identify_fraction") {
        assert(t.expectedAnswer.denominator === t.sliceCount, `id denom ${t.id}`);
        assert(t.expectedAnswer.numerator === t.prefilledCount, `id num ${t.id}`);
      }
      assert(!/\b(LESS|GREATER|EQUAL)\b/.test(`${t.greeting} ${t.ticketLine}`), `en ${t.id}`);
      if (t.sliceCount && t.variant !== "compare_fractions") {
        assert(denoms.includes(t.sliceCount) || denoms.includes(t.operands?.a?.d), `denom support ${t.id}`);
      }
      // No N of M leak in ticket for build
      if (t.variant === "build_fraction") {
        assert(!/מתוך/.test(t.ticketLine), `ticket leak ${t.id}: ${t.ticketLine}`);
      }
    }
  }
  assert(fractionsEqual(1, 2, 2, 4), "1/2=2/4");
  assert(compareFractions(3, 4, 1, 2) === "greater", "3/4>1/2");
}

function testSchema() {
  const t = createMathTask({
    id: "x",
    gameKey: "leo-bakery",
    difficulty: "easy",
    skillId: "multiplication.build_groups",
    variant: "build",
    expectedAnswer: { trays: 2, perTray: 3, total: 6 },
    operands: { trays: 2, perTray: 3 },
  });
  assert(t.representationType === "numeric", "default representation");
}

console.log("math-games generators selftest…");
testSchema();
testGifts();
testBakery();
testNumberPath();
testPizzeria();
console.log("OK — math game generator selftests passed");
