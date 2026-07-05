/**
 * Subject summary / letter owner-copy resolver — thin bridge to owner templates (Phase A).
 */

import {
  resolveSubjectOwnerCopyFromContract,
  SUBJECT_OWNER_COPY_TEMPLATE_IDS,
} from "../parent-report-language/parent-report-owner-copy-templates-he.js";

/**
 * @param {Record<string, unknown>|null|undefined} contract
 * @param {{ subjectLabelHe?: string }} [opts]
 * @returns {string|null}
 */
export function resolveSubjectSummaryTextFromEngineContract(contract, opts = {}) {
  if (!contract?.blockedLegacySummary) return null;
  const templateId =
    String(contract.summarySlots?.openingTemplateId || "").trim() ||
    SUBJECT_OWNER_COPY_TEMPLATE_IDS.OPENING;
  const subjectLabelHe = String(opts.subjectLabelHe || "").trim();
  const ownerCopy = resolveSubjectOwnerCopyFromContract(contract, templateId, subjectLabelHe);
  if (ownerCopy) return ownerCopy;

  const p0 = contract.priorityTopics?.[0];
  const finding = String(p0?.parentSafeFinding || "").trim();
  return finding || null;
}

/**
 * @param {Record<string, unknown>|null|undefined} contract
 * @param {string} templateId
 * @param {string} [subjectLabelHe]
 * @returns {string|null}
 */
export function resolveSubjectLetterOwnerCopyHe(contract, templateId, subjectLabelHe = "") {
  return resolveSubjectOwnerCopyFromContract(contract, templateId, subjectLabelHe);
}
