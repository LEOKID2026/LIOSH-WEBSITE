/**
 * Read-only mapping: exports/audio-text english txt (PASS10–15) → docs markdown source.
 * Does not modify any files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import { getSectionDisplayTitle } from "../lib/learning-book/section-display-labels.js";
import { prepareBookSectionExportNarrationText } from "./lib/prepare-book-export-narration-text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

/** @returns {Map<string, Set<string>>} */
function collectChangedTxt() {
  /** @type {Map<string, Set<string>>} */
  const changed = new Map();
  const add = (rel, pass) => {
    const norm = rel.replace(/\\/g, "/");
    if (!changed.has(norm)) changed.set(norm, new Set());
    changed.get(norm).add(pass);
  };

  for (const [pass, file, key] of [
    ["PASS12", "exports/audio-text/pass12-exact-english-report.json", "changed"],
    ["PASS13", "exports/audio-text/pass13-exact-english-report.json", "changedFiles"],
    ["PASS14", "exports/audio-text/pass14-english-audio-symbol-cleanup-report.json", "changedFiles"],
  ]) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const f of readJson(p)[key] || []) add(f, pass);
  }

  const p10 = path.join(ROOT, "scripts/pass10_exact_english_replacements.json");
  if (fs.existsSync(p10)) {
    const rep = readJson(p10);
    for (const k of Object.keys(rep)) {
      add(`exports/audio-text/books/english/${k}`, "PASS10");
    }
  }

  for (const pg of ["page-058.txt", "page-153.txt", "page-177.txt"]) {
    add(`exports/audio-text/books/english/english-g2/pages/${pg}`, "PASS11");
  }

  const manualG1 = ["074", "076", "094", "101", "108", "115", "122", "129"];
  const manualG2 = [
    "055", "067", "076", "083", "087", "090", "097", "103", "104", "110", "111",
    "117", "118", "125", "129", "132", "136", "139", "146", "150", "160", "166",
    "167", "174", "180", "181",
  ];
  for (const pg of manualG1) {
    add(`exports/audio-text/books/english/english-g1/pages/page-${pg}.txt`, "MANUAL-G1G2");
  }
  for (const pg of manualG2) {
    add(`exports/audio-text/books/english/english-g2/pages/page-${pg}.txt`, "MANUAL-G1G2");
  }

  return changed;
}

/** @returns {Map<string, { book: string, pageNum: number, topicId: string, sectionNumber: number, sectionTitle: string, displayTitle: string, mdPath: string }>} */
function buildExportIndex() {
  /** @type {Map<string, { book: string, pageNum: number, topicId: string, sectionNumber: number, sectionTitle: string, displayTitle: string, mdPath: string }>} */
  const index = new Map();

  for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    const entry = getLearningBookEntry("english", grade);
    if (!entry || entry.status !== "authored") continue;

    const draftsDir = entry.registry.meta.draftsDir;
    let pageNumber = 0;

    for (const page of entry.loader.loadAllPages()) {
      for (const section of page.sections) {
        pageNumber += 1;
        const key = `english-${grade}/pages/page-${padPageNum(pageNumber)}.txt`;
        index.set(key, {
          book: `english-${grade}`,
          pageNum: pageNumber,
          topicId: page.pageId,
          sectionNumber: section.number,
          sectionTitle: section.title,
          displayTitle: getSectionDisplayTitle(section.title),
          mdPath: `${draftsDir}/${page.pageId}.md`,
        });
      }
    }
  }

  return index;
}

/** @param {Set<string>} passes */
function classifySync(passes, section, fixedTxt, replacements) {
  const passList = [...passes];
  const body = section?.body || "";
  const exported = prepareBookSectionExportNarrationText(section);

  if (passList.some((p) => p === "PASS13" || p === "PASS14")) {
    const reps = replacements.filter((r) => passList.includes(r.pass));
    const allFromInBody = reps.length > 0 && reps.every((r) => body.includes(r.from));
    if (allFromInBody) {
      return {
        canSync: "yes",
        note: "החלפת שורה/ביטוי מדויק — from קיים ב-body של section",
      };
    }
    if (passList.includes("PASS14") && reps.some((r) => r.from === "✓" && (body.includes("✓") || exported.includes("✓")))) {
      return {
        canSync: "yes",
        note: "הסרת ✓ — סימן קיים ב-body או ב-export",
      };
    }
  }

  if (passList.includes("MANUAL-G1G2")) {
    return {
      canSync: "partial",
      note: "החלפת עמוד מלא לשמע — צריך להתאים חזרה לפורמט markdown (7 sections), לא העתקה 1:1",
    };
  }

  if (passList.includes("PASS10") || passList.includes("PASS12")) {
    const overlap = fixedTxt.trim() === exported.trim();
    return {
      canSync: overlap ? "yes" : "partial",
      note: overlap
        ? "כבר תואם export הנוכחי מה-md"
        : "החלפת עמוד מלא ב-export — צריך לעדכן body של section במקור, לא להדביק txt",
    };
  }

  if (passList.includes("PASS11")) {
    return {
      canSync: body.includes("→") ? "yes" : "partial",
      note: body.includes("→")
        ? "החלפת חץ → — קיים ב-body"
        : "החץ כבר לא ב-body; ייתכן ש-sync בוצע ב-export בלבד",
    };
  }

  return {
    canSync: fixedTxt.trim() !== exported.trim() ? "partial" : "yes",
    note: "בדיקה לפי export מ-md מול txt מתוקן",
  };
}

