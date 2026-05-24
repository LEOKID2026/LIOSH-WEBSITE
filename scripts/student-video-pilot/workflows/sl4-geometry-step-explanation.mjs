import { pickHighlight } from "../lib/highlights.mjs";
import {
  geometryActions,
  loginActions,
  preflightGeometryExplanation,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";
import { ensureStudentSession } from "../lib/student-session.mjs";
import { startGeometryLearning } from "../lib/learning-flow.mjs";

export default {
  id: "SL4",
  slug: "geometry-step-explanation",
  title: "תרגול בגאומטריה — שאלה חזותית והסבר צעד־צעד",
  pickHighlight,
  verifyRules: {
    durationMin: 52,
    durationMax: 100,
    requiredSignals: {
      geometryMaster: true,
      explanationVisible: true,
      explanationOpen: true,
    },
  },
  setup: async (ctx) => {
    await ctx.page.goto(`${ctx.baseUrl}/student/login`, { waitUntil: "domcontentloaded" });
    await ensureStudentSession(ctx.page, ctx.baseUrl, ctx.account);
    await startGeometryLearning(ctx.page, { preferDiagram: true, baseUrl: ctx.baseUrl });
  },
  actions: {
    ...loginActions(),
    ...geometryActions(),
  },
  scenes: [
    { id: "1", holdMs: 6000, caption: "תרגול בגאומטריה — שאלה חזותית", highlight: "geometry-stem" },
    { id: "2", holdMs: 8000, caption: "שאלה עם תרגיל וצורה", highlight: "geometry-diagram" },
    { id: "3", holdMs: 6000, caption: "עונים על השאלה", highlight: "geometry-stem", action: "answer-geometry-correct" },
    { id: "4", holdMs: 7000, caption: "משוב אחרי התשובה", highlight: "math-feedback" },
    { id: "5", holdMs: 6000, caption: "לוחצים «צעד-צעד» להסבר מלא", highlight: "geometry-step-btn", action: "open-geometry-explanation" },
    { id: "6", holdMs: 10000, caption: "הסבר עם דיאגרמה ושלבים", highlight: "explanation-modal" },
    { id: "7", holdMs: 9000, caption: "כך נראה הסבר צעד-אחר-צעד בגאומטריה.", highlight: "explanation-modal" },
    { id: "8", holdMs: 6000, caption: "הדיאגרמה מלווה את כל שלבי הפתרון.", highlight: null },
  ],
  trackScene: async (ctx, scene) => {
    await trackFromUrl(ctx, scene);
    if (ctx.signals.explanationOpen) ctx.signals.explanationVisible = true;
  },
  preflightChecks: preflightGeometryExplanation,
};
