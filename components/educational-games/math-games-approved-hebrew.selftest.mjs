/**
 * Approved Hebrew wording selftest for 5 math games.
 * Compares full prompt/solution templates — no "contains Hebrew" shortcuts.
 */
import assert from "assert";
import {
  buildGiftsSessionRun,
  giftsFeedback,
  giftsItemLabel,
  giftsPrompt,
  giftsSolutionParts,
  remainingItemsText,
} from "./leo-gifts/leo-gifts-data.js";
import {
  bakeryControlHint,
  bakeryFeedback,
  bakeryPrompt,
  bakerySolutionParts,
  buildBakerySessionRun,
} from "./leo-bakery/leo-bakery-data.js";
import {
  buildOrderedSessionRun,
  pathFeedback,
  pathSolutionParts,
} from "./leo-number-path/leo-number-path-data.js";
import {
  customerRequestText,
  generateCustomers,
  PRODUCTS,
  supermarketCompletedCustomersText,
} from "./leo-supermarket/leo-supermarket-data.js";
import {
  DIFFICULTIES as PIZZA_DIFF,
  pickCustomersForRun,
  pizzeriaSolutionText,
  validatePizzeriaAnswer,
} from "./leo-pizzeria/leo-pizzeria-data.js";
import { fractionAriaLabel, COMPARE_LABEL_HE } from "./leo-pizzeria/fraction-display-he.js";
import { EDUCATIONAL_GAME_REGISTRY } from "../../lib/educational-games/educational-game-registry.js";

const FORBIDDEN = [
  "חלקן",
  "המחלק",
  "גורם חסר",
  "כמה סך הכול",
  "סדרו אחרת עם אותה כמות כוללת",
  "סדרה חשבונית",
  "סדרת כפל",
  "מוסיפים מינוס",
  "איברים",
  "בחרו את המונה",
  "המכנה נקבע",
  "אני מחזיר",
  "שירתת",
  "שירתם",
  "אחד חצאים",
  "אחד רבעים",
  "אחד שלישים",
  "אחד חמישיות",
  "אחד שישיות",
  "אחד שמיניות",
  "אחד עשיריות",
  "שניים־עשרים",
  "משימה לא תקינה",
  "אבטיפוס",
  "1 עוגיות",
  "1 קאפקייקס",
  "1 לחמניות",
  "1 מאפינס",
];
// Note: approved solution templates intentionally use `${n} שקיות` / `${n} מגשים` for all n.
const ENGLISH_LEAK = /\b(LESS|GREATER|EQUAL|share_equally|make_groups|findTotal|sameTotal|build_fraction)\b/;

function assertNoForbidden(text, ctx) {
  const t = String(text ?? "");
  for (const bad of FORBIDDEN) {
    assert(!t.includes(bad), `${ctx}: forbidden "${bad}" in "${t}"`);
  }
  assert(!ENGLISH_LEAK.test(t), `${ctx}: english leak in "${t}"`);
  assert(!/undefined|null|NaN|\[object Object\]/.test(t), `${ctx}: technical leak in "${t}"`);
}

console.log("math-games approved Hebrew wording selftest…");

// Plural helpers
assert.strictEqual(giftsItemLabel("gifts", 1), "מתנה");
assert.strictEqual(giftsItemLabel("gifts", 2), "מתנות");
assert.strictEqual(giftsItemLabel("candies", 1), "סוכרייה");
assert.strictEqual(giftsItemLabel("candies", 2), "סוכריות");
assert.strictEqual(giftsItemLabel("stickers", 1), "מדבקה");
assert.strictEqual(giftsItemLabel("stickers", 2), "מדבקות");
assert.strictEqual(giftsItemLabel("stars", 1), "כוכב");
assert.strictEqual(giftsItemLabel("stars", 2), "כוכבים");
assert.strictEqual(giftsItemLabel("sweets", 1), "ממתק");
assert.strictEqual(giftsItemLabel("sweets", 2), "ממתקים");
assert.strictEqual(remainingItemsText(0), "לא נשארו פריטים.");
assert.strictEqual(remainingItemsText(1), "נשאר פריט אחד.");
assert.strictEqual(remainingItemsText(2), "נשארו 2 פריטים.");
assert.strictEqual(supermarketCompletedCustomersText(1), "כל הכבוד! עזרתם ללקוח אחד במכולת.");
assert.strictEqual(supermarketCompletedCustomersText(2), "כל הכבוד! עזרתם ל־2 לקוחות במכולת.");

