#!/usr/bin/env node
/**
 * Math + Geometry Content Sync — embed approved export txt into website markdown.
 * Preserves :::geometry-diagram::: and image blocks in geometry sections.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];

const SUBJECTS = {
  math: {
    txtRoot: path.join(ROOT, "exports/audio-text/books/math"),
    expectedPages: { g1: 133, g2: 154, g3: 189, g4: 259, g5: 280, g6: 308 },
    total: 1323,
    preserveDiagrams: false,
  },
  geometry: {
    txtRoot: path.join(ROOT, "exports/audio-text/books/geometry"),
    expectedPages: { g1: 21, g2: 21, g3: 63, g4: 98, g5: 126, g6: 133 },
    total: 462,
    preserveDiagrams: true,
  },
};

const DIAGRAM_RE = /:::geometry-diagram[\s\S]*?:::/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/g;

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

function normalizeText(s) {
  return String(s || "").replace(/\r\n/g, "\n").trim();
}

function extractPreservedBlocks(body) {
  const diagrams = body.match(DIAGRAM_RE) || [];
  const images = body.match(IMAGE_RE) || [];
  return [...diagrams, ...images];
}

function stripPreservedBlocks(body) {
  return normalizeText(String(body || "").replace(DIAGRAM_RE, "").replace(IMAGE_RE, ""));
}

/**
 * @param {string} txtBody
 * @param {string} originalBody
 * @param {boolean} preserveDiagrams
 */
function buildSectionBody(txtBody, originalBody, preserveDiagrams) {
  const txt = normalizeText(txtBody);
  if (!preserveDiagrams) return txt;

  const blocks = extractPreservedBlocks(originalBody);
  if (blocks.length === 0) return txt;
  if (DIAGRAM_RE.test(txt) || IMAGE_RE.test(txt)) return txt;

  return `${blocks.join("\n\n")}\n\n${txt}`;
}

/** @returns {{ byFile: Map<string, Map<number, string>>, mapping: object[], diagramActions: object[] }} */
function collectSectionUpdates(subject, config) {
  /** @type {Map<string, Map<number, string>>} */
  const byFile = new Map();
  /** @type {object[]} */
  const mapping = [];
  /** @type {object[]} */
  const diagramActions = [];

  for (const grade of GRADES) {
    const entry = getLearningBookEntry(subject, grade);
    if (!entry) throw new Error(`Missing ${subject} catalog entry: ${grade}`);

    let pageNumber = 0;
    for (const page of entry.loader.loadAllPages()) {
      const mdRel = `${entry.registry.meta.draftsDir}/${page.pageId}.md`.replace(/\\/g, "/");

      for (const section of page.sections) {
        pageNumber += 1;
        const txtPath = path.join(
          config.txtRoot,
          `${subject}-${grade}`,
          "pages",
          `page-${padPageNum(pageNumber)}.txt`
        );

        if (!fs.existsSync(txtPath)) {
          throw new Error(`Missing approved txt: ${txtPath}`);
        }

        const txtBody = normalizeText(fs.readFileSync(txtPath, "utf8"));
        const originalSectionBody = section.body;
        const nextBody = buildSectionBody(txtBody, originalSectionBody, config.preserveDiagrams);

        if (config.preserveDiagrams) {
          const hadBlocks = extractPreservedBlocks(originalSectionBody).length > 0;
          const keptBlocks = extractPreservedBlocks(nextBody);
          if (hadBlocks) {
            diagramActions.push({
              md: mdRel,
              section: section.number,
              pageNum: pageNumber,
              action: keptBlocks.length ? "preserved" : "lost",
              blocks: keptBlocks.length,
            });
          }
        }

        if (!byFile.has(mdRel)) byFile.set(mdRel, new Map());
        byFile.get(mdRel).set(section.number, nextBody);

        mapping.push({
          subject,
          grade,
          pageNum: pageNumber,
          txt: `${subject}-${grade}/pages/page-${padPageNum(pageNumber)}.txt`,
          md: mdRel,
          section: section.number,
          topicId: page.pageId,
        });
      }
    }

    if (pageNumber !== config.expectedPages[grade]) {
      throw new Error(`${subject}-${grade}: expected ${config.expectedPages[grade]} pages, got ${pageNumber}`);
    }
  }

  return { byFile, mapping, diagramActions };
}

/**
 * @param {string} raw
 * @param {Map<number, string>} sectionBodies
 */
function patchMarkdownSections(raw, sectionBodies) {
  const headerRe = /^## (\d+)\.\s*.+$/gm;
  const matches = [...raw.matchAll(headerRe)].filter((m) => {
    const n = Number(m[1]);
    return n >= 1 && n <= 7;
  });

  if (matches.length !== 7) {
    throw new Error(`Expected 7 numbered sections, found ${matches.length}`);
  }

  const prefix = raw.slice(0, matches[0].index);
  let out = prefix;

  for (let i = 0; i < matches.length; i++) {
    const num = Number(matches[i][1]);
    const titleLine = matches[i][0];
    const body = sectionBodies.get(num);
    if (body == null) {
      throw new Error(`Missing txt body for section ${num}`);
    }
    out += `${titleLine}\n\n${body.trim()}`;
    if (i < matches.length - 1) {
      out += "\n\n---\n\n";
    } else {
      out += "\n";
    }
  }

  return out;
}

/** @type {object} */
const fullReport = { subjects: {} };

for (const [subject, config] of Object.entries(SUBJECTS)) {
  const { byFile, mapping, diagramActions } = collectSectionUpdates(subject, config);
  const changedFiles = [];

  for (const [mdRel, sectionBodies] of byFile.entries()) {
    const mdPath = path.join(ROOT, mdRel);
    const original = fs.readFileSync(mdPath, "utf8");
    const next = patchMarkdownSections(original, sectionBodies);

    if (next !== original) {
      fs.writeFileSync(mdPath, next, "utf8");
      changedFiles.push(mdRel);
    }

    const parsed = parseLearningPageMarkdown(next, path.basename(mdPath, ".md"));
    if (parsed.sections.length !== 7) {
      throw new Error(`${mdRel}: parse failed after sync`);
    }
  }

  fullReport.subjects[subject] = {
    filesChanged: changedFiles.length,
    files: changedFiles.sort(),
    pagesSynced: mapping.length,
    byGrade: Object.fromEntries(
      GRADES.map((g) => [g, mapping.filter((m) => m.grade === g).length])
    ),
    diagramActions: subject === "geometry" ? diagramActions : [],
  };

  fs.writeFileSync(
    path.join(ROOT, `docs/learning-book/${subject}/${subject}-content-sync-report.json`),
    JSON.stringify(fullReport.subjects[subject], null, 2),
    "utf8"
  );
}

console.log(JSON.stringify(fullReport, null, 2));
