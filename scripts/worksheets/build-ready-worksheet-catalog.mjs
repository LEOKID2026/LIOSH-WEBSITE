/**
 * Build / validate frozen ready worksheet catalog — Wave F.
 * Run: node scripts/worksheets/build-ready-worksheet-catalog.mjs
 */

import {
  validateReadyCatalogShape,
  validateReadyCatalogGeneratesAll,
  listReadyCatalogSummaryRows,
} from "../../lib/worksheets/worksheet-ready-catalog-integrity.server.js";
import { countReadyCatalogBySubject } from "../../lib/worksheets/worksheet-ready-catalog.js";

const shape = validateReadyCatalogShape();
if (!shape.pass) {
  console.error("catalog shape FAILED:");
  for (const e of shape.errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("catalog shape: OK");
console.log("counts by subject:", countReadyCatalogBySubject());

const gen = await validateReadyCatalogGeneratesAll();
if (!gen.pass) {
  console.error("catalog generation FAILED:");
  for (const e of gen.errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`catalog generation: OK (${listReadyCatalogSummaryRows().length} entries)`);
