/**
 * Video #6 mobile — «שימוש ב-Copilot לשאלות המשך»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_CHILD_NAME,
  COPILOT_Q1,
  COPILOT_Q2,
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  isCopilotAnswerUseful,
  isCopilotTurnFailure,
} from "./shared-parent-copilot-desktop.mjs";

export {
  DEMO_CHILD_NAME,
  COPILOT_Q1,
  COPILOT_Q2,
  FPS,
  PILOT_PORT_DEFAULT,
  TITLE,
  resolveBaseUrl,
  assertAllowedBaseUrl,
  isCopilotAnswerUseful,
  isCopilotTurnFailure,
};

export const PILOT_ID = "parent-copilot-v6-mobile";
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(root, "qa-evidence-audit", "parent-video-pilot", "parent-copilot", "mobile");
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
  { id: "M1", holdMs: 3000, caption: "שימוש ב-Copilot לשאלות המשך", highlight: "login-form", page: "login" },
  { id: "M2", holdMs: 3000, caption: "כניסה עם חשבון הדמו של QA", highlight: "login-email", page: "login" },
  { id: "M3", holdMs: 4000, caption: "התחברות", highlight: "login-submit", page: "login", action: "login" },
  { id: "M4", holdMs: 5000, caption: "בוחרים את ישראל ישראלי", highlight: "demo-child", page: "dashboard", action: "scroll-demo-child" },
  { id: "M5", holdMs: 3000, caption: "פותחים את הדוח המקיף", highlight: "report-link", page: "dashboard", action: "open-detailed" },
  { id: "M6", holdMs: 6000, caption: "דוח מקיף — שאלות המשך מבוססות על הנתונים", highlight: "detailed-header", page: "detailed-report" },
  { id: "M7", holdMs: 5000, caption: "שואלים את העוזר", highlight: "copilot-panel", page: "detailed-report", action: "scroll-copilot" },
  { id: "M8", holdMs: 5000, caption: "שאלה ראשונה:", highlight: "copilot-input", page: "detailed-report", action: "ask-q1" },
  { id: "M9", holdMs: 11000, caption: "תשובה מבוססת נתונים מהדוח", highlight: "copilot-answer", page: "detailed-report", action: "wait-q1-rescroll" },
  { id: "M10", holdMs: 5000, caption: "שאלת המשך:", highlight: "copilot-input", page: "detailed-report", action: "ask-q2" },
  { id: "M11", holdMs: 11000, caption: "המלצה לפי מקצוע ותרגול", highlight: "copilot-answer", page: "detailed-report", action: "wait-q2-rescroll" },
  {
    id: "M12",
    holdMs: 6000,
    caption: "כך אפשר לשאול שאלות המשך ולקבל המלצות ממוקדות.",
    highlight: null,
    page: "detailed-report",
  },
];
