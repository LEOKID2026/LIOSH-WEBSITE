#!/usr/bin/env node
/**
 * Standalone Ministry oracle builder — math + geometry strands.
 * Writes partial/math-geometry.json only. Not wired to npm/CI/runtime.
 */
import {
  TXT_DIR,
  makeRowId,
  makeSequence,
  writePartial,
} from "./lib/ministry-oracle-shared.mjs";

const MAVO_FILE = `${TXT_DIR}/mavo1.txt`;
const RESOURCE_FILE = `${TXT_DIR}/resource_100673815.txt`;

/** Curated grade×strand cells from mavo1.txt lines 603–659 + resource corroboration. */
const MAVO_TABLE = [
  {
    grade: 1,
    rows: [
      { domain: "מדידות", topic: "אורך", subtopic: "השוואה; יחידות מידה שרירותיות", group: "measurement_length", index: 1 },
      { domain: "טרנספורמציות", topic: "הזזה או שיקוף", subtopic: "היכרות גלובלית", group: "transformations", index: 1 },
      { domain: "מצולעים", topic: "מצולעים", subtopic: "היכרות; מרובעים שונים", group: "geometry_properties", index: 1 },
    ],
  },
  {
    grade: 2,
    rows: [
      { domain: "מדידות", topic: "אורך", subtopic: "יחידת מידה מוסכמת: ס\"מ; מדידת אורך בס\"מ ובמטר", group: "measurement_length", index: 1 },
      { domain: "מדידות", topic: "זמן", subtopic: "זמן בשעות שלימות; בחצאי שעה וברבעי שעה", group: "measurement_time", index: 1 },
      { domain: "מדידות", topic: "שטח", subtopic: "השוואה; יחידות שטח שרירותיות", group: "measurement_area", index: 1 },
      { domain: "מדידות", topic: "משקל", subtopic: "השוואה", group: "measurement_weight", index: 1 },
      { domain: "טרנספורמציות", topic: "שיקוף או הזזה", subtopic: "היכרות", group: "transformations", index: 1 },
      { domain: "גופים", topic: "גופים", subtopic: "היכרות", group: "solids", index: 1 },
    ],
  },
  {
    grade: 3,
    rows: [
      { domain: "מדידות", topic: "שטח", subtopic: "שטח ביחידות מידה מקובלות; השוואה (ללא נוסחה)", group: "measurement_area", index: 1, geometry_strand: true },
      { domain: "מדידות", topic: "שטח מלבן", subtopic: "חישוב שטח מלבן", group: "area_formulas", index: 1, geometry_strand: true },
      { domain: "גאומטריה", topic: "מצולעים", subtopic: "זוויות, מאונכות, מקבילות; משולשים, מרובעים; תכונות צלעות וזוויות", group: "geometry_properties", index: 1, geometry_strand: true },
      { domain: "טרנספורמציות", topic: "סיבוב", subtopic: "סיבוב", group: "transformations", index: 1 },
      { domain: "מדידות", topic: "נפח", subtopic: "השוואה", group: "volume", index: 1 },
    ],
  },
  {
    grade: 4,
    rows: [
      { domain: "גאומטריה", topic: "ריבוע ומלבן", subtopic: "הגדרות ותכונות; אלכסון, קדקודים, צלעות, פאות", group: "geometry_properties", index: 1, geometry_strand: true },
      { domain: "גאומטריה", topic: "משולש", subtopic: "תכונות של צלעות וזוויות במשולש", group: "geometry_properties", index: 2, geometry_strand: true, resource_anchor: "כיתה ד׳ § ו 69–91; resource_100673815.txt" },
      { domain: "מדידות", topic: "נוסחאות שטח והיקף", subtopic: "שטח מלבן + היקף מלבן", group: "area_formulas", index: 1, geometry_strand: true },
      { domain: "מדידות", topic: "נפח", subtopic: "נפח תיבה, שטח פנים; קשר בין משקל ונפח", group: "volume", index: 1, geometry_strand: true },
      { domain: "טרנספורמציות", topic: "סימטרייה", subtopic: "סימטרייה", group: "symmetry", index: 1 },
    ],
  },
  {
    grade: 5,
    rows: [
      { domain: "מצולעים", topic: "מרובעים", subtopic: "תכונות, מיון, קשרי הכלה", group: "geometry_properties", index: 1, geometry_strand: true, resource_anchor: "כיתה ה׳ § ד. מצולעים עמ׳ 110–112" },
      { domain: "מצולעים", topic: "ריצוף", subtopic: "ריצוף במצולעים משוכללים חופפים", group: "tiling", index: 1, geometry_strand: true, resource_anchor: "כיתה ה׳ § ד.3 עמ׳ 112–113" },
      { domain: "מצולעים", topic: "גבהים", subtopic: "גובה לשטח (משולש, מקבילית, טרפז)", group: "heights", index: 1, geometry_strand: true, row_id: "math.g5.geometry.heights", resource_anchor: "kita5.pdf § ד.4 גבהים עמ׳ 113", prerequisite_ids: [], sequence_notes: "Official G5 order: § ד.4 גבהים before § ה. מדידות שטחים." },
      { domain: "מדידות", topic: "מדידות שטחים", subtopic: "שטח מלבן (חזרה)", group: "area_formulas", index: 1, geometry_strand: true, row_id: "math.g5.measurement.area_formulas.rectangle_area", resource_anchor: "kita5.pdf § ה. מדידות שטחים עמ׳ 114–115", prerequisite_ids: ["math.g4.measurement.area_formulas.שטח_מלבן_היקף_מלבן"] },
      { domain: "מדידות", topic: "מדידות שטחים", subtopic: "שטח משולש (בסיס × גובה ÷ 2)", group: "area_formulas", index: 2, geometry_strand: true, row_id: "math.g5.measurement.area_formulas.triangle_area", resource_anchor: "kita5.pdf § ה. מדידות שטחים עמ׳ 114–115", status: "required", confidence: "high", internal_candidate_skill_id: "geometry:kind:triangle_area", prerequisite_ids: ["math.g5.geometry.heights", "math.g4.measurement.area_formulas.שטח_מלבן_היקף_מלבן"], sequence_notes: "After § ד.4 גבהים; verified kita5.pdf § ה." },
      { domain: "מדידות", topic: "מדידות שטחים", subtopic: "שטח מקבילית וטרפז", group: "area_formulas", index: 3, geometry_strand: true, row_id: "math.g5.measurement.area_formulas.parallelogram_trapezoid", resource_anchor: "כיתה ה׳ § ה. מדידות שטחים עמ׳ 114–115", prerequisite_ids: ["math.g5.measurement.area_formulas.triangle_area", "math.g5.geometry.heights"] },
    ],
  },
  {
    grade: 6,
    rows: [
      { domain: "גאומטריה", topic: "גופים", subtopic: "חישובי נפחים; פריסות; גופים משוכללים", group: "volume", index: 1, geometry_strand: true },
      { domain: "מדידות", topic: "מעגל ועיגול", subtopic: "היקף + שטח מעגל", group: "circles", index: 1, geometry_strand: true },
      { domain: "מדידות", topic: "נפח", subtopic: "מנסרה / גופים עם בסיס משולש", group: "volume", index: 2, geometry_strand: true, prerequisite_ids: ["math.g5.measurement.area_formulas.triangle_area"] },
    ],
  },
];

