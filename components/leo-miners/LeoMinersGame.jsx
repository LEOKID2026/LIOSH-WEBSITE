import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useGameAudio } from "../../hooks/useGameAudio";
import { pointsBaseForStage, OFFLINE_DPS_FACTOR, DAILY_CAP_DISPLAY } from "../../lib/leo-miners/leo-miners-formulas.client.js";
import {
  activateLeoMinersGameplayConfig,
  getLeoMinersGameplayConfig,
} from "../../lib/leo-miners/leo-miners-gameplay-config.client.js";

const DAILY_CAP = DAILY_CAP_DISPLAY;
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}
const round2 = (x) => Number((Number(x) || 0).toFixed(2));
function addPlayerScorePoints(_s, basePoints) {
  if (!basePoints || basePoints <= 0) return 0;
  return round2(basePoints);
}
function finalizeDailyRewardOncePerTick() {}
function rockStageNow(rock) {
  return (Number(rock?.idx ?? 0) || 0) + 1;
}

// --- iOS 100vh fix (sets --app-100vh = window.innerHeight) ---
// --- iOS 100vh fix (sets --app-100vh = visual viewport height) ---
function useIOSViewportFix() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    const setVH = () => {
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty("--app-100vh", `${Math.round(h)}px`);
    };

    // init + “התייצבות” אחרי שינוי אוריינטציה
    const onOrient = () => requestAnimationFrame(() => setTimeout(setVH, 250));

    setVH();
    if (vv) {
      vv.addEventListener("resize", setVH);
      vv.addEventListener("scroll", setVH); // URL bar collapse/expand
    }
    window.addEventListener("orientationchange", onOrient);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", setVH);
        vv.removeEventListener("scroll", setVH);
      }
      window.removeEventListener("orientationchange", onOrient);
    };
  }, []);
}



// ====== Config ======
const LANES = 3;
const SLOTS_PER_LANE = 4;
const MAX_MINERS = LANES * SLOTS_PER_LANE;
/** Board Y centers per lane (fraction of board height): 0.46, 0.60, 0.78 — rail alignment. */
const LANE_CENTER_Y_FRACS = [0.46, 0.60, 0.78];
const PADDING = 6;
const LS_KEY = "liosh_miners_board_v1";
// First–play terms acceptance gate (global versioned)

// Assets
const IMG_BG    = "/images/leo-miners/bg-cave.png";
const IMG_MINER = "/images/leo-miners/leo-miner-4x.png";
const IMG_ROCK  = "/images/leo-miners/rock.png";
const IMG_COIN  = "/images/leo-miners/silver.png";
const IMG_SPAWN_ICON = "/images/leo-miners/spawn-icon.png";

// ===== Debug helpers =====
 const DEBUG_LS = "liosh_miners_debug_ui";
 const DEBUG_HOSTS = ["localhost","127.0.0.1","0.0.0.0"];
 function getDebugFlag(){
   try { return localStorage.getItem(DEBUG_LS) === "1"; } catch { return false; }
 }
 function setDebugFlag(on){
   try { if(on) localStorage.setItem(DEBUG_LS,"1"); else localStorage.removeItem(DEBUG_LS); } catch {}
 }
 function isLocalHost(){
   try { return DEBUG_HOSTS.includes(location.hostname); } catch { return false; }
 }
/** Dev-only: persisted index 0 = default BG, 1…N = /images/bg-caveN.png */
 const DEV_BG_LS_KEY = "liosh_miners_dev_bg_index";
 const DEV_BG_VARIANT_COUNT = 20;
 /** Dev-only rock sprite: 0 = default rock.png, 1–6 = /images/rockN.png */
 const DEV_ROCK_LS_KEY = "liosh_miners_dev_rock_index";
 const DEV_ROCK_VARIANT_COUNT = 6;
 function isDevBgPickerEnabled(){
   try {
     if (isLocalHost()) return true;
     const v = (process.env.NEXT_PUBLIC_DEBUG_UI || "").toLowerCase();
     return v === "true" || v === "1";
   } catch { return false; }
 }
 try {
   if (typeof window !== "undefined") {
     const z = localStorage.getItem("SPAWN_ICON_ZOOM");
     const y = localStorage.getItem("SPAWN_ICON_SHIFT_Y");
     if (z) window.SPAWN_ICON_ZOOM = parseFloat(z);
     if (y) window.SPAWN_ICON_SHIFT_Y = parseInt(y,10);
   }
 } catch {}
 

// ===== UI constants =====
const UI_BTN_H_PX = 48;         // גובה
// show/hide floating RESET button (bottom-left on canvas)
const SHOW_FLOATING_RESET = true; // ← שנה ל-false כדי להסתיר במהירות
const UI_BTN_MIN_W_PX = 150;    // רוחב מינימלי לכל כפתור (התאם מספר)
const UI_SPAWN_ICON_BOX = Math.round(UI_BTN_H_PX * 0.5);
const UI_SPAWN_ICON_ZOOM =
  (typeof window !== "undefined" && window.SPAWN_ICON_ZOOM) || 1.55;
const UI_SPAWN_ICON_SHIFT_Y =
  (typeof window !== "undefined" && window.SPAWN_ICON_SHIFT_Y) || 0;

// ==== ACTION BUTTON fixed size (ADD / DPS / GOLD) ====
const UI_ACTION_BTN_W_PX = 220; // רוחב אחיד לכל שלושת הכפתורים
const UI_ACTION_BTN_H_PX = 64;  // גובה מעט גבוה כדי להכיל 2 שורות טקסט

// מחלקות Tailwind (ערכים שרירותיים) מתוך הקבועים למעלה
const BTN_W_FIX = `w-[${UI_ACTION_BTN_W_PX}px]`;
const BTN_H_FIX = `h-[${UI_ACTION_BTN_H_PX}px]`;


// Balance — resolved from Admin gameplay config at hydrate (see leo-miners-gameplay-config.client.js)
function gp() {
  return getLeoMinersGameplayConfig();
}

// ===== Global gift phases (same for everyone) =====
const GIFT_PHASES = [
  { durSec: 30 * 60, intervalSec: 20 },
  { durSec: 30 * 60, intervalSec: 30 },
  { durSec: 30 * 60, intervalSec: 40 },
  { durSec: 30 * 60, intervalSec: 50 },
  { durSec: 60 * 60, intervalSec: 60 },
];
const GIFT_TOTAL_SEC = GIFT_PHASES.reduce((a, p) => a + p.durSec, 0);
const GLOBAL_ANCHOR_MS = Date.UTC(2025, 0, 1, 0, 0, 0); // 2025-01-01 00:00:00Z

function phaseAtGlobal(nowMs = Date.now()) {
  const cyc = Math.floor((nowMs - GLOBAL_ANCHOR_MS) / 1000);
  const mod = ((cyc % GIFT_TOTAL_SEC) + GIFT_TOTAL_SEC) % GIFT_TOTAL_SEC;
  let acc = 0;
  for (let i = 0; i < GIFT_PHASES.length; i++) {
    const ph = GIFT_PHASES[i];
    if (mod < acc + ph.durSec) {
      const into = mod - acc;
      const step = ph.intervalSec;
      const remainToNextGiftSec = step - (into % step || step);
      return { index:i, intervalSec: step, into, phaseRemainSec: ph.durSec - into, remainToNextGiftSec };
    }
    acc += ph.durSec;
  }
  const last = GIFT_PHASES[GIFT_PHASES.length - 1];
  return { index: GIFT_PHASES.length - 1, intervalSec: last.intervalSec, into: 0, phaseRemainSec: last.durSec, remainToNextGiftSec: last.intervalSec };
}

// === Gift timing helpers (global-cycle based) ===
function getPhaseInfo(s, now = Date.now()) {
  const ph = phaseAtGlobal(now);
  return {
    index: ph.index,
    into: ph.into,
    remain: ph.remainToNextGiftSec,
    intervalSec: ph.intervalSec,
    phaseRemainSec: ph.phaseRemainSec,
  };
}

function currentGiftIntervalSec(s, now = Date.now()) {
  const ph = phaseAtGlobal(now);
  if (s) s.lastGiftIntervalSec = ph.intervalSec; // לשמירה לשכבת ה-HUD בלבד
  return ph.intervalSec;
}



// פרסים
const DIAMOND_PRIZES = [
  { key: "coins_x10",   label: "מטבעות ×10" },
  { key: "dog+3",       label: "ליאו +3 רמות" },
  { key: "coins_x100",  label: "מטבעות ×100" },
  { key: "dog+5",       label: "ליאו +5 רמות" },
  { key: "coins_x1000", label: "מטבעות ×1000" },
  { key: "dog+7",       label: "ליאו +7 רמות" },
];
function rollDiamondPrize() {
  const r = Math.random();
  if (r < 0.55) return Math.random() < 0.5 ? "coins_x10" : "dog+3";
  if (r < 0.85) return Math.random() < 0.5 ? "coins_x100" : "dog+5";
  return Math.random() < 0.5 ? "coins_x1000" : "dog+7";
}


// ===== Formatting =====

// בסיס קיצורים (אלפים עד טריליון)
const SUFFIXES_BASE = ["", "K", "M", "B", "T"];


// קיצור עם ספרה אחת אחרי הנקודה (חיתוך, לא עיגול) — לשימוש HUD/כפתורים בלבד
function formatAbbrevInt1(n) {
  const sign = (n || 0) < 0 ? "-" : "";
  const abs  = Math.abs(Number(n) || 0);
  const p = 10; // ספרה אחת
  if (abs < 1000) {
    const t = Math.trunc(abs * p) / p;
    return sign + t.toFixed(1);
  }
  let tier = Math.floor(Math.log10(abs) / 3);
  let div  = Math.pow(1000, tier);
  let val  = abs / div;
  let trimmed = Math.trunc(val * p) / p;
  if (trimmed >= 1000) { tier += 1; trimmed = 1; }
  return sign + trimmed.toFixed(1) + suffixFromTier(tier);
}
const formatShort1 = formatAbbrevInt1;     // מטבעות/עלויות ב-HUD
function formatPointsShort1(n){ return formatAbbrevInt1(n); } // נקודות ב-HUD


// ממפה דרגת אלפים לסיומת: 0→"" , 1→K, 2→M, 3→B, 4→T, 5→AA, 6→AB, ... עד אינסוף
function suffixFromTier(tier) {
  if (tier < SUFFIXES_BASE.length) return SUFFIXES_BASE[tier];
  const idx = tier - SUFFIXES_BASE.length; // 0→AA, 1→AB ...
  // ממיר למחרוזת אותיות בסגנון גיליון (A..Z, AA..), ומבריח ל-2+ אותיות
  let n = idx + 26; // 26→"AA"
  let s = "";
  while (n >= 0) {
    const q = Math.floor(n / 26) - 1;
    const r = n - (q + 1) * 26;
    s = String.fromCharCode(65 + r) + s;
    n = q;
  }
  if (s.length === 1) s = "A" + s; // הבטח מינימום 2 תווים
  return s;
}

// קיצור מספרים כללי עם 2 ספרות אחרי הנקודה (חיתוך, לא עיגול)
function formatAbbrevInt(n) {
  const sign = (n || 0) < 0 ? "-" : "";
  const abs  = Math.abs(Number(n) || 0);
  const p = 100; // 2 ספרות

  if (abs < 1000) {
    const t = Math.trunc(abs * p) / p;
    return sign + t.toFixed(2);
  }

  let tier = Math.floor(Math.log10(abs) / 3); // 1=K, 2=M...
  let div  = Math.pow(1000, tier);
  let val  = abs / div;

  // חיתוך ל-2 ספרות
  let trimmed = Math.trunc(val * p) / p;

  // נרמול קצה: 1000.00 → קפיצה לדרגה הבאה
  if (trimmed >= 1000) {
    tier += 1;
    trimmed = 1;
  }

  return sign + trimmed.toFixed(2) + suffixFromTier(tier);
}


// שמירה על השם הקיים בקוד
const formatShort = formatAbbrevInt;

// נקודות — 3 ספרות אחרי הנקודה בכל טווח (בלי קיצור), חיתוך לא עיגול
function formatPoints(n) {
  const num = Number(n || 0);
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const p = 1000; // 3 ספרות
  const t = Math.trunc(abs * p) / p;
  return sign + t.toFixed(3);
}


// נקודות קצר — קיצור עם 2 ספרות (ל-HUD/טוסטים/פופאפים)
function formatPointsShort(n) {
  return formatAbbrevInt(n);
}

// נקודות — 2 ספרות אחרי הנקודה (חיתוך, לא עיגול)
function formatPoints2(n) {
  const num = Number(n || 0);
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const p = 100; // 2 ספרות
  const t = Math.trunc(abs * p) / p;
  return sign + t.toFixed(2);
}

// === OFFLINE SESSION CLOCK (12h per session) ===
const OFFLINE_SESSION_MAX_HOURS = 12;
const OFFLINE_SESSION_MAX_MS = OFFLINE_SESSION_MAX_HOURS * 3600000;
/** Gift ready but unclaimed this long → idle-offline efficiency (matches MLEO source). */
const IDLE_OFFLINE_MS = 5 * 60 * 1000;

// Tiers (per session cumulated time)
const OFFLINE_EFF_TIERS_SESSION = [
  { upToHours: 2,  eff: 0.50 },
  { upToHours: 6,  eff: 0.30 },
  { upToHours: 12, eff: 0.10 },
]; // >12h => 0

function offlineSessionEffAt(consumedMs) {
  const h = consumedMs / 3600000;
  if (h < 2)  return 0.50;
  if (h < 6)  return 0.30;
  if (h < 12) return 0.10;
  return 0;
}
function getOfflineSessionLeftMs(s) {
  const used = Math.max(0, s.offlineConsumedMsInSession || 0);
  return Math.max(0, OFFLINE_SESSION_MAX_MS - used);
}
function ensureOfflineSessionStart(s, now = Date.now()) {
  if (!s.offlineSessionStartAt) s.offlineSessionStartAt = now;
}
function resetOfflineSession(s) {
  s.offlineSessionStartAt = null;
  s.offlineConsumedMsInSession = 0;
}
/** Consume elapsedMs from current session by tiered efficiency.
 * Returns { consumedMs, effectiveMs } and updates s.offlineConsumedMsInSession. */
function takeFromOfflineSession(s, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return { consumedMs: 0, effectiveMs: 0 };
  const left = getOfflineSessionLeftMs(s);
  if (left <= 0) return { consumedMs: 0, effectiveMs: 0 };

  let toConsume = Math.min(left, elapsedMs);
  let effectiveMs = 0, consumed = 0;
  let usedSoFar   = s.offlineConsumedMsInSession || 0;

  while (toConsume > 0) {
    const eff = offlineSessionEffAt(usedSoFar);
    if (eff <= 0) break;

    let tierEndMs;
    const h = usedSoFar / 3600000;
    if (h < 2)       tierEndMs = 2  * 3600000;
    else if (h < 6)  tierEndMs = 6  * 3600000;
    else if (h < 12) tierEndMs = 12 * 3600000;
    else break;

    const roomInTier = Math.max(0, tierEndMs - usedSoFar);
    const chunk = Math.min(toConsume, roomInTier);

    effectiveMs += chunk * eff;
    consumed    += chunk;
    usedSoFar   += chunk;
    toConsume   -= chunk;
  }

  s.offlineConsumedMsInSession = usedSoFar;
  return { consumedMs: consumed, effectiveMs };
}




// ===== Image cache + load-failure tracking (one bad asset must not blank the board) =====
const IMG_CACHE = {};
const IMG_FAILED = new Set();
const CANVAS_DPR_CAP = 2;

function attachImgErrorHandler(img, src) {
  if (img.__lmErrBound) return;
  img.__lmErrBound = true;
  img.addEventListener("error", () => {
    IMG_FAILED.add(src);
  });
}

function getImg(src) {
  if (!src) return getImg(IMG_BG);
  if (!IMG_CACHE[src]) {
    const img = new Image();
    img.decoding = "async";
    attachImgErrorHandler(img, src);
    img.src = src;
    IMG_CACHE[src] = img;
  }
  return IMG_CACHE[src];
}

function resolveBgSrc(preferred) {
  const src = preferred || IMG_BG;
  return IMG_FAILED.has(src) ? IMG_BG : src;
}

function resolveRockSrc(preferred) {
  const src = preferred || IMG_ROCK;
  return IMG_FAILED.has(src) ? IMG_ROCK : src;
}

function bgPathForIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n) || n < 0 || n > DEV_BG_VARIANT_COUNT) return IMG_BG;
  return n === 0 ? IMG_BG : `/images/leo-miners/bg-cave${n}.png`;
}

function rockPathForIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n) || n < 0 || n > DEV_ROCK_VARIANT_COUNT) return IMG_ROCK;
  return n === 0 ? IMG_ROCK : `/images/leo-miners/rock${n}.png`;
}

/** Single source of truth for canvas sizing — skips 0×0 layouts that blank the board. */
function fitCanvasToWrapper(canvas) {
  const wrap = canvas?.parentElement;
  if (!canvas || !wrap) return false;

  const rect = wrap.getBoundingClientRect();
  const cssW = Math.max(1, Math.floor(rect.width || wrap.clientWidth || 0));
  const cssH = Math.max(1, Math.floor(rect.height || wrap.clientHeight || 0));
  if (cssW < 8 || cssH < 8) return false;

  const dpr = Math.min(window.devicePixelRatio || 1, CANVAS_DPR_CAP);
  const bufW = Math.round(cssW * dpr);
  const bufH = Math.round(cssH * dpr);

  if (canvas.__lmCssW === cssW && canvas.__lmCssH === cssH && canvas.__lmDpr === dpr) {
    return true;
  }
  canvas.__lmCssW = cssW;
  canvas.__lmCssH = cssH;
  canvas.__lmDpr = dpr;

  canvas.width = bufW;
  canvas.height = bufH;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
}

// === END PART 1 ===



// === START PART 2 ===

export default function LeoMinersGame({
  economy = null,
  dbReady = false,
  rewardsEnabled = false,
  serverPendingPoints = 0,
  economyStats = null,
  gameplayConfig = null,
  studentLabel = "",
  backHref = "/game",
  statusMessage = "",
  onSaveState = null,
}) {
  useIOSViewportFix();
  const audio = useGameAudio();
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(0);
  const engineCleanupRef = useRef(null);
  const dragRef   = useRef({ active:false });
  const stateRef  = useRef(null);
  /** Dev background override; read in drawBg (ref so RAF loop always sees latest). */
  const boardBgSrcRef = useRef(IMG_BG);
  /** Dev rock sprite override; read in drawRock. */
  const rockImgSrcRef = useRef(IMG_ROCK);
  const flagsRef = useRef({ isMobileLandscape: false, paused: true });
  const [ui, setUi] = useState({
    gold: 0,
    spawnCost: gp().spawn_initial_cost,
    dpsMult: 1,
    goldMult: 1,
    muted: false, // קיים - לא נוגעים במשחק
  });

  const [isDesktop,  setIsDesktop]  = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  const [showIntro, setShowIntro] = useState(false);
  const [gamePaused, setGamePaused] = useState(true);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const [showHowTo, setShowHowTo] = useState(false);

  const [showCollect, setShowCollect] = useState(false);

  const [giftReadyFlag, setGiftReadyFlag] = useState(false);
  const [giftToast, setGiftToast] = useState(null);

  const [showDiamondInfo, setShowDiamondInfo] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [debugUI, setDebugUI] = useState(false); // ← קיים
  /** 0 = default cave BG, 1…DEV_BG_VARIANT_COUNT = bg-cave1 … (dev picker only). */
  const [devBgIndex, setDevBgIndex] = useState(0);
  /** 0 = default rock.png, 1…DEV_ROCK_VARIANT_COUNT = rock1 … (dev picker only). */
  const [devRockIndex, setDevRockIndex] = useState(0);

  const router = useRouter();
  const onSaveStateRef = useRef(onSaveState);
  useEffect(() => { onSaveStateRef.current = onSaveState; }, [onSaveState]);
  const serverSaveTimerRef = useRef(null);

  const [adCooldownUntil, setAdCooldownUntil] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adVideoEnded, setAdVideoEnded] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [centerPopup, setCenterPopup] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGainModal, setShowGainModal] = useState(false);
  const uiPulseAccumRef = useRef(0);
  const rockSfxCooldownRef = useRef(0);
  const giftReadyUiRef = useRef(false);
  const goldUiRafRef = useRef(0);
  const pendingCenterPopupRef = useRef(null);
  const centerPopupFlushRef = useRef(false);
  const [, forceUiPulse] = useState(0);

  function scheduleCenterPopup(text) {
    if (!text) return;
    pendingCenterPopupRef.current = text;
    if (centerPopupFlushRef.current) return;
    centerPopupFlushRef.current = true;
    queueMicrotask(() => {
      centerPopupFlushRef.current = false;
      const msg = pendingCenterPopupRef.current;
      pendingCenterPopupRef.current = null;
      if (msg) setCenterPopup({ text: msg, id: Math.random() });
    });
  }

  useEffect(() => {
    if (!centerPopup) return;
    const id = setTimeout(() => setCenterPopup(null), 1800);
    return () => clearTimeout(id);
  }, [centerPopup]);

  const [pendingPoints, setPendingPoints] = useState(serverPendingPoints);
  useEffect(() => { setPendingPoints(serverPendingPoints); }, [serverPendingPoints]);
  const [claiming, setClaiming] = useState(false);
  const mining = useMemo(
    () => ({
      balance: pendingPoints,
      minedToday: Number(economyStats?.minedTodayPoints ?? 0),
      claimedToday: Number(economyStats?.claimedTodayCoins ?? 0),
      claimedTotal: Number(economyStats?.claimedTotalCoins ?? 0),
    }),
    [pendingPoints, economyStats]
  );

  const playMinersClick = useCallback(() => {
    audio.playSfx("sfx-miners-click");
  }, [audio]);

  const playMinersMerge = useCallback(() => {
    audio.playSfx("sfx-miners-merge");
  }, [audio]);

  const playMinersRock = useCallback(() => {
    audio.playSfx("sfx-miners-rock");
  }, [audio]);

  const playMinersGift = useCallback(() => {
    audio.playSfx("sfx-miners-gift");
  }, [audio]);

  const playMinersCoin = useCallback(() => {
    audio.playSfx("sfx-coin");
  }, [audio]);

  useEffect(() => {
    if (gamePaused || showIntro) {
      audio.stopMusic();
      return undefined;
    }
    audio.primeFromUserGesture();
    audio.playMusic("bgm-miners-cave");
    return () => audio.stopMusic();
  }, [audio, gamePaused, showIntro]);

  useEffect(() => {
    flagsRef.current = {
      isMobileLandscape,
      paused: gamePaused || showIntro || showCollect,
    };
  }, [isMobileLandscape, gamePaused, showIntro, showCollect]);

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFS);
    onFS();
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  function backSafe() {
    try { playMinersClick(); } catch {}
    const go = () => router.push(backHref);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(go).catch(go);
    } else {
      go();
    }
  }

  async function claimBalanceToVaultDemo() {
    try { playMinersClick(); } catch {}
    if (!dbReady || !rewardsEnabled || !economy) {
      setGiftToastWithTTL(statusMessage || "שמירת פרסים בשרת לא זמינה עדיין.");
      return;
    }
    if (Number(pendingPoints || 0) < 1) {
      setGiftToastWithTTL("צריך לפחות 1 נקודה למימוש.");
      return;
    }
    setClaiming(true);
    try {
      const resp = await economy.claimCoins();
      if (resp?.ok) {
        setGiftToastWithTTL(
          resp.coinsGranted
            ? `מימוש הצליח! +${resp.coinsGranted} מטבעות ליאו`
            : "הנקודות מומשו בהצלחה."
        );
      } else {
        setGiftToastWithTTL(resp?.message || resp?.error || "לא ניתן לממש כרגע.");
      }
    } catch {
      setGiftToastWithTTL("שגיאת רשת - נסו שוב.");
    } finally {
      setClaiming(false);
    }
  }

  function scheduleServerSave() {
    if (!onSaveStateRef.current || !dbReady) return;
    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!s || !onSaveStateRef.current) return;
      onSaveStateRef.current({
        boardJson: {
          lanes: s.lanes,
          miners: s.miners,
          nextId: s.nextId,
          gold: s.gold,
          spawnCost: s.spawnCost,
          diamonds: s.diamonds,
          nextDiamondPrize: s.nextDiamondPrize,
          lastSeen: s.lastSeen,
          cycleStartAt: s.cycleStartAt,
          giftNextAt: s.giftNextAt,
          giftReady: s.giftReady,
        },
        upgradesJson: {
          dpsMult: s.dpsMult,
          goldMult: s.goldMult,
          spawnLevel: s.spawnLevel,
          totalPurchased: s.totalPurchased,
          costBase: s.costBase,
        },
        clientSeenAt: new Date().toISOString(),
      });
    }, 1500);
  }

  function theStateFix_maybeMigrateLocalStorage() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const zLS = localStorage.getItem("SPAWN_ICON_ZOOM");
      if (zLS === null || Number(zLS) !== 1.55) {
        localStorage.setItem("SPAWN_ICON_ZOOM", "1.55");
        if (typeof window !== "undefined") window.SPAWN_ICON_ZOOM = 1.55;
      }
      if (!raw) return;
      const s = JSON.parse(raw);
      let changed = false;
      if (typeof s.minerScale !== "number" || s.minerScale !== 1.9) {
        s.minerScale = 1.9; changed = true;
      }
      if (typeof s.minerWidth !== "number" || s.minerWidth !== 0.8) {
        s.minerWidth = 0.8; changed = true;
      }
      if (changed) localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch {}
  }

  function grantGift() {
    const s = stateRef.current;
    if (!s) return;
    const type = rollGiftType();
    if (type === "coins20") {
      const base = Math.max(10, expectedGiftCoinReward(s));
      const gain = Math.round(base * 0.10);
      s.gold += gain;
      setUi((u) => ({ ...u, gold: s.gold }));
      setCenterPopup({ text: `🎁 +${formatShort(gain)} מטבעות`, id: Math.random() });
    } else if (type === "coins40") {
      const base = Math.max(10, expectedGiftCoinReward(s));
      const gain = Math.round(base * 0.20);
      s.gold += gain;
      setUi((u) => ({ ...u, gold: s.gold }));
      setCenterPopup({ text: `🎁 +${formatShort(gain)} מטבעות`, id: Math.random() });
    } else if (type === "dps") {
      s.dpsMult = +((s.dpsMult || 1) * gp().dps_upgrade_multiplier).toFixed(2);
      setCenterPopup({ text: `🎁 כוח שבירה +10% (×${(s.dpsMult || 1).toFixed(2)})`, id: Math.random() });
    } else if (type === "gold") {
      s.goldMult = +((s.goldMult || 1) * gp().gold_upgrade_multiplier).toFixed(2);
      setCenterPopup({ text: `🎁 זהב +10% (×${(s.goldMult || 1).toFixed(2)})`, id: Math.random() });
    } else if (type === "diamond") {
      s.diamonds = (s.diamonds || 0) + 1;
      setCenterPopup({ text: `🎁 +1 💎 (יהלומים: ${s.diamonds})`, id: Math.random() });
    }
    s.giftReady = false;
    const now = Date.now();
    const stepSec = currentGiftIntervalSec(s, now);
    s.giftNextAt = now + stepSec * 1000;
    s.giftFirstReadyAt = null;
    s.isIdleOffline = false;
    resetOfflineSession(s);
    setGiftReadyFlag(false);
    giftReadyUiRef.current = false;
    try { playMinersGift(); } catch {}
    save?.();
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    getImg(IMG_BG);
    getImg(IMG_ROCK);
    getImg(IMG_MINER);

    boardBgSrcRef.current = IMG_BG;
    rockImgSrcRef.current = IMG_ROCK;

    if (!isDevBgPickerEnabled()) {
      try {
        localStorage.removeItem(DEV_BG_LS_KEY);
        localStorage.removeItem(DEV_ROCK_LS_KEY);
      } catch {}
      setDevBgIndex(0);
      setDevRockIndex(0);
      return;
    }

    try {
      const raw = localStorage.getItem(DEV_BG_LS_KEY);
      if (raw != null && raw !== "") {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 0 && n <= DEV_BG_VARIANT_COUNT) {
          setDevBgIndex(n);
          const path = bgPathForIndex(n);
          boardBgSrcRef.current = path;
          getImg(path);
        } else {
          localStorage.removeItem(DEV_BG_LS_KEY);
        }
      }
    } catch {}
    try {
      const rawR = localStorage.getItem(DEV_ROCK_LS_KEY);
      if (rawR != null && rawR !== "") {
        const r = parseInt(rawR, 10);
        if (Number.isFinite(r) && r >= 0 && r <= DEV_ROCK_VARIANT_COUNT) {
          setDevRockIndex(r);
          const path = rockPathForIndex(r);
          rockImgSrcRef.current = path;
          getImg(path);
        } else {
          localStorage.removeItem(DEV_ROCK_LS_KEY);
        }
      }
    } catch {}
  }, [mounted]);

  useEffect(() => {
    activateLeoMinersGameplayConfig(gameplayConfig);
    theStateFix_maybeMigrateLocalStorage();

    const loaded = loadSafe();
    const init = loaded ? { ...freshState(), ...loaded } : freshState();
    normalizeSavedLanesToLaneCount(init);
    sanitizeBoardMiners(init);

    if (loaded && loaded.minerScale == null) init.minerScale = 1.90;
    if (loaded && loaded.minerWidth == null) init.minerWidth = 0.8;
    if (!init.pendingOfflineStageCounts || typeof init.pendingOfflineStageCounts !== "object") {
      init.pendingOfflineStageCounts = {};
    }
    if (init.costBase == null) {
      try { init.costBase = Math.max(80, expectedRockCoinReward(init)); }
      catch { init.costBase = 120; }
    }

    stateRef.current = init;
    setUi((u) => ({
      ...u,
      gold: init.gold,
      spawnCost: init.spawnCost,
      dpsMult: init.dpsMult,
      goldMult: init.goldMult,
    }));
    setGiftReadyFlag(!!init.giftReady);
    giftReadyUiRef.current = !!init.giftReady;

    if (!init.onceSpawned) {
      spawnMiner(init, 1);
      init.onceSpawned = true;
      save();
    }

    try {
      const now = Date.now();
      if (!init.giftNextAt || Number.isNaN(init.giftNextAt)) {
        init.giftReady = false;
        const stepSec = currentGiftIntervalSec(init, now);
        init.giftNextAt = now + stepSec * 1000;
      } else if ((init.giftNextAt || 0) <= now) {
        init.giftReady = true;
        init.giftFirstReadyAt = init.giftFirstReadyAt || init.giftNextAt;
        setGiftReadyFlag(true);
        giftReadyUiRef.current = true;
      }
    } catch {}

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (typeof data.adCooldownUntil === "number") {
        setAdCooldownUntil(data.adCooldownUntil);
        if (stateRef.current) stateRef.current.adCooldownUntil = data.adCooldownUntil;
      }
    }
  } catch {}

  try {
    const s = stateRef.current;
     const now  = Date.now();
  const last = s?.lastSeen || now;
  const elapsedMs = Math.max(0, now - last);
  if (elapsedMs > 1000) {
    ensureOfflineSessionStart(s, last);
    const gate = takeFromOfflineSession(s, elapsedMs);
    const gained = gate.effectiveMs > 0 ? handleOfflineAccrual(s, gate.effectiveMs) : 0;
    if (gained > 0) setShowCollect(true);
    s.lastSeen = now;
    resetOfflineSession(s); // חזרנו למשחק ⇒ איפוס הסשן
    save();
  }

  } catch {}

  const updateFlags = () => {
    const w = window.innerWidth, h = window.innerHeight;
    const portrait = h >= w, desktop = w >= 1024;
    setIsDesktop(desktop);
    setIsMobileLandscape(!portrait && !desktop);
    setGamePaused(p => (!portrait && !desktop) ? true : false);
  };
  updateFlags();
  window.addEventListener("resize", updateFlags);
  window.addEventListener("orientationchange", updateFlags);
  document.addEventListener("fullscreenchange", updateFlags);

  const preventTouchScroll = (e) => { if (e.target.closest?.("#miners-canvas")) e.preventDefault(); };
  document.addEventListener("touchmove", preventTouchScroll, { passive:false });

  const startEngine = (cnv) => {
    engineCleanupRef.current?.();
    engineCleanupRef.current = setupCanvasAndLoop(cnv);
  };

  const c0 = canvasRef.current;
  if (!c0) {
    let rafId = 0;
    rafId = requestAnimationFrame(() => {
      const c = canvasRef.current;
      if (c) startEngine(c);
    });
    return () => {
      cancelAnimationFrame(rafId);
      engineCleanupRef.current?.();
      engineCleanupRef.current = null;
      window.removeEventListener("resize", updateFlags);
      window.removeEventListener("orientationchange", updateFlags);
      document.removeEventListener("fullscreenchange", updateFlags);
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }
  startEngine(c0);

  const onVisibility = () => {
    const s = stateRef.current; if (!s) return;
    const now = Date.now();
    if (document.visibilityState === "hidden") {
      s.lastSeen = now;
      ensureOfflineSessionStart(s, now); // התחלת סשן
      safeSave();
    } else {
      const elapsedMs = Math.max(0, now - (s.lastSeen || now));
      if (elapsedMs > 1000) {
        ensureOfflineSessionStart(s, s.lastSeen || now);
        const gate = takeFromOfflineSession(s, elapsedMs);
        const gained = gate.effectiveMs > 0 ? handleOfflineAccrual(s, gate.effectiveMs) : 0;
        if (gained > 0) setShowCollect(true);
        s.lastSeen = now;
        resetOfflineSession(s); // חזרנו ⇒ איפוס הסשן
      }
      safeSave();
    }
  };

  const onHide = () => { const s = stateRef.current; if (s) { s.lastSeen = Date.now(); safeSave(); } };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);

  return () => {
    engineCleanupRef.current?.();
    engineCleanupRef.current = null;
    window.removeEventListener("resize", updateFlags);
    window.removeEventListener("orientationchange", updateFlags);
    document.removeEventListener("fullscreenchange", updateFlags);
    document.removeEventListener("touchmove", preventTouchScroll);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("beforeunload", onHide);
  };
}, [gameplayConfig]);


