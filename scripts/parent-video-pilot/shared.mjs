/**
 * Shared constants for parent workflow video pilot (capture-only).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEMO_CHILD_NAME = "ישראל ישראלי";
export const DEMO_QUESTION = "מה הכי חשוב לתרגל השבוע?";
export const VIEWPORT = { width: 1366, height: 900 };
export const FPS = 8;
export const PILOT_PORT_DEFAULT = 3001;

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(
  root,
  "qa-evidence-audit",
  "parent-video-pilot",
  "parent-report-ai",
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
#parent-pilot-dim {
  position: fixed; inset: 0; background: rgba(0,0,0,0);
  transition: background 0.35s ease;
  pointer-events: none;
}
#parent-pilot-dim.active { background: rgba(0,0,0,0.28); }
#parent-pilot-caption {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  max-width: min(720px, 88vw); padding: 10px 20px; border-radius: 10px;
  background: rgba(12, 14, 22, 0.88); color: #f8fafc;
  font-size: 17px; font-weight: 600; line-height: 1.4; text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35); direction: rtl;
}
#parent-pilot-highlight {
  position: fixed; border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.4), 0 0 14px rgba(251, 191, 36, 0.18);
  background: transparent;
  opacity: 0;
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

/** Approved storyboard — 15 scenes, ~62s */
export const SCENES = [
  { id: 1, holdMs: 4000, caption: "כניסה לאזור ההורים", highlight: "login-form", page: "login" },
  { id: 2, holdMs: 3000, caption: "כאן מתחברים הורים לחשבון", highlight: "login-email", page: "login" },
  { id: 3, holdMs: 5000, caption: "התחברות עם חשבון הדמו של QA", highlight: "login-submit", page: "login", action: "login" },
  { id: 4, holdMs: 5000, caption: "לוח הבקרה — כל הילדים במקום אחד", highlight: "children-section", page: "dashboard" },
  { id: 5, holdMs: 4000, caption: "בוחרים את ישראל ישראלי", highlight: "demo-child", page: "dashboard" },
  { id: 6, holdMs: 2000, caption: "פותחים את דוח ההורים", highlight: "report-link", page: "dashboard", action: "open-short-report" },
  { id: 7, holdMs: 6000, caption: "דוח קצר — סקירה מהירה של התקופה", highlight: "short-header", page: "short-report" },
  { id: 8, holdMs: 3000, caption: "זמן, שאלות ודיוק — במבט אחד", highlight: "short-summary", page: "short-report" },
  { id: 9, holdMs: 2000, caption: "למעבר לדוח המקיף", highlight: "detailed-link", page: "short-report", action: "open-detailed" },
  { id: 10, holdMs: 5000, caption: "דוח מקיף — פירוט לפי מקצועים", highlight: "detailed-header", page: "detailed-report" },
  { id: 11, holdMs: 6000, caption: "כך רואים מה בולט ומה כדאי לשים בפוקוס", highlight: "detailed-section", page: "detailed-report" },
  { id: 12, holdMs: 4000, caption: "שואלים את העוזר על בסיס נתוני הדוח", highlight: "copilot-panel", page: "detailed-report", action: "scroll-copilot" },
  { id: 13, holdMs: 4000, caption: "שאלה לדוגמה:", highlight: "copilot-input", page: "detailed-report", action: "ask-question" },
  { id: 14, holdMs: 8000, caption: "התשובה מבוססת על נתוני התרגול בדוח", highlight: "copilot-answer", page: "detailed-report", action: "wait-answer" },
  {
    id: 15,
    holdMs: 5000,
    caption: "כך ההורה יכול לעקוב, להבין ולקבל המלצות להמשך.",
    highlight: null,
    page: "detailed-report",
  },
];
