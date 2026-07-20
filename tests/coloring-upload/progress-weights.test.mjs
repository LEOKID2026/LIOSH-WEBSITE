import assert from "node:assert/strict";
import { computeWeightedPercent } from "../../lib/coloring-upload/progress-weights.js";
import { PROGRESS_PHASE } from "../../lib/coloring-upload/constants.js";

assert.equal(
  computeWeightedPercent({
    [PROGRESS_PHASE.LOAD]: 1,
    [PROGRESS_PHASE.PREP]: 1,
    [PROGRESS_PHASE.PREPROCESS]: 1,
    [PROGRESS_PHASE.LINES]: 1,
    [PROGRESS_PHASE.METRICS]: 1,
    [PROGRESS_PHASE.OUTPUT]: 1,
  }),
  100
);

assert.equal(computeWeightedPercent({ [PROGRESS_PHASE.LOAD]: 0.5 }), 4);
console.log("progress-weights.test OK");