// רנדר/סנכרון מתנות — 500ms heartbeat
useEffect(() => {
  const id = setInterval(() => {
    const s = stateRef.current;
    if (!s) return;
    const now = Date.now();

    if (!s.giftNextAt || Number.isNaN(s.giftNextAt)) {
      const stepSec = currentGiftIntervalSec(s, now);
      s.giftReady  = false;
      s.giftNextAt = now + stepSec * 1000;
      save();
      return;
    }

    if (!s.giftReady && s.giftNextAt && s.giftNextAt <= now) {
      s.giftReady = true;
      // חשוב: לא מאבדים את זמן ה־ready האמיתי
      s.giftFirstReadyAt = s.giftFirstReadyAt || s.giftNextAt;
      if (!giftReadyUiRef.current) {
        giftReadyUiRef.current = true;
        setGiftReadyFlag(true);
      }
      save();
    }
  }, 500);

  return () => clearInterval(id);
}, []);


// פולס UI לטבעות מתנה/כלב — 1000ms (מונע re-render כבד במובייל)
useEffect(() => {
  const id = setInterval(() => {
    uiPulseAccumRef.current += 1;
    forceUiPulse(v => (v + 1) % 100);
   }, 1000);
  return () => clearInterval(id);
}, []);

// הגדרת helpers לפני השימוש (בתוך הקומפוננטה)
const _currentGiftIntervalSec = typeof currentGiftIntervalSec==="function"?currentGiftIntervalSec:(s)=>Math.max(5,Math.floor(s?.lastGiftIntervalSec||20));
const _getPhaseInfo = typeof getPhaseInfo==="function"?getPhaseInfo:(s,now=Date.now())=>{ 
  const sec=_currentGiftIntervalSec(s,now); 
  return { index:0,into:0,remain:sec,intervalSec:sec }; 
};
const DOG_INTERVAL_SEC_LOCAL =
  (typeof window !== "undefined" && window.DOG_INTERVAL_SEC) || gp().auto_dog_interval_sec;
const DOG_BANK_CAP_LOCAL =
  (typeof window !== "undefined" && window.DOG_BANK_CAP) || gp().auto_dog_bank_cap;

// חישוב giftProgress ו-dogProgress (מתעדכן בכל רנדר בגלל forceUiPulse)
const giftProgress = (() => { 
  const s = stateRef.current; if (!s) return 0; 
  if (s.giftReady) return 1; 
  const now = Date.now(); 
  const total = _currentGiftIntervalSec(s, now) * 1000; 
  const remain = Math.max(0, (s.giftNextAt || now) - now); 
  return Math.max(0, Math.min(1, 1 - remain / total)); 
})();

const dogProgress = (() => {
  const s = stateRef.current; if (!s) return 0;
  if ((s.autoDogBank || 0) >= DOG_BANK_CAP_LOCAL) return 1;
  const now = Date.now();
  const total = DOG_INTERVAL_SEC_LOCAL * 1000;
  const remain = Math.max(0, (s.autoDogNextAt || (now + total)) - now);
  return Math.max(0, Math.min(1, 1 - remain / total));
})();

// ---------- init/load/save ----------
function freshState(){
  const now = Date.now();
  const cfg = gp();
  return {
    lanes: Array.from({length:LANES},(_,lane)=>({
      slots: Array(SLOTS_PER_LANE).fill(null),
      rock: newRock(lane,0),
      rockCount: 0,
      beltShift: 0,
    })),
    miners:{}, nextId:1,

    gold:0, spawnCost: cfg.spawn_initial_cost, dpsMult:1, goldMult:1,

    minerScale: 1.9,
    minerWidth: 0.8,

    anim:{ t:0, coins:[], hint:1, fx:[] },
    onceSpawned:false,
    totalPurchased:0, spawnLevel:1,
    lastSeen:now, pendingOfflineGold:0,
    pendingOfflinePoints:0,
    pendingOfflineStageCounts:{},

    cycleStartAt: now, lastGiftIntervalSec: 20,
    giftNextAt: now + 20000, giftReady:false,
    diamonds:0, nextDiamondPrize: rollDiamondPrize(),
    giftFirstReadyAt: null,       // first time current gift became ready
    isIdleOffline: false,         // force "offline-like" efficiency when idle
    offlineSessionStartAt: null,
    offlineConsumedMsInSession: 0,



    autoDogLastAt: now,
autoDogNextAt: now + cfg.auto_dog_interval_sec * 1000,
    autoDogBank: 0,
    autoDogPending: false,

    adCooldownUntil: 0,

    pendingDiamondDogLevel: null,
  };
}

function loadSafe(){
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function safeSave(){ try { save?.(); } catch {} }

function scheduleGoldUiSync() {
  if (goldUiRafRef.current) return;
  goldUiRafRef.current = requestAnimationFrame(() => {
    goldUiRafRef.current = 0;
    const s = stateRef.current;
    if (!s) return;
    setUi((u) => (u.gold === s.gold ? u : { ...u, gold: s.gold }));
  });
}
 
// === END PART 3 ===


// === START PART 4 ===

// ---------- קנבס/ציור ----------
function setupCanvasAndLoop(cnv){
  const ctx = cnv.getContext("2d"); if (!ctx) return () => {};

  let resizeTimer = 0;
  const resize = () => {
    const isFS = !!document.fullscreenElement;
    const wrap = cnv.parentElement;
    if (isFS) {
      if (wrap) wrap.style.height = `${window.innerHeight}px`;
    } else if (wrap) {
      wrap.style.height = "";
    }
    if (!fitCanvasToWrapper(cnv)) return;
    draw();
  };

  const scheduleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  };

  const onFSResize = () => {
    resize();
    setTimeout(resize, 80);
  };

  const vv = window.visualViewport;
  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", scheduleResize);
  document.addEventListener("fullscreenchange", onFSResize);
  vv?.addEventListener("resize", scheduleResize);
  resize();

  const onDown = (e) => {
    const { isMobileLandscape: iml, paused } = flagsRef.current || {};
    if (iml || paused) return;
    const p = pos(e);
    const hit = pickMiner(p.x,p.y);
    if (hit) {
      dragRef.current = {
        active:true,
        id: hit.id,
        ox: p.x - hit.x,
        oy: p.y - hit.y,
        x: p.x - (p.x - hit.x),
        y: p.y - (p.y - hit.y),
      };
      return;
    }
    const pill = pickPill(p.x,p.y);
    if (pill) trySpawnAtSlot(pill.lane, pill.slot);
  };
  const onMove = (e) => {
    if (!dragRef.current.active) return;
    const p = pos(e);
    dragRef.current.x = p.x - dragRef.current.ox;
    dragRef.current.y = p.y - dragRef.current.oy;
    draw();
  };
  const onUp = (e) => {
    if (!dragRef.current.active) return;
    const s = stateRef.current; if (!s) return;
    const id = dragRef.current.id;
    const m = s.miners[id]; if (!m) { dragRef.current={active:false}; return; }
    const p = pos(e);
    const drop = pickSlot(p.x,p.y);
    const cur = s.lanes[m.lane];
    cur.slots[m.slot] = null;
    if (drop) {
      const {lane,slot} = drop;
      const target = s.lanes[lane].slots[slot];
      if (!target) {
        m.lane=lane; m.slot=slot; s.lanes[lane].slots[slot]={id};
      } else if (target.id!==id) {
        const other = s.miners[target.id];
        if (other && other.level===m.level) {
          delete s.miners[m.id]; delete s.miners[other.id];
          s.lanes[lane].slots[slot]=null;
          const nid = s.nextId++;
          s.miners[nid] = { id:nid, level:m.level+1, lane, slot, pop:1 };
          s.lanes[lane].slots[slot]={ id:nid };
          try { playMinersMerge(); } catch {}
        } else {
          cur.slots[m.slot] = { id:m.id };
        }
      }
      safeSave();
    } else {
      cur.slots[m.slot] = { id:m.id };
    }
    dragRef.current={active:false};
    draw();
  };

  cnv.addEventListener("mousedown", onDown);
  cnv.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  const onTouchStart = (e) => { onDown(e.touches[0]); e.preventDefault(); };
  const onTouchMove  = (e) => { onMove(e.touches[0]); e.preventDefault(); };
  const onTouchEnd   = (e) => { onUp(e.changedTouches[0]); e.preventDefault(); };
  cnv.addEventListener("touchstart", onTouchStart, { passive:false });
  cnv.addEventListener("touchmove",  onTouchMove,  { passive:false });
  cnv.addEventListener("touchend",   onTouchEnd,   { passive:false });

  let last = performance.now();
  const loop = (t) => {
    const dt = Math.min(0.05, (t-last)/1000);
    last = t;
    tick(dt); draw();
    rafRef.current = requestAnimationFrame(loop);
  };
  rafRef.current = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(resizeTimer);
    window.removeEventListener("resize", scheduleResize);
    window.removeEventListener("orientationchange", scheduleResize);
    document.removeEventListener("fullscreenchange", onFSResize);
    vv?.removeEventListener("resize", scheduleResize);
    cnv.removeEventListener("mousedown", onDown);
    cnv.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    cnv.removeEventListener("touchstart", onTouchStart);
    cnv.removeEventListener("touchmove",  onTouchMove);
    cnv.removeEventListener("touchend",   onTouchEnd);
  };
}

// ----- גיאומטריה -----
const PILL_H = UI_BTN_H_PX;
function boardRect(){
  const c = canvasRef.current;
  return { x:PADDING, y:PADDING, w:(c?.clientWidth||0)-PADDING*2, h:(c?.clientHeight||0)-PADDING*2 };
}
function laneRect(lane){
  const b = boardRect();
  const h = b.h * 0.18;
  const frac = LANE_CENTER_Y_FRACS[lane] ?? LANE_CENTER_Y_FRACS[LANE_CENTER_Y_FRACS.length - 1];
  const centerY = b.y + b.h * frac;
  const y = Math.max(b.y, Math.min(centerY - h*0.5, b.y + b.h - h));
  return { x:b.x, y, w:b.w, h };
}
function rockWidth(L){
  return Math.min(L.w * 0.30, Math.max(80, L.h * 1.10));
}
function slotRect(lane,slot){
  const L = laneRect(lane);
  const rw = rockWidth(L);
  const cellW = (L.w - rw) / SLOTS_PER_LANE;
  return { x:L.x + slot*cellW, y:L.y, w:cellW - 4, h:L.h };
}
function rockRect(lane){
  const L = laneRect(lane);
  const rw = rockWidth(L);
  const y = L.y + L.h * 0.05;
  const h = L.h * 0.90;
  return { x:L.x + L.w - rw - 4, y, w:rw, h };
}
function pos(e){
  const r = canvasRef.current?.getBoundingClientRect();
  return { x: e.clientX - (r?.left||0), y: e.clientY - (r?.top||0) };
}

function pointInRect(x,y,r){ return x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h; }

const ROCK_FX_LIFE_SEC = 1.35;

function pushRockBreakFx(lane, coinsGain, pointsGain) {
  const s = stateRef.current;
  if (!s?.anim) return;
  const rr = rockRect(lane);
  if (!Array.isArray(s.anim.fx)) s.anim.fx = [];
  s.anim.fx.push({
    x: rr.x + rr.w * 0.5,
    y: rr.y + rr.h * 0.38,
    line1: `+${formatShort(coinsGain)}`,
    line2: pointsGain > 0 ? `+${formatPointsShort(pointsGain)} נק׳` : "",
    age: 0,
    life: ROCK_FX_LIFE_SEC,
  });
  if (s.anim.fx.length > 14) s.anim.fx.splice(0, s.anim.fx.length - 14);
}

function tickRockFx(dt) {
  const s = stateRef.current;
  if (!s?.anim?.fx?.length) return;
  s.anim.fx = s.anim.fx.filter((fx) => {
    fx.age += dt;
    fx.y -= dt * 46;
    return fx.age < fx.life;
  });
}

function drawRockFx(ctx) {
  const s = stateRef.current;
  if (!s?.anim?.fx?.length) return;
  for (const fx of s.anim.fx) {
    const t = fx.age / fx.life;
    const alpha = t < 0.12 ? t / 0.12 : t > 0.72 ? Math.max(0, (1 - t) / 0.28) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 15px system-ui";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.strokeText(fx.line1, fx.x, fx.y);
    ctx.fillStyle = "#fde047";
    ctx.fillText(fx.line1, fx.x, fx.y);
    if (fx.line2) {
      const y2 = fx.y + 18;
      ctx.font = "bold 12px system-ui";
      ctx.strokeText(fx.line2, fx.x, y2);
      ctx.fillStyle = "#86efac";
      ctx.fillText(fx.line2, fx.x, y2);
    }
    ctx.restore();
  }
}
function pillRect(lane,slot){
  const r = slotRect(lane,slot);
  const pw = r.w * 0.36;
  const ph = Math.min(PILL_H, r.h*0.22);
  const px = r.x + (r.w - pw)/2;
  const py = r.y + r.h*0.5 - ph/2;
  return { x:px, y:py, w:pw, h:ph };
}
function pickPill(x,y){
  const s = stateRef.current; if (!s) return null;
  for (let l=0; l<LANES; l++){
    for (let k=0; k<SLOTS_PER_LANE; k++){
      if (s.lanes[l].slots[k]) continue;
      const pr = pillRect(l,k);
      if (pointInRect(x,y,pr)) return { lane:l, slot:k };
    }
  }
  return null;
}
function pickSlot(x,y){
  for (let l=0; l<LANES; l++){
    for (let k=0; k<SLOTS_PER_LANE; k++){
      const r = slotRect(l,k);
      if (pointInRect(x,y,r)) return { lane:l, slot:k };
    }
  }
  return null;
}
function pickMiner(x,y){
  const s = stateRef.current; if (!s) return null;
  for (let l=0; l<LANES; l++){
    for (let k=0; k<SLOTS_PER_LANE; k++){
      const cell = s.lanes[l].slots[k]; if(!cell) continue;
      const r = slotRect(l,k);
      const cx = r.x + r.w*0.52;
      const cy = r.y + r.h*0.56;
      const rad = Math.min(r.w,r.h)*0.33;
      const dx=x-cx, dy=y-cy;
      if (dx*dx+dy*dy < rad*rad) return { id:cell.id, x:cx, y:cy };
    }
  }
  return null;
}

// === END PART 4 ===


// === START PART 5 ===

