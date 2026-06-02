/**
 * Scan built SSG HTML for forbidden *visible* child-facing leaks (article body only).
 * Run after `npm run build`: node scripts/verify-learning-book-ssg-visible-text.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HTML_ROOT = path.join(ROOT, ".next/server/pages/learning/book");

const SPOT_PAGES = [
  "/learning/book/math/g3/ns_place_hundreds",
  "/learning/book/math/g4/round",
  "/learning/book/math/g5/wp_time_sum",
  "/learning/book/math/g5/frac_add_sub",
  "/learning/book/math/g6/ratio_first",
  "/learning/book/math/g6/scale_map_to_real",
  "/learning/book/math/g6/perc_part_of",
  "/learning/book/math/g6/frac_multiply",
  "/learning/book/geometry/g3/triangle_angles",
  "/learning/book/geometry/g3/solids",
  "/learning/book/geometry/g4/rectangular_prism_volume",
  "/learning/book/geometry/g5/diagonal_parallelogram",
  "/learning/book/geometry/g5/rectangular_prism_volume",
  "/learning/book/geometry/g6/circle_perimeter",
  "/learning/book/geometry/g6/circle_area",
  "/learning/book/geometry/g6/pythagoras_leg",
  "/learning/book/geometry/g6/cone_volume",
  "/learning/book/geometry/g6/sphere_volume",
];

/** Strip scripts/styles and decode minimal entities for text scan */
function extractVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const FORBIDDEN_VISIBLE = [
  /\[DRAFT/i,
  /not owner-approved/i,
  /approval_status/i,
  /skill_id/i,
  /learning_page_id/i,
  /math:g[1-6]:/i,
  /geometry:g[1-6]:/i,
  /\*\*[^*]+\*\*/,
  /000,1/,
  /מתמטיקה/,
  /הנדסה/,
];

let failures = 0;

const allHtml = globSync(path.join(HTML_ROOT, "**/*.html").replace(/\\/g, "/"));
console.log(`Scanning ${allHtml.length} built HTML files (visible text only)...`);

for (const file of allHtml) {
  const html = fs.readFileSync(file, "utf8");
  const text = extractVisibleText(html);
  for (const re of FORBIDDEN_VISIBLE) {
    if (re.test(text)) {
      failures += 1;
      console.error("FAIL visible:", path.relative(ROOT, file), re.toString());
    }
  }
}

console.log("\nSpot-check token presence (must appear correctly, not flipped):");
for (const route of SPOT_PAGES) {
  const rel = route.replace("/learning/book/", "").replace(/\//g, path.sep);
  const file = path.join(HTML_ROOT, `${rel}.html`);
  if (!fs.existsSync(file)) {
    failures += 1;
    console.error("FAIL missing built HTML:", route);
    continue;
  }
  const text = extractVisibleText(fs.readFileSync(file, "utf8"));
  const hasPractice = text.includes("בואו נתרגל עכשיו");
  const hasBookTitle =
    text.includes("ספר חשבון") || text.includes("ספר גאומטריה");
  console.log(
    `OK ${route}: practiceCTA=${hasPractice} bookShell=${hasBookTitle} len=${text.length}`
  );
}

if (failures > 0) {
  console.error(`\n${failures} visible-text failure(s).`);
  process.exit(1);
}

console.log("\nOK: no forbidden visible leaks in built HTML; spot pages exist.");
