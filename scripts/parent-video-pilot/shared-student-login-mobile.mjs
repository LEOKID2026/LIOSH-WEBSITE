/**
 * Video #4 mobile — «כניסת תלמיד עם קוד ו-PIN»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  DEMO_STUDENT_NAME,
  resolveBaseUrl,
  assertAllowedBaseUrl,
} from "./shared-student-login-desktop.mjs";

export { FPS, PILOT_PORT_DEFAULT, TITLE, DEMO_STUDENT_NAME, resolveBaseUrl, assertAllowedBaseUrl };

export const PILOT_ID = "student-login-v4-mobile";
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(root, "qa-evidence-audit", "parent-video-pilot", "student-login", "mobile");
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
  { id: "M1", holdMs: 6000, caption: "כניסת תלמיד עם קוד ו-PIN", highlight: "login-form", page: "login" },
  { id: "M2", holdMs: 6000, caption: "כאן מתחברים תלמידים", highlight: "username-field", page: "login" },
  { id: "M3", holdMs: 6000, caption: "מזינים שם משתמש", highlight: "username-field", page: "login", action: "fill-username" },
  { id: "M4", holdMs: 6000, caption: "ומזינים PIN", highlight: "pin-field", page: "login", action: "fill-pin" },
  { id: "M5", holdMs: 5000, caption: "לחיצה על כניסה", highlight: "login-submit", page: "login", action: "submit-login" },
  { id: "M6", holdMs: 10000, caption: "לאחר כניסה — עמוד הבית של התלמיד", highlight: "home-greeting", page: "home" },
  { id: "M7", holdMs: 8000, caption: "כך התלמיד נכנס עם הקוד שקיבל מההורה.", highlight: null, page: "home" },
];
