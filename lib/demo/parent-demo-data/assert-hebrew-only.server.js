import { SPEC_FORBIDDEN_PARENT_PHRASES } from "../../../utils/parent-report-language/parent-report-hebrew-copy-spec.js";

const ENGLISH_LEAK_RE = /[A-Za-z]{5,}/;

/**
 * Scan parent-facing strings for forbidden English leaks (demo-only guard).
 * @param {unknown} payload
 * @returns {{ ok: boolean, issues: string[] }}
 */
export function assertDemoPayloadHebrewOnly(payload) {
  /** @type {string[]} */
  const issues = [];
  const pf = payload?.parentFacing;
  if (pf && typeof pf === "object") {
    for (const key of ["insights", "homeRecommendations"]) {
      const arr = pf[key];
      if (!Array.isArray(arr)) continue;
      for (const line of arr) {
        const s = String(line || "");
        if (ENGLISH_LEAK_RE.test(s)) issues.push(`${key}:english_leak`);
        for (const forbidden of SPEC_FORBIDDEN_PARENT_PHRASES) {
          if (s.includes(forbidden)) issues.push(`${key}:forbidden:${forbidden}`);
        }
      }
    }
  }

  const activities = payload?.parentAssignedActivitiesInPeriod;
  if (Array.isArray(activities)) {
    for (const row of activities) {
      const title = String(row?.title || "");
      if (ENGLISH_LEAK_RE.test(title)) issues.push("activity:title_english");
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {unknown} payload
 */
export function enforceDemoPayloadHebrewOnly(payload) {
  const check = assertDemoPayloadHebrewOnly(payload);
  if (!check.ok && process.env.NODE_ENV !== "production") {
    console.warn("[parent-demo] hebrew-only check:", check.issues.slice(0, 5));
  }
  return payload;
}