// Fraction aria
assert.strictEqual(fractionAriaLabel(0, 4), "אפס");
assert.strictEqual(fractionAriaLabel(4, 4), "שלם");
assert.strictEqual(fractionAriaLabel(1, 2), "1 חלקי 2");
assert.strictEqual(fractionAriaLabel(3, 4), "3 חלקי 4");
assert.strictEqual(COMPARE_LABEL_HE.greater, "השבר הראשון גדול יותר");
assert.strictEqual(COMPARE_LABEL_HE.less, "השבר השני גדול יותר");
assert.strictEqual(COMPARE_LABEL_HE.equal, "השברים שווים");

// Tomato spelling
assert.ok(PRODUCTS.some((p) => p.name === "עגבנייה"));

// Registry blurbs
assert.strictEqual(EDUCATIONAL_GAME_REGISTRY["leo-supermarket"].blurbHe, "מוצרים, כסף והחזרת עודף");
assert.strictEqual(EDUCATIONAL_GAME_REGISTRY["leo-gifts"].blurbHe, "חלוקה שווה, שקיות ומה שנשאר");
assert.strictEqual(EDUCATIONAL_GAME_REGISTRY["leo-bakery"].blurbHe, "כפל, מגשים וכמויות שוות");
assert.strictEqual(EDUCATIONAL_GAME_REGISTRY["leo-number-path"].blurbHe, "זוגי ואי־זוגי, כפולות, קפיצות וסדרות");
assert.strictEqual(EDUCATIONAL_GAME_REGISTRY["leo-pizzeria"].blurbHe, "בניית שברים, שברים שווים והשוואה");
assert.strictEqual(PIZZA_DIFF.medium.hint, "בניית שברים, שברים שווים והשוואה");
assert.strictEqual(PIZZA_DIFF.hard.hint, "שברים שווים, השוואה וחיבור חזותי");

const diffs = /** @type {const} */ (["easy", "medium", "hard"]);

