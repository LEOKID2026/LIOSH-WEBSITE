/**
 * Live Geometry diagram QA — page data + optional HTTP smoke on built site.
 * Run: node scripts/verify-geometry-diagram-live-qa.mjs
 * Optional: GEOMETRY_QA_BASE_URL=http://127.0.0.1:3000 node scripts/verify-geometry-diagram-live-qa.mjs
 */
import http from "http";
import https from "https";
import { getLearningBookEntry } from "../lib/learning-book/learning-book-catalog.js";
import {
  getRequiredGeometryDiagramType,
  isDiagramShapeMismatch,
} from "../lib/learning-book/geometry-diagram-page-map.js";
import {
  isDeprecatedGeometryDiagramType,
  isKnownGeometryDiagramType,
} from "../lib/learning-book/geometry-diagram-registry.js";
import { splitBookMarkdownBlocks, simulateBookDisplayLines } from "../lib/learning-book/book-markdown-blocks.js";

/** @type {{ grade: string, pageId: string, expectShape: string | null, sectionHint?: number }[]} */
export const GEOMETRY_LIVE_QA_PAGES = [
  { grade: "g3", pageId: "triangle_perimeter", expectShape: "triangle", sectionHint: 2 },
  { grade: "g3", pageId: "square_perimeter", expectShape: "square", sectionHint: 2 },
  { grade: "g5", pageId: "heights_trapezoid", expectShape: "trapezoid", sectionHint: 2 },
  { grade: "g5", pageId: "heights_triangle", expectShape: "triangle", sectionHint: 2 },
  { grade: "g5", pageId: "heights_parallelogram", expectShape: "parallelogram", sectionHint: 2 },
  { grade: "g5", pageId: "parallelogram_area", expectShape: "parallelogram", sectionHint: 2 },
  { grade: "g5", pageId: "trapezoid_area", expectShape: "trapezoid", sectionHint: 2 },
  { grade: "g4", pageId: "symmetry", expectShape: "triangle", sectionHint: 2 },
  { grade: "g6", pageId: "circle_perimeter", expectShape: "circle", sectionHint: 2 },
  { grade: "g6", pageId: "circle_area", expectShape: "circle", sectionHint: 2 },
  { grade: "g6", pageId: "solids", expectShape: null, sectionHint: 2 },
];

const errors = [];
const notes = [];

function fail(msg) {
  errors.push(msg);
}

function extractDiagramTypeFromSection(body) {
  const blocks = splitBookMarkdownBlocks(body);
  const geo = blocks.find((b) => b.type === "geometry_diagram");
  return geo?.diagramType ?? null;
}

