/**
 * Video #2 desktop — «רישום הורה וכניסה ראשונה»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const VIEWPORT = { width: 1366, height: 900 };
export const FPS = 8;
export const PILOT_PORT_DEFAULT = 3001;
export const TITLE = "רישום הורה וכניסה ראשונה";
export const PILOT_ID = "create-parent-account-v2-desktop";
export const SIGNUP_EMAIL_PREFIX = "pv2-";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(
  root,
  "qa-evidence-audit",
  "parent-video-pilot",
  "create-parent-account",
  "desktop"
);
export const outWebm = join(outDir, "main.webm");
export const framesDir = join(outDir, "_frames");
export const metaPath = join(outDir, "capture-meta.json");
export const preflightPath = join(outDir, "preflight-report.json");

export const OVERLAY_CSS = `
#parent-pilot-capture-root {
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483640;
  font-family: "Segoe UI", system-ui, Arial, sans-serif;
}
#parent-pilot-dim { position: fixed; inset: 0; background: rgba(0,0,0,0); transition: background 0.35s ease; pointer-events: none; }
#parent-pilot-dim.active { background: rgba(0,0,0,0.28); }
#parent-pilot-caption {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  max-width: min(720px, 88vw); padding: 10px 20px; border-radius: 10px;
  background: rgba(12, 14, 22, 0.88); color: #f8fafc;
  font-size: 17px; font-weight: 600; line-height: 1.4; text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35); direction: rtl;
}
#parent-pilot-highlight {
  position: fixed; border: 2px solid rgba(255, 255, 255, 0.92); border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.4), 0 0 14px rgba(251, 191, 36, 0.18);
  background: transparent; opacity: 0;
  transition: opacity 0.25s ease, left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
}
#parent-pilot-highlight.visible { opacity: 1; }
`;

export function resolveBaseUrl(argv) {
  const arg = argv.find((a) => a.startsWith("--base-url="));
  if (arg) return arg.slice("--base-url=".length).replace(/\/$/, "");
  return `http://127.0.0.1:${PILOT_PORT_DEFAULT}`;
}

export function assertAllowedBaseUrl(baseUrl) {
  const u = new URL(baseUrl);
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")) {
    throw new Error(`Refusing capture base URL: ${baseUrl}`);
  }
}

export const SCENES = [
  { id: 1, holdMs: 4000, caption: "רישום הורה וכניסה ראשונה", highlight: "login-form", page: "login" },
  { id: 2, holdMs: 3000, caption: "בוחרים בלשונית הרשמה", highlight: "signup-tab", page: "login", action: "switch-signup" },
  { id: 3, holdMs: 5000, caption: "קוראים ומאשרים את תנאי השימוש", highlight: "policy-panel", page: "policy", action: "accept-policy" },
  { id: 4, holdMs: 4000, caption: "מזינים אימייל להרשמה", highlight: "signup-email", page: "signup-form" },
  { id: 5, holdMs: 4000, caption: "מזינים סיסמה", highlight: "signup-password", page: "signup-form", action: "fill-signup" },
  { id: 6, holdMs: 3000, caption: "יוצרים חשבון הורה", highlight: "signup-submit", page: "signup-form", action: "submit-signup" },
  { id: 7, holdMs: 6000, caption: "כניסה ראשונה לדשבורד ההורים", highlight: "dashboard-header", page: "dashboard" },
  { id: 8, holdMs: 5000, caption: "כך נרשמים כהורים ומתחילים לנהל את הילדים.", highlight: null, page: "dashboard" },
];
