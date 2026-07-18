/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'build_fraction'|'identify_fraction'|'complete_whole'|'equivalent_fraction'|'compare_fractions'|'combine_visual_fractions'} PizzeriaVariant */

import {
  createMathTask,
  pickBalancedSession,
  shuffledCopy,
} from "../../../lib/educational-games/math-task-schema.js";
import { TASKS_PER_SESSION } from "../../../lib/educational-games/educational-session-standard.js";

/** @typedef {{ id: string, emoji: string, name: string }} PizzaTopping */

/**
 * @typedef {{
 *   id: string
 *   gameKey: 'leo-pizzeria'
 *   difficulty: DifficultyId
 *   skillId: string
 *   variant: PizzeriaVariant
 *   operands: Record<string, unknown>
 *   expectedAnswer: unknown
 *   representationType: string
 *   customerName: string
 *   customerEmoji: string
 *   greeting: string
 *   ticketLine: string
 *   sliceCount: number
 *   pizzaCount: number
 *   toppingId: string
 *   timeLimitSec: number
 *   prefilledCount?: number
 *   compareA?: { n: number, d: number, toppingId: string }
 *   compareB?: { n: number, d: number, toppingId: string }
 *   sourceFraction?: { n: number, d: number }
 *   targetFraction?: { n: number, d: number }
 *   combineA?: { n: number, d: number }
 *   combineB?: { n: number, d: number }
 *   spec?: { requirements: Record<string, number>, filledSlices: number, allowEmpty: boolean, prefilledSlices?: number }
 * }} PizzeriaTask
 */

export const CUSTOMERS_PER_LEVEL = TASKS_PER_SESSION;

/** @type {PizzaTopping[]} */
export const TOPPINGS = [
  { id: "cheese", emoji: "🧀", name: "גבינה" },
  { id: "tomato", emoji: "🍅", name: "עגבניה" },
  { id: "olive", emoji: "🫒", name: "זיתים" },
  { id: "mushroom", emoji: "🍄", name: "פטריות" },
  { id: "pepper", emoji: "🫑", name: "פלפל" },
  { id: "basil", emoji: "🌿", name: "בזיליקום" },
];

export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "קל",
    denominators: [2, 3, 4],
    hint: "שלם, חצי, שליש ורבע",
    maxMistakes: 5,
    timeLimitsByBand: [50, 45, 40],
  },
  medium: {
    id: "medium",
    label: "בינוני",
    denominators: [2, 3, 4, 6, 8],
    hint: "בניית שברים, שברים שווים והשוואה",
    maxMistakes: 4,
    timeLimitsByBand: [45, 40, 35],
  },
  hard: {
    id: "hard",
    label: "קשה",
    denominators: [3, 4, 5, 6, 8, 10, 12],
    hint: "שברים שווים, השוואה וחיבור חזותי",
    maxMistakes: 3,
    timeLimitsByBand: [40, 35, 30],
  },
};

export const SCORE = {
  correct: 30,
  streak3: 15,
  streak5: 30,
  fastService: 5,
  timeout: -5,
};

const NAMES = [
  ["גל", "👧"],
  ["אורי", "👦"],
  ["נועה", "👧"],
  ["עמית", "🧒"],
  ["מיה", "👧"],
  ["דניאל", "👦"],
  ["שיר", "👧"],
  ["יואב", "👦"],
];

/** more_than_one_whole removed until dual-pizza fill UI is complete. */
/** @param {DifficultyId} difficulty */
function pizzeriaQuotas(difficulty) {
  if (difficulty === "easy") {
    return {
      "fractions.build_part_of_whole": 7,
      "fractions.identify_numerator_denominator": 6,
      "fractions.complete_whole": 5,
      "fractions.equal_parts": 2,
    };
  }
  if (difficulty === "medium") {
    return {
      "fractions.build_part_of_whole": 4,
      "fractions.identify_numerator_denominator": 3,
      "fractions.complete_whole": 3,
      "fractions.equivalent": 5,
      "fractions.compare": 3,
      "fractions.combine_same_denominator": 2,
    };
  }
  return {
    "fractions.build_part_of_whole": 3,
    "fractions.identify_numerator_denominator": 2,
    "fractions.complete_whole": 2,
    "fractions.equivalent": 5,
    "fractions.compare": 4,
    "fractions.combine_same_denominator": 4,
  };
}

