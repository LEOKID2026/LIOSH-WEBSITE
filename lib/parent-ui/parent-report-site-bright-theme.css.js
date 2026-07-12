/**
 * Parent report bright mode — matches site STUDENT_BRIGHT (parent dashboard / Layout).
 * Page bg: inline STUDENT_BRIGHT_PAGE_BG_STYLE (immersive /learning routes skip Layout).
 */
import { STUDENT_BRIGHT_PAGE_BG_STYLE, STUDENT_BRIGHT_PAGE_BACKGROUND } from "../student-ui/student-bright-page-background.client.js";
import { STUDENT_LAYOUT_CHROME_BOTTOM_CSS } from "../student-ui/student-ad-slot.client.js";

export const PARENT_REPORT_SITE_BRIGHT_CSS = `
  .parent-report-site-bright {
    color: #0f172a;
    background: ${STUDENT_BRIGHT_PAGE_BACKGROUND} !important;
    min-height: 100svh;
  }

  .parent-report-site-bright [class*="text-white/"] {
    color: #475569 !important;
  }
  .parent-report-site-bright .text-white {
    color: #0f172a !important;
  }

  .parent-report-site-bright [class*="bg-black/"] {
    background: rgba(255, 255, 255, 0.94) !important;
    box-shadow: 0 1px 3px rgba(14, 116, 144, 0.08);
  }
  .parent-report-site-bright [class*="bg-white/"] {
    background: rgba(255, 255, 255, 0.88) !important;
  }
  .parent-report-site-bright [class*="border-white/"] {
    border-color: #bae6fd !important;
  }

  .parent-report-site-bright [class*="bg-sky-950/"],
  .parent-report-site-bright [class*="bg-cyan-950/"] {
    background-color: rgba(224, 242, 254, 0.95) !important;
    border-color: #7dd3fc !important;
  }
  .parent-report-site-bright [class*="bg-violet-500/"],
  .parent-report-site-bright [class*="bg-violet-950/"] {
    background-color: rgba(237, 233, 254, 0.92) !important;
  }
  .parent-report-site-bright [class*="bg-yellow-500/"] {
    background-color: rgba(254, 249, 195, 0.92) !important;
  }
  .parent-report-site-bright [class*="bg-rose-500/"] {
    background-color: rgba(255, 228, 230, 0.92) !important;
  }
  .parent-report-site-bright [class*="bg-sky-900/"] {
    background-color: rgba(224, 242, 254, 0.95) !important;
  }

  .parent-report-site-bright [class*="bg-blue-500/"] {
    background: rgba(219, 234, 254, 0.9) !important;
  }
  .parent-report-site-bright [class*="bg-emerald-500/"],
  .parent-report-site-bright [class*="bg-green-500/"] {
    background: rgba(209, 250, 229, 0.9) !important;
  }
  .parent-report-site-bright [class*="bg-purple-500/"] {
    background: rgba(237, 233, 254, 0.9) !important;
  }
  .parent-report-site-bright [class*="bg-orange-500/"] {
    background: rgba(255, 237, 213, 0.9) !important;
  }
  .parent-report-site-bright [class*="bg-cyan-500/"] {
    background: rgba(207, 250, 254, 0.9) !important;
  }
  .parent-report-site-bright [class*="bg-amber-950/"] {
    background: rgba(255, 251, 235, 0.95) !important;
  }
  .parent-report-site-bright [class*="bg-emerald-950/"] {
    background: rgba(209, 250, 229, 0.75) !important;
  }

  .parent-report-site-bright [class*="border-blue-400/"] { border-color: rgba(96, 165, 250, 0.65) !important; }
  .parent-report-site-bright [class*="border-emerald-400/"] { border-color: rgba(52, 211, 153, 0.65) !important; }
  .parent-report-site-bright [class*="border-amber-400/"] { border-color: rgba(251, 191, 36, 0.6) !important; }
  .parent-report-site-bright [class*="border-orange-400/"] { border-color: rgba(251, 146, 60, 0.6) !important; }
  .parent-report-site-bright [class*="border-red-400/"] { border-color: rgba(248, 113, 113, 0.65) !important; }
  .parent-report-site-bright [class*="border-sky-500/"],
  .parent-report-site-bright [class*="border-sky-400/"],
  .parent-report-site-bright [class*="border-cyan-500/"] {
    border-color: rgba(56, 189, 248, 0.65) !important;
  }
  .parent-report-site-bright [class*="border-violet-400/"],
  .parent-report-site-bright [class*="border-violet-300/"] {
    border-color: rgba(167, 139, 250, 0.65) !important;
  }

  .parent-report-site-bright .text-blue-400 { color: #1d4ed8 !important; }
  .parent-report-site-bright .text-emerald-400 { color: #047857 !important; }
  .parent-report-site-bright .text-yellow-400 { color: #b45309 !important; }
  .parent-report-site-bright .text-purple-400 { color: #6d28d9 !important; }
  .parent-report-site-bright [class*="text-amber-100"] { color: #92400e !important; }
  .parent-report-site-bright [class*="text-emerald-100"],
  .parent-report-site-bright [class*="text-emerald-200"],
  .parent-report-site-bright [class*="text-emerald-300"] { color: #065f46 !important; }
  .parent-report-site-bright [class*="text-red-300"],
  .parent-report-site-bright [class*="text-red-400"] { color: #b91c1c !important; }
  .parent-report-site-bright [class*="text-sky-"] { color: #0369a1 !important; }
  .parent-report-site-bright [class*="text-violet-"] { color: #6d28d9 !important; }
  .parent-report-site-bright [class*="text-cyan-"] { color: #0e7490 !important; }

  .parent-report-site-bright a[class*="bg-violet-"],
  .parent-report-site-bright button[class*="bg-sky-6"],
  .parent-report-site-bright button[class*="bg-amber-6"],
  .parent-report-site-bright .pr-report-accent-btn {
    color: #ffffff !important;
  }
  .parent-report-site-bright a[class*="bg-violet-"] {
    background: rgb(124 58 237 / 0.92) !important;
    border-color: rgb(167 139 250 / 0.8) !important;
  }

  .parent-report-site-bright .parent-report-exit-nav-btn {
    background-color: rgba(255, 255, 255, 0.95) !important;
    border-color: #bae6fd !important;
    color: #0f172a !important;
    box-shadow: 0 1px 2px rgba(14, 116, 144, 0.1);
  }
  .parent-report-site-bright .parent-report-exit-nav-btn:hover {
    background-color: #f0f9ff !important;
    border-color: #38bdf8 !important;
  }

  .parent-report-site-bright svg text,
  .parent-report-site-bright .recharts-text,
  .parent-report-site-bright .recharts-cartesian-axis-tick-value {
    fill: #334155 !important;
    color: #334155 !important;
  }
  .parent-report-site-bright .recharts-cartesian-grid line,
  .parent-report-site-bright .recharts-cartesian-grid path {
    stroke: #cbd5e1 !important;
  }
  .parent-report-site-bright .recharts-legend-item-text {
    color: #334155 !important;
    fill: #334155 !important;
  }

  .parent-report-site-bright .parent-report-print-summary-card,
  .parent-report-site-bright .parent-report-chart-card,
  .parent-report-site-bright .parent-report-example-card {
    background: rgba(255, 255, 255, 0.96) !important;
    border-color: #bae6fd !important;
    box-shadow: 0 1px 3px rgba(14, 116, 144, 0.1);
  }
  .parent-report-site-bright .parent-report-print-summary-label,
  .parent-report-site-bright .parent-report-print-muted-text {
    color: #64748b !important;
  }
  .parent-report-site-bright .parent-report-print-section-label,
  .parent-report-site-bright .parent-report-print-page-section-heading,
  .parent-report-site-bright .parent-report-print-subheading,
  .parent-report-site-bright .parent-report-print-chart-title {
    color: #0f172a !important;
  }
  .parent-report-site-bright .parent-report-print-chart-subtitle {
    color: #475569 !important;
  }
  .parent-report-site-bright .parent-report-topic-explain-block {
    background: rgba(255, 255, 255, 0.92) !important;
    border-color: #94a3b8 !important;
    color: #0f172a !important;
  }
  .parent-report-site-bright .parent-report-topic-explain-row {
    color: #1e293b !important;
  }
  .parent-report-site-bright .parent-report-topic-explain-details > div {
    background: #fff !important;
    color: #1e293b !important;
  }
  .parent-report-site-bright .parent-report-diagnostics-print .parent-report-rec-item {
    background: rgba(255, 255, 255, 0.92) !important;
    border-color: #bae6fd !important;
  }
  .parent-report-site-bright .parent-report-diagnostic-subject-title {
    color: #0f172a !important;
    background: #e0f2fe !important;
  }
  .parent-report-site-bright .parent-report-diagnostic-subject-block {
    border-color: #bae6fd !important;
  }
  .parent-report-site-bright .parent-report-print-stable-excellence {
    background: #ede9fe !important;
    border-color: #8b5cf6 !important;
  }
  .parent-report-site-bright .parent-report-example-heading { color: #0f172a !important; }
  .parent-report-site-bright .parent-report-example-prose { color: #1e293b !important; }
  .parent-report-site-bright .parent-report-important-disclaimer {
    background: rgba(255, 255, 255, 0.94) !important;
    border-color: #bae6fd !important;
  }
  .parent-report-site-bright .parent-report-important-disclaimer-title { color: #0f172a !important; }
  .parent-report-site-bright .parent-report-important-disclaimer-body p,
  .parent-report-site-bright .parent-report-important-disclaimer-body strong {
    color: #475569 !important;
  }

  .parent-report-site-bright table th,
  .parent-report-site-bright table td {
    color: #1e293b !important;
    border-color: #bae6fd !important;
  }
  .parent-report-site-bright thead tr {
    border-color: #bae6fd !important;
    background: rgba(224, 242, 254, 0.65) !important;
  }

  .parent-report-site-bright .pr-detailed-section {
    background: rgba(255, 255, 255, 0.94) !important;
    border-color: #bae6fd !important;
    box-shadow: 0 1px 3px rgba(14, 116, 144, 0.08);
  }
  .parent-report-site-bright .pr-detailed-section-head {
    border-color: #bae6fd !important;
  }
  .parent-report-site-bright .pr-detailed-section-title,
  .parent-report-site-bright .pr-detailed-subject-title,
  .parent-report-site-bright .pr-detailed-doc-title,
  .parent-report-site-bright .pr-detailed-subheading,
  .parent-report-site-bright .pr-detailed-mini-heading {
    color: #0f172a !important;
  }
  .parent-report-site-bright .pr-detailed-muted,
  .parent-report-site-bright .pr-detailed-body-text {
    color: #475569 !important;
  }
  .parent-report-site-bright .pr-detailed-mode-hint {
    color: #64748b !important;
  }
  .parent-report-site-bright .pr-detailed-subject-metrics,
  .parent-report-site-bright .pr-detailed-topic-metrics {
    color: #334155 !important;
  }
  .parent-report-site-bright .pr-detailed-subjects-region-title,
  .parent-report-site-bright .pr-detailed-subject-heading {
    color: #0f172a !important;
  }
  .parent-report-site-bright .pr-detailed-subject-letter {
    background: #e0f2fe !important;
    color: #0369a1 !important;
  }
  .parent-report-site-bright .pr-detailed-phase3-dl,
  .parent-report-site-bright .pr-detailed-topic-rec-block,
  .parent-report-site-bright .pr-detailed-plan-item,
  .parent-report-site-bright .pr-detailed-goal-item {
    background: rgba(255, 255, 255, 0.92) !important;
    border-color: #bae6fd !important;
  }
  .parent-report-site-bright .pr-detailed-topic-parent {
    background: rgba(224, 242, 254, 0.55) !important;
    border-color: #7dd3fc !important;
    color: #0f172a !important;
  }
  .parent-report-site-bright .pr-detailed-topic-student {
    background: rgba(237, 233, 254, 0.55) !important;
    border-color: #c4b5fd !important;
    color: #0f172a !important;
  }
  .parent-report-site-bright .pr-detailed-callout-action {
    background: rgba(224, 242, 254, 0.75) !important;
    border-color: #38bdf8 !important;
  }
  .parent-report-site-bright .pr-detailed-callout-goal {
    background: rgba(254, 249, 195, 0.65) !important;
    border-color: #fbbf24 !important;
  }
  .parent-report-site-bright .pr-detailed-tier-excellence { background: #ede9fe !important; border-color: #a78bfa !important; }
  .parent-report-site-bright .pr-detailed-tier-strength { background: #d1fae5 !important; border-color: #34d399 !important; }
  .parent-report-site-bright .pr-detailed-tier-maintain { background: #e0f2fe !important; border-color: #38bdf8 !important; }
  .parent-report-site-bright .pr-detailed-tier-improving { background: #fef3c7 !important; border-color: #fbbf24 !important; }
  .parent-report-site-bright .pr-detailed-tier-attention { background: #fee2e2 !important; border-color: #f87171 !important; }
  .parent-report-site-bright .pr-detailed-tier-examples { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
  .parent-report-site-bright tbody tr {
    border-color: #e2e8f0 !important;
  }
  .parent-report-site-bright [class*="text-amber-100"],
  .parent-report-site-bright [class*="text-amber-200"] {
    color: #92400e !important;
  }
  .parent-report-site-bright .pr-detailed-topic-rec-head,
  .parent-report-site-bright .pr-detailed-topic-reason,
  .parent-report-site-bright .pr-detailed-callout-label {
    color: #334155 !important;
  }
  .parent-report-site-bright .pr-detailed-topic-nextstep--advance { background: #dbeafe !important; border-color: #3b82f6 !important; }
  .parent-report-site-bright .pr-detailed-topic-nextstep--maintain { background: #e0f2fe !important; border-color: #0ea5e9 !important; }
  .parent-report-site-bright .pr-detailed-topic-nextstep--remediate { background: #fef3c7 !important; border-color: #f59e0b !important; }
  .parent-report-site-bright .pr-detailed-topic-nextstep--drop { background: #fee2e2 !important; border-color: #ef4444 !important; }
  .parent-report-site-bright .pr-detailed-topic-badge--advance { background: #dbeafe !important; color: #1e40af !important; border-color: #93c5fd !important; }
  .parent-report-site-bright .pr-detailed-topic-badge--maintain { background: #e0f2fe !important; color: #0369a1 !important; border-color: #7dd3fc !important; }
  .parent-report-site-bright .pr-detailed-topic-badge--remediate { background: #fef3c7 !important; color: #92400e !important; border-color: #fcd34d !important; }
  .parent-report-site-bright .pr-detailed-topic-badge--drop { background: #fee2e2 !important; color: #991b1b !important; border-color: #fca5a5 !important; }
  .parent-report-site-bright .pr-detailed-tier-excellence .pr-detailed-subheading,
  .parent-report-site-bright .pr-detailed-tier-strength .pr-detailed-subheading,
  .parent-report-site-bright .pr-detailed-tier-maintain .pr-detailed-subheading,
  .parent-report-site-bright .pr-detailed-tier-improving .pr-detailed-subheading,
  .parent-report-site-bright .pr-detailed-tier-attention .pr-detailed-subheading,
  .parent-report-site-bright .pr-detailed-tier-examples .pr-detailed-subheading {
    color: #0f172a !important;
  }
`;

