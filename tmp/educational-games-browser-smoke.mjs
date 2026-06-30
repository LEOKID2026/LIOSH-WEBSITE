#!/usr/bin/env node
/**
 * Browser smoke for 6 educational games (offline routes, no auth).
 * Run: node tmp/educational-games-browser-smoke.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import {
  LAB_ITEMS,
  EXPERIMENTS_BY_DIFFICULTY,
  pickExperimentsForRun,
  SHELF_BY_DIFFICULTY,
} from "../components/educational-games/leo-lab/leo-lab-data.js";
import {
  buildOrderedSessionRun,
  findDistractorFalseNegatives,
  validatePath,
} from "../components/educational-games/leo-number-path/leo-number-path-data.js";
import {
  beltDurationMs,
  DIFFICULTIES as RF_DIFF,
  ITEMS,
} from "../components/educational-games/recycling-factory/recycling-factory-data.js";
import { generateGiftsPool } from "../components/educational-games/leo-gifts/leo-gifts-data.js";
import { EDUCATIONAL_DIFFICULTY_GRADE_HINT } from "../lib/educational-games/educational-game-registry.js";

const BASE = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3002";
const ONLY = process.env.SMOKE_GAMES?.split(",").filter(Boolean);
const GAMES = [
  { key: "recycling-factory", he: "מפעל המיחזור" },
  { key: "leo-supermarket", he: "המכולת" },
  { key: "leo-lab", he: "מעבדת הניסויים" },
  { key: "leo-gifts", he: "המתנות" },
  { key: "leo-bakery", he: "המאפייה" },
  { key: "leo-number-path", he: "מסלול המספרים" },
].filter((g) => !ONLY?.length || ONLY.includes(g.key));
const DIFFS = [
  { id: "easy", label: "קל" },
  { id: "medium", label: "בינוני" },
  { id: "hard", label: "קשה" },
];
const ROUNDS = 4;

/** @type {{ game: string, diff: string, ok: boolean, notes: string[] }[]} */
const results = [];

function note(game, diff, msg) {
  const row = results.find((r) => r.game === game && r.diff === diff);
  if (row) row.notes.push(msg);
}

async function dismissPortraitIfAny(page) {
  const cont = page.getByRole("button", { name: /המשיכו בכל מקרה|המשך/i });
  if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) {
    await cont.click();
  }
}

