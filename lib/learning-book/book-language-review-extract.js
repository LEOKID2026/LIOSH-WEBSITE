/**
 * Extract child-visible book text for manual language review (no content mutation).
 */

import fs from "fs";
import path from "path";
import { LEARNING_BOOK_CATALOG_LIST } from "./learning-book-catalog.js";
import {
  getLearningBookSubjectLabelHe,
  getLearningBookTileTitle,
} from "./learning-book-catalog-meta.js";
import { flattenBookSectionVisibleLines } from "./book-visible-text-render.js";
import { getSectionDisplayTitle } from "./section-display-labels.js";

const EXCLUDED_BOOK_KEYS = new Set(["moledet:g1", "geography:g1"]);

const SUBJECT_REVIEW_LABEL = {
  math: "Math",
  geometry: "Geometry",
  science: "Science",
  hebrew: "Hebrew",
  english: "English",
  moledet: "Moledet",
  geography: "Geography",
};

const SUBJECT_SORT_ORDER = [
  "math",
  "geometry",
  "science",
  "hebrew",
  "english",
  "moledet",
  "geography",
];

const GRADE_SORT_ORDER = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** @type {Record<string, number>} */
const MAX_WORDS_BY_GRADE = {
  g1: 50,
  g2: 65,
  g3: 80,
  g4: 95,
  g5: 110,
  g6: 130,
};

const HEBREW_CHAR = /[\u0590-\u05FF]/;
const LATIN_CHAR = /[A-Za-z]/;
const DIGIT = /\d/;

const ADULT_HEbrew =
  /(?:יתר\s+על\s+כן|לפיכך|בהקשר|מסגרת|בהתאם|הינו|על\s+מנת|בטרם|לרבות|מנגנון|במובן\s+הזה|באופן\s+משמעותי)/u;
const ADULT_ENGLISH =
  /\b(?:furthermore|nevertheless|moreover|utilize|facilitate|consequently|therefore|regarding|pertaining|implement|leverage|paradigm)\b/i;
const INSTRUCTION_HEbrew =
  /(?:^|\s|\*\*)(?:נסו|חשבו|כתבו|קראו|סמנו|בחרו|השלימו|מצאו|פתרו|הסבירו|ציירו|ספרו|התחילו|הוסיפו|זכרו|שימו\s+לב|ענו|השוו|הקיפו|מדדו|בדקו)(?:\s|$|\*\*)/u;
const INSTRUCTION_ENGLISH =
  /\b(?:try|calculate|write|read|mark|choose|complete|find|solve|explain|draw|count|remember|note|look|answer|compare|measure|check)\b/i;
const FACTUAL_CLAIM =
  /(?:תמיד|לעולם|אף\s+פעם|\bnever\b|\balways\b|\bmust\b|הוכח|מוכיח|מדענים|\bscientists\b|according\s+to|\d+\s*(?:מטר|ק"מ|km|ק"ג|kg|שנ(?:ה|ים)?|years?))/iu;
const PLACEHOLDER =
  /(?:TODO|TBD|FIXME|\bXXX\b|\[\.\.\.\]|\bplaceholder\b|\blorem\b|\bPLACEHOLDER\b|\[\.\.\.|\.\.\.\])/i;
const DRAFT_MARKER = /(?:\[DRAFT|not\s+owner-approved|owner-approved\])/i;
const VERIFY_MARKER = /(?:\bVERIFY\b|CHECK\s+ME|NEEDS\s+REVIEW|\bTBD\b)/i;
const FORMULA_SYMBOLS = /[+\-×÷=<>≤≥≠±√∞^*/\\]|(?:\d\s*[+\-×÷=]\s*\d)/;
const RTL_LTR_MIX =
  /[\u0590-\u05FF][A-Za-z0-9]|[A-Za-z0-9][\u0590-\u05FF]|[\u0590-\u05FF].*[A-Za-z].*[\u0590-\u05FF]/u;

/**
 * @param {string} text
 * @returns {"he"|"en"|"mixed"}
 */