/** @param {number} n @param {number} d */
export function gcd(n, d) {
  let a = Math.abs(n);
  let b = Math.abs(d);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function simplifyFraction(n, d) {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export function fractionsEqual(n1, d1, n2, d2) {
  return n1 * d2 === n2 * d1;
}

export function compareFractions(n1, d1, n2, d2) {
  const left = n1 * d2;
  const right = n2 * d1;
  if (left > right) return "greater";
  if (left < right) return "less";
  return "equal";
}

/** @param {number} sourceN @param {number} sourceD @param {number} targetD */
export function equivalentTargetNumerator(sourceN, sourceD, targetD) {
  const raw = (sourceN * targetD) / sourceD;
  if (!Number.isInteger(raw)) return null;
  if (raw < 0 || raw > targetD) return null;
  return raw;
}

/** @param {DifficultyId} difficulty @param {number} index */
function getTimeLimit(difficulty, index) {
  const diff = DIFFICULTIES[difficulty];
  const band = index < 5 ? 0 : index < 15 ? 1 : 2;
  return diff.timeLimitsByBand[band];
}

/**
 * @param {DifficultyId} difficulty
 * @param {PizzeriaVariant} variant
 * @param {number} salt
 */
function generatePoolForVariant(difficulty, variant, salt = 0) {
  const denoms = DIFFICULTIES[difficulty].denominators;
  /** @type {PizzeriaTask[]} */
  const pool = [];
  const seen = new Set();

  for (let di = 0; di < denoms.length; di += 1) {
    const denom = denoms[di];
    for (let num = 0; num <= denom; num += 1) {
      if (variant === "identify_fraction" && num === 0) continue;
      if (variant === "build_fraction" && num === 0) continue;
      if (variant === "complete_whole" && (num === 0 || num >= denom)) continue;
      if (variant === "combine_visual_fractions" && num === 0) continue;

      for (let t = 0; t < TOPPINGS.length; t += 1) {
        const topping = TOPPINGS[(t + salt) % TOPPINGS.length];
        const [name, emoji] = NAMES[(pool.length + salt) % NAMES.length];
        const key = `${variant}-${num}-${denom}-${topping.id}`;
        if (seen.has(key)) continue;

        /** @type {PizzeriaTask|null} */
        let task = null;

        if (variant === "build_fraction") {
          seen.add(key);
          task = {
            ...createMathTask({
              id: `pz-${difficulty}-build-${pool.length}`,
              gameKey: "leo-pizzeria",
              difficulty,
              skillId: num === denom ? "fractions.equal_parts" : "fractions.build_part_of_whole",
              variant,
              operands: { numerator: num, denominator: denom, toppingId: topping.id },
              expectedAnswer: { numerator: num, denominator: denom },
              representationType: "pizza_slices",
            }),
            customerName: name,
            customerEmoji: emoji,
            greeting: "הכינו פיצה לפי השבר המוצג.",
            ticketLine: "סמנו את מספר הפרוסות המתאים.",
            sliceCount: denom,
            pizzaCount: 1,
            toppingId: topping.id,
            timeLimitSec: 40,
            sourceFraction: { n: num, d: denom },
            spec: {
              requirements: { [topping.id]: num },
              filledSlices: num,
              allowEmpty: num < denom,
            },
          };
        } else if (variant === "identify_fraction") {
          seen.add(key);
          task = {
            ...createMathTask({
              id: `pz-${difficulty}-id-${pool.length}`,
              gameKey: "leo-pizzeria",
              difficulty,
              skillId: "fractions.identify_numerator_denominator",
              variant,
              operands: { numerator: num, denominator: denom, toppingId: topping.id, markedSlices: num },
              expectedAnswer: { numerator: num, denominator: denom },
              representationType: "pizza_slices",
            }),
            customerName: name,
            customerEmoji: emoji,
            greeting: "כמה פרוסות מסומנות?",
            ticketLine: "בחרו את מספר הפרוסות המסומנות.",
            sliceCount: denom,
            pizzaCount: 1,
            toppingId: topping.id,
            timeLimitSec: 40,
            prefilledCount: num,
            spec: {
              requirements: { [topping.id]: num },
              filledSlices: num,
              allowEmpty: true,
            },
          };
        } else if (variant === "complete_whole") {
          const missing = denom - num;
          seen.add(key);
          task = {
            ...createMathTask({
              id: `pz-${difficulty}-comp-${pool.length}`,
              gameKey: "leo-pizzeria",
              difficulty,
              skillId: "fractions.complete_whole",
              variant,
              operands: {
                givenNumerator: num,
                denominator: denom,
                missing,
                toppingId: topping.id,
              },
              expectedAnswer: { numerator: missing, denominator: denom, given: num },
              representationType: "pizza_slices",
            }),
            customerName: name,
            customerEmoji: emoji,
            greeting: "השלימו את הפיצה לשלם.",
            ticketLine: "סמנו את הפרוסות החסרות.",
            sliceCount: denom,
            pizzaCount: 1,
            toppingId: topping.id,
            timeLimitSec: 40,
            prefilledCount: num,
            sourceFraction: { n: num, d: denom },
            spec: {
              requirements: { [topping.id]: missing },
              filledSlices: missing,
              allowEmpty: false,
              prefilledSlices: num,
            },
          };
        } else if (variant === "equivalent_fraction") {
          for (const targetD of denoms) {
            if (targetD === denom) continue;
            const targetN = equivalentTargetNumerator(num, denom, targetD);
            if (targetN == null) continue;
            if (targetN === 0 && num !== 0) continue;
            const eqKey = `${variant}-${num}-${denom}->${targetN}-${targetD}-${topping.id}`;
            if (seen.has(eqKey)) continue;
            seen.add(eqKey);
            pool.push({
              ...createMathTask({
                id: `pz-${difficulty}-eq-${pool.length}`,
                gameKey: "leo-pizzeria",
                difficulty,
                skillId: "fractions.equivalent",
                variant,
                operands: {
                  a: { n: num, d: denom },
                  b: { n: targetN, d: targetD },
                  toppingId: topping.id,
                },
                expectedAnswer: { n1: num, d1: denom, n2: targetN, d2: targetD },
                representationType: "dual_pizza",
              }),
              customerName: name,
              customerEmoji: emoji,
              greeting: "הכינו שבר ששווה לשבר המוצג.",
              ticketLine: "סמנו על הפיצה את החלק המתאים.",
              sliceCount: targetD,
              pizzaCount: 1,
              toppingId: topping.id,
              timeLimitSec: 45,
              sourceFraction: { n: num, d: denom },
              targetFraction: { n: targetN, d: targetD },
              spec: {
                requirements: { [topping.id]: targetN },
                filledSlices: targetN,
                allowEmpty: targetN < targetD,
              },
            });
          }
          continue;
        } else if (variant === "compare_fractions") {
          for (let dj = 0; dj < denoms.length; dj += 1) {
            const d2 = denoms[dj];
            for (let n2 = 1; n2 <= d2; n2 += 1) {
              if (num === n2 && denom === d2) continue;
              // Keep pairs with same denominator, or related dens (clear visual compare)
              if (denom !== d2 && denom % d2 !== 0 && d2 % denom !== 0) continue;
              const cmp = compareFractions(num, denom, n2, d2);
              const cmpKey = `cmp-${num}-${denom}-${n2}-${d2}`;
              if (seen.has(cmpKey)) continue;
              seen.add(cmpKey);
              const toppingB = TOPPINGS[(t + 1 + salt) % TOPPINGS.length];
              pool.push({
                ...createMathTask({
                  id: `pz-${difficulty}-cmp-${pool.length}`,
                  gameKey: "leo-pizzeria",
                  difficulty,
                  skillId: "fractions.compare",
                  variant,
                  operands: { a: { n: num, d: denom }, b: { n: n2, d: d2 } },
                  expectedAnswer: { relation: cmp },
                  representationType: "dual_pizza",
                }),
                customerName: name,
                customerEmoji: emoji,
                greeting: "איזה שבר גדול יותר?",
                ticketLine: "בחרו את התשובה הנכונה.",
                sliceCount: Math.max(denom, d2),
                pizzaCount: 2,
                toppingId: topping.id,
                timeLimitSec: 40,
                compareA: { n: num, d: denom, toppingId: topping.id },
                compareB: { n: n2, d: d2, toppingId: toppingB.id },
              });
            }
          }
          continue;
        } else if (variant === "combine_visual_fractions") {
          // Same denominator only — clear visual
          if (num >= denom) continue;
          for (let add = 1; add <= denom - num; add += 1) {
            const sum = num + add;
            const combKey = key + `-add${add}`;
            if (seen.has(combKey)) continue;
            seen.add(combKey);
            pool.push({
              ...createMathTask({
                id: `pz-${difficulty}-comb-${pool.length}`,
                gameKey: "leo-pizzeria",
                difficulty,
                skillId: "fractions.combine_same_denominator",
                variant,
                operands: {
                  a: { n: num, d: denom },
                  b: { n: add, d: denom },
                  toppingId: topping.id,
                },
                expectedAnswer: { numerator: sum, denominator: denom },
                representationType: "pizza_slices",
              }),
              customerName: name,
              customerEmoji: emoji,
              greeting: "חברו את השברים.",
              ticketLine: "סמנו על הפיצה את התוצאה.",
              sliceCount: denom,
              pizzaCount: 1,
              toppingId: topping.id,
              timeLimitSec: 45,
              combineA: { n: num, d: denom },
              combineB: { n: add, d: denom },
              targetFraction: { n: sum, d: denom },
              spec: {
                requirements: { [topping.id]: sum },
                filledSlices: sum,
                allowEmpty: sum < denom,
              },
            });
          }
          continue;
        }

        if (task) pool.push(task);
      }
    }
  }

  return shuffledCopy(pool);
}

/** @param {PizzeriaTask} task */
export function pizzeriaTaskKey(task) {
  return `${task.variant}|${JSON.stringify(task.operands)}|${task.toppingId}|${task.sliceCount}`;
}

/** @param {DifficultyId} difficulty */
export function pickCustomersForRun(difficulty) {
  const quotas = pizzeriaQuotas(difficulty);
  const salt = Math.floor(Math.random() * 10000);

  const variantBySkill = {
    "fractions.build_part_of_whole": "build_fraction",
    "fractions.read_fraction": "identify_fraction",
    "fractions.identify_numerator_denominator": "identify_fraction",
    "fractions.complete_whole": "complete_whole",
    "fractions.equal_parts": "build_fraction",
    "fractions.equivalent": "equivalent_fraction",
    "fractions.compare": "compare_fractions",
    "fractions.combine_same_denominator": "combine_visual_fractions",
  };

  /** @type {Record<string, PizzeriaTask[]>} */
  const pools = {};
  for (const skill of Object.keys(quotas)) {
    const variant = /** @type {PizzeriaVariant} */ (variantBySkill[skill] || "build_fraction");
    let pool = generatePoolForVariant(difficulty, variant, salt);
    if (skill === "fractions.equal_parts") {
      pool = pool.filter((t) => t.operands?.numerator === t.operands?.denominator);
    } else if (skill === "fractions.build_part_of_whole") {
      pool = pool.filter((t) => (t.operands?.numerator ?? 0) < (t.operands?.denominator ?? 1));
    }
    pools[skill] = pool;
  }

  let run = pickBalancedSession(pools, quotas, pizzeriaTaskKey, CUSTOMERS_PER_LEVEL);
  const used = new Set();
  run = run.filter((t) => {
    const k = pizzeriaTaskKey(t);
    if (used.has(k)) return false;
    used.add(k);
    return true;
  });

  while (run.length < CUSTOMERS_PER_LEVEL) {
    const extra = generatePoolForVariant(difficulty, "build_fraction", salt + run.length);
    for (const t of extra) {
      if (run.length >= CUSTOMERS_PER_LEVEL) break;
      const k = pizzeriaTaskKey(t);
      if (used.has(k)) continue;
      used.add(k);
      run.push(t);
    }
    break;
  }

  return run.slice(0, CUSTOMERS_PER_LEVEL).map((order, index) => ({
    ...order,
    id: `pz-${difficulty}-run-${index}`,
    timeLimitSec: getTimeLimit(difficulty, index),
  }));
}

/** @param {Record<number, string>} sliceMap */
function countByTopping(sliceMap) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const toppingId of Object.values(sliceMap)) {
    if (!toppingId || toppingId === "__prefilled__") continue;
    counts[toppingId] = (counts[toppingId] || 0) + 1;
  }
  return counts;
}

