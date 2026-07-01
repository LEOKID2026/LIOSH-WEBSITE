import {
  CUSTOMERS_BY_DIFFICULTY,
  CUSTOMERS_PER_LEVEL,
  DIFFICULTIES,
  auditPizzeriaContent,
  getCustomerTimeLimit,
  pickCustomersForRun,
  sampleOrdersByDifficulty,
  validateOrderSpec,
} from "./leo-pizzeria-data.js";

/** @param {Record<string, number>} requirements */
function sliceMapFromRequirements(requirements) {
  /** @type {Record<number, string>} */
  const map = {};
  let idx = 0;
  for (const [toppingId, count] of Object.entries(requirements)) {
    for (let i = 0; i < count; i += 1) {
      map[idx] = toppingId;
      idx += 1;
    }
  }
  return map;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function testFractionValidation() {
  const cases = [
    {
      name: "half on 4",
      sliceCount: 4,
      spec: { requirements: { cheese: 2 }, filledSlices: 2, allowEmpty: true },
    },
    {
      name: "quarter on 4",
      sliceCount: 4,
      spec: { requirements: { olive: 1 }, filledSlices: 1, allowEmpty: true },
    },
    {
      name: "half on 8",
      sliceCount: 8,
      spec: { requirements: { mushroom: 4 }, filledSlices: 4, allowEmpty: true },
    },
    {
      name: "quarter on 8",
      sliceCount: 8,
      spec: { requirements: { olive: 2 }, filledSlices: 2, allowEmpty: true },
    },
    {
      name: "three quarters on 8",
      sliceCount: 8,
      spec: { requirements: { cheese: 6 }, filledSlices: 6, allowEmpty: true },
    },
    {
      name: "eighth on 8",
      sliceCount: 8,
      spec: { requirements: { basil: 1 }, filledSlices: 1, allowEmpty: true },
    },
  ];

  for (const c of cases) {
    const okMap = sliceMapFromRequirements(c.spec.requirements);
    const ok = validateOrderSpec(c.spec, c.sliceCount, okMap);
    assert(ok.ok, `${c.name}: expected valid`);

    const badMap = { ...okMap, [Object.keys(c.spec.requirements)[0]]: "cheese" };
    if (Object.keys(c.spec.requirements)[0] !== "cheese") {
      badMap[999] = "cheese";
    } else {
      badMap[999] = "tomato";
    }
    const bad = validateOrderSpec(c.spec, c.sliceCount, badMap);
    assert(!bad.ok, `${c.name}: expected invalid with extra topping`);
  }
}

function testAllOrdersValid() {
  for (const [diff, orders] of Object.entries(CUSTOMERS_BY_DIFFICULTY)) {
    for (const order of orders) {
      const okMap = sliceMapFromRequirements(order.spec.requirements);
      const result = validateOrderSpec(order.spec, order.sliceCount, okMap);
      assert(result.ok, `${order.id} (${diff}) should validate: ${result.message}`);
    }
  }
}

function testSmokeLevels() {
  for (const diff of ["easy", "medium", "hard"]) {
    const orders = CUSTOMERS_BY_DIFFICULTY[diff];
    assert(orders.length === CUSTOMERS_PER_LEVEL, `${diff}: expected ${CUSTOMERS_PER_LEVEL} orders`);
    assert(orders[0]?.sliceCount === DIFFICULTIES[diff].sliceCount, `${diff}: slice count`);
    const run = orders.slice(0, 3);
    for (const order of run) {
      const map = sliceMapFromRequirements(order.spec.requirements);
      assert(validateOrderSpec(order.spec, order.sliceCount, map).ok, `${diff} smoke ${order.id}`);
    }
  }
}

function testCustomerTimers() {
  for (const diff of ["easy", "medium", "hard"]) {
    assert(getCustomerTimeLimit(diff, 0) === DIFFICULTIES[diff].timeLimitsByBand[0], `${diff} band0`);
    assert(getCustomerTimeLimit(diff, 4) === DIFFICULTIES[diff].timeLimitsByBand[0], `${diff} band0 late`);
    assert(getCustomerTimeLimit(diff, 5) === DIFFICULTIES[diff].timeLimitsByBand[1], `${diff} band1`);
    assert(getCustomerTimeLimit(diff, 14) === DIFFICULTIES[diff].timeLimitsByBand[1], `${diff} band1 late`);
    assert(getCustomerTimeLimit(diff, 15) === DIFFICULTIES[diff].timeLimitsByBand[2], `${diff} band2`);
    assert(getCustomerTimeLimit(diff, 19) === DIFFICULTIES[diff].timeLimitsByBand[2], `${diff} band2 late`);
  }

  const run = pickCustomersForRun("easy");
  assert(run.length === CUSTOMERS_PER_LEVEL, "pickCustomersForRun length");
  assert(run[0].id === "easy-01", "easy run starts with easy-01");
  for (let i = 0; i < run.length; i += 1) {
    assert(run[i].timeLimitSec === getCustomerTimeLimit("easy", i), `run timer ${i}`);
  }

  const hardRun = pickCustomersForRun("hard");
  assert(hardRun[0].id === "hard-01", "hard run starts with hard-01 not hard-05");
  assert(hardRun[0].id !== "hard-05", "hard-05 is not first");
  assert(hardRun[0].id !== "hard-14", "hard-14 is not first");
}

function main() {
  const audit = auditPizzeriaContent();
  assert(audit.ok, `audit failed: ${audit.issues.join("; ")}`);

  testFractionValidation();
  testAllOrdersValid();
  testSmokeLevels();
  testCustomerTimers();

  const samples = sampleOrdersByDifficulty();
  console.log("leo-pizzeria selftest OK");
  console.log(JSON.stringify({ samples, audit }, null, 2));
}

main();
