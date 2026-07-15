/**
 * Parse Grade 1 learning-book draft markdown into structured page data.
 * Scoped to the draft format in docs/learning-book/math/g1/drafts/
 */

const EXPECTED_SECTION_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Strip draft markers, backticks, and stray English metadata from visible titles.
 * @param {string} title
 */
export function cleanDisplayTitle(title) {
  let t = String(title || "").trim();
  t = t.replace(/\s*\[DRAFT\s*[–-]\s*not owner-approved\]\s*/gi, "");
  t = t.replace(/`/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/**
 * Child-facing copy for section 7 (practice preview): drop the redundant
 * "בואו נתרגל -" opener and decorative quotes / orphan periods around examples.
 * @param {string} body
 * @returns {string}
 */
export function normalizePracticeSectionBody(body) {
  return String(body || "")
    .split("\n")
    .map((line) => {
      let t = line.trim();
      if (!t) return "";

      t = t.replace(/^בואו נתרגל\s*[–-]\s*/u, "");
      t = t.replace(/[\u201C\u201D\u201E\u00AB\u00BB"]/gu, "");
      t = t.replace(/\?\./g, "?");

      return t;
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * @param {string} raw
 * @param {string} pageId
 */
export function parseLearningPageMarkdown(raw, pageId) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const h1 = lines.find((line) => line.startsWith("# "));
  const documentTitle = cleanDisplayTitle(h1 ? h1.slice(2).trim() : pageId);

  const metadata = parseMetadataTable(raw);
  const displayTitle = cleanDisplayTitle(metadata.title_hebrew || documentTitle);

  const sections = parseNumberedSections(raw);

  return {
    pageId,
    documentTitle,
    displayTitle,
    metadata: {
      learning_page_id: metadata.learning_page_id || `math:g1:${pageId}`,
      skill_id: metadata.skill_id || "",
      subject: metadata.subject || "math",
      grade: metadata.grade || "g1",
      age_band: metadata.age_band || "grades_1_2",
      page_type: metadata.page_type || "",
      approval_status: metadata.approval_status || "draft",
      title_hebrew: cleanDisplayTitle(metadata.title_hebrew || displayTitle),
    },
    sections,
  };
}

function parseMetadataTable(raw) {
  /** @type {Record<string, string>} */
  const meta = {};
  const tableSection = raw.match(/## Metadata[\s\S]*?\n---/);
  if (!tableSection) return meta;

  const rows = tableSection[0]
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line));

  for (const row of rows) {
    const cells = row
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 2 || !cells[0].includes("**")) continue;

    const key = cells[0]
      .replace(/\*\*/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const value = cells[1].replace(/^`|`$/g, "").trim();
    meta[key] = value;
  }

  return meta;
}

function parseNumberedSections(raw) {
  const headerRe = /^## (\d+)\.\s*(.+)$/gm;
  /** @type {{ number: number, title: string, bodyStart: number, headerStart: number }[]} */
  const headers = [];
  let match;

  while ((match = headerRe.exec(raw)) !== null) {
    const number = Number(match[1]);
    if (number < 1 || number > 7) continue;
    headers.push({
      number,
      title: match[2].trim(),
      headerStart: match.index,
      bodyStart: headerRe.lastIndex,
    });
  }

  return headers.map((header, index) => {
    const nextStart = headers[index + 1]?.headerStart ?? raw.length;
    let body = raw.slice(header.bodyStart, nextStart).trim();
    if (header.number === 7) {
      body = normalizePracticeSectionBody(body);
    }
    return { number: header.number, title: header.title, body };
  }).sort((a, b) => a.number - b.number);
}

/**
 * @param {{ pageId: string, sections: { number: number }[] }} page
 */
export function assertMathG1PageSections(page) {
  const numbers = page.sections.map((s) => s.number).sort((a, b) => a - b);
  const ok =
    numbers.length === EXPECTED_SECTION_NUMBERS.length &&
    EXPECTED_SECTION_NUMBERS.every((n, i) => numbers[i] === n);

  if (!ok) {
    throw new Error(
      `[learning-book] ${page.pageId}.md must have sections 1–7; found: ${
        numbers.length ? numbers.join(", ") : "none"
      }`
    );
  }
}
