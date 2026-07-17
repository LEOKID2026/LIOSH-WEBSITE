import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import {
  assertPatchSizeOk,
  computeStudentLearningDerived,
  deepMergeLearningState,
  ensureStudentLearningStateRow,
  extractLearningProfilePatch,
  LEARNING_PROFILE_SUBJECT_KEYS,
  normalizeLearningProfileRow,
  sanitizeProfileForStorage,
} from "../../../lib/learning-supabase/student-learning-profile.server";
import { ensureDailyMissionsInDb } from "../../../lib/learning-supabase/mission-progress.server";
import { evaluateMonthlyPersistenceReward, buildMonthlyPersistenceStatusPayload } from "../../../lib/learning-supabase/monthly-persistence-reward.server";
import { buildStudentEconomyConfigPayload } from "../../../lib/rewards/server/economy-config.server.js";
import { guardCookieMutationOrigin } from "../../../lib/security/api-guards.js";

function buildSubjectsResponse(normalized) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of LEARNING_PROFILE_SUBJECT_KEYS) {
    const v = normalized.subjects[key];
    out[key] = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  }
  return out;
}

async function loadEconomyConfigForProfile(supabase) {
  let economyConfig = null;
  let economyConfigLoadError = false;
  try {
    economyConfig = await buildStudentEconomyConfigPayload(supabase);
  } catch {
    economyConfigLoadError = true;
  }
  return { economyConfig, economyConfigLoadError };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie");

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const studentId = auth.studentId;

    const supabase = getLearningSupabaseServiceRoleClient();

    if (req.method === "GET") {
      const row = await ensureStudentLearningStateRow(supabase, studentId);
      const normalized = normalizeLearningProfileRow(row);
      const derived = await computeStudentLearningDerived(supabase, studentId);

      let currentChallenges = normalized.challenges;
      try {
        const gradeLevel = String(auth.student?.grade_level || "");
        const freshChallenges = await ensureDailyMissionsInDb(supabase, studentId, gradeLevel);
        if (freshChallenges != null) currentChallenges = freshChallenges;
      } catch {
        /* non-fatal */
      }

      let monthlyPersistenceStatus = null;
      let monthlyPersistenceLoadError = false;
      try {
        const evalResult = await evaluateMonthlyPersistenceReward(supabase, { studentId });
        if (evalResult.ok) {
          monthlyPersistenceStatus = buildMonthlyPersistenceStatusPayload(evalResult);
        } else {
          monthlyPersistenceLoadError = true;
        }
      } catch {
        monthlyPersistenceLoadError = true;
      }

      const { economyConfig, economyConfigLoadError } = await loadEconomyConfigForProfile(supabase);

      return res.status(200).json({
        ok: true,
        studentId,
        row: {
          subjects: buildSubjectsResponse(normalized),
          monthly: normalized.monthly,
          challenges: currentChallenges,
          streaks: normalized.streaks,
          achievements: normalized.achievements,
          profile: normalized.profile,
          updated_at: row.updated_at,
        },
        derived,
        monthlyPersistenceStatus,
        monthlyPersistenceLoadError,
        economyConfig,
        economyConfigLoadError,
      });
    }

    if (req.method === "PATCH" || req.method === "POST") {
      if (guardCookieMutationOrigin(req, res)) return;

      const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      assertPatchSizeOk(raw);
      const body = typeof req.body === "object" && req.body != null ? req.body : {};
      if (body.studentId != null || body.student_id != null) {
        delete body.studentId;
        delete body.student_id;
      }

      const row = await ensureStudentLearningStateRow(supabase, studentId);
      const current = normalizeLearningProfileRow(row);
      const patch = extractLearningProfilePatch(body);

      const sanitizedProfile = sanitizeProfileForStorage(patch.profile ?? {});
      let mergedProfile = deepMergeLearningState(current.profile, sanitizedProfile);
      const rawProfilePatch = patch.profile;
      if (
        rawProfilePatch &&
        typeof rawProfilePatch === "object" &&
        !Array.isArray(rawProfilePatch) &&
        Object.prototype.hasOwnProperty.call(rawProfilePatch, "avatarCustomDataUrl") &&
        rawProfilePatch.avatarCustomDataUrl === null
      ) {
        mergedProfile = { ...mergedProfile };
        delete mergedProfile.avatarCustomDataUrl;
      }

      const next = {
        subjects: deepMergeLearningState(current.subjects, patch.subjects ?? {}),
        monthly: deepMergeLearningState(current.monthly, patch.monthly ?? {}),
        challenges: deepMergeLearningState(current.challenges, patch.challenges ?? {}),
        streaks: deepMergeLearningState(current.streaks, patch.streaks ?? {}),
        achievements: deepMergeLearningState(current.achievements, patch.achievements ?? {}),
        profile: mergedProfile,
      };

      const { error: upErr } = await supabase
        .from("student_learning_state")
        .update({
          subjects: next.subjects,
          monthly: next.monthly,
          challenges: next.challenges,
          streaks: next.streaks,
          achievements: next.achievements,
          profile: next.profile,
        })
        .eq("student_id", studentId);
      if (upErr) {
        return res.status(500).json({ ok: false, error: "Failed to update learning profile" });
      }

      const fresh = await ensureStudentLearningStateRow(supabase, studentId);
      const normalized = normalizeLearningProfileRow(fresh);
      const derived = await computeStudentLearningDerived(supabase, studentId);
      let monthlyPersistenceStatus = null;
      let monthlyPersistenceLoadError = false;
      try {
        const evalResult = await evaluateMonthlyPersistenceReward(supabase, { studentId });
        if (evalResult.ok) {
          monthlyPersistenceStatus = buildMonthlyPersistenceStatusPayload(evalResult);
        } else {
          monthlyPersistenceLoadError = true;
        }
      } catch {
        monthlyPersistenceLoadError = true;
      }
      const { economyConfig, economyConfigLoadError } = await loadEconomyConfigForProfile(supabase);
      return res.status(200).json({
        ok: true,
        studentId,
        row: {
          subjects: buildSubjectsResponse(normalized),
          monthly: normalized.monthly,
          challenges: normalized.challenges,
          streaks: normalized.streaks,
          achievements: normalized.achievements,
          profile: normalized.profile,
          updated_at: fresh.updated_at,
        },
        derived,
        monthlyPersistenceStatus,
        monthlyPersistenceLoadError,
        economyConfig,
        economyConfigLoadError,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "PAYLOAD_TOO_LARGE") {
      return res.status(413).json({ ok: false, error: "Payload too large" });
    }
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
