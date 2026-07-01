/**
 * Build grade × subject × level × topic matrix rows from discovery output.
 */
import { GRADE_KEYS, LEVEL_KEYS, modUrl } from "./subject-topics-discovery.mjs";

function sortedRows(rows) {
  return [...rows].sort((a, b) => {
    const k = (x) =>
      `${x.grade}|${x.subjectCanonical}|${x.level}|${x.topic}`;
    return k(a).localeCompare(k(b));
  });
}

function rowNotes(subjectCanonical, topic, discoverySlice, isCurriculumDeclared) {
  const notes = [];
  if (topic === "mixed") {
    if (subjectCanonical === "hebrew" || subjectCanonical === "moledet_geography") {
      notes.push("mixed is runtime/UI topic selector; excluded from curriculum prose arrays");
    }
    if (subjectCanonical === "math") {
      notes.push("mixed is a math operation bucket (aggregate exercises)");
    }
    if (subjectCanonical === "english") {
      notes.push("mixed may appear as curriculum-declared topic in upper grades");
    }
    if (subjectCanonical === "science") {
      notes.push("mixed exists in science-master TOPICS but curriculum SCIENCE_GRADES topics may omit it");
    }
  }
  if (subjectCanonical === "math") {
    notes.push("no per-operation Hebrew display map in utils/math-constants.js");
    if (discoverySlice.referenceNote) notes.push(discoverySlice.referenceNote);
  }
  if (!isCurriculumDeclared && discoverySlice.curriculumSourceFile) {
    /* optional note already on row */
  }
  return notes;
}

/**
 * Attach curriculum-only topic lists for Hebrew/Moledet declarative flags.
 */
export async function enrichDiscoveryWithCurriculumIndexes(discovery) {
  const d = { ...discovery, _curriculumHebrew: {}, _curriculumMoledet: {} };

  try {
    const { HEBREW_GRADES } = await import(modUrl("data/hebrew-curriculum.js"));
    for (const gk of GRADE_KEYS) {
      d._curriculumHebrew[gk] = [...(HEBREW_GRADES[gk]?.topics || [])];
    }
  } catch {
    d._curriculumHebrew = null;
  }

  try {
    const { MOLEDET_GEOGRAPHY_GRADES } = await import(modUrl("data/moledet-geography-curriculum.js"));
    for (const gk of GRADE_KEYS) {
      d._curriculumMoledet[gk] = [...(MOLEDET_GEOGRAPHY_GRADES[gk]?.topics || [])];
    }
  } catch {
    d._curriculumMoledet = null;
  }

  return d;
}

export function buildMatrixRows(discovery) {
  const rows = [];
  const subjectOrder = ["math", "geometry", "science", "english", "hebrew", "moledet_geography"];

  for (const subjectCanonical of subjectOrder) {
    const sub = discovery.subjects[subjectCanonical];
    if (!sub) continue;

    const levels = Array.isArray(sub.levels) && sub.levels.length ? sub.levels : LEVEL_KEYS;

    for (const grade of GRADE_KEYS) {
      const topics = sub.grades?.[grade] || [];
      for (const topic of topics) {
        for (const level of levels) {
          const topicLabel =
            sub.topicLabels && Object.prototype.hasOwnProperty.call(sub.topicLabels, topic)
              ? sub.topicLabels[topic]
              : null;

          let isCurriculumDeclared = false;
          if (subjectCanonical === "science" || subjectCanonical === "english") {
            isCurriculumDeclared = topics.includes(topic);
          } else if (subjectCanonical === "hebrew") {
            const cur = discovery._curriculumHebrew?.[grade];
            isCurriculumDeclared = Array.isArray(cur) && cur.includes(topic);
          } else if (subjectCanonical === "moledet_geography") {
            const cur = discovery._curriculumMoledet?.[grade];
            isCurriculumDeclared = Array.isArray(cur) && cur.includes(topic);
          } else {
            isCurriculumDeclared = false;
          }

          const gb = sub.generatorBacked || {};
          let isGeneratorBacked = false;
          if (gb.procedural === true) isGeneratorBacked = true;
          else if (gb.inlineGenerator) isGeneratorBacked = "inline_page";
          /** MCQ bank-backed subjects (e.g. science) — Phase 4 adapter resolves via question-generator-adapters.mjs */
          else if (gb.bank) isGeneratorBacked = "bank";

          const referenceFiles = [
            sub.sourceFile,
            sub.curriculumSourceFile,
            sub.gradeGatingRef,
            sub.runtimeCrossCheckFile,
          ].filter(Boolean);

          const notes = rowNotes(subjectCanonical, topic, sub, isCurriculumDeclared);

          rows.push({
            grade,
            subjectCanonical,
            subjectRuntime: sub.subjectRuntime || subjectCanonical,
            level,
            topic,
            topicLabel,
            sourceFile: sub.sourceFile || null,
            curriculumSourceFile: sub.curriculumSourceFile || null,
            referenceFiles: [...new Set(referenceFiles)],
            isRuntimeSupported: true,
            isCurriculumDeclared,
            isGeneratorBacked,
            notes,
            warnings: [],
          });
        }
      }
    }
  }

  return sortedRows(rows);
}

