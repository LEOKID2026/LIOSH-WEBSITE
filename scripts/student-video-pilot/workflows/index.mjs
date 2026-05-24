import sl1 from "./sl1-student-home-tour.mjs";
import sl2 from "./sl2-start-practice.mjs";
import sl3 from "./sl3-math-step-explanation.mjs";
import sl4 from "./sl4-geometry-step-explanation.mjs";
import sl5 from "./sl5-wrong-answer-help.mjs";
import sl6 from "./sl6-streak-and-progress.mjs";
import sl7 from "./sl7-daily-missions-journey.mjs";
import sl8 from "./sl8-games-arcade.mjs";
import sl9 from "./sl9-subjects-overview.mjs";

/** Wave order: SL1–SL7, SL9, SL8 (games last). */
export const WAVE_ORDER = [sl1, sl2, sl3, sl4, sl5, sl6, sl7, sl9, sl8];

const BY_SLUG = Object.fromEntries(WAVE_ORDER.map((w) => [w.slug, w]));

export function loadWorkflow(slug) {
  const workflow = BY_SLUG[slug];
  if (!workflow) {
    const available = WAVE_ORDER.map((w) => w.slug).join(", ");
    throw new Error(`Unknown workflow slug: ${slug}. Available: ${available}`);
  }
  return workflow;
}

export { sl1, sl2, sl3, sl4, sl5, sl6, sl7, sl8, sl9 };