export function detectLanguage(text) {
  const value = String(text || "");
  const hasHe = HEBREW_CHAR.test(value);
  const hasEn = LATIN_CHAR.test(value);
  if (hasHe && hasEn) return "mixed";
  if (hasHe) return "he";
  if (hasEn) return "en";
  if (DIGIT.test(value)) return "mixed";
  return "he";
}

/**
 * @param {string} text
 * @param {string} grade
 * @returns {string[]}
 */
export function computeReviewFlags(text, grade) {
  const value = String(text || "").trim();
  /** @type {string[]} */
  const flags = [];
  if (!value) return flags;

  const words = value.split(/\s+/).filter(Boolean);
  const maxWords = MAX_WORDS_BY_GRADE[grade] ?? 130;
  if (words.length > maxWords) flags.push("too_long_for_grade");

  if (ADULT_HEbrew.test(value) || ADULT_ENGLISH.test(value)) {
    flags.push("possible_adult_language");
  }

  const lang = detectLanguage(value);
  if (lang === "mixed") flags.push("mixed_language");

  if (FORMULA_SYMBOLS.test(value)) flags.push("contains_formula_or_symbols");
  if (RTL_LTR_MIX.test(value)) flags.push("contains_directional_rtl_ltr_mix");
  if (FACTUAL_CLAIM.test(value)) flags.push("possible_factual_claim");
  if (INSTRUCTION_HEbrew.test(value) || INSTRUCTION_ENGLISH.test(value)) {
    flags.push("possible_instruction");
  }
  if (PLACEHOLDER.test(value)) flags.push("possible_placeholder");
  if (DRAFT_MARKER.test(value)) flags.push("draft_marker_found");
  if (VERIFY_MARKER.test(value)) flags.push("verify_marker_found");

  return flags;
}

