/**
 * Video #3 desktop — «הוספת ילד וקבלת קוד תלמיד»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DISPOSABLE_CHILD_NAME = "ילד לדוגמה וידאו";
export const DISPOSABLE_CHILD_GRADE = "grade_3";
export const DISPOSABLE_CHILD_GRADE_LABEL = "כיתה ג׳";
export const DISPOSABLE_USERNAME_PREFIX = "videochild";
export const VIEWPORT = { width: 1366, height: 900 };
export const FPS = 8;
export const PILOT_PORT_DEFAULT = 3001;
export const TITLE = "הוספת ילד וקבלת קוד תלמיד";
export const PILOT_ID = "add-students-v3-desktop";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(root, "qa-evidence-audit", "parent-video-pilot", "add-students", "desktop");
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
  { id: 1, holdMs: 5000, caption: "הוספת ילד וקבלת קוד תלמיד", highlight: "login-form", page: "login" },
  { id: 2, holdMs: 5000, caption: "כניסה לחשבון הורה", highlight: "login-submit", page: "login", action: "login" },
  { id: 3, holdMs: 6000, caption: "בלוח הבקרה — הוספת ילד חדש", highlight: "add-child-form", page: "dashboard" },
  { id: 4, holdMs: 6000, caption: "מזינים שם לילד", highlight: "child-name", page: "dashboard", action: "fill-name" },
  { id: 5, holdMs: 5000, caption: "ובוחרים כיתה", highlight: "child-grade", page: "dashboard", action: "fill-grade" },
  { id: 6, holdMs: 5000, caption: "לוחצים הוסף ילד", highlight: "add-child-submit", page: "dashboard", action: "submit-add-child" },
  { id: 7, holdMs: 7000, caption: "הילד החדש מופיע ברשימה", highlight: "new-child-card", page: "dashboard", action: "scroll-new-child" },
  { id: 8, holdMs: 6000, caption: "מגדירים שם משתמש ו-PIN לכניסת תלמיד", highlight: "credentials-section", page: "dashboard", action: "fill-credentials" },
  { id: 9, holdMs: 5000, caption: "שומרים את פרטי הכניסה", highlight: "save-credentials", page: "dashboard", action: "save-credentials" },
  { id: 10, holdMs: 8000, caption: "חשוב לשמור את הקוד — הוא לא יוצג שוב", highlight: "credential-confirm", page: "dashboard" },
  { id: 11, holdMs: 7000, caption: "כך ההורה מוסיף ילד ומקבל קוד כניסה.", highlight: null, page: "dashboard" },
];
