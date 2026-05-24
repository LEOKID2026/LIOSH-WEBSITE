/**
 * Disposable signup parent for create-parent-account video (NOT shared QA parent).
 */
import crypto from "node:crypto";
import { requireServiceRoleAdmin } from "./isolated-capture-parent.mjs";

const SIGNUP_EMAIL_PREFIX = "pv2-";

export function buildSignupCaptureEmail(runId) {
  return `${SIGNUP_EMAIL_PREFIX}${runId}@example.com`;
}

export function buildSignupCapturePassword() {
  return crypto.randomBytes(18).toString("base64url");
}

export function buildSignupRunId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

export async function createSignupCaptureParent(runId = buildSignupRunId()) {
  const admin = requireServiceRoleAdmin();
  const email = buildSignupCaptureEmail(runId);
  const password = buildSignupCapturePassword();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: "parent-video-pilot-signup-preflight" },
  });
  if (created.error || !created.data.user?.id) {
    throw new Error(`signup preflight createUser failed: ${created.error?.message || "unknown"}`);
  }
  return { email, password, userId: created.data.user.id, runId, admin };
}

export async function deleteSignupCaptureParent(ctx) {
  if (!ctx?.userId) return;
  const admin = ctx.admin || requireServiceRoleAdmin();
  await admin.auth.admin.deleteUser(ctx.userId);
}
