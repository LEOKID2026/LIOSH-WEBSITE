import { pickHighlight } from "../lib/highlights.mjs";
import {
  homeNavigationActions,
  loginActions,
  mathActions,
  preflightMathPractice,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";

export default {
  id: "SL2",
  slug: "start-practice",
  title: "איך מתחילים תרגול במקצוע",
  pickHighlight,
  verifyRules: {
    durationMin: 48,
    durationMax: 95,
    requiredSignals: { mathMaster: true },
  },
  actions: {
    ...loginActions(),
    ...homeNavigationActions(),
    ...mathActions(),
    "goto-math-from-hub": async ({ page, baseUrl }) => {
      await page.goto(`${baseUrl}/learning`, { waitUntil: "domcontentloaded" });
      await page.locator('a[href*="math-master"]').first().click();
      await page.waitForURL("**/math-master**", { timeout: 30_000 });
    },
  },
  scenes: [
    { id: "1", holdMs: 5000, caption: "איך מתחילים תרגול במקצוע", highlight: "home-greeting", action: "student-login" },
    { id: "2", holdMs: 6000, caption: "נכנסים לאזור הלימודים", highlight: "home-learn-cta", action: "goto-learning-hub" },
    { id: "3", holdMs: 6000, caption: "בוחרים חשבון", highlight: "subject-math", action: "goto-math-from-hub" },
    { id: "4", holdMs: 7000, caption: "בוחרים כיתה ונושא — ולוחצים התחל", highlight: "math-start-btn", action: "start-math" },
    { id: "5", holdMs: 8000, caption: "מופיעה שאלה אמיתית", highlight: "math-question" },
    { id: "6", holdMs: 6000, caption: "מזינים תשובה ובודקים", highlight: "math-answer-input", action: "answer-math-correct" },
    { id: "7", holdMs: 8000, caption: "משוב מיידי אחרי התשובה", highlight: "math-feedback" },
    { id: "8", holdMs: 6000, caption: "כך מתחילים תרגול בכל מקצוע.", highlight: null },
  ],
  trackScene: trackFromUrl,
  preflightChecks: preflightMathPractice,
};
