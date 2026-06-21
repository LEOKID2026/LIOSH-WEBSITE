import { getLearningSupabaseServiceRoleClient } from "../../../../../lib/learning-supabase/server";
import { requireParentApiContext } from "../../../../../lib/auth/persona-guard.server.js";
import { safeString } from "../../../../../lib/parent-server/report-data-aggregate.server.js";
import {
  getStudentGamePermissions,
  upsertStudentGamePermissions,
} from "../../../../../lib/games/server/game-access.server.js";

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || "";
  const studentId = safeString(req.query?.studentId, 64);
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }

  try {
    const ctx = await requireParentApiContext(res, authHeader);
    if (ctx.stopped) return undefined;

    const { data: student, error: studentErr } = await ctx.bearerSupabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();

    if (studentErr || !student?.id) {
      return res.status(404).json({ ok: false, error: "Student not found for this parent" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();

    if (req.method === "GET") {
      const permissions = await getStudentGamePermissions(supabase, studentId);
      return res.status(200).json({ ok: true, permissions });
    }

    if (req.method === "PATCH") {
      const { onlineEnabled, offlineEnabled, soloEnabled } = req.body || {};
      const patch = {};
      if (typeof onlineEnabled === "boolean") patch.onlineEnabled = onlineEnabled;
      if (typeof offlineEnabled === "boolean") patch.offlineEnabled = offlineEnabled;
      if (typeof soloEnabled === "boolean") patch.soloEnabled = soloEnabled;

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ ok: false, error: "No valid fields to update" });
      }

      const permissions = await upsertStudentGamePermissions({
        supabase,
        studentId,
        parentId: ctx.parentUserId,
        patch,
      });
      return res.status(200).json({ ok: true, permissions });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[parent/game-permissions]", err);
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
