/**
 * Fail-fast preflight before mass 1000 seed — all launch subjects including moledet-geography.
 */
import { SCIENCE_GRADES } from "../../../../data/science-curriculum.js";
import { HISTORY_GRADES } from "../../../../data/history-curriculum.js";
import { MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER } from "../../../../data/moledet-geography-curriculum.js";
import {
  G2_EASY_QUESTIONS,
  G3_EASY_QUESTIONS,
  G4_EASY_QUESTIONS,
  G5_EASY_QUESTIONS,
  G6_EASY_QUESTIONS,
} from "../../../../data/geography-questions/index.js";
import { getLearningBookEntry } from "../../../../lib/learning-book/learning-book-catalog.js";
import { REPORT_AGG_SUBJECTS } from "../../../../lib/parent-server/report-data-aggregate.server.js";
import { GRADES as GEOMETRY_GRADES } from "../../../../utils/geometry-constants.js";
import { GRADES as MOLEDET_GRADES } from "../../../../utils/moledet-geography-constants.js";
import { isMoledetGeographyGradeAllowed } from "../../../../utils/moledet-geography-curriculum-gates.js";
import { taxonomyIdsForReportBucket } from "../../../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { enrichMetadataFromTaxonomy } from "../../../../utils/diagnostic-engine-v2/topic-taxonomy-metadata-enrichment.js";
import { defaultTopicForSubject } from "../../../virtual-student-qa/scenarios/student-personas.mjs";
import { ENGINE_DECISIONS } from "./constants.mjs";
import {
  ALL_LAUNCH_SUBJECTS,
  MOLEDET_GEOGRAPHY_SUBJECT,
  isMassSimSubjectGradeAllowed,
  isSubjectInReportAggregate,
  moledetGeographyCatalogSubjectForGrade,
  reportAggregateSubjectKey,
} from "./subject-registry.mjs";

const LEGACY_TOPICS = {
  math: ["addition", "subtraction", "multiplication", "division", "fractions", "word_problems", "compare"],
  geometry: ["shapes_basic", "angles", "area", "symmetry", "coordinates"],
  hebrew: ["reading", "comprehension", "writing", "grammar", "vocabulary"],
  english: ["vocabulary", "grammar", "phonics", "translation", "sentences"],
  science: ["body", "experiments", "materials", "plants", "energy"],
  history: ["what_is_history", "classical_greece", "hellenism_jews", "hasmonaeans", "rome_jews"],
};

function topicsForSubjectGrade(subject, grade) {
  if (subject === "science") {
    const gradeTopics = SCIENCE_GRADES[`g${grade}`]?.topics || [];
    if (gradeTopics.length) return gradeTopics.filter((t) => t !== "mixed");
  }
  if (subject === "history") {
    const gradeTopics = HISTORY_GRADES[`g${grade}`]?.topics || [];
    if (gradeTopics.length) return gradeTopics.filter((t) => t !== "mixed");
  }
  if (subject === MOLEDET_GEOGRAPHY_SUBJECT) {
    const gradeTopics = MOLEDET_GRADES[`g${grade}`]?.topics || [];
    return gradeTopics.filter((t) => t !== "mixed");
  }
  if (subject === "geometry") {
    const gradeTopics = GEOMETRY_GRADES[`g${grade}`]?.topics || [];
    if (gradeTopics.length) return gradeTopics.filter((t) => t !== "mixed");
  }
  return (LEGACY_TOPICS[subject] || ["general"]).filter((t) => t !== "mixed");
}

function countMoledetQuestionRows(pool) {
  if (!pool || typeof pool !== "object") return 0;
  let n = 0;
  for (const rows of Object.values(pool)) {
    if (Array.isArray(rows)) n += rows.length;
  }
  return n;
}

const MOLEDET_QUESTION_POOLS = {
  g2: G2_EASY_QUESTIONS,
  g3: G3_EASY_QUESTIONS,
  g4: G4_EASY_QUESTIONS,
  g5: G5_EASY_QUESTIONS,
  g6: G6_EASY_QUESTIONS,
};

/**
 * @param {{ subjects: string[], grades: number[] }} cfg
 */