for (const target of GEOMETRY_LIVE_QA_PAGES) {
  const { grade, pageId, expectShape } = target;
  const entry = getLearningBookEntry("geometry", grade);
  if (!entry) {
    fail(`missing catalog entry geometry/${grade}`);
    continue;
  }

  const page = entry.loader.loadPage(pageId);
  if (!page) {
    fail(`could not load geometry/${grade}/${pageId}`);
    continue;
  }

  if (entry.meta.bookTitleHe?.includes("הנדסה")) {
    fail(`${grade}/${pageId}: book title uses הנדסה`);
  }
  if (!entry.meta.bookTitleHe?.includes("גאומטריה")) {
    fail(`${grade}/${pageId}: book title missing גאומטריה`);
  }
  if (page.displayTitle?.includes("[DRAFT")) {
    fail(`${grade}/${pageId}: DRAFT in displayTitle`);
  }

  const required = getRequiredGeometryDiagramType(grade, pageId);
  let foundType = null;
  for (const section of page.sections) {
    const type = extractDiagramTypeFromSection(section.body);
    if (type) {
      if (foundType && foundType !== type) {
        fail(`${grade}/${pageId}: multiple diagram types (${foundType}, ${type})`);
      }
      foundType = type;
    }
    const display = simulateBookDisplayLines(section.body).join("\n");
    if (display.includes(":::geometry-diagram") || /type:\s*\w+/.test(display)) {
      fail(`${grade}/${pageId}: raw diagram marker in display output §${section.number}`);
    }
  }

  if (required !== foundType) {
    fail(
      `${grade}/${pageId}: expected diagram ${required ?? "none"}, found ${foundType ?? "none"}`
    );
  }

  if (foundType) {
    if (!isKnownGeometryDiagramType(foundType)) {
      fail(`${grade}/${pageId}: unknown diagram type ${foundType}`);
    }
    if (isDeprecatedGeometryDiagramType(foundType)) {
      fail(`${grade}/${pageId}: deprecated diagram type ${foundType}`);
    }
    if (isDiagramShapeMismatch(pageId, foundType)) {
      fail(`${grade}/${pageId}: shape mismatch for ${foundType}`);
    }
    if (foundType === "perimeter_path") {
      fail(`${grade}/${pageId}: perimeter_path must not render on site`);
    }
  }

  if (expectShape === "triangle" && foundType && !foundType.includes("triangle") && foundType !== "angle_basic" && foundType !== "symmetry_line") {
    fail(`${grade}/${pageId}: expected triangle-family diagram, got ${foundType}`);
  }
  if (expectShape === "square" && foundType && !foundType.includes("square")) {
    fail(`${grade}/${pageId}: expected square-family diagram, got ${foundType}`);
  }
  if (expectShape === "trapezoid" && foundType && !foundType.includes("trapezoid")) {
    fail(`${grade}/${pageId}: expected trapezoid-family diagram, got ${foundType}`);
  }
  if (expectShape === "parallelogram" && foundType && !foundType.includes("parallelogram")) {
    fail(`${grade}/${pageId}: expected parallelogram-family diagram, got ${foundType}`);
  }
  if (expectShape === "circle" && foundType && !foundType.includes("circle")) {
    fail(`${grade}/${pageId}: expected circle-family diagram, got ${foundType}`);
  }
  if (expectShape === null && foundType) {
    fail(`${grade}/${pageId}: should be text-only but has ${foundType}`);
  }

  notes.push(
    `OK ${grade}/${pageId}: ${foundType ?? "text-only"} | title=${page.displayTitle}`
  );
}

const baseUrl = process.env.GEOMETRY_QA_BASE_URL?.replace(/\/$/, "");

async function fetchText(url) {
  const lib = url.startsWith("https") ? https : http;
  return new Promise((resolve, reject) => {
    lib
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => resolve({ status: res.statusCode || 0, data }));
      })
      .on("error", reject);
  });
}

/** Remove Next.js serialized props — markers there are source data, not visible UI. */
function visibleHtml(html) {
  return String(html || "").replace(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>[\s\S]*?<\/script>/gi,
    ""
  );
}

if (baseUrl) {
  for (const target of GEOMETRY_LIVE_QA_PAGES) {
    const url = `${baseUrl}/learning/book/geometry/${target.grade}/${target.pageId}`;
    try {
      const { status, data } = await fetchText(url);
      if (status !== 200) {
        fail(`HTTP ${status} for ${url}`);
        continue;
      }
      const visible = visibleHtml(data);
      if (visible.includes("הנדסה")) {
        fail(`HTTP visible HTML contains הנדסה: ${url}`);
      }
      if (visible.includes("[DRAFT")) {
        fail(`HTTP visible HTML contains [DRAFT]: ${url}`);
      }
      if (visible.includes(":::geometry-diagram")) {
        fail(`HTTP visible HTML contains raw diagram marker: ${url}`);
      }
      if (!data.includes("גאומטריה")) {
        fail(`HTTP page missing גאומטריה in payload/shell: ${url}`);
      }
      notes.push(`HTTP OK ${url}`);
    } catch (e) {
      fail(`HTTP fetch failed ${url}: ${e.message}`);
    }
  }
}

if (errors.length) {
  console.error("Geometry live QA FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("Geometry live QA PASSED — 11 target pages.");
for (const note of notes) {
  console.log(`  ${note}`);
}
if (!baseUrl) {
  console.log("  (Set GEOMETRY_QA_BASE_URL=http://127.0.0.1:3000 for HTTP smoke after npm run start)");
}