/** Classic-only full-page states (loading gate, errors) — do not change. */
export const PARENT_REPORT_CLASSIC_STATE_SHELL =
  "min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex flex-col items-center justify-center gap-4 p-6";

/** Sky gradient on bright report shells (immersive /learning layout has no Layout wrapper). */
/** @param {boolean} isBright */
export function getParentReportPageShellStyle(isBright) {
  return isBright ? STUDENT_BRIGHT_PAGE_BG_STYLE : undefined;
}

/** @param {boolean} isBright */
export function getParentReportDetailedShellStyle(isBright) {
  return isBright ? STUDENT_BRIGHT_PAGE_BG_STYLE : undefined;
}

/** @param {boolean} isBright */
export function getParentReportStateShellClass(isBright) {
  return isBright
    ? "min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-slate-900"
    : PARENT_REPORT_CLASSIC_STATE_SHELL;
}

/** @param {boolean} isBright */
export function getParentReportStateShellStyle(isBright) {
  return isBright ? STUDENT_BRIGHT_PAGE_BG_STYLE : undefined;
}

/** @param {boolean} isBright */
export function getParentReportSecondaryLinkClass(isBright) {
  return isBright
    ? "rounded-lg px-4 py-2 bg-white border border-slate-200 text-slate-800"
    : "rounded-lg px-4 py-2 bg-white/10 border border-white/20 text-white";
}

