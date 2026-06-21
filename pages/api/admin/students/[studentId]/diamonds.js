import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../../lib/admin-server/admin-request.server.js";
import {
  getStudentDiamondBalance,
  listDiamondTransactions,
} from "../../../../../lib/rewards/server/diamond-ledger.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
  }

  const studentId = String(req.query?.studentId || "").trim();
  if (!studentId) {
    return sendAdminApiError(res, 400, "bad_request", "studentId required");
  }

  try {
    const { data: student, error: studentErr } = await ctx.serviceRole
      .from("students")
      .select("id,full_name,grade_level,is_active")
      .eq("id", studentId)
      .maybeSingle();

    if (studentErr || !student?.id) {
      return sendAdminApiError(res, 404, "student_not_found", "student_not_found");
    }

    const [balance, transactions] = await Promise.all([
      getStudentDiamondBalance(ctx.serviceRole, studentId),
      listDiamondTransactions(ctx.serviceRole, { studentId, limit: 50 }),
    ]);

    return res.status(200).json({
      ok: true,
      student: {
        id: student.id,
        fullName: student.full_name || "",
        gradeLevel: student.grade_level || null,
        isActive: student.is_active === true,
      },
      balance,
      transactions,
    });
  } catch {
    return sendAdminApiError(res, 500, "db_error", "db_error");
  }
}
