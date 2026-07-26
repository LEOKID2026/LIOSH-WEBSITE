import React from "react";
import { parentTopicDisplayChromeFromDecision } from "../utils/parent-report-surface/parent-topic-display-chrome.js";

function clean(value) {
  return String(value || "").trim();
}

function line(label, value) {
  const t = clean(value);
  if (!t) return null;
  return (
    <p className="m-0 leading-relaxed">
      <span className="text-white/55">{label}: </span>
      {t}
    </p>
  );
}

const SHORT_CONTRACT_SHELL = Object.freeze({
  remediate: "rounded-lg border border-yellow-400/45 bg-yellow-500/15 p-3 md:p-4 text-sm text-white/90 space-y-2",
  advance: "rounded-lg border border-emerald-400/45 bg-emerald-500/15 p-3 md:p-4 text-sm text-white/90 space-y-2",
  maintain: "rounded-lg border border-sky-400/25 bg-sky-950/15 p-3 md:p-4 text-sm text-white/90 space-y-2",
  neutral: "rounded-lg border border-slate-400/35 bg-slate-500/10 p-3 md:p-4 text-sm text-white/90 space-y-2",
  drop: "rounded-lg border border-red-400/45 bg-red-500/15 p-3 md:p-4 text-sm text-white/90 space-y-2",
});

const SHORT_CONTRACT_TITLE = Object.freeze({
  remediate: "text-amber-100/95",
  advance: "text-emerald-100/95",
  maintain: "text-sky-100/95",
  neutral: "text-slate-100/95",
  drop: "text-red-100/95",
});

export function ParentReportWeeklyHomeActionLine({ actionHe, visibleTextFn = (s) => s }) {
  const t = clean(actionHe);
  if (!t) return null;
  return (
    <p className="m-0 leading-relaxed text-sm md:text-base">
      <span className="text-white/55 font-semibold">מה לעשות השבוע: </span>
      <span className="text-white/90">{visibleTextFn(t)}</span>
    </p>
  );
}

export function ParentReportShortContractPreview({ top, weeklyHomeActionHe, visibleTextFn = (s) => s }) {
  const status = top && typeof top === "object" ? line("מצב", top.mainStatusHe) : null;
  const priority = top && typeof top === "object" ? line("מה חשוב קודם", top.mainPriorityHe) : null;
  const doNow = top && typeof top === "object" ? line("מה עושים עכשיו", top.doNowHe) : null;
  const weekly = weeklyHomeActionHe ? (
    <ParentReportWeeklyHomeActionLine actionHe={weeklyHomeActionHe} visibleTextFn={visibleTextFn} />
  ) : null;
  if (!weekly && !status && !priority && !doNow) return null;

  const decision =
    clean(top?.displayDecision) ||
    clean(top?.engineDecision) ||
    "partial_stable";
  const chrome = parentTopicDisplayChromeFromDecision(decision);
  const shell =
    SHORT_CONTRACT_SHELL[chrome.visualVariant] || SHORT_CONTRACT_SHELL.maintain;
  const titleClass =
    SHORT_CONTRACT_TITLE[chrome.visualVariant] || SHORT_CONTRACT_TITLE.maintain;

  return (
    <div className={`mb-3 md:mb-5 avoid-break ${shell}`}>
      <p className={`font-bold ${titleClass} m-0 text-sm md:text-base`}>סיכום קצר להורה</p>
      {weekly}
      {status}
      {priority}
      {doNow}
    </div>
  );
}

export default ParentReportShortContractPreview;