function filledCount(sliceMap) {
  return Object.values(sliceMap).filter((v) => v && v !== "__prefilled__").length;
}

/**
 * @param {{ requirements: Record<string, number>, filledSlices: number, allowEmpty: boolean }} orderSpec
 * @param {number} sliceCount
 * @param {Record<number, string>} sliceMap
 */
export function validateOrderSpec(orderSpec, sliceCount, sliceMap) {
  const counts = countByTopping(sliceMap);
  const filled = filledCount(sliceMap);
  const { requirements, filledSlices, allowEmpty } = orderSpec;

  for (const toppingId of Object.values(sliceMap)) {
    if (toppingId && toppingId !== "__prefilled__" && requirements[toppingId] == null) {
      return { ok: false, message: "יש תוספת על פרוסה שלא צריך לסמן." };
    }
  }

  for (const [toppingId, required] of Object.entries(requirements)) {
    const actual = counts[toppingId] || 0;
    if (actual > required) {
      return { ok: false, message: "יש תוספת על פרוסה שלא צריך לסמן." };
    }
  }

  let missingTotal = 0;
  for (const [toppingId, required] of Object.entries(requirements)) {
    const actual = counts[toppingId] || 0;
    if (actual < required) missingTotal += required - actual;
  }

  if (missingTotal > 0) {
    return { ok: false, message: "בדקו שוב כמה פרוסות צריך לסמן." };
  }

  if (filled > filledSlices) {
    return { ok: false, message: "יש תוספת על פרוסה שלא צריך לסמן." };
  }

  if (!allowEmpty && filled < filledSlices) {
    return { ok: false, message: "בדקו שוב כמה פרוסות צריך לסמן." };
  }

  return { ok: true, message: "מעולה! הפיצה מוכנה." };
}

