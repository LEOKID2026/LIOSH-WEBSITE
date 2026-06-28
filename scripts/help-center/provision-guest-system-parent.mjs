#!/usr/bin/env node
/**
 * One-time local/dev setup: System Guest Parent for guest child mode.
 * Run: node --env-file=.env.local scripts/help-center/provision-guest-system-parent.mjs
 */
import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = join(__dirname, "..", "..", name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      if (process.env[k]) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.GUEST_SYSTEM_PARENT_EMAIL || "guest-system@liosh.invalid").trim().toLowerCase();

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_LEARNING_SUPABASE_URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === targetEmail);
    if (match?.id) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

let user = await findUserByEmail(email);
if (!user?.id) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { source: "guest-system-parent-provision" },
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log("Created auth user:", user.id);
} else {
  console.log("Auth user exists:", user.id);
}

const { error: ppErr } = await admin
  .from("parent_profiles")
  .upsert({ id: user.id, display_name: "Guest System" }, { onConflict: "id" });
if (ppErr) {
  console.error("parent_profiles upsert failed:", ppErr.message);
  process.exit(1);
}

console.log("OK: guest system parent ready");
console.log(`  email=${email}`);
console.log(`  parentId=${user.id}`);
