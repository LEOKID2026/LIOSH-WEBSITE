/**
 * Shared Science grade book content verification (documentation only).
 */
import fs from "fs";
import path from "path";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../../lib/learning-book/parse-learning-page-markdown.js";

export const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|science-master\?|resolveScience|getScience.*Practice/i;
export const UNSAFE_RE =
  /חשמל בית|שקע|להדליק אש|ניסוי כימי|חומצ|מעגל חשמלי סגור|חברו נורה|חברו סוללה|בנו מעגל/i;
export const CIRCUIT_BUILD_RE =
  /חבר.*(נורה|סוללה)|בנה.*מעגל|הרכיבו.*מעגל|חיווט/i;

export function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

export function sectionBody(page, num) {
  const s = page.sections.find((x) => x.number === num);
  return s ? s.body : "";
}

/**
 * @param {object} opts
 * @param {string} opts.gradeKey e.g. g3
 * @param {string} opts.ageBand e.g. grades_3_4
 * @param {string} opts.draftsDir
 * @param {string[]} opts.pageOrder
 * @param {Record<string, string[]>} opts.alignmentAnchors
 * @param {Record<string, { skillId: string }>} [opts.pageMeta]
 * @param {string[]} [opts.forbiddenPageIds]
 * @param {(pageId: string, childFacing: string, raw: string) => string[]} [opts.extraChecks]
 */
export function verifyScienceGradeBookContent(opts) {
  const errors = [];
  const markdownNotes = [];
  const { gradeKey, ageBand, draftsDir, pageOrder, alignmentAnchors, pageMeta = {} } =
    opts;

  for (const forbidden of opts.forbiddenPageIds || []) {
    if (fs.existsSync(path.join(draftsDir, `${forbidden}.md`))) {
      errors.push(`Forbidden page must not exist: ${forbidden}.md`);
    }
  }

  for (const pageId of pageOrder) {
    const filePath = path.join(draftsDir, `${pageId}.md`);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing: ${pageId}.md`);
      continue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const page = parseLearningPageMarkdown(raw, pageId);

    try {
      assertMathG1PageSections(page);
    } catch (e) {
      errors.push(e.message);
    }

    if (readMetadataField(raw, "approval_status") !== "draft") {
      errors.push(`${pageId}: approval_status must be draft`);
    }
    if (!readMetadataField(raw, "title_hebrew").includes("[DRAFT")) {
      errors.push(`${pageId}: title_hebrew missing DRAFT marker`);
    }
    if (readMetadataField(raw, "grade") !== gradeKey) {
      errors.push(`${pageId}: grade must be ${gradeKey}`);
    }
    if (readMetadataField(raw, "age_band") !== ageBand) {
      errors.push(`${pageId}: age_band must be ${ageBand}`);
    }
    if (readMetadataField(raw, "subject") !== "science") {
      errors.push(`${pageId}: subject must be science`);
    }

    const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
    const expectedId = `science:${gradeKey}:${pageId}`;
    if (learningPageId !== expectedId) {
      errors.push(
        `${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`
      );
    }

    const meta = pageMeta[pageId];
    const skillId = readMetadataField(raw, "skill_id").replace(/^`|`$/g, "");
    if (meta && skillId !== meta.skillId) {
      errors.push(`${pageId}: skill_id must be ${meta.skillId}`);
    }

    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (/\[DRAFT/i.test(childFacing)) {
      errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
    }
    if (FAKE_PRACTICE_RE.test(childFacing)) {
      errors.push(`${pageId}: Section body contains fake practice routing`);
    }
    if (UNSAFE_RE.test(childFacing)) {
      errors.push(`${pageId}: child-facing body may contain unsafe content markers`);
    }
    if (CIRCUIT_BUILD_RE.test(childFacing)) {
      errors.push(`${pageId}: circuit-building instructions not allowed`);
    }
    if (/science:topic:/i.test(childFacing)) {
      errors.push(`${pageId}: internal skill_id exposed in child-facing body`);
    }
    if (!/מדעים/.test(childFacing)) {
      errors.push(`${pageId}: child-facing body should mention מדעים at least once`);
    }

    const s5 = sectionBody(page, 5);
    const s6 = sectionBody(page, 6);
    const s7 = sectionBody(page, 7);
    if (FAKE_PRACTICE_RE.test(s7)) {
      errors.push(`${pageId}: Section 7 contains fake practice routing`);
    }

    const anchors = alignmentAnchors[pageId] || [];
    for (const anchor of anchors) {
      if (!s5.includes(anchor)) {
        errors.push(`${pageId}: §5 missing alignment anchor "${anchor}"`);
      }
      if (!s6.includes(anchor)) {
        errors.push(`${pageId}: §6 missing alignment anchor "${anchor}"`);
      }
    }

    if (opts.extraChecks) {
      errors.push(...opts.extraChecks(pageId, childFacing, raw));
    }

    if (/\*\*[^*]+\*\*/.test(childFacing)) {
      markdownNotes.push(`${pageId}: possible raw ** markdown in child-facing body`);
    }
    if (/```|^\s*\|.*\|.*\|/m.test(childFacing)) {
      markdownNotes.push(`${pageId}: code fence or table-like structure in child-facing body`);
    }
  }

  return { errors, markdownNotes, pageCount: pageOrder.length };
}
