/**
 * Hebrew contextual follow-up utterances (multi-turn Copilot; classifier + scope inheritance).
 */

import { foldUtteranceForHeMatch, normalizeFreeformParentUtteranceHe } from "./utterance-normalize-he.js";

export const CONTEXTUAL_FOLLOW_UP_RE =
  /(?:^|\s)(?:ו)?(?:מה|איפה|למה|איך|כמה|ומה|ואיפה|ולמה|ואיך|וגם|עוד|המשך|בבית|אז|כן)\b|טעויות|טעיות|טעות|איפה\s*(?:הוא|היא|הילד|הילדה)?\s*טעה|במה\s*(?:הוא|היא|הילד)?\s*טעה|מה\s*חוזר\s*בטעות|הטעויות\s*הבולטות|איפה\s*הילד\s*טעה|מה\s*לעשות|איך\s*לתרגל|מה\s*הקושי|איפה\s*הבעיה/u;

/**
 * @param {string} utterance
 */
export function isContextualFollowUpUtterance(utterance) {
  const folded = foldUtteranceForHeMatch(normalizeFreeformParentUtteranceHe(utterance));
  if (folded.length < 2) return false;
  if (folded.length > 120) return false;
  return CONTEXTUAL_FOLLOW_UP_RE.test(folded);
}

export default { CONTEXTUAL_FOLLOW_UP_RE, isContextualFollowUpUtterance };
