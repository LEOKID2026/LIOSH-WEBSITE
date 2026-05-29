import { useMemo, useState } from "react";
import { formatDateHe } from "../../lib/teacher-portal/teacher-ui.he.js";

function formatMessageDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return formatDateHe(iso);
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return formatDateHe(iso);
  }
}

export function normalizeParentFacing(report) {
  const block = report?.parentFacing;
  if (!block || typeof block !== "object") {
    return { insights: [], homeRecommendations: [], teacherMessages: [] };
  }
  return {
    insights: Array.isArray(block.insights) ? block.insights.filter(Boolean) : [],
    homeRecommendations: Array.isArray(block.homeRecommendations)
      ? block.homeRecommendations.filter(Boolean)
      : [],
    teacherMessages: Array.isArray(block.teacherMessages) ? block.teacherMessages : [],
  };
}

function SectionCard({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-white/15 bg-black/30 p-4 md:p-5 mb-4 md:mb-6 overflow-hidden ${className}`}
    >
      <h2 className="text-base md:text-lg font-semibold mb-3 text-white">{title}</h2>
      {children}
    </section>
  );
}

const DEFAULT_VISIBLE_SECTIONS = ["insights", "teacher", "home"];

/**
 * Parent-facing insights, home tips, and teacher messages.
 * @param {{
 *   report?: Record<string, unknown>,
 *   compact?: boolean,
 *   visibleSections?: ("insights"|"teacher"|"home")[],
 * }} props
 */
export default function ParentReportParentSections({
  report,
  compact = false,
  visibleSections = DEFAULT_VISIBLE_SECTIONS,
}) {
  const { insights, homeRecommendations, teacherMessages } = useMemo(
    () => normalizeParentFacing(report),
    [report]
  );
  const [showAllMessages, setShowAllMessages] = useState(false);

  const activeMessages = useMemo(() => {
    return [...teacherMessages]
      .filter((m) => !m.isHidden)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [teacherMessages]);

  const visibleMessages = showAllMessages ? activeMessages : activeMessages.slice(0, 3);

  const listClass = compact
    ? "space-y-2 text-sm text-white/90 leading-relaxed list-disc pr-5"
    : "space-y-2.5 text-sm md:text-base text-white/90 leading-relaxed list-disc pr-5";

  const showInsights = visibleSections.includes("insights");
  const showTeacher = visibleSections.includes("teacher");
  const showHome = visibleSections.includes("home");

  const teacherSection =
    showTeacher && activeMessages.length > 0 ? (
      <SectionCard title="הודעות מהמורה">
        <ul className="space-y-3 m-0 p-0 list-none">
          {visibleMessages.map((msg) => (
            <li
              key={msg.id}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <p className="text-xs text-white/50 mb-1">{formatMessageDate(msg.createdAt)}</p>
              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap break-words m-0">
                {msg.message}
              </p>
            </li>
          ))}
        </ul>
        {!showAllMessages && activeMessages.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllMessages(true)}
            className="mt-3 text-sm text-amber-300 underline hover:text-amber-200"
          >
            הצג הודעות נוספות
          </button>
        ) : null}
        {showAllMessages && activeMessages.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllMessages(false)}
            className="mt-3 text-sm text-white/60 underline hover:text-white/80"
          >
            הצג פחות
          </button>
        ) : null}
      </SectionCard>
    ) : null;

  const insightsSection =
    showInsights && insights.length > 0 ? (
      <SectionCard title="מה חשוב לדעת">
        <ul className={listClass}>
          {insights.map((line, i) => (
            <li key={`ins-${i}`} className="break-words">
              {line}
            </li>
          ))}
        </ul>
      </SectionCard>
    ) : null;

  const homeSection =
    showHome && homeRecommendations.length > 0 ? (
      <SectionCard title="מה מומלץ לעשות בבית">
        <ul className={listClass}>
          {homeRecommendations.map((line, i) => (
            <li key={`rec-${i}`} className="break-words">
              {line}
            </li>
          ))}
        </ul>
      </SectionCard>
    ) : null;

  return (
    <div className="space-y-0" dir="rtl" lang="he" data-testid="parent-report-parent-sections">
      {insightsSection}
      {teacherSection}
      {homeSection}
    </div>
  );
}
