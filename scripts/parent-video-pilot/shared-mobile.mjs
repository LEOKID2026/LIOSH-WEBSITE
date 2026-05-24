/**
 * Mobile pilot — Video #1 «מדריך להורה — כניסה לדוח ושימוש ב-AI»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_CHILD_NAME, DEMO_QUESTION, FPS, PILOT_PORT_DEFAULT } from "./shared.mjs";

export { DEMO_CHILD_NAME, DEMO_QUESTION, FPS, PILOT_PORT_DEFAULT };
export { resolveBaseUrl, assertAllowedBaseUrl } from "./shared.mjs";

export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(
  root,
  "qa-evidence-audit",
  "parent-video-pilot",
  "parent-report-ai",
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
#parent-pilot-dim {
  position: fixed; inset: 0; background: rgba(0,0,0,0);
  transition: background 0.35s ease;
  pointer-events: none;
}
#parent-pilot-dim.active { background: rgba(0,0,0,0.32); }
#parent-pilot-caption {
  position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
  max-width: min(360px, 92vw); padding: 8px 14px; border-radius: 10px;
  background: rgba(12, 14, 22, 0.9); color: #f8fafc;
  font-size: 15px; font-weight: 600; line-height: 1.35; text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35); direction: rtl;
}
#parent-pilot-highlight {
  position: fixed; border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.4), 0 0 12px rgba(251, 191, 36, 0.16);
  background: transparent;
  opacity: 0;
  transition: opacity 0.25s ease, left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
}
#parent-pilot-highlight.visible { opacity: 1; }
`;

/** Approved mobile storyboard M1–M15 (~71s + buffer) */
export const MOBILE_SCENES = [
  { id: "M1", holdMs: 4000, caption: "כניסה לאזור ההורים", highlight: "login-form", page: "login" },
  { id: "M2", holdMs: 3000, caption: "כאן מתחברים הורים לחשבון", highlight: "login-email", page: "login" },
  { id: "M3", holdMs: 5000, caption: "התחברות עם חשבון הדמו של QA", highlight: "login-submit", page: "login", action: "login" },
  { id: "M4", holdMs: 4000, caption: "לוח הבקרה — כל הילדים במקום אחד", highlight: "children-section", page: "dashboard", action: "scroll-children-intro" },
  { id: "M5", holdMs: 5000, caption: "בוחרים את ישראל ישראלי", highlight: "demo-child", page: "dashboard", action: "scroll-demo-child" },
  { id: "M6", holdMs: 3000, caption: "פותחים את דוח ההורים", highlight: "report-link", page: "dashboard", action: "open-short-report" },
  { id: "M7", holdMs: 6000, caption: "דוח קצר — סקירה מהירה של התקופה", highlight: "short-header", page: "short-report" },
  { id: "M8", holdMs: 4000, caption: "זמן, שאלות ודיוק — במבט אחד", highlight: "short-summary", page: "short-report", action: "nudge-summary" },
  { id: "M9", holdMs: 3000, caption: "למעבר לדוח המקיף", highlight: "detailed-link", page: "short-report", action: "open-detailed" },
  { id: "M10", holdMs: 5000, caption: "דוח מקיף — פירוט לפי מקצועים", highlight: "detailed-header", page: "detailed-report" },
  { id: "M11", holdMs: 6000, caption: "כך רואים מה בולט ומה כדאי לשים בפוקוס", highlight: "detailed-section", page: "detailed-report", action: "scroll-detailed-section" },
  { id: "M12", holdMs: 4000, caption: "שואלים את העוזר על בסיס נתוני הדוח", highlight: "copilot-panel", page: "detailed-report", action: "scroll-copilot" },
  { id: "M13", holdMs: 5000, caption: "שאלה לדוגמה:", highlight: "copilot-input", page: "detailed-report", action: "ask-question" },
  { id: "M14", holdMs: 9000, caption: "התשובה מבוססת על נתוני התרגול בדוח", highlight: "copilot-answer", page: "detailed-report", action: "wait-answer" },
  {
    id: "M15",
    holdMs: 5000,
    caption: "כך ההורה יכול לעקוב, להבין ולקבל המלצות להמשך.",
    highlight: null,
    page: "detailed-report",
  },
];

export function isCopilotAnswerUseful(bodyText, question = DEMO_QUESTION) {
  const t = String(bodyText || "");
  if (t.includes("אירעה שגיאה טכנית")) return false;
  if (t.includes("copilot-turn failed")) return false;
  if (t.includes("SERVER_SNAPSHOT_UNAVAILABLE")) return false;
  const idx = t.indexOf(question);
  if (idx < 0) return false;
  const tail = t.slice(idx + question.length, idx + question.length + 500).trim();
  if (tail.length < 35) return false;
  const clarificationOnly =
    /בדוח אין כרגע מספיק שאלות|הנתונים עדיין מצומצמים|לצבור עוד קצת תרגול/.test(tail) &&
    !/(מומלץ|כדאי|התמקד|תרגל|שבוע|מקצוע|נושא)/.test(tail);
  if (clarificationOnly) return false;
  return true;
}
