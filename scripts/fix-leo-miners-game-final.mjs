/**
 * Final LeoMinersGame.jsx repairs: broken useEffect, missing state, Leo Kids economy wiring.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "components", "leo-miners", "LeoMinersGame.jsx");
let src = fs.readFileSync(file, "utf8");

// Remove recursive formatPointsShort stub
src = src.replace(
  /\/\/ Vault display — זהה ל־נקודות button \(2 ספרות \+ קיצור באותיות\)\r?\nfunction formatPointsShort\(n\) \{\r?\n  return formatPointsShort\(n\);\r?\n\}\r?\n\r?\n\r?\n\r?\n/g,
  ""
);

// Add Leo Kids mining helpers after imports
if (!src.includes("const DAILY_CAP = DAILY_CAP_DISPLAY")) {
  src = src.replace(
    'import { pointsBaseForStage, OFFLINE_DPS_FACTOR, DAILY_CAP_DISPLAY } from "../../lib/leo-miners/leo-miners-formulas.client.js";',
    `import { useRouter } from "next/router";
import { pointsBaseForStage, OFFLINE_DPS_FACTOR, DAILY_CAP_DISPLAY } from "../../lib/leo-miners/leo-miners-formulas.client.js";

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
}`
  );
}

// Add onSaveState prop
if (!src.includes("onSaveState = null")) {
  src = src.replace(
    "  statusMessage = \"\",\n}) {",
    "  statusMessage = \"\",\n  onSaveState = null,\n}) {"
  );
}

// Replace corrupted mining/init block
const corrupted = /\/\/ Wallet address copy feedback[\s\S]*?function applyMiningServerSnapshot\(patch\)\{ if\(patch\?\.balance!=null\)setPendingPoints\(Number\(patch\.balance\)\); return patch; \} else if \(\(init\.giftNextAt \|\| 0\) <= now\) \{[\s\S]*?\} catch \{\}\r?\n\r?\n  try \{\r?\n    const raw = localStorage\.getItem\(LS_KEY\);/;
const initBlock = `  const router = useRouter();
  const onSaveStateRef = useRef(onSaveState);
  useEffect(() => { onSaveStateRef.current = onSaveState; }, [onSaveState]);
  const serverSaveTimerRef = useRef(null);

  const [adCooldownUntil, setAdCooldownUntil] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adVideoEnded, setAdVideoEnded] = useState(false);
  const [showMleoModal, setShowMleoModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [centerPopup, setCenterPopup] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGainModal, setShowGainModal] = useState(false);
  const uiPulseAccumRef = useRef(0);
  const rockSfxCooldownRef = useRef(0);
  const [, forceUiPulse] = useState(0);

  const [sfxMuted, setSfxMuted] = useState(() => {
    try { return localStorage.getItem("leo_miners_sfx_muted") === "1"; } catch { return false; }
  });
  const [musicMuted, setMusicMuted] = useState(() => {
    try { return localStorage.getItem("leo_miners_music_muted") === "1"; } catch { return true; }
  });
  const bgMusicRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("leo_miners_sfx_muted", sfxMuted ? "1" : "0"); } catch {}
  }, [sfxMuted]);

  useEffect(() => {
    try { localStorage.setItem("leo_miners_music_muted", musicMuted ? "1" : "0"); } catch {}
    const a = bgMusicRef.current;
    if (!a) return;
    a.muted = musicMuted;
    if (!musicMuted) {
      a.loop = true;
      a.play().catch(() => {});
    } else {
      try { a.pause(); } catch {}
    }
  }, [musicMuted]);

  const playSfx = (s) => {
    if (!s || sfxMuted) return;
    try { const a = new Audio(s); a.volume = 0.35; a.play().catch(() => {}); } catch {}
  };

  const play = (s) => {
    if (ui.muted || !s) return;
    try { const a = new Audio(s); a.volume = 0.35; a.play().catch(() => {}); } catch {}
  };

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
    try { playSfx(S_CLICK); } catch {}
    const go = () => router.push(backHref);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(go).catch(go);
    } else {
      go();
    }
  }

  async function claimBalanceToVaultDemo() {
    try { play?.(S_CLICK); } catch {}
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
            ? \`מימוש הצליח! +\${resp.coinsGranted} מטבעות ליאו\`
            : "הנקודות מומשו בהצלחה."
        );
      } else {
        setGiftToastWithTTL(resp?.message || resp?.error || "לא ניתן לממש כרגע.");
      }
    } catch {
      setGiftToastWithTTL("שגיאת רשת — נסו שוב.");
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
      setCenterPopup({ text: \`🎁 +\${formatShort(gain)} מטבעות\`, id: Math.random() });
    } else if (type === "coins40") {
      const base = Math.max(10, expectedGiftCoinReward(s));
      const gain = Math.round(base * 0.20);
      s.gold += gain;
      setUi((u) => ({ ...u, gold: s.gold }));
      setCenterPopup({ text: \`🎁 +\${formatShort(gain)} מטבעות\`, id: Math.random() });
    } else if (type === "dps") {
      s.dpsMult = +((s.dpsMult || 1) * 1.1).toFixed(2);
      setCenterPopup({ text: \`🎁 DPS +10% (×\${(s.dpsMult || 1).toFixed(2)})\`, id: Math.random() });
    } else if (type === "gold") {
      s.goldMult = +((s.goldMult || 1) * 1.1).toFixed(2);
      setCenterPopup({ text: \`🎁 GOLD +10% (×\${(s.goldMult || 1).toFixed(2)})\`, id: Math.random() });
    } else if (type === "diamond") {
      s.diamonds = (s.diamonds || 0) + 1;
      setCenterPopup({ text: \`🎁 +1 💎 (יהלומים: \${s.diamonds})\`, id: Math.random() });
    }
    s.giftReady = false;
    const now = Date.now();
    const stepSec = currentGiftIntervalSec(s, now);
    s.giftNextAt = now + stepSec * 1000;
    s.giftFirstReadyAt = null;
    s.isIdleOffline = false;
    resetOfflineSession(s);
    setGiftReadyFlag(false);
    try { play(S_GIFT); } catch {}
    save?.();
  }

  useEffect(() => {
    theStateFix_maybeMigrateLocalStorage();

    const loaded = loadSafe();
    const init = loaded ? { ...freshState(), ...loaded } : freshState();
    normalizeSavedLanesToLaneCount(init);

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
      }
    } catch {}

  try {
    const raw = localStorage.getItem(LS_KEY);`;

if (corrupted.test(src)) {
  src = src.replace(corrupted, initBlock);
} else {
  console.warn("Could not find corrupted init block — skipping init repair");
}

// Fix rock-break local mining block
src = src.replace(
  /\/\/ Optimistic update[\s\S]*?\(dbReady && rewardsEnabled && economy \? economy\.queueRockBreak\(stageNow, 1, false\) : undefined\);/,
  `if (eff > 0) {
  if (dbReady && rewardsEnabled && economy) {
    economy.queueRockBreak(stageNow, 1, false);
  } else {
    setPendingPoints((p) => round2(Number(p || 0) + eff));
  }
}`
);

// Fix offline collect
src = src.replace(
  /\/\/ 2\) זיכוי מיידי ל-balance[\s\S]*?\/\/ 4\) ברקע[\s\S]*?\}\)\(\);\r?\n\}/,
  `// 2) sync offline stages to server when ready
  if (Object.keys(stageCountsCopy).length > 0 && dbReady && rewardsEnabled && economy) {
    for (const [stage, count] of Object.entries(stageCountsCopy)) {
      economy.queueRockBreak(Number(stage), Number(count), true);
    }
  }

  // 3) popup
  if (addCoins > 0 || addPoints > 0) {
    setCenterPopup({
      text: \`⛏️ +\${formatShort(addCoins)} מטבעות • +\${formatPointsShort(addPoints)} נקודות\`,
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
}`
);

// Fix resetGame
src = src.replace(
  /localStorage\.removeItem\(MINING_LS_KEY\);[\s\S]*?claimedToWallet: 0, history: \[\]\r?\n  \}\);/,
  `setPendingPoints(0);`
);

// Wire scheduleServerSave into save()
if (!src.includes("scheduleServerSave();")) {
  src = src.replace(
    /(\s+pendingDiamondDogLevel: s\.pendingDiamondDogLevel \|\| null,\r?\n\s+\}\)\);\r?\n\s+\} catch \{\}\r?\n\})/,
    `$1\n  scheduleServerSave();`
  );
}

// Fix dev bg paths
src = src.replace(/`\/images\/bg-cave\$\{next\}\.png`/g, "`/images/leo-miners/bg-cave${next}.png`");
src = src.replace(/`\/images\/rock\$\{next\}\.png`/g, "`/images/leo-miners/rock${next}.png`");
src = src.replace(
  /boardBgSrcRef\.current = n === 0 \? IMG_BG : `\/images\/bg-cave\$\{n\}\.png`;/g,
  "boardBgSrcRef.current = n === 0 ? IMG_BG : `/images/leo-miners/bg-cave${n}.png`;"
);
src = src.replace(
  /r === 0 \? IMG_ROCK : `\/images\/rock\$\{r\}\.png`;/g,
  "r === 0 ? IMG_ROCK : `/images/leo-miners/rock${r}.png`;"
);

// Hebrew/crypto cleanup snippets
src = src.replace(/on-chain claims become available[^<]*/g, "מימוש הנקודות מתבצע דרך שרת ליאו בלבד.");
src = src.replace(/utility token for entertainment[^<]*/g, "נקודות משחק לצורכי בידור בלבד.");
src = src.replace(/claimedToWallet/g, "claimedTotal");

fs.writeFileSync(file, src);
console.log("LeoMinersGame.jsx patched:", file);
