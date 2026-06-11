/**
 * E2E-only (Playwright): authenticate as a student so StudentAccessGate allows /learning/*.
 * Not imported by app code.
 *
 * Requires a real row in `student_access_codes` + matching student (same as manual login).
 *
 * Env (shell or optional lines in `.env.local` — see tryLoadE2EStudentEnvFromDotenv):
 *   E2E_STUDENT_PIN          — 4 digits (required)
 *   E2E_STUDENT_USERNAME     — student username (optional if code set)
 *   E2E_STUDENT_CODE         — access code (optional if username set)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const COOKIE = "liosh_student_session";
const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load E2E_STUDENT_* from repo `.env.local` / `.env` if not already set (dev convenience only). */
export function tryLoadE2EStudentEnvFromDotenv() {
  const root = join(__dirname, "..", "..");
  for (const name of [".env.e2e.local", ".env.local", ".env"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    try {
      const text = readFileSync(p, "utf8");
      for (const line of text.split("\n")) {
        const s = line.trim();
        if (!s || s.startsWith("#")) continue;
        const eq = s.indexOf("=");
        if (eq === -1) continue;
        const key = s.slice(0, eq).trim();
        if (!key.startsWith("E2E_STUDENT_")) continue;
        if (process.env[key]) continue;
        let val = s.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    } catch {
      /* ignore */
    }
  }
}

export function parseBaseOrigin(baseUrl) {
  const raw = String(baseUrl || "").trim() || "http://localhost:3110";
  const withProto = raw.includes("://") ? raw : `http://${raw}`;
  return new URL(withProto).origin;
}

/**
 * POST /api/student/login and attach `liosh_student_session` to the browser context.
 * @param {import("playwright").BrowserContext} browserContext
 */
export async function applyStudentSessionFromLogin(browserContext, baseUrl) {
  tryLoadE2EStudentEnvFromDotenv();

  const pin = String(process.env.E2E_STUDENT_PIN || "")
    .replace(/\D/g, "")
    .trim();
  const username = String(process.env.E2E_STUDENT_USERNAME || "").trim();
  const code = String(process.env.E2E_STUDENT_CODE || "").trim();

  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    throw new Error(
      "E2E Hebrew: set E2E_STUDENT_PIN to a 4-digit PIN (and username or code). See scripts/e2e-lib/hebrew-e2e-student-auth.mjs"
    );
  }
  if (!username && !code) {
    throw new Error(
      "E2E Hebrew: set E2E_STUDENT_USERNAME or E2E_STUDENT_CODE for POST /api/student/login."
    );
  }

  const origin = parseBaseOrigin(baseUrl);
  const loginUrl = `${origin}/api/student/login`;
  const body = code ? { code, pin } : { username, pin };

  const res = await browserContext.request.post(loginUrl, {
    data: body,
    headers: {
      Origin: origin,
      Referer: `${origin}/student/login`,
    },
  });
  if (!res.ok()) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `E2E student login failed: HTTP ${res.status()} — ${bodyText.slice(0, 280)}`
    );
  }

  const setCookieHdr = res.headers()["set-cookie"];
  const setCookie = Array.isArray(setCookieHdr)
    ? setCookieHdr.join("; ")
    : String(setCookieHdr || "");
  const m = setCookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  const token = m ? decodeURIComponent(m[1].trim()) : "";

  if (!token) {
    throw new Error(
      `E2E: expected Set-Cookie ${COOKIE}=…, got: ${setCookie.slice(0, 160)}`
    );
  }

  // Playwright: use `url` **or** `path`+`domain`, not both — invalid combo throws
  // "Cookie should have either url or path".
  await browserContext.addCookies([
    {
      name: COOKIE,
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
