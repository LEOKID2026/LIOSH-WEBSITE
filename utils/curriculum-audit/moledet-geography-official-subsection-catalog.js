/**
 * Structured Moledet/Geography subsection catalog — derived from data/moledet-geography-curriculum.js
 * and owner PDF references (not an automated PDF parse).
 */
import * as moledetCurriculumModule from "../../data/moledet-geography-curriculum.js";

const MOLEDET_GEOGRAPHY_GRADES =
  moledetCurriculumModule.default?.MOLEDET_GEOGRAPHY_GRADES ??
  moledetCurriculumModule.MOLEDET_GEOGRAPHY_GRADES;
const MOLEDET_GEOGRAPHY_GRADE_ORDER =
  moledetCurriculumModule.default?.MOLEDET_GEOGRAPHY_GRADE_ORDER ??
  moledetCurriculumModule.MOLEDET_GEOGRAPHY_GRADE_ORDER;

const POP_MOLEDET_ENTRY = "https://pop.education.gov.il/tchumey_daat/moledet_hevra_ezrahut/yesodi/";

const OWNER_PDFS = {
  /** @type {const} */ homeland: "תוכנית משרד החינוך/homeland-curriculum.pdf",
  /** @type {const} */ vav: "תוכנית משרד החינוך/tochnit-vav.pdf",
  /** @type {const} */ geo56: "תוכנית משרד החינוך/tohnit-geography-5-6.pdf",
};

function ownerDocHint(gradeNum) {
  if (gradeNum <= 2) return [OWNER_PDFS.homeland];
  if (gradeNum <= 4) return [OWNER_PDFS.homeland];
  if (gradeNum === 5) return [OWNER_PDFS.geo56, OWNER_PDFS.vav];
  return [OWNER_PDFS.geo56, OWNER_PDFS.vav, OWNER_PDFS.homeland];
}

function build() {
  /** @type {Record<string, object>} */
  const out = {};
  for (const gk of MOLEDET_GEOGRAPHY_GRADE_ORDER) {
    const gradeNum = Number(gk.replace("g", ""));
    const slot = MOLEDET_GEOGRAPHY_GRADES[gk];
    const cur = slot.curriculum || {};
    /** @type {object[]} */
    const sections = [];
    let i = 0;
    for (const line of cur.focus || []) {
      i += 1;
      sections.push({
        sectionKey: `${gk}_focus_${i}`,
        labelHe: line,
        strand: "moledet_geography_integrated",
        confidence: "medium",
        mapsToNormalizedKeys: [`moledet.bank.${gk}`],
        notes: "ניסוח פנימי לפי קובץ האתר - דורש הצלבה ידנית מול PDF בעלים.",
      });
    }
    let j = 0;
    for (const line of cur.skills || []) {
      j += 1;
      sections.push({
        sectionKey: `${gk}_skill_${j}`,
        labelHe: line,
        strand: "moledet_geography_skills",
        confidence: "medium",
        mapsToNormalizedKeys: [`moledet.bank.${gk}`],
        notes: "",
      });
    }
    out[`grade_${gradeNum}`] = {
      gradeKey: gk,
      labelHe: slot.name,
      stage: slot.stage,
      sourcePortalUrl: POP_MOLEDET_ENTRY,
      sourceOwnerPdfs: ownerDocHint(gradeNum),
      sourceDoc: ownerDocHint(gradeNum).join(" · "),
      sections,
    };
  }
  return out;
}

export const MOLEDET_GEOGRAPHY_OFFICIAL_SUBSECTION_CATALOG = build();
