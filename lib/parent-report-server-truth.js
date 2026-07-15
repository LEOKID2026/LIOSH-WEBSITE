/**
 * Phase 1 — Official parent reports require server/DB authority (remote API path only).
 */

import { parseParentReportRemoteSource } from "./teacher-portal/parent-report-remote-source.js";

/** @typedef {'db' | 'estimated' | 'unavailable'} BridgeFieldSource */

/**
 * @typedef {object} BridgeFieldProvenance
 * @property {BridgeFieldSource} source
 * @property {boolean} [isEstimated]
 * @property {string|null} [missingReason]
 */

export const PARENT_REPORT_DATA_AUTHORITY_SERVER = "server";

export const PARENT_REPORT_PORTAL_GATE = Object.freeze({
  titleHe: "דוח להורים",
  messageHe:
    "דוח הורים רשמי זמין רק דרך פורטל ההורה - לאחר התחברות ובחירת ילד/ה מהדשבורד.",
  hintHe: "אין לבנות דוח מנתוני הדפדפן המקומיים (מנתונים שמורים במכשיר).",
});

/**
 * @param {import('next/router').NextRouter} router
 */
export function isOfficialParentReportRemoteRoute(router) {
  return parseParentReportRemoteSource(router).isRemote;
}

/**
 * @param {BridgeFieldSource} source
 * @param {{ isEstimated?: boolean, missingReason?: string|null }} [opts]
 * @returns {BridgeFieldProvenance}
 */
export function makeBridgeFieldProvenance(source, opts = {}) {
  return {
    source,
    isEstimated: Boolean(opts.isEstimated),
    missingReason:
      typeof opts.missingReason === "string" && opts.missingReason.trim()
        ? opts.missingReason.trim()
        : null,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} prov
 */
export function bridgeFieldIsAuthoritative(prov) {
  if (!prov || typeof prov !== "object") return false;
  return prov.source === "db" && prov.isEstimated !== true;
}
