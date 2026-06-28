import React from "react";

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
  return (
    <div className="mb-3 md:mb-5 avoid-break rounded-lg border border-sky-400/25 bg-sky-950/15 p-3 md:p-4 text-sm text-white/90 space-y-2">
      <p className="font-bold text-sky-100/95 m-0 text-sm md:text-base">סיכום קצר להורה</p>
      {weekly}
      {status}
      {priority}
      {doNow}
    </div>
  );
}

export default ParentReportShortContractPreview;

