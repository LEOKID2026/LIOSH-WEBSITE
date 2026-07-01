import { SCIENCE_GRADES } from "../../data/science-curriculum.js";
import {
  HISTORY_GRADES as HISTORY_CURRICULUM_GRADES,
  historyTopicLabelHe as historyCurriculumTopicLabelHe,
} from "../../data/history-curriculum.js";
import { sortTopicsByBookSequence } from "../../lib/learning-book/learning-book-sequence.js";
import { resolveCanonicalGradeKey } from "./teacher-class-grade.js";
import { GRADES as MATH_GRADES } from "../../utils/math-constants.js";
import { getMathReportBucketDisplayName } from "../../utils/math-report-generator.js";
import {
  GRADES as GEOMETRY_GRADES,
  TOPICS as GEOMETRY_TOPICS,
} from "../../utils/geometry-constants.js";
import { GRADES as HEBREW_GRADES, TOPICS as HEBREW_TOPICS } from "../../utils/hebrew-constants.js";
import {
  ENGLISH_GRADES,
  ENGLISH_TOPICS,
} from "../../utils/english-question-generator.js";
import { TOPICS as MOLEDET_TOPICS, GRADES as MOLEDET_GRADES } from "../../utils/moledet-geography-constants.js";
import { isMoledetGeographyGradeAllowed } from "../../utils/moledet-geography-curriculum-gates.js";
import { isTopicHiddenFromLaunch } from "../launch-readiness/topic-launch-policy.js";

const HISTORY_GRADES = HISTORY_CURRICULUM_GRADES || {};
const historyTopicLabelHe = historyCurriculumTopicLabelHe || ((k) => String(k || ""));

const SCIENCE_TOPIC_LABELS = {
  body: "גוף האדם",
  animals: "בעלי חיים",
  plants: "צמחים",
  materials: "חומרים",
  experiments: "ניסויים",
  earth_space: "כדור הארץ וחלל",
  environment: "סביבה",
};

export function moledetGeographyTopicOptionsForGrade(gradeKey) {
  if (!isMoledetGeographyGradeAllowed(gradeKey)) return [];
  const canonical = canonicalGrade(gradeKey);
  if (!canonical) return [];
  const topics = MOLEDET_GRADES[canonical]?.topics || [];
  return topics
    .filter((t) => t !== "mixed")
    .map((key) => ({ key, label: MOLEDET_TOPICS[key]?.name || key }));
}

export function moledetGeographySubjectAvailableForGrade(gradeKey) {
  return isMoledetGeographyGradeAllowed(gradeKey);
}

function canonicalGrade(gradeKey) {
  return resolveCanonicalGradeKey(gradeKey);
}

export function mathTopicOptionsForGrade(gradeKey) {
  const canonical = canonicalGrade(gradeKey);
  if (!canonical) return [];
  const operations = MATH_GRADES[canonical]?.operations || [];
  return operations
    .filter((op) => op !== "mixed")
    .map((key) => ({ key, label: getMathReportBucketDisplayName(key) || key }));
}

export function geometryTopicOptionsForGrade(gradeKey) {
  const canonical = canonicalGrade(gradeKey);
  if (!canonical) return [];
  const topics = GEOMETRY_GRADES[canonical]?.topics || [];
  return topics
    .filter((t) => t !== "mixed")
    .map((key) => ({ key, label: GEOMETRY_TOPICS[key]?.name || key }));
}

export function hebrewTopicOptionsForGrade(gradeKey) {
  const canonical = canonicalGrade(gradeKey);
  if (!canonical) return [];
  const topics = HEBREW_GRADES[canonical]?.topics || [];
  return topics.map((key) => ({ key, label: HEBREW_TOPICS[key]?.name || key }));
}

export function englishTopicOptionsForGrade(gradeKey) {
  const canonical = canonicalGrade(gradeKey);
  if (!canonical) return [];
  const topics = ENGLISH_GRADES[canonical]?.topics || [];
  return topics.map((key) => ({ key, label: ENGLISH_TOPICS[key]?.name || key }));
}

export function scienceTopicOptionsForGrade(gradeKey) {
  const canonical = canonicalGrade(gradeKey);
  if (!canonical) return [];
  const topics = SCIENCE_GRADES[canonical]?.topics ?? [];
  const ordered = sortTopicsByBookSequence("science", canonical, topics);
  return ordered.map((key) => ({
    key,
    label: SCIENCE_TOPIC_LABELS[key] ?? key,
  }));
}

export function historyTopicOptionsForGrade(_gradeKey) {
  const contentGrade = "g6";
  const topics = HISTORY_GRADES[contentGrade]?.topics ?? [];
  const ordered = sortTopicsByBookSequence("history", contentGrade, topics);
  return ordered.map((key) => ({
    key,
    label: historyTopicLabelHe(key),
  }));
}

export function topicOptionsForSubject(subjectKey, gradeKey) {
  let opts = [];
  if (subjectKey === "math") opts = mathTopicOptionsForGrade(gradeKey);
  else if (subjectKey === "geometry") opts = geometryTopicOptionsForGrade(gradeKey);
  else if (subjectKey === "hebrew") opts = hebrewTopicOptionsForGrade(gradeKey);
  else if (subjectKey === "english") opts = englishTopicOptionsForGrade(gradeKey);
  else if (subjectKey === "science") opts = scienceTopicOptionsForGrade(gradeKey);
  else if (subjectKey === "history") opts = historyTopicOptionsForGrade(gradeKey);
  else if (subjectKey === "moledet_geography") opts = moledetGeographyTopicOptionsForGrade(gradeKey);
  return opts.filter(({ key }) => !isTopicHiddenFromLaunch(subjectKey, gradeKey, key));
}

export function defaultTopicForSubject(subjectKey, gradeKey) {
  if (subjectKey === "moledet_geography") {
    return moledetGeographyTopicOptionsForGrade(gradeKey)[0]?.key || "";
  }
  const opts = topicOptionsForSubject(subjectKey, gradeKey);
  if (subjectKey === "math") return opts[0]?.key || "addition";
  return opts[0]?.key || "";
}
