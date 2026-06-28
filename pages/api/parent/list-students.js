import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { requireParentApiContext } from "../../../lib/auth/persona-guard.server.js";
import { resolveParentMaxChildren } from "../../../lib/parent-server/parent-entitlement-provision.server.js";
import { DEFAULT_PARENT_STUDENT_LIMIT } from "../../../lib/parent-server/parent-student-limit.server";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const { data, error } = await ctx.bearerSupabase
      .from("students")
      .select("id,full_name,grade_level,is_active,created_at,account_kind,student_coin_balances(balance,lifetime_earned,lifetime_spent)")
      .eq("parent_id", ctx.parentUserId)
      .or("account_kind.eq.registered,account_kind.is.null")
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(403).json({ ok: false, error: "Could not list students" });
    }

    const students = data || [];
    const ids = students.map((s) => s.id).filter(Boolean);
    const loginByStudentId = Object.create(null);
    const activeStudentIds = new Set();

    if (ids.length > 0) {
      // Service role + narrow projection only (never code_hash/pin_hash). IDs are limited to
      // students already verified as owned by this parent via the query above.
      const serviceClient = getLearningSupabaseServiceRoleClient();
      const { data: activeCodes, error: codesErr } = await serviceClient
        .from("student_access_codes")
        .select("student_id,login_username,is_active,revoked_at,created_at")
        .in("student_id", ids)
        .eq("is_active", true)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      if (codesErr) {
        return res.status(403).json({ ok: false, error: "Could not load student credentials" });
      }

      for (const row of activeCodes || []) {
        const sid = row.student_id;
        if (!sid) continue;
        activeStudentIds.add(sid);
      }

      // Newest-first order: first non-empty login_username wins (duplicate-active edge case).
      for (const row of activeCodes || []) {
        const sid = row.student_id;
        if (!sid) continue;
        const u =
          typeof row.login_username === "string" && row.login_username.trim()
            ? row.login_username.trim()
            : null;
        if (!u) continue;
        if (loginByStudentId[sid] === undefined) {
          loginByStudentId[sid] = u;
        }
      }
      for (const sid of activeStudentIds) {
        if (loginByStudentId[sid] === undefined) {
          loginByStudentId[sid] = null;
        }
      }
    }

    const enriched = students.map((s) => {
      const login_username = loginByStudentId[s.id] ?? null;
      return {
        ...s,
        login_username,
        has_active_access_code: activeStudentIds.has(s.id),
      };
    });

    // Expose the resolved per-parent student-creation cap so the dashboard
    // can render and gate the Add form against the same number the API
    // will accept. The QA allowlist itself is never sent — only the
    // integer the server has already decided to permit for this caller.
    const limitResult = await resolveParentMaxChildren(
      ctx.serviceRole,
      ctx.parentUserId,
      ctx.user?.email
    );
    const studentLimit = limitResult.ok ? limitResult.maxChildren : DEFAULT_PARENT_STUDENT_LIMIT;

    return res.status(200).json({
      ok: true,
      students: enriched,
      studentLimit,
      defaultStudentLimit: DEFAULT_PARENT_STUDENT_LIMIT,
    });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
