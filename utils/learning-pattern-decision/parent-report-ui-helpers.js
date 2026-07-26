/**
 * Subject-agnostic rollups + UI helpers for learningPatternDecision.
 */
import { SUBJECT_IDS } from "../diagnostic-engine-v2/subject-ids.js";
import { rowNeedsPracticeFromLpd, rowIsPositiveFromLpd } from "./apply-learning-pattern-decision.js";
import { guardParentFacingText } from "./lpd-parent-facing-copy.js";
import { parentTopicDisplayChromeFromRow } from "../parent-report-surface/parent-topic-display-chrome.js";

/**
 * Sync legacy row flags from LPD (internal mirror — UI should prefer LPD).
 * @param {Record<string, Record<string, Record<string, unknown>>>} maps
 */
export function syncRowFlagsFromLearningPatternDecision(maps) {
  for (const subjectId of SUBJECT_IDS) {
    const topicMap = maps?.[subjectId];
    if (!topicMap || typeof topicMap !== "object") continue;
    for (const row of Object.values(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;
      if (!row.learningPatternDecision) continue;
      row.needsPractice = rowNeedsPracticeFromLpd(row);
      row.excellent = rowIsPositiveFromLpd(row) && q >= 10;
    }
  }
}

/**
 * @param {Record<string, Record<string, Record<string, unknown>>>} maps
 * @param {Record<string, string>} subjectLabelsHe
 * @param {(subjectId: string, row: Record<string, unknown>) => string} displayNameForRow
 */
export function buildTopicRollupsFromLearningPatternDecision(maps, subjectLabelsHe, displayNameForRow) {
  /** @type {string[]} */
  const needsPractice = [];
  /** @type {string[]} */
  const excellent = [];

  for (const subjectId of SUBJECT_IDS) {
    const label = subjectLabelsHe[subjectId] || subjectId;
    const topicMap = maps?.[subjectId];
    if (!topicMap || typeof topicMap !== "object") continue;

    for (const row of Object.values(topicMap)) {
      if (!row || typeof row !== "object") continue;
      const q = Number(row.questions) || 0;
      if (q <= 0) continue;
      if (!row.learningPatternDecision) continue;

      const name = displayNameForRow(subjectId, row);
      if (rowNeedsPracticeFromLpd(row)) {
        needsPractice.push(`${label}: ${name}`);
      }
      if (rowIsPositiveFromLpd(row) && q >= 10) {
        excellent.push(`${label}: ${name}`);
      }
    }
  }

  return { needsPractice, excellent };
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function topicUiFromLearningPatternDecision(row) {
  const lpd = row?.learningPatternDecision;
  const chrome = parentTopicDisplayChromeFromRow(row);
  if (!lpd || typeof lpd !== "object") {
    return {
      hasLpd: false,
      showRow: Number(row?.questions) > 0,
      needsPractice: chrome.needsPractice,
      excellent: chrome.excellent,
      insufficientData: chrome.insufficientData,
      accuracyClass: chrome.accuracyClass,
      statusEmoji: chrome.statusEmoji,
      badgeHe: chrome.badgeHe,
      cardClassName: chrome.cardClassName,
      badgeClassName: chrome.badgeClassName,
      visualVariant: chrome.visualVariant,
      displayDecision: chrome.displayDecision,
      parentFinding: "",
      findingType: "none",
      parentWordingLevel: "no_parent_text",
    };
  }

  const q = Number(lpd.practicedQuestions) || 0;
  if (q <= 0 || lpd.topicStatus === "not_practiced") {
    return {
      hasLpd: true,
      showRow: false,
      needsPractice: false,
      excellent: false,
      insufficientData: false,
      accuracyClass: "text-white/70",
      statusEmoji: "",
      badgeHe: "",
      cardClassName: "",
      badgeClassName: "",
      visualVariant: chrome.visualVariant,
      displayDecision: chrome.displayDecision,
      parentFinding: "",
      findingType: "none",
      parentWordingLevel: "no_parent_text",
    };
  }

  const ft = String(lpd.findingType || "");
  const ts = String(lpd.topicStatus || "");

  return {
    hasLpd: true,
    showRow: true,
    needsPractice: chrome.needsPractice,
    excellent: chrome.excellent,
    insufficientData: chrome.insufficientData,
    accuracyClass: chrome.accuracyClass,
    statusEmoji: chrome.statusEmoji,
    badgeHe: chrome.badgeHe,
    cardClassName: chrome.cardClassName,
    badgeClassName: chrome.badgeClassName,
    visualVariant: chrome.visualVariant,
    displayDecision: chrome.displayDecision,
    parentFinding: guardParentFacingText(String(lpd.parentVisibleFinding || "")),
    findingType: ft,
    parentWordingLevel: String(lpd.parentWordingLevel || ""),
    topicStatus: ts,
    evidenceStrength: String(lpd.evidenceStrength || ""),
  };
}