function buildMavoRows() {
  const rows = [];
  for (const gradeBlock of MAVO_TABLE) {
    const { grade } = gradeBlock;
    for (const item of gradeBlock.rows) {
      const rowId = item.row_id
        ? item.row_id
        : item.row_key
          ? makeRowId("math", grade, item.domain, item.group, item.row_key)
          : makeRowId("math", grade, item.domain, item.group, item.subtopic);
      const status = item.status ?? "required_pending_pdf_parse";
      const corroborating = item.resource_anchor
        ? `resource_100673815.txt: ${item.resource_anchor}`
        : item.geometry_strand
          ? "mavo1.txt geometry progression table lines 603–659"
          : null;

      rows.push({
        row_id: rowId,
        subject: item.geometry_strand ? "geometry" : "math",
        grade,
        official_domain: item.domain,
        official_topic: item.topic,
        official_subtopic: item.subtopic,
        ministry_source_file: item.resource_anchor ? RESOURCE_FILE.replace(/\\/g, "/").split("/").slice(-2).join("/") : "תוכנית משרד החינוך קובצי TXT/mavo1.txt",
        ministry_source_type: "txt",
        source_class: item.resource_anchor ? "official_supplement" : "official_primary",
        source_anchor: item.resource_anchor ?? `mavo1.txt lines 603–659, grade-${grade} ${item.domain}`,
        corroborating_source: corroborating,
        status,
        confidence: item.confidence ?? "medium",
        geometry_strand: Boolean(item.geometry_strand),
        internal_candidate_skill_id: item.internal_candidate_skill_id ?? null,
        notes:
          status === "required"
            ? item.sequence_notes ?? "Verified oracle row."
            : status === "required_pending_pdf_parse"
              ? "Strongly supported by mavo1.txt and/or resource_100673815.txt; not final until kita PDF parsed."
              : null,
        blocker_reason:
          status === "required_pending_pdf_parse"
            ? `Primary grade-${grade} Ministry PDF (kita${grade}.pdf) not yet parsed or anchored; confidence capped at medium.`
            : null,
        ...makeSequence({
          sequence_index: item.index,
          sequence_group: item.group,
          prerequisite_row_ids: item.prerequisite_ids ?? [],
          prerequisite_skill_ids: [],
          sequence_source_anchor: item.resource_anchor ? item.resource_anchor : "pedagogical_inferred",
          sequence_confidence: "medium",
          sequence_notes:
            item.sequence_notes ??
            `Order within grade ${grade} ${item.group} block inferred from Ministry table structure.`,
        }),
      });
    }
  }
  return rows;
}

function buildKitaPlaceholderRows() {
  const rows = [];
  for (let grade = 1; grade <= 6; grade += 1) {
    rows.push({
      row_id: makeRowId("math", grade, "kita_pdf_placeholder"),
      subject: "math",
      grade,
      official_domain: null,
      official_topic: null,
      official_subtopic: null,
      ministry_source_file: `תוכנית משרד החינוך/כיתה ${["א", "ב", "ג", "ד", "ה", "ו"][grade - 1]}.pdf`,
      ministry_source_type: "pdf",
      source_class: "official_primary",
      source_anchor: null,
      corroborating_source: null,
      status: "pending_parse",
      confidence: "low",
      geometry_strand: false,
      internal_candidate_skill_id: null,
      notes: "Primary grade PDF exists remotely but is not parsed to oracle rows in repo.",
      blocker_reason: `kita${grade}.pdf not yet parsed`,
      ...makeSequence({
        sequence_index: null,
        sequence_group: null,
        prerequisite_row_ids: [],
        prerequisite_skill_ids: [],
        sequence_source_anchor: null,
        sequence_confidence: null,
        sequence_notes: null,
      }),
    });
  }
  return rows;
}

const rows = [...buildMavoRows(), ...buildKitaPlaceholderRows()];

writePartial("math-geometry", {
  generated_at: new Date().toISOString(),
  source_script: "scripts/build-ministry-oracle-math-geometry.mjs",
  row_count: rows.length,
  rows,
});

console.log(`Wrote ${rows.length} math/geometry oracle rows to partial/math-geometry.json`);
