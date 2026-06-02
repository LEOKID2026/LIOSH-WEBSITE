/**
 * Parse Ministry science Curriculum2016.docx into grade × domain × topic/outcome rows.
 * Standalone oracle build only — not imported by runtime.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const GRADE_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו"];
const GRADE_NUM = Object.fromEntries(GRADE_LETTERS.map((l, i) => [l, i + 1]));

const DOMAIN_PREFIX = "תחום תוכן:";
const TOPIC_PREFIXES = ["נושא מרכזי:", "נושא מרכזי 1:", "נושא מרכזי 2:"];
const SKIP_PREFIXES = [
  "נושאי משנה",
  "רעיונות והדגשים",
  "ציוני דרך",
  "פעילויות לימודיות",
  "תוכן ואסטרטגיות",
  "נושא משנה",
  "בטיחות",
];

/** @typedef {{ grade: number, gradeLetter: string, domain: string, centralTopic: string, subtopic: string, rowKind: 'toc'|'subtopic_theme'|'learning_outcome', sourceAnchor: string }} ScienceParsedRow */

function cleanLine(line) {
  return String(line ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractParagraphsFromXml(xml) {
  /** @type {string[]} */
  const paras = [];
  const pRe = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  let m;
  while ((m = pRe.exec(xml))) {
    const seg = m[1];
    const tRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    /** @type {string[]} */
    const parts = [];
    let tm;
    while ((tm = tRe.exec(seg))) parts.push(tm[1]);
    const line = cleanLine(parts.join(""));
    if (line) paras.push(line);
  }
  return paras;
}

function readDocxParagraphs(docxPath) {
  const abs = path.resolve(docxPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Missing science DOCX: ${abs}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "science-docx-"));
  const zipPath = path.join(tmp, "science-curriculum2016.zip");
  const outDir = path.join(tmp, "out");
  fs.copyFileSync(abs, zipPath);
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "pipe" }
    );
  } else {
    execSync(`unzip -qo "${zipPath}" -d "${outDir}"`, { stdio: "pipe" });
  }
  const xmlPath = path.join(outDir, "word/document.xml");
  if (!fs.existsSync(xmlPath)) {
    throw new Error(`document.xml not found in ${docxPath}`);
  }
  return extractParagraphsFromXml(fs.readFileSync(xmlPath, "utf8"));
}

function isGradeHeader(line, allowPageSuffix = false) {
  if (allowPageSuffix) {
    return /^כיתה\s*[א-ו]\d*$/.test(line);
  }
  return /^כיתה\s*[א-ו]$/.test(line);
}

function gradeLetterFromHeader(line) {
  const m = line.match(/^כיתה\s*([א-ו])/);
  return m ? m[1] : null;
}

function parseDomain(line) {
  if (!line.startsWith(DOMAIN_PREFIX)) return null;
  return cleanLine(line.slice(DOMAIN_PREFIX.length));
}

function parseCentralTopic(line) {
  for (const prefix of TOPIC_PREFIXES) {
    if (line.startsWith(prefix)) {
      return cleanLine(line.slice(prefix.length));
    }
  }
  return null;
}

function isSkippableMeta(line) {
  return SKIP_PREFIXES.some((p) => line === p || line.startsWith(`${p}:`));
}

function findDetailedGradeSections(paras) {
  /** @type {{ grade: number, gradeLetter: string, start: number, end: number }[]} */
  const sections = [];
  for (let i = 0; i < paras.length; i++) {
    const line = paras[i];
    if (!isGradeHeader(line)) continue;
    const letter = gradeLetterFromHeader(line);
    const grade = letter ? GRADE_NUM[letter] : null;
    if (!grade || i < 800) continue;
    sections.push({ grade, gradeLetter: letter, start: i, end: paras.length });
  }
  /** @type {{ grade: number, gradeLetter: string, start: number, end: number }[]} */
  const deduped = [];
  for (const sec of sections) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.grade === sec.grade) continue;
    deduped.push(sec);
  }
  for (let i = 0; i < deduped.length; i++) {
    deduped[i].end = deduped[i + 1]?.start ?? paras.length;
  }
  return deduped;
}

function findTocGradeSections(paras) {
  /** @type {{ grade: number, gradeLetter: string, start: number, end: number }[]} */
  const sections = [];
  for (let i = 0; i < paras.length; i++) {
    const line = paras[i];
    if (!isGradeHeader(line, true)) continue;
    const letter = gradeLetterFromHeader(line);
    const grade = letter ? GRADE_NUM[letter] : null;
    if (!grade || i > 400) continue;
    sections.push({ grade, gradeLetter: letter, start: i, end: paras.length });
  }
  for (let i = 0; i < sections.length; i++) {
    sections[i].end = sections[i + 1]?.start ?? Math.min(sections[i].start + 20, paras.length);
  }
  return sections;
}

/**
 * @param {string[]} paras
 * @returns {{ rows: ScienceParsedRow[], summary: Record<number, { tocDomains: string[], outcomeCount: number }> }}
 */
