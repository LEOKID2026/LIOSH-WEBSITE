import { pickHighlight } from "../lib/highlights.mjs";
import {
  loginActions,
  mathActions,
  preflightMathExplanation,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";
import { startMathLearning } from "../lib/learning-flow.mjs";

export default {
  id: "SL3",
  slug: "math-step-explanation",
  title: "תרגול בחשבון — שאלה, תשובה והסבר צעד־צעד",
  pickHighlight,
  verifyRules: {
    durationMin: 52,
    durationMax: 100,
    requiredSignals: {
      mathMaster: true,
      explanationVisible: true,
      explanationOpen: true,
    },
  },
  setup: async (ctx) => {
    await ctx.page.goto(`${ctx.baseUrl}/student/login`, { waitUntil: "domcontentloaded" });
    const { ensureStudentSession } = await import("../lib/student-session.mjs");
    await ensureStudentSession(ctx.page, ctx.baseUrl, ctx.account);
    await startMathLearning(ctx.page, { operation: "addition", grade: "3", baseUrl: ctx.baseUrl });
  },
  actions: {
    ...loginActions(),
    ...mathActions(),
  },
  scenes: [
    { id: "1", holdMs: 6000, caption: "תרגול בחשבון — שאלה אמיתית", highlight: "math-question" },
    { id: "2", holdMs: 7000, caption: "קוראים את השאלה לפני התשובה", highlight: "math-question" },
    { id: "3", holdMs: 6000, caption: "מזינים תשובה ובודקים", highlight: "math-answer-input", action: "answer-math-correct" },
    { id: "4", holdMs: 8000, caption: "משוב — נכון או לא נכון", highlight: "math-feedback" },
    { id: "5", holdMs: 6000, caption: "לוחצים על «צעד-צעד» להסבר מלא", highlight: "math-step-btn", action: "open-math-explanation" },
    { id: "6", holdMs: 10000, caption: "הסבר צעד-אחר-צעד עם שלבים", highlight: "explanation-modal" },
    { id: "7", holdMs: 9000, caption: "כך משתמשים בהסבר צעד-אחר-צעד בחשבון.", highlight: "explanation-modal" },
    { id: "8", holdMs: 6000, caption: "אפשר לעבור בין השלבים ולהבין את הפתרון.", highlight: null },
  ],
  trackScene: async (ctx, scene) => {
    await trackFromUrl(ctx, scene);
    if (ctx.signals.explanationOpen) ctx.signals.explanationVisible = true;
  },
  preflightChecks: preflightMathExplanation,
};