// ----- ציור -----
function drawBg(ctx,b){
  let src = resolveBgSrc(boardBgSrcRef.current);
  let img = getImg(src);
  if (!img.complete || img.naturalWidth <= 0) {
    if (src !== IMG_BG) {
      src = IMG_BG;
      img = getImg(IMG_BG);
    }
  }
  if (img.complete && img.naturalWidth>0) {
    const iw=img.naturalWidth, ih=img.naturalHeight;
    const ir=iw/ih, br=b.w/b.h;
    let dw,dh; if (br>ir){ dw=b.w; dh=b.w/ir; } else { dh=b.h; dw=b.h*ir; }
    const dx=b.x+(b.w-dw)/2, dy=b.y+(b.h-dh)/2;
    ctx.drawImage(img,dx,dy,dw,dh);
  } else {
    const g=ctx.createLinearGradient(0,b.y,0,b.y+b.h);
    g.addColorStop(0,"#0b1220"); g.addColorStop(1,"#0c1526");
    ctx.fillStyle=g; ctx.fillRect(b.x,b.y,b.w,b.h);
  }
}

function drawRock(ctx, rect, rock){
  // בלי צללים
  ctx.shadowColor = "transparent";
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // מצב הסלע
  const pct   = Math.max(0, rock.hp / rock.maxHp);
  const scale = 0.35 + 0.65 * pct;

  // מסגרות ומידות
  const rockSrc = resolveRockSrc(rockImgSrcRef.current);
  const img   = getImg(rockSrc);
  const pad   = 6;
  const fullW = rect.w - pad*2;
  const fullH = rect.h - pad*2;

  // גודל/מיקום הסלע (אותו חישוב כמו קודם)
  const rw = fullW * scale;
  const rh = fullH * scale;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = cx - rw / 2;
  const dy = cy - rh / 2;

  // ציור הסלע
  let drawSrc = rockSrc;
  let drawImg = img;
  if (!drawImg.complete || drawImg.naturalWidth <= 0) {
    if (drawSrc !== IMG_ROCK) {
      drawSrc = IMG_ROCK;
      drawImg = getImg(IMG_ROCK);
    }
  }
  if (drawImg.complete && drawImg.naturalWidth > 0) {
    ctx.drawImage(drawImg, dx, dy, rw, rh);
  } else {
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(dx, dy, rw, rh);
  }

  // === מיקומים קבועים בתוך הסלע ===
  const INNER_PAD = 6;              // רווח פנימי מהשוליים
  const BAR_H = 18;                           // ↑ בר גבוה יותר (במקום 10)
  const BAR_W = Math.min(fullW * 0.75, rw - 12);
  const BAR_X = dx + (rw - BAR_W) / 2;
 const BAR_Y = dy + rh - (BAR_H / 2);

 



  // רקע הבר
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

  // מילוי הבר
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(BAR_X, BAR_Y, Math.max(0, BAR_W * pct), BAR_H);

  // מסגרת
  ctx.strokeStyle = "#082f49";
  ctx.lineWidth   = 1;
  ctx.strokeRect(BAR_X, BAR_Y, BAR_W, BAR_H);

  // === טקסט בתוך הבר ===
  const TXT = `סלע ${rock.idx + 1}`;
  ctx.font         = "bold 12px system-ui";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle    = "#ffffff"; // לבן
  ctx.fillText(TXT, BAR_X + BAR_W / 2, BAR_Y + BAR_H / 2);
}



function drawMiner(ctx,lane,slot,m){
  const r  = slotRect(lane,slot);
  const cx = r.x + r.w*0.52;
  const cy = r.y + r.h*0.45;

  const scaleH = (stateRef.current?.minerScale || 1);
  const base   = Math.min(r.w, r.h) * 0.84 * scaleH;
  const wH     = base;
  const wW     = base * (stateRef.current?.minerWidth || 1.15);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const img = getImg(IMG_MINER);
  if (img.complete && img.naturalWidth>0) {
    const frame = Math.floor(((stateRef.current?.anim?.t)||0)*8)%4;
    const sw = img.width/4, sh = img.height;
    ctx.drawImage(img, frame*sw, 0, sw, sh, cx - wW/2, cy - wH/2, wW, wH);
  } else {
    ctx.fillStyle="#22c55e";
    ctx.beginPath(); ctx.ellipse(cx, cy, (wW*0.35), (wH*0.35), 0, 0, Math.PI*2); ctx.fill();
  }

  const fontPx = Math.max(12, Math.floor(base*0.22));
  ctx.fillStyle    = "#ffffff";
  ctx.font         = `bold ${fontPx}px system-ui`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(m.level), cx, cy - base*0.20);
}

function drawPill(ctx,x,y,w,h,label,enabled=true){
  ctx.shadowColor = "transparent";
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const g=ctx.createLinearGradient(x,y,x,y+h);
  if (enabled){ g.addColorStop(0,"#fef08a"); g.addColorStop(1,"#facc15"); }
  else{ g.addColorStop(0,"#475569"); g.addColorStop(1,"#334155"); }
  ctx.fillStyle=g; ctx.strokeStyle=enabled?"#a16207":"#475569"; ctx.lineWidth=1.5;
  roundRect(ctx,x,y,w,h,h/2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=enabled?"#111827":"#cbd5e1";
  ctx.font=`bold ${Math.max(12, Math.floor(h*0.45))}px system-ui`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(label, x+w/2, y+h/2);
}
function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,h/2,w/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function draw(){
  const c = canvasRef.current; if (!c) return;
  const ctx = c.getContext("2d"); if (!ctx) return;
  const s = stateRef.current;   if (!s) return;
  const b = boardRect();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur  = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  drawBg(ctx,b);

  for (let l=0; l<LANES; l++){
    for (let k=0; k<SLOTS_PER_LANE; k++){
      const cell = s.lanes[l].slots[k];
      if (!cell) {
        const pr = pillRect(l,k);
        const canAfford = (s.gold ?? 0) >= (s.spawnCost ?? 0) && countMiners(s) < MAX_MINERS;
        drawPill(ctx, pr.x, pr.y, pr.w, pr.h, "הוסף", canAfford);
      }
    }
    drawRock(ctx, rockRect(l), s.lanes[l].rock);
    for (let k=0; k<SLOTS_PER_LANE; k++){
      const cell = s.lanes[l].slots[k]; if (!cell) continue;
      const m = s.miners[cell.id];      if (!m) continue;
      if (dragRef.current.active && dragRef.current.id === m.id) continue;
      drawMiner(ctx,l,k,m);
    }
  }

  if (dragRef.current.active) {
    const id = dragRef.current.id;
    const m  = s.miners[id];
    if (m) {
      const gx = (dragRef.current.x ?? 0) + (dragRef.current.ox ?? 0);
      const gy = (dragRef.current.y ?? 0) + (dragRef.current.oy ?? 0);
      const r0 = slotRect(m.lane, m.slot);

      const baseW = Math.min(r0.w, r0.h) * 0.84;
      const scaleH = (stateRef.current?.minerScale || 1);
      const wH = baseW * scaleH;
      const wW = wH * (stateRef.current?.minerWidth || 1.15);

      const img=getImg(IMG_MINER);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = "transparent";
      ctx.shadowBlur  = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      if (img.complete && img.naturalWidth>0) {
        const frame=Math.floor(((stateRef.current?.anim?.t)||0)*8)%4;
        const sw=img.width/4, sh=img.height;
        ctx.drawImage(img, frame*sw,0,sw,sh, gx-wW/2, gy-wH/2, wW, wH);
      } else {
        ctx.fillStyle="#22c55e";
        ctx.beginPath(); ctx.ellipse(gx,gy,(wW*0.35),(wH*0.35),0,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }

  drawRockFx(ctx);
}

// ----- לוגיקת tick בסיסית -----
function tick(dt){
  const s = stateRef.current; if (!s) return;
  s.anim.t += dt;
  tickRockFx(dt);
  s.paused = !!(flagsRef.current && flagsRef.current.paused);
  const now = Date.now();
  if (s.paused){ s.lastSeen = now; return; }

  // אם 🎁 מוכנה מעל 5 דק' ולא נלקחה — עוברים ל־idle-offline
if (s.giftReady && (s.giftFirstReadyAt || s.giftNextAt)) {
  const readySince = s.giftFirstReadyAt || s.giftNextAt;   // ← עוגן הזמן
  if ((now - readySince) >= IDLE_OFFLINE_MS && !s.isIdleOffline) {
    s.isIdleOffline = true;
    save?.();
  }
}


  // עדכון סלעים/מטבעות
  for (let l = 0; l < LANES; l++){
    let dps = 0;
    for (let k = 0; k < SLOTS_PER_LANE; k++){
      const cell = s.lanes[l].slots[k]; if (!cell) continue;
      const m = s.miners[cell.id];      if (!m) continue;
      const onlineEff = s.isIdleOffline ? OFFLINE_DPS_FACTOR : 1;
      dps += minerDps(m.level, (s.dpsMult||1)) * onlineEff;
    }
    const rock = s.lanes[l].rock;
    rock.hp -= dps * dt;
    if (rock.hp <= 0) {
      const nowT = Date.now();
      if (nowT - (rockSfxCooldownRef.current || 0) > 200) {
        rockSfxCooldownRef.current = nowT;
        try { playMinersRock(); playMinersCoin(); } catch {}
      }
      const coinsGain = Math.floor(rock.maxHp * gp().gold_factor * (s.goldMult || 1));
// נשמור מצב לפני – כדי לוודא POP לפי תוצאה אמיתית
// GOLD כרגיל
s.gold += coinsGain;
scheduleGoldUiSync();

// מעניקים נקודות לפי שלב הסלע עצמו (בלתי תלוי בסלעים אחרים)
const stageNow = rockStageNow(rock);
const pointsForBreak = pointsBaseForStage(stageNow);
const eff = addPlayerScorePoints(s, pointsForBreak);
finalizeDailyRewardOncePerTick();

if (eff > 0) {
  if (dbReady && rewardsEnabled && economy) {
    economy.queueRockBreak(stageNow, 1, false);
  } else {
    setPendingPoints((p) => round2(Number(p || 0) + eff));
  }
}

// ה-POP מציג את הזכייה - המשתמש כבר קיבל אותה ב-local state
// השרת יסתנכרן ויתקן אם יש סתירות
const pointsTxt = formatPointsShort(eff || 0);
pushRockBreakFx(l, coinsGain, eff || 0);
scheduleCenterPopup(`⛏️ +${formatShort(coinsGain)} מטבעות • +${pointsTxt} נקודות`);


      s.lanes[l].rockCount += 1;
      s.lanes[l].rock = newRock(l, s.lanes[l].rockCount);
      safeSave();
    }
  }

  // עדכון טיימר מתנות
  if (!s.giftReady && (s.giftNextAt || 0) <= now) {
    s.giftReady = true;
    if (!giftReadyUiRef.current) {
      giftReadyUiRef.current = true;
      setGiftReadyFlag(true);
    }
  }

  // הנחת כלב יהלום ממתין
  if (s.pendingDiamondDogLevel && countMiners(s) < MAX_MINERS) {
    const placed = spawnMiner(s, s.pendingDiamondDogLevel);
    if (placed) {
      const placedLvl = s.pendingDiamondDogLevel;
      s.pendingDiamondDogLevel = null;
      s.giftReady  = false;
      s.giftNextAt = now + currentGiftIntervalSec(s) * 1000;
      setGiftToastWithTTL(`💎 כלב (רמה ${placedLvl}) הוצב`);
      save?.();
    }
  }

  // אוטו־דוג + חיתוך יומי ל-נקודות
  accrueBankDogsUpToNow(s);
  tryDistributeBankDog(s);
  finalizeDailyRewardOncePerTick();
  s.lastSeen = now;
}

// === END PART 5 ===


// === START PART 6 ===

// Helpers + save/load + purchases + reset + misc used by JSX

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function countMiners(s) { return s?.miners ? Object.keys(s.miners).length : 0; }
function minerDps(level, mul = 1) {
  const cfg = gp();
  return cfg.base_dps * Math.pow(cfg.level_dps_multiplier, level - 1) * mul;
}

function laneDpsSum(s, laneIdx) {
  if (!s) return 0;
  let dps = 0;
  for (let k = 0; k < SLOTS_PER_LANE; k++) {
    const cell = s.lanes?.[laneIdx]?.slots?.[k];
    if (!cell) continue;
    const m = s.miners[cell.id];
    if (!m) continue;
    dps += minerDps(m.level, s.dpsMult || 1);
  }
  return dps;
}

function newRock(lane, idx) {
  const cfg = gp();
  const hp = Math.floor(cfg.rock_base_hp * Math.pow(cfg.rock_hp_multiplier, idx));
  return { lane, idx, maxHp: hp, hp };
}

/**
 * Ensures `s.lanes` matches the current `LANES` constant.
 * Some stored saves can have a different lane count; without this,
 * `draw()` can crash when it reads `s.lanes[l].slots[k]`.
 */
function normalizeSavedLanesToLaneCount(s) {
  if (!s) return;

  if (!Array.isArray(s.lanes)) s.lanes = [];

  if (s.lanes.length < LANES) {
    while (s.lanes.length < LANES) {
      const laneIdx = s.lanes.length;
      s.lanes.push({
        slots: Array(SLOTS_PER_LANE).fill(null),
        rock: newRock(laneIdx, 0),
        rockCount: 0,
        beltShift: 0,
      });
    }
  } else if (s.lanes.length > LANES) {
    const old = s.lanes;
    const dropCount = old.length - LANES;
    const kept = old.slice(dropCount).map((ln, idx) => {
      const rockCount = Number(ln?.rockCount ?? ln?.rock?.idx ?? 0) || 0;
      const rock =
        ln?.rock && typeof ln.rock.maxHp === "number" && typeof ln.rock.hp === "number"
          ? { ...ln.rock, lane: idx, idx: Number(ln.rock.idx ?? rockCount) }
          : newRock(idx, rockCount);
      return {
        slots: Array.isArray(ln?.slots) ? [...ln.slots] : Array(SLOTS_PER_LANE).fill(null),
        rock,
        rockCount,
        beltShift: ln?.beltShift ?? 0,
      };
    });
    s.lanes = kept;

    const miners = s.miners && typeof s.miners === "object" ? s.miners : {};
    const orphanIds = [];
    for (const id of Object.keys(miners)) {
      const m = miners[id];
      if (!m || typeof m.lane !== "number") continue;
      if (m.lane < dropCount) orphanIds.push(Number(id));
      else m.lane -= dropCount;
    }

    for (let l = 0; l < LANES; l++) {
      s.lanes[l].slots = Array(SLOTS_PER_LANE).fill(null);
    }
    for (const id of Object.keys(miners)) {
      const m = miners[id];
      if (!m || orphanIds.includes(Number(id))) continue;
      if (m.lane >= 0 && m.lane < LANES && m.slot >= 0 && m.slot < SLOTS_PER_LANE) {
        s.lanes[m.lane].slots[m.slot] = { id: m.id };
      }
    }
    for (const oid of orphanIds) {
      const m = miners[oid];
      if (!m) continue;
      let placed = false;
      for (let l = 0; l < LANES && !placed; l++) {
        for (let slot = 0; slot < SLOTS_PER_LANE && !placed; slot++) {
          if (!s.lanes[l].slots[slot]) {
            m.lane = l;
            m.slot = slot;
            s.lanes[l].slots[slot] = { id: oid };
            placed = true;
          }
        }
      }
      if (!placed) delete miners[oid];
    }
  }

  for (let l = 0; l < LANES; l++) {
    if (!s.lanes[l]) {
      s.lanes[l] = {
        slots: Array(SLOTS_PER_LANE).fill(null),
        rock: newRock(l, 0),
        rockCount: 0,
        beltShift: 0,
      };
    }

    const lane = s.lanes[l];

    if (!Array.isArray(lane.slots)) lane.slots = Array(SLOTS_PER_LANE).fill(null);
    if (lane.slots.length < SLOTS_PER_LANE) {
      while (lane.slots.length < SLOTS_PER_LANE) lane.slots.push(null);
    } else if (lane.slots.length > SLOTS_PER_LANE) {
      lane.slots = lane.slots.slice(0, SLOTS_PER_LANE);
    }

    const rockCount = Number(lane.rockCount ?? lane.rock?.idx ?? 0) || 0;
    if (!lane.rock || typeof lane.rock.maxHp !== "number" || typeof lane.rock.hp !== "number") {
      lane.rock = newRock(l, rockCount);
    } else {
      lane.rock = {
        ...lane.rock,
        lane: l,
        idx: Number(lane.rock.idx ?? rockCount),
        maxHp: typeof lane.rock.maxHp === "number" ? lane.rock.maxHp : newRock(l, rockCount).maxHp,
        hp: typeof lane.rock.hp === "number" ? lane.rock.hp : newRock(l, rockCount).hp,
      };
    }
    lane.rockCount = rockCount;
  }
}

/** Remove duplicate slot refs, orphan miners, and cap board to MAX_MINERS. */
function sanitizeBoardMiners(s) {
  if (!s) return;
  if (!s.miners || typeof s.miners !== "object") s.miners = {};
  const seenIds = new Set();

  for (let l = 0; l < LANES; l++) {
    const lane = s.lanes?.[l];
    if (!lane) continue;
    if (!Array.isArray(lane.slots)) lane.slots = Array(SLOTS_PER_LANE).fill(null);

    for (let k = 0; k < SLOTS_PER_LANE; k++) {
      const cell = lane.slots[k];
      if (!cell?.id) {
        lane.slots[k] = null;
        continue;
      }
      const id = Number(cell.id);
      const m = s.miners[id] ?? s.miners[cell.id];
      if (!m || seenIds.has(id)) {
        lane.slots[k] = null;
        continue;
      }
      seenIds.add(id);
      m.lane = l;
      m.slot = k;
      lane.slots[k] = { id: m.id };
    }
  }

  for (const key of Object.keys(s.miners)) {
    const id = Number(key);
    if (!seenIds.has(id)) delete s.miners[key];
  }

  if (countMiners(s) > MAX_MINERS) {
    const ids = Object.keys(s.miners)
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id))
      .sort((a, b) => b - a);
    while (countMiners(s) > MAX_MINERS && ids.length) {
      const dropId = ids.shift();
      const m = s.miners[dropId];
      if (m && s.lanes[m.lane]?.slots[m.slot]?.id === dropId) {
        s.lanes[m.lane].slots[m.slot] = null;
      }
      delete s.miners[dropId];
    }
  }
}

function makeFreshState() { return freshState(); }

// ── Save/Load ──
function save() {
  const s = stateRef.current; if (!s) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      lanes: s.lanes, miners: s.miners, nextId: s.nextId,
      gold: s.gold, spawnCost: s.spawnCost, dpsMult: s.dpsMult, goldMult: s.goldMult,
      onceSpawned: s.onceSpawned,

      offlineSessionStartAt: s.offlineSessionStartAt || null,
      offlineConsumedMsInSession: s.offlineConsumedMsInSession || 0,

      minerScale: s.minerScale || 1.9,
      minerWidth: s.minerWidth || 0.8,

      lastSeen: s.lastSeen,
      pendingOfflineGold: s.pendingOfflineGold || 0,
      pendingOfflinePoints: s.pendingOfflinePoints || 0,
      pendingOfflineStageCounts: s.pendingOfflineStageCounts || {},
      totalPurchased: s.totalPurchased, spawnLevel: s.spawnLevel,

      cycleStartAt: s.cycleStartAt,
      lastGiftIntervalSec: s.lastGiftIntervalSec,
      giftNextAt: s.giftNextAt,
      giftReady: s.giftReady,
      giftFirstReadyAt: s.giftFirstReadyAt || null,
      isIdleOffline: !!s.isIdleOffline,

      diamonds: s.diamonds || 0,
      nextDiamondPrize: s.nextDiamondPrize,

      autoDogLastAt: s.autoDogLastAt,
      autoDogNextAt: s.autoDogNextAt,
      autoDogBank: s.autoDogBank,
      autoDogPending: !!s.autoDogPending,

      costBase: s.costBase,
      adCooldownUntil: s.adCooldownUntil || 0,
      pendingDiamondDogLevel: s.pendingDiamondDogLevel || null,
    }));
  } catch {}
}
  scheduleServerSave();