/** @param {boolean} isBright */
export function getParentReportErrorTextClass(isBright) {
  return isBright ? "text-center text-red-600 max-w-md" : "text-center text-red-300 max-w-md";
}

/** @param {boolean} isBright */
export function getParentReportPageContentStyle(isBright, { immersive = false } = {}) {
  return {
    ...(getParentReportPageShellStyle(isBright) || {}),
    // Immersive (/learning) needs HUD offset; Layout (/parent) already has site header.
    paddingTop: immersive ? "calc(var(--head-h, 56px) - 28px)" : "0.25rem",
    // Immersive clears fixed page chrome; Layout already pads main for its fixed ad.
    ...(immersive ? { paddingBottom: STUDENT_LAYOUT_CHROME_BOTTOM_CSS } : null),
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
  };
}

/**
 * Empty / loading shells: fill Layout main (or immersive viewport) without document scroll.
 * @param {boolean} isBright
 * @param {{ immersive?: boolean }} [opts]
 */
export function getParentReportNoScrollPageContentStyle(isBright, { immersive = false } = {}) {
  if (immersive) {
    return {
      ...(getParentReportPageShellStyle(isBright) || {}),
      paddingTop: "calc(var(--head-h, 56px) - 28px)",
      paddingBottom: STUDENT_LAYOUT_CHROME_BOTTOM_CSS,
      height: "100svh",
      maxHeight: "100svh",
      minHeight: 0,
      overflow: "hidden",
      boxSizing: "border-box",
    };
  }
  return {
    ...(getParentReportPageShellStyle(isBright) || {}),
    paddingTop: "0.25rem",
    paddingBottom: 0,
    flex: "1 1 auto",
    width: "100%",
    minHeight: 0,
    height: "100%",
    maxHeight: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  };
}

