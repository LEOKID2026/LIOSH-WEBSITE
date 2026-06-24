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

function clampMetricNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function normalizeMetrics(raw) {
  if (!raw || typeof raw !== "object") return null;

  const score = clampMetricNumber(raw.score, 0, 100000);
  if (score == null) return null;

  const metrics = {
    gameKey: "recycling-factory",
    category: "educational",
    score,
    didWin: raw.didWin === true,
    difficulty: raw.difficulty != null ? String(raw.difficulty).trim().toLowerCase() : null,
    durationMs: raw.durationMs != null ? clampMetricNumber(raw.durationMs, 0, 3600000) : null,
  };

  for (const key of RECYCLING_FACTORY_METRIC_KEYS) {
    if (raw[key] != null) {
      const val = clampMetricNumber(raw[key], 0, key === "accuracy" ? 1 : 10000);
      if (val == null) return null;
      metrics[key] = key === "accuracy" ? val : Math.floor(val);
    }
  }

  if (metrics.streaks == null && raw.streak != null) {
    metrics.streaks = Math.floor(clampMetricNumber(raw.streak, 0, 200) ?? 0);
  }

  if (metrics.mistakes == null && metrics.wrongItems != null && metrics.missedItems != null) {
    metrics.mistakes = metrics.wrongItems + metrics.missedItems;
  }

  if (metrics.accuracy == null && metrics.correctItems != null) {
    const denom = Math.max(
      1,
      (metrics.correctItems ?? 0) + (metrics.wrongItems ?? 0) + (metrics.missedItems ?? 0),
    );
    metrics.accuracy = (metrics.correctItems ?? 0) / denom;
  }

  return metrics;
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
    const metrics = normalizeMetrics(body?.metrics);

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "חסר מזהה משחק" });
    }
    if (!metrics) {
      return res.status(400).json({ ok: false, error: "נתוני משחק לא תקינים" });
    }
    if (metrics.category !== "educational") {
      return res.status(400).json({ ok: false, error: "קטגוריה לא תקינה" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const loaded = await loadActiveEducationalGameSession(supabase, sessionId, auth.studentId);
    if (!loaded.ok) {
      return res.status(404).json({ ok: false, error: loaded.message, code: loaded.code });
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
