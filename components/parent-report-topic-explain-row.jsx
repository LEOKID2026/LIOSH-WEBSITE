/**
 * הסברי נושא תחת הגרף בדוח ההורה — מופרד לבדיקות SSR בלי שאר הדף.
 */
import React from "react";
import {
  activeRiskFlagLabelsHe,
  confidenceBadgeLabelHe,
  learningMemoryLineHe,
  mistakePatternLineHe,
  sanitizeEngineSnippetHe,
  sufficiencyBadgeLabelHe,
  trendCompactLineHe,
  truncateHe,
} from "../utils/parent-report-ui-explain-he";
import { normalizeParentFacingHe } from "../utils/parent-report-language/index.js";

/**
 * ניסוח להצגת הורה בלבד — לא משנה נתונים; רק מנקה שאריות טכניות נפוצות מהמנוע.
 * @param {string} raw
 */
function parentFacingEngineLine(raw) {
  let s = sanitizeEngineSnippetHe(String(raw || ""));
  s = s.replace(/\bdefault_[a-z0-9_]+\b/gi, "");
  s = s.replace(/\b[a-z][a-z0-9_]{8,}\b/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return normalizeParentFacingHe(s);
}

/** תג קומפקטי — RTL, לא מגדיל את גובה השורה יתר על המידה */
export function PrMiniBadge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/15 bg-white/[0.06] text-white/75",
    ok: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100/90",
    warn: "border-amber-400/28 bg-amber-500/12 text-amber-100/90",
    risk: "border-rose-400/30 bg-rose-500/12 text-rose-100/90",
    sky: "border-sky-400/28 bg-sky-500/10 text-sky-100/90",
  };
  return (
    <span
      className={`inline-flex max-w-full items-center rounded px-1 py-0.5 text-[9px] md:text-[10px] font-semibold leading-tight border ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

/**
 * הסבר שורת נושא מתחת לגרף — שורה ראשית קומפקטית; פרטים ב details.
 * @param {{ row: Record<string, unknown> }} props
 */
export function ParentReportTopicExplainRow({ row }) {
  const q = Number(row?.questions) || 0;
  if (q <= 0) return null;

  const sig = row.topicEngineRowSignals;
  const trend = row.trend;
  const bp = row.behaviorProfile;
  const whyRaw = sig?.whyThisRecommendationHe ? String(sig.whyThisRecommendationHe) : "";
  const whyOne = truncateHe(parentFacingEngineLine(whyRaw), 140);
  const trendLine = trendCompactLineHe(trend);
  const trendFacing = trendLine ? truncateHe(parentFacingEngineLine(trendLine), 120) : "";
  const confLab = sig?.confidenceBadge != null ? confidenceBadgeLabelHe(sig.confidenceBadge) : "";
  const suffLab = sig?.sufficiencyBadge != null ? sufficiencyBadgeLabelHe(sig.sufficiencyBadge) : "";
  const risks = activeRiskFlagLabelsHe(sig?.riskFlags, 4);
  const hasSignals = !!(sig || trendFacing);
  const ip = sig?.interventionPlanHe ? truncateHe(parentFacingEngineLine(String(sig.interventionPlanHe)), 130) : "";
  const dn = sig?.doNowHe ? truncateHe(parentFacingEngineLine(String(sig.doNowHe)), 100) : "";
  const av = sig?.avoidNowHe ? truncateHe(parentFacingEngineLine(String(sig.avoidNowHe)), 100) : "";
  const caut = sig?.cautionLineHe ? truncateHe(parentFacingEngineLine(String(sig.cautionLineHe)), 110) : "";
  const mp = mistakePatternLineHe(row);
  const mpFacing = mp ? truncateHe(parentFacingEngineLine(mp), 120) : "";
  const lm = learningMemoryLineHe(row);
  const lmFacing = lm ? truncateHe(parentFacingEngineLine(lm), 120) : "";

  return (
    <div className="parent-report-topic-explain-row border-b border-white/[0.07] last:border-b-0 py-1.5 px-1 md:px-2">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1 md:gap-1.5 min-w-0">
          <span className="text-[10px] md:text-xs font-semibold text-white/88 truncate max-w-[58%] md:max-w-[50%]">
            {row.label}
          </span>
          {confLab || suffLab ? (
            <span className="text-[9px] md:text-[10px] text-white/50 leading-tight">
              {[confLab, suffLab].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </div>
        {trendFacing ? (
          <p className="text-[10px] md:text-[11px] text-white/65 leading-snug m-0 pr-0.5">
            <span className="text-white/45 font-semibold">בתקופה האחרונה: </span>
            {trendFacing}
          </p>
        ) : null}
        {whyOne ? (
          <p className="text-[10px] md:text-[11px] text-white/70 leading-snug m-0 pr-0.5">
            <span className="text-white/45 font-semibold">מה זה אומר: </span>
            {whyOne}
          </p>
        ) : hasSignals ? null : null}
        {risks.length ? (
          <div className="flex flex-wrap gap-1">
            {risks.map((lab) => (
              <PrMiniBadge key={lab} tone="risk">
                {lab}
              </PrMiniBadge>
            ))}
          </div>
        ) : null}
        {ip ? (
          <div className="text-[9px] md:text-[10px] text-emerald-100/85 leading-snug space-y-0.5 m-0 pr-0.5">
            <p className="m-0">
              <span className="text-white/45 font-semibold">כיוון עבודה: </span>
              {ip}
            </p>
          </div>
        ) : null}
        {dn || av ? (
          <div className="text-[9px] md:text-[10px] text-sky-100/88 leading-snug border border-sky-400/20 rounded px-1.5 py-1 bg-sky-950/12 space-y-0.5 m-0 pr-0.5">
            {dn ? (
              <p className="m-0">
                <span className="text-white/45 font-semibold">עכשיו: </span>
                {dn}
              </p>
            ) : null}
            {av ? (
              <p className="m-0">
                <span className="text-white/45 font-semibold">להימנע: </span>
                {av}
              </p>
            ) : null}
          </div>
        ) : null}
        {caut ? (
          <p className="text-[9px] md:text-[10px] text-amber-100/85 m-0 pr-0.5 leading-snug">
            <span className="text-white/45 font-semibold">זהירות: </span>
            {caut}
          </p>
        ) : null}
        {mpFacing ? (
          <p className="text-[9px] md:text-[10px] text-white/70 m-0 pr-0.5 leading-snug">
            <span className="text-white/45 font-semibold">איפה נתקעים לעיתים: </span>
            {mpFacing}
          </p>
        ) : null}
        {lmFacing ? (
          <p className="text-[9px] md:text-[10px] text-white/68 m-0 pr-0.5 leading-snug">
            <span className="text-white/45 font-semibold">שימור בבית: </span>
            {lmFacing}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** רשימת הסברים קומפקטית מתחת לגרף נושאים */
export function ParentReportTopicExplainBlock({ rows }) {
  const withQ = (rows || []).filter((r) => Number(r?.questions) > 0);
  if (!withQ.length) return null;
  return (
    <div className="parent-report-topic-explain-block mt-2 rounded-lg border border-white/10 bg-black/25 overflow-hidden">
      <div className="px-2 py-1 text-[10px] md:text-[11px] font-bold text-white/55 border-b border-white/10">
        מה בולט בכל נושא
      </div>
      <div className="max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain">
        {withQ.map((r) => (
          <ParentReportTopicExplainRow key={r.rowKey} row={r} />
        ))}
      </div>
    </div>
  );
}
