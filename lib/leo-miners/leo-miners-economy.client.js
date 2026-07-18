import {
  LEO_MINERS_ACTION_TYPES,
  LEO_MINERS_CLAIM_TYPES,
  LEO_MINERS_DB_NOT_READY_MESSAGE_HE,
  LEO_MINERS_ERROR_CODES,
} from "./leo-miners-constants.js";
import { getDefaultGameplayTuning } from "./leo-miners-gameplay-config.client.js";
import { isDemoMode } from "../demo/demo-mode.client.js";
import {
  assertDemoPlayAllowed,
  DEMO_TIME_EXPIRED_CODE,
} from "../demo/demo-play-guard.client.js";

function newIdempotencyKey(prefix = "lm") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Client adapter for Leo Miners server economy (events only — no reward amounts from client).
 */
export function createLeoMinersEconomyClient(hooks = {}) {
  const { onStateUpdate, onDbStatusChange, onConfigUpdate } = hooks;

  let flushTimer = null;
  /** @type {Record<string, number>} */
  let pendingStageCounts = Object.create(null);
  let pendingOfflineSec = 0;
  let inflightFlush = null;
  let demoRunActive = false;
  let demoPendingPoints = 0;

  function demoDefaultState() {
    return {
      boardJson: null,
      upgradesJson: null,
      miningPointsPending: demoPendingPoints,
      minedTodayPoints: 0,
      claimedTodayCoins: 0,
      claimedTotalCoins: 0,
      dailyUsed: 0,
      dailyCap: 9999,
    };
  }

  function ensureDemoRunStarted() {
    if (demoRunActive) return true;
    if (!assertDemoPlayAllowed()) return false;
    demoRunActive = true;
    return true;
  }

  function notifyState(payload) {
    if (typeof onStateUpdate === "function") onStateUpdate(payload);
  }

  function notifyDb(payload) {
    if (typeof onDbStatusChange === "function") onDbStatusChange(payload);
  }

  function notifyConfig(payload) {
    if (typeof onConfigUpdate === "function") onConfigUpdate(payload);
  }

  async function fetchState() {
    if (isDemoMode()) {
      notifyDb({
        dbReady: true,
        gameEnabled: true,
        economyEnabled: false,
        rewardsEnabled: false,
        code: null,
        message: null,
      });
      notifyConfig({
        hydrated: true,
        gameplayTuning: getDefaultGameplayTuning(),
        fromServer: false,
      });
      notifyState(demoDefaultState());
      return { ok: true, demo: true, state: demoDefaultState() };
    }

    let res;
    try {
      res = await fetch("/api/student/leo-miners/state", {
        method: "GET",
        credentials: "include",
      });
    } catch {
      notifyDb({
        dbReady: false,
        gameEnabled: false,
        economyEnabled: false,
        code: "network_error",
        message: "שגיאת רשת - נסו לרענן את הדף.",
      });
      notifyConfig({
        hydrated: true,
        gameplayTuning: getDefaultGameplayTuning(),
        fromServer: false,
      });
      return { ok: false, code: "network_error" };
    }

    const payload = await parseJson(res);
    const migrationNotReady =
      res.status === 503 &&
      payload?.code === LEO_MINERS_ERROR_CODES.miners_db_not_ready;

    if (migrationNotReady) {
      notifyDb({
        dbReady: false,
        gameEnabled: false,
        economyEnabled: false,
        rewardsEnabled: false,
        code: payload.code,
        message: payload.message || LEO_MINERS_DB_NOT_READY_MESSAGE_HE,
      });
    } else if (!res.ok || payload?.ok !== true) {
      notifyDb({
        dbReady: false,
        gameEnabled: payload?.gameEnabled === true,
        economyEnabled: payload?.economyEnabled === true,
        rewardsEnabled: false,
        code: payload?.code || "server_error",
        message:
          payload?.message ||
          payload?.error ||
          "שגיאת שרת - נסו לרענן את הדף.",
      });
    } else {
      notifyDb({
        dbReady: payload?.dbReady === true,
        gameEnabled: payload?.gameEnabled === true,
        economyEnabled: payload?.economyEnabled === true,
        rewardsEnabled: payload?.economyEnabled === true || payload?.rewardsEnabled === true,
        code: payload?.code || null,
        message: payload?.message || payload?.error || null,
      });
    }

    notifyConfig({
      hydrated: true,
      gameplayTuning:
        payload?.config?.gameplayTuning && typeof payload.config.gameplayTuning === "object"
          ? payload.config.gameplayTuning
          : getDefaultGameplayTuning(),
      fromServer: payload?.dbReady === true,
    });
    if (payload?.ok) {
      notifyState({
        ...(payload.state && typeof payload.state === "object" ? payload.state : {}),
        miningPointsPending: payload.state?.miningPointsPending,
        minedTodayPoints: payload.minedTodayPoints ?? payload.dailyUsed,
        claimedTodayCoins: payload.claimedTodayCoins,
        claimedTotalCoins: payload.claimedTotalCoins,
        dailyUsed: payload.dailyUsed,
        dailyCap: payload.config?.dailyCap,
      });
    }
    return payload;
  }

  async function saveState({ boardJson, upgradesJson, clientSeenAt }) {
    if (isDemoMode()) {
      return { ok: true, demo: true, boardJson, upgradesJson, clientSeenAt };
    }
    const res = await fetch("/api/student/leo-miners/save-state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardJson, upgradesJson, clientSeenAt: clientSeenAt || new Date().toISOString() }),
    });
    return parseJson(res);
  }

  async function postAccrue(body) {
    const res = await fetch("/api/student/leo-miners/accrue", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await parseJson(res);
    if (payload?.ok && payload?.pendingPoints != null) {
      notifyState({
        miningPointsPending: payload.pendingPoints,
        dailyUsed: payload.dailyUsed,
        dailyCap: payload.dailyCap,
      });
    }
    return payload;
  }

  async function flushPendingAccrual(actionType = LEO_MINERS_ACTION_TYPES.ROCK_BREAK) {
    const stageCounts = { ...pendingStageCounts };
    const total = Object.values(stageCounts).reduce((a, b) => a + Number(b || 0), 0);
    const offlineElapsedSec = pendingOfflineSec;
    pendingStageCounts = Object.create(null);
    pendingOfflineSec = 0;

    if (total <= 0 && offlineElapsedSec <= 0) return { ok: true, skipped: true };

    if (isDemoMode()) {
      demoPendingPoints += total;
      notifyState({ ...demoDefaultState(), miningPointsPending: demoPendingPoints });
      return { ok: true, demo: true, pendingPoints: demoPendingPoints };
    }

    if (inflightFlush) return inflightFlush;

    inflightFlush = postAccrue({
      idempotencyKey: newIdempotencyKey("accrue"),
      actionType,
      stageCounts,
      offlineElapsedSec,
      clientSeenAt: new Date().toISOString(),
    }).finally(() => {
      inflightFlush = null;
    });

    return inflightFlush;
  }

  function queueRockBreak(stage, count = 1, isOffline = false) {
    if (isDemoMode() && !ensureDemoRunStarted()) return;
    const s = Math.max(1, Math.floor(Number(stage) || 1));
    const c = Math.max(0, Math.floor(Number(count) || 0));
    if (c <= 0) return;
    pendingStageCounts[String(s)] = (pendingStageCounts[String(s)] || 0) + c;
    if (isOffline) pendingOfflineSec += 1;

    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushPendingAccrual(
        isOffline ? LEO_MINERS_ACTION_TYPES.OFFLINE_BATCH : LEO_MINERS_ACTION_TYPES.ROCK_BREAK
      ).catch((err) => console.error("[leo-miners] accrue flush failed", err));
    }, 800);
  }

  async function claimCoins() {
    if (isDemoMode()) {
      demoPendingPoints = 0;
      notifyState({ ...demoDefaultState(), miningPointsPending: 0, lastClaimAt: new Date().toISOString() });
      return { ok: true, demo: true, pendingPoints: 0 };
    }
    const payload = await fetch("/api/student/leo-miners/claim", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: newIdempotencyKey("claim"),
        claimType: LEO_MINERS_CLAIM_TYPES.COINS,
      }),
    }).then(parseJson);

    if (payload?.ok) {
      notifyState({
        miningPointsPending: payload.pendingPoints ?? 0,
        lastClaimAt: new Date().toISOString(),
      });
      fetchState().catch(() => {});
    }
    return payload;
  }

  async function claimDiamondChest(diamondChestAction = null) {
    if (isDemoMode()) {
      return { ok: true, demo: true, diamondsPending: 0 };
    }
    const payload = await fetch("/api/student/leo-miners/claim", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: newIdempotencyKey("dchest"),
        claimType: LEO_MINERS_CLAIM_TYPES.DIAMONDS_CHEST,
        diamondChestAction,
      }),
    }).then(parseJson);

    if (payload?.ok) {
      notifyState({
        diamondsPending: payload.diamondsPending ?? 0,
        miningPointsPending: payload.pendingPoints ?? undefined,
      });
    }
    return payload;
  }

  async function resetGame() {
    if (isDemoMode()) {
      if (!assertDemoPlayAllowed()) {
        return { ok: false, code: DEMO_TIME_EXPIRED_CODE };
      }
      demoRunActive = true;
      demoPendingPoints = 0;
      pendingStageCounts = Object.create(null);
      pendingOfflineSec = 0;
      notifyState(demoDefaultState());
      return { ok: true, demo: true, state: demoDefaultState() };
    }
    const res = await fetch("/api/student/leo-miners/reset", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const payload = await parseJson(res);
    if (payload?.ok) notifyState(payload.state || {});
    return payload;
  }

  function dispose() {
    if (flushTimer) clearTimeout(flushTimer);
  }

  return {
    fetchState,
    saveState,
    queueRockBreak,
    flushPendingAccrual,
    claimCoins,
    claimDiamondChest,
    resetGame,
    dispose,
  };
}