/** @param {PizzeriaTask} order @param {Record<number, string>} sliceMap */
export function validateCustomerOrder(order, sliceMap) {
  if (!order.spec) {
    console.error("[leo-pizzeria] invalid order without spec", order?.id);
    return { ok: false, message: "" };
  }
  return validateOrderSpec(order.spec, order.sliceCount, sliceMap);
}

/**
 * @param {PizzeriaTask} order
 * @param {{ numerator?: number, denominator?: number, relation?: string, sliceMap?: Record<number, string> }} answer
 */
export function validatePizzeriaAnswer(order, answer) {
  if (order.variant === "identify_fraction") {
    const exp = /** @type {{ numerator: number, denominator: number }} */ (order.expectedAnswer);
    const ok =
      answer.numerator === exp.numerator &&
      answer.denominator === exp.denominator &&
      answer.denominator === order.sliceCount;
    return {
      ok,
      message: ok ? "מעולה! בחרתם את השבר הנכון." : "בדקו שוב כמה פרוסות מסומנות.",
    };
  }
  if (order.variant === "compare_fractions") {
    const exp = /** @type {{ relation: string }} */ (order.expectedAnswer);
    const ok = answer.relation === exp.relation;
    return {
      ok,
      message: ok ? "מעולה! ההשוואה נכונה." : "השוו שוב בין החלק המסומן בשתי הפיצות.",
    };
  }
  if (answer.sliceMap && order.spec) {
    return validateOrderSpec(order.spec, order.sliceCount, answer.sliceMap);
  }
  return { ok: false, message: "בחרו תשובה לפני הבדיקה." };
}

