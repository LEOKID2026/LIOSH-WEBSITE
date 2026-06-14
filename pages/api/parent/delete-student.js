import { requireParentApiContext } from "../../../lib/auth/persona-guard.server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const studentId = String(req.body?.studentId || "").trim();
  if (!studentId) {
    return res.status(400).json({ ok: false, error: "studentId is required" });
  }

  try {
    const ctx = await requireParentApiContext(res, req.headers.authorization || "");
    if (ctx.stopped) return undefined;

    const { error: rpcErr } = await ctx.bearerSupabase.rpc("delete_parent_owned_student", {
      p_student_id: studentId,
    });

    if (rpcErr) {
      const msg = String(rpcErr.message || rpcErr.details || "");
      if (
        msg.includes("DELETE_STUDENT_NOT_OWNED") ||
        msg.includes("DELETE_STUDENT_MISSING_ID") ||
        /violates foreign key|foreign key/i.test(msg)
      ) {
        return res.status(403).json({ ok: false, error: "לא ניתן למחוק את הילד/ה או שאין הרשאה" });
      }
      return res.status(500).json({ ok: false, error: "מחיקת הילד/ה נכשלה" });
    }

    return res.status(200).json({ ok: true });
  } catch (_e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
