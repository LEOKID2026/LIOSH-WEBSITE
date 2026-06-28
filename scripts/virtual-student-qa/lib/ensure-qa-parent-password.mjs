/**
 * Sync admin@admin.com password to E2E_PARENT_PASSWORD before nightly preflight.
 * QA-only — prevents drift when Supabase auth password was rotated elsewhere.
 */
export async function ensureQaParentPasswordSynced({ log } = {}) {
  const url = String(process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL || "").trim();
  const serviceKey = String(
    process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY || ""
  ).trim();
  const email = String(process.env.E2E_PARENT_EMAIL || "").trim();
  const password = String(process.env.E2E_PARENT_PASSWORD || "");
  const qaParentId = "05c73a19-bf1f-4f1a-b034-7cd2ece4feec";

  if (!url || !serviceKey || !email || !password) {
    log?.("qa-parent-sync: skipped (missing supabase env or E2E_PARENT_*)");
    return { synced: false, reason: "missing-env" };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(url, process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: updErr } = await admin.auth.admin.updateUserById(qaParentId, {
    password,
  });
  if (updErr) {
    throw new Error(`qa-parent-sync: updateUserById failed — ${updErr.message}`);
  }

  const { error: signErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) {
    throw new Error(`qa-parent-sync: verify sign-in failed — ${signErr.message}`);
  }

  log?.("qa-parent-sync: admin@admin.com password synced to E2E_PARENT_PASSWORD");
  return { synced: true };
}
