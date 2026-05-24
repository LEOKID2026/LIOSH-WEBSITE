import { pickHighlight } from "../lib/highlights.mjs";
import {
  loginActions,
  mathActions,
  preflightWrongAnswer,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";
import { ensureStudentSession } from "../lib/student-session.mjs";
import { startMathLearning } from "../lib/learning-flow.mjs";

export default {
  id: "SL5",
  slug: "wrong-answer-help",
  title: "מה קורה כשטועים בשאלה",
  pickHighlight,
  verifyRules: {
    durationMin: 40,
    durationMax: 90,
    requiredSignals: { wrongFeedback: true, explanationOpen: true },
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
    { id: "1", holdMs: 5500, caption: "מה קורה כשטועים בשאלה?", highlight: "math-question" },
    { id: "2", holdMs: 6000, caption: "מזינים תשובה שגויה בכוונה", highlight: "math-answer-input", action: "answer-math-wrong" },
    { id: "3", holdMs: 9000, caption: "המערכת מראה שהתשובה לא נכונה", highlight: "math-feedback" },
    { id: "4", holdMs: 6000, caption: "אפשר לפתוח הסבר מלא גם אחרי טעות", highlight: "math-step-btn", action: "open-math-explanation" },
    { id: "5", holdMs: 9000, caption: "ההסבר עוזר להבין איך לפתור נכון", highlight: "explanation-modal" },
    { id: "6", holdMs: 7000, caption: "כך לומדים מהטעות — בלי לייאוש.", highlight: null },
  ],
  trackScene: trackFromUrl,
  preflightChecks: preflightWrongAnswer,
};