/** @param {boolean} isBright */
export function getParentReportNoScrollPageShellClass(isBright, { immersive = false } = {}) {
  if (immersive) {
    return isBright
      ? "parent-report-site-bright h-[100svh] max-h-[100svh] overflow-hidden text-slate-900 px-2 md:px-4"
      : "h-[100svh] max-h-[100svh] overflow-hidden bg-gradient-to-b from-[#0a0f1d] to-[#141928] text-white px-2 md:px-4";
  }
  return isBright
    ? "parent-report-site-bright flex-1 min-h-0 h-full max-h-full overflow-hidden text-slate-900 px-2 md:px-4"
    : "flex-1 min-h-0 h-full max-h-full overflow-hidden bg-gradient-to-b from-[#0a0f1d] to-[#141928] text-white px-2 md:px-4";
}

/** @param {boolean} isBright */
export function getParentReportPageShellClass(isBright, { immersive = false } = {}) {
  if (immersive) {
    return isBright
      ? "parent-report-site-bright min-h-screen text-slate-900 p-2 md:p-4"
      : "min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] text-white p-2 md:p-4";
  }
  return isBright
    ? "parent-report-site-bright flex-1 min-h-0 text-slate-900 p-2 md:p-4"
    : "flex-1 min-h-0 bg-gradient-to-b from-[#0a0f1d] to-[#141928] text-white p-2 md:p-4";
}