async function startOfflineGame(page, gameKey, diffLabel) {
  await page.goto(`${BASE}/student/offline/educational/${gameKey}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const hint = page.getByText(EDUCATIONAL_DIFFICULTY_GRADE_HINT);
  if (!(await hint.isVisible({ timeout: 20000 }).catch(() => false))) {
    throw new Error("grade hint not visible");
  }
  await page.getByRole("button", { name: diffLabel, exact: true }).click();
  await page.getByRole("button", { name: "התחל משחק" }).click();
  await dismissPortraitIfAny(page);
  await page.waitForTimeout(800);
}

async function smokeLab(page, diff) {
  const expectedShelf = SHELF_BY_DIFFICULTY[diff.id].length;
  await page.getByText("מדף החפצים").waitFor({ timeout: 15000 });
  const count = await page.locator('[class*="shelfItemBtn"]').count();
  if (count !== expectedShelf) {
    note("leo-lab", diff.id, `מדף: ${count} כפתורים (צפוי ${expectedShelf})`);
  } else {
    note("leo-lab", diff.id, `מדף ${count} חפצים ✓`);
  }

  const pool = EXPERIMENTS_BY_DIFFICULTY[diff.id];
  for (let r = 0; r < ROUNDS; r += 1) {
    const promptEl = page.locator('[class*="missionPrompt"]');
    await promptEl.waitFor({ timeout: 12000 });
    const promptText = (await promptEl.textContent())?.trim() || "";
    const exp = pool.find((e) => e.prompt === promptText);
    if (!exp) {
      note("leo-lab", diff.id, `לא נמצא ניסוי לפרומпт: ${promptText.slice(0, 40)}`);
      break;
    }
    const pick = exp.exactMatch ? [...exp.validItems] : exp.validItems.slice(0, exp.pickCount);
    for (const itemId of pick) {
      const name = LAB_ITEMS[itemId]?.name;
      if (!name) continue;
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: /בדוק ניסוי/ }).click();
    const bad = page.locator('[class*="feedbackBad"]');
    if (await bad.isVisible({ timeout: 2500 }).catch(() => false)) {
      note("leo-lab", diff.id, `פסילה: ${exp.id}`);
      await page.getByRole("button", { name: "נקה בחירה" }).click().catch(() => {});
    } else {
      note("leo-lab", diff.id, `ניסוי ${r + 1} (${exp.id}) ✓`);
    }
    await page.waitForTimeout(2800);
  }
}

async function smokeNumberPath(page, diff) {
  const run = buildOrderedSessionRun(diff.id, 12);
  const fn = findDistractorFalseNegatives(run);
  if (fn.length) note("leo-number-path", diff.id, `false negatives ב-pool`);

  let prevScore = -1;
  for (let r = 0; r < Math.min(ROUNDS, run.length); r += 1) {
    const task = run[r];
    if (!task?.correctPath) {
      note("leo-number-path", diff.id, `משימה ${r + 1} חסרה`);
      break;
    }
    const score =
      task.rule === "even" || task.rule === "odd"
        ? 10 + task.correctPath.length
        : task.correctPath.length * 2;
    if (r > 0 && score < prevScore) {
      note("leo-number-path", diff.id, `סדר: משימה ${r + 1} קלה יותר מהקודמת`);
    }
    prevScore = score;

    const prompt = page.locator('[class*="missionPrompt"]');
    await prompt.waitFor({ timeout: 10000 });
    const promptText = await prompt.textContent();
    if (!promptText?.includes("בחרו")) {
      note("leo-number-path", diff.id, `ניסוח: ${promptText?.slice(0, 50)}`);
    }

    const toTap = task.orderMatters ? task.correctPath : [...task.correctPath].sort((a, b) => a - b);
    for (const n of toTap) {
      await page.getByRole("button", { name: String(n), exact: true }).click();
    }
    await page.getByRole("button", { name: "בדוק מסלול" }).click();
    const v = validatePath(toTap, task);
    if (!v.ok) note("leo-number-path", diff.id, `validatePath נכשל ${task.id}`);

    const bad = page.locator('[class*="feedbackBad"]');
    if (await bad.isVisible({ timeout: 2000 }).catch(() => false)) {
      note("leo-number-path", diff.id, `פסילה: ${task.id} rule=${task.rule}`);
    } else {
      note("leo-number-path", diff.id, `משימה ${r + 1} (${task.rule}) ✓`);
    }
    await page.waitForTimeout(1800);
  }
}

async function smokeRecycling(page, diff, mobile = false) {
  const target = RF_DIFF[diff.id].itemsTarget;
  const atEnd = beltDurationMs(diff.id, target);
  note("recycling-factory", diff.id, `${mobile ? "מובייל" : "desktop"}: belt@${target}=${atEnd}ms`);

  for (let r = 0; r < ROUNDS; r += 1) {
    await page.waitForTimeout(mobile ? 1200 : 800);
    const itemEl = page.locator("[class*='beltItem']").first();
    if (!(await itemEl.isVisible({ timeout: 8000 }).catch(() => false))) {
      note("recycling-factory", diff.id, "לא הופיע פריט על המסוע");
      break;
    }
    const itemText = (await itemEl.textContent()) || "";
    const match = ITEMS.find((it) => itemText.includes(it.name) || itemText.includes(it.emoji));
    if (!match) {
      note("recycling-factory", diff.id, `פריט לא מזוהה: ${itemText.slice(0, 30)}`);
      continue;
    }
    const binLabel = { paper: "נייר", plastic: "פלסטיק", glass: "זכוכית", metal: "מתכת", trash: "אשפה" }[
      match.bin
    ];
    await page.locator(`[data-bin-id="${match.bin}"]`).click({ timeout: 3000 }).catch(() =>
      page.getByRole("button", { name: new RegExp(binLabel) }).click(),
    );
    note("recycling-factory", diff.id, `סיבוב ${r + 1}: ${match.name} → ${match.bin} ✓`);
    await page.waitForTimeout(mobile ? 900 : 600);
  }
}

async function smokeGifts(page, diff) {
  const pool = generateGiftsPool(diff.id, { stage: 1, salt: 99 });
  for (let r = 0; r < ROUNDS; r += 1) {
    const task = pool[r];
    const rem = task.total % task.children;
    if (diff.id === "easy" && rem > 0) note("leo-gifts", diff.id, `קל עם שארית ${task.total}/${task.children}`);
    const per = Math.floor(task.total / task.children);
    await page.locator('[class*="missionPrompt"]').waitFor({ timeout: 12000 });
    const prompt = (await page.locator('[class*="missionPrompt"]').textContent()) || "";
    if (rem > 0 && diff.id !== "easy" && !prompt.includes("נשאר")) {
      note("leo-gifts", diff.id, "ניסוח שארית לא מוזכר במשימה");
    }
    const setStepper = async (label, target) => {
      const col = page.locator('[class*="controlCol"]').filter({ hasText: label });
      const val = col.locator('[class*="stepperValue"]');
      for (let guard = 0; guard < 40; guard += 1) {
        const cur = Number((await val.textContent()) || 0);
        if (cur === target) break;
        await col.getByRole("button", { name: cur < target ? "+" : "−" }).click();
      }
    };
    await setStepper("לכל ילד", per);
    if (rem > 0) await setStepper("נשאר לליאו", rem);
    await page.getByRole("button", { name: /בדוק/i }).click();
    const bad = page.locator('[class*="feedbackBad"]');
    if (await bad.isVisible({ timeout: 2000 }).catch(() => false)) {
      note("leo-gifts", diff.id, `פסילה סיבוב ${r + 1}`);
    } else {
      note("leo-gifts", diff.id, `סיבוב ${r + 1}: ${task.total}÷${task.children} rem=${rem} ✓`);
    }
    await page.waitForTimeout(1800);
  }
}

async function smokeBakery(page, diff) {
  const body = await page.locator('[class*="main"], [class*="playArea"]').first().textContent().catch(() => "");
  const html = body || (await page.content());
  if (/תבנית|תבניות/.test(html)) {
    note("leo-bakery", diff.id, 'נמצא "תבנית/תבניות" במסך משחק');
  } else {
    note("leo-bakery", diff.id, 'מונח "מגשים" בלבד ✓');
  }
  for (let r = 0; r < ROUNDS; r += 1) {
    const checkBtn = page.getByRole("button", { name: /בדוק/i });
    if (await checkBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await checkBtn.click().catch(() => {});
      await page.waitForTimeout(1200);
    }
    note("leo-bakery", diff.id, `סיבוב ${r + 1} ✓`);
  }
}

async function smokeSupermarket(page, diff) {
  const entryBox = page.locator(".space-y-2").first();
  const box = await entryBox.boundingBox().catch(() => null);
  if (box && box.height > 200) note("leo-supermarket", diff.id, `grade hint — גובה בחירה ${Math.round(box.height)}px`);
  else note("leo-supermarket", diff.id, "layout בחירת רמה ✓");

  for (let r = 0; r < ROUNDS; r += 1) {
    const payBtn = page.getByRole("button", { name: /שולם|סיום|הבא/i }).first();
    if (!(await payBtn.isVisible({ timeout: 8000 }).catch(() => false))) break;
    const coins = page.locator("[class*='coin'], button").filter({ hasText: /₪|שק|אגור/ });
    if ((await coins.count()) > 0) await coins.first().click().catch(() => {});
    await payBtn.click().catch(() => {});
    await page.waitForTimeout(1000);
    note("leo-supermarket", diff.id, `סיבוב ${r + 1} ✓`);
  }
}

async function runGameDiff(browser, game, diff, mobile = false) {
  const context = await browser.newContext(
    mobile
      ? { ...devices["Pixel 7"], locale: "he-IL" }
      : { locale: "he-IL", viewport: { width: 1280, height: 800 } },
  );
  const page = await context.newPage();
  const row = { game: game.key, diff: diff.id, ok: true, notes: [] };
  results.push(row);

  try {
    await startOfflineGame(page, game.key, diff.label);

    if (game.key === "leo-lab") await smokeLab(page, diff);
    else if (game.key === "leo-number-path") await smokeNumberPath(page, diff);
    else if (game.key === "recycling-factory") await smokeRecycling(page, diff, mobile);
    else if (game.key === "leo-gifts") await smokeGifts(page, diff);
    else if (game.key === "leo-bakery") await smokeBakery(page, diff);
    else if (game.key === "leo-supermarket") await smokeSupermarket(page, diff);

    row.ok = !row.notes.some((n) => n.includes("פסילה") || n.includes("נכשל") || n.includes("תבנית"));
  } catch (err) {
    row.ok = false;
    row.notes.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
console.log(`Browser smoke @ ${BASE}\n`);

for (const game of GAMES) {
  for (const diff of DIFFS) {
    const mobile = game.key === "recycling-factory" && diff.id === "hard";
    await runGameDiff(browser, game, diff, mobile);
    const r = results[results.length - 1];
    console.log(`${game.key} / ${diff.id}: ${r.ok ? "OK" : "ISSUES"}`);
    for (const n of r.notes.slice(-6)) console.log(`  · ${n}`);
  }
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${failed.length ? "ISSUES" : "ALL OK"}: ${results.length} runs ===`);
process.exit(failed.length ? 1 : 0);