function countWords(text) {
  return String(text || "")
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * @typedef {{
 *   subject: string,
 *   grade: string,
 *   bookId: string,
 *   bookTitleHe: string,
 *   catalogTileLine1: string,
 *   catalogTileLine2: string,
 *   batches: { id: string, titleHe: string }[],
 *   pages: PageExtract[],
 *   warnings: string[],
 * }} BookExtractResult
 */

/**
 * @typedef {{
 *   pageIndex: number,
 *   pageId: string,
 *   sourceFile: string,
 *   learningPageId: string,
 *   skillId: string,
 *   displayTitle: string,
 *   sections: SectionExtract[],
 *   warnings: string[],
 * }} PageExtract
 */

/**
 * @typedef {{
 *   number: number,
 *   rawTitle: string,
 *   displayTitle: string,
 *   blocks: TextBlock[],
 * }} SectionExtract
 */

/**
 * @typedef {{
 *   subject: string,
 *   grade: string,
 *   book_id: string,
 *   page_id: string,
 *   learning_page_id: string,
 *   skill_id: string,
 *   source_file: string,
 *   section_number: number|null,
 *   section_title: string,
 *   text_type: string,
 *   language_detected: "he"|"en"|"mixed",
 *   visible_text: string,
 *   word_count: number,
 *   character_count: number,
 *   review_flags: string[],
 *   extraction_warning: string|null,
 * }} TextBlock
 */

/**
 * @param {string} root
 * @param {typeof LEARNING_BOOK_CATALOG_LIST[number]} entry
 * @param {typeof import("./parse-learning-page-markdown.js").parseLearningPageMarkdown} parseLearningPageMarkdown
 */
export function extractBookLanguageReview(root, entry, parseLearningPageMarkdown) {
  const { subject, grade } = entry;
  const bookId = `${subject}:${grade}`;
  const draftsDir = String(entry.meta.draftsDir || "");

  /** @type {BookExtractResult} */
  const result = {
    subject,
    grade,
    bookId,
    bookTitleHe: String(entry.meta.bookTitleHe || ""),
    catalogTileLine1: "",
    catalogTileLine2: "",
    batches: entry.registry.batches.map((b) => ({
      id: b.id,
      titleHe: b.titleHe,
    })),
    pages: [],
    warnings: [],
  };

  const tile = getLearningBookTileTitle(subject, grade);
  result.catalogTileLine1 = tile.line1;
  result.catalogTileLine2 = tile.line2;

  const pageOrder = entry.registry.pageOrder;
  for (let pageIndex = 0; pageIndex < pageOrder.length; pageIndex += 1) {
    const pageId = pageOrder[pageIndex];
    const sourceFile = path.join(draftsDir, `${pageId}.md`).replace(/\\/g, "/");
    const sourceAbs = path.join(root, sourceFile);

    /** @type {PageExtract} */
    const pageExtract = {
      pageIndex: pageIndex + 1,
      pageId,
      sourceFile,
      learningPageId: "",
      skillId: "",
      displayTitle: "",
      sections: [],
      warnings: [],
    };

    if (!fs.existsSync(sourceAbs)) {
      const msg = `Missing draft: ${sourceFile}`;
      result.warnings.push(msg);
      pageExtract.warnings.push(msg);
      result.pages.push(pageExtract);
      continue;
    }

    const raw = fs.readFileSync(sourceAbs, "utf8");
    let page;
    try {
      page = parseLearningPageMarkdown(raw, pageId);
    } catch (err) {
      const msg = `Parse error ${sourceFile}: ${err instanceof Error ? err.message : String(err)}`;
      result.warnings.push(msg);
      pageExtract.warnings.push(msg);
      result.pages.push(pageExtract);
      continue;
    }

    pageExtract.learningPageId = page.metadata.learning_page_id || `${subject}:${grade}:${pageId}`;
    pageExtract.skillId = page.metadata.skill_id || "";
    pageExtract.displayTitle = page.displayTitle || page.documentTitle || pageId;

    /** @type {TextBlock} */
    const makeBlock = (fields) => {
      const visibleText = String(fields.visible_text || "").trim();
      const block = {
        subject,
        grade,
        book_id: bookId,
        page_id: pageId,
        learning_page_id: pageExtract.learningPageId,
        skill_id: pageExtract.skillId,
        source_file: sourceFile,
        section_number: fields.section_number ?? null,
        section_title: fields.section_title ?? "",
        text_type: fields.text_type,
        language_detected: detectLanguage(visibleText),
        visible_text: visibleText,
        word_count: countWords(visibleText),
        character_count: visibleText.length,
        review_flags: computeReviewFlags(visibleText, grade),
        extraction_warning: fields.extraction_warning ?? null,
      };
      return block;
    };

    for (const section of page.sections) {
      const displayTitle = getSectionDisplayTitle(section.title);
      /** @type {SectionExtract} */
      const sectionExtract = {
        number: section.number,
        rawTitle: section.title,
        displayTitle,
        blocks: [],
      };

      sectionExtract.blocks.push(
        makeBlock({
          text_type: "section_heading",
          section_number: section.number,
          section_title: displayTitle,
          visible_text: displayTitle,
        })
      );

      const { lines, diagramLines } = flattenBookSectionVisibleLines(section.body);

      for (const row of lines) {
        const visible = row.rendered || row.source;
        let extractionWarning = null;
        if (row.source !== row.rendered) {
          extractionWarning = "source_render_mismatch";
        }
        sectionExtract.blocks.push(
          makeBlock({
            text_type: "body_line",
            section_number: section.number,
            section_title: displayTitle,
            visible_text: visible,
            extraction_warning: extractionWarning,
          })
        );
      }

      for (const dl of diagramLines) {
        sectionExtract.blocks.push(
          makeBlock({
            text_type: "diagram_caption",
            section_number: section.number,
            section_title: displayTitle,
            visible_text: dl,
          })
        );
      }

      if (!lines.length && !diagramLines.length) {
        const msg = `Empty section body: ${pageId} §${section.number}`;
        pageExtract.warnings.push(msg);
        sectionExtract.blocks.push(
          makeBlock({
            text_type: "empty_section",
            section_number: section.number,
            section_title: displayTitle,
            visible_text: "",
            extraction_warning: msg,
          })
        );
      }

      pageExtract.sections.push(sectionExtract);
    }

    result.pages.push(pageExtract);
  }

  return result;
}

/**
 * @param {string} root
 * @param {typeof import("./parse-learning-page-markdown.js").parseLearningPageMarkdown} parseLearningPageMarkdown
 */
export function extractAllBooksWithParser(root, parseLearningPageMarkdown) {
  /** @type {string[]} */
  const globalWarnings = [];

  const books = LEARNING_BOOK_CATALOG_LIST.filter((entry) => {
    if (entry.status !== "authored") return false;
    const key = `${entry.subject}:${entry.grade}`;
    if (EXCLUDED_BOOK_KEYS.has(key)) {
      globalWarnings.push(`Excluded out-of-scope book: ${key}`);
      return false;
    }
    return true;
  }).sort((a, b) => {
    const si =
      SUBJECT_SORT_ORDER.indexOf(a.subject) - SUBJECT_SORT_ORDER.indexOf(b.subject);
    if (si !== 0) return si;
    return GRADE_SORT_ORDER.indexOf(a.grade) - GRADE_SORT_ORDER.indexOf(b.grade);
  });

  /** @type {BookExtractResult[]} */
  const extracted = [];
  for (const entry of books) {
    extracted.push(extractBookLanguageReview(root, entry, parseLearningPageMarkdown));
    globalWarnings.push(...extracted[extracted.length - 1].warnings);
  }

  return { books: extracted, globalWarnings };
}

/**
 * @param {BookExtractResult} book
 */
export function renderBookReviewMarkdown(book) {
  const subjectLabel = SUBJECT_REVIEW_LABEL[book.subject] || book.subject;
  const gradeUpper = book.grade.toUpperCase();
  const subjectHe = getLearningBookSubjectLabelHe(book.subject);

  /** @type {string[]} */
  const lines = [];
  lines.push(`# ${subjectLabel} ${gradeUpper} - Book Text Review`);
  lines.push("");
  lines.push(`Subject: ${subjectLabel} (${subjectHe})`);
  lines.push(`Grade: ${gradeUpper}`);
  lines.push(`Book ID: \`${book.bookId}\``);
  lines.push(`Book title: ${book.bookTitleHe}`);
  lines.push(`Catalog tile: ${book.catalogTileLine1} / ${book.catalogTileLine2}`);
  lines.push(`Pages: ${book.pages.length}`);
  lines.push("");

  if (book.batches.length) {
    lines.push("## Table of contents batches");
    lines.push("");
    for (const batch of book.batches) {
      lines.push(`- **${batch.id}** - ${batch.titleHe}`);
    }
    lines.push("");
  }

  for (const page of book.pages) {
    const pageNum = String(page.pageIndex).padStart(2, "0");
    lines.push(`## Page ${pageNum} - ${page.pageId}`);
    lines.push("");
    lines.push(`Source: \`${page.sourceFile}\``);
    lines.push(`Learning page id: \`${page.learningPageId}\``);
    lines.push(`Skill id: \`${page.skillId}\``);
    lines.push(`Target grade: ${gradeUpper}`);
    lines.push(`Subject: ${subjectLabel}`);
    lines.push("");

    lines.push("### Title");
    lines.push("");
    lines.push(page.displayTitle || "_(missing title)_");
    lines.push("");

    if (page.warnings.length) {
      lines.push("> Extraction warnings:");
      for (const w of page.warnings) {
        lines.push(`> - ${w}`);
      }
      lines.push("");
    }

    for (const section of page.sections) {
      lines.push(`### Section ${section.number} - ${section.displayTitle}`);
      lines.push("");
      if (section.rawTitle !== section.displayTitle) {
        lines.push(`_(Source heading: ${section.rawTitle})_`);
        lines.push("");
      }

      for (const block of section.blocks) {
        if (block.text_type === "section_heading") continue;
        if (!block.visible_text && block.text_type === "empty_section") {
          lines.push("_(empty section body)_");
          lines.push("");
          continue;
        }
        if (!block.visible_text) continue;

        if (block.text_type === "diagram_caption") {
          lines.push(`_(diagram caption)_ ${block.visible_text}`);
        } else {
          lines.push(block.visible_text);
        }

        if (block.review_flags.length) {
          lines.push("");
          lines.push(`> Review flags: ${block.review_flags.join(", ")}`);
        }
        if (block.extraction_warning) {
          lines.push(`> Extraction warning: ${block.extraction_warning}`);
        }
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Flatten all text blocks from extracted books for JSON export.
 * @param {BookExtractResult[]} books
 */
export function flattenTextBlocks(books) {
  /** @type {TextBlock[]} */
  const blocks = [];

  for (const book of books) {
    blocks.push({
      subject: book.subject,
      grade: book.grade,
      book_id: book.bookId,
      page_id: "_book",
      learning_page_id: "",
      skill_id: "",
      source_file: String(book.pages[0]?.sourceFile || "").replace(/\/[^/]+$/, ""),
      section_number: null,
      section_title: "",
      text_type: "book_title",
      language_detected: detectLanguage(book.bookTitleHe),
      visible_text: book.bookTitleHe,
      word_count: countWords(book.bookTitleHe),
      character_count: book.bookTitleHe.length,
      review_flags: computeReviewFlags(book.bookTitleHe, book.grade),
      extraction_warning: null,
    });

    for (const tileLine of [book.catalogTileLine1, book.catalogTileLine2]) {
      if (!tileLine) continue;
      blocks.push({
        subject: book.subject,
        grade: book.grade,
        book_id: book.bookId,
        page_id: "_catalog",
        learning_page_id: "",
        skill_id: "",
        source_file: "",
        section_number: null,
        section_title: "",
        text_type: "catalog_tile_label",
        language_detected: detectLanguage(tileLine),
        visible_text: tileLine,
        word_count: countWords(tileLine),
        character_count: tileLine.length,
        review_flags: computeReviewFlags(tileLine, book.grade),
        extraction_warning: null,
      });
    }

    for (const batch of book.batches) {
      blocks.push({
        subject: book.subject,
        grade: book.grade,
        book_id: book.bookId,
        page_id: "_toc",
        learning_page_id: "",
        skill_id: "",
        source_file: "",
        section_number: null,
        section_title: batch.id,
        text_type: "toc_batch_title",
        language_detected: detectLanguage(batch.titleHe),
        visible_text: batch.titleHe,
        word_count: countWords(batch.titleHe),
        character_count: batch.titleHe.length,
        review_flags: computeReviewFlags(batch.titleHe, book.grade),
        extraction_warning: null,
      });
    }

    for (const page of book.pages) {
      blocks.push({
        subject: book.subject,
        grade: book.grade,
        book_id: book.bookId,
        page_id: page.pageId,
        learning_page_id: page.learningPageId,
        skill_id: page.skillId,
        source_file: page.sourceFile,
        section_number: null,
        section_title: "",
        text_type: "page_title",
        language_detected: detectLanguage(page.displayTitle),
        visible_text: page.displayTitle,
        word_count: countWords(page.displayTitle),
        character_count: page.displayTitle.length,
        review_flags: computeReviewFlags(page.displayTitle, book.grade),
        extraction_warning: page.warnings.length ? page.warnings.join("; ") : null,
      });

      for (const section of page.sections) {
        for (const block of section.blocks) {
          blocks.push({
            subject: book.subject,
            grade: book.grade,
            book_id: book.bookId,
            page_id: page.pageId,
            learning_page_id: page.learningPageId,
            skill_id: page.skillId,
            source_file: page.sourceFile,
            section_number: section.number,
            section_title: section.displayTitle,
            text_type: block.text_type,
            language_detected: block.language_detected,
            visible_text: block.visible_text,
            word_count: block.word_count,
            character_count: block.character_count,
            review_flags: block.review_flags,
            extraction_warning: block.extraction_warning,
          });
        }
      }
    }
  }

  return blocks;
}

export { SUBJECT_REVIEW_LABEL, EXCLUDED_BOOK_KEYS };