/** @param {boolean} isBright */
export function getParentReportDetailedContentStyle(isBright, { immersive = false } = {}) {
  return {
    ...(getParentReportDetailedShellStyle(isBright) || {}),
    paddingTop: immersive ? "calc(var(--head-h, 56px) - 28px)" : "0.25rem",
    ...(immersive ? { paddingBottom: STUDENT_LAYOUT_CHROME_BOTTOM_CSS } : null),
  };
}

/**
 * Detailed empty period: same viewport lock as regular empty.
 * @param {boolean} isBright
 * @param {{ immersive?: boolean }} [opts]
 */
export function getParentReportNoScrollDetailedContentStyle(isBright, { immersive = false } = {}) {
  if (immersive) {
    return {
      ...(getParentReportDetailedShellStyle(isBright) || {}),
      paddingTop: "calc(var(--head-h, 56px) - 28px)",
      paddingBottom: STUDENT_LAYOUT_CHROME_BOTTOM_CSS,
      height: "100svh",
      maxHeight: "100svh",
      minHeight: 0,
      overflow: "hidden",
      boxSizing: "border-box",
    };
  }
  return {
    ...(getParentReportDetailedShellStyle(isBright) || {}),
    paddingTop: "0.25rem",
    paddingBottom: 0,
    flex: "1 1 auto",
    width: "100%",
    minHeight: 0,
    height: "100%",
    maxHeight: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  };
}

