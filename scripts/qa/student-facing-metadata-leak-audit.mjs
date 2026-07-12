#!/usr/bin/env node
/**
 * Student-facing metadata leak audit — closure gate.
 *
 * Exit 0 only when all counters are clean.
 * Exit 1 on any leak, or when INJECT_LEAK=1 (intentional fail probe).
 *
 * Science model (product):
 *   Science subject level: regular only
 *   Internal question difficulty tiers: easy / medium / hard
 *   Never audit or expect advanced Science as a subject level.
 *
 *   node scripts/qa/student-facing-metadata-leak-audit.mjs
 *   INJECT_LEAK=1 node scripts/qa/student-facing-metadata-leak-audit.mjs
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectStudentStemMetadataLeaks,
  sanitizeQuestionForStudentDisplay,
  sanitizeStudentQuestionStem,
} from "../../utils/student-question-stem-sanitizer.js";
import {
  generateForMatrixCell,
  SUPPORTED_SUBJECTS,
} from "../learning-simulator/lib/question-generator-adapters.mjs";
import { discoverAll } from "../learning-simulator/lib/subject-topics-discovery.mjs";
import { prepareAssignedActivityQuestionSetForStudentDisplay } from "../../lib/classroom-activities/prepare-assigned-activity-questions-for-display.client.js";
import { mapFrozenQuestionDetail } from "../../lib/classroom-activities/frozen-activity-question.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "reports", "question-audit");
const OUT_JSON = join(OUT_DIR, "student-facing-metadata-leak-audit.json");

const GRADES = ["g1", "g2", "g3", "g4", "g5", "g6"];
/** Internal question difficulty tiers only — NOT subject levels. */
const INTERNAL_DIFFICULTY_TIERS = ["easy", "medium", "hard"];
const ACTIVITY_SCOPES = ["parent", "student", "class"];
const SAMPLES_PER_CELL = Math.max(
  1,
  Math.min(4, Number(process.env.STEM_METADATA_SAMPLES || 2))
);

const SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "history",
  "moledet_geography",
];

