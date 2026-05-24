import { pickHighlight } from "../lib/highlights.mjs";
import {
  arcadeActions,
  loginActions,
  preflightArcade,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";

export default {
  id: "SL8",
  slug: "games-arcade",
  title: "משחקים ותרגול חווייתי",
  pickHighlight,
  verifyRules: {
    durationMin: 38,
    durationMax: 85,
    requiredSignals: { arcadePage: true, arcadeVisited: true },
  },
  actions: {
    ...loginActions(),
    ...arcadeActions(),
    "goto-arcade": async ({ page, baseUrl }) => {
      await page.goto(`${baseUrl}/student/arcade`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(1000);
    },
  },
  scenes: [
    { id: "1", holdMs: 5000, caption: "משחקים ותרגול חווייתי", highlight: "home-greeting", action: "student-login" },
    { id: "2", holdMs: 7000, caption: "אזור המשחקים — ארקייד", highlight: "arcade-header", action: "goto-arcade" },
    { id: "3", holdMs: 7000, caption: "יתרת מטבעות לפני משחק", highlight: "arcade-balance" },
    { id: "4", holdMs: 7000, caption: "בוחרים משחק — למשל Fourline", highlight: "arcade-game-card" },
    { id: "5", holdMs: 10000, caption: "משחק מהיר — דוגמה קצרה", highlight: "arcade-game-card", action: "arcade-brief" },
    { id: "6", holdMs: 8000, caption: "משחקים לכיף — לצד תרגול מובנה.", highlight: null },
  ],
  trackScene: trackFromUrl,
  preflightChecks: preflightArcade,
};