export function parseScienceCurriculum2016Paragraphs(paras) {
  /** @type {ScienceParsedRow[]} */
  const rows = [];
  const summary = {};

  for (const sec of findTocGradeSections(paras)) {
    summary[sec.grade] = { tocDomains: [], outcomeCount: 0 };
    let domain = null;
    for (let i = sec.start + 1; i < sec.end; i++) {
      const line = paras[i];
      const d = parseDomain(line);
      if (d) {
        domain = d;
        summary[sec.grade].tocDomains.push(d);
        continue;
      }
      const topic = parseCentralTopic(line);
      if (topic && domain) {
        rows.push({
          grade: sec.grade,
          gradeLetter: sec.gradeLetter,
          domain,
          centralTopic: topic,
          subtopic: topic,
          rowKind: "toc",
          sourceAnchor: `science Curriculum2016.docx § TOC § כיתה ${sec.gradeLetter} § ${domain} § ${topic}`,
        });
      }
    }
  }

  for (const sec of findDetailedGradeSections(paras)) {
    if (!summary[sec.grade]) {
      summary[sec.grade] = { tocDomains: [], outcomeCount: 0 };
    }
    let domain = null;
    let centralTopic = null;
    let inSubtopicBlock = false;

    for (let i = sec.start + 1; i < sec.end; i++) {
      const line = paras[i];
      if (isGradeHeader(line) || /^כיתה\s*[ז-ט]/.test(line)) break;

      const d = parseDomain(line);
      if (d) {
        domain = d;
        centralTopic = null;
        inSubtopicBlock = false;
        if (!summary[sec.grade].tocDomains.includes(d)) {
          summary[sec.grade].tocDomains.push(d);
        }
        continue;
      }

      const topic = parseCentralTopic(line);
      if (topic) {
        centralTopic = topic;
        inSubtopicBlock = false;
        rows.push({
          grade: sec.grade,
          gradeLetter: sec.gradeLetter,
          domain: domain ?? "unknown_domain",
          centralTopic: topic,
          subtopic: topic,
          rowKind: "toc",
          sourceAnchor: `science Curriculum2016.docx § כיתה ${sec.gradeLetter} § ${domain ?? "domain"} § ${topic}`,
        });
        continue;
      }

      if (line === "נושאי משנה" || line === "נושאי משנה:") {
        inSubtopicBlock = true;
        continue;
      }

      if (isSkippableMeta(line)) {
        inSubtopicBlock = false;
        continue;
      }

      if (line.startsWith("התלמידים") && domain && centralTopic) {
        rows.push({
          grade: sec.grade,
          gradeLetter: sec.gradeLetter,
          domain,
          centralTopic,
          subtopic: line,
          rowKind: "learning_outcome",
          sourceAnchor: `science Curriculum2016.docx § כיתה ${sec.gradeLetter} § ${domain} § outcome`,
        });
        summary[sec.grade].outcomeCount += 1;
        continue;
      }

      if (
        inSubtopicBlock &&
        domain &&
        centralTopic &&
        line.length > 8 &&
        !/^\d+\s*שעות$/.test(line) &&
        !line.startsWith("הערה:")
      ) {
        rows.push({
          grade: sec.grade,
          gradeLetter: sec.gradeLetter,
          domain,
          centralTopic,
          subtopic: line,
          rowKind: "subtopic_theme",
          sourceAnchor: `science Curriculum2016.docx § כיתה ${sec.gradeLetter} § ${domain} § subtopic`,
        });
      }
    }
  }

  return { rows, summary };
}

export function parseScienceCurriculum2016Docx(docxPath) {
  const paras = readDocxParagraphs(docxPath);
  const parsed = parseScienceCurriculum2016Paragraphs(paras);
  return { ...parsed, paragraphCount: paras.length };
}

/** Map official Hebrew domain/topic text to product runtime topic ids. */
export const OFFICIAL_TO_PRODUCT_TOPICS = {
  life: ["body", "animals", "plants"],
  ecology: ["environment"],
  materials: ["materials"],
  energy: ["materials", "experiments"],
  earth: ["earth_space"],
  technology: ["experiments"],
};

export function classifyOfficialRow(row) {
  const blob = `${row.domain} ${row.centralTopic} ${row.subtopic}`;
  /** @type {Set<string>} */
  const hits = new Set();
  if (/מדעי החיים|יצורים חיים|ביולוגיה|בריאות/.test(blob)) {
    OFFICIAL_TO_PRODUCT_TOPICS.life.forEach((t) => hits.add(t));
  }
  if (/אקולוג|סביבה/.test(blob)) {
    OFFICIAL_TO_PRODUCT_TOPICS.ecology.forEach((t) => hits.add(t));
  }
  if (/חומר|כימיה|מסה|נפח|תערוב/.test(blob)) {
    OFFICIAL_TO_PRODUCT_TOPICS.materials.forEach((t) => hits.add(t));
  }
  if (/אנרגיה|חשמל|אור|קול|מגנט|פיזיקה/.test(blob)) {
    OFFICIAL_TO_PRODUCT_TOPICS.energy.forEach((t) => hits.add(t));
  }
  if (/כדור הארץ|אסטרונומ|יקום|מזג|אקלים|מים|סלע/.test(blob)) {
    OFFICIAL_TO_PRODUCT_TOPICS.earth.forEach((t) => hits.add(t));
  }
  if (/טכנולוג|הנדס|מערכות טכנול/.test(blob)) {
    OFFICIAL_TO_PRODUCT_TOPICS.technology.forEach((t) => hits.add(t));
  }
  if (/ניסוי|חקיר|התלמידים/.test(blob)) {
    hits.add("experiments");
  }
  return [...hits];
}

/**
 * Compare product SCIENCE_GRADES topics to parsed official rows for one grade.
 * @param {number} grade
 * @param {string[]} productTopics
 * @param {ScienceParsedRow[]} officialRows
 */
export function compareGradeProductToOfficial(grade, productTopics, officialRows) {
  const gradeOfficial = officialRows.filter((r) => r.grade === grade);
  /** @type {Set<string>} */
  const backed = new Set();
  for (const row of gradeOfficial) {
    for (const t of classifyOfficialRow(row)) backed.add(t);
  }
  const covered = productTopics.filter((t) => backed.has(t));
  const notCovered = productTopics.filter((t) => !backed.has(t));
  return { grade, productTopics, covered, notCovered, officialRowCount: gradeOfficial.length };
}