function load() { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }

function _baseCost(s) { if (!s) return 160; return Math.max(80, s.costBase || 120); }
function _dpsCost(s)  { const base=_baseCost(s); const steps=Math.max(0, Math.round(((s?.dpsMult||1)-1)*10)); return Math.ceil(base*2.0*Math.pow(1.18,steps)); }
function _goldCost(s) { const base=_baseCost(s); const steps=Math.max(0, Math.round(((s?.goldMult||1)-1)*10)); return Math.ceil(base*2.2*Math.pow(1.18,steps)); }

function expectedRockCoinReward(s) {
  if (!s) return 0;
  let bestLane = 0, bestDps = 0;
  for (let l = 0; l < LANES; l++) {
    const dps = laneDpsSum(s, l);
    if (dps > bestDps) { bestDps = dps; bestLane = l; }
  }
  if (bestDps <= 0) {
    let sum = 0;
    for (let l = 0; l < LANES; l++) {
      const rk = s.lanes?.[l]?.rock;
      if (!rk?.maxHp) continue;
      sum += Math.floor(rk.maxHp * gp().gold_factor * (s.goldMult || 1));
    }
    return Math.floor(sum / LANES);
  }
  const rock = s.lanes?.[bestLane]?.rock;
  if (!rock?.maxHp) return 0;
  return Math.floor(rock.maxHp * gp().gold_factor * (s.goldMult || 1));
}

function expectedGiftCoinReward(s) {
  if (!s) return 0;
  const mult = (s.goldMult || 1);
  const vals = [];
  for (let l = 0; l < LANES; l++) {
    const rk = s.lanes?.[l]?.rock;
    if (!rk?.maxHp) continue;
    vals.push(Math.floor(rk.maxHp * gp().gold_factor * mult));
  }
  if (!vals.length) return 0;
  const max = Math.max(...vals);
  const sum = vals.reduce((a,b)=>a+b,0);
  const others = sum - max;
  return Math.floor(max + others * 0.5);
}

function setGiftToastWithTTL(text, ttl = 3000) {
  const id = Math.random().toString(36).slice(2);
  setGiftToast?.({ text, id });
  setTimeout(() => { setGiftToast?.(cur => (cur && cur.id === id ? null : cur)); }, ttl);
}

// === Spawn helpers ===
function spawnMiner(s, level = 1) {
  if (!s) return false;
  if (countMiners(s) >= MAX_MINERS) return false;
  for (let l = 0; l < LANES; l++) {
    for (let slot = 0; slot < SLOTS_PER_LANE; slot++) {
      if (!s.lanes[l].slots[slot]) {
        const id = s.nextId++;
        const m  = { id, level, lane: l, slot, pop: 1 };
        s.miners[id] = m;
        s.lanes[l].slots[slot] = { id };
        return true;
      }
    }
  }
  return false;
}
function spawnMinerAt(s, lane, slot, level = 1) {
  if (!s) return false;
  if (s.lanes[lane].slots[slot]) return false;
  const id = s.nextId++;
  const m  = { id, level, lane, slot, pop: 1 };
  s.miners[id] = m;
  s.lanes[lane].slots[slot] = { id };
  return true;
}

function afterPurchaseBump(s) {
  s.totalPurchased = (s.totalPurchased || 0) + 1;
  s.spawnLevel = 1 + Math.floor((s.totalPurchased) / 30);
}
function trySpawnAtSlot(lane, slot) {
  const s = stateRef.current; if (!s) return;
  if (countMiners(s) >= MAX_MINERS) { try{playMinersClick();}catch{}; alert(`מקסימום ${MAX_MINERS} כלבים על הלוח.`); return; }
  if (s.spawnCost == null || s.gold < s.spawnCost) { try{playMinersClick();}catch{}; return; }
  const ok = spawnMinerAt(s, lane, slot, s.spawnLevel);
  if (!ok) return;
  s.gold -= s.spawnCost;
  s.spawnCost = Math.ceil(s.spawnCost * gp().spawn_cost_multiplier);
  afterPurchaseBump(s);
  s.pressedPill = { lane, slot, t: 0.15 };
  s.anim && (s.anim.hint = 0);
  setUi(u => ({ ...u, gold: s.gold, spawnCost: s.spawnCost }));
  try{playMinersClick();}catch{};
  save();
}
function addMiner() {
  const s = stateRef.current; if (!s) return;
  if (countMiners(s) >= MAX_MINERS) { try{playMinersClick();}catch{}; alert(`מקסימום ${MAX_MINERS} כלבים על הלוח.`); return; }
  if (s.spawnCost == null || s.gold < s.spawnCost) return;
  const ok = spawnMiner(s, s.spawnLevel);
  if (!ok) return;
  s.gold -= s.spawnCost;
  s.spawnCost = Math.ceil(s.spawnCost * gp().spawn_cost_multiplier);
  afterPurchaseBump(s);
  s.anim && (s.anim.hint = 0);
  setUi(u => ({ ...u, gold: s.gold, spawnCost: s.spawnCost }));
  try{playMinersClick();}catch{};
  save();
}
function upgradeDps() {
  const s = stateRef.current; if (!s) return;
  const cost = _dpsCost(s); if (s.gold < cost) return;
  s.gold -= cost; s.dpsMult = +((s.dpsMult || 1) * gp().dps_upgrade_multiplier).toFixed(3);
  setUi(u => ({ ...u, gold: s.gold })); save();
}
function upgradeGold() {
  const s = stateRef.current; if (!s) return;
  const cost = _goldCost(s); if (s.gold < cost) return;
  s.gold -= cost; s.goldMult = +((s.goldMult || 1) * gp().gold_upgrade_multiplier).toFixed(2);
  setUi(u => ({ ...u, gold: s.gold })); save();
}

async function onOfflineCollect() {
  const s = stateRef.current;
  if (!s) return;

  const addCoins = Math.max(0, Number(s.pendingOfflineGold || 0));
  const addPoints = Math.max(0, Number(s.pendingOfflinePoints || 0));
  const stageCountsCopy = { ...(s.pendingOfflineStageCounts || {}) };

  // 1) זיכוי מיידי בלקוח - coins
  if (addCoins > 0) {
    s.gold += addCoins;
    setUi((u) => ({ ...u, gold: s.gold }));
  }

  // מאפסים pending של offline במסך המשחק
  s.pendingOfflineGold = 0;
  s.pendingOfflinePoints = 0;
  s.pendingOfflineStageCounts = {};

  save();

  // 2) sync offline stages to server when ready
  if (Object.keys(stageCountsCopy).length > 0 && dbReady && rewardsEnabled && economy) {
    for (const [stage, count] of Object.entries(stageCountsCopy)) {
      economy.queueRockBreak(Number(stage), Number(count), true);
    }
  }

  // 3) popup
  if (addCoins > 0 || addPoints > 0) {
    setCenterPopup({
      text: `⛏️ +${formatShort(addCoins)} מטבעות • +${formatPointsShort(addPoints)} נקודות`,
      id: Math.random(),
    });
  }

  setShowCollect(false);

  // 4) flush to server in background
  (async () => {
    try {
      if (dbReady && rewardsEnabled && economy) {
        await economy.flushPendingAccrual();
        await economy.fetchState();
      } else if (addPoints > 0) {
        setPendingPoints((p) => round2(Number(p || 0) + addPoints));
      }
    } catch (err) {
      console.error("[leo-miners] Offline collect settlement failed", err);
    }
  })();
}

// ===== אוטו־דוג/אופליין/מתנות =====

function chooseAutoDogLevel(s) {
  const sl = Math.max(1, s.spawnLevel || 1);
  const target2 = Math.max(1, sl - 2);
  const existsLv2 = Object.values(s.miners || {}).some(m => m.level === target2);
  return existsLv2 ? target2 : sl;
}

function chooseGiftDogLevelForRegularGift(s) {
  // Gift dog (REGULAR) = buy level by default; if no merge is possible at buy level → lowest existing level on board
  return chooseGiftDogPlacementLevel(s);
}


function accrueBankDogsUpToNow(s) {
  if (!s) return;
  const period = DOG_INTERVAL_SEC * 1000;
  const now = Date.now();

  if (!s.autoDogNextAt || Number.isNaN(s.autoDogNextAt)) {
    s.autoDogNextAt = now + period;
  }

  // cap bank by AVAILABLE FREE SLOTS (pause when full)
  const freeSlots = Math.max(0, MAX_MINERS - countMiners(s));
  const bankCapNow = Math.min(DOG_BANK_CAP, freeSlots);

  if (now >= s.autoDogNextAt) {
    const intervals = Math.floor((now - s.autoDogNextAt) / period) + 1;
    const cur = (s.autoDogBank || 0);
    s.autoDogBank = Math.min(bankCapNow, cur + intervals);
    s.autoDogNextAt += intervals * period;
    save?.();
  }
}

// --- helpers for gift-dog placement (buy-level vs lowest-existing) ---
function lowestExistingLevelOnBoard(s) {
  const levels = Object.values(s.miners || {})
    .filter(Boolean)
    .map(m => m.level)
    .filter(v => typeof v === "number" && v >= 1);
  if (!levels.length) return null;
  levels.sort((a,b)=>a-b);
  return levels[0]; // lowest existing level
}

// "can merge at buy level" = יש לפחות כלב אחד ברמת הקנייה על הלוח (אפשרות לזוג/מיזוג)
function canMergeAtBuyLevel(s) {
  const bl = Math.max(1, s.spawnLevel || 1);
  return Object.values(s.miners || {}).some(m => m && m.level === bl);
}

// בחירת דרגה למתנה רגילה: ברירת־מחדל דרגת קנייה; אם אין שום אפשרות מיזוג — הדרגה הנמוכה ביותר שקיימת על הלוח
function chooseGiftDogPlacementLevel(s) {
  const buyLevel = Math.max(1, s.spawnLevel || 1);
  if (canMergeAtBuyLevel(s)) return buyLevel;
  const low = lowestExistingLevelOnBoard(s);
  return low || buyLevel; // אם הלוח ריק-נשארים עם דרגת הקנייה
}


function tryDistributeBankDog(s) {
  if (!s) return;
  if (!hasFreeSlot(s)) return;
  if ((s.autoDogBank || 0) <= 0) return;

  const lvl = chooseAutoDogLevel(s);
  const ok = spawnMiner(s, lvl);
  if (ok) {
    s.autoDogBank = Math.max(0, (s.autoDogBank || 0) - 1);
    setCenterPopup?.({ text: `🦊 כלב אוטומטי (רמה ${lvl})`, id: Math.random() });
    save?.();
  }
}

function handleOfflineAccrual(s, elapsedMs) {
  if (!s) return 0;

  // --- Auto-dog accrual (נשאר כמו אצלך) ---
  {
    const period = DOG_INTERVAL_SEC * 1000;
    const now = Date.now();

    if (!s.autoDogNextAt || Number.isNaN(s.autoDogNextAt)) {
      s.autoDogNextAt = now + period;
    }

    const freeSlots0 = Math.max(0, MAX_MINERS - countMiners(s));
    let bankCapNow = Math.min(DOG_BANK_CAP, freeSlots0);

    if (now >= s.autoDogNextAt) {
      const intervals = Math.floor((now - s.autoDogNextAt) / period) + 1;
      const cur = (s.autoDogBank || 0);
      s.autoDogBank = Math.min(bankCapNow, cur + intervals);
      s.autoDogNextAt += intervals * period;
    }

    while ((s.autoDogBank || 0) > 0 && hasFreeSlot(s)) {
      const lvl = chooseAutoDogLevel(s);
      const ok = spawnMiner(s, lvl);
      if (!ok) break;
      s.autoDogBank -= 1;

      const freeNow = Math.max(0, MAX_MINERS - countMiners(s));
      bankCapNow = Math.min(DOG_BANK_CAP, freeNow);
      if (bankCapNow <= 0) break;
    }
  }

  // --- סימולציית אופליין לשבירות ---
  const CAP_MS = 12 * 60 * 60 * 1000;
  const simMs = Math.min(elapsedMs, CAP_MS);

  let totalCoins = 0;
  let offlineAddedPoints = 0;
  const offlineStageCounts = Object.create(null);
  for (let lane = 0; lane < LANES; lane++) {
    let dps = laneDpsSum(s, lane) * OFFLINE_DPS_FACTOR;
    if (dps <= 0) continue;

    let idx = s.lanes[lane].rock.idx;
    let hp  = s.lanes[lane].rock.hp;
    let maxHp = s.lanes[lane].rock.maxHp;
    let timeLeft = simMs / 1000;

    while (timeLeft > 0 && dps > 0) {
      const timeToBreak = hp / dps;

      if (timeToBreak > timeLeft) {
        hp -= dps * timeLeft;
        timeLeft = 0;
      } else {
        // שבירה מתרחשת:
        totalCoins += Math.floor(maxHp * gp().gold_factor * (s.goldMult || 1));

        // ערך נקודות לפי שלב הסלע בנתיב זה ברגע השבירה
        const stageNow = (idx + 1);
        const pointsForBreak = pointsBaseForStage(stageNow);
        const eff = round2(addPlayerScorePoints(s, pointsForBreak));
        offlineStageCounts[String(stageNow)] = (offlineStageCounts[String(stageNow)] || 0) + 1;
        offlineAddedPoints += eff;
        finalizeDailyRewardOncePerTick();

        // מעבר לסלע הבא בנתיב
        timeLeft -= timeToBreak;
        idx += 1;
        const rk = newRock(lane, idx);
        hp = rk.hp; maxHp = rk.maxHp;
      }
    }

    s.lanes[lane].rock = { lane, idx, maxHp, hp: Math.max(1, Math.floor(hp)) };
    s.lanes[lane].rockCount = idx;
  }

  // מצטברים למסך ה-COLLECT (האיזון של ה-Mining עודכן תוך כדי)
  if (totalCoins > 0) {
    s.pendingOfflineGold = (s.pendingOfflineGold || 0) + totalCoins;
  }
  if (offlineAddedPoints > 0) {
    s.pendingOfflinePoints = +((s.pendingOfflinePoints || 0) + offlineAddedPoints).toFixed(2);
  }
  if (Object.keys(offlineStageCounts).length > 0) {
    s.pendingOfflineStageCounts = s.pendingOfflineStageCounts || {};
    for (const [stage, count] of Object.entries(offlineStageCounts)) {
      s.pendingOfflineStageCounts[stage] = (s.pendingOfflineStageCounts[stage] || 0) + count;
    }
  }

  return totalCoins;
}

