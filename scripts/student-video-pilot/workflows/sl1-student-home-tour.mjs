import { pickHighlight } from "../lib/highlights.mjs";
import {
  homeNavigationActions,
  loginActions,
  preflightStudentHome,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";

export default {
  id: "SL1",
  slug: "student-home-tour",
  title: "כניסת תלמיד ועמוד הבית",
  pickHighlight,
  verifyRules: {
    durationMin: 50,
    durationMax: 90,
    requiredSignals: { homePage: true, loginPage: true },
  },
  setup: async (ctx) => {
    const { waitStudentLoginReady } = await import("../../parent-video-pilot/lib/wait-student-login-ready.mjs");
    await ctx.page.goto(`${ctx.baseUrl}/student/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitStudentLoginReady(ctx.page, 60_000);
  },
  actions: {
    ...loginActions(),
    ...homeNavigationActions(),
  },
  scenes: [
    { id: "1", holdMs: 5000, caption: "כניסת תלמיד ועמוד הבית", highlight: "login-form" },
    { id: "2", holdMs: 5000, caption: "מזינים שם משתמש", highlight: "username-field", action: "fill-username" },
    { id: "3", holdMs: 5000, caption: "ומזינים PIN — בלי מקלדת על המסך", highlight: "pin-field", action: "fill-pin" },
    { id: "4", holdMs: 4500, caption: "לחיצה על כניסה", highlight: "login-submit", action: "submit-login" },
    { id: "5", holdMs: 9000, caption: "שלום! עמוד הבית של התלמיד", highlight: "home-greeting", action: "wait-home-ready" },
    { id: "6", holdMs: 7000, caption: "מטבעות, ניקוד והתקדמות", highlight: "home-stats" },
    { id: "7", holdMs: 7000, caption: "כניסה לנושאי לימוד", highlight: "home-subjects" },
    { id: "8", holdMs: 7000, caption: "המשימות היומיות", highlight: "daily-missions", action: "scroll-missions" },
    { id: "9", holdMs: 8000, caption: "מסע התמדה חודשי", highlight: "monthly-journey", action: "scroll-journey" },
    { id: "10", holdMs: 6000, caption: "כך נראה עמוד הבית אחרי כניסה.", highlight: null },
  ],
  trackScene: trackFromUrl,
  preflightChecks: preflightStudentHome,
};