/** @param {boolean} isBright */
export function getParentReportNoScrollDetailedShellClass(isBright, { immersive = false } = {}) {
  if (immersive) {
    return isBright
      ? "parent-report-site-bright pr-detailed-page h-[100svh] max-h-[100svh] overflow-hidden text-slate-900 px-2.5 md:px-5"
      : "pr-detailed-page h-[100svh] max-h-[100svh] overflow-hidden bg-[#141d32] text-white px-2.5 md:px-5";
  }
  return isBright
    ? "parent-report-site-bright pr-detailed-page flex-1 min-h-0 h-full max-h-full overflow-hidden text-slate-900 px-2.5 md:px-5"
    : "pr-detailed-page flex-1 min-h-0 h-full max-h-full overflow-hidden bg-[#141d32] text-white px-2.5 md:px-5";
}

/** @param {boolean} isBright */
export function getParentReportDetailedShellClass(isBright, { immersive = false } = {}) {
  if (immersive) {
    return isBright
      ? "parent-report-site-bright pr-detailed-page min-h-screen text-slate-900 p-2.5 md:px-5 md:py-5"
      : "pr-detailed-page min-h-screen bg-[#141d32] text-white p-2.5 md:px-5 md:py-5";
  }
  return isBright
    ? "parent-report-site-bright pr-detailed-page flex-1 min-h-0 text-slate-900 p-2.5 md:px-5 md:py-5"
    : "pr-detailed-page flex-1 min-h-0 bg-[#141d32] text-white p-2.5 md:px-5 md:py-5";
}

/** Layout props — reports stay immersive (no site HUD); theme icons in ParentReportExitNav. */
export function getParentReportLayoutProps(theme) {
  return {
    studentTheme: theme,
    studentShell: "home",
    layoutShowThemePicker: false,
  };
}