function hasFreeSlot(s) {
  return countMiners(s) < MAX_MINERS;
}

function rollGiftType() {
  const r = Math.random() * 100;
  if (r < 70) return "coins20";
  if (r < 78) return "dps";
  if (r < 86) return "gold";
  if (r < 92) return "diamond";
  return "coins40";
}

async function enterFullscreenAndLockMobile() { try {
  const el = wrapRef.current;
  if (el?.requestFullscreen) await el.requestFullscreen();
  if (screen.orientation?.lock) { try { await screen.orientation.lock("portrait-primary"); } catch {} }
} catch {} }
async function exitFullscreenIfAny() { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {} }

async function resetGame() {
  try { playMinersClick(); } catch {}

  try {
    localStorage.removeItem(LS_KEY);
  } catch {}

  setPendingPoints(0);

  const fresh = makeFreshState();
  fresh.costBase = Math.max(80, expectedRockCoinReward(fresh));
  stateRef.current = fresh;

  setUi(u => ({
    ...u,
    gold: fresh.gold, spawnCost: fresh.spawnCost,
    dpsMult: fresh.dpsMult, goldMult: fresh.goldMult,
  }));

  setAdCooldownUntil(0);
  setGiftReadyFlag(false);
  giftReadyUiRef.current = false;
  setShowCollect(false);
  setShowAdModal(false);
  setShowDiamondInfo(false);
  setShowResetConfirm(false);

  setShowIntro(true);
  setGamePaused(true);
  await exitFullscreenIfAny();

  save();
}

// === END PART 6 ===


// === START PART 7 ===

// ===== Diamonds chest (3×💎 to claim when you choose) =====
function grantDiamondPrize(s, key) {
  const base = Math.max(20, expectedGiftCoinReward(s));
  if (key === "coins_x10")   { const g = base * 10;   s.gold += Math.round(g); setGiftToastWithTTL(`💎 +${formatShort(g)} מטבעות`); }
  else if (key === "coins_x100") { const g = base * 100; s.gold += Math.round(g); setGiftToastWithTTL(`💎 +${formatShort(g)} מטבעות`); }
  else if (key === "coins_x1000"){ const g = base * 1000; s.gold += Math.round(g); setGiftToastWithTTL(`💎 +${formatShort(g)} מטבעות`); }
  else if (key.startsWith("dog+")) {
    const delta = parseInt(key.split("+")[1] || "3", 10);
    const lvl = Math.max(1, (stateRef.current?.spawnLevel || 1) + delta);
    if (countMiners(s) < MAX_MINERS) {
      const placed = spawnMiner(s, lvl);
      if (placed) {
        setGiftToastWithTTL(`💎 כלב (רמה ${lvl})`);
        s.giftReady  = false;
        s.giftNextAt = Date.now() + currentGiftIntervalSec(s) * 1000;
      }
    } else {
      s.pendingDiamondDogLevel = lvl;
      setGiftToastWithTTL(`💎 כלב (רמה ${lvl}) ממתין - פנו מקום בלוח`);
    }
  }
  setUi(u => ({ ...u, gold: s.gold }));
}
function openDiamondChestIfReady() {
  const s = stateRef.current; if (!s) return;
  if ((s.diamonds || 0) < 3) return;
  const prize = s.nextDiamondPrize || rollDiamondPrize();
  s.diamonds -= 3;
  grantDiamondPrize(s, prize);
  s.nextDiamondPrize = rollDiamondPrize();
  save();
}

// HUD computed values + Gift heartbeat + EARN cooldown
const DOG_INTERVAL_SEC =
  (typeof window !== "undefined" && window.DOG_INTERVAL_SEC) || gp().auto_dog_interval_sec;
const DOG_BANK_CAP =
  (typeof window !== "undefined" && window.DOG_BANK_CAP) || gp().auto_dog_bank_cap;

const diamondsReady = (stateRef.current?.diamonds || 0) >= 3;

// --- ONLINE/OFFLINE HUD status (derived) ---
const onlineMode = (() => {
  const s = stateRef.current;
  const paused = !!(flagsRef.current && flagsRef.current.paused);
  const hidden = (typeof document !== "undefined") && document.visibilityState === "hidden";
  if (!s) return "offline";
  if (s.isIdleOffline) return "idle";          // gift ready >5m → reduced efficiency
  if (paused || hidden) return "offline";      // intro/paused/hidden
  return "online";
})();
const isOnline = onlineMode === "online";
const onlineDotTitle = isOnline ? "מחובר" : (stateRef.current?.isIdleOffline ? "ממתין (יעילות מופחתת)" : "לא מחובר");


function ringBg(progress){
  const p   = Math.max(0, Math.min(1, Number(progress) || 0));
  const deg = Math.round(360 * p);
  return {
    background: `conic-gradient(#facc15 ${deg}deg, transparent 0)`,
    WebkitMask: "radial-gradient(transparent 12px, #000 13px)",
    mask:       "radial-gradient(transparent 12px, #000 13px)",
    borderRadius: "9999px",
    transition: "background 0.2s linear",
  };
}

// ADD cooldown + onAdd
const sNow=stateRef.current;
const nowMs=Date.now();
const cooldownUntil=sNow?.adCooldownUntil||0;
const addRemainMs=mounted?Math.max(0,cooldownUntil-nowMs):Number.POSITIVE_INFINITY;
const addProgress=mounted?1-Math.min(1,addRemainMs/(10*60*1000)):0;
const addRemainLabel=(()=>{ 
  if(!mounted) return "…"; 
  if(addRemainMs<=0) return "מוכן"; 
  const m=Math.floor(addRemainMs/60000); 
  const s=Math.floor((addRemainMs%60000)/1000); 
  return `${m}:${String(s).padStart(2,"0")}`;
})();
const addDisabled = addRemainMs > 0;

function onAdd(){ 
  try{playMinersClick();}catch{} 
  const s=stateRef.current;if(!s) return; 
  const now=Date.now(); 
  if(now<(s.adCooldownUntil||0)){ 
    const remain=Math.ceil(((s.adCooldownUntil||0)-now)/1000); 
    const m=Math.floor(remain/60),sec=String(remain%60).padStart(2,"0"); 
    if(typeof setGiftToast==="function"){ 
      const id=Math.random().toString(36).slice(2); 
      setGiftToast({text:`בונוס פרסומת בעוד ${m}:${sec}`,id}); 
      setTimeout(()=>{setGiftToast(cur=>(cur&&cur.id===id?null:cur));},2000);
    } 
    return; 
  } 
  setAdVideoEnded(false); 
  setShowAdModal(true); 
}

// Coins modal (details + claim-to-mining)
const [showCoinsModal, setShowCoinsModal] = useState(false);

// Legacy shim: in the new engine נקודות accrues only on rock breaks.
// Keep a no-op to avoid ReferenceError if older UI paths still call it.
function previewPointsFromCoins() { return 0; }

function claimCoinsToMining() {
  try { playMinersClick(); } catch {}
  setGiftToastWithTTL("נקודות כרייה נצברות רק דרך השרת - לא ניתן להמיר מטבעות מקומית.");
}

// ===== HUD Info modal state & content =====
const [hudModal, setHudModal] = useState(null);
function getHudModalTitle(k){
  switch(k){
    case 'coins': return 'מטבעות';
    case 'dps': return 'מכפיל כוח שבירה';
    case 'gold': return 'מכפיל זהב';
    case 'spawn': return 'רמת כלב חדש';
    case 'lvCounter': return 'מונה רמת כלב חדש';
    case 'gifts': return 'שלבי מתנות';
    case 'giftRing': return 'טיימר מתנה';
    case 'dogRing': return 'כלב אוטומטי';
    default: return 'מידע';
  }
}
function getHudModalText(k){
  switch(k){
    case 'coins':
      return 'סך המטבעות שלך. שבירת סלעים מוסיפה מטבעות; בונוסים: 🎁 מתנה רגילה (10%), פרסומת (50%), ויהלומים עם מכפילים גדולים.';
    case 'dps':
      return '🪓 מכפיל כוח שבירה מגדיל את קצב איבוד ה-HP של הסלע ב-10% בכל שדרוג.';
    case 'gold':
      return '🟡 מכפיל זהב מגדיל את המטבעות שמתקבלים מכל סלע ב-10% בכל שדרוג.';
    case 'spawn':
      return `🦊 רמה מציגה את רמת הכלב בקנייה/בונוס.
עולה אוטומטית אחרי 30 קניות.

קניות עד לרמה הבאה: ${toNextLv}.`;
    case 'gifts':
      return '⏳ המרווח בין מתנות. כשהטיימר נגמר מקבלים מתנה: מטבעות/כלב/בוסטים/יהלום.';
    case 'giftRing':
      return 'הטבע סביב 🎁 מראה התקדמות למתנה הבאה לפי הזמנים המוצגים.';
    case 'dogRing':
      return 'הטבע סביב 🦊 מראה התקדמות לכלב אוטומטי. כשהבנק מלא (עד 6), הוא יוצא כשיש מקום פנוי.';
    default:
      return '';
  }
}

// prices & יכולת קנייה לשורת הפעולות
const spawnCostNow=sNow?.spawnCost??ui.spawnCost;
const dpsCostNow=(typeof _dpsCost==="function")?_dpsCost(sNow):160;
const goldCostNow=(typeof _goldCost==="function")?_goldCost(sNow):160;
const canBuyMiner=!!sNow&&sNow.gold>=spawnCostNow&&Object.keys(sNow.miners||{}).length<MAX_MINERS;
const canBuyDps=!!sNow&&sNow.gold>=dpsCostNow;
const canBuyGold=!!sNow&&sNow.gold>=goldCostNow;
const boughtCount = sNow?.totalPurchased || 0;
const toNextLv    = 30 - (boughtCount % 30);
const BTN_H = `h-[${UI_BTN_H_PX}px]`;             // כבר קיים אצלך – ודא שזה טמפלייט סטרינג
const BTN_W = `min-w-[${UI_BTN_MIN_W_PX}px]`;     // חדש: רוחב מינימלי
const RING_SZ = "w-[60px] h-[60px]";
const BTN_BASE =
  "appearance-none inline-flex items-center justify-center gap-1 px-3 !py-0 rounded-xl font-extrabold text-[16px] md:text-[18px] leading-none whitespace-nowrap transition ring-2";

const BTN_DIS  = "opacity-60 cursor-not-allowed";

// === END PART 7 ===


