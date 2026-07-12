#!/usr/bin/env node
/**
 * Scan generated + bank question stems for UI metadata leaks.
 * npm run qa:student-question-stem-metadata
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const {
  collectStudentFacingStemsFromQuestion,
  detectStudentStemMetadataLeaks,
  sanitizeQuestionForStudentDisplay,
  sanitizeStudentQuestionStem,
} = await import("../utils/student-question-stem-sanitizer.js");
const { resolveStudentQuestionDisplayParts, isTopicDifficultyMetadataLead } =
  await import("../utils/student-question-display.js");
const { generateForMatrixCell, SUPPORTED_SUBJECTS } = await import(
  "./learning-simulator/lib/question-generator-adapters.mjs"
);
const { normalizeQuestionPayload } = await import(
  "./learning-simulator/lib/question-integrity-checks.mjs"
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "reports", "question-audit");
const OUT_JSON = join(OUT_DIR, "student-stem-metadata-leaks.json");
const OUT_EXAMPLES = join(OUT_DIR, "student-stem-metadata-examples.json");

const BEFORE_AFTER_SEEDS = [
  {
    subject: "math",
    topic: "equations",
    before:
      "רמה קלה — משוואה, מצאו את הנעלם: ___ = 1 × 5 + 12 · כיתה ג׳",
  },
  {
    subject: "geometry",
    topic: "area",
    before:
      "(כיתה ג׳) מושגים (קל): רוצים גדר סביב מגרש מלבני. במה בדרך כלל מחשבים כדי לדעת כמה חומר גדר לקנות?",
  },
  {
    subject: "science",
    topic: "body",
    before:
      "סימון ייחודי זוהה · כיתה ג׳ · נושא body · רמת easy · חקר בית־ספרי: מה ההתנהגות המתאימה יותר כשמתמקדים בסיווג תוצאות לפי קריטריון ברור?",
  },
  {
    subject: "hebrew",
    topic: "grammar",
    before: "בהתאם לכיתה ג׳ [רמה easy]: איזה משפט נכון?",
  },
  {
    subject: "english",
    topic: "vocabulary",
    before: "(כיתה ד׳) · רמת medium · Choose the correct word:",
  },
  {
    subject: "moledet",
    topic: "homeland",
    before: "שאלה בנושא: מולדת — מהו סמל המדינה?",
  },
  {
    subject: "math",
    topic: "addition",
    before: "(כיתה א׳) חישוב קל: 3 + 4 = __",
  },
  {
    subject: "geometry",
    topic: "perimeter",
    before: "כיתה ד׳: מה היקף המלבן עם צלע 5 ס״מ?",
  },
  {
    subject: "science",
    topic: "materials",
    before: "נושא materials · רמת hard · מה מאפיין חומר מבודד?",
  },
  {
    subject: "science",
    topic: "animals",
    before:
      "כיתה ה׳ · רמה קלה · מה עושה חילזון בלחות? · מוקד snail_moisture_v3",
    expectedAfter: "מה עושה חילזון בלחות?",
  },
  {
    subject: "science",
    grade: "g5",
    topic: "body",
    level: "medium",
    before: "בכיתה ה׳ — רמה בינונית: מה קשר בין דם לריאות?",
    expectedAfter: "מה קשר בין דם לריאות?",
  },
  {
    subject: "hebrew",
    topic: "reading",
    before: "זיהוי כתיב: קרא את המילה ___",
    after: "זיהוי כתיב: קרא את המילה ___",
  },
  {
    subject: "math",
    topic: "decimals",
    before: "חיסור עשרוניים (קל): 1.23 − 0.45 = __",
    expectedAfter: "1.23 − 0.45 = __",
  },
  {
    subject: "geometry",
    topic: "triangles",
    before: "פיתגורס (קל): ניצבים 3 ו-4 — מה אורך היתר?",
    expectedAfter: "ניצבים 3 ו-4 — מה אורך היתר?",
  },
  {
    subject: "math",
    topic: "divisibility",
    before: "התחלקות (קל): האם 24 מתחלק ב-3 בלי שארית?",
    expectedAfter: "האם 24 מתחלק ב-3 בלי שארית?",
  },
  {
    subject: "geometry",
    topic: "volume",
    before: "כיתה ד׳ (קל): תיבה 2×3×4 — מה הנפח?",
    expectedAfter: "תיבה 2×3×4 — מה הנפח?",
  },
  {
    subject: "moledet_geography",
    topic: "homeland",
    before: "שאלה בנושא: מולדת — מהו סמל המדינה?",
    expectedAfter: "מולדת — מהו סמל המדינה?",
  },
  {
    subject: "english",
    topic: "vocabulary",
    before: "Choose the correct word: The cat is ___ the table.",
    expectedAfter: "Choose the correct word: The cat is ___ the table.",
  },
  {
    subject: "hebrew",
    topic: "grammar",
    before: "איזה משפט נכון?",
    expectedAfter: "איזה משפט נכון?",
  },
];

const FORBIDDEN_GEOMETRY_WORDING = [
  { id: "dims_על", re: /\d+\s+על\s+\d+/u, label: "N על N dimensions" },
  { id: "plane_rectangle", re: /מלבן\s+במישור/u, label: "מלבן במישור" },
  { id: "surface_area_2d", re: /שטח\s+הפנים/u, label: "שטח הפנים for 2D" },
];

const PRESERVATION_MUST_KEEP = [
  "בכיתה יש 24 תלמידים ו-6 תלמידות. כמה תלמידים בסך הכול?",
  "בבית הספר יש מגרש מלבני. רוצים גדר סביב המגרש.",
  "מה נושא המשפט הראשי בקטע?",
  "לפני ניסוי בכיתה, מה חשוב לתעד?",
  "איך נבדיל פשוט בין חומר מוליך חשמלי למבודד בכיתה?",
];

const SAMPLES_PER_CELL = Math.max(
  1,
  Math.min(12, Number(process.env.STEM_METADATA_SAMPLES || 4))
);

const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
const LEVELS = ["easy", "medium", "hard"];

/** @type {{ subject: string, grade: string, level: string, topic: string, sample: number, field: string, stem: string, checks: object[] }[]} */
const leaks = [];

