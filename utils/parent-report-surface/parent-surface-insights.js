/**
 * Build capped parent-facing insight + home action lists for detailed report surface.
 */

import { capAndDedupeParentSurfaceLines } from "./parent-surface-dedupe.js";
import { sanitizeParentSurfaceTextHe } from "./parent-surface-label-guard.js";
import {
  PARENT_TOPIC_TIER,
  parentTopicTierFromUnit,
} from "./parent-topic-tier.js";
import { parentFacingPatternLabelHe } from "../parent-report-language/index.js";

const UNPRACTICED_SUBJECTS_BULLET_RE = /^מקצועות שלא תורגלו/u;

/**
 * @param {object} payload — detailed parent report payload
 */
export function buildParentSurfaceWhatToNoticeHe(payload) {
  const ui = payload?._parentReportUi ?? {};
  const parentFacing = ui.parentFacing && typeof ui.parentFacing === "object" ? ui.parentFacing : {};
  const insights = Array.isArray(parentFacing.insights)
    ? parentFacing.insights.map((x) => sanitizeParentSurfaceTextHe(x)).filter(Boolean)
    : [];

  const crossRaw = Array.isArray(payload?.crossSubjectInsights?.bulletsHe)
    ? payload.crossSubjectInsights.bulletsHe
    : [];
  const cross = crossRaw
    .map((x) => sanitizeParentSurfaceTextHe(x))
    .filter(Boolean)
    .filter((line) => !UNPRACTICED_SUBJECTS_BULLET_RE.test(String(line)));

  // Wave 2 Fix 2.3: this global "מה חשוב לדעת" section used to auto-generate one
  // line per topic tier (tierLines), but each of those topics is already shown
  // inside its own subject card (tier groups + topic recommendation cards), so
  // repeating them here only doubled up the same idea. Keep only real cross-cutting
  // insights here.
  const merged = capAndDedupeParentSurfaceLines([...insights, ...cross], { max: 3 });
  return merged;
}

/**
 * @param {object} payload
 */
export function buildParentSurfaceHomeActionsHe(payload) {
  const ui = payload?._parentReportUi ?? {};
  const parentFacing = ui.parentFacing && typeof ui.parentFacing === "object" ? ui.parentFacing : {};
  const server = Array.isArray(parentFacing.homeRecommendations)
    ? parentFacing.homeRecommendations.map((x) => sanitizeParentSurfaceTextHe(x)).filter(Boolean)
    : [];
  const plan = Array.isArray(payload?.homePlan?.itemsHe)
    ? payload.homePlan.itemsHe.map((x) => sanitizeParentSurfaceTextHe(x)).filter(Boolean)
    : [];

  // Wave 2 Fix 2.6: `fromTopics` is only a fallback built from the very same
  // per-subject primary actions that already render inside each subject card
  // (SubjectPrimaryActionBlock). Showing it globally would just repeat those same
  // lines a second time, so the global "מה מומלץ לעשות בבית" section is shown only
  // when there's a real, independent source (server home recs or an explicit home plan).
  const source = server.length ? server : plan.length ? plan : [];
  return capAndDedupeParentSurfaceLines(source, { max: 3 });
}

/**
 * Pick one primary home action per subject profile from units/topic rows.
 * @param {object} sp — subject profile
 * @param {object} baseReport
 */
export function resolveSubjectPrimaryParentActionHe(sp, baseReport) {
  void baseReport;
  const sid = String(sp?.subject || "");
  const recs = Array.isArray(sp?.topicRecommendations) ? sp.topicRecommendations : [];

  const tryLine = (raw) => {
    const s = sanitizeParentSurfaceTextHe(raw, { subjectId: sid });
    return s || null;
  };

  for (const tr of recs) {
    const fromRec = tryLine(tr?.parentActionHe || tr?.recommendedParentActionHe || tr?.homeLineHe);
    if (fromRec) return fromRec;
  }

  const groups = sp?.topicGroupsByTier;
  if (groups && typeof groups === "object") {
    for (const tier of [
      "advanced_practice",
      "foundation_practice",
      "clear_gap",
      "needs_guidance",
      "strengthen",
      "monitor",
    ]) {
      const rows = Array.isArray(groups[tier]) ? groups[tier] : [];
      for (const row of rows) {
        if (row?.parentActionHe) {
          const s = tryLine(row.parentActionHe);
          if (s) return s;
        }
      }
    }
    const focus =
      groups[PARENT_TOPIC_TIER.ADVANCED_PRACTICE]?.[0] ||
      groups[PARENT_TOPIC_TIER.FOUNDATION_PRACTICE]?.[0] ||
      groups[PARENT_TOPIC_TIER.CLEAR_GAP]?.[0] ||
      groups[PARENT_TOPIC_TIER.STRENGTHEN]?.[0] ||
      groups[PARENT_TOPIC_TIER.MONITOR]?.[0];
    if (focus?.narrativeTitleHe) {
      const generic = tryLine(
        `ב${focus.narrativeTitleHe}: תרגול קצר וברור בבית - דוגמה אחת, שאלה אחת, ובדיקה מהירה בסוף.`
      );
      if (generic) return generic;
    }
  }

  return tryLine(sp?.subjectDoNowHe) || tryLine(sp?.parentActionHe) || null;
}

/**
 * @param {object[]} units
 * @param {string} sid
 */
export function countSubjectsNeedingStrengthenFromUnits(units, sid) {
  let n = 0;
  for (const u of units || []) {
    if (String(u?.subjectId || "") !== sid) continue;
    const tier = parentTopicTierFromUnit(u, null);
    if (
      tier === PARENT_TOPIC_TIER.STRENGTHEN ||
      tier === PARENT_TOPIC_TIER.CLEAR_GAP ||
      tier === PARENT_TOPIC_TIER.NEEDS_GUIDANCE
    ) {
      n += 1;
    }
  }
  return n;
}

/**
 * @param {unknown} unit
 */
export function parentFacingPatternSafeHe(unit) {
  const p = parentFacingPatternLabelHe(unit);
  return sanitizeParentSurfaceTextHe(p, { subjectId: unit?.subjectId });
}
