/**
 * Cross-grade content duplication & age-fit audit for Math + Geometry learning books (G1–G6).
 * Run: node scripts/audit-learning-book-cross-grade-content.mjs
 * Writes: docs/learning-book/LEARNING_BOOK_CROSS_GRADE_CONTENT_AUDIT.md
 *         tmp/learning-book-cross-grade-audit.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPORT_PATH = path.join(
  ROOT,
  "docs/learning-book/LEARNING_BOOK_CROSS_GRADE_CONTENT_AUDIT.md"
);
const JSON_PATH = path.join(ROOT, "tmp/learning-book-cross-grade-audit.json");

const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const SUBJECTS = ["math", "geometry"];
const KEY_SECTIONS = [1, 2, 3, 4, 5, 6, 7];
const COMPARE_SECTIONS = [2, 3, 4, 6];

const PLACEHOLDER_MARKERS = [
  "תוכן יתווסף בהמשך",
  "בקרוב נוסיף הסבר",
  "הדף הזה מוכן לתוכן",
  "ספר בהכנה",
];

/** Expected typical max operand magnitude in core sections (2–4) by grade. */
const GRADE_NUMBER_CEILING = {
  g1: 30,
  g2: 100,
  g3: 1000,
  g4: 10000,
  g5: 100000,
  g6: 1000000,
};

/** Topic families where brief cross-grade recap is pedagogically normal. */
const REVIEW_OK_FAMILIES = new Set([
  "math:cmp",
  "math:ns_even_odd",
  "math:ns_neighbors",
  "geometry:square_perimeter",
  "geometry:square_area",
  "geometry:triangle_perimeter",
  "geometry:parallel_perpendicular",
  "geometry:quadrilaterals",
  "geometry:triangle_angles",
]);

/** Related pageIds merged into one family when skill_id differs but concept overlaps. */
const FAMILY_ALIASES = {
  "math:div": "math:division_core",
  "math:div_with_remainder": "math:division_core",
  "math:divisibility": "math:division_core",
  "math:wp_division_simple": "math:division_word_problems",
  "math:wp_groups_g2": "math:division_word_problems",
  "geometry:rectangular_prism_volume": "geometry:prism_volume",
  "geometry:prism_volume_rectangular": "geometry:prism_volume",
};

function walkDrafts(subject) {
  /** @type {string[]} */
  const files = [];
  for (const grade of GRADES) {
    const dir = path.join(ROOT, "docs/learning-book", subject, grade, "drafts");
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".md") || name === "README.md") continue;
      files.push(path.join(dir, name));
    }
  }
  return files;
}

function familyKey(subject, pageId, skillId) {
  const base = `${subject}:${pageId}`;
  if (FAMILY_ALIASES[base]) return FAMILY_ALIASES[base];
  const kind = String(skillId || "")
    .replace(/^[^:]+:kind:/, "")
    .trim();
  if (kind && kind !== pageId) {
    const skillFamily = `${subject}:${kind}`;
    if (FAMILY_ALIASES[skillFamily]) return FAMILY_ALIASES[skillFamily];
  }
  return base;
}

function stripDiagrams(text) {
  return String(text || "").replace(/:::geometry-diagram[\s\S]*?:::/g, "");
}

