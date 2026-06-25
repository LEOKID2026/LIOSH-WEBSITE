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

    const db = ctx.serviceRole;

    // Verify this student belongs to the authenticated parent
    const { data: owned, error: ownerErr } = await db
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId)
      .maybeSingle();

    if (ownerErr || !owned) {
      return res.status(403).json({ ok: false, error: "לא ניתן למחוק את הילד/ה או שאין הרשאה" });
    }

    // Delete arcade tables that have ON DELETE RESTRICT (must come before student delete).
    // Errors from missing tables (migration not applied) are intentionally ignored.
    await db.from("arcade_results").delete().eq("student_id", studentId);
    await db.from("arcade_room_players").delete().eq("student_id", studentId);
    await db.from("arcade_rooms").delete().eq("host_student_id", studentId);
    await db.from("arcade_quick_match_queue").delete().eq("student_id", studentId);

    // Delete the student row — all other child tables cascade automatically.
    const { error: deleteErr } = await db
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("parent_id", ctx.parentUserId);

    if (deleteErr) {
      const msg = String(deleteErr.message || deleteErr.details || "");
      console.error("[delete-student] student delete failed", { message: msg, code: deleteErr.code, studentId });
      if (/violates foreign key|foreign key/i.test(msg)) {
        return res.status(403).json({ ok: false, error: `נמצאה תלות שמונעת מחיקה: ${msg}` });
      }
      return res.status(500).json({ ok: false, error: "מחיקת הילד/ה נכשלה" });
    }

    return res.status(200).json({ ok: true });
  } catch (_e) {
    console.error("[delete-student] unexpected error", _e);
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
}
