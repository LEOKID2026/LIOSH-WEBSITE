import assert from "node:assert/strict";
import {
  COLORING_PAGE_WIDTH_PX,
  COLORING_PAGE_HEIGHT_PX,
  getColoringPageIllustrationFitSize,
} from "../../lib/coloring/coloring-page-layout.js";

assert.equal(COLORING_PAGE_WIDTH_PX, 2480);
assert.equal(COLORING_PAGE_HEIGHT_PX, 3508);
const fit = getColoringPageIllustrationFitSize();
assert.ok(fit.width > 0 && fit.height > 0);
assert.ok(fit.width < COLORING_PAGE_WIDTH_PX);
console.log("a4-layout.test OK");