// === START PART 8 ===

  // ——— iOS detection ———
  const [isIOS, setIsIOS] = useState(false);
  const HUD_TOP_IOS_PX = 10;
  const HUD_TOP_ANDROID_PX = 15;

  // ——— Track fullscreen state (מתחבר ל-PART 2) ———
  // יש לנו כבר isFullscreen + מאזין ב-PART 2

  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      const isiOS =
        /iP(hone|ad|od)/.test(ua) ||
        ((/Macintosh/.test(ua) || /Mac OS X/.test(ua)) && "ontouchend" in document);
      setIsIOS(isiOS);
    } catch {}
  }, []);

  const hudTop = `calc(env(safe-area-inset-top, 0px) + ${(isIOS ? HUD_TOP_IOS_PX : HUD_TOP_ANDROID_PX)}px)`;

  // ==== אל תסגור את הקומפוננטה ב-PART 8! המשך PART 9/10 יושב באותו return ====
  return (
    <>
      <div
        ref={wrapRef}
        className="
          relative flex flex-col items-center justify-start
          bg-gray-900 text-white
          w-full min-h-[var(--app-100vh,100svh)]
          overflow-hidden select-none
          pt-[calc(env(safe-area-inset-top,0px)+8px)]
          pb-[calc(env(safe-area-inset-bottom,0px)+16px)]
        "
        style={{
          paddingTop: isFullscreen ? 0 : undefined,
          paddingBottom: isFullscreen ? 0 : undefined,
        }}
      >
        {statusMessage ? (
          <div className="absolute inset-x-0 top-0 z-[5000] bg-amber-600/95 text-white text-center text-sm font-bold py-2 px-3">
            {statusMessage}
          </div>
        ) : null}
        
        

        {/* Top bar (Back / Full / Menu) – תמיד מעל הקנבס */}
         <div
           className="pointer-events-none absolute inset-x-0"
           style={{ top: hudTop, zIndex: 4000 }}
           data-layer="topbar"
         >
          <div className="mx-auto max-w-[1024px] relative">
            {/* שמאל: Back */}
            <div className="absolute left-2 top-0 flex gap-2 pointer-events-auto">
              <button
               onClick={backSafe}
                aria-label="חזרה"
                className="h-10 w-10 rounded-xl bg-black/40 hover:bg-black/60 text-white grid place-items-center shadow"
                title="חזרה"
              >
                ←
              </button>
            </div>

            {/* ימין: Fullscreen + Menu */}
            <div className="absolute right-2 top-0 flex gap-2 pointer-events-auto items-center">
              <button
                onClick={() => {
                  try { playMinersClick(); } catch {}
                  const el = wrapRef.current || document.documentElement;
                  if (!document.fullscreenElement) {
                    el.requestFullscreen?.().catch(()=>{});
                  } else {
                    document.exitFullscreen?.().catch(()=>{});
                  }
                }}
                aria-label="מסך מלא"
                className="h-10 px-3 rounded-xl bg-black/40 hover:bg-black/60 text-white flex items-center gap-2 shadow"
                title={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
              >
                <span className="text-base">⤢</span>
                <span className="text-xs opacity-80">{isFullscreen ? "יציאה" : "מלא"}</span>
              </button>

              <button
                onClick={() => { try { playMinersClick(); } catch {}; setMenuOpen(true); }}
                aria-label="תפריט"
                className="h-10 w-10 rounded-xl bg-black/40 hover:bg-black/60 text-white grid place-items-center shadow"
                title="תפריט"
              >
                ≡
              </button>
            </div>
          </div>
        </div>

        {/* ==== חלון תפריט (צד ימין) ==== */}
      {menuOpen && (
  <div
    className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-3"
    onClick={() => setMenuOpen(false)}
  >
    <div
      className="
        w-[86vw] max-w-[250px]   /* רוחב מקס' */
        max-h-[70vh]             /* גובה מקס' */
        bg-[#0b1220] text-white
        shadow-2xl rounded-2xl
        p-4 md:p-5               /* ריווח קטן יותר */
        overflow-y-auto
      "
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h2 className="text-xl font-extrabold">הגדרות</h2>
        <button
          onClick={() => setMenuOpen(false)}
          className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center"
          title="סגור"
        >
          ✕
        </button>
      </div>

      {/* Sound */}
      <div className="mb-4 space-y-2">
        <h3 className="text-sm font-semibold opacity-80">צלילים</h3>
        <p className="text-xs opacity-70">הגדרות השמע הגלובליות זמינות במסך הטעינה לפני המשחק.</p>
      </div>


      <div className="mt-4 text-xs opacity-70" dir="rtl">
        <p>ליאו הכורה - גרסת HUD</p>
      </div>
    </div>
  </div>
)}



        {/* ===== Intro Overlay ===== */}
        {isMobileLandscape && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black text-white text-center p-6">
            <div>
              <h2 className="text-2xl font-extrabold mb-3">סובבו את המכשיר לאורך (לא לרוחב).</h2>
              <p className="opacity-80">מצב לרוחב לא נתמך.</p>
            </div>
          </div>
        )}


        {/* --- אל תסגור כאן את </div> / </> / );  ---
             המשך PART 9/10 נכנס ישר אחרי זה בתוך אותו wrapper */}
        
{/* === END PART 8 (OPEN) === */}




{/* === START PART 9 === */}
      {showAdModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 max-w-md w-full rounded-2xl p-5">
            <h2 className="text-xl font-extrabold mb-3">צפייה לבונוס</h2>

            <video
              src="/ads/ad1.mp4"
              className="w-full rounded-lg bg-black"
              controls
              autoPlay
              onEnded={() => setAdVideoEnded(true)}
            />

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => { setShowAdModal(false); setAdVideoEnded(false); }}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900"
              >
                סגור
              </button>

              <button
                onClick={() => {
                  const s = stateRef.current; if (!s) return;
                  const base = Math.max(20, expectedGiftCoinReward(s));
                  const gain = Math.round(base * 0.50);
                  s.gold += gain; setUi(u => ({ ...u, gold: s.gold }));

                  const until = Date.now() + 10*60*1000;
                  s.adCooldownUntil = until;
                  setAdCooldownUntil(until);
                  try {
                    const raw = localStorage.getItem(LS_KEY);
                    const data = raw ? JSON.parse(raw) : {};
                    data.adCooldownUntil = until;
                    localStorage.setItem(LS_KEY, JSON.stringify(data));
                  } catch {}

                  setCenterPopup({ text: `🎬 +${formatShort(gain)} מטבעות`, id: Math.random() });
                  save();
                  setShowAdModal(false);
                  setAdVideoEnded(false);
                }}
                disabled={!adVideoEnded}
                className={`px-4 py-2 rounded-lg font-bold ${
                  adVideoEnded ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
                title={adVideoEnded ? "איסוף הפרס" : "צפו עד הסוף כדי לפתוח"}
              >
                אסוף
              </button>
            </div>
          </div>
        </div>
      )}

{/* ===== Unified Canvas wrapper (no lanes changes) ===== */}
<div
  id="miners-canvas-wrap"
    className="relative z-[0] w-full rounded-2xl overflow-hidden mt-1 mx-auto border border-slate-700"

  style={{
    maxWidth: isDesktop ? "1024px" : "680px",
    // שמירה על גובה מלא-מסך גם ב-iOS (עם פולבאקים בטוחים)
    height: "calc(var(--app-100vh, 100svh) - var(--header-h, 0px))",
    minHeight: "min(100vh, var(--app-100vh, 100svh))",
    // בדסקטופ יחס קלאסי; במובייל מחזירים 9/16 כמו בגרסה היציבה
    aspectRatio: isDesktop ? "4 / 3" : "9 / 16",
  }}
>
  <canvas
    id="miners-canvas"
    ref={canvasRef}
    className="relative z-[0] w-full h-full block touch-none select-none"
  />

{SHOW_FLOATING_RESET && (
  <div
    className="absolute left-2 sm:left-3 z-[40]"
    style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
  >
    <button
      onClick={() => setShowResetConfirm(true)}
      className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 ring-2 ring-rose-300 text-white font-extrabold text-xs shadow-md active:scale-95"
      title="איפוס כל ההתקדמות"
    >
      איפוס
    </button>
  </div>
)}

{mounted && isDevBgPickerEnabled() && (
  <div
    className="absolute right-2 sm:right-3 z-[40] flex flex-row items-end gap-2"
    style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
  >
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[9px] font-bold text-white/90 drop-shadow-md bg-black/45 px-1.5 py-0.5 rounded">
        רקע (פיתוח)
      </span>
      <select
        aria-label={`בחירת רקע 1–${DEV_BG_VARIANT_COUNT}`}
        value={devBgIndex}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          const next =
            Number.isFinite(n) && n >= 0 && n <= DEV_BG_VARIANT_COUNT ? n : 0;
          setDevBgIndex(next);
          const path = bgPathForIndex(next);
          boardBgSrcRef.current = path;
          try {
            localStorage.setItem(DEV_BG_LS_KEY, String(next));
          } catch {}
          try {
            getImg(path);
          } catch {}
        }}
        className="max-w-[140px] text-[11px] font-bold rounded-lg border border-slate-500 bg-slate-900/90 text-amber-200 px-2 py-1 shadow-md"
      >
        <option value={0}>ברירת מחדל</option>
        {Array.from({ length: DEV_BG_VARIANT_COUNT }, (_, i) => i + 1).map((i) => (
          <option key={i} value={i}>
            רקע {i}
          </option>
        ))}
      </select>
    </div>
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[9px] font-bold text-white/90 drop-shadow-md bg-black/45 px-1.5 py-0.5 rounded">
        סלע (פיתוח)
      </span>
      <select
        aria-label={`בחירת סלע 1–${DEV_ROCK_VARIANT_COUNT}`}
        value={devRockIndex}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          const next =
            Number.isFinite(n) && n >= 0 && n <= DEV_ROCK_VARIANT_COUNT ? n : 0;
          setDevRockIndex(next);
          const path = rockPathForIndex(next);
          rockImgSrcRef.current = path;
          try {
            localStorage.setItem(DEV_ROCK_LS_KEY, String(next));
          } catch {}
          try {
            getImg(path);
          } catch {}
        }}
        className="max-w-[120px] text-[11px] font-bold rounded-lg border border-slate-500 bg-slate-900/90 text-emerald-200 px-2 py-1 shadow-md"
      >
        <option value={0}>ברירת מחדל</option>
        {Array.from({ length: DEV_ROCK_VARIANT_COUNT }, (_, i) => i + 1).map((i) => (
          <option key={i} value={i}>
            סלע {i}
          </option>
        ))}
      </select>
    </div>
  </div>
)}


         {/* ==== TOP HUD ==== */}
         {!showIntro && (
         <div
         className="absolute left-1/2 -translate-x-1/2 z-[3000] w-[calc(100%-16px)] max-w-[980px] pointer-events-none [&_button]:pointer-events-auto"
           style={{ top: hudTop }}
         >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-center mb-2">
            ליאו - כורים
          </h1>

          {/* keep glow keyframes for diamonds + global UI pulses */}
          <style jsx global>{`
            @keyframes glowPulse {
              0% { opacity: .55; transform: scale(.98); }
              50% { opacity: 1; transform: scale(1); }
              100% { opacity: .55; transform: scale(.98); }
            }
            @keyframes glowRing {
              0% { opacity: .6; }
              50% { opacity: 1; }
              100% { opacity: .6; }
            }
            /* === added for CLAIM glow === */
            @keyframes btnPulse {
              0%   { box-shadow:0 0 0 0 rgba(250,204,21,.45); }
              70%  { box-shadow:0 0 0 10px rgba(250,204,21,0); }
              100% { box-shadow:0 0 0 0 rgba(250,204,21,0); }
            }
            /* === added for digits nudge === */
            @keyframes nudge {
              0%,100% { transform: translateY(0); }
              50%     { transform: translateY(-1px); }
            }
          `}</style>

          <div className="flex gap-2 flex-wrap justify-center items-center text-sm">
            {/* Coins + status dot + ad ring */}
            <button
              onClick={()=>setHudModal('coins')}
              className="px-2 py-1 rounded-lg flex items-center gap-2 hover:bg-white/10"
              aria-label="מידע על מטבעות"
            >

{/* ONLINE/OFFLINE dot - placed to the LEFT of the coin */}
              <div
                className="w-2.5 h-2.5 rounded-full ring-2 ring-black/40"
                title={onlineDotTitle}
                style={{ backgroundColor: isOnline ? "#22c55e" : (stateRef.current?.isIdleOffline ? "#f59e0b" : "#94a3b8") }}
              />
              <div className="relative w-8 h-8 rounded-full grid place-items-center" title={addRemainMs > 0 ? `פרסומת בעוד ${addRemainLabel}` : "בונוס פרסומת מוכן"}>
                <div className="absolute inset-0 rounded-full" style={ringBg(addProgress)} />
                <img src={IMG_COIN} alt="מטבע" className="w-7 h-7" />
              </div>
              <b>{formatShort1(stateRef.current?.gold ?? 0)}</b>
            </button>

            {/* DPS */}
            <button onClick={()=>setHudModal('dps')} className="px-2 py-1 rounded-lg hover:bg-white/10">
              🪓 x<b>{(stateRef.current?.dpsMult || 1).toFixed(1)}</b>
            </button>

            {/* GOLD */}
            <button onClick={()=>setHudModal('gold')} className="px-2 py-1 rounded-lg hover:bg-white/10">
              🟡 x<b>{(stateRef.current?.goldMult || 1).toFixed(1)}</b>
            </button>

            {/* Spawn LV (with inline counter) */}
            <button
              onClick={()=>setHudModal('spawn')}
              className="px-2 py-1 rounded-lg hover:bg-white/10"
              title={`רמת כלב הבאה בעוד ${toNextLv} קניות`}
            >
              <span className="inline-flex items-baseline gap-1 leading-none">
                <span>🦊 רמה</span>
                <b className="leading-none">{stateRef.current?.spawnLevel || 1}</b>
                <span className="text-[11px] leading-none opacity-80 relative -top-[1px]">
                  ({toNextLv})
                </span>
              </span>
            </button>

            {/* Diamonds */}
            <button
              onClick={() => setShowDiamondInfo(true)}
              className="relative px-2 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition hover:bg-white/10"
              aria-label="מידע על יהלומים"
              title="לחצו לפתיחת ארגז יהלומים"
            >
              {diamondsReady && (
                <>
                  <span
                    className="pointer-events-none absolute -inset-2 rounded-xl"
                    style={{
                      animation: "glowPulse 3.2s infinite",
                      background: "radial-gradient(circle, rgba(250,204,21,0.35) 0%, rgba(250,204,21,0.18) 35%, transparent 60%)"
                    }}
                  />
                  <span
                    className="pointer-events-none absolute -inset-[6px] rounded-2xl"
                    style={{
                      animation: "glowRing 3.2s infinite",
                      border: "2px solid rgba(250,204,21,0.55)"
                    }}
                  />
                </>
              )}
              <span>💎</span>
              <b>{stateRef.current?.diamonds ?? 0}</b>
              <span className="opacity-80">/3</span>
            </button>

            {/* Phase label - avoid Date.now() before mount (hydration mismatch vs SSR) */}
            <button onClick={()=>setHudModal('gifts')} className="px-2 py-1 rounded-lg hover:bg-white/10">
              {mounted
                ? `⏳ ${(_getPhaseInfo(stateRef.current, Date.now()).intervalSec)} שנ׳ `
                : "⏳ - "}
            </button>

            <div className="flex items-center gap-3 ml-2">
              {/* 🎁 ring */}
              <button
                onClick={()=>setHudModal('giftRing')}
                className="relative w-8 h-8 rounded-full grid place-items-center hover:opacity-90 active:scale-95 transition"
                title={
                  mounted
                    ? `⏳ מתנות כל ${(_getPhaseInfo(stateRef.current, Date.now()).intervalSec)} שניות`
                    : "טיימר מתנות"
                }
                aria-label="מידע על טיימר מתנות"
              >
                <div className="absolute inset-0 rounded-full" style={ringBg(giftProgress)} />
                <div className="text-[22px] font-extrabold leading-none">🎁</div>
              </button>

              {/* 🦊 ring */}
              <button
                onClick={()=>setHudModal('dogRing')}
                className="relative w-8 h-8 rounded-full grid place-items-center hover:opacity-90 active:scale-95 transition"
                title={`כלב אוטומטי כל ${Math.round(DOG_INTERVAL_SEC/60)} דקות (בנק עד ${DOG_BANK_CAP})`}
                aria-label="מידע על כלב אוטומטי"
              >
                <div className="absolute inset-0 rounded-full" style={ringBg(dogProgress)} />
                <div className="text-[22px] font-extrabold leading-none">🦊</div>
              </button>

{/* === [GAIN] button (RING like 🎁/🦊, same size) === */}
<button
  onClick={() => setShowGainModal(true)}
  className="relative w-8 h-8 rounded-full grid place-items-center hover:opacity-90 active:scale-95 transition"
  title={`בונוס צפייה ${addRemainMs > 0 ? `בעוד ${addRemainLabel}` : "מוכן"}`}
  aria-label="מידע על בונוס צפייה"
>
  {/* טבעת ספירה בדיוק כמו 🎁/🦊 */}
  <div className="absolute inset-0 rounded-full" style={ringBg(addProgress)} />
  {/* האייקון עצמו */}
  <div className="text-[20px] font-extrabold leading-none">▶️</div>
</button>
{/* === END GAIN button === */}



            </div>
          </div>

          {/* Actions row */}
          <div className="flex gap-2 mt-2 flex-wrap justify-center text-sm">

          {/* ADD (spawn) - שורה 1: + [אייקון] (LV N) ; שורה 2: מחיר בלבד */}
<button
  onClick={addMiner}
  disabled={!canBuyMiner}
  className={`${BTN_BASE} ${BTN_H_FIX} ${BTN_W_FIX} ${
    canBuyMiner
      ? "bg-emerald-500 hover:bg-emerald-400 ring-emerald-300 text-slate-900"
      : `bg-emerald-500 ring-emerald-300 text-slate-900 ${BTN_DIS}`
  }`}
>
<div className="flex flex-col items-center justify-center leading-tight">
  {/* שורה ראשונה */}
  <div className="flex items-center gap-1">
    {/* האייקון קודם */}
   <span
  className="relative inline-grid place-items-center"
  style={{
    width: UI_SPAWN_ICON_BOX * 2.0,
    height: UI_SPAWN_ICON_BOX * 1.0,
    marginLeft: -8,            // <<< הזזה שמאלה ~8px
  }}
>

      <img
        src={IMG_SPAWN_ICON}
        alt="כלב"
        className="pointer-events-none object-cover block"
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${((typeof window!=="undefined" && window.SPAWN_ICON_ZOOM) || UI_SPAWN_ICON_ZOOM)}) translateY(${((typeof window!=="undefined" && window.SPAWN_ICON_SHIFT_Y) || UI_SPAWN_ICON_SHIFT_Y)}px)`,
          transformOrigin: "center",
        }}
      />
    </span>

    {/* ואז סימן הפלוס */}
    <span className="font-extrabold">+</span>

    <b className="tracking-tight">(רמה {stateRef.current?.spawnLevel || 1})</b>
  </div>

{/* שורה שנייה – רק המחיר, ממוקם בקצה הימני */}
<div className="!text-[14px] md:!text-[16px] mt-0.5 tabular-nums font-extrabold leading-tight self-end mr-1">
  {formatShort1(spawnCostNow)}
</div>


</div>

</button>

{/* DPS - שורה 1: 🪓 +10% ; שורה 2: מחיר בלבד */}
<button
  onClick={upgradeDps}
  disabled={!canBuyDps}
  className={`${BTN_BASE} ${BTN_H_FIX} ${BTN_W_FIX} ${
        canBuyDps
      ? "bg-sky-500 hover:bg-sky-400 ring-sky-300 text-slate-900"
      : `bg-sky-500 ring-sky-300 text-slate-900 ${BTN_DIS}`
  }`}
>
  <div className="flex flex-col items-center justify-center leading-tight">
    <div className="flex items-center gap-1">
      <span>🪓</span>
      <span className="font-extrabold">+10%</span>
    </div>
    <div className="!text-[14px] md:!text-[16px] mt-0.5 tabular-nums font-extrabold leading-tight self-end mr-1">
      {formatShort1(dpsCostNow)}
    </div>
  </div>
</button>

{/* GOLD - שורה 1: 🟡 +10% ; שורה 2: מחיר בלבד */}
<button
  onClick={upgradeGold}
  disabled={!canBuyGold}
  className={`${BTN_BASE} ${BTN_H_FIX} ${BTN_W_FIX} ${
    canBuyGold
      ? "bg-amber-400 hover:bg-amber-300 ring-amber-300 text-slate-900"
      : `bg-amber-400 ring-amber-300 text-slate-900 ${BTN_DIS}`
  }`}
>
  <div className="flex flex-col items-center justify-center leading-tight">
    <div className="flex items-center gap-1">
      <span>🟡</span>
      <span className="font-extrabold">+10%</span>
    </div>
    <div className="!text-[14px] md:!text-[16px] mt-0.5 tabular-nums font-extrabold leading-tight self-end mr-1">
      {formatShort1(goldCostNow)}
    </div>
  </div>
</button>

                </div>

          {/* Mining status + CLAIM */}
          <div className="w-full flex justify-center mt-1">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
              {/* Icon button */}
              {/* נקודות (icon + number) - both clickable */}
<button
  onClick={() => setShowPointsModal(true)}
  className={`relative inline-flex items-center gap-2 px-2 py-1 rounded-md transition
    ${(Number(mining?.balance || 0) > 0) ? "hover:bg-white/10 active:scale-95 cursor-pointer" : "opacity-90"}`}
  aria-label="פרטי נקודות"
  title="פרטי נקודות כרייה"
>
  <div className="relative w-6 h-6 rounded-full grid place-items-center">
    {(Number(mining?.balance || 0) >= 1) && (
      <span
        aria-hidden
        className="absolute -inset-px rounded-full"
        style={{
          animation: "glowPulse 1.2s infinite",
          border: "2px solid rgba(250,204,21,.8)",
          boxShadow: "0 0 10px rgba(250,204,21,.55), 0 0 20px rgba(250,204,21,.35)"
        }}
      />
    )}
    <img src={IMG_SPAWN_ICON} alt="נקודות" className="w-6 h-6 rounded-full pointer-events-none" />
  </div>

  <span
    className={`text-yellow-300 font-extrabold tabular-nums ${
      (Number(mining?.balance || 0) >= 1) ? "inline-block" : ""
    }`}
    style={(Number(mining?.balance || 0) >= 1) ? { animation: "nudge 1.8s ease-in-out infinite" } : undefined}
  >
    {formatPointsShort1(mining?.balance || 0)} נקודות

  </span>
</button>


              <button
  onClick={claimBalanceToVaultDemo}
  disabled={Number(mining?.balance || 0) < 1}
  className={`relative px-2.5 py-1 rounded-md font-extrabold transition active:scale-95
    ${Number(mining?.balance || 0) >= 1
      ? "bg-yellow-400 hover:bg-yellow-300 text-black cursor-pointer"
      : "bg-slate-500 text-white/70 cursor-not-allowed"
    }`}
  title={Number(mining?.balance || 0) >= 1 ? "מימוש כל הנקודות" : "צריך לפחות נקודה אחת למימוש"}
>
  {Number(mining?.balance || 0) >= 1 && (
    <span
      aria-hidden
      className="absolute -inset-1 rounded-lg"
      style={{ animation: "btnPulse 1.8s ease-in-out infinite" }}
    />
  )}
  {claiming ? "מממש…" : "מימוש"}
</button>

            </div>
          </div>

        </div>
)}

        {/* === END PART 9 === */}


