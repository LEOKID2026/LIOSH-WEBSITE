import { runChild } from "./run-child.mjs";

const code = runChild(
  "npx",
  ["playwright", "test", "tests/e2e/parent-report-real-ui-load.spec.ts", "--project=chromium"],
  { env: process.env }
);
process.exit(code);
