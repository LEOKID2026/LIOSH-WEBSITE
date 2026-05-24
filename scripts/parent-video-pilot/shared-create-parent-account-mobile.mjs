/**
 * Video #2 mobile — «רישום הורה וכניסה ראשונה»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  SIGNUP_EMAIL_PREFIX,
  resolveBaseUrl,
  assertAllowedBaseUrl,
} from "./shared-create-parent-account-desktop.mjs";

export { FPS, PILOT_PORT_DEFAULT, TITLE, SIGNUP_EMAIL_PREFIX, resolveBaseUrl, assertAllowedBaseUrl };

export const PILOT_ID = "create-parent-account-v2-mobile";
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(
  root,
  "qa-evidence-audit",
  "parent-video-pilot",
  "create-parent-account",
  "mobile"
);
export const outWebm = join(outDir, "main.webm");
export const framesDir = join(outDir, "_frames");
export const metaPath = join(outDir, "capture-meta.json");
export const preflightPath = join(outDir, "preflight-report.json");

export const MOBILE_OVERLAY_CSS = `
#parent-pilot-capture-root {
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483640;
  font-family: "Segoe UI", system-ui, Arial, sans-serif;
}
#parent-pilot-dim { position: fixed; inset: 0; background: rgba(0,0,0,0); transition: background 0.35s ease; pointer-events: none; }
#parent-pilot-dim.active { background: rgba(0,0,0,0.32); }
#parent-pilot-caption {
  position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
  max-width: min(360px, 92vw); padding: 8px 14px; border-radius: 10px;
  background: rgba(12, 14, 22, 0.9); color: #f8fafc;
  font-size: 15px; font-weight: 600; line-height: 1.35; text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35); direction: rtl;
}
#parent-pilot-highlight {
  position: fixed; border: 2px solid rgba(255, 255, 255, 0.92); border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.4), 0 0 12px rgba(251, 191, 36, 0.16);
  background: transparent; opacity: 0;
  transition: opacity 0.25s ease, left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
}
#parent-pilot-highlight.visible { opacity: 1; }
`;

export const MOBILE_SCENES = [
  { id: "M1", holdMs: 4000, caption: "רישום הורה וכניסה ראשונה", highlight: "login-form", page: "login" },
  { id: "M2", holdMs: 3000, caption: "בוחרים בלשונית הרשמה", highlight: "signup-tab", page: "login", action: "switch-signup" },
  { id: "M3", holdMs: 6000, caption: "קוראים ומאשרים את תנאי השימוש", highlight: "policy-panel", page: "policy", action: "accept-policy" },
  { id: "M4", holdMs: 4000, caption: "מזינים אימייל להרשמה", highlight: "signup-email", page: "signup-form" },
  { id: "M5", holdMs: 4000, caption: "מזינים סיסמה", highlight: "signup-password", page: "signup-form", action: "fill-signup" },
  { id: "M6", holdMs: 3000, caption: "יוצרים חשבון הורה", highlight: "signup-submit", page: "signup-form", action: "submit-signup" },
  { id: "M7", holdMs: 7000, caption: "כניסה ראשונה לדשבורד ההורים", highlight: "dashboard-header", page: "dashboard" },
  { id: "M8", holdMs: 5000, caption: "כך נרשמים כהורים ומתחילים לנהל את הילדים.", highlight: null, page: "dashboard" },
];
