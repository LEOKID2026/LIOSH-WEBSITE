/**
 * @deprecated Use public-seo-wide-theme.js — kept for import stability.
 */
export {
  getPublicSeoInnerPanelClass as getPracticeInnerPanelClass,
  getPublicSeoInnerBadgeClass as getPracticeInnerBadgeClass,
  getPublicSeoSectionPanelVariant as getPracticeSectionPanelVariant,
  getPublicSeoWideClasses,
  PUBLIC_SEO_INNER_VARIANTS as PRACTICE_INNER_VARIANTS,
} from "./public-seo-wide-theme";

import { getPublicSeoWideClasses } from "./public-seo-wide-theme";

/** @param {boolean} isBright */
export function getPracticeBulletRowClass(isBright) {
  return getPublicSeoWideClasses(isBright).bulletRow;
}