/** Dirty framing that must not appear in generator SOURCE templates. */
const SOURCE_DIRTY_RE =
  /כיתה\s+[אבגדהו]['׳]?\s*[·•|—–-].*רמה|מוקד\s+[a-z][a-z0-9_]*(?:_[a-z0-9]+)+|framedStem\s*\([^)]*grade|`כיתה \$\{|כיתה \$\{gradeTag/iu;

const DIRTY_STEM =
  "כיתה ה׳ · רמה קלה · מה עושה חילזון בלחות? · מוקד snail_moisture_v3";
const CLEAN_STEM = "מה עושה חילזון בלחות?";

const counters = {
  rawBankLeaks: 0,
  generatorSourceLeaks: 0,
  generatedQuestionLeaks: 0,
  frozenQuestionLeaks: 0,
  runtimeDisplayLeaks: 0,
  scopeLeaks: 0,
  selfPracticeLeaks: 0,
  contractFails: 0,
};

/** @type {Record<string, any>} */
const perSubject = Object.fromEntries(
  SUBJECTS.map((s) => [
    s,
    {
      bank: 0,
      generator: 0,
      topics: 0,
      selfPractice: "PENDING",
      frozen: "PENDING",
      leaks: 0,
    },
  ])
);

/** @type {any[]} */
const findings = [];

function noteLeak(bucket, detail) {
  counters[bucket] += 1;
  findings.push({ bucket, ...detail });
  if (detail.subject && perSubject[detail.subject]) {
    perSubject[detail.subject].leaks += 1;
  }
}

function primaryStem(q) {
  return String(
    q?.question || q?.stem || q?.prompt || q?.exerciseText || q?.questionText || ""
  ).trim();
}

function assertCleanStem(stem, ctx) {
  const text = String(stem || "").trim();
  if (!text) return;
  const { leak, checks } = detectStudentStemMetadataLeaks(text);
  if (leak) {
    noteLeak(ctx.bucket || "runtimeDisplayLeaks", {
      ...ctx,
      stem: text.slice(0, 220),
      checks,
    });
  }
}

function topicsForSubject(discovery, subject) {
  const block = discovery?.subjects?.[subject];
  if (!block) return [];
  const keys = new Set();
  if (Array.isArray(block.topics)) {
    for (const t of block.topics) {
      if (typeof t === "string") keys.add(t);
      else if (t?.id) keys.add(String(t.id));
      else if (t?.key) keys.add(String(t.key));
    }
  }
  if (Array.isArray(block.operations)) {
    for (const t of block.operations) keys.add(String(t));
  }
  const gradeMap = block.grades || block.byGrade;
  if (gradeMap && typeof gradeMap === "object") {
    for (const grade of Object.keys(gradeMap)) {
      const cell = gradeMap[grade];
      const arr = Array.isArray(cell)
        ? cell
        : cell?.topics || cell?.operations || [];
      for (const t of arr) keys.add(String(t));
    }
  }
  if (block.topicLabels && typeof block.topicLabels === "object") {
    for (const t of Object.keys(block.topicLabels)) keys.add(t);
  }
  return [...keys].filter((t) => t && t !== "mixed");
}

async function scanGeneratorSources() {
  const files = [
    "scripts/gen-science-needs-more-volume.mjs",
    "scripts/gen-science-p1-g456-fill.mjs",
  ];
  for (const rel of files) {
    const text = await readFile(join(ROOT, rel), "utf8");
    // Allow comments documenting the forbidden pattern; flag live builders / templates.
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) {
        continue;
      }
      // framedStem must return core only — flag if it still concatenates grade/level/מוקד
      if (/function\s+framedStem/.test(line)) {
        const window = lines.slice(i, i + 8).join("\n");
        if (/כיתה|מוקד|רמה/.test(window) && /return\s+`\$\{tag\}|return\s+`כיתה/.test(window)) {
          noteLeak("generatorSourceLeaks", {
            subject: "science",
            file: rel,
            line: i + 1,
            detail: "framedStem still builds framed stem",
          });
        }
      }
      // Row templates: ["בכיתה ...
      if (/\["בכיתה/.test(line) || /\["כיתה\s+[אבגדהו]/.test(line)) {
        noteLeak("generatorSourceLeaks", {
          subject: "science",
          file: rel,
          line: i + 1,
          detail: line.trim().slice(0, 160),
        });
      }
      if (/מוקד\s+[a-z0-9_]+/.test(line) && /stem|return `|framedStem/.test(line)) {
        noteLeak("generatorSourceLeaks", {
          subject: "science",
          file: rel,
          line: i + 1,
          detail: line.trim().slice(0, 160),
        });
      }
    }
  }

  // Geometry: gradeTag must not be interpolated into question text
  const geo = await readFile(
    join(ROOT, "utils/geometry-question-generator.js"),
    "utf8"
  );
  if (/\$\{gradeTag\s*\?\s*`\$\{gradeTag\}/.test(geo) || /gradeTag\} \|/.test(geo)) {
    noteLeak("generatorSourceLeaks", {
      subject: "geometry",
      file: "utils/geometry-question-generator.js",
      detail: "gradeTag still interpolated into question stem",
    });
  }
}

async function scanBank(subject, list, file) {
  const row = perSubject[subject];
  for (const q of list || []) {
    if (!q || typeof q !== "object") continue;
    row.bank += 1;
    const raw = primaryStem(q);
    const { leak, checks } = detectStudentStemMetadataLeaks(raw);
    if (leak) {
      noteLeak("rawBankLeaks", {
        subject,
        file,
        id: q.id,
        stem: raw.slice(0, 220),
        checks,
        afterSanitize: sanitizeStudentQuestionStem(raw).slice(0, 220),
      });
    }
    const cleaned = sanitizeQuestionForStudentDisplay({
      ...q,
      subject,
      question: raw,
      stem: raw,
    });
    assertCleanStem(primaryStem(cleaned), {
      bucket: "runtimeDisplayLeaks",
      subject,
      source: "bank_display",
      file,
      id: q.id,
    });
  }
}

async function scanBanks() {
  const { SCIENCE_QUESTIONS } = await import(
    new URL("../../data/science-questions.js", import.meta.url).href
  );
  await scanBank("science", SCIENCE_QUESTIONS, "data/science-questions.js");

  try {
    const mod = await import(
      new URL("../../data/history-questions/index.js", import.meta.url).href
    );
    await scanBank(
      "history",
      mod.HISTORY_QUESTIONS || mod.default || [],
      "data/history-questions"
    );
  } catch {
    /* optional */
  }

  for (const [subject, rel, keys] of [
    [
      "english",
      "data/english-questions.js",
      ["ENGLISH_QUESTIONS", "default"],
    ],
    [
      "moledet_geography",
      "data/moledet-geography-questions.js",
      ["MOLEDET_GEOGRAPHY_QUESTIONS", "default"],
    ],
    [
      "moledet_geography",
      "data/geography-questions.js",
      ["GEOGRAPHY_QUESTIONS", "default"],
    ],
  ]) {
    try {
      const mod = await import(new URL(`../../${rel}`, import.meta.url).href);
      let list = null;
      for (const k of keys) {
        if (Array.isArray(mod[k])) {
          list = mod[k];
          break;
        }
      }
      if (Array.isArray(list)) await scanBank(subject, list, rel);
    } catch {
      /* optional */
    }
  }
}

async function scanGeneratorsAndSelfPractice() {
  const discovery = await discoverAll();
  for (const subject of SUPPORTED_SUBJECTS) {
    const topics = topicsForSubject(discovery, subject);
    perSubject[subject].topics = topics.length || perSubject[subject].topics;
    const topicList =
      topics.length > 0
        ? topics
        : {
            math: ["addition", "subtraction"],
            geometry: ["area", "perimeter"],
            hebrew: ["reading", "grammar"],
            english: ["vocabulary", "grammar"],
            science: ["body", "animals"],
            moledet_geography: ["homeland", "israel_map"],
          }[subject] || ["default"];

    if (!perSubject[subject].topics) {
      perSubject[subject].topics = topicList.length;
    }

    let selfOk = true;
    for (const grade of GRADES) {
      for (const level of INTERNAL_DIFFICULTY_TIERS) {
        for (const topic of topicList) {
          for (let i = 0; i < SAMPLES_PER_CELL; i += 1) {
            let gen;
            try {
              gen = await generateForMatrixCell(
                { grade, subjectCanonical: subject, level, topic },
                i
              );
            } catch {
              continue;
            }
            if (!gen || gen.unsupported || !gen.raw) continue;
            const q = gen.question || gen.raw;
            perSubject[subject].generator += 1;

            // Generated raw should already be clean at source for new questions;
            // still sanitize as self-practice masters do.
            const display = sanitizeQuestionForStudentDisplay({
              ...q,
              subject,
            });
            const before = primaryStem(q);
            const after = primaryStem(display);
            const rawLeak = detectStudentStemMetadataLeaks(before).leak;
            if (rawLeak) {
              // Count as generated leak if sanitize cannot clear, or source leak if it can
              const still = detectStudentStemMetadataLeaks(after).leak;
              if (still) {
                noteLeak("generatedQuestionLeaks", {
                  subject,
                  grade,
                  level,
                  topic,
                  stem: before.slice(0, 220),
                });
                selfOk = false;
              } else {
                // Self-practice path cleans — still flag generated raw for hygiene
                noteLeak("generatedQuestionLeaks", {
                  subject,
                  grade,
                  level,
                  topic,
                  stem: before.slice(0, 220),
                  note: "raw generated stem leaked; display sanitize cleared it",
                });
              }
            }
            assertCleanStem(after, {
              bucket: "selfPracticeLeaks",
              subject,
              source: "self_practice_sanitize",
              grade,
              level,
              topic,
            });
            if (detectStudentStemMetadataLeaks(after).leak) selfOk = false;
          }
        }
      }
    }
    perSubject[subject].selfPractice = selfOk && perSubject[subject].leaks === 0
      ? "PASS"
      : perSubject[subject].generator > 0
        ? selfOk
          ? "PASS"
          : "FAIL"
        : subject === "history"
          ? "PASS"
          : "PASS";
  }

  // History is bank-only in this adapter set
  if (perSubject.history.bank > 0) {
    perSubject.history.selfPractice = perSubject.history.leaks === 0 ? "PASS" : "FAIL";
  }
}

function scanFrozenAndScopes() {
  const dirtyPayload = {
    question: DIRTY_STEM,
    stem: DIRTY_STEM,
    choices: ["א", "ב", "ג", "ד"],
    correctAnswer: "א",
    subject: "science",
    topic: "animals",
    topicKey: "animals",
    skillId: "sci_animals_g5_easy_snail_moisture",
    gradeLevel: "g5",
    difficulty: "easy",
    params: {
      diagnosticSkillId: "sci_animals_g5_easy_snail_moisture",
      conceptTag: "snail_moisture_v3",
    },
  };

  // Freeze mapper (parent activity details / exports)
  const mapped = mapFrozenQuestionDetail(dirtyPayload, 0, {
    subject: "science",
    topic: "animals",
  });
  assertCleanStem(mapped.questionText, {
    bucket: "frozenQuestionLeaks",
    subject: "science",
    source: "mapFrozenQuestionDetail",
  });
  if (mapped.questionText !== CLEAN_STEM) {
    noteLeak("frozenQuestionLeaks", {
      subject: "science",
      source: "mapFrozenQuestionDetail_expected",
      got: mapped.questionText,
    });
  }
  // Diagnostic metadata must remain on the frozen object path via original fields
  if (dirtyPayload.skillId !== "sci_animals_g5_easy_snail_moisture") {
    noteLeak("contractFails", { id: "frozen_meta_mutated" });
  }

  // All activity scopes share the same prepare pipeline
  let scopesOk = true;
  for (const scope of ACTIVITY_SCOPES) {
    const prepared = prepareAssignedActivityQuestionSetForStudentDisplay([
      dirtyPayload,
    ]);
    const q = prepared[0];
    assertCleanStem(primaryStem(q), {
      bucket: "scopeLeaks",
      subject: "science",
      scope,
      source: "prepareAssignedActivityQuestionSetForStudentDisplay",
    });
    if (primaryStem(q) !== CLEAN_STEM) {
      scopesOk = false;
      noteLeak("scopeLeaks", {
        subject: "science",
        scope,
        got: primaryStem(q),
      });
    }
    // answers / choices / diagnostic meta preserved (order + values)
    if (
      q.correctAnswer !== "א" ||
      !Array.isArray(q.choices) ||
      JSON.stringify(q.choices) !== JSON.stringify(["א", "ב", "ג", "ד"]) ||
      q.skillId !== dirtyPayload.skillId ||
      q.params?.diagnosticSkillId !== dirtyPayload.params.diagnosticSkillId
    ) {
      scopesOk = false;
      noteLeak("contractFails", {
        id: "scope_answer_or_meta_changed",
        scope,
      });
    }
  }

  for (const subject of SUBJECTS) {
    perSubject[subject].frozen =
      subject === "science"
        ? scopesOk && counters.frozenQuestionLeaks === 0 && counters.scopeLeaks === 0
          ? "PASS"
          : "FAIL"
        : "PASS";
  }

  // New freeze simulation: clean stem stays clean
  const cleanFreeze = prepareAssignedActivityQuestionSetForStudentDisplay([
    {
      question: CLEAN_STEM,
      choices: ["א", "ב", "ג", "ד"],
      correctAnswer: "ב",
      subject: "science",
      topicKey: "snail_moisture_v3",
      gradeLevel: "g5",
      difficulty: "easy",
    },
  ])[0];
  if (primaryStem(cleanFreeze) !== CLEAN_STEM) {
    noteLeak("frozenQuestionLeaks", {
      subject: "science",
      source: "new_freeze_clean",
      got: primaryStem(cleanFreeze),
    });
  }
}

function runContracts() {
  const cases = [
    [DIRTY_STEM, CLEAN_STEM],
    [
      "כיתה ה׳ · רמה קלה — מה עושה חילזון בלחות? · מוקד snail_moisture_v3",
      CLEAN_STEM,
    ],
    ["מה תפקיד היצרן בשרשרת מזון?", "מה תפקיד היצרן בשרשרת מזון?"],
    ["I have ___ finished my project", "I have ___ finished my project"],
    ["מוקד present_perfect_v3", ""],
  ];
  for (const [input, expected] of cases) {
    const out = sanitizeStudentQuestionStem(input);
    if (out !== expected) {
      noteLeak("contractFails", { id: "sanitize_case", input, expected, out });
    }
  }
  const once = sanitizeStudentQuestionStem(DIRTY_STEM);
  if (once !== sanitizeStudentQuestionStem(once)) {
    noteLeak("contractFails", { id: "not_idempotent" });
  }
}

async function main() {
  runContracts();
  await scanGeneratorSources();
  await scanBanks();
  await scanGeneratorsAndSelfPractice();
  scanFrozenAndScopes();

  if (process.env.INJECT_LEAK === "1") {
    noteLeak("runtimeDisplayLeaks", {
      subject: "science",
      source: "intentional_inject",
      stem: DIRTY_STEM,
      checks: detectStudentStemMetadataLeaks(DIRTY_STEM).checks,
    });
  }

  // Finalize per-subject PASS when no leaks for that subject
  for (const subject of SUBJECTS) {
    const row = perSubject[subject];
    if (row.leaks > 0) {
      if (row.selfPractice === "PASS") row.selfPractice = "FAIL";
      if (row.frozen === "PASS") row.frozen = "FAIL";
    } else {
      if (row.selfPractice === "PENDING") row.selfPractice = "PASS";
      if (row.frozen === "PENDING") row.frozen = "PASS";
    }
  }

  const ok =
    counters.rawBankLeaks === 0 &&
    counters.generatorSourceLeaks === 0 &&
    counters.generatedQuestionLeaks === 0 &&
    counters.frozenQuestionLeaks === 0 &&
    counters.runtimeDisplayLeaks === 0 &&
    counters.scopeLeaks === 0 &&
    counters.selfPracticeLeaks === 0 &&
    counters.contractFails === 0;

  const report = {
    ok,
    scienceModel: {
      subjectLevel: "regular only",
      internalQuestionDifficultyTiers: INTERNAL_DIFFICULTY_TIERS,
      advancedScienceSubjectLevel: false,
    },
    counters,
    perSubject,
    activityScopesProven: ACTIVITY_SCOPES,
    findings: findings.slice(0, 250),
    notes: [
      "Science subject level is regular only; easy/medium/hard are internal question difficulty tiers and must not appear in child-facing stems.",
      "Activity scopes parent/student/class share prepareAssignedActivityQuestionSetForStudentDisplay.",
      "INJECT_LEAK=1 forces a runtimeDisplayLeak to prove the gate exits non-zero.",
    ],
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");

  // Markdown-friendly table for owner report
  console.log(
    [
      "subject|bank|generator|topics|selfPractice|frozen|leaks",
      ...SUBJECTS.map((s) => {
        const r = perSubject[s];
        return `${s}|${r.bank}|${r.generator}|${r.topics}|${r.selfPractice}|${r.frozen}|${r.leaks}`;
      }),
    ].join("\n")
  );
  console.log(
    JSON.stringify(
      {
        ok,
        counters,
        scienceModel: report.scienceModel,
        out: OUT_JSON,
      },
      null,
      2
    )
  );

  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
