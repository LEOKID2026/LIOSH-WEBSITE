import { pickHighlight } from "../lib/highlights.mjs";
import {
  homeNavigationActions,
  loginActions,
  preflightMissions,
  trackFromUrl,
} from "../lib/workflow-helpers.mjs";

export default {
  id: "SL7",
  slug: "daily-missions-journey",
  title: "משימות יומיות / מסע התקדמות חודשי",
  pickHighlight,
  verifyRules: {
    durationMin: 42,
    durationMax: 95,
    requiredSignals: { homePage: true, missionsVisible: true, journeyVisible: true },
  },
  actions: {
    ...loginActions(),
    ...homeNavigationActions(),
  },
  scenes: [
    { id: "1", holdMs: 5500, caption: "משימות יומיות ומסע חודשי", highlight: "home-greeting", action: "student-login" },
    { id: "2", holdMs: 8000, caption: "המשימות שלי להיום", highlight: "daily-missions", action: "scroll-missions" },
    { id: "3", holdMs: 8000, caption: "כל משימה שווה מטבעות — למידה אמיתית", highlight: "daily-missions" },
    { id: "4", holdMs: 7000, caption: "גלילה למסע ההתמדה החודשי", highlight: "monthly-journey", action: "scroll-journey" },
    { id: "5", holdMs: 9000, caption: "דקות למידה ויעד חודשי", highlight: "monthly-journey" },
    { id: "6", holdMs: 7000, caption: "כך עוקבים אחרי התקדמות יומית וחודשית.", highlight: null },
  ],
  trackScene: trackFromUrl,
  preflightChecks: preflightMissions,
};
