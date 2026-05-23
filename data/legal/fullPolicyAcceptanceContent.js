/**
 * Assembled policy document for full parent Terms + Privacy acceptance (Phase D.2).
 * Reuses centralized copy from SITE_POLICIES — no duplicate standalone legal text.
 */

import {
  CONTACT_EMAIL,
  POLICY_LAST_UPDATED,
  PRIVACY_VERSION,
  SITE_POLICIES,
  TERMS_VERSION,
} from "./sitePolicies.he.js";

/** @param {import("./sitePolicies.he.js").PolicySection[]} sections @param {string[]} ids */
function pickSections(sections, ids) {
  const set = new Set(ids);
  return sections.filter((s) => set.has(s.id));
}

/**
 * @returns {{
 *   meta: { termsVersion: string; privacyVersion: string; lastUpdated: string; contactEmail: string };
 *   parts: Array<{ key: string; title: string; intro?: string; sections: import("./sitePolicies.he.js").PolicySection[] }>;
 * }}
 */
export function buildFullPolicyAcceptanceDocument() {
  const terms = SITE_POLICIES.terms;
  const privacy = SITE_POLICIES.privacy;
  const dataDeletion = SITE_POLICIES.dataDeletion;
  const aiDisclosure = SITE_POLICIES.aiDisclosure;
  const accessibility = SITE_POLICIES.accessibility;

  return {
    meta: {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      lastUpdated: POLICY_LAST_UPDATED,
      contactEmail: CONTACT_EMAIL,
    },
    parts: [
      {
        key: "terms",
        title: terms.pageTitle,
        intro: terms.intro,
        sections: terms.sections,
      },
      {
        key: "privacy",
        title: privacy.pageTitle,
        intro: privacy.intro,
        // Full privacy includes cookies/ads; AI summary part uses dedicated aiDisclosure below.
        sections: privacy.sections.filter((s) => s.id !== "ai-summary"),
      },
      {
        key: "data-deletion",
        title: "מחיקת נתונים — סיכום",
        intro: dataDeletion.intro,
        sections: pickSections(dataDeletion.sections, [
          "child-delete",
          "what-deleted",
          "explicit-only",
          "not-triggers",
          "parent-account",
          "technical-retention",
        ]),
      },
      {
        key: "ai-disclosure",
        title: "גילוי שימוש ב-AI — סיכום",
        intro: aiDisclosure.intro,
        sections: pickSections(aiDisclosure.sections, [
          "what",
          "does-not",
          "accuracy",
          "data",
          "report-disclaimer",
        ]),
      },
      {
        key: "cookies-ads",
        title: "עוגיות ופרסום — סיכום",
        sections: pickSections(privacy.sections, ["cookies", "ads"]),
      },
      {
        key: "accessibility-contact",
        title: "נגישות ויצירת קשר",
        intro: accessibility.intro,
        sections: [
          ...pickSections(accessibility.sections, ["commitment", "report", "handling", "contact"]),
        ],
      },
    ],
  };
}

export default buildFullPolicyAcceptanceDocument;