function recordLeak(ctx, field, stem, checks) {
  leaks.push({
    ...ctx,
    field,
    stem: String(stem).slice(0, 280),
    checks,
  });
}

function scanQuestion(q, ctx) {
  const sanitized = sanitizeQuestionForStudentDisplay(q);
  const display = resolveStudentQuestionDisplayParts(sanitized);
  if (display.leadText && isTopicDifficultyMetadataLead(display.leadText)) {
    recordLeak(ctx, "displayLead", display.leadText, [
      { id: "topic_difficulty_visible_lead", label: "topic/difficulty metadata visible in UI lead" },
    ]);
  }
  if (display.leadText && detectStudentStemMetadataLeaks(display.leadText).leak) {
    recordLeak(ctx, "displayLead", display.leadText, [
      { id: "visible_metadata_lead", label: "metadata lead visible after sanitize" },
    ]);
  }
  for (const field of ["stem", "question", "exerciseText", "questionLabel"]) {
    const stem = sanitized?.[field];
    if (typeof stem !== "string" || !stem.trim()) continue;
    const { leak, checks } = detectStudentStemMetadataLeaks(stem);
    if (leak) recordLeak(ctx, field, stem, checks);
    if (ctx.subject === "geometry") {
      for (const rule of FORBIDDEN_GEOMETRY_WORDING) {
        if (rule.re.test(stem)) {
          recordLeak(ctx, field, stem, [
            { id: rule.id, label: rule.label, match: rule.re.source },
          ]);
        }
      }
    }
  }
}

async function scanGeneratedSubjects() {
  const topicsBySubject = {
    math: [
      "addition",
      "subtraction",
      "multiplication",
      "division",
      "fractions",
      "equations",
      "geometry",
      "word_problems",
    ],
    geometry: ["area", "perimeter", "angles", "shapes_basic", "triangles"],
    hebrew: ["reading", "grammar", "vocabulary", "comprehension"],
    english: ["vocabulary", "grammar", "reading", "translation"],
    science: ["body", "materials", "environment", "energy"],
    moledet_geography: ["israel_map", "settlements", "climate", "homeland"],
  };

  for (const subject of SUPPORTED_SUBJECTS) {
    const topics = topicsBySubject[subject] || ["default"];
    for (const grade of GRADES) {
      for (const level of LEVELS) {
        for (const topic of topics) {
          for (let i = 0; i < SAMPLES_PER_CELL; i += 1) {
            const gen = await generateForMatrixCell(
              { grade, subjectCanonical: subject, level, topic },
              i
            );
            if (gen.unsupported || !gen.question) continue;
            const norm = normalizeQuestionPayload(gen.question);
            const raw = gen.question;
            scanQuestion(raw, {
              subject,
              grade,
              level,
              topic,
              sample: i,
              source: "generator_raw",
            });
            scanQuestion(norm, {
              subject,
              grade,
              level,
              topic,
              sample: i,
              source: "normalized",
            });
            const stems = collectStudentFacingStemsFromQuestion(
              sanitizeQuestionForStudentDisplay(raw)
            );
            if (stems.length === 0) {
              recordLeak(
                { subject, grade, level, topic, sample: i, source: "empty_stem" },
                "—",
                "",
                [{ id: "missing_stem", label: "no stem after sanitize" }]
              );
            }
          }
        }
      }
    }
  }
}

