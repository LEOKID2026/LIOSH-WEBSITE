/**
 * Dedicated Terms + Privacy approval document for parent acceptance (Phase D.2I).
 * Not a legal sitemap — only focused Terms + Privacy sections from SITE_POLICIES.
 * Full pages (/data-deletion, /ai-disclosure, etc.) remain separate; linked at bottom only.
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

/** @param {import("./sitePolicies.he.js").PolicySection} section */
function stripSectionLinks(section) {
  return { ...section, links: undefined };
}

/** Cross-links shown once below the document (not embedded page content). */
export const TERMS_PRIVACY_ACCEPTANCE_RELATED_LINKS = [
  { href: "/privacy", label: "למדיניות הפרטיות המלאה" },
  { href: "/terms", label: "לתנאי השימוש המלאים" },
  { href: "/data-deletion", label: "למידע על מחיקת נתונים" },
  { href: "/ai-disclosure", label: "למידע על שימוש ב-AI" },
  { href: "/accessibility", label: "לנגישות" },
];

export const TERMS_PRIVACY_ACCEPTANCE_INTRO =
  "כדי להמשיך לשימוש באזור ההורים, יש לקרוא ולאשר את תנאי השימוש ואת מדיניות הפרטיות של LEO KIDS.";

/** Terms sections included in the approval document (focused subset). */
const TERMS_ACCEPTANCE_SECTION_IDS = [
  "educational",
  "eligibility",
  "acceptable-use",
  "accounts",
  "subscription",
  "liability",
  "changes",
];

/** Privacy sections included in the approval document (focused subset). */
const PRIVACY_ACCEPTANCE_SECTION_IDS = [
  "audience",
  "data-collected",
  "purposes",
  "children",
  "visibility",
  "cookies",
  "ads",
  "ai-summary",
  "retention",
];

/**
 * @returns {{
 *   meta: {
 *     title: string;
 *     intro: string;
 *     termsVersion: string;
 *     privacyVersion: string;
 *     lastUpdated: string;
 *     contactEmail: string;
 *   };
 *   parts: Array<{ key: string; title: string; intro?: string; sections: import("./sitePolicies.he.js").PolicySection[] }>;
 *   relatedLinks: typeof TERMS_PRIVACY_ACCEPTANCE_RELATED_LINKS;
 * }}
 */
export function buildTermsPrivacyAcceptanceDocument() {
  const terms = SITE_POLICIES.terms;
  const privacy = SITE_POLICIES.privacy;

  return {
    meta: {
      title: "תנאי שימוש ומדיניות פרטיות",
      intro: TERMS_PRIVACY_ACCEPTANCE_INTRO,
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
        sections: pickSections(terms.sections, TERMS_ACCEPTANCE_SECTION_IDS).map(stripSectionLinks),
      },
      {
        key: "privacy",
        title: privacy.pageTitle,
        intro: privacy.intro,
        sections: pickSections(privacy.sections, PRIVACY_ACCEPTANCE_SECTION_IDS).map(stripSectionLinks),
      },
    ],
    relatedLinks: TERMS_PRIVACY_ACCEPTANCE_RELATED_LINKS,
  };
}

export default buildTermsPrivacyAcceptanceDocument;
