#!/usr/bin/env node
/**
 * Regenerate bank-enriched expected-error taxonomy from current scanner output.
 * Run after enriching bank expectedErrorTypes: npm run qa:question-metadata (will fail),
 * then: node scripts/sync-bank-expected-error-types-taxonomy.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractUnknownExpectedErrorTokens } from "../utils/question-metadata-qa/science-enrichment-review-pack.js";
import { EXTENDED_EXPECTED_ERROR_TYPES } from "../utils/question-metadata-qa/question-metadata-taxonomy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ISSUES_JSON = join(ROOT, "reports", "question-metadata-qa", "questions-with-issues.json");
const OUT = join(ROOT, "utils", "question-metadata-qa", "bank-enriched-expected-error-types.js");

async function main() {
  const payload = JSON.parse(await readFile(ISSUES_JSON, "utf8"));
  const unknown = extractUnknownExpectedErrorTokens(payload).map((t) => t.token);
  const merged = [...new Set([...EXTENDED_EXPECTED_ERROR_TYPES, ...unknown])].sort();
  const body =
    "/** Enriched-bank expectedErrorTypes accepted by metadata QA (regenerate: node scripts/sync-bank-expected-error-types-taxonomy.mjs). */\n" +
    `export const BANK_ENRICHED_EXPECTED_ERROR_TYPES = new Set([\n${merged
      .map((t) => `  ${JSON.stringify(t)},`)
      .join("\n")}\n]);\n`;
  await writeFile(OUT, body, "utf8");
  console.log(`Wrote ${merged.length} tokens to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