async function scanScienceBank() {
  const { SCIENCE_QUESTIONS } = await import(
    new URL("../data/science-questions.js", import.meta.url).href
  );
  for (const row of SCIENCE_QUESTIONS) {
    const q = sanitizeQuestionForStudentDisplay({
      stem: row.stem,
      question: row.stem,
    });
    scanQuestion(q, {
      subject: "science",
      grade: (row.grades && row.grades[0]) || "?",
      level: row.minLevel || "?",
      topic: row.topic || "?",
      sample: 0,
      source: `bank:${row.id}`,
    });
  }
}

async function scanEnglishPools() {
  const pools = await import(
    new URL("../data/english-questions/index.js", import.meta.url).href
  ).catch(() => null);
  if (!pools) return;
  for (const [exportName, val] of Object.entries(pools)) {
    if (!Array.isArray(val)) continue;
    for (let i = 0; i < val.length; i += 1) {
      const row = val[i];
      if (!row?.question) continue;
      scanQuestion(
        sanitizeQuestionForStudentDisplay({
          question: row.question,
          exerciseText: row.question,
        }),
        {
          subject: "english",
          grade: "?",
          level: "?",
          topic: exportName,
          sample: i,
          source: "english_pool",
        }
      );
    }
  }
}

function buildBeforeAfterReport() {
  return BEFORE_AFTER_SEEDS.map((row) => {
    const after = sanitizeStudentQuestionStem(row.before);
    if (row.expectedAfter != null && after !== row.expectedAfter) {
      throw new Error(
        `before/after mismatch [${row.subject}]: expected "${row.expectedAfter}" got "${after}"`
      );
    }
    return { ...row, after };
  });
}

function verifyPreservation() {
  const failures = [];
  for (const raw of PRESERVATION_MUST_KEEP) {
    const cleaned = sanitizeStudentQuestionStem(raw);
    if (cleaned !== raw.trim()) {
      failures.push({ raw, cleaned, reason: "over-cleaned" });
    }
    const { leak } = detectStudentStemMetadataLeaks(cleaned);
    if (leak) failures.push({ raw, cleaned, reason: "false-positive-leak" });
  }
  return failures;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  leaks.length = 0;

  const preservationFailures = verifyPreservation();
  if (preservationFailures.length > 0) {
    console.error("FAIL: sanitizer over-cleaned preserved educational wording");
    for (const f of preservationFailures.slice(0, 5)) {
      console.error(`  [${f.reason}] ${f.raw.slice(0, 80)} → ${f.cleaned.slice(0, 80)}`);
    }
    process.exit(1);
  }

  const beforeAfterExamples = buildBeforeAfterReport();
  await writeFile(OUT_EXAMPLES, JSON.stringify({ beforeAfterExamples }, null, 2), "utf8");

  await scanGeneratedSubjects();
  await scanScienceBank();
  await scanEnglishPools();

  const payload = {
    generatedAt: new Date().toISOString(),
    samplesPerCell: SAMPLES_PER_CELL,
    leakCount: leaks.length,
    leaks: leaks.slice(0, 500),
    beforeAfterExamples,
    preservationChecked: PRESERVATION_MUST_KEEP.length,
  };
  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");

  if (leaks.length > 0) {
    console.error(`FAIL: ${leaks.length} student stem metadata leak(s)`);
    console.error(`Report: ${OUT_JSON}`);
    for (const L of leaks.slice(0, 8)) {
      console.error(
        `  [${L.subject} ${L.grade} ${L.topic} ${L.level}] ${L.field}: ${L.stem.slice(0, 100)}…`
      );
    }
    process.exit(1);
  }
  console.log("PASS: no student stem metadata leaks detected");
  console.log(`Report: ${OUT_JSON}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