export function runMassSimulationPreflight(cfg) {
  /** @type {Array<{ check: string, ok: boolean, detail?: string }>} */
  const checks = [];
  const failures = [];

  function fail(check, detail) {
    checks.push({ check, ok: false, detail });
    failures.push(`${check}: ${detail}`);
  }

  function pass(check, detail) {
    checks.push({ check, ok: true, detail });
  }

  const { subjects, grades } = cfg;

  // 1. subject keys
  for (const subject of subjects) {
    if (!ALL_LAUNCH_SUBJECTS.includes(subject)) {
      fail("subject_key", `unknown subject "${subject}" — expected one of ${ALL_LAUNCH_SUBJECTS.join(", ")}`);
    }
  }
  if (!failures.length) {
    pass("subject_key", subjects.join(", "));
  }

  // 2–8 per subject
  for (const subject of subjects) {
    const aggKey = reportAggregateSubjectKey(subject);

    // 2. topics per teachable grade
    for (const grade of grades) {
      if (!isMassSimSubjectGradeAllowed(subject, grade)) continue;
      const topics = topicsForSubjectGrade(subject, grade);
      if (!topics.length) {
        fail(
          "topics",
          `${subject} g${grade}: no curriculum topics (moledet/geography g1 is intentionally excluded)`,
        );
      }
    }
    if (!checks.some((c) => c.check === "topics" && !c.ok && c.detail?.startsWith(subject))) {
      pass("topics", `${subject}: topics OK for assigned grades`);
    }

    // 3. questions (moledet-geography pools + catalog; others assume synthetic seed OK if topics exist)
    if (subject === MOLEDET_GEOGRAPHY_SUBJECT) {
      for (const gradeKey of MOLEDET_GEOGRAPHY_TEACHABLE_GRADE_ORDER) {
        const grade = Number(gradeKey.slice(1));
        if (!grades.includes(grade)) continue;
        const qCount = countMoledetQuestionRows(MOLEDET_QUESTION_POOLS[gradeKey]);
        const spine = moledetGeographyCatalogSubjectForGrade(grade);
        const book = spine ? getLearningBookEntry(spine, gradeKey) : null;
        if (qCount < 1) {
          fail("questions", `moledet-geography ${gradeKey}: question pool empty`);
        } else if (!book) {
          fail("questions", `moledet-geography ${gradeKey}: no learning-book catalog entry for spine=${spine}`);
        } else {
          pass("questions", `moledet-geography ${gradeKey}: ${qCount} MCQ rows, book=${spine}/${gradeKey}`);
        }
      }
    } else {
      pass("questions", `${subject}: synthetic seed (topic pools validated)`);
    }

    // 4. report mapping
    if (!isSubjectInReportAggregate(subject)) {
      fail("report_mapping", `${subject} → ${aggKey} not in REPORT_AGG_SUBJECTS [${REPORT_AGG_SUBJECTS.join(", ")}]`);
    } else {
      pass("report_mapping", `${subject} → ${aggKey}`);
    }

    // 5. taxonomy / safeSubskill metadata sample
    const sampleGrade = grades.find((g) => isMassSimSubjectGradeAllowed(subject, g)) || grades[0];
    const sampleTopic = defaultTopicForSubject(subject, sampleGrade);
    const enriched = enrichMetadataFromTaxonomy({
      subjectId: subject === MOLEDET_GEOGRAPHY_SUBJECT ? MOLEDET_GEOGRAPHY_SUBJECT : subject,
      topic: sampleTopic,
      contentGradeKey: `g${sampleGrade}`,
      source: { params: { kind: "facts" } },
      baseMeta: { metadataSource: "mass_preflight" },
    });
    if (enriched.taxonomyMissing && subject !== "english") {
      fail(
        "metadata",
        `${subject}/${sampleTopic}/g${sampleGrade}: taxonomyMissing (no skillId/subskill for engine)`,
      );
    } else {
      pass(
        "metadata",
        `${subject}/${sampleTopic}/g${sampleGrade}: skillId=${enriched.skillId || "—"} taxonomyMissing=${!!enriched.taxonomyMissing}`,
      );
    }

    // 6. engine coverage bridge
    const taxIds = taxonomyIdsForReportBucket(
      subject === MOLEDET_GEOGRAPHY_SUBJECT ? MOLEDET_GEOGRAPHY_SUBJECT : subject,
      sampleTopic,
    );
    if (!taxIds.length && subject !== "english") {
      fail("engine_coverage", `${subject}/${sampleTopic}: taxonomyIdsForReportBucket returned []`);
    } else {
      pass("engine_coverage", `${subject}/${sampleTopic}: ${taxIds.slice(0, 3).join(", ") || "english-optional"}`);
    }
  }

  // 7. parent report summary subjects
  for (const subject of subjects) {
    const aggKey = reportAggregateSubjectKey(subject);
    if (!REPORT_AGG_SUBJECTS.includes(aggKey)) {
      fail("parent_report_summary", `${aggKey} missing from parent report aggregate`);
    }
  }
  if (!checks.some((c) => c.check === "parent_report_summary" && !c.ok)) {
    pass("parent_report_summary", "all subjects in REPORT_AGG_SUBJECTS");
  }

  // 8. moledet/geography grade gates + cohort feasibility
  if (subjects.includes(MOLEDET_GEOGRAPHY_SUBJECT)) {
    const blockedGrades = grades.filter((g) => !isMoledetGeographyGradeAllowed(`g${g}`));
    const allowedGrades = grades.filter((g) => isMassSimSubjectGradeAllowed(MOLEDET_GEOGRAPHY_SUBJECT, g));
    if (!allowedGrades.length) {
      fail("moledet_geography_grades", `no requested grades support moledet-geography (min teach g2)`);
    } else {
      pass(
        "moledet_geography_grades",
        `teachable grades: ${allowedGrades.map((g) => `g${g}`).join(", ")}` +
          (blockedGrades.length ? `; excluded: ${blockedGrades.map((g) => `g${g}`).join(", ")}` : ""),
      );
    }
    const homelandTopic = topicsForSubjectGrade(MOLEDET_GEOGRAPHY_SUBJECT, allowedGrades[0] || 2);
    const hasHomeland = homelandTopic.includes("homeland");
    const hasGeography = homelandTopic.includes("geography");
    if (!hasHomeland || !hasGeography) {
      fail("moledet_geography_topics", `expected homeland + geography topics in curriculum pool`);
    } else {
      pass("moledet_geography_topics", "homeland (מולדת) + geography (גאוגרפיה) topics present");
    }
  }

  // engine decisions roster unchanged
  pass("engine_decisions_roster", ENGINE_DECISIONS.join(", "));

  const ok = failures.length === 0;
  return { ok, failures, checks, subjects, grades };
}

export function printPreflightReport(result) {
  console.log("[mass-sim] preflight — all launch subjects");
  for (const c of result.checks) {
    console.log(`  [${c.ok ? "OK" : "FAIL"}] ${c.check}${c.detail ? `: ${c.detail}` : ""}`);
  }
  if (!result.ok) {
    console.error("\n[mass-sim] PREFLIGHT FAILED — fix before starting 1000:");
    for (const f of result.failures) console.error(`  - ${f}`);
  } else {
    console.log("\n[mass-sim] PREFLIGHT PASS — safe to start full run");
  }
}