{/* === START PART 10 === */}
        {/* Toast ממורכז ומעל ה-HUD */}
        {giftToast && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto px-6 py-4 rounded-2xl font-extrabold text-black shadow-2xl bg-gradient-to-br from-yellow-300 to-amber-400 border border-yellow-200 text-center animate-[popfade_1.8s_ease-out_forwards]">
              {giftToast.text}
            </div>
            <style jsx global>{`
              @keyframes popfade {
                0% { opacity: 0; transform: translateY(6px) scale(0.96); }
                15% { opacity: 1; transform: translateY(0) scale(1); }
                75% { opacity: 1; }
                100% { opacity: 0; transform: translateY(-6px) scale(0.98); }
              }
            `}</style>
          </div>
        )}

        {/* פופאפ מרכזי – בלי OK, נעלם אוטומטית */}
        {centerPopup && (
          <div className="absolute inset-0 z-[10001] flex items-center justify-center pointer-events-none">
            <div
              key={centerPopup.id}
              className="pointer-events-none px-6 py-4 rounded-2xl font-extrabold text-black shadow-2xl bg-gradient-to-br from-yellow-300 to-amber-400 border border-yellow-200 text-center animate-[popfade_1.8s_ease-out_forwards]"
            >
              <div className="text-lg">{centerPopup.text}</div>
            </div>
            <style jsx global>{`
              @keyframes popfade {
                0% { opacity: 0; transform: translateY(6px) scale(0.96); }
                15% { opacity: 1; transform: translateY(0) scale(1); }
                75% { opacity: 1; }
                100% { opacity: 0; transform: translateY(-6px) scale(0.98); }
              }
            `}</style>
          </div>
        )}

        {/* Center Gift Button */}
        {!showIntro && !gamePaused && !showCollect && giftReadyFlag && (
          <div className="absolute inset-0 z-[10050] flex items-center justify-center pointer-events-none">
            <button
              type="button"
              onClick={grantGift}
              className="pointer-events-auto touch-manipulation min-w-[11rem] min-h-[3rem] px-6 py-3 rounded-2xl font-extrabold text-black shadow-2xl bg-gradient-to-br from-yellow-300 to-amber-400 border border-yellow-200 hover:from-yellow-200 hover:to-amber-300 active:scale-95 relative"
              aria-label="אסוף מתנה"
            >
              🎁 אסוף מתנה
              <span aria-hidden className="pointer-events-none absolute -inset-3 rounded-3xl blur-3xl bg-yellow-400/30" />
            </button>
          </div>
        )}
      </div>

      {/* איסוף אופליין */}
      {showCollect && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/85 px-6 text-center">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 shadow-2xl max-w-sm w-full" dir="rtl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src={IMG_COIN} alt="מטבע" className="w-6 h-6" />
              <h3 className="text-xl font-extrabold text-white">בזמן שלא הייתם כאן…</h3>
            </div>
            <p className="text-gray-200 mb-4">
              הערכת רווחים מחוץ למשחק:{" "}
              <b className="text-yellow-300">
                {formatShort(stateRef.current?.pendingOfflineGold || 0)}
              </b>{" "}
              מטבעות ו-
             <b className="text-yellow-300">
  {formatPointsShort(stateRef.current?.pendingOfflinePoints || 0)}

</b>{" "}
נקודות
              <span className="block text-[11px] text-gray-400 mt-2">
                הנקודות הסופיות מאושרות בשרת אחרי האיסוף.
              </span>

            </p>

            <button
              onClick={onOfflineCollect}
              className="mx-auto px-6 py-3 rounded-xl bg-yellow-400 text-black font-extrabold text-lg shadow active:scale-95"
            >
              אסוף
            </button>
          </div>
        </div>
      )}

      {/* Reset confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 max-w-md w-full rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-extrabold mb-2">לאפס את ההתקדמות?</h2>
            <p className="text-sm text-slate-700 mb-4">
              פעולה זו תמחק את השמירה ותחזיר אתכם להתחלה.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={resetGame}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold"
              >
                כן, לאפס
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How to Play modal */}
      {showHowTo && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 max-w-md w-full rounded-2xl p-6 shadow-2xl overflow-auto max-h-[85vh]">
            <h2 className="text-2xl font-extrabold mb-3">איך משחקים?</h2>

            <div className="space-y-4 text-sm text-slate-700" dir="rtl">
              <section>
                <h3 className="font-bold text-slate-900 mb-1">המטרה</h3>
                <p>
                  למזג כלבי כורים, לשבור סלעים ולצבור <b>מטבעות</b>. המטבעות משמשים לשדרוגים ולקניית כלבים נוספים.
                  חלק מהפעילות גם צוברת <b>נקודות כרייה</b> (ראו למטה).
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 mb-1">לוח ומיזוג</h3>
                <ol className="list-decimal mr-5 space-y-1">
                  <li>לחצו <b>הוסף</b> על משבצת ריקה כדי להוסיף כלב. המחיר עולה עם הזמן.</li>
                  <li>גררו שני כלבים באותה רמה כדי למזג לרמה גבוהה יותר.</li>
                  <li>3 נתיבים, 4 כלבים בכל נתיב (מקסימום 12 כלבים).</li>
                  <li>כל כלב מוסיף נזק לשנייה לנתיב שלו. כשסלע נשבר מקבלים מטבעות.</li>
                </ol>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 mb-1">שדרוגים ובונוסים</h3>
                <ul className="list-disc mr-5 space-y-1">
                  <li><b>כוח שבירה</b> - שוברים סלעים מהר יותר.</li>
                  <li><b>זהב</b> - יותר מטבעות מכל סלע (+10% לשדרוג).</li>
                  <li>מתנות, כלבים אוטומטיים ובונוסים נוספים מופיעים מעת לעת.</li>
                  <li>אפשר לאסוף יהלומים ולפתוח ארגזים מיוחדים.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 mb-1">נקודות כרייה</h3>
                <ul className="list-disc mr-5 space-y-1">
                  <li>רק שבירת סלעים יכולה לצבור נקודות כרייה.</li>
                  <li>יש תקרה יומית והאטה הדרגתית ככל שמתקרבים אליה.</li>
                  <li>התקדמות offline מוגבלת וביעילות מופחתת.</li>
                  <li><b>מימוש:</b> הנקודות שנצברו מומשות למטבעות ליאו דרך השרת.</li>
                  <li>נקודות הן לבידור בלבד - אין להן ערך כספי מובטח.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 mb-1">חשוב לדעת</h3>
                <ul className="list-disc mr-5 space-y-1">
                  <li>איזון המשחק, מתנות ומגבלות יומיות עשויים להשתנות לצורך הוגנות ותחזוקה.</li>
                  <li>זה משחק כיף לילדים - לא ייעוץ פיננסי.</li>
                </ul>
              </section>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowHowTo(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms modal */}
            {/* HUD Info modal (Coins/DPS/GOLD/Spawn/Gifts/🎁/🦊) */}
      {hudModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 max-w-sm w-full rounded-2xl p-6 shadow-2xl overflow-auto max-h-[85vh]">
            <h2 className="text-xl font-extrabold mb-2">{getHudModalTitle(hudModal)}</h2>
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {getHudModalText(hudModal)}
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setHudModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-extrabold"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

{/* === [GAIN] Modal (ADD) === */}
{showGainModal && (
  <div className="fixed inset-0 z-[10060] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
    <div className="w-full max-w-md rounded-2xl bg-zinc-900 text-white border border-white/10 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-lg font-semibold">בונוס צפייה - איך זה עובד?</h3>
        <button
          onClick={() => setShowGainModal(false)}
          className="px-2 py-1 rounded hover:bg-white/10"
          aria-label="סגור"
          title="סגור"
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 text-sm leading-6" dir="rtl">
        <p>
          בונוס הצפייה הוא בונוס מיוחד. עקבו אחרי השלבים כדי להפעיל אותו ולקבל את הפרס.
        </p>

        <div className="rounded-lg bg-black/40 border border-white/10 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">סטטוס</span>
            <span className={`px-2 py-0.5 rounded text-xs ${!addDisabled ? "bg-green-500 text-black" : "bg-zinc-700 text-white/80"}`}>
  {!addDisabled ? "זמין" : "לא זמין"}
</span>

          </div>
          <p className="mt-2 text-white/80">
            {!addDisabled
  ? "הבונוס מוכן! לחצו צפייה כדי להמשיך ולקבל אותו."
  : `הבונוס יהיה זמין בעוד ${addRemainLabel}.`}

          </p>
        </div>

        <ul className="list-disc list-inside space-y-1 text-white/80">
          <li>השלימו את הפעולה הנדרשת כדי להפעיל את הבונוס.</li>
          <li>כשמוכן, לחצו צפייה כדי לקבל את הפרס.</li>
          <li>אם כבוי - המתינו עד שהתנאים יתמלאו.</li>
        </ul>
      </div>

      <div className="px-4 pb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setShowGainModal(false)}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10"
        >
          סגור
        </button>

<button
  onClick={() => {
    if (addDisabled) return;
    setShowGainModal(false);
    onAdd();
  }}
  disabled={addDisabled}
  className={`px-4 py-2 rounded-lg font-semibold border ${
    !addDisabled
      ? "bg-emerald-500 text-black border-emerald-400"
      : "bg-zinc-700 text-white/50 border-white/10 cursor-not-allowed"
  }`}
  title={!addDisabled ? "צפייה וקבלת בונוס" : "עדיין לא זמין"}
>
  {!addDisabled ? "צפייה" : "צפייה (לא זמין)"}
</button>


      </div>
    </div>
  </div>
)}
{/* === [GAIN] END Modal === */}


         {/* Diamonds modal */}
      {showPointsModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 max-w-sm w-full rounded-2xl p-6 shadow-2xl overflow-auto max-h-[85vh]" dir="rtl">
            <h2 className="text-xl font-extrabold mb-3">נקודות כרייה</h2>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="p-3 rounded-xl bg-slate-100">
                <div className="text-slate-500 text-xs">יתרה למימוש</div>
                <div className="font-extrabold text-slate-900 tabular-nums">
                  {formatPointsShort1(Number(mining?.balance || 0))} נקודות
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-100">
                <div className="text-slate-500 text-xs">נצברו היום</div>
                <div className="font-extrabold text-slate-900 tabular-nums">
                  {formatPointsShort1(Number(mining?.minedToday || 0))} נקודות
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-100">
                <div className="text-slate-500 text-xs">מומשו היום</div>
                <div className="font-extrabold text-slate-900 tabular-nums">
                  {formatShort(Number(mining?.claimedToday || 0))} מטבעות
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-100">
                <div className="text-slate-500 text-xs">מומשו (סה״כ)</div>
                <div className="font-extrabold text-slate-900 tabular-nums">
                  {formatShort(Number(mining?.claimedTotal || 0))} מטבעות
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              נקודות נצברות רק משבירת סלעים. לחצו <b>מימוש</b> כדי להמיר אותן למטבעות ליאו דרך השרת.
            </p>

            <div className="flex justify-between gap-2">
              <button
                onClick={() => setShowPointsModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-extrabold"
              >
                סגור
              </button>
              <button
                onClick={() => { setShowPointsModal(false); claimBalanceToVaultDemo(); }}
                disabled={claiming || (Number(mining?.balance || 0) < 1)}
                className={`px-4 py-2 rounded-lg font-extrabold ${
                  (Number(mining?.balance || 0) >= 1) && !claiming
                    ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
                title={(Number(mining?.balance || 0) >= 1) ? "מימוש כל הנקודות" : "צריך לפחות נקודה אחת"}
              >
                {claiming ? "מממש…" : "מימוש"}
              </button>
            </div>
          </div>
        </div>
      )}

         {/* Diamonds modal */}
      {showDiamondInfo && (() => {
        const s = stateRef.current || {};
        const diamonds = Number(s.diamonds || 0);

        const prizeLabel = (() => {
          switch (s.nextDiamondPrize) {
            case "coins_x10":   return "מתנה ×10";
            case "coins_x100":  return "מתנה ×100";
            case "coins_x1000": return "מתנה ×1000";
            case "dog+3":       return "כלב +3 רמות";
            case "dog+5":       return "כלב +5 רמות";
            case "dog+7":       return "כלב +7 רמות";
            default:            return s.nextDiamondPrize || "";
          }
        })();

        const ready = diamonds >= 3;

        return (
          <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white text-slate-900 max-w-sm w-full rounded-2xl p-6 shadow-2xl overflow-auto max-h-[85vh]">
              <h2 className="text-xl font-extrabold mb-1">יהלומים</h2>

              <p className="text-xs text-slate-600 mb-3" dir="rtl">
                אספו <b>3</b> יהלומים כדי לפתוח ארגז. אפשר להחזיק יותר מ-3 ולפתוח מתי שרוצים.
                פרסים אפשריים: מתנות מטבעות <b>×10/×100/×1000</b> או בוסט כלב (+3/+5/+7 רמות).
              </p>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3" dir="rtl">
                <div className="p-3 rounded-xl bg-slate-100">
                  <div className="text-slate-500 text-xs">יהלומים</div>
                  <div className="font-extrabold text-slate-900">{diamonds} / 3</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-100">
                  <div className="text-slate-500 text-xs">הפרס הבא</div>
                  <div className="font-extrabold text-slate-900">{prizeLabel}</div>
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <button
                  onClick={() => setShowDiamondInfo(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-extrabold"
                >
                  סגור
                </button>
                <button
                  onClick={() => { openDiamondChestIfReady(); }}
                  disabled={!ready}
                  className={`px-4 py-2 rounded-lg font-extrabold ${ready ? "bg-yellow-400 hover:bg-yellow-300 text-black" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`}
                  title={ready ? "פתיחת ארגז" : "צריך 3 יהלומים"}
                >
                  פתח ארגז
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  </>
);
}
// === END PART 10 ===