function normalizeText(text, { maskNumbers = false } = {}) {
  let t = stripDiagrams(text);
  t = t.replace(/\[DRAFT[^\]]*\]/gi, "");
  t = t.replace(/\*\*/g, "");
  t = t.replace(/[`]/g, "");
  t = t.replace(/^[-*]\s+/gm, "");
  t = t.replace(/\s+/g, " ").trim();
  if (maskNumbers) t = t.replace(/\d[\d,]*/g, "#");
  return t;
}

function splitSentences(text) {
  return normalizeText(text, { maskNumbers: false })
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
}

function tokenSet(text) {
  const t = normalizeText(text, { maskNumbers: true }).toLowerCase();
  return new Set(t.split(/\s+/).filter((w) => w.length > 1));
}

function jaccard(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function extractNumbers(text) {
  const nums = [];
  for (const m of String(text || "").matchAll(/\d[\d,]*/g)) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n)) nums.push(n);
  }
  return nums;
}

function extractMathLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /[=×÷+\-−]/.test(l) && /\d/.test(l))
    .map((l) => normalizeText(l));
}

function extractDiagramTypes(text) {
  const types = [];
  for (const m of String(text || "").matchAll(/type:\s*(\w+)/g)) {
    types.push(m[1]);
  }
  return types;
}

function sectionBody(page, num) {
  if (page.sections && typeof page.sections === "object" && !Array.isArray(page.sections)) {
    return page.sections[num] || "";
  }
  const sec = page.sections?.find?.((s) => s.number === num);
  return sec?.body || "";
}

function isPlaceholderPage(page) {
  if (page.pageId === "book_placeholder") return true;
  if (page.pageType === "placeholder") return true;
  const allBody = KEY_SECTIONS.map((n) => sectionBody(page, n)).join("\n");
  const markerHits = PLACEHOLDER_MARKERS.filter((m) => allBody.includes(m)).length;
  const wordCount = normalizeText(allBody).split(/\s+/).filter(Boolean).length;
  if (markerHits >= 2 && wordCount < 80) return true;
  if (allBody.includes("ספר בהכנה") && wordCount < 100) return true;
  return false;
}

function parsePage(filePath, subject) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const pageId = path.basename(filePath, ".md");
  const grade = rel.split("/")[3];
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseLearningPageMarkdown(raw, pageId);
  /** @type {Record<number, string>} */
  const sectionMap = {};
  for (const sec of parsed.sections) {
    sectionMap[sec.number] = sec.body || "";
  }
  const coreBody = COMPARE_SECTIONS.map((n) => sectionMap[n] || "").join("\n");
  return {
    file: rel,
    subject,
    grade,
    pageId,
    title: parsed.displayTitle || parsed.documentTitle,
    skillId: parsed.metadata.skill_id || "",
    pageType: parsed.metadata.page_type || "",
    family: familyKey(subject, pageId, parsed.metadata.skill_id),
    placeholder: false,
    sections: sectionMap,
    numbers: extractNumbers(coreBody),
    maxNumber: extractNumbers(coreBody).reduce((m, n) => Math.max(m, n), 0),
    mathLines: extractMathLines(
      KEY_SECTIONS.map((n) => sectionMap[n] || "").join("\n")
    ),
    diagramTypes: extractDiagramTypes(raw),
    wordCount: normalizeText(
      KEY_SECTIONS.map((n) => sectionMap[n] || "").join("\n")
    ).split(/\s+/).filter(Boolean).length,
  };
}

function comparePair(a, b) {
  /** @type {Record<number, number>} */
  const sectionSim = {};
  for (const n of KEY_SECTIONS) {
    sectionSim[n] = jaccard(sectionBody(a, n), sectionBody(b, n));
  }
  const coreSim =
    COMPARE_SECTIONS.reduce((s, n) => s + sectionSim[n], 0) / COMPARE_SECTIONS.length;

  const sentencesA = new Set(
    COMPARE_SECTIONS.flatMap((n) => splitSentences(sectionBody(a, n)))
  );
  const sentencesB = new Set(
    COMPARE_SECTIONS.flatMap((n) => splitSentences(sectionBody(b, n)))
  );
  let exactDupes = 0;
  for (const s of sentencesA) {
    if (sentencesB.has(s)) exactDupes += 1;
  }

  const mathA = new Set(a.mathLines);
  const mathB = new Set(b.mathLines);
  let sharedMath = 0;
  for (const m of mathA) if (mathB.has(m)) sharedMath += 1;

  const sharedDiagrams = a.diagramTypes.filter((d) => b.diagramTypes.includes(d));

  return {
    grades: [a.grade, b.grade],
    files: [a.file, b.file],
    sectionSim,
    coreSim,
    exactDuplicateSentences: exactDupes,
    sharedMathExamples: sharedMath,
    sharedDiagramTypes: sharedDiagrams,
    maxNumberDelta: b.maxNumber - a.maxNumber,
  };
}

function gradeIndex(g) {
  return GRADES.indexOf(g);
}

function verdictForFamily(familyKeyStr, pages, pairs) {
  const real = pages.filter((p) => !p.placeholder);
  if (real.length === 0) {
    return {
      verdict: "PLACEHOLDER_ONLY",
      similarity: "—",
      ageFit: "—",
      notes: "All pages in family are placeholders or stub content.",
      action: "Defer until real content writing",
    };
  }
  if (real.length === 1) {
    return {
      verdict: "PASS",
      similarity: "single grade only",
      ageFit: "OK",
      notes: `Authored in ${real[0].grade} only; no cross-grade duplicate to compare.`,
      action: "No action",
    };
  }

  const realPairs = pairs.filter(({ a, b }) => !a.placeholder && !b.placeholder);
  const maxCoreSim = Math.max(0, ...realPairs.map((p) => p.coreSim));
  const maxExact = Math.max(0, ...realPairs.map((p) => p.exactDuplicateSentences));
  const maxSharedMath = Math.max(0, ...realPairs.map((p) => p.sharedMathExamples));
  const gradesSorted = [...new Set(real.map((p) => p.grade))].sort(
    (x, y) => gradeIndex(x) - gradeIndex(y)
  );

  const progressionNotes = [];
  for (let i = 0; i < gradesSorted.length - 1; i += 1) {
    const lo = real.find((p) => p.grade === gradesSorted[i]);
    const hi = real.find((p) => p.grade === gradesSorted[i + 1]);
    if (lo && hi) {
      progressionNotes.push(`${lo.grade}→${hi.grade} max# ${lo.maxNumber}→${hi.maxNumber}`);
    }
  }

  const highest = real.find((p) => p.grade === gradesSorted[gradesSorted.length - 1]);
  const lowest = real.find((p) => p.grade === gradesSorted[0]);
  let ageFit = "OK";
  let ageNote = "";
  if (highest && highest.maxNumber > 0) {
    const ceiling = GRADE_NUMBER_CEILING[highest.grade] || 100000;
    if (highest.maxNumber < ceiling / 10 && maxCoreSim > 0.55) {
      ageFit = "Too simple for top grade";
      ageNote = `${highest.grade} core examples top at ${highest.maxNumber} (expected nearer ${ceiling}).`;
    }
  }
  if (lowest && highest && highest.maxNumber <= lowest.maxNumber && gradesSorted.length > 1) {
    ageFit = "No numeric progression";
    ageNote = `Max example number does not increase (${lowest.maxNumber} → ${highest.maxNumber}).`;
  }

  const simLabel = `core≈${(maxCoreSim * 100).toFixed(0)}%; dup§=${maxExact}; sharedMath=${maxSharedMath}`;

  let verdict = "PASS";
  let notes = [];
  let action = "No action";

  if (maxCoreSim >= 0.88 && maxSharedMath >= 2) {
    verdict = "FAIL_DUPLICATE";
    notes.push("Very high section similarity with repeated worked examples.");
    action = "Fix now — rewrite higher-grade explanations/examples";
  } else if (maxCoreSim >= 0.82 && maxExact >= 3) {
    verdict = "FAIL_DUPLICATE";
    notes.push("Multiple exact duplicated sentences across grades.");
    action = "Fix now — differentiate wording and examples";
  } else if (maxCoreSim >= 0.78 && maxSharedMath >= 1) {
    verdict = "NEEDS_POLISH";
    notes.push("Strong structural overlap; shared math line(s).");
    action = "Polish — stronger grade-specific numbers/methods";
  } else if (ageFit.startsWith("Too simple") || ageFit === "No numeric progression") {
    if (maxCoreSim >= 0.65) {
      verdict = "FAIL_AGE_FIT";
      notes.push(ageNote);
      action = "Fix now — advance examples for upper grades";
    } else {
      verdict = "NEEDS_POLISH";
      notes.push(ageNote || "Numeric range may not match grade band.");
      action = "Polish — update magnitudes/method depth";
    }
  } else if (maxCoreSim >= 0.72) {
    if (REVIEW_OK_FAMILIES.has(familyKeyStr)) {
      verdict = "REVIEW_OK";
      notes.push("Similar framing but acceptable review topic; check examples still scale.");
      action = "Review — confirm numbers/methods progress";
    } else {
      verdict = "NEEDS_POLISH";
      notes.push("Moderate overlap; verify method depth differs by grade.");
      action = "Polish — tighten grade-specific strategy";
    }
  } else if (maxCoreSim >= 0.55 && REVIEW_OK_FAMILIES.has(familyKeyStr)) {
    verdict = "REVIEW_OK";
    notes.push("Concept recap across grades with distinct enough body text.");
    action = "No action unless owner wants richer upper-grade examples";
  } else {
    notes.push("Grade progression visible in wording and/or number range.");
    if (progressionNotes.length) notes.push(progressionNotes.join("; "));
  }

  if (maxExact >= 5 && verdict === "PASS") {
    verdict = "NEEDS_POLISH";
    notes.push(`${maxExact} exact shared sentences — likely template reuse.`);
    action = "Polish — vary sentences per grade";
  }

  return {
    verdict,
    similarity: simLabel,
    ageFit: ageFit === "OK" ? "OK" : ageFit,
    notes: notes.join(" "),
    action,
    maxCoreSim,
    maxExact,
    maxSharedMath,
    grades: gradesSorted,
  };
}

