import { getLearningSupabaseServiceRoleClient } from "../../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../../lib/learning-supabase/student-auth";
import { guardCookieMutationOrigin } from "../../../../lib/security/api-guards.js";
import { economyUnavailableHttpResponse } from "../../../../lib/rewards/economy-errors.js";
import { guardEconomyAvailable } from "../../../../lib/rewards/guards.server.js";
import { readJsonBody } from "../../../../lib/learning-supabase/learning-activity";
import {
  computeServerDurationMs,
  loadActiveEducationalGameSession,
  validatePlayDurationMs,
} from "../../../../lib/educational-games/server/educational-game-session.server.js";
import { finalizeEducationalGameSession } from "../../../../lib/educational-games/server/educational-game-payout.server.js";
import { assertStudentCanPlayGame } from "../../../../lib/games/server/game-access.server.js";

const RECYCLING_FACTORY_METRIC_KEYS = Object.freeze([
  "sortedItems",
  "correctItems",
  "wrongItems",
  "missedItems",
  "mistakes",
  "streaks",
  "bestStreak",
  "durationSec",
  "accuracy",
]);

const LEO_SUPERMARKET_METRIC_KEYS = Object.freeze([
  "customersTotal",
  "customersReached",
  "customersCompleted",
  "correctCustomers",
  "wrongProducts",
  "wrongChange",
  "timeoutMistakes",
  "mistakes",
  "bestStreak",
  "durationSec",
  "accuracy",
  "completedAllCustomers",
]);

const LEO_LAB_METRIC_KEYS = Object.freeze([
  "experimentsTotal",
  "experimentsReached",
  "successfulExperiments",
  "failedAttempts",
  "mistakes",
  "firstTrySuccesses",
  "bestStreak",
  "durationSec",
  "accuracy",
  "completedAllExperiments",
]);

function clampMetricNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function normalizeBaseMetrics(raw, gameKey) {
  const score = clampMetricNumber(raw.score, 0, 100000);
  if (score == null) return null;

  return {
    gameKey,
    category: "educational",
    score,
    didWin: raw.didWin === true,
    difficulty: raw.difficulty != null ? String(raw.difficulty).trim().toLowerCase() : null,
    durationMs: raw.durationMs != null ? clampMetricNumber(raw.durationMs, 0, 3600000) : null,
  };
}

function normalizeRecyclingFactoryMetrics(raw) {
  const base = normalizeBaseMetrics(raw, "recycling-factory");
  if (!base) return null;

  for (const key of RECYCLING_FACTORY_METRIC_KEYS) {
    if (raw[key] != null) {
      const val = clampMetricNumber(raw[key], 0, key === "accuracy" ? 1 : 10000);
      if (val == null) return null;
      base[key] = key === "accuracy" ? val : Math.floor(val);
    }
  }

  if (base.streaks == null && raw.streak != null) {
    base.streaks = Math.floor(clampMetricNumber(raw.streak, 0, 200) ?? 0);
  }

  if (base.mistakes == null && base.wrongItems != null && base.missedItems != null) {
    base.mistakes = base.wrongItems + base.missedItems;
  }

  if (base.accuracy == null && base.correctItems != null) {
    const denom = Math.max(
      1,
      (base.correctItems ?? 0) + (base.wrongItems ?? 0) + (base.missedItems ?? 0),
    );
    base.accuracy = (base.correctItems ?? 0) / denom;
  }

  return base;
}

function normalizeLeoSupermarketMetrics(raw) {
  const base = normalizeBaseMetrics(raw, "leo-supermarket");
  if (!base) return null;

  for (const key of LEO_SUPERMARKET_METRIC_KEYS) {
    if (key === "completedAllCustomers") {
      base.completedAllCustomers = raw.completedAllCustomers === true;
      continue;
    }
    if (raw[key] != null) {
      const val = clampMetricNumber(raw[key], 0, key === "accuracy" ? 1 : 10000);
      if (val == null) return null;
      base[key] = key === "accuracy" ? val : Math.floor(val);
    }
  }

  if (base.customersTotal == null) base.customersTotal = 30;
  if (base.mistakes == null && base.wrongProducts != null && base.wrongChange != null && base.timeoutMistakes != null) {
    base.mistakes = base.wrongProducts + base.wrongChange + base.timeoutMistakes;
  }

  if (base.accuracy == null && base.correctCustomers != null) {
    base.accuracy = (base.correctCustomers ?? 0) / Math.max(1, base.customersReached ?? 1);
  }

  if (base.completedAllCustomers == null && base.customersCompleted != null && base.customersTotal != null) {
    base.completedAllCustomers = base.customersCompleted >= base.customersTotal;
  }

  return base;
}