export function validateMatrix(discovery, rows) {
  const errors = [];
  const warnings = [...(discovery.globalWarnings || [])];

  for (const u of discovery.unsupportedSubjects || []) {
    errors.push(`discovery import failed for "${u.subject}": ${u.error}`);
  }

  const subjectOrder = ["math", "geometry", "science", "english", "hebrew", "moledet_geography"];
  for (const sid of subjectOrder) {
    const sub = discovery.subjects[sid];
    if (!sub) {
      errors.push(`missing discovery for subject ${sid}`);
      continue;
    }
    let anyTopic = false;
    for (const gk of GRADE_KEYS) {
      const ts = sub.grades?.[gk];
      if (Array.isArray(ts) && ts.length) anyTopic = true;
    }
    if (!anyTopic) errors.push(`subject ${sid} has no topics in any grade`);

    const allowedGrades =
      Array.isArray(sub.allowedGrades) && sub.allowedGrades.length ? sub.allowedGrades : GRADE_KEYS;
    const disallowedGrades = GRADE_KEYS.filter((gk) => !allowedGrades.includes(gk));

    for (const gk of allowedGrades) {
      const ts = sub.grades?.[gk];
      if (!Array.isArray(ts) || ts.length === 0) {
        errors.push(`subject ${sid} has no runtime topics for grade ${gk}`);
      }
    }
    for (const gk of disallowedGrades) {
      const count = rows.filter((r) => r.subjectCanonical === sid && r.grade === gk).length;
      if (count > 0) errors.push(`unexpected matrix rows for out-of-scope grade ${sid} ${gk}`);
    }
  }

  if (rows.length === 0) errors.push("matrix has zero rows");

  for (const sid of subjectOrder) {
    const sub = discovery.subjects[sid];
    if (!sub) continue;
    const allowedGrades =
      Array.isArray(sub.allowedGrades) && sub.allowedGrades.length ? sub.allowedGrades : GRADE_KEYS;
    for (const gk of GRADE_KEYS) {
      if (!allowedGrades.includes(gk)) continue;
      const count = rows.filter((r) => r.subjectCanonical === sid && r.grade === gk).length;
      if (count === 0) errors.push(`no matrix rows for ${sid} ${gk}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function verifyMatrixSelfTest(rows) {
  const failures = [];
  if (rows.length === 0) failures.push("rows empty");

  const grades = new Set(rows.map((r) => r.grade));
  if (grades.size === 0) failures.push("missing all grades");

  const subjects = new Set(rows.map((r) => r.subjectCanonical));
  for (const s of ["math", "geometry", "english", "hebrew", "science"]) {
    if (!subjects.has(s)) failures.push(`missing subject ${s}`);
  }
  if (!subjects.has("moledet_geography")) failures.push("missing subject moledet_geography");

  const levels = new Set(rows.map((r) => r.level));
  for (const l of LEVEL_KEYS) {
    if (!levels.has(l)) failures.push(`missing level ${l}`);
  }

  return { ok: failures.length === 0, failures };
}

export function buildMarkdownSummary(meta) {
  const lines = [
    "# Learning simulator coverage matrix",
    "",
    `- Generated at: ${meta.generatedAt}`,
    `- Total rows: ${meta.rowCount}`,
    `- Subjects: ${meta.subjects.join(", ")}`,
    "",
    "## Per-subject topic counts (distinct topic keys)",
    "",
    ...meta.topicCountsBySubject.map((x) => `- **${x.subject}**: ${x.count} topics (${x.topics.join(", ")})`),
    "",
    "## Grades present",
    "",
    meta.gradesPresent.join(", "),
    "",
    "## Validation",
    "",
    `- OK: ${meta.validation.ok}`,
    ...(meta.validation.errors || []).map((e) => `- ERROR: ${e}`),
    "",
    "## Self-test",
    "",
    `- OK: ${meta.selfTest.ok}`,
    ...(meta.selfTest.failures || []).map((f) => `- ${f}`),
    "",
    "## Warnings",
    "",
    ...(meta.warnings.length ? meta.warnings.map((w) => `- ${w}`) : ["- (none)"]),
    "",
    "## Unsupported / failed imports",
    "",
    ...(meta.unsupportedSubjects?.length
      ? meta.unsupportedSubjects.map((u) => `- ${u.subject}: ${u.error}`)
      : ["- (none)"]),
    "",
  ];
  return lines.join("\n");
}
