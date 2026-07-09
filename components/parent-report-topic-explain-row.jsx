/**
 * הסברי נושא תחת הגרף בדוח ההורה — מופרד לבדיקות SSR בלי שאר הדף.
 */
import React from "react";
import {
  activeRiskFlagLabelsHe,
  buildTopicDiagnosticExplainSectionsHe,
  confidenceBadgeLabelHe,
  learningMemoryLineHe,
  mistakePatternLineHe,
  sanitizeEngineSnippetHe,
  sufficiencyBadgeLabelHe,
  topicFoundationDependencyCompactLineHe,
  trendCompactLineHe,
} from "../utils/parent-report-ui-explain-he";
import { normalizeParentFacingHe } from "../utils/parent-report-language/index.js";
import { resolveParentExplainRowCopy } from "../utils/learning-pattern-decision/index.js";
import { buildRegularReportTopicExplainCardHe } from "../lib/parent-ui/parent-report-regular-display.js";
import { trendV1DisplayLineHe } from "../utils/parent-report-topic-trend-v1.js";
import {
  resolveParentFacingPatternLabelHe,
} from "../utils/learning-pattern-decision/parent-facing-error-pattern-he.js";

/**
 * @param {string} raw
 */
function parentFacingEngineLine(raw) {
  let s = sanitizeEngineSnippetHe(String(raw || ""));
  s = s.replace(/\b([a-z][a-z0-9_]{2,})\b/g, (match) => resolveParentFacingPatternLabelHe(match) || "");
  s = s.replace(/\bdefault_[a-z0-9_]+\b/gi, "");
  s = s.replace(/\b[a-z][a-z0-9_]{8,}\b/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return normalizeParentFacingHe(s);
}

/** תג קומפקטי — RTL */
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

function ExplainSectionLine({ label, text, dataTestId = null }) {
  if (!text) return null;
  return (
    <p
      className="text-[10px] md:text-[11px] text-white/72 leading-relaxed m-0 pr-0.5 break-words"
      {...(dataTestId ? { "data-testid": dataTestId } : {})}
    >
      {label ? <span className="text-white/45 font-semibold">{label} </span> : null}
      {text}
    </p>
  );
}

/**
 * @param {{ row: Record<string, unknown>, compact?: boolean, registeredGradeKey?: string|null }} props
 */
export function ParentReportTopicExplainRow({ row, compact = false, registeredGradeKey = null }) {
  const q = Number(row?.questions) || 0;
  if (q <= 0) return null;

  const parentCard = compact
    ? buildRegularReportTopicExplainCardHe(row, registeredGradeKey)
    : null;
  const trendV1Line = trendV1DisplayLineHe(row?.trendV1);
  const trendV1Facing = trendV1Line ? parentFacingEngineLine(trendV1Line) : "";

  if (compact && parentCard) {
    return (
      <div className="parent-report-topic-explain-row border-b border-white/[0.07] last:border-b-0 py-2 px-1 md:px-2 avoid-break">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] md:text-xs font-semibold text-white/88">{parentCard.title}</span>
          <div
            className="parent-report-topic-diagnostic-explain space-y-1 rounded border border-white/10 bg-black/20 px-1.5 py-1.5"
            data-testid="parent-report-topic-diagnostic-explain"
          >
            {parentCard.whatWeSee ? (
              <ExplainSectionLine label="מה רואים?" text={parentCard.whatWeSee} />
            ) : null}
            {trendV1Facing ? (
              <ExplainSectionLine text={trendV1Facing} dataTestId="parent-report-topic-trend-v1" />
            ) : null}
            {parentCard.whatItMeans ? (
              <ExplainSectionLine label="מה זה אומר?" text={parentCard.whatItMeans} />
            ) : null}
            {parentCard.homeAction ? (
              <ExplainSectionLine label="מה כדאי לעשות ביחד?" text={parentCard.homeAction} />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const lpdCopy = resolveParentExplainRowCopy(row);
  const sig = row.topicEngineRowSignals;
  const trend = row.trend;
  const sections =
    lpdCopy.explainSections ||
    (lpdCopy.suppressEngineCopy ? null : buildTopicDiagnosticExplainSectionsHe(row));
  const trendLine = trendCompactLineHe(trend);
  const trendFacing =
    lpdCopy.showTrend && trendLine ? parentFacingEngineLine(trendLine) : "";
  const confLab = sig?.confidenceBadge != null ? confidenceBadgeLabelHe(sig.confidenceBadge) : "";
  const suffLab = sig?.sufficiencyBadge != null ? sufficiencyBadgeLabelHe(sig.sufficiencyBadge) : "";
  const risks = lpdCopy.suppressEngineCopy ? [] : activeRiskFlagLabelsHe(sig?.riskFlags, 4);
  const mp = lpdCopy.suppressEngineCopy ? "" : mistakePatternLineHe(row);
  const mpFacing = mp ? parentFacingEngineLine(mp) : "";
  const lm = lpdCopy.suppressEngineCopy ? "" : learningMemoryLineHe(row);
  const lmFacing = lm ? parentFacingEngineLine(lm) : "";
  const fdRaw = lpdCopy.suppressEngineCopy ? "" : topicFoundationDependencyCompactLineHe(row);
  const fdFacing = fdRaw ? parentFacingEngineLine(fdRaw) : "";
  const caut = lpdCopy.suppressEngineCopy
    ? ""
    : sig?.cautionLineHe
      ? parentFacingEngineLine(String(sig.cautionLineHe))
      : "";
  const dn = lpdCopy.suppressEngineCopy
    ? ""
    : sig?.doNowHe
      ? parentFacingEngineLine(String(sig.doNowHe))
      : "";
  const av = lpdCopy.suppressEngineCopy
    ? ""
    : sig?.avoidNowHe
      ? parentFacingEngineLine(String(sig.avoidNowHe))
      : "";
  const primaryFinding =
    lpdCopy.primaryFinding && !sections?.identified ? lpdCopy.primaryFinding : "";

  return (
    <div className="parent-report-topic-explain-row border-b border-white/[0.07] last:border-b-0 py-2 px-1 md:px-2 avoid-break">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1 md:gap-1.5 min-w-0">
          <span className="text-[10px] md:text-xs font-semibold text-white/88 truncate max-w-[58%] md:max-w-[50%]">
            {row.label}
          </span>
          {confLab || suffLab ? (
            !lpdCopy.hasLpd || q <= 2 ? (
            <span className="text-[9px] md:text-[10px] text-white/50 leading-tight">
              {[confLab, suffLab].filter(Boolean).join(" · ")}
            </span>
            ) : null
          ) : null}
        </div>
        {trendFacing ? (
          <ExplainSectionLine label="בתקופה האחרונה:" text={trendFacing} />
        ) : null}
        {primaryFinding ? (
          <div data-testid="parent-report-lpd-finding">
            <ExplainSectionLine label="מה ראינו:" text={primaryFinding} />
          </div>
        ) : null}
        {sections &&
        (sections.identified ||
          sections.data ||
          sections.pattern ||
          sections.meaning ||
          sections.action) ? (
          <div
            className="parent-report-topic-diagnostic-explain space-y-1 rounded border border-white/10 bg-black/20 px-1.5 py-1.5"
            data-testid="parent-report-topic-diagnostic-explain"
          >
            <ExplainSectionLine text={sections.identified} />
            <ExplainSectionLine text={sections.data} />
            {trendV1Facing ? (
              <ExplainSectionLine text={trendV1Facing} dataTestId="parent-report-topic-trend-v1" />
            ) : null}
            <ExplainSectionLine text={sections.pattern} />
            <ExplainSectionLine text={sections.meaning} />
            <ExplainSectionLine text={sections.action} />
          </div>
        ) : null}
        {risks.length ? (
          <div className="flex flex-wrap gap-1">
            {risks.map((lab) => (
              <PrMiniBadge key={lab} tone="risk">
                {lab}
              </PrMiniBadge>
            ))}
          </div>
        ) : null}
        {fdFacing && !sections?.meaning?.includes(fdFacing.slice(0, 24)) ? (
          <ExplainSectionLine label="בסיס ותלויות:" text={fdFacing} />
        ) : null}
        {mpFacing && !sections?.pattern?.includes(mpFacing.slice(0, 20)) ? (
          <ExplainSectionLine label="איפה נתקעים לעיתים:" text={mpFacing} />
        ) : null}
        {lmFacing ? <ExplainSectionLine label="שימור בבית:" text={lmFacing} /> : null}
        {dn || av ? (
          <div className="text-[9px] md:text-[10px] text-sky-100/88 leading-snug border border-sky-400/20 rounded px-1.5 py-1 bg-sky-950/12 space-y-0.5 m-0 pr-0.5">
            {dn ? <ExplainSectionLine label="עכשיו:" text={dn} /> : null}
            {av ? <ExplainSectionLine label="להימנע:" text={av} /> : null}
          </div>
        ) : null}
        {caut ? <ExplainSectionLine label="זהירות:" text={caut} /> : null}
      </div>
    </div>
  );
}

/**
 * @param {{ rows: Record<string, unknown>[], compact?: boolean, registeredGradeKey?: string|null }} props
 */
export function ParentReportTopicExplainBlock({ rows, compact = false, registeredGradeKey = null }) {
  const withQ = (rows || []).filter((r) => Number(r?.questions) > 0);
  if (!withQ.length) return null;
  return (
    <div className="parent-report-topic-explain-block mt-2 rounded-lg border border-white/10 bg-black/25 overflow-hidden avoid-break">
      <div className="px-2 py-1 text-[10px] md:text-[11px] font-bold text-white/55 border-b border-white/10">
        מה בולט בכל נושא
      </div>
      <div className="max-h-none overflow-visible">
        {withQ.map((r) => (
          <ParentReportTopicExplainRow
            key={r.rowKey}
            row={r}
            compact={compact}
            registeredGradeKey={registeredGradeKey}
          />
        ))}
      </div>
    </div>
  );
}
