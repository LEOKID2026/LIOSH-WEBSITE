#!/usr/bin/env node
/**
 * Offline smoke test for leo-word-train + leo-word-detective.
 *
 * Requires:
 *   npm run build
 *   npx next start -p 3099
 *
 * Optional:
 *   OFFLINE_TEST_BASE=http://127.0.0.1:3099
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.OFFLINE_TEST_BASE || "http://127.0.0.1:3099";
const HUB = `${BASE}/student/offline/educational`;
const ERROR_TEXT = "אופס! משהו השתבש";

const GAMES = [
  {
    key: "leo-word-train",
    hubTitle: "רכבת המילים",
    route: `${BASE}/student/offline/educational/leo-word-train`,
    submitPattern: /הוציאו רכבת/,
    progressPattern: /🚂\s*1\/20/,
    progressAfterPattern: /🚂\s*2\/20/,
    successPattern: /הרכבת יוצאת|יוצאים/,
    planFn: trainPlanScript,
    solve: solveTrainTask,
  },
  {
    key: "leo-word-detective",
    hubTitle: "בלש המילים",
    route: `${BASE}/student/offline/educational/leo-word-detective`,
    submitPattern: /פתור תיק/,
    progressPattern: /🕵️\s*1\/20/,
    progressAfterPattern: /🕵️\s*2\/20/,
    successPattern: /התיק נפתר/,
    planFn: detectivePlanScript,
    solve: solveDetectiveTask,
  },
];

function loadRequiredChunkUrls() {
  const buildId = fs.readFileSync(path.join(ROOT, ".next", "BUILD_ID"), "utf8").trim();
  const sandbox = { self: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, ".next", "static", buildId, "_buildManifest.js"), "utf8"),
    sandbox,
  );
  const manifest = sandbox.self.__BUILD_MANIFEST;
  const pages = [
    "/student/offline/educational/[gameKey]",
    "/student/educational-games/leo-word-train",
    "/student/educational-games/leo-word-detective",
  ];
  const files = new Set();
  for (const page of pages) {
    for (const f of manifest[page] || []) {
      files.add(f.startsWith("static/") ? `/_next/${f}` : `/_next/static/${f}`);
    }
  }
  return [...files];
}

function trainPlanScript() {
  const cardButtons = () => {
    const panelTitle = [...document.querySelectorAll("p")].find((p) =>
      p.textContent.includes("קלפים לעמיסה"),
    );
    const panel = panelTitle?.closest("aside, div");
    return [...(panel?.querySelectorAll("button") || [])].filter((b) => !b.disabled);
  };

  const hasCard = (label) =>
    cardButtons().some(
      (b) => b.textContent.trim().toLowerCase() === String(label).toLowerCase(),
    );

  const trainRow = document.querySelector("button[data-train-slot]")?.parentElement;
  const fixed = trainRow
    ? [...trainRow.querySelectorAll(":scope > div span")]
        .map((e) => e.textContent.trim())
        .filter(Boolean)
    : [];

  /** @type {string[]} */
  const pattern = [];
  if (trainRow) {
    for (const el of trainRow.children) {
      if (el.tagName === "SPAN" && el.textContent.includes("🚂")) continue;
      if (el.tagName === "DIV") {
        pattern.push(el.querySelector("span")?.textContent?.trim() || "_");
      } else if (el.tagName === "BUTTON") {
        const label = el.querySelector("span")?.textContent?.trim();
        pattern.push(label || "_");
      }
    }
  }

  if (fixed.length === 1) {
    const ref = fixed[0];
    if (ref.length === 1 && ref === ref.toUpperCase() && ref !== ref.toLowerCase()) {
      const cardLabel = ref.toLowerCase();
      if (hasCard(cardLabel)) return { ok: true, type: "upper_to_lower", cardLabel };
    }
    if (ref.length === 1 && ref === ref.toLowerCase() && ref !== ref.toUpperCase()) {
      const cardLabel = ref.toUpperCase();
      if (hasCard(cardLabel)) return { ok: true, type: "lower_to_upper", cardLabel };
    }
    if (ref.length >= 2) {
      const cardLabel = ref[0].toLowerCase();
      if (hasCard(cardLabel)) return { ok: true, type: "first_letter", cardLabel };
    }
  }

  if (pattern.includes("_")) {
    const KNOWN = [
      "sun",
      "dog",
      "cat",
      "hat",
      "run",
      "pen",
      "box",
      "cup",
      "bus",
      "map",
      "red",
      "big",
      "top",
      "fun",
    ];
    for (const w of KNOWN) {
      if (w.length !== pattern.length) continue;
      let match = true;
      for (let i = 0; i < w.length; i += 1) {
        if (pattern[i] !== "_" && pattern[i] !== w[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        const idx = pattern.indexOf("_");
        const cardLabel = w[idx];
        if (hasCard(cardLabel)) return { ok: true, type: "one_gap", word: w, cardLabel };
      }
    }
  }

  return { ok: false, fixed, pattern };
}

async function solveTrainTask(page, plan) {
  await page.getByRole("button", { name: plan.cardLabel, exact: true }).click();
  await page
    .locator("button[data-train-slot]")
    .filter({ has: page.locator("span[aria-hidden]") })
    .first()
    .click();
  return plan;
}

function detectivePlanScript() {
  const cardButtons = () => {
    const panelTitle = [...document.querySelectorAll("p")].find((p) =>
      p.textContent.includes("כרטיסי ראיות"),
    );
    const panel = panelTitle?.parentElement;
    return [...(panel?.querySelectorAll("button") || [])].filter((b) => !b.disabled);
  };

  const hasCardByText = (label) => cardButtons().some((b) => b.textContent.trim() === label);

  const findCardStartsWith = (letter) =>
    cardButtons().find((b) => b.textContent.trim().startsWith(letter))?.textContent.trim() || null;

  const missionCandidates = [...document.querySelectorAll("[data-educational-workplace-grid] p")]
    .map((p) => p.textContent.trim())
    .filter(Boolean);
  const mission =
    missionCandidates.find((t) => t.includes("—") || t.includes("_") || t.includes("מתחילה ב")) ||
    missionCandidates.find((t) => t.includes("תמונה")) ||
    missionCandidates[missionCandidates.length - 1] ||
    "";

  const dashWord = mission.match(/—\s*([\u0590-\u05FF]+)/);
  if (dashWord) {
    const first = dashWord[1][0];
    if (hasCardByText(first)) return { ok: true, type: "letter_drop", cardLabel: first };
  }

  const gapMatch = mission.match(
    /([\u0590-\u05FF]_+[\u0590-\u05FF]*|[\u0590-\u05FF]*_[\u0590-\u05FF]+)/,
  );
  if (gapMatch) {
    const frag = gapMatch[1];
    const GAPS = {
      "שו_חן": "ל",
      "י_ד": "ל",
      "ס_פר": "פ",
      "ע_נן": "נ",
      "מ_ים": "י",
      "כ_סא": "י",
      "ג_שם": "ש",
      "ח_לון": "ל",
      "_ית": "ב",
      "כ_ב": "ל",
    };
    const letter = GAPS[frag];
    if (letter && hasCardByText(letter)) return { ok: true, type: "fill_gap", cardLabel: letter, frag };
  }

  const sortMatch = mission.match(/מתחילה ב־(.)/);
  if (sortMatch) {
    const letter = sortMatch[1];
    const cardLabel = findCardStartsWith(letter);
    if (cardLabel) return { ok: true, type: "sort_letter", cardLabel, letter };
  }

  const emojiEl = [...document.querySelectorAll("[data-educational-workplace-grid] span")].find(
    (s) => /^[\p{Extended_Pictographic}]/u.test(s.textContent.trim()),
  );
  const emoji = emojiEl?.textContent.trim();
  const EMOJI_WORD = {
    "🏠": "בית",
    "🍎": "תפוח",
    "✏️": "עיפרון",
    "🐟": "דג",
    "🎈": "בלון",
    "🚌": "אוטובוס",
    "🌙": "ירח",
    "🐕": "כלב",
    "🐱": "חתול",
    "📚": "ספר",
    "🌳": "עץ",
    "💧": "מים",
    "☀️": "שמש",
    "🌸": "פרח",
  };
  if (emoji && EMOJI_WORD[emoji] && hasCardByText(EMOJI_WORD[emoji])) {
    return { ok: true, type: "image_word", cardLabel: EMOJI_WORD[emoji], emoji };
  }

  return { ok: false, mission, emoji: emoji || null };
}

async function solveDetectiveTask(page, plan) {
  await page.getByRole("button", { name: plan.cardLabel, exact: true }).click();
  await page.locator("[data-detective-zone]").first().click();
  return plan;
}

function isBlockedOfflineRequest(url) {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/api/")) return true;
    if (/supabase\.co/i.test(u.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

async function registerServiceWorker(page) {
  await page.goto(HUB, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/student/sw.js", { scope: "/student/" });
    await new Promise((r) => setTimeout(r, 3500));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function assertNoOops(page, step) {
  const count = await page.getByText(ERROR_TEXT).count();
  if (count > 0) {
    throw new Error(`${step}: error boundary visible`);
  }
}

async function dismissPortraitModal(page) {
  const continueBtn = page.getByRole("button", { name: "המשך בכל זאת" });
  if ((await continueBtn.count()) > 0) {
    await continueBtn.click();
  }
}

async function startOfflineGame(page, game) {
  await page.goto(game.route, { waitUntil: "domcontentloaded" });
  await assertNoOops(page, `${game.key} load`);
  await page.getByText("בחרו רמת קושי").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "קל", exact: true }).click();
  await page.getByRole("button", { name: "התחל משחק" }).click();
  await dismissPortraitModal(page);
  await page.getByText(game.progressPattern).waitFor({ timeout: 20000 });
}

async function smokeGame(page, game, chunkUrls) {
  const result = {
    key: game.key,
    hubCard: false,
    loaded: false,
    started: false,
    taskSolved: false,
    submitted: false,
    advanced: false,
    offlineChunksOk: false,
    blockedFetches: [],
    solveInfo: null,
    error: null,
  };

  try {
    await page.goto(HUB, { waitUntil: "domcontentloaded" });
    await assertNoOops(page, `${game.key} hub`);

    const card = page.getByRole("link", { name: new RegExp(game.hubTitle) });
    result.hubCard = (await card.count()) > 0;
    if (!result.hubCard) throw new Error(`hub card missing: ${game.hubTitle}`);

    await startOfflineGame(page, game);
    result.loaded = true;
    result.started = true;

    await page.context().setOffline(true);

    const offlineChunkResults = await page.evaluate(async (urls) => {
      return Promise.all(
        urls.map(async (url) => {
          try {
            const res = await fetch(url);
            return { url, ok: res.ok, status: res.status };
          } catch (err) {
            return { url, ok: false, error: String(err) };
          }
        }),
      );
    }, chunkUrls);
    const offlineChunkFailed = offlineChunkResults.filter((r) => !r.ok);
    result.offlineChunksOk = offlineChunkFailed.length === 0;
    if (!result.offlineChunksOk) {
      result.offlineChunkFailed = offlineChunkFailed.slice(0, 5);
      throw new Error(`offline chunk fetch failed (${offlineChunkFailed.length})`);
    }

    /** @type {string[]} */
    const blockedFetches = [];
    const onRequest = (req) => {
      if (isBlockedOfflineRequest(req.url())) blockedFetches.push(req.url());
    };
    page.on("request", onRequest);

    const plan = await page.evaluate(game.planFn);
    if (!plan?.ok) {
      throw new Error(`could not plan first task: ${JSON.stringify(plan)}`);
    }
    result.solveInfo = await game.solve(page, plan);
    result.taskSolved = true;

    await page.getByRole("button", { name: game.submitPattern }).click();
    await page.getByText(game.successPattern).first().waitFor({ timeout: 12000 });
    result.submitted = true;

    await page.getByText(game.progressAfterPattern).first().waitFor({ timeout: 15000 });
    result.advanced = true;

    await assertNoOops(page, `${game.key} after task`);

    page.off("request", onRequest);
    result.blockedFetches = blockedFetches;
    if (blockedFetches.length > 0) {
      throw new Error(`API/fetch during offline play: ${blockedFetches.slice(0, 3).join(", ")}`);
    }

    await page.context().setOffline(false);
  } catch (err) {
    result.error = String(err.message || err);
    await page.context().setOffline(false).catch(() => {});
  }

  return result;
}

async function main() {
  const chunkUrls = loadRequiredChunkUrls();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await registerServiceWorker(page);

  const gameResults = [];
  for (const game of GAMES) {
    gameResults.push(await smokeGame(page, game, chunkUrls));
  }

  const ok = gameResults.every(
    (r) =>
      r.hubCard &&
      r.loaded &&
      r.started &&
      r.taskSolved &&
      r.submitted &&
      r.advanced &&
      r.offlineChunksOk &&
      r.blockedFetches.length === 0 &&
      !r.error,
  );

  console.log(
    JSON.stringify(
      {
        ok,
        base: BASE,
        hub: HUB,
        chunkCount: chunkUrls.length,
        games: gameResults,
      },
      null,
      2,
    ),
  );

  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err.message || err) }, null, 2));
  process.exit(1);
});