function buildFamilies(pages) {
  /** @type {Map<string, typeof pages>} */
  const map = new Map();
  for (const p of pages) {
    if (!map.has(p.family)) map.set(p.family, []);
    map.get(p.family).push(p);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => gradeIndex(a.grade) - gradeIndex(b.grade));
  }
  return map;
}

function mdEscape(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function generateReport(data) {
  const lines = [];
  lines.push("# Learning Book Cross-Grade Content Audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push("Scope: Math (חשבון) + Geometry (גאומטריה), grades G1–G6 draft markdown.");
  lines.push("Audit-only — no content was modified.");
  lines.push("");

  lines.push("## A. Executive summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Total draft files scanned | ${data.totals.files} |`);
  lines.push(`| Math pages | ${data.totals.mathPages} |`);
  lines.push(`| Geometry pages | ${data.totals.geometryPages} |`);
  lines.push(`| Topic families (by skill/page family) | ${data.totals.families} |`);
  lines.push(`| Repeated families (2+ grades or 2+ pages) | ${data.totals.repeatedFamilies} |`);
  lines.push(`| PASS | ${data.counts.PASS} |`);
  lines.push(`| REVIEW_OK | ${data.counts.REVIEW_OK} |`);
  lines.push(`| NEEDS_POLISH | ${data.counts.NEEDS_POLISH} |`);
  lines.push(`| FAIL_DUPLICATE | ${data.counts.FAIL_DUPLICATE} |`);
  lines.push(`| FAIL_AGE_FIT | ${data.counts.FAIL_AGE_FIT} |`);
  lines.push(`| PLACEHOLDER_ONLY | ${data.counts.PLACEHOLDER_ONLY} |`);
  lines.push("");

  lines.push("## B. Math / חשבון findings");
  lines.push("");
  lines.push(
    "| Topic family | Grades | Files | Similarity / duplication signal | Age-fit verdict | Notes | Recommended action |"
  );
  lines.push("|---|---|---|---|---|---|---|");
  for (const row of data.mathRows) {
    lines.push(
      `| ${mdEscape(row.family)} | ${row.grades} | ${mdEscape(row.files)} | ${mdEscape(row.similarity)} | ${mdEscape(row.ageFit)} | ${mdEscape(row.notes)} | ${mdEscape(row.action)} |`
    );
  }
  lines.push("");

  lines.push("## C. Geometry / גאומטריה findings");
  lines.push("");
  lines.push(
    "| Topic family | Grades | Files | Similarity / duplication signal | Age-fit verdict | Notes | Recommended action |"
  );
  lines.push("|---|---|---|---|---|---|---|");
  for (const row of data.geometryRows) {
    lines.push(
      `| ${mdEscape(row.family)} | ${row.grades} | ${mdEscape(row.files)} | ${mdEscape(row.similarity)} | ${mdEscape(row.ageFit)} | ${mdEscape(row.notes)} | ${mdEscape(row.action)} |`
    );
  }
  lines.push("");

  lines.push("## D. Highest priority fixes");
  lines.push("");
  if (data.priority.length === 0) {
    lines.push("_No FAIL_DUPLICATE / FAIL_AGE_FIT families detected._");
  } else {
    for (const p of data.priority) {
      lines.push(`- **${p.family}** (${p.grades}): ${p.notes} → _${p.action}_`);
    }
  }
  lines.push("");

  lines.push("## E. Acceptable repeated-review patterns");
  lines.push("");
  lines.push(
    "These families repeat core ideas across grades but show acceptable recap or clear numeric/method progression. Owner may still polish wording."
  );
  lines.push("");
  if (data.acceptableReview.length === 0) {
    lines.push("_None auto-classified — see PASS rows in tables B/C._");
  } else {
    for (const p of data.acceptableReview) {
      lines.push(`- **${p.familyKey.replace(/^math:|^geometry:/, "")}** (${p.grades}) — ${p.verdict}: ${p.notes}`);
    }
  }
  lines.push("");

  lines.push("## F. Placeholder-only books/pages");
  lines.push("");
  lines.push("### Whole-book placeholders");
  lines.push("");
  for (const p of data.placeholderBooks) {
    lines.push(`- \`${p}\``);
  }
  lines.push("");
  lines.push("### Placeholder-only topic families");
  lines.push("");
  for (const p of data.placeholderFamilies) {
    lines.push(`- **${p.family}** — grades: ${p.grades}`);
  }
  lines.push("");
  lines.push("### Grades with partial real content (Math)");
  lines.push("");
  for (const row of data.mathGradeCoverage) {
    lines.push(
      `- **${row.grade}**: ${row.real} authored / ${row.placeholder} placeholder / ${row.total} total pages`
    );
  }
  lines.push("");
  lines.push("### Grades with partial real content (Geometry)");
  lines.push("");
  for (const row of data.geometryGradeCoverage) {
    lines.push(
      `- **${row.grade}**: ${row.real} authored / ${row.placeholder} placeholder / ${row.total} total pages`
    );
  }
  lines.push("");

  lines.push("## G. Recommended next action");
  lines.push("");
  lines.push("### Fix now (before treating books content-ready)");
  lines.push("");
  for (const a of data.actions.fixNow) lines.push(`- ${a}`);
  if (!data.actions.fixNow.length) lines.push("- _None flagged as blocking duplicates._");
  lines.push("");
  lines.push("### Defer until real content writing");
  lines.push("");
  for (const a of data.actions.defer) lines.push(`- ${a}`);
  lines.push("");
  lines.push("### No action");
  lines.push("");
  for (const a of data.actions.noAction.slice(0, 25)) lines.push(`- ${a}`);
  if (data.actions.noAction.length > 25) {
    lines.push(`- _…and ${data.actions.noAction.length - 25} more PASS families_`);
  }
  lines.push("");

  lines.push("## Appendix: Cross-grade topic map (repeated families)");
  lines.push("");
  for (const fam of data.topicMap) {
    lines.push(`### ${fam.family}`);
    lines.push("");
    lines.push("| Grade | pageId | skill_id | Title | File |");
    lines.push("|-------|--------|----------|-------|------|");
    for (const p of fam.pages) {
      lines.push(
        `| ${p.grade} | ${p.pageId} | ${mdEscape(p.skillId)} | ${mdEscape(p.title)} | \`${p.file}\` |`
      );
    }
    lines.push("");
  }

  lines.push("## Appendix: Methodology");
  lines.push("");
  lines.push("- Sections parsed via `parseLearningPageMarkdown` (7 standard sections).");
  lines.push("- Families grouped by `subject:pageId` with optional alias merges (e.g. division variants).");
  lines.push("- Similarity: Jaccard word overlap on normalized text (numbers masked) for sections 2–4 core.");
  lines.push("- Duplication signals: exact duplicate sentences, shared math lines, shared diagram types.");
  lines.push("- Age-fit heuristic: max numeric operand in sections 2–4 vs grade ceiling (Math). Geometry uses side lengths/angles — small numbers can be valid; treat geometry FAIL_AGE_FIT as a signal to check diagram dimensions, not operand magnitude alone.");
  lines.push("- Verdicts are automated signals plus rule thresholds — owner should spot-check FAIL/NEEDS_POLISH rows.");
  lines.push("");

  return lines.join("\n");
}

// --- main ---
/** @type {ReturnType<typeof parsePage>[]} */
const allPages = [];
for (const subject of SUBJECTS) {
  for (const file of walkDrafts(subject)) {
    const page = parsePage(file, subject);
    page.placeholder = isPlaceholderPage(page);
    allPages.push(page);
  }
}

const mathPages = allPages.filter((p) => p.subject === "math");
const geometryPages = allPages.filter((p) => p.subject === "geometry");

function analyzeSubject(pages, subject) {
  const families = buildFamilies(pages);
  /** @type {object[]} */
  const rows = [];
  /** @type {object[]} */
  const topicMap = [];

  for (const [family, members] of families) {
    if (members.length < 2 && !members.some((m) => !m.placeholder)) continue;

    const pairs = [];
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        pairs.push({
          a: members[i],
          b: members[j],
          ...comparePair(members[i], members[j]),
        });
      }
    }

    const repeated =
      new Set(members.map((m) => m.grade)).size >= 2 ||
      members.filter((m) => !m.placeholder).length >= 2;
    if (!repeated && members.length < 2) continue;

    const result = verdictForFamily(family, members, pairs);
    const realMembers = members.filter((m) => !m.placeholder);
    const grades = [...new Set(members.map((m) => m.grade))].join(", ");
    const files = members.map((m) => `${m.grade}/${m.pageId}`).join("; ");

    rows.push({
      family: family.replace(/^math:|^geometry:/, ""),
      familyKey: family,
      grades,
      files,
      similarity: result.similarity,
      ageFit: result.ageFit,
      notes: result.notes,
      action: result.action,
      verdict: result.verdict,
      maxCoreSim: result.maxCoreSim ?? 0,
    });

    if (new Set(members.map((m) => m.grade)).size >= 2) {
      topicMap.push({
        family,
        pages: members.map((m) => ({
          grade: m.grade,
          pageId: m.pageId,
          skillId: m.skillId,
          title: m.title,
          file: m.file,
          placeholder: m.placeholder,
        })),
      });
    }
  }

  rows.sort((a, b) => {
    const rank = { FAIL_DUPLICATE: 0, FAIL_AGE_FIT: 1, NEEDS_POLISH: 2, REVIEW_OK: 3, PASS: 4, PLACEHOLDER_ONLY: 5 };
    return (rank[a.verdict] ?? 9) - (rank[b.verdict] ?? 9) || b.maxCoreSim - a.maxCoreSim;
  });

  topicMap.sort((a, b) => a.family.localeCompare(b.family));

  return { rows, topicMap, families };
}

const mathAnalysis = analyzeSubject(mathPages, "math");
const geometryAnalysis = analyzeSubject(geometryPages, "geometry");
const allRows = [...mathAnalysis.rows, ...geometryAnalysis.rows];

const counts = {
  PASS: 0,
  REVIEW_OK: 0,
  NEEDS_POLISH: 0,
  FAIL_DUPLICATE: 0,
  FAIL_AGE_FIT: 0,
  PLACEHOLDER_ONLY: 0,
};
for (const r of allRows) counts[r.verdict] = (counts[r.verdict] || 0) + 1;

const repeatedFamilies = allRows.filter(
  (r) => r.verdict !== "PLACEHOLDER_ONLY" && r.grades.includes(",")
).length;

function gradeCoverage(pages) {
  return GRADES.map((grade) => {
    const g = pages.filter((p) => p.grade === grade);
    return {
      grade,
      total: g.length,
      placeholder: g.filter((p) => p.placeholder).length,
      real: g.filter((p) => !p.placeholder).length,
    };
  });
}

const placeholderBooks = GRADES.flatMap((g) =>
  SUBJECTS.map((s) => {
    const p = allPages.find(
      (x) => x.grade === g && x.subject === s && x.pageId === "book_placeholder"
    );
    return p ? `${s}/${g}/book_placeholder` : null;
  })
).filter(Boolean);

const placeholderFamilies = allRows
  .filter((r) => r.verdict === "PLACEHOLDER_ONLY")
  .map((r) => ({ family: r.familyKey, grades: r.grades }));

const priority = allRows.filter((r) =>
  ["FAIL_DUPLICATE", "FAIL_AGE_FIT"].includes(r.verdict)
);

  const reviewOk = allRows.filter((r) => r.verdict === "REVIEW_OK");
  const acceptableReview = allRows.filter((r) => {
    if (r.verdict === "REVIEW_OK") return true;
    if (REVIEW_OK_FAMILIES.has(r.familyKey) && ["PASS", "NEEDS_POLISH"].includes(r.verdict)) {
      return true;
    }
    if (r.verdict === "PASS" && /progression/i.test(r.notes)) return true;
    return false;
  });

const actions = {
  fixNow: [...new Set(priority.map((p) => `${p.familyKey}: ${p.action}`))],
  defer: [
    ...placeholderBooks.map((p) => `Write real content for ${p}`),
    ...placeholderFamilies.map((p) => `Author ${p.family} when curriculum page exists`),
  ],
  noAction: allRows
    .filter((r) => r.verdict === "PASS")
    .map((r) => `${r.familyKey} (${r.grades})`),
};

const reportData = {
  totals: {
    files: allPages.length,
    mathPages: mathPages.length,
    geometryPages: geometryPages.length,
    families: mathAnalysis.families.size + geometryAnalysis.families.size,
    repeatedFamilies,
  },
  counts,
  mathRows: mathAnalysis.rows,
  geometryRows: geometryAnalysis.rows,
  priority,
  reviewOk,
  acceptableReview,
  placeholderBooks,
  placeholderFamilies,
  mathGradeCoverage: gradeCoverage(mathPages),
  geometryGradeCoverage: gradeCoverage(geometryPages),
  actions,
  topicMap: [...mathAnalysis.topicMap, ...geometryAnalysis.topicMap],
};

fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
fs.writeFileSync(JSON_PATH, JSON.stringify(reportData, null, 2), "utf8");
fs.writeFileSync(REPORT_PATH, generateReport(reportData), "utf8");

console.log(`Cross-grade audit complete.`);
console.log(`  Files scanned: ${allPages.length} (math ${mathPages.length}, geometry ${geometryPages.length})`);
console.log(`  Repeated families analyzed: ${allRows.length}`);
console.log(`  PASS=${counts.PASS} REVIEW_OK=${counts.REVIEW_OK} NEEDS_POLISH=${counts.NEEDS_POLISH}`);
console.log(`  FAIL_DUPLICATE=${counts.FAIL_DUPLICATE} FAIL_AGE_FIT=${counts.FAIL_AGE_FIT} PLACEHOLDER_ONLY=${counts.PLACEHOLDER_ONLY}`);
console.log(`  Report: ${path.relative(ROOT, REPORT_PATH)}`);
console.log(`  JSON:   ${path.relative(ROOT, JSON_PATH)}`);
