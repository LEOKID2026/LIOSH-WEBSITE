/**
 * Pedagogical richness audit — read-only analysis of all learning books.
 * Run: node tmp/audit-book-pedagogy.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LEARNING_BOOK_SEQUENCE_BOOK_KEYS } from "../lib/learning-book/learning-book-sequence-meta.js";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const PLACEHOLDER_MARKERS = [
  "\u05ea\u05d5\u05db\u05df \u05d9\u05ea\u05d5\u05d5\u05e1\u05e3 \u05d1\u05d4\u05de\u05e9\u05da",
  "\u05d1\u05e7\u05e8\u05d5\u05d1 \u05e0\u05d5\u05e1\u05d9\u05e3 \u05d4\u05e1\u05d1\u05e8",
  "\u05d4\u05d3\u05e3 \u05d4\u05d6\u05d4 \u05de\u05d5\u05db\u05df \u05dc\u05ea\u05d5\u05db\u05df",
  "\u05e1\u05e4\u05e8 \u05d1\u05d4\u05db\u05e0\u05d4",
  "placeholder",
];

const REAL_LIFE_MARKERS = [
  "\u05d1\u05d1\u05d9\u05ea", "\u05d1\u05d2\u05d9\u05e0\u05d4", "\u05d1\u05db\u05d9\u05ea\u05d4", "\u05d1\u05d7\u05e0\u05d5\u05ea",
  "\u05d1\u05d7\u05d9\u05d9\u05dd", "\u05d9\u05d5\u05dd \u05d9\u05d5\u05dd", "\u05de\u05e1\u05d1\u05d9\u05d1", "\u05d1\u05d7\u05d5\u05e3",
  "\u05d1\u05e4\u05d0\u05e8\u05e7", "\u05d1\u05e9\u05db\u05d5\u05e0\u05d4", "\u05d1\u05e2\u05d9\u05e8", "\u05d1\u05de\u05e9\u05e4\u05d7\u05d4",
  "\u05d1\u05d1\u05d9\u05ea \u05d4\u05e1\u05e4\u05e8", "\u05d1\u05e9\u05d5\u05e7", "\u05d1\u05de\u05d8\u05d1\u05d7", "\u05d1\u05d7\u05d3\u05e8",
  "\u05d3\u05de\u05d9\u05e0\u05d5", "\u05d7\u05e9\u05d1\u05d5 \u05e2\u05dc", "\u05db\u05e9\u05d0\u05ea\u05dd", "\u05db\u05e9\u05d0\u05e0\u05d7\u05e0\u05d5",
  "\u05d1\u05db\u05dc \u05d9\u05d5\u05dd", "\u05dc\u05d9\u05d3 \u05d4\u05d1\u05d9\u05ea", "\u05d1\u05e9\u05d3\u05d4", "\u05d1\u05d9\u05dd", "\u05d1\u05d9\u05e2\u05e8",
];

const CHILD_TONE_MARKERS = [
  "\u05d1\u05d5\u05d0\u05d5", "\u05e0\u05e1\u05d5", "\u05d3\u05de\u05d9\u05e0\u05d5", "\u05d7\u05e9\u05d1\u05d5", "\u05d6\u05db\u05e8\u05d5",
  "\u05e9\u05d9\u05de\u05d5 \u05dc\u05d1", "\u05d4\u05d9\u05d5\u05dd \u05e0\u05dc\u05de\u05d3", "\u05e2\u05db\u05e9\u05d9\u05d5 \u05d0\u05ea\u05dd",
  "\u05e8\u05de\u05d6:", "?", "!", "\u274c", "\u2713",
];

const DRY_REPORT_MARKERS = [
  "\u05e0\u05d5\u05e9\u05d0 \u05d6\u05d4", "\u05de\u05d8\u05e8\u05ea \u05d4\u05dc\u05d9\u05de\u05d5\u05d3", "\u05d1\u05e4\u05e8\u05e7 \u05d6\u05d4",
  "\u05dc\u05e4\u05d9 \u05d4\u05ea\u05d5\u05db\u05e0\u05d9\u05ea", "\u05d9\u05e9 \u05dc\u05e6\u05d9\u05d9\u05df", "\u05d9\u05e9 \u05dc\u05d4\u05d1\u05d9\u05df",
  "\u05e0\u05d9\u05ea\u05df \u05dc\u05d5\u05de\u05e8", "\u05de\u05d5\u05d2\u05d3\u05e8 \u05db", "\u05d4\u05d2\u05d3\u05e8\u05d4:", "\u05dc\u05e1\u05d9\u05db\u05d5\u05dd,",
  "\u05d1\u05de\u05e1\u05d2\u05e8\u05ea",
];

const SCIENCE_EXPERIMENT_MARKERS = [
  "\u05e0\u05e1\u05d5", "\u05ea\u05e6\u05e4\u05d9\u05ea", "\u05e0\u05d9\u05e1\u05d5\u05d9", "\u05d1\u05d3\u05e7\u05d5", "\u05de\u05d4 \u05e7\u05d5\u05e8\u05d4",
  "\u05de\u05d4 \u05d9\u05e7\u05e8\u05d4", "\u05d4\u05e9\u05d5\u05d5", "\u05de\u05d3\u05d3\u05d5", "\u05e6\u05e4\u05d5",
];

const HEBREW_READING_MARKERS = [
  "\u05e7\u05e8\u05d0\u05d5", "\u05de\u05e9\u05e4\u05d8", "\u05d8\u05e7\u05e1\u05d8", "\u05e1\u05d9\u05e4\u05d5\u05e8", "\u05e4\u05e1\u05e7\u05d4",
  "\u05d4\u05d1\u05d9\u05e0\u05d5", "\u05de\u05d4 \u05e2\u05e9\u05d4", "\u05de\u05d9", "\u05d0\u05d9\u05e4\u05d4", "\u05dc\u05de\u05d4", "\u05db\u05ea\u05d1\u05d5", "\u05d4\u05e9\u05dc\u05d9\u05de\u05d5",
];

const ENGLISH_DIALOGUE_MARKERS = [
  "Hello", "Hi ", "What ", "How ", "My name", "Nice to meet", "said", "asks", "answers",
];

const MG_MAP_MARKERS = [
  "\u05de\u05e4\u05d4", "\u05de\u05d9\u05e7\u05d5\u05dd", "\u05de\u05e7\u05d5\u05dd", "\u05d0\u05d6\u05d5\u05e8", "\u05d2\u05d1\u05d5\u05dc",
  "\u05db\u05d9\u05d5\u05d5\u05df", "\u05e6\u05e4\u05d5\u05df", "\u05d3\u05e8\u05d5\u05dd", "\u05de\u05d6\u05e8\u05d7", "\u05de\u05e2\u05e8\u05d1",
  "\u05e2\u05d9\u05e8", "\u05d9\u05d9\u05e9\u05d5\u05d1", "\u05d0\u05e8\u05e5", "\u05d9\u05e9\u05e8\u05d0\u05dc", "\u05e0\u05d5\u05e3", "\u05de\u05d9\u05dd",
];

const GRADE_NUMBER_CEILING = { g1: 30, g2: 100, g3: 1000, g4: 10000, g5: 100000, g6: 1000000 };

const GEOMETRY_VISUAL_PAGES = new Set([
  "shapes_basic_square", "shapes_basic_rectangle", "shapes_basic_properties_square",
  "shapes_basic_properties_rectangle", "triangles", "quadrilaterals", "parallel_perpendicular",
  "square_area", "square_perimeter", "triangle_perimeter", "triangle_angles", "symmetry",
  "diagonal_square", "diagonal_rectangle", "parallelogram_area", "trapezoid_area",
  "heights_triangle", "heights_parallelogram", "heights_trapezoid", "circle_radius",
  "circle_area", "circle_perimeter", "rectangular_prism_volume", "prism_volume_rectangular",
  "solids", "right_angle", "shapes_basic_properties_angles",
]);

const MIN_SECTION_CHARS = { 1: 40, 2: 80, 3: 50, 4: 60, 5: 40, 6: 50, 7: 30 };

function stripDiagrams(t) {
  return String(t || "").replace(/:::geometry-diagram[\s\S]*?:::/g, "");
}

function wordCount(t) {
  return stripDiagrams(t).split(/\s+/).filter(Boolean).length;
}

function charCount(t) {
  return stripDiagrams(t).replace(/\s/g, "").length;
}

function hasPlaceholder(text) {
  const t = String(text || "");
  return PLACEHOLDER_MARKERS.some((m) => t.includes(m));
}

function hasAny(text, markers) {
  const t = String(text || "");
  return markers.some((m) => t.includes(m));
}

function maxNumber(text) {
  const nums = String(text || "").match(/\d[\d,]*/g) || [];
  return nums.reduce((max, n) => Math.max(max, parseInt(n.replace(/,/g, ""), 10) || 0), 0);
}