function normalizeLeoLabMetrics(raw) {
  const base = normalizeBaseMetrics(raw, "leo-lab");
  if (!base) return null;

  for (const key of LEO_LAB_METRIC_KEYS) {
    if (key === "completedAllExperiments") {
      base.completedAllExperiments = raw.completedAllExperiments === true;
      continue;
    }
    if (raw[key] != null) {
      const val = clampMetricNumber(raw[key], 0, key === "accuracy" ? 1 : 10000);
      if (val == null) return null;
      base[key] = key === "accuracy" ? val : Math.floor(val);
    }
  }

  if (base.experimentsTotal == null) base.experimentsTotal = 20;
  if (base.mistakes == null && base.failedAttempts != null) {
    base.mistakes = base.failedAttempts;
  }

  if (base.accuracy == null && base.successfulExperiments != null) {
    base.accuracy = (base.successfulExperiments ?? 0) / Math.max(1, base.experimentsReached ?? 1);
  }

  if (base.completedAllExperiments == null && base.successfulExperiments != null && base.experimentsTotal != null) {
    base.completedAllExperiments = base.successfulExperiments >= base.experimentsTotal;
  }

  base.positiveProgress = base.successfulExperiments ?? 0;

  return base;
}

function normalizeMetrics(raw, gameKey) {
  if (!raw || typeof raw !== "object") return null;
  const key = String(gameKey || raw.gameKey || "").trim().toLowerCase();
  if (key === "leo-supermarket") return normalizeLeoSupermarketMetrics(raw);
  if (key === "leo-lab") return normalizeLeoLabMetrics(raw);
  if (key === "recycling-factory") return normalizeRecyclingFactoryMetrics(raw);
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;
  if (!guardEconomyAvailable(res)) return;

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const body = await readJsonBody(req);
    const sessionId = String(body?.sessionId || "").trim();
    const rawMetrics = body?.metrics;

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "חסר מזהה משחק" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const loaded = await loadActiveEducationalGameSession(supabase, sessionId, auth.studentId);
    if (!loaded.ok) {
      return res.status(404).json({ ok: false, error: loaded.message, code: loaded.code });
    }

    const metrics = normalizeMetrics(rawMetrics, loaded.session.game_key);
    if (!metrics) {
      return res.status(400).json({ ok: false, error: "נתוני משחק לא תקינים" });
    }
    if (metrics.gameKey !== loaded.session.game_key) {
      return res.status(400).json({ ok: false, error: "משחק לא תואם לסשן" });
    }
    if (metrics.category !== "educational") {
      return res.status(400).json({ ok: false, error: "קטגוריה לא תקינה" });
    }

    const access = await assertStudentCanPlayGame(supabase, auth.studentId, loaded.session.game_key);
    if (!access.ok) {
      return res.status(access.status || 403).json({
        ok: false,
        error: access.message,
        code: access.code,
        category: access.category,
      });
    }

    const finishedAt = new Date().toISOString();
    const serverDurationMs = computeServerDurationMs(loaded.session.started_at, finishedAt);
    const durationCheck = validatePlayDurationMs(serverDurationMs);
    if (!durationCheck.ok) {
      return res.status(400).json({ ok: false, error: durationCheck.message, code: durationCheck.code });
    }

    metrics.durationMs = serverDurationMs;
    if (metrics.durationSec == null) {
      metrics.durationSec = Math.max(1, Math.round(serverDurationMs / 1000));
    }

    const result = await finalizeEducationalGameSession(supabase, {
      session: loaded.session,
      studentId: auth.studentId,
      metrics,
      finishedAt,
    });

    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.message, code: result.code });
    }

    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    if (e?.name === "EconomyUnavailableError") {
      return res.status(503).json(economyUnavailableHttpResponse(e));
    }
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
