import crypto from "node:crypto";
import { guardDevOnlyApiRoute } from "../../../lib/security/api-guards.js";
import { timingSafeCompareStrings } from "../../../lib/security/timing-safe-equal.js";
import { getAuthenticatedStudentSession } from "../../../lib/learning-supabase/student-auth";
import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { applyArcadeCoinMove } from "../../../lib/arcade/server/arcade-coins";

/** Temporary development unlock — TODO: remove before production launch */
const DEV_TOPUP_SECRET_CODE = "7479";

const TOPUP_AMOUNT = 1000;

export default async function handler(req, res) {
  if (guardDevOnlyApiRoute(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const session = await getAuthenticatedStudentSession(req);
  if (!session?.studentId) {
    return res.status(401).json({
      ok: false,
      error: "נדרשת התחברות תלמיד",
      code: "unauthorized",
    });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const code = String(body.code ?? "").trim();

  if (!timingSafeCompareStrings(code, DEV_TOPUP_SECRET_CODE)) {
    return res.status(403).json({
      ok: false,
      error: "קוד שגוי",
      code: "invalid_code",
    });
  }

  const supabase = getLearningSupabaseServiceRoleClient();
  const idempotencyKey = `dev:coin_topup:${session.studentId}:${crypto.randomUUID()}`;

  const result = await applyArcadeCoinMove(supabase, {
    studentId: session.studentId,
    direction: "earn",
    amount: TOPUP_AMOUNT,
    idempotencyKey,
    sourceType: "dev_coin_topup",
    sourceId: null,
    metadata: { tool: "learning_dev_button", amount: TOPUP_AMOUNT },
    reason: "dev_coin_topup",
  });

  if (!result.ok) {
    return res.status(500).json({
      ok: false,
      error: result.message || "לא ניתן להוסיף מטבעות",
      code: result.code || "coin_failed",
    });
  }

  return res.status(200).json({
    ok: true,
    added: TOPUP_AMOUNT,
    balance_after: result.balanceAfter,
  });
}