function loadReplacementsForTxt(relPath, grade, pageFile) {
  /** @type {{ pass: string, from: string, to: string }[]} */
  const out = [];
  const page = pageFile;

  const p13 = path.join(ROOT, "scripts/pass13_exact_english_replacements.json");
  if (fs.existsSync(p13)) {
    for (const item of readJson(p13)) {
      if (item.book === `english-${grade}` && item.page === page) {
        out.push({ pass: "PASS13", from: item.from, to: item.to });
      }
    }
  }

  const p14 = path.join(ROOT, "scripts/pass14_exact_english_replacements.json");
  if (fs.existsSync(p14)) {
    for (const item of readJson(p14)) {
      const itemPath = item.path?.replace(/\\/g, "/");
      if (itemPath?.endsWith(`english-${grade}/pages/${page}`) || itemPath?.endsWith(`english/english-${grade}/pages/${page}`)) {
        out.push({ pass: "PASS14", from: item.from, to: item.to });
      }
    }
  }

  return out;
}

const changed = collectChangedTxt();
const exportIndex = buildExportIndex();
const entryCache = new Map();

function getSection(mdPath, topicId, sectionNumber) {
  const grade = mdPath.match(/\/g(\d)\//)?.[0]?.slice(2, 3) ? `g${mdPath.match(/\/g(\d)\//)[1]}` : null;
  if (!grade) return null;
  const key = `${grade}:${topicId}`;
  if (!entryCache.has(key)) {
    const entry = getLearningBookEntry("english", grade);
    entryCache.set(key, entry?.loader.loadPage(topicId) || null);
  }
  const page = entryCache.get(key);
  return page?.sections?.find((s) => s.number === sectionNumber) || null;
}

/** @type {object[]} */
const rows = [];
/** @type {object[]} */
const problematic = [];

for (const [rel, passes] of [...changed.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const m = rel.match(/english-(g\d)\/pages\/(page-\d{3}\.txt)$/);
  if (!m) {
    problematic.push({ exportTxt: rel, reason: "לא ניתן לפרש book/page מהנתיב" });
    continue;
  }

  const grade = m[1];
  const pageFile = m[2];
  const indexKey = `english-${grade}/pages/${pageFile}`;
  const map = exportIndex.get(indexKey);

  if (!map) {
    problematic.push({ exportTxt: rel, reason: `לא נמצא מיפוי export index ל-${indexKey}` });
    continue;
  }

  const section = getSection(map.mdPath, map.topicId, map.sectionNumber);
  const fixedTxt = fs.readFileSync(path.join(ROOT, rel.replace(/\//g, path.sep)), "utf8");
  const replacements = loadReplacementsForTxt(rel, grade, pageFile);
  const sync = classifySync(passes, section, fixedTxt, replacements);

  const blockLabel = `## ${map.sectionNumber}. ${map.sectionTitle}`;

  rows.push({
    exportTxt: rel,
    sourceMarkdown: map.mdPath,
    sectionBlock: `${blockLabel} (topicId=${map.topicId}, section ${map.sectionNumber}/7, UI title: ${map.displayTitle})`,
    canSync: sync.canSync,
    note: `${sync.note}; passes: ${[...passes].sort().join(", ")}`,
  });
}

const summary = {
  totalChangedTxt: changed.size,
  mapped: rows.length,
  problematic: problematic.length,
  canSyncYes: rows.filter((r) => r.canSync === "yes").length,
  canSyncPartial: rows.filter((r) => r.canSync === "partial").length,
  canSyncNo: rows.filter((r) => r.canSync === "no").length,
};

const outPath = path.join(ROOT, "exports/audio-text/english-source-sync-mapping-report.json");
fs.writeFileSync(outPath, `${JSON.stringify({ summary, rows, problematic }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ summary, outPath, sample: rows.slice(0, 5) }, null, 2));
