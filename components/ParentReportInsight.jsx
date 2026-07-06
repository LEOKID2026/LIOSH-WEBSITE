/**
 * Parent AI insight surface ("סיכום חכם להורה" / "תובנה להורה").
 *
 * Renders the new structured AI narrative produced by `utils/parent-report-ai-narrative/`
 * (`summary` + `strengths` + `focusAreas` + `homeTips` + `cautionNote`) when present.
 * Falls back to the legacy single-paragraph `text` for back-compat with surfaces that have not
 * yet been re-fetched.
 *
 * The component is kept inside the existing `parent-report-parent-ai-insight` print class so the
 * existing print/PDF CSS and the screen layout do not need to change.
 */

import React from "react";
import { normalizeParentFacingHe } from "../utils/parent-report-language/parent-facing-normalize-he.js";
import { filterOutParentReportDuplicates } from "../utils/parent-report-text-dedupe.js";

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readBulletText(item) {
  if (typeof item === "string") return item.trim();
  if (!isObject(item)) return "";
  if (typeof item.textHe === "string" && item.textHe.trim()) return item.textHe.trim();
  if (typeof item.text_he === "string" && item.text_he.trim()) return item.text_he.trim();
  return "";
}

function bulletKey(item, fallback) {
  if (isObject(item)) {
    if (typeof item.sourceId === "string" && item.sourceId.trim()) return item.sourceId.trim();
    if (typeof item.source_id === "string" && item.source_id.trim()) return item.source_id.trim();
  }
  return `idx-${fallback}`;
}

function readStructured(explanation) {
  if (!isObject(explanation)) return null;
  const s = explanation.structured;
  if (!isObject(s)) return null;

  const summary = typeof s.summary === "string" ? s.summary.trim() : "";
  const cautionNote = typeof s.cautionNote === "string"
    ? s.cautionNote.trim()
    : typeof s.caution_note === "string"
    ? s.caution_note.trim()
    : "";
  const strengthsRaw = Array.isArray(s.strengths) ? s.strengths : [];
  const focusRaw = Array.isArray(s.focusAreas)
    ? s.focusAreas
    : Array.isArray(s.focus_areas)
    ? s.focus_areas
    : [];
  const tipsRaw = Array.isArray(s.homeTips)
    ? s.homeTips
    : Array.isArray(s.home_tips)
    ? s.home_tips
    : [];

  const strengths = strengthsRaw.map((x) => readBulletText(x)).filter(Boolean);
  const focusAreas = focusRaw.map((x) => readBulletText(x)).filter(Boolean);
  const homeTips = tipsRaw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);

  if (!summary && strengths.length === 0 && focusAreas.length === 0 && homeTips.length === 0 && !cautionNote) {
    return null;
  }
  return {
    summary,
    strengths,
    focusAreas,
    homeTips,
    cautionNote,
    rawStrengths: strengthsRaw,
    rawFocus: focusRaw,
  };
}

function StructuredBlock({ structured, sourceLabel }) {
  if (!structured) return null;
  const { summary, strengths, focusAreas, homeTips, cautionNote, rawStrengths, rawFocus } = structured;
  return (
    <>
      {summary ? (
        <p className="m-0 leading-relaxed text-xs md:text-sm text-white/88 mb-3">{summary}</p>
      ) : null}

      {strengths.length > 0 ? (
        <div className="mb-3">
          <p className="m-0 mb-1 text-xs md:text-sm font-bold text-emerald-200/95">מה הולך טוב</p>
          <ul className="m-0 ps-5 text-xs md:text-sm text-white/88 leading-relaxed list-disc">
            {strengths.map((textHe, i) => (
              <li key={`strength-${bulletKey(rawStrengths[i], i)}`}>{textHe}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {focusAreas.length > 0 ? (
        <div className="mb-3">
          <p className="m-0 mb-1 text-xs md:text-sm font-bold text-amber-200/95">תחומים לחיזוק</p>
          <ul className="m-0 ps-5 text-xs md:text-sm text-white/88 leading-relaxed list-disc">
            {focusAreas.map((textHe, i) => (
              <li key={`focus-${bulletKey(rawFocus[i], i)}`}>{textHe}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {homeTips.length > 0 ? (
        <div className="mb-3">
          <p className="m-0 mb-1 text-xs md:text-sm font-bold text-sky-200/95">טיפים לבית</p>
          <ul className="m-0 ps-5 text-xs md:text-sm text-white/88 leading-relaxed list-disc">
            {homeTips.map((textHe, i) => (
              <li key={`tip-${i}`}>{textHe}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {cautionNote ? (
        <p className="m-0 leading-relaxed text-xs md:text-sm text-amber-100/90">{cautionNote}</p>
      ) : null}

      {sourceLabel ? (
        <p className="m-0 mt-2 text-[10px] md:text-xs text-white/50">{sourceLabel}</p>
      ) : null}
    </>
  );
}

/**
 * @param {{
 *   explanation: { ok?: boolean; text?: string; source?: string; structured?: object | null; structuredSource?: string | null } | null | undefined;
 *   className?: string;
 *   excludeHomeTipTextsHe?: string[];
 * }} props
 */
export function ParentReportInsight({ explanation, className = "", excludeHomeTipTextsHe = [] }) {
  if (!explanation?.ok) return null;
  const structuredRaw = readStructured(explanation);
  const fallbackText = typeof explanation?.text === "string" ? normalizeParentFacingHe(explanation.text) : "";

  // Wave 2 Fix 1.3: avoid repeating a home tip that already appeared verbatim (or
  // near-verbatim) in "מה מומלץ לעשות בבית" (ParentReportParentSections).
  let structured =
    structuredRaw && Array.isArray(excludeHomeTipTextsHe) && excludeHomeTipTextsHe.length > 0
      ? {
          ...structuredRaw,
          homeTips: filterOutParentReportDuplicates(structuredRaw.homeTips, excludeHomeTipTextsHe),
        }
      : structuredRaw;
  if (
    structured &&
    !structured.summary &&
    structured.strengths.length === 0 &&
    structured.focusAreas.length === 0 &&
    structured.homeTips.length === 0 &&
    !structured.cautionNote
  ) {
    structured = null;
  }

  if (!structured && !fallbackText.trim()) return null;

  const headingHe = structured ? "סיכום חכם להורה" : "תובנה להורה";
  const isStructuredAi = structured && (explanation.structuredSource === "ai" || explanation.source === "ai");
  const sourceLabel = structured
    ? isStructuredAi
      ? "הסיכום נכתב בעזרת בינה מלאכותית על בסיס נתוני הדוח, ונועד לשמש כלי עזר לימודי בלבד."
      : "הסיכום נבנה אוטומטית מנתוני הדוח, ונועד לשמש כלי עזר לימודי בלבד."
    : "";

  return (
    <div
      className={`parent-report-parent-ai-insight mb-3 md:mb-5 avoid-break rounded-lg border border-sky-400/25 bg-sky-950/20 p-3 md:p-4 text-sm text-white/90 ${className}`}
    >
      <p className="font-bold text-sky-100/95 m-0 text-sm md:text-base mb-2">{headingHe}</p>
      {structured ? (
        <StructuredBlock structured={structured} sourceLabel={sourceLabel} />
      ) : (
        <p className="m-0 leading-relaxed text-xs md:text-sm text-white/88">{fallbackText}</p>
      )}
    </div>
  );
}

export default ParentReportInsight;
