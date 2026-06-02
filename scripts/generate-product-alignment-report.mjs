/**
 * Generate human-readable product alignment report from verification JSON.
 * Run: node scripts/generate-product-alignment-report.mjs
 * Input:  data/curriculum-oracle/v1/product-alignment-findings.json
 * Output: docs/curriculum/PRODUCT_ALIGNMENT_FINDINGS_GRADES_1_6.md
 */
import fs from "node:fs";
import path from "node:path";
import { ORACLE_DIR, REPO_ROOT, readJson } from "./lib/ministry-oracle-shared.mjs";

const INPUT = path.join(ORACLE_DIR, "product-alignment-findings.json");
const OUTPUT = path.join(REPO_ROOT, "docs/curriculum/PRODUCT_ALIGNMENT_FINDINGS_GRADES_1_6.md");

const SUBJECTS = ["geometry", "math", "science", "moledet-geography", "english", "hebrew", "all"];
const GRADES = [1, 2, 3, 4, 5, 6];
const SEVERITIES = ["P0", "P1", "P2", "INFO"];

function groupBy(arr, keyFn) {
  /** @type {Record<string, typeof arr>} */
  const map = {};
  for (const item of arr) {
    const k = keyFn(item);
    (map[k] ??= []).push(item);
  }
  return map;
}

function uniqueFiles(findings) {
  return [...new Set(findings.map((f) => f.file_path))].sort();
}

function safetyCell(findings, subject, grade) {
  const hits = findings.filter(
    (f) =>
      (f.subject === subject || (subject === "moledet-geography" && f.subject === "moledet-geography")) &&
      (f.grade === grade || f.grade === null) &&
      (f.severity === "P0" || f.severity === "P1")
  );
  if (hits.some((h) => h.severity === "P0")) return "RED";
  if (hits.length) return "YELLOW";
  return "GREEN";
}

