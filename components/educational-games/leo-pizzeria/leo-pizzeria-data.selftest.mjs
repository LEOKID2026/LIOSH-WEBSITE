import {
  CUSTOMERS_PER_LEVEL,
  DIFFICULTIES,
  auditPizzeriaContent,
  compareFractions,
  equivalentTargetNumerator,
  fractionsEqual,
  getCustomerTimeLimit,
  pickCustomersForRun,
  stressAuditPizzeria,
  validateOrderSpec,
} from "./leo-pizzeria-data.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function testFractionHelpers() {
  assert(fractionsEqual(1, 2, 2, 4), "1/2 = 2/4");
  assert(fractionsEqual(2, 3, 4, 6), "2/3 = 4/6");
  assert(!fractionsEqual(1, 2, 1, 3), "1/2 != 1/3");
  assert(compareFractions(3, 4, 1, 2) === "greater", "3/4 > 1/2");
  assert(compareFractions(1, 3, 1, 2) === "less", "1/3 < 1/2");
  assert(equivalentTargetNumerator(6, 8, 4) === 3, "6/8 -> 3/4");
  assert(equivalentTargetNumerator(5, 6, 4) == null, "5/6 -> 4 invalid");
}

function testDynamicRuns() {
  for (const diff of ["easy", "medium", "hard"]) {
    const run = pickCustomersForRun(diff);
    assert(run.length === CUSTOMERS_PER_LEVEL, `${diff} run length`);
    const denoms = DIFFICULTIES[diff].denominators;
    for (const order of run) {
      assert(order.skillId, `${order.id} skill`);
      assert(order.variant, `${order.id} variant`);
      assert(order.variant !== "more_than_one_whole", `${order.id} mt1 disabled`);
      assert(getCustomerTimeLimit(diff, 0) > 0, "time limit");

      if (order.variant === "identify_fraction") {
        assert(order.expectedAnswer.denominator === order.sliceCount, `${order.id} id denom`);
        assert(order.expectedAnswer.numerator === order.prefilledCount, `${order.id} id num`);
      }
      if (order.variant === "equivalent_fraction") {
        const a = order.sourceFraction;
        const b = order.targetFraction;
        assert(a && b && fractionsEqual(a.n, a.d, b.n, b.d), `${order.id} eq`);
        assert(Number.isInteger(b.n), `${order.id} int target`);
      }
      if (order.variant === "compare_fractions") {
        assert(order.compareA && order.compareB, `${order.id} dual pizza`);
        assert(
          compareFractions(order.compareA.n, order.compareA.d, order.compareB.n, order.compareB.d) ===
            order.expectedAnswer.relation,
          `${order.id} cmp`,
        );
      }
      if (order.variant === "complete_whole") {
        assert(
          order.operands.givenNumerator + order.operands.missing === order.operands.denominator,
          `${order.id} complete`,
        );
      }
      if (order.variant === "combine_visual_fractions") {
        assert(order.combineA?.d === order.combineB?.d, `${order.id} same denom`);
      }
      if (order.spec && order.variant !== "compare_fractions") {
        const reqSum = Object.values(order.spec.requirements).reduce((a, b) => a + b, 0);
        assert(reqSum <= order.sliceCount, `${order.id} req sum`);
      }
      if (order.variant === "build_fraction" && order.spec) {
        /** @type {Record<number, string>} */
        const map = {};
        let idx = 0;
        for (const [tid, n] of Object.entries(order.spec.requirements)) {
          for (let i = 0; i < n; i += 1) map[idx++] = tid;
        }
        const ok = validateOrderSpec(order.spec, order.sliceCount, map);
        assert(ok.ok, `${order.id} should validate: ${ok.message}`);
        assert(!/מתוך/.test(order.ticketLine), `ticket leak ${order.id}`);
      }
      if (order.sliceCount && order.variant !== "compare_fractions") {
        assert(
          denoms.includes(order.sliceCount) || denoms.includes(order.operands?.denominator),
          `${order.id} denom ${order.sliceCount}`,
        );
      }
      const text = `${order.greeting} ${order.ticketLine}`;
      assert(!/\b(LESS|GREATER|EQUAL|less|greater|equal)\b/.test(text), `english ${order.id}`);
      assert(!/\d+\s*\/\s*\d+/.test(text), `slash frac ${order.id}`);
    }
  }
}

function testAudit() {
  const audit = auditPizzeriaContent();
  assert(audit.ok, audit.issues.join("\n"));
}

function testStress() {
  console.log("  stress 100 sessions × 3 difficulties…");
  const stress = stressAuditPizzeria(100);
  assert(stress.ok, `stress issues (${stress.issueCount}): ${stress.issues.join("; ")}`);
}

console.log("leo-pizzeria-data selftest…");
testFractionHelpers();
testDynamicRuns();
testAudit();
testStress();
console.log("OK");
