/**
 * Ephemeral isolated parent for add-students video capture.
 * Uses E2E_VIDEO_ISOLATED_PARENT_* when set; otherwise admin createUser + cleanup.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ISOLATED_EMAIL_PREFIX = "parent-video-isolated-";

export function requireServiceRoleAdmin() {
  const url = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "").trim();
  const key = String(process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error("LEARNING_SUPABASE_SERVICE_ROLE_KEY required for isolated parent capture");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function resolveIsolatedParentFromEnv() {
  const email = String(process.env.E2E_VIDEO_ISOLATED_PARENT_EMAIL || "").trim();
  const password = String(process.env.E2E_VIDEO_ISOLATED_PARENT_PASSWORD || "");
  if (email && password) {
    return {
      email,
      password,
      ephemeral: false,
      userId: null,
      admin: null,
      createdStudentIds: [],
    };
  }
  return null;
}

export async function createEphemeralIsolatedParent() {
  const admin = requireServiceRoleAdmin();
  const runId = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  const email = `${ISOLATED_EMAIL_PREFIX}${runId}@example.com`;
  const password = crypto.randomBytes(18).toString("base64url");
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: "parent-video-pilot-isolated" },
  });
  if (created.error || !created.data.user?.id) {
    throw new Error(`isolated createUser failed: ${created.error?.message || "unknown"}`);
  }
  return {
    email,
    password,
    userId: created.data.user.id,
    ephemeral: true,
    admin,
    createdStudentIds: [],
  };
}

/** @returns {Promise<{email:string,password:string,ephemeral:boolean,userId:string|null,admin:any,createdStudentIds:string[]}>} */
export async function resolveIsolatedCaptureParent() {
  const fromEnv = resolveIsolatedParentFromEnv();
  if (fromEnv) return fromEnv;
  return createEphemeralIsolatedParent();
}

export async function cleanupIsolatedCaptureParent(ctx) {
  if (!ctx?.ephemeral || !ctx.userId) return;
  const admin = ctx.admin || requireServiceRoleAdmin();
  for (const studentId of ctx.createdStudentIds || []) {
    await admin.from("students").delete().eq("id", studentId);
  }
  await admin.auth.admin.deleteUser(ctx.userId);
}
