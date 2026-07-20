import assert from "node:assert/strict";
import { COLORING_UPLOAD_PRESETS, getColoringUploadPreset } from "../../lib/coloring-upload/presets.js";

assert.equal(getColoringUploadPreset("unknown").id, "balanced");
assert.ok(COLORING_UPLOAD_PRESETS.simple.minComponentArea > COLORING_UPLOAD_PRESETS.detailed.minComponentArea);
assert.ok(COLORING_UPLOAD_PRESETS.simple.bilateralDiameter >= COLORING_UPLOAD_PRESETS.detailed.bilateralDiameter);
console.log("presets.test OK");
