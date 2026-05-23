import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { readJsonBody, normalizeOptionalInteger, normalizeOptionalNumber } from "../../../lib/learning-supabase/learning-activity";
import {
  buildRuntimePlannerRecommendationFromPracticeResult,
  isAdaptivePlannerRecommendationEnabled,
} from "../../../utils/adaptive-learning-planner/adaptive-planner-runtime-bridge.js";
import {
  approvedHebrewRecommendationLineFromNextAction,
  buildAdaptivePlannerAIExplanation,
  isAdaptivePlannerAIExplainerServerEnabled,
} from "../../../utils/adaptive-learning-planner/adaptive-planner-ai-explainer.js";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";

/**
 * Load snapshot only (no scanner import — keeps API bundle free of dynamic bank requires).
 * @param {string} rootAbs
 */
async function tryLoadMetadataIndexFromSnapshot(rootAbs) {
  const p = join(rootAbs, "reports", "adaptive-learning-planner", "metadata-index-snapshot.json");
  try {
    const raw = JSON.parse(await readFile(p, "utf8"));
    const entries = raw.entries;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return {
      entries,
      stats: {
        ...(raw.stats && typeof raw.stats === "object" ? raw.stats : {}),
        fromSnapshotFile: true,
        snapshotPath: "reports/adaptive-learning-planner/metadata-index-snapshot.json",
      },
      builtAt: raw.generatedAt || raw.builtAt || null,
      rootAbs,
    };
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} raw
 */
function sanitizePracticeResultBody(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return {
    learningSessionId: raw.learningSessionId != null ? String(raw.learningSessionId).slice(0, 80) : null,
    subject: String(raw.subject || "").trim().slice(0, 64),
    grade: raw.grade,
    topic: String(raw.topic || "").trim().slice(0, 200),
    topicBucketKeys: Array.isArray(raw.topicBucketKeys)
      ? raw.topicBucketKeys.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 32)
      : undefined,
    mode: String(raw.mode || "").trim().slice(0, 64),
    totalQuestions: normalizeOptionalInteger(raw.totalQuestions, 0, 1_000_000) ?? 0,
    correctAnswers: normalizeOptionalInteger(raw.correctAnswers, 0, 1_000_000) ?? 0,
    wrongAnswers: normalizeOptionalInteger(raw.wrongAnswers, 0, 1_000_000) ?? 0,
    score: normalizeOptionalNumber(raw.score, 0, 1_000_000_000) ?? 0,
    accuracy: normalizeOptionalNumber(raw.accuracy, 0, 100) ?? 0,
    durationSeconds: normalizeOptionalInteger(raw.durationSeconds, 0, 8_640_000) ?? 0,
    engineDecision: raw.engineDecision != null ? String(raw.engineDecision).trim().slice(0, 32) : undefined,
    clientRequestId: normalizeOptionalInteger(raw.clientRequestId, 0, 2_147_000_000),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (guardCookieMutationOrigin(req, res)) return;

  const disabledPayload = {
    ok: false,
    source: "adaptive_planner",
    reason: "feature_disabled",
    diagnostics: {
      subject: "",
      grade: "",
      metadataExactMatch: false,
      metadataSubjectFallback: false,
      safetyViolationCount: 0,
      skillAlignmentSource: null,
    },
  };

  if (!isAdaptivePlannerRecommendationEnabled(process.env)) {
    return res.status(200).json(disabledPayload);
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({
        ok: false,
        source: "adaptive_planner",
        reason: "not_authenticated",
        diagnostics: disabledPayload.diagnostics,
      });
    }

    const body = readJsonBody(req);
    const practiceResult = sanitizePracticeResultBody(body.practiceResult);
    if (!practiceResult) {
      return res.status(400).json({
        ok: false,
        source: "adaptive_planner",
        reason: "invalid_practice_result",
        diagnostics: disabledPayload.diagnostics,
      });
    }

    const learningSessionId = practiceResult.learningSessionId;
    if (learningSessionId) {
      const supabase = getLearningSupabaseServiceRoleClient();
      const { data: row, error } = await supabase
        .from("learning_sessions")
        .select("id,student_id")
        .eq("id", learningSessionId)
        .maybeSingle();
      if (error || !row?.id || row.student_id !== auth.studentId) {
        return res.status(403).json({
          ok: false,
          source: "adaptive_planner",
          reason: "session_mismatch",
          diagnostics: disabledPayload.diagnostics,
        });
      }
    }

    const metadataIndex = await tryLoadMetadataIndexFromSnapshot(process.cwd());
    const out = buildRuntimePlannerRecommendationFromPracticeResult(practiceResult, { metadataIndex });
    const echoId = practiceResult.clientRequestId;

    /** @type {Record<string, unknown>} */
    let response = {
      ...out,
      ...(echoId != null ? { clientRequestId: echoId } : {}),
    };

    if (
      out.ok === true &&
      out.recommendation &&
      typeof out.recommendation === "object" &&
      isAdaptivePlannerAIExplainerServerEnabled(process.env)
    ) {
      const diag = out.diagnostics && typeof out.diagnostics === "object" ? out.diagnostics : {};
      const d = /** @type {Record<string, unknown>} */ (diag);
      if (Number(d.safetyViolationCount ?? 0) === 0 && d.metadataSubjectFallback !== true) {
        const rec = /** @type {Record<string, unknown>} */ (out.recommendation);
        const nextAction = rec.nextAction != null ? String(rec.nextAction).trim() : "";
        const qc = Number(rec.questionCount);
        const approved = approvedHebrewRecommendationLineFromNextAction(nextAction);
        const expl = await buildAdaptivePlannerAIExplanation(
          {
            subject: practiceResult.subject,
            grade: practiceResult.grade != null ? String(practiceResult.grade) : "",
            nextAction,
            targetDifficulty: rec.targetDifficulty != null ? String(rec.targetDifficulty) : "",
            questionCount: Number.isFinite(qc) ? qc : 0,
            approvedHebrewRecommendationLine: approved,
          },
          { env: process.env }
        );
        if (expl.ok && expl.text) {
          response = { ...response, explanation: { ok: true, text: expl.text } };
        } else if (process.env.NODE_ENV !== "production") {
          response = {
            ...response,
            explanation: { ok: false, reason: "reason" in expl ? String(expl.reason) : "unknown" },
          };
        }
      }
    }

    return res.status(200).json(response);
  } catch {
    return res.status(500).json({
      ok: false,
      source: "adaptive_planner",
      reason: "server_error",
      diagnostics: disabledPayload.diagnostics,
    });
  }
}