for (const d of diffs) {
  for (let s = 0; s < 100; s += 1) {
    // gifts
    for (const task of buildGiftsSessionRun(d)) {
      const prompt = giftsPrompt(task);
      assertNoForbidden(prompt, `gifts/${d}/${task.mode}`);
      if (task.mode === "make_groups") {
        const size = task.groupSize ?? task.operands.divisor;
        if (task.expectedAnswer.remainder > 0) {
          assert.strictEqual(
            prompt,
            `יש ${task.total} ${task.itemLabel}. שמים ${size} בכל שקית. כמה שקיות מלאות אפשר להכין וכמה יישארו?`
          );
        } else {
          assert.strictEqual(
            prompt,
            `יש ${task.total} ${task.itemLabel}. שמים ${size} בכל שקית. כמה שקיות מלאות אפשר להכין?`
          );
        }
      } else {
        const children = task.children ?? task.operands.divisor;
        if (task.expectedAnswer.remainder > 0 || task.mode === "find_remainder") {
          assert.strictEqual(
            prompt,
            `חלקו ${task.total} ${task.itemLabel} שווה בשווה בין ${children} ילדים. כמה יקבל כל ילד וכמה יישארו?`
          );
        } else {
          assert.strictEqual(
            prompt,
            `חלקו ${task.total} ${task.itemLabel} שווה בשווה בין ${children} ילדים. כמה יקבל כל ילד?`
          );
        }
      }
      assert.ok(prompt.endsWith("?"), `gifts question mark: ${prompt}`);
      const sol = giftsSolutionParts(task);
      assertNoForbidden(sol.text, "gifts sol");
      assertNoForbidden(sol.equation, "gifts eq");
      assert.ok(/^[0-9]/.test(sol.equation) || /^\d/.test(sol.equation));
      assertNoForbidden(giftsFeedback(true, task), "gifts fb ok");
      assertNoForbidden(giftsFeedback(false, task), "gifts fb bad");
    }

    // bakery
    for (const task of buildBakerySessionRun(d)) {
      const prompt = bakeryPrompt(task);
      assertNoForbidden(prompt, `bakery/${d}/${task.mode}`);
      if (task.mode === "build") {
        assert.strictEqual(prompt, `הכינו ${task.trays} מגשים. שימו ${task.perTray} מאפים בכל מגש.`);
      } else if (task.mode === "findTotal") {
        assert.strictEqual(
          prompt,
          `יש ${task.trays} מגשים, ובכל מגש ${task.perTray} מאפים. כמה מאפים יש בסך הכול?`
        );
        assert.ok(prompt.endsWith("?"));
      } else if (task.mode === "findTrays") {
        assert.strictEqual(
          prompt,
          `יש ${task.total} מאפים. בכל מגש שמים ${task.perTray} מאפים. כמה מגשים צריך?`
        );
      } else if (task.mode === "findPerTray") {
        assert.strictEqual(
          prompt,
          `מחלקים ${task.total} מאפים שווה בשווה בין ${task.trays} מגשים. כמה מאפים יהיו בכל מגש?`
        );
      } else if (task.mode === "sameTotal") {
        const g = task.givenArrangement;
        assert.strictEqual(
          prompt,
          `יש ${task.total} מאפים. עכשיו הם מסודרים ב־${g?.trays} מגשים, ${g?.perTray} בכל מגש. סדרו את אותה כמות במספר אחר של מגשים.`
        );
      }
      const hint = bakeryControlHint(task);
      assertNoForbidden(hint, "bakery hint");
      const sol = bakerySolutionParts(task);
      assertNoForbidden(sol.text, "bakery sol");
      assertNoForbidden(sol.equation, "bakery eq");
      assert.ok(sol.equation.includes("×") && sol.equation.includes("="));
      assertNoForbidden(bakeryFeedback(true), "bakery fb");
      assertNoForbidden(bakeryFeedback(false), "bakery fb");
    }

    // number path
    for (const task of buildOrderedSessionRun(d)) {
      assertNoForbidden(task.promptHe, `path/${d}/${task.rule}`);
      assertNoForbidden(pathFeedback(true), "path fb");
      assertNoForbidden(pathFeedback(false), "path fb");
      const sol = pathSolutionParts(task);
      assert.strictEqual(sol.text, "המסלול הנכון:");
      assertNoForbidden(sol.pathLtr, "path ltr");
      if (task.rule === "even") assert.strictEqual(task.promptHe, "בחרו את כל המספרים הזוגיים.");
      if (task.rule === "odd") assert.strictEqual(task.promptHe, "בחרו את כל המספרים האי־זוגיים.");
      if (task.rule === "multiples") {
        assert.strictEqual(task.promptHe, `בחרו את כל הכפולות של ${task.multiple}.`);
      }
    }

    // supermarket
    for (const c of generateCustomers(d)) {
      const req = customerRequestText(c);
      assertNoForbidden(req, "sm req");
      assert.ok(req.startsWith("אפשר לקבל "));
      assert.ok(req.endsWith("?"));
      assert.ok(!req.includes("אני רוצה"));
    }

    // pizzeria
    for (const order of pickCustomersForRun(d)) {
      assertNoForbidden(order.greeting, `pz greet ${order.variant}`);
      assertNoForbidden(order.ticketLine, `pz ticket ${order.variant}`);
      const sol = pizzeriaSolutionText(order);
      assertNoForbidden(sol, `pz sol ${order.variant}`);
      if (order.variant === "build_fraction") {
        assert.strictEqual(order.greeting, "הכינו פיצה לפי השבר המוצג.");
        assert.strictEqual(order.ticketLine, "סמנו את מספר הפרוסות המתאים.");
        assert.strictEqual(sol, "פתרון: כך מסמנים את השבר.");
      }
      if (order.variant === "identify_fraction") {
        assert.strictEqual(order.greeting, "כמה פרוסות מסומנות?");
        assert.strictEqual(order.ticketLine, "בחרו את מספר הפרוסות המסומנות.");
      }
      if (order.variant === "compare_fractions") {
        assert.strictEqual(order.greeting, "איזה שבר גדול יותר?");
        assert.strictEqual(order.ticketLine, "בחרו את התשובה הנכונה.");
      }
      const missing = validatePizzeriaAnswer(order, {});
      if (!order.spec && order.variant !== "identify_fraction" && order.variant !== "compare_fractions") {
        // skip
      } else if (order.variant === "identify_fraction" || order.variant === "compare_fractions") {
        assert.notStrictEqual(missing.message, "משימה לא תקינה");
        assertNoForbidden(missing.message || "x", "pz validate");
      }
    }
  }
}

console.log("OK — approved Hebrew wording selftest passed");
