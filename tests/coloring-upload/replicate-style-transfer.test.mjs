import test from "node:test";
import assert from "node:assert/strict";

import { resolveReplicateOutputUrl } from "../../lib/coloring-upload/replicate-style-transfer.server.js";

test("resolveReplicateOutputUrl prefers final image in multi-output arrays", () => {
  const url = resolveReplicateOutputUrl([
    "https://example.com/preprocessed.png",
    "https://example.com/final.png",
  ]);
  assert.equal(url, "https://example.com/final.png");
});

test("resolveReplicateOutputUrl accepts string output", () => {
  assert.equal(resolveReplicateOutputUrl("https://example.com/out.png"), "https://example.com/out.png");
});