function hasQuestion(text) {
  return /[?\u061f]/.test(String(text || ""));
}

function hasStepStructure(text) {
  return /\u05e9\u05dc\u05d1\s*\d|step\s*\d/i.test(String(text || ""));
}

function hasExampleStructure(text) {
  const t = stripDiagrams(text);
  return charCount(t) >= 50 && (/\d/.test(t) || /[A-Za-z]{2,}/.test(t) || t.includes("\u2014") || t.includes("\u2192"));
}

function hasVisualStructure(text) {
  const t = String(text || "");
  return (
    t.includes(":::geometry-diagram") ||
    /[\u2500-\u257f\u25a0-\u25ff\u2588\u2591\u25a1\u25aa\u25ab\u25ac\u25ad\u25b2-\u25cf]/.test(t) ||
    t.includes("```")
  );
}

function getSection(page, n) {
  return page.sections.find((s) => s.number === n)?.body || "";
}

function scorePage(page, bookKey) {
  const [subject, grade] = bookKey.split(":");
  const pageId = page.pageId;
  const fullText = page.sections.map((s) => s.body).join("\n");
  const issues = [];
  const strengths = [];
  const fixRecs = [];

  if (
    pageId === "book_placeholder" ||
    hasPlaceholder(fullText) ||
    page.metadata.page_type === "placeholder"
  ) {
    return {
      pageId,
      title: page.displayTitle,
      grade,
      subject,
      bookKey,
      rating: "D",
      score: 0,
      issues: ["Placeholder/stub content \u2014 not launch-ready"],
      strengths: [],
      fixRec: "rewrite explanation",
      fixRecs: ["rewrite explanation"],
      metrics: { placeholder: true },
    };
  }

  const s = {};
  for (let i = 1; i <= 7; i++) s[i] = getSection(page, i);

  const metrics = {
    sectionChars: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [i, charCount(s[i])])),
    sectionWords: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [i, wordCount(s[i])])),
    totalWords: wordCount(fullText),
    hasSimpleExample: hasExampleStructure(s[3]) && charCount(s[3]) >= MIN_SECTION_CHARS[3],
    hasGuidedExample: (hasStepStructure(s[4]) || hasQuestion(s[4])) && charCount(s[4]) >= MIN_SECTION_CHARS[4],
    hasSelfCheck: hasQuestion(s[5]) && charCount(s[5]) >= MIN_SECTION_CHARS[5],
    hasCommonMistake:
      (s[6].includes("\u274c") ||
        s[6].includes("\u05d8\u05e2\u05d5\u05ea") ||
        s[6].includes("\u05e9\u05d9\u05de\u05d5 \u05dc\u05d1") ||
        s[6].includes("\u05dc\u05e4\u05e2\u05de\u05d9\u05dd")) &&
      charCount(s[6]) >= MIN_SECTION_CHARS[6],
    hasRealLife: hasAny(fullText, REAL_LIFE_MARKERS),
    hasChildTone: hasAny(fullText, CHILD_TONE_MARKERS),
    hasDryTone: hasAny(fullText, DRY_REPORT_MARKERS),
    hasVisual: hasVisualStructure(fullText),
    maxNum: maxNumber(s[2] + s[3] + s[4]),
  };

  for (const [n, min] of Object.entries(MIN_SECTION_CHARS)) {
    if (charCount(s[n]) < min * 0.5) {
      issues.push(`Section ${n} very thin (${charCount(s[n])} chars)`);
    }
  }

  if (!metrics.hasSimpleExample) {
    issues.push("Missing or weak simple example (\u00a73)");
    fixRecs.push("add examples");
  } else strengths.push("Has worked example");

  if (!metrics.hasGuidedExample) {
    issues.push("Missing or weak guided example (\u00a74)");
    fixRecs.push("add guided example");
  } else strengths.push("Has guided solve");

  if (!metrics.hasSelfCheck) {
    issues.push("Missing self-check question (\u00a75)");
    fixRecs.push("add examples");
  } else strengths.push("Has self-check");

  if (!metrics.hasCommonMistake) {
    issues.push("Missing common mistake / pay-attention moment (\u00a76)");
    fixRecs.push("add examples");
  }

  if (subject === "math") {
    if (!/\d/.test(s[3] + s[4])) {
      issues.push("Math page lacks numeric examples in \u00a73\u2013\u00a74");
      fixRecs.push("add examples");
    }
    if (pageId.startsWith("wp_") && !metrics.hasRealLife) {
      issues.push("Word-problem page lacks real-life framing");
      fixRecs.push("add real-life context");
    }
    const ceiling = GRADE_NUMBER_CEILING[grade];
    if (metrics.maxNum > 0 && metrics.maxNum < ceiling * 0.01 && grade >= "g4") {
      issues.push(`Numbers may be too small for ${grade} (max ${metrics.maxNum})`);
      fixRecs.push("simplify for age level");
    }
  }

  if (subject === "geometry") {
    const needsVisual =
      GEOMETRY_VISUAL_PAGES.has(pageId) ||
      /area|perimeter|triangle|square|angle|height|diagonal|circle|solid|shape|quadrilateral|parallel|symmetry|volume|trapezoid|parallelogram/i.test(
        pageId
      );
    if (needsVisual && !metrics.hasVisual) {
      issues.push("Geometry concept page lacks diagram/visual aid");
      fixRecs.push("add table/diagram/visual structure");
    }
    if (!metrics.hasRealLife && !["transformations", "rotation", "tiling"].includes(pageId)) {
      issues.push("Limited spatial/real-world anchoring");
      fixRecs.push("add real-life context");
    }
  }

  if (subject === "science") {
    if (!hasAny(fullText, SCIENCE_EXPERIMENT_MARKERS) && !hasQuestion(s[2])) {
      issues.push("Science page lacks observation/experiment/question hook");
      fixRecs.push("add mini experiment/observation");
    }
    if (!metrics.hasRealLife) {
      issues.push("Limited real-life phenomenon connection");
      fixRecs.push("add real-life context");
    }
    if (metrics.totalWords < 120) {
      issues.push("Science page overall thin \u2014 topic umbrella only");
      fixRecs.push("rewrite explanation");
    }
  }

  if (subject === "hebrew") {
    if (!hasAny(fullText, HEBREW_READING_MARKERS) && !pageId.includes("grammar")) {
      issues.push("Hebrew page lacks reading passage or comprehension element");
      fixRecs.push("add short text/dialogue");
    }
    if (pageId.includes("grammar") && charCount(s[2]) < 100) {
      issues.push("Grammar page explanation may be too brief");
      fixRecs.push("add sentence examples");
    }
    if (metrics.totalWords < 80 && !pageId.includes("copy")) {
      issues.push("Hebrew page content thin overall");
      fixRecs.push("add short text/dialogue");
    }
  }

  if (subject === "english") {
    if (!/[A-Za-z]{3,}/.test(s[2] + s[3] + s[4])) {
      issues.push("English page lacks sufficient English target language in examples");
      fixRecs.push("add short text/dialogue");
    }
    if (!hasAny(fullText, ENGLISH_DIALOGUE_MARKERS) && !pageId.includes("vocab")) {
      issues.push("English page lacks mini dialogue or sentence in context");
      fixRecs.push("add short text/dialogue");
    }
    if (pageId.includes("vocab") && charCount(s[2]) < 60) {
      issues.push("Vocabulary list thin \u2014 needs more contextual sentences");
      fixRecs.push("add short text/dialogue");
    }
  }

  if (subject === "moledet" || subject === "geography") {
    if (!hasAny(fullText, MG_MAP_MARKERS)) {
      issues.push("Moledet/Geography page lacks place/map/location framing");
      fixRecs.push("add real-life context");
    }
    if (!hasQuestion(s[5]) && !hasQuestion(s[4])) {
      issues.push("Missing reflection/activity prompt");
      fixRecs.push("add examples");
    }
    if (metrics.totalWords < 100) {
      issues.push("Page thin for civic/geography depth");
      fixRecs.push("rewrite explanation");
    }
  }

  if (metrics.hasDryTone && !metrics.hasChildTone) {
    issues.push("Dry report-like tone \u2014 weak child-facing voice");
    fixRecs.push("rewrite explanation");
  } else if (!metrics.hasChildTone) {
    issues.push("Limited child-facing engagement markers");
    fixRecs.push("rewrite explanation");
  }

  if (metrics.sectionWords[2] > 180) {
    issues.push("Explanation section (\u00a72) may be overloaded");
    fixRecs.push("split overloaded page");
  }

  const gradeNum = parseInt(grade.replace("g", ""), 10);
  const expectedMinWords = gradeNum <= 2 ? 70 : gradeNum <= 4 ? 90 : 100;
  if (metrics.totalWords < expectedMinWords) {
    issues.push(
      `Total content (${metrics.totalWords} words) below grade ${grade} richness target (~${expectedMinWords})`
    );
  }

  const listLines = (s[2].match(/^[-\u2022*]/gm) || []).length;
  if (listLines >= 5 && !s[2].includes("|") && subject !== "english") {
    issues.push("Long bullet list in \u00a72 \u2014 may need table/visual structure");
    fixRecs.push("add table/diagram/visual structure");
  }

  let score = 100;
  score -= issues.filter((i) => i.includes("Placeholder")).length * 100;
  score -= issues.filter((i) => i.includes("very thin")).length * 8;
  score -= issues.filter((i) => i.includes("Missing or weak simple")).length * 12;
  score -= issues.filter((i) => i.includes("Missing or weak guided")).length * 12;
  score -= issues.filter((i) => i.includes("Missing self-check")).length * 10;
  score -= issues.filter((i) => i.includes("Missing common mistake")).length * 8;
  score -= issues.filter((i) => i.includes("thin") || i.includes("below grade")).length * 10;
  score -= issues.filter((i) => i.includes("lacks")).length * 7;
  score -= issues.filter((i) => i.includes("Dry report")).length * 15;
  score -= issues.filter((i) => i.includes("Limited child-facing")).length * 5;
  score -= issues.filter((i) => i.includes("overloaded")).length * 5;
  score = Math.max(0, score);

  let rating;
  if (score >= 85 && issues.length <= 1) rating = "A";
  else if (score >= 70 && issues.length <= 3) rating = "B";
  else if (score >= 45 || issues.length <= 6) rating = "C";
  else rating = "D";

  const criticalMissing = [
    !metrics.hasSimpleExample,
    !metrics.hasGuidedExample,
    !metrics.hasSelfCheck,
    !metrics.hasCommonMistake,
  ].filter(Boolean).length;
  if (criticalMissing >= 3) rating = rating === "A" ? "C" : rating === "B" ? "C" : rating;
  if (criticalMissing >= 4 && metrics.totalWords < 60) rating = "D";

  const primaryFix = fixRecs.length ? [...new Set(fixRecs)][0] : null;

  return {
    pageId,
    title: page.displayTitle,
    grade,
    subject,
    bookKey,
    rating,
    score,
    issues,
    strengths,
    fixRec: primaryFix,
    fixRecs: [...new Set(fixRecs)],
    metrics,
  };
}

