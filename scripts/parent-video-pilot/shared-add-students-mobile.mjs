/**
 * Video #3 mobile — «הוספת ילד וקבלת קוד תלמיד»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DISPOSABLE_CHILD_NAME,
  DISPOSABLE_CHILD_GRADE,
  DISPOSABLE_CHILD_GRADE_LABEL,
  DISPOSABLE_USERNAME_PREFIX,
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  resolveBaseUrl,
  assertAllowedBaseUrl,
} from "./shared-add-students-desktop.mjs";

export {
  DISPOSABLE_CHILD_NAME,
  DISPOSABLE_CHILD_GRADE,
  DISPOSABLE_CHILD_GRADE_LABEL,
  DISPOSABLE_USERNAME_PREFIX,
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  resolveBaseUrl,
  assertAllowedBaseUrl,
};

export const PILOT_ID = "add-students-v3-mobile";
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(root, "qa-evidence-audit", "parent-video-pilot", "add-students", "mobile");
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
  { id: "M1", holdMs: 5000, caption: "הוספת ילד וקבלת קוד תלמיד", highlight: "login-form", page: "login" },
  { id: "M2", holdMs: 5000, caption: "כניסה לחשבון הורה", highlight: "login-submit", page: "login", action: "login" },
  { id: "M3", holdMs: 6000, caption: "בלוח הבקרה — הוספת ילד חדש", highlight: "add-child-form", page: "dashboard", action: "scroll-add-form" },
  { id: "M4", holdMs: 6000, caption: "מזינים שם לילד", highlight: "child-name", page: "dashboard", action: "fill-name" },
  { id: "M5", holdMs: 5000, caption: "ובוחרים כיתה", highlight: "child-grade", page: "dashboard", action: "fill-grade" },
  { id: "M6", holdMs: 5000, caption: "לוחצים הוסף ילד", highlight: "add-child-submit", page: "dashboard", action: "submit-add-child" },
  { id: "M7", holdMs: 7000, caption: "הילד החדש מופיע ברשימה", highlight: "new-child-card", page: "dashboard", action: "scroll-new-child" },
  { id: "M8", holdMs: 6000, caption: "מגדירים שם משתמש ו-PIN", highlight: "credentials-section", page: "dashboard", action: "fill-credentials" },
  { id: "M9", holdMs: 5000, caption: "שומרים את פרטי הכניסה", highlight: "save-credentials", page: "dashboard", action: "save-credentials" },
  { id: "M10", holdMs: 8000, caption: "חשוב לשמור את הקוד — הוא לא יוצג שוב", highlight: "credential-confirm", page: "dashboard" },
  { id: "M11", holdMs: 7000, caption: "כך ההורה מוסיף ילד ומקבל קוד כניסה.", highlight: null, page: "dashboard" },
];
