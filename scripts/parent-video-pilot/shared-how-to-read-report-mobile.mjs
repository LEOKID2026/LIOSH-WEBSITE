/**
 * Video #5 mobile — «קריאת דוח הורים — דוח קצר מול דוח מקיף»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_CHILD_NAME,
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  resolveBaseUrl,
  assertAllowedBaseUrl,
} from "./shared-how-to-read-report-desktop.mjs";

export {
  DEMO_CHILD_NAME,
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  resolveBaseUrl,
  assertAllowedBaseUrl,
};

export const PILOT_ID = "how-to-read-report-v5-mobile";
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(root, "qa-evidence-audit", "parent-video-pilot", "how-to-read-report", "mobile");
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

/** Mobile storyboard — max 3 intentional scrolls; no Copilot */
export const MOBILE_SCENES = [
  { id: "M1", holdMs: 3000, caption: "קריאת דוח הורים — דוח קצר מול דוח מקיף", highlight: "login-form", page: "login" },
  { id: "M2", holdMs: 3000, caption: "כניסה עם חשבון הדמו של QA", highlight: "login-email", page: "login" },
  { id: "M3", holdMs: 4000, caption: "התחברות", highlight: "login-submit", page: "login", action: "login" },
  { id: "M4", holdMs: 5000, caption: "לוח הבקרה — בוחרים את ישראל ישראלי", highlight: "demo-child", page: "dashboard", action: "scroll-demo-child" },
  { id: "M5", holdMs: 3000, caption: "פותחים את דוח ההורים", highlight: "report-link", page: "dashboard", action: "open-short-report" },
  { id: "M6", holdMs: 6000, caption: "דוח קצר — תמונת מצב מהירה לתקופה", highlight: "short-header", page: "short-report" },
  { id: "M7", holdMs: 6000, caption: "ארבעה מספרים במבט אחד: זמן, שאלות, דיוק ומגמה", highlight: "short-kpi-cards", page: "short-report" },
  { id: "M8", holdMs: 6000, caption: "מתאים לבדיקה מהירה: מה בולט עכשיו", highlight: "short-diagnostic", page: "short-report", action: "scroll-short-diagnostic" },
  { id: "M9", holdMs: 4000, caption: "וגם תמצית לפי מקצוע — בקצרה", highlight: "short-subjects", page: "short-report", action: "nudge-subjects" },
  { id: "M10", holdMs: 2000, caption: "כשצריך פירוט — עוברים לדוח מקיף", highlight: "detailed-link", page: "short-report" },
  { id: "M11", holdMs: 3000, caption: "מעבר לדוח מקיף", highlight: "detailed-link", page: "short-report", action: "open-detailed" },
  { id: "M12", holdMs: 5000, caption: "דוח מקיף — אותה תקופה, עם פירוט", highlight: "detailed-header", page: "detailed-report" },
  { id: "M13", holdMs: 8000, caption: "סיכום לתקופה: ההסבר המרכזי להורה", highlight: "detailed-period-summary", page: "detailed-report", action: "scroll-detailed-summary" },
  { id: "M14", holdMs: 8000, caption: "מה עשינו בתקופה: נתונים לפי מקצוע", highlight: "detailed-activity", page: "detailed-report", action: "scroll-detailed-activity" },
  {
    id: "M15",
    holdMs: 6000,
    caption: "הדוח הקצר = מבט מהיר; המקיף = פירוט, מקצועות והמלצות",
    highlight: null,
    page: "detailed-report",
  },
];