export function getCustomerTimeLimit(difficultyId, index) {
  return getTimeLimit(difficultyId, index);
}

export function pizzeriaOrderDifficultyScore(order) {
  let score = order.sliceCount || 4;
  if (order.variant === "equivalent_fraction") score += 10;
  if (order.variant === "compare_fractions") score += 12;
  if (order.variant === "combine_visual_fractions") score += 8;
  return score;
}

export function isPizzeriaWin(successfulCustomers, customersTotal, mistakes, maxMistakes) {
  if (mistakes > maxMistakes) return false;
  return successfulCustomers >= customersTotal;
}

export function toppingById(toppingId) {
  return TOPPINGS.find((t) => t.id === toppingId);
}

export function wedgePath(index, total, radius, cx, cy) {
  const start = ((index * 360) / total - 90) * (Math.PI / 180);
  const end = (((index + 1) * 360) / total - 90) * (Math.PI / 180);
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = 360 / total > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export function wedgeCenter(index, total, radius, cx, cy) {
  const mid = ((index + 0.5) * 360) / total - 90;
  const rad = (mid * Math.PI) / 180;
  const dist = radius * 0.68;
  return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) };
}

/** @param {PizzeriaTask} order */
export function pizzeriaSolutionText(order) {
  if (order.variant === "compare_fractions") {
    const exp = /** @type {{ relation: string }} */ (order.expectedAnswer);
    if (exp.relation === "greater") return "פתרון: השבר הראשון גדול יותר.";
    if (exp.relation === "less") return "פתרון: השבר השני גדול יותר.";
    return "פתרון: שני השברים שווים.";
  }
  if (order.variant === "identify_fraction") {
    return "פתרון: השבר הוא";
  }
  if (order.variant === "equivalent_fraction") {
    return "פתרון: שני השברים שווים.";
  }
  if (order.variant === "complete_whole") {
    return "פתרון: השלמנו את הפרוסות החסרות וקיבלנו פיצה שלמה.";
  }
  if (order.variant === "combine_visual_fractions") {
    return "פתרון: סכום השברים הוא";
  }
  return "פתרון: כך מסמנים את השבר.";
}

