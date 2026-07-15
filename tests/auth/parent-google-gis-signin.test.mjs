/**
 * Focused static checks for parent Google GIS (id-token) sign-in.
 * No full build. No network. No screenshots.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const loginSrc = read("pages/parent/login.js");
const buttonSrc = read("components/auth/ParentGoogleSignInButton.jsx");
const oauthSrc = read("lib/auth/parent-google-oauth.client.js");
const callbackSrc = read("pages/parent/auth/google-callback.js");
const envExample = read(".env.example");
const nextConfig = read("next.config.js");

// 1) New login path must not call signInWithOAuth / startParentGoogleSignIn
assert.equal(loginSrc.includes("startParentGoogleSignIn"), false);
assert.equal(loginSrc.includes("signInWithOAuth"), false);
assert.equal(loginSrc.includes("signInParentWithGoogleIdToken"), true);
assert.equal(loginSrc.includes("completeParentGoogleSession"), true);

// 2) Credential must go to signInWithIdToken
assert.equal(oauthSrc.includes("signInWithIdToken"), true);
assert.match(oauthSrc, /provider:\s*["']google["']/);
assert.equal(oauthSrc.includes("completeParentGoogleSession"), true);
assert.equal(oauthSrc.includes('postParentSessionReady(accessToken, "google")'), true);
assert.equal(
  oauthSrc.includes('"/parent/dashboard"') ||
    oauthSrc.includes('"/parent/home"') ||
    oauthSrc.includes("PARENT_GOOGLE_HOME_PATH"),
  true
);

// 3) Official GIS script + click-only (no One Tap / auto / prompt)
assert.equal(buttonSrc.includes("accounts.google.com/gsi/client") || oauthSrc.includes("accounts.google.com/gsi/client"), true);
assert.equal(buttonSrc.includes("renderButton"), true);
assert.equal(buttonSrc.includes('theme: "filled_blue"'), true);
assert.equal(buttonSrc.includes('shape: "pill"'), true);
assert.equal(buttonSrc.includes('text: "continue_with"'), true);
assert.equal(buttonSrc.includes('locale: "he"'), true);
assert.equal(buttonSrc.includes("auto_select: false"), true);
assert.equal(/\bgoogle\.accounts\.id\.prompt\s*\(/.test(buttonSrc), false);
assert.equal(/\bgoogle\.accounts\.id\.prompt\s*\(/.test(oauthSrc), false);
assert.equal(buttonSrc.includes("use_fedcm_for_prompt: false"), true);

// 4) Email/password path unchanged on login page
assert.equal(loginSrc.includes("signInWithPassword"), true);
assert.equal(loginSrc.includes("signUp"), true);

// 5) Legacy callback retained and shares completion helper
assert.equal(callbackSrc.includes("establishParentGoogleOAuthSession"), true);
assert.equal(callbackSrc.includes("completeParentGoogleSession"), true);
assert.equal(oauthSrc.includes("startParentGoogleSignIn"), true);

// 6) Env var name is the documented existing/public name
assert.equal(oauthSrc.includes("NEXT_PUBLIC_GOOGLE_CLIENT_ID"), true);
assert.equal(envExample.includes("NEXT_PUBLIC_GOOGLE_CLIENT_ID="), true);

// 7) No sensitive logging of token / session / nonce
for (const src of [loginSrc, buttonSrc, oauthSrc, callbackSrc]) {
  assert.equal(/\bconsole\.(log|debug|info|warn|error)\s*\([^)]*(credential|nonce|access_token|session)/i.test(src), false);
}

// 8) CSP allows GIS
assert.equal(nextConfig.includes("https://accounts.google.com"), true);

console.log("parent-google-gis-signin: all focused checks passed");
