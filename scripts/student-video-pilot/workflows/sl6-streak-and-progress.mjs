import { pickHighlight } from "../lib/highlights.mjs";
import {
  loginActions,
  mathActions,
  preflightStreak,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";
import { ensureStudentSession } from "../lib/student-session.mjs";
import { startMathLearning } from "../lib/learning-flow.mjs";

export default {
  id: "SL6",
  slug: "streak-and-progress",
  title: "רצף, ניקוד והתקדמות",
  pickHighlight,
  verifyRules: {
    durationMin: 36,
    durationMax: 90,
    requiredSignals: { mathMaster: true },
  },
  setup: async (ctx) => {
    await ctx.page.goto(`${ctx.baseUrl}/student/login`, { waitUntil: "domcontentloaded" });
    await ensureStudentSession(ctx.page, ctx.baseUrl, ctx.account);
    await startMathLearning(ctx.page, { operation: "addition", grade: "3", baseUrl: ctx.baseUrl });
  },
  actions: {
    ...loginActions(),
    ...mathActions(),
  },
  scenes: [
    { id: "1", holdMs: 5000, caption: "רצף, ניקוד והתקדמות", highlight: "math-question" },
    { id: "2", holdMs: 6000, caption: "תשובה נכונה ראשונה", highlight: "math-answer-input", action: "answer-math-correct" },
    { id: "3", holdMs: 7000, caption: "עוד תשובה — הרצף עולה", highlight: "streak-hud", action: "answer-math-correct" },
    { id: "4", holdMs: 6000, caption: "ממשיכים לתרגל", highlight: "math-question", action: "answer-math-streak" },
    { id: "5", holdMs: 8000, caption: "ניקוד ורצף מתעדכנים בזמן אמת", highlight: "streak-hud" },
    { id: "6", holdMs: 7000, caption: "כך צוברים ניקוד, רצף וכוכבים.", highlight: null },
  ],
  trackScene: trackFromUrl,
  preflightChecks: preflightStreak,
};