/** Structured solution payload for UI (no English enums exposed). */
export function pizzeriaSolutionPayload(order) {
  if (order.variant === "compare_fractions") {
    return {
      type: "compare",
      relation: /** @type {{ relation: string }} */ (order.expectedAnswer).relation,
      a: order.compareA,
      b: order.compareB,
    };
  }
  if (order.variant === "identify_fraction") {
    return {
      type: "identify",
      numerator: order.expectedAnswer.numerator,
      denominator: order.sliceCount,
      toppingId: order.toppingId,
      marked: order.prefilledCount,
    };
  }
  if (order.variant === "equivalent_fraction") {
    return {
      type: "equivalent",
      source: order.sourceFraction,
      target: order.targetFraction,
      toppingId: order.toppingId,
    };
  }
  if (order.variant === "complete_whole") {
    return {
      type: "complete",
      given: order.prefilledCount,
      missing: order.expectedAnswer.numerator,
      denominator: order.sliceCount,
      toppingId: order.toppingId,
    };
  }
  if (order.variant === "combine_visual_fractions") {
    return {
      type: "combine",
      a: order.combineA,
      b: order.combineB,
      result: order.targetFraction,
      toppingId: order.toppingId,
    };
  }
  return {
    type: "build",
    numerator: order.operands.numerator ?? order.expectedAnswer.numerator,
    denominator: order.sliceCount,
    toppingId: order.toppingId,
  };
}