function renderFindingTable(findings) {
  if (!findings.length) return "_None._\n";
  const lines = [
    "| ID | Subject | Grade | Classification | Severity | Surface |",
    "|----|---------|-------|----------------|----------|---------|",
  ];
  for (const f of findings.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity))) {
    lines.push(
      `| ${f.finding_id} | ${f.subject} | ${f.grade ?? "—"} | ${f.classification} | ${f.severity} | ${f.product_surface} |`
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderFindingDetail(f) {
  return [
    `#### ${f.finding_id} — ${f.classification} (${f.severity})`,
    "",
    `- **Subject / grade / topic:** ${f.subject} / ${f.grade ?? "all"} / ${f.topic ?? "—"}`,
    `- **Surface:** ${f.product_surface}`,
    `- **File:** \`${f.file_path}\``,
    `- **Current behavior:** ${f.current_behavior}`,
    `- **Oracle status:** ${f.oracle_status ?? "—"}`,
    `- **Code evidence:** ${f.evidence_from_code}`,
    `- **Oracle evidence:** ${f.evidence_from_oracle ?? "—"}`,
    `- **Recommended action:** ${f.recommended_action}`,
    `- **Immediate fix (Track A):** ${f.can_implement_immediately ? "Yes" : "No"}`,
    `- **Source verification required:** ${f.source_verification_required ? "Yes" : "No"}`,
    "",
  ].join("\n");
}

function buildReport(data) {
  const { findings, oracle_snapshot: snap } = data;
  const bySeverity = groupBy(findings, (f) => f.severity);
  const bySurface = groupBy(findings, (f) => f.product_surface);
  const bySubject = groupBy(findings, (f) => f.subject);

  const trackA = findings.filter((f) => f.can_implement_immediately && !f.source_verification_required);
  const trackB = findings.filter((f) => f.source_verification_required);
  const ownerDecisions = findings.filter((f) => f.classification === "NEEDS_OWNER_DECISION");

  const safetyRows = [];
  for (const subj of ["geometry", "science", "moledet-geography", "english", "hebrew"]) {
    const cells = GRADES.map((g) => safetyCell(findings, subj, g));
    const rowVerdict = cells.includes("RED") ? "RED" : cells.includes("YELLOW") ? "YELLOW" : "GREEN";
    safetyRows.push(`| ${subj} | ${cells.join(" | ")} | ${rowVerdict} |`);
  }

  const sections = [];

  sections.push(`# Product Alignment Findings — Grades 1–6

**Generated:** ${data.generated_at}  
**Generator:** \`${data.generator}\`  
**Findings source:** \`data/curriculum-oracle/v1/product-alignment-findings.json\`

---

## 1. Executive summary

This report compares live product surfaces against \`data/curriculum-oracle/v1/ministry-matrix.draft.json\` (124 official oracle rows; **0** at \`confidence: high\`). No product files were modified.

| Metric | Value |
|--------|-------|
| Total findings | ${snap.finding_count} |
| P0 | ${snap.severity_counts.P0 ?? 0} |
| P1 | ${snap.severity_counts.P1 ?? 0} |
| P2 | ${snap.severity_counts.P2 ?? 0} |
| INFO | ${snap.severity_counts.INFO ?? 0} |
| Oracle row count | ${snap.row_count} |
| Oracle blockers | ${snap.blocker_count} |
| Science oracle rows | ${snap.science_oracle_rows} |
| Hebrew oracle rows | ${snap.hebrew_oracle_rows} |
| English oracle rows | ${snap.english_oracle_rows} |
| Geometry oracle rows | ${snap.geometry_oracle_rows} |
| Moledet oracle rows | ${snap.moledet_oracle_rows} |
| Geography oracle rows | ${snap.geography_oracle_rows} |

**Launch verdict:** **RED** — P0 findings in geometry (overteaching, unsupported diagnostics), science (zero oracle rows), moledet G1 (overteaching), and English G4–6 (\`source_blocker\`) block a claim of full Ministry alignment across grades 1–6.

**Highest-risk clusters:**
1. **Triangle area** — generator overteaches G3–G4; G5 book page and spine skill missing; diagnostics/labels ungated.
2. **Science** — product runs 7 spine skills with no official oracle; parent templates missing S-05/S-06/S-08.
3. **Moledet G1** — 11 geography spine skills and 6 product topics vs oracle \`not_in_grade\`.
4. **English G4–6** — oracle \`source_blocker\` only; 81 spine skills with no grade gate.

---

## 2. Subject × grade safety table

Legend: **RED** = P0 finding for grade; **YELLOW** = P1 only; **GREEN** = no P0/P1 for grade.

| Subject | G1 | G2 | G3 | G4 | G5 | G6 | Row |
|---------|----|----|----|----|----|----|-----|
${safetyRows.join("\n")}

---

## 3. Findings by severity

### P0 (${(bySeverity.P0 ?? []).length})

${renderFindingTable(bySeverity.P0 ?? [])}

### P1 (${(bySeverity.P1 ?? []).length})

${renderFindingTable(bySeverity.P1 ?? [])}

### P2 (${(bySeverity.P2 ?? []).length})

${renderFindingTable(bySeverity.P2 ?? [])}

### INFO (${(bySeverity.INFO ?? []).length})

${renderFindingTable(bySeverity.INFO ?? [])}

---

## 4. Findings by product surface

${Object.keys(bySurface)
  .sort()
  .map((surface) => `### ${surface}\n\n${renderFindingTable(bySurface[surface])}`)
  .join("\n")}

---

## 5. Findings by subject

${SUBJECTS.filter((s) => bySubject[s]?.length)
  .map((subj) => {
    const list = bySubject[subj];
    return `### ${subj} (${list.length})\n\n${list.map(renderFindingDetail).join("\n")}`;
  })
  .join("\n")}

---

## 6. Immediate safety fixes (Track A)

Fixes that can be gated/suppressed without waiting for Ministry PDF parse:

${trackA.length ? trackA.map((f) => `- **${f.finding_id}:** ${f.recommended_action} (\`${f.file_path}\`)`).join("\n") : "_None identified._"}

---

## 7. Fixes requiring source verification (Track B)

${trackB.length ? trackB.map((f) => `- **${f.finding_id}:** ${f.recommended_action} (\`${f.file_path}\`)`).join("\n") : "_None identified._"}

---

## 8. Owner decision questions

${ownerDecisions.length ? ownerDecisions.map((f) => `1. **${f.finding_id}** (${f.topic}): ${f.recommended_action}`).join("\n") : "_No NEEDS_OWNER_DECISION findings._"}

Additional open questions:
- Should symmetry remain available at G6 when spine binds it to G4 only (GEO-10)?
- When science oracle is populated, should S-05/S-06/S-08 templates precede taxonomy routing?

---

## 9. Files likely needing changes

When fixes are approved, these files appear most frequently in findings:

${uniqueFiles(findings)
  .map((f) => `- \`${f}\``)
  .join("\n")}

---

## Appendix — check IDs executed

| Check | Description |
|-------|-------------|
| GEO-01 | Triangle in TOPIC_SHAPES.area before oracle grade 5 |
| GEO-02 | Missing geometry:kind:triangle_area spine skill |
| GEO-03 | Missing G5 book triangle_area page |
| GEO-04 | heights_triangle before triangle_area page |
| GEO-05 | G6 prism_volume_triangle without G5 triangle_area |
| GEO-06 | Ungated geo_area_triangle_formula classroom label |
| GEO-07 | Ungated triangle_area diagnostic bridge |
| GEO-08 | G08 indicator routes triangle_area all grades |
| GEO-09 | rectangle_area bridge without spine/binding |
| GEO-10 | symmetry spine G4 vs G6 topics |
| SCI-01 | Zero science oracle rows vs active spine |
| SCI-02 | plants grade span vs SCIENCE_GRADES |
| SCI-03 | Missing S-05/S-06/S-08 parent templates |
| MOL-01 | G1 geography spine vs oracle not_in_grade |
| MOL-02 | G1 product topics vs oracle |
| MOL-03 | geography vs moledet subject taxonomy |
| MOL-04 | moledet-geography vs moledet_geography IDs |
| ENG-01 | English G4–6 source_blocker vs spine |
| HEB-01 | Missing Hebrew G2–6 learning-book registries |
| SEQ-01 | G5 area before heights vs oracle |
| SEQ-02 | Book registries ignore oracle sequence_index |
`);

  return sections.join("\n");
}

function main() {
  const data = readJson(INPUT);
  const md = buildReport(data);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, md, "utf8");
  console.log(`Wrote ${path.relative(REPO_ROOT, OUTPUT)} (${data.findings.length} findings)`);
}

main();
