/**
 * Video #5 desktop — «קריאת דוח הורים — דוח קצר מול דוח מקיף»
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEMO_CHILD_NAME = "ישראל ישראלי";
export const VIEWPORT = { width: 1366, height: 900 };
export const FPS = 8;
export const PILOT_PORT_DEFAULT = 3001;
export const TITLE = "קריאת דוח הורים — דוח קצר מול דוח מקיף";
export const PILOT_ID = "how-to-read-report-v5-desktop";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const outDir = join(
  root,
  "qa-evidence-audit",
  "parent-video-pilot",
  "how-to-read-report",
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

/** Approved desktop storyboard — 15 scenes, ~72s */
export const SCENES = [
  {
    id: 1,
    holdMs: 3000,
    caption: "קריאת דוח הורים — דוח קצר מול דוח מקיף",
    highlight: "login-form",
    page: "login",
  },
  {
    id: 2,
    holdMs: 3000,
    caption: "כניסה עם חשבון הדמו של QA",
    highlight: "login-email",
    page: "login",
  },
  {
    id: 3,
    holdMs: 4000,
    caption: "התחברות",
    highlight: "login-submit",
    page: "login",
    action: "login",
  },
  {
    id: 4,
    holdMs: 4000,
    caption: "לוח הבקרה — בוחרים את ישראל ישראלי",
    highlight: "demo-child",
    page: "dashboard",
  },
  {
    id: 5,
    holdMs: 2000,
    caption: "פותחים את דוח ההורים",
    highlight: "report-link",
    page: "dashboard",
    action: "open-short-report",
  },
  {
    id: 6,
    holdMs: 6000,
    caption: "דוח קצר — תמונת מצב מהירה לתקופה",
    highlight: "short-header",
    page: "short-report",
  },
  {
    id: 7,
    holdMs: 6000,
    caption: "ארבעה מספרים במבט אחד: זמן, שאלות, דיוק ומגמה",
    highlight: "short-kpi-cards",
    page: "short-report",
  },
  {
    id: 8,
    holdMs: 6000,
    caption: "מתאים לבדיקה מהירה: מה בולט עכשיו ומה דורש תשומת לב",
    highlight: "short-diagnostic",
    page: "short-report",
    action: "scroll-short-diagnostic",
  },
  {
    id: 9,
    holdMs: 5000,
    caption: "וגם סיכום לפי מקצוע — בלי לרדת לעומק",
    highlight: "short-subjects",
    page: "short-report",
  },
  {
    id: 10,
    holdMs: 2000,
    caption: "כשצריך פירוט — עוברים לדוח מקיף",
    highlight: "detailed-link",
    page: "short-report",
  },
  {
    id: 11,
    holdMs: 2000,
    caption: "מעבר לדוח מקיף",
    highlight: "detailed-link",
    page: "short-report",
    action: "open-detailed",
  },
  {
    id: 12,
    holdMs: 5000,
    caption: "דוח מקיף — אותה תקופה, עם פירוט וניתוח",
    highlight: "detailed-header",
    page: "detailed-report",
  },
  {
    id: 13,
    holdMs: 7000,
    caption: "סיכום לתקופה: ההסבר המרכזי להורה",
    highlight: "detailed-period-summary",
    page: "detailed-report",
    action: "scroll-detailed-summary",
  },
  {
    id: 14,
    holdMs: 7000,
    caption: "מה עשינו בתקופה: נתונים וכיסוי לפי מקצוע",
    highlight: "detailed-activity",
    page: "detailed-report",
    action: "scroll-detailed-activity",
  },
  {
    id: 15,
    holdMs: 6000,
    caption: "הדוח הקצר = מבט מהיר; המקיף = פירוט, מקצועות והמלצות",
    highlight: null,
    page: "detailed-report",
  },
];

export function pickHighlightElement(highlightKey) {
  switch (highlightKey) {
    case "login-form":
      return document.querySelector("form");
    case "login-email":
      return document.querySelector('input[type="email"]');
    case "login-submit":
      return document.querySelector('form button[type="submit"]');
    case "demo-child":
      return [...document.querySelectorAll("div.rounded.border")].find((d) =>
        d.innerText?.includes("ישראל ישראלי")
      );
    case "report-link":
      return [...document.querySelectorAll("div.rounded.border")]
        .find((d) => d.innerText?.includes("ישראל ישראלי"))
        ?.querySelector('a[href*="parent-report"]');
    case "short-header": {
      const h1 = document.querySelector("h1");
      if (h1?.innerText?.includes("דוח")) return h1.closest("div") || h1;
      return document.querySelector("h1, h2");
    }
    case "short-kpi-cards": {
      const first = document.querySelector(".parent-report-print-summary-card");
      const grid = first?.closest(".grid");
      if (grid) return grid;
      return first?.parentElement;
    }
    case "short-diagnostic":
      return [...document.querySelectorAll("p, h2, h3")].find((el) =>
        el.textContent?.includes("מה הכי בולט עכשיו")
      )?.closest("div.rounded-lg, div[class*='rounded']");
    case "short-subjects": {
      const cards = [...document.querySelectorAll(".parent-report-print-summary-card")];
      const subject = cards.find((c) => c.innerText?.includes("חשבון") || c.innerText?.includes("🧮"));
      if (subject) {
        return subject.closest(".grid") || subject.parentElement;
      }
      return cards[4]?.closest(".grid") || cards[0]?.parentElement;
    }
    case "detailed-link":
      return [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("דוח מקיף"));
    case "detailed-header":
      return document.querySelector("h1") || document.querySelector("h2");
    case "detailed-period-summary":
      return [...document.querySelectorAll("h2")].find((h) => h.textContent?.includes("סיכום לתקופה"))
        ?.closest("section, .pr-detailed-section, div");
    case "detailed-activity":
      return [...document.querySelectorAll("h2")].find((h) =>
        h.textContent?.includes("מה עשינו בתקופה")
      )?.closest("section, .pr-detailed-section, div");
    default:
      return null;
  }
}
