/**
 * Build owner delta review workbook from delta summary JSON.
 * Run: node scripts/hebrew-copy-delta-review-pack-build.mjs
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

import { sheetFromObjects } from "./lib/hebrew-copy-scan-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SUMMARY_PATH = join(ROOT, "reports", "hebrew-copy-delta-summary.json");
const OUT_PATH = join(ROOT, "reports", "hebrew-copy-delta-review.xlsx");

const REVIEW_COLUMNS = [
  "id",
  "domain",
  "audience",
  "surface",
  "source_file",
  "source_line",
  "old_text_if_changed",
  "new_text",
  "detected_change_type",
  "risk_level",
  "suggested_domain",
  "suggested_status",
  "suggested_classification",
  "why_flagged",
  "suggested_replacement",
  "owner_status",
  "owner_replacement",
  "notes",
];

const OWNER_STATUSES = ["approved", "change", "not_sure", "internal_only", "block"];

function main() {
  if (!existsSync(SUMMARY_PATH)) {
    console.error(`Missing ${relative(ROOT, SUMMARY_PATH)} — run hebrew-copy-delta-gate.mjs first`);
    process.exit(1);
  }

  const summary = JSON.parse(readFileSync(SUMMARY_PATH, "utf8"));
  const deltas = summary.deltas || [];
  const active = deltas.filter((d) => d.detected_change_type !== "removed");
  const removed = deltas.filter((d) => d.detected_change_type === "removed");

  mkdirSync(join(ROOT, "reports"), { recursive: true });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(sheetFromObjects(active, REVIEW_COLUMNS)),
    "Delta Review"
  );

  if (removed.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(
        sheetFromObjects(
          removed.map((d) => ({
            ...d,
            owner_status: "",
            notes: `${d.notes || ""} removed from source`.trim(),
          })),
          REVIEW_COLUMNS
        )
      ),
      "Deprecated Removed"
    );
  }

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["owner_status", "meaning"],
      ...OWNER_STATUSES.map((s) => [s, ""]),
    ]),
    "Owner Status Legend"
  );

  XLSX.writeFile(wb, OUT_PATH);

  console.log(
    JSON.stringify(
      {
        reviewWorkbook: relative(ROOT, OUT_PATH),
        delta_rows: active.length,
        removed_rows: removed.length,
        owner_statuses: OWNER_STATUSES,
      },
      null,
      2
    )
  );
}

main();