export function auditPizzeriaContent() {
  /** @type {string[]} */
  const issues = [];
  for (const diff of /** @type {DifficultyId[]} */ (["easy", "medium", "hard"])) {
    const run = pickCustomersForRun(diff);
    if (run.length !== CUSTOMERS_PER_LEVEL) {
      issues.push(`${diff}: expected ${CUSTOMERS_PER_LEVEL} got ${run.length}`);
    }
    for (const order of run) {
      if (!order.skillId || !order.variant || !order.id) {
        issues.push(`${order.id || "?"}: missing schema`);
      }
      if (order.variant === "more_than_one_whole") {
        issues.push(`${order.id}: more_than_one_whole should be disabled`);
      }
      if (order.variant === "equivalent_fraction") {
        const a = order.sourceFraction;
        const b = order.targetFraction;
        if (!a || !b || !fractionsEqual(a.n, a.d, b.n, b.d)) {
          issues.push(`${order.id}: not equivalent`);
        }
        const tn = equivalentTargetNumerator(a.n, a.d, b.d);
        if (tn !== b.n) issues.push(`${order.id}: target numerator not integer path`);
      }
      if (order.variant === "identify_fraction") {
        if (order.expectedAnswer.denominator !== order.sliceCount) {
          issues.push(`${order.id}: identify denom != sliceCount`);
        }
        if (order.expectedAnswer.numerator !== order.prefilledCount) {
          issues.push(`${order.id}: identify num != marked`);
        }
      }
      if (order.variant === "complete_whole") {
        const g = order.operands.givenNumerator;
        const m = order.operands.missing;
        if (g + m !== order.operands.denominator) issues.push(`${order.id}: complete math`);
      }
      if (order.variant === "compare_fractions") {
        if (!order.compareA || !order.compareB) issues.push(`${order.id}: missing compare pizzas`);
        const rel = compareFractions(order.compareA.n, order.compareA.d, order.compareB.n, order.compareB.d);
        if (rel !== order.expectedAnswer.relation) issues.push(`${order.id}: compare wrong`);
      }
      const text = `${order.greeting} ${order.ticketLine}`;
      if (/\b(LESS|GREATER|EQUAL|less|greater|equal)\b/.test(text)) {
        issues.push(`${order.id}: english in text`);
      }
      if (/מתוך/.test(text)) issues.push(`${order.id}: N of M leak`);
      if (/\d+\s*\/\s*\d+/.test(text)) {
        issues.push(`${order.id}: slash fraction in text (use FractionDisplay)`);
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Stress: many sessions per difficulty. */
export function stressAuditPizzeria(sessionsPerDiff = 100) {
  /** @type {string[]} */
  const issues = [];
  for (const diff of /** @type {DifficultyId[]} */ (["easy", "medium", "hard"])) {
    for (let s = 0; s < sessionsPerDiff; s += 1) {
      const run = pickCustomersForRun(diff);
      if (run.length !== 20) issues.push(`${diff}#${s}: len ${run.length}`);
      for (const order of run) {
        if (order.variant === "equivalent_fraction") {
          const a = order.sourceFraction;
          const b = order.targetFraction;
          if (!a || !b || !fractionsEqual(a.n, a.d, b.n, b.d)) {
            issues.push(`${diff}#${s} ${order.id}: bad equivalent`);
          }
          if (!Number.isInteger(b.n)) issues.push(`${diff}#${s} ${order.id}: non-int target`);
        }
        if (order.variant === "identify_fraction") {
          if (order.expectedAnswer.denominator !== order.sliceCount) {
            issues.push(`${diff}#${s} ${order.id}: identify denom`);
          }
        }
        if (order.variant === "compare_fractions" && (!order.compareA || !order.compareB)) {
          issues.push(`${diff}#${s} ${order.id}: compare missing pizzas`);
        }
        if (order.variant === "combine_visual_fractions") {
          const a = order.combineA;
          const b = order.combineB;
          if (!a || !b || a.d !== b.d) issues.push(`${diff}#${s} ${order.id}: combine denoms`);
        }
      }
    }
  }
  return { ok: issues.length === 0, issues: issues.slice(0, 40), issueCount: issues.length };
}

export function sampleOrdersByDifficulty() {
  return {
    easy: pickCustomersForRun("easy").slice(0, 5),
    medium: pickCustomersForRun("medium").slice(0, 5),
    hard: pickCustomersForRun("hard").slice(0, 5),
  };
}
