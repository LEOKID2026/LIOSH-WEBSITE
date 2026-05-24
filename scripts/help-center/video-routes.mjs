/**
 * Route + capture-step helpers for Help Center tutorial videos.
 */
import { routeForJob } from "./load-capture-jobs.mjs";

/** @type {Set<string>} */
export const WAVE_A_KEYS = new Set([
  "parents/create-parent-account",
  "parents/parent-dashboard-tour",
  "parents/add-students",
  "parents/student-pin-and-credentials",
  "parents/parent-copilot",
  "parents/install-as-app",
  "parents/mobile-and-offline",
  "parents/how-to-read-report",
  "students/student-login",
  "students/student-home-tour",
  "students/choose-subject-and-grade",
  "students/answering-questions",
  "subjects/math",
  "subjects/geometry",
  "subjects/hebrew",
  "subjects/english",
  "subjects/science",
  "subjects/moledet-geography",
  "parent-report/report-overview",
  "parent-report/detailed-report",
]);

export function waveForEntry(section, slug) {
  return WAVE_A_KEYS.has(`${section}/${slug}`) ? "A" : "B";
}

export function audienceForSection(section) {
  if (section === "students") return "student";
  if (section === "subjects") return "both";
  return "parent";
}

/** @param {{ section: string, slug: string }} entry */
export function routeForVideo(entry) {
  return routeForJob({ section: entry.section, slug: entry.slug, region: "main" });
}

/** @param {string} viewport @param {string} section @param {string} slug */
export function captureStepsFor(viewport, section, slug) {
  const isMobile = viewport === "mobile";
  const base = [
    { type: "pause", ms: 1200 },
    { type: "scroll", y: isMobile ? 120 : 280 },
    { type: "pause", ms: 1500 },
    { type: "scroll", y: isMobile ? 180 : 320 },
    { type: "pause", ms: 1200 },
  ];

  if (slug === "student-login") {
    return [
      { type: "pause", ms: 1000 },
      {
        type: "click",
        selector: isMobile
          ? 'input[name="username"], input[placeholder*="שם"]'
          : 'input[name="username"], input[placeholder*="שם"]',
      },
      { type: "pause", ms: 600 },
      { type: "scroll", y: isMobile ? 80 : 0 },
      { type: "pause", ms: 1200 },
    ];
  }

  if (slug === "answering-questions" && section === "students") {
    return [
      { type: "pause", ms: 2000 },
      { type: "scroll", y: isMobile ? 100 : 200 },
      { type: "pause", ms: 2000 },
    ];
  }

  if (section === "parent-report" || slug === "parent-copilot") {
    return [
      { type: "pause", ms: 2000 },
      { type: "scroll", y: isMobile ? 200 : 400 },
      { type: "pause", ms: 2000 },
      { type: "scroll", y: isMobile ? 200 : 300 },
      { type: "pause", ms: 1500 },
    ];
  }

  return base;
}

export function resolveVideoPath(routePath, studentId) {
  if (routePath === "__PARENT_REPORT__") {
    if (!studentId) throw new Error("parent report requires studentId");
    return `/learning/parent-report?studentId=${encodeURIComponent(studentId)}&source=parent`;
  }
  if (routePath === "__PARENT_REPORT_DETAILED__") {
    if (!studentId) throw new Error("parent report detailed requires studentId");
    return `/learning/parent-report-detailed?studentId=${encodeURIComponent(studentId)}&source=parent`;
  }
  return routePath;
}
