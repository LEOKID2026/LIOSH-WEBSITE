import { pickHighlight } from "../lib/highlights.mjs";
import {
  homeNavigationActions,
  loginActions,
  preflightSubjectsOverview,
  subjectsActions,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";

export default {
  id: "SL9",
  slug: "subjects-overview",
  title: "סקירת מקצועות באתר",
  pickHighlight,
  verifyRules: {
    durationMin: 40,
    durationMax: 95,
    requiredSignals: { learningHub: true, mathMaster: true },
  },
  actions: {
    ...loginActions(),
    ...homeNavigationActions(),
    ...subjectsActions(),
  },
  scenes: [
    { id: "1", holdMs: 5500, caption: "סקירת כל המקצועות באתר", highlight: "home-greeting", action: "student-login" },
    { id: "2", holdMs: 8000, caption: "אזור הלימודים — שישה מקצועות", highlight: "subject-grid", action: "goto-learning-hub" },
    { id: "3", holdMs: 7000, caption: "חשבון, גאומטריה, עברית, אנגלית, מדעים ומולדת", highlight: "learning-hub" },
    { id: "4", holdMs: 5000, caption: "מציץ לתוך חשבון — לobby בלבד", highlight: "math-lobby", action: "peek-math-lobby" },
    { id: "5", holdMs: 5000, caption: "מציץ לתוך עברית", highlight: "math-lobby", action: "peek-hebrew-lobby" },
    { id: "6", holdMs: 6000, caption: "חוזרים למרכז הלימודים", highlight: "subject-grid", action: "return-learning-hub" },
    { id: "7", holdMs: 7000, caption: "כך בוחרים מה ללמוד היום.", highlight: null },
  ],
  trackScene: trackFromUrl,
  preflightChecks: preflightSubjectsOverview,
};
