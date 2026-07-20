import assert from "node:assert/strict";
import { HF_LINEART_LINE_STYLE, HF_LINEART_FILTER } from "../../lib/coloring-upload/hf-lineart.js";

assert.equal(HF_LINEART_LINE_STYLE, "Complex Lines");
assert.equal(HF_LINEART_FILTER, "📄 Standard");

console.log("hf-lineart.test OK");
