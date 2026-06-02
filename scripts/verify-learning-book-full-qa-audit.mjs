/**
 * One-shot full QA audit for math + geometry learning books (g1–g6).
 * Run: node scripts/verify-learning-book-full-qa-audit.mjs
 */
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";

const FORBIDDEN = [
  /\[DRAFT/i,
  /not owner-approved/i,
  /approval_status/i,
  /skill_id/i,
  /learning_page_id/i,
  /math:g[1-6]:/i,
  /geometry:g[1-6]:/i,
  /\*\*[^*]+\*\*/,
  /מתמטיקה/,
  /הנדסה/,
];

const books = [
  ["math", "g1"],
  ["math", "g2"],
  ["math", "g3"],
  ["math", "g4"],
  ["math", "g5"],
  ["math", "g6"],
  ["geometry", "g1"],
  ["geometry", "g2"],
  ["geometry", "g3"],
  ["geometry", "g4"],
  ["geometry", "g5"],
  ["geometry", "g6"],
];

let failures = 0;
/** @type {Record<string, number>} */
const counts = {};
/** @type {string[]} */
const routes = [];

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

for (const [subject, grade] of books) {
  const entry = getLearningBookEntry(subject, grade);
  const ids = entry.registry.pageOrder;
  counts[`${subject}/${grade}`] = ids.length;
  routes.push(`/learning/book/${subject}/${grade}`);
  for (const pageId of ids) {
    routes.push(`/learning/book/${subject}/${grade}/${pageId}`);
  }

  for (const pageId of ids) {
    const page = entry.loader.loadPage(pageId);
    const visible = JSON.stringify({
      title: page.displayTitle,
      sections: page.sections,
    });
    for (const re of FORBIDDEN) {
      if (re.test(visible)) {
        fail(`${subject}/${grade}/${pageId}: forbidden pattern ${re}`);
      }
    }
    if (page.sections.length !== 7) {
      fail(`${subject}/${grade}/${pageId}: expected 7 sections, got ${page.sections.length}`);
    }
    const { prev, next } = entry.registry.getPageNeighbors(pageId);
    if (prev && !ids.includes(prev)) {
      fail(`${subject}/${grade}/${pageId}: invalid prev ${prev}`);
    }
    if (next && !ids.includes(next)) {
      fail(`${subject}/${grade}/${pageId}: invalid next ${next}`);
    }
  }

  const title = entry.meta.bookTitleHe || "";
  if (subject === "math" && !title.includes("חשבון")) {
    fail(`math/${grade}: book title missing חשבון — "${title}"`);
  }
  if (subject === "math" && title.includes("מתמטיקה")) {
    fail(`math/${grade}: book title uses מתמטיקה`);
  }
  if (subject === "geometry" && !title.includes("גאומטריה")) {
    fail(`geometry/${grade}: book title missing גאומטריה — "${title}"`);
  }
  if (subject === "geometry" && title.includes("הנדסה")) {
    fail(`geometry/${grade}: book title uses הנדסה`);
  }

  if (!entry.features?.practice) {
    fail(`${subject}/${grade}: practice feature not enabled`);
  }
}

console.log("Page counts:", JSON.stringify(counts, null, 2));
console.log("Total routes (12 index + pages):", routes.length);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  "OK: full catalog audit — all pages load, nav valid, titles correct, no forbidden leaks in parsed JSON."
);
