#!/usr/bin/env node
/**
 * Verify admin login flow: signIn + admin teachers API.
 * node --env-file=.env.local scripts/admin-portal/verify-admin-login-flow.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const EMAIL = String(process.env.MAIN_ADMIN_EMAIL || process.env.ADMIN_TEST_EMAIL || "leokid2026@gmail.com").trim().toLowerCase();
const PASSWORD = String(process.env.ADMIN_TEST_PASSWORD || "").trim();

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    setHeader() {},
  };
}

async function runHandler(rel, req) {
  const mod = await import(u(rel));
  const res = mockRes();
  await mod.default(req, res);
  return res;
}

async function main() {
  if (!PASSWORD) {
    throw new Error("Set ADMIN_TEST_PASSWORD in env to run login verification (not stored in repo).");
  }
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error || !data.session?.access_token) {
    throw error || new Error("signIn failed");
  }

  const role = data.user?.app_metadata?.role;
  if (String(role).toLowerCase() !== "admin") {
    throw new Error(`expected app_metadata.role=admin, got ${JSON.stringify(role)}`);
  }
  console.log("PASS signIn — role=admin");

  const teacherMe = await runHandler("pages/api/teacher/me.js", {
    method: "GET",
    headers: { authorization: `Bearer ${data.session.access_token}` },
  });
  if (teacherMe.statusCode !== 403) {
    throw new Error(`expected teacher/me 403 for admin, got ${teacherMe.statusCode}`);
  }
  console.log("PASS teacher/me blocked for admin (403)");

  const adminList = await runHandler("pages/api/admin/teachers/index.js", {
    method: "GET",
    headers: { authorization: `Bearer ${data.session.access_token}` },
  });
  if (adminList.statusCode !== 200) {
    throw new Error(`admin/teachers expected 200, got ${adminList.statusCode}`);
  }
  const count = adminList.body?.data?.teachers?.length ?? 0;
  console.log(`PASS admin/teachers list — status=200 teachers=${count}`);

  await anon.auth.signOut();
  const { data: afterSignOut } = await anon.auth.getSession();
  if (afterSignOut?.session?.access_token) {
    throw new Error("session still present after signOut");
  }
  console.log("PASS signOut clears session");

  console.log("\nBrowser: /teacher/login → /admin/teachers → יציאה → /teacher/login");
}

main().catch((e) => {
  console.error("verify-admin-login-flow: FAIL", e.message || e);
  process.exit(1);
});