const allPages = [];
const bookSummaries = [];

for (const bookKey of LEARNING_BOOK_SEQUENCE_BOOK_KEYS) {
  const [subject, grade] = bookKey.split(":");
  const entry = getLearningBookEntry(subject, grade);
  if (!entry) {
    console.error("No entry", bookKey);
    continue;
  }
  const pages = entry.loader.loadAllPages();
  const pageScores = [];
  for (const page of pages) {
    if (!page) continue;
    const result = scorePage(page, bookKey);
    allPages.push(result);
    pageScores.push(result);
  }
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  pageScores.forEach((p) => counts[p.rating]++);
  const avg = pageScores.length
    ? pageScores.reduce((a, p) => a + p.score, 0) / pageScores.length
    : 0;
  let bookRating = "A";
  if (counts.D > 0) bookRating = "D";
  else if (counts.C / pageScores.length > 0.4) bookRating = "C";
  else if (counts.C + counts.B > pageScores.length * 0.5) bookRating = "B";
  else if (counts.A / pageScores.length >= 0.85) bookRating = "A";
  else bookRating = "B";
  bookSummaries.push({
    bookKey,
    subject,
    grade,
    pageCount: pageScores.length,
    counts,
    avgScore: avg,
    bookRating,
  });
}

const outPath = path.join(ROOT, "tmp", "book-pedagogy-audit.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({ allPages, bookSummaries, generatedAt: new Date().toISOString() }, null, 2)
);

const ratingCounts = { A: 0, B: 0, C: 0, D: 0 };
allPages.forEach((p) => ratingCounts[p.rating]++);
console.log("Total pages:", allPages.length);
console.log("Rating counts:", JSON.stringify(ratingCounts));
console.log("\nWeakest pages (top 25):");
allPages
  .sort((a, b) => a.score - b.score || b.issues.length - a.issues.length)
  .slice(0, 25)
  .forEach((p) => {
    console.log(
      `${p.rating} ${p.score} ${p.bookKey}/${p.pageId} \u2014 ${p.issues.slice(0, 2).join("; ")}`
    );
  });
console.log("\nBook summaries:");
bookSummaries
  .sort((a, b) => a.avgScore - b.avgScore)
  .forEach((b) => {
    console.log(
      `${b.bookRating} avg=${b.avgScore.toFixed(0)} ${b.bookKey} A:${b.counts.A} B:${b.counts.B} C:${b.counts.C} D:${b.counts.D}`
    );
  });
