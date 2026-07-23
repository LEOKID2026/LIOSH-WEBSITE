/**
 * Public indexable page data for ready question worksheets (35).
 * @module lib/worksheets/worksheet-ready-public-page.server
 */

import { READY_WORKSHEET_CATALOG, getReadyWorksheetBySlug } from "./worksheet-ready-catalog.js";
import { readyWorksheetPublicPath } from "./worksheet-ready-public-paths.js";
import {
  generateWorksheetForParent,
  publicWorksheetPayload,
} from "./worksheet-generate.server.js";
import { buildWorksheetPayloadMeta } from "./worksheet-meta-labels.server.js";
import {
  worksheetGradeLabelHe,
  worksheetLevelLabelHe,
  worksheetSubjectLabelHe,
  worksheetTopicLabelHe,
} from "./worksheet-meta-labels.server.js";
import { mathPracticeFormatTitleHe } from "./worksheet-math-practice-format.js";

/** @typedef {import("./worksheet-ready-catalog.js").ReadyWorksheetCatalogEntry} ReadyWorksheetCatalogEntry */

/**
 * @param {string} slug
 * @returns {string}
 */
export { readyWorksheetPublicPath } from "./worksheet-ready-public-paths.js";

/**
 * @returns {string[]}
 */
export function listReadyWorksheetPublicPaths() {
  return READY_WORKSHEET_CATALOG.map((entry) => readyWorksheetPublicPath(entry.slug));
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 * @returns {string}
 */
function resolveTopicHe(entry) {
  if (entry.titleHe) return entry.titleHe;
  if (entry.mathPracticeFormat) {
    return mathPracticeFormatTitleHe(
      entry.mathPracticeFormat,
      entry.topicKey,
      entry.gradeKey
    );
  }
  return worksheetTopicLabelHe(entry.subjectId, entry.topicKey);
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 */
function buildPageLabels(entry) {
  const subjectHe = worksheetSubjectLabelHe(entry.subjectId);
  const gradeHe = worksheetGradeLabelHe(entry.subjectId, entry.gradeKey);
  const topicHe = resolveTopicHe(entry);
  const levelHe = worksheetLevelLabelHe(entry.subjectId, entry.levelKey);
  return { subjectHe, gradeHe, topicHe, levelHe };
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 * @param {{ subjectHe: string, gradeHe: string, topicHe: string, levelHe: string }} labels
 * @returns {string}
 */
function buildH1(entry, labels) {
  const levelSuffix =
    entry.levelKey === "advanced" ? ` (${labels.levelHe})` : "";
  return `דף עבודה ב${labels.topicHe}${levelSuffix} ל${labels.gradeHe}`;
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 * @param {{ subjectHe: string, gradeHe: string, topicHe: string, levelHe: string }} labels
 * @returns {string}
 */
function buildSeoTitle(entry, labels) {
  return `${buildH1(entry, labels)} · להדפסה | LEO KIDS`;
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 * @param {{ subjectHe: string, gradeHe: string, topicHe: string, levelHe: string }} labels
 * @returns {string}
 */
function buildSeoDescription(entry, labels) {
  return (
    `דף עבודה מוכן ב${labels.subjectHe} ל${labels.gradeHe}: ${labels.topicHe}, רמה ${labels.levelHe}, ${entry.count} שאלות. ` +
    "מתאים לתרגול ביתי, חזרה על החומר והדפסה נוחה — כולל אפשרות לדף תשובות."
  );
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 * @param {{ subjectHe: string, gradeHe: string, topicHe: string, levelHe: string }} labels
 * @returns {string}
 */
function buildShortDescription(entry, labels) {
  return (
    `דף ${labels.subjectHe} ל${labels.gradeHe} בנושא ${labels.topicHe} — ${entry.count} שאלות ברמה ${labels.levelHe}, ` +
    "מוכן להדפסה ולתרגול עצמאי בבית."
  );
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 * @param {{ subjectHe: string, gradeHe: string, topicHe: string, levelHe: string }} labels
 * @returns {string[]}
 */
function buildLearningGoals(entry, labels) {
  /** @type {string[]} */
  const goals = [
    `תרגול ממוקד ב${labels.topicHe} במסגרת ${labels.subjectHe} ל${labels.gradeHe}`,
    `חיזוק שטף ודיוק ברמה ${labels.levelHe} באמצעות ${entry.count} שאלות מוכנות`,
    "הדפסה נוחה לשימוש בכיתה, בבית או כמשימה לסוף שבוע",
  ];

  if (entry.subjectId === "math" || entry.subjectId === "geometry") {
    goals.push("פתרון תרגילים בקצב אישי עם אפשרות לבדיקה מול דף תשובות");
  } else if (entry.subjectId === "hebrew") {
    goals.push("חיזוק הבנת הנקרא, אוצר מילים ומיומנויות שפה");
  } else if (entry.subjectId === "english") {
    goals.push("תרגול אוצר מילים, דקדוק ובניית משפטים באנגלית");
  }

  return goals.slice(0, 4);
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 * @returns {string[]}
 */
export function pickRelatedWorksheetSlugs(entry) {
  const sameSubject = READY_WORKSHEET_CATALOG.filter(
    (e) => e.subjectId === entry.subjectId && e.slug !== entry.slug
  );
  const sameGrade = READY_WORKSHEET_CATALOG.filter(
    (e) =>
      e.gradeKey === entry.gradeKey &&
      e.slug !== entry.slug &&
      e.subjectId !== entry.subjectId
  );

  /** @type {string[]} */
  const picked = [];
  for (const candidate of sameSubject) {
    if (picked.length >= 4) break;
    picked.push(candidate.slug);
  }
  for (const candidate of sameGrade) {
    if (picked.length >= 6) break;
    if (!picked.includes(candidate.slug)) picked.push(candidate.slug);
  }
  return picked;
}

/**
 * @param {ReadyWorksheetCatalogEntry} entry
 */
export function buildReadyWorksheetPublicPageMeta(entry) {
  const labels = buildPageLabels(entry);
  const slug = entry.slug;
  const h1 = buildH1(entry, labels);
  return {
    slug,
    canonicalPath: readyWorksheetPublicPath(slug),
    h1,
    seoTitle: buildSeoTitle(entry, labels),
    seoDescription: buildSeoDescription(entry, labels),
    shortDescription: buildShortDescription(entry, labels),
    learningGoals: buildLearningGoals(entry, labels),
    relatedWorksheetSlugs: pickRelatedWorksheetSlugs(entry),
    subjectId: entry.subjectId,
    subjectHe: labels.subjectHe,
    gradeKey: entry.gradeKey,
    gradeHe: labels.gradeHe,
    topicKey: entry.topicKey,
    topicHe: labels.topicHe,
    levelKey: entry.levelKey,
    levelHe: labels.levelHe,
    count: entry.count,
    inkSave: entry.inkSave === true,
  };
}

/**
 * @param {string} slug
 * @returns {Promise<
 *   | { ok: true, page: ReturnType<typeof buildReadyWorksheetPublicPageMeta>, worksheetPayload: import("./worksheet-question-types.js").WorksheetPayload, generation: Record<string, unknown> }
 *   | { ok: false, status: number }
 * >}
 */
export async function buildReadyWorksheetPublicPage(slug) {
  const entry = getReadyWorksheetBySlug(slug);
  if (!entry) {
    return { ok: false, status: 404 };
  }

  const page = buildReadyWorksheetPublicPageMeta(entry);
  const titleHe = entry.titleHe
    ? entry.titleHe
    : buildWorksheetPayloadMeta({
        subjectId: entry.subjectId,
        gradeKey: entry.gradeKey,
        topicKey: entry.topicKey,
        levelKey: entry.levelKey,
        inkSave: entry.inkSave,
        mathPracticeFormat: entry.mathPracticeFormat,
      }).titleHe;

  const generated = await generateWorksheetForParent({
    subjectId: entry.subjectId,
    gradeKey: entry.gradeKey,
    topicKey: entry.topicKey,
    levelKey: entry.levelKey,
    count: entry.count,
    seed: entry.seed,
    inkSave: entry.inkSave,
    titleHe,
    mathPracticeFormat: entry.mathPracticeFormat,
  });

  if (!generated.ok) {
    return { ok: false, status: generated.status || 500 };
  }

  return {
    ok: true,
    page,
    worksheetPayload: publicWorksheetPayload(generated.worksheetPayload),
    generation: generated.generation,
  };
}

/**
 * @param {string} slug
 * @returns {ReturnType<typeof buildReadyWorksheetPublicPageMeta> | null}
 */
export function getReadyWorksheetPublicPageMeta(slug) {
  const entry = getReadyWorksheetBySlug(slug);
  if (!entry) return null;
  return buildReadyWorksheetPublicPageMeta(entry);
}

/**
 * @param {string[]} slugs
 * @returns {Array<ReturnType<typeof buildReadyWorksheetPublicPageMeta>>}
 */
export function listReadyWorksheetPublicPageMetaBySlugs(slugs) {
  return slugs
    .map((slug) => getReadyWorksheetPublicPageMeta(slug))
    .filter(Boolean);
}
