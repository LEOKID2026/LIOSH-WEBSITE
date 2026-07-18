/**
 * Phase 4 runtime performance instrumentation.
 * Enable: localStorage.setItem("leokids_dev_student_perf", "1")
 *
 * Uses Performance API marks/measures + fetch timing.
 * Prints one timeline table per scenario (never per render).
 */

import { isStudentPerfInstrumentationEnabled } from "./student-session-instrumentation.client.js";

/** @typedef {"cold-start"|"educational-games"|"learning"|"surprise"|"cards-tabs"} ScenarioId */

/** @type {ScenarioId | null} */
let activeScenario = null;
/** @type {Record<string, number>} */
const timeline = {};
/** @type {Record<string, { start: number, end?: number, ms?: number }>} */
const apiTimings = {};
/** @type {Set<string>} */
const printedScenarios = new Set();
let originMs = 0;
let fetchPatched = false;
let routeHooksInstalled = false;

const MISSING = "-";

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function perfApiMark(name) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  try {
    performance.mark(name);
  } catch {
    /* duplicate mark - ok */
  }
}

/** @param {string} key @param {number} [at] */
export function perfTimeline(key, at) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  timeline[key] = at ?? nowMs();
  const markName = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  perfApiMark(`student-${markName}`);
}

/** @param {ScenarioId} scenario */
export function perfBeginScenario(scenario) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  activeScenario = scenario;
  originMs = nowMs();
  timeline.scenario = scenario;
  timeline.origin = originMs;
  perfApiMark(`student-scenario-${scenario}-start`);
  if (scenario === "cold-start") perfApiMark("student-cold-start");
}

/** @param {string} label @param {number} ms */
export function perfRecordApi(label, ms) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  apiTimings[label] = { start: 0, end: ms, ms };
  perfTimeline(`api:${label}`, timeline[`api:${label}`] ?? nowMs());
}

/** @param {string} url */
function normalizeApiLabel(url) {
  const path = String(url || "").split("?")[0];
  if (path.includes("/api/student/me")) return "/api/student/me";
  if (path.includes("/home-profile/summary")) return "/api/student/home-profile/summary";
  if (path.includes("/home-profile/analytics")) return "/api/student/home-profile/analytics";
  if (path.includes("/home-profile/achievement-grants")) return "/api/student/home-profile/achievement-grants";
  if (path.includes("/game-access")) return "/api/student/game-access";
  if (path.includes("/rewards/surprise-box/status")) return "/api/student/rewards/surprise-box/status";
  if (path.includes("/rewards/surprise-box/open")) return "/api/student/rewards/surprise-box/open";
  if (path.includes("/api/student/activities")) return "/api/student/activities";
  if (path.includes("/api/student/cards")) return path.replace(/^.*\/api/, "/api");
  return path.startsWith("/api") ? path : null;
}

export function installStudentFetchTiming() {
  if (fetchPatched || typeof window === "undefined") return;
  if (!isStudentPerfInstrumentationEnabled()) return;
  fetchPatched = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const label = normalizeApiLabel(url);
    const started = nowMs();
    if (label) perfTimeline(`api-start:${label}`, started);
    try {
      const res = await nativeFetch(input, init);
      if (label) {
        const ended = nowMs();
        apiTimings[label] = { start: started - originMs, end: ended - originMs, ms: ended - started };
        perfTimeline(`api-end:${label}`, ended);
        perfApiMark(`student-api-${label.replace(/\//g, "_")}`);
      }
      return res;
    } catch (error) {
      if (label) {
        const ended = nowMs();
        apiTimings[label] = { start: started - originMs, end: ended - originMs, ms: ended - started };
        perfTimeline(`api-error:${label}`, ended);
      }
      throw error;
    }
  };
}

/** @param {import("next/router").NextRouter} router */
export function installStudentRoutePerfHooks(router) {
  if (routeHooksInstalled || !router?.events) return;
  if (!isStudentPerfInstrumentationEnabled()) return;
  routeHooksInstalled = true;

  router.events.on("routeChangeStart", (url) => {
    perfTimeline("routeChangeStart", nowMs());
    perfApiMark("student-route-change-start");
    const path = String(url).split("?")[0];
    if (path.startsWith("/student/educational-games")) {
      perfBeginScenario("educational-games");
      perfApiMark("educational-games-click");
    } else if (path === "/learning" || path.startsWith("/learning/")) {
      perfBeginScenario("learning");
      perfApiMark("learning-click");
    }
  });

  router.events.on("routeChangeComplete", (url) => {
    perfTimeline("routeChangeComplete", nowMs());
    perfApiMark("student-route-change-complete");
    const path = String(url).split("?")[0];
    if (path.startsWith("/student/educational-games")) {
      perfTimeline("educational-games-mounted", nowMs());
      perfApiMark("educational-games-mounted");
      scheduleScenarioReport("educational-games");
    } else if (path === "/learning") {
      perfTimeline("learning-mounted", nowMs());
      perfApiMark("learning-mounted");
      scheduleScenarioReport("learning");
    }
  });

  router.events.on("routeChangeError", () => {
    perfTimeline("routeChangeError", nowMs());
  });
}

/** @param {ScenarioId} scenario */
function scheduleScenarioReport(scenario) {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      perfMarkInteractive(scenario);
      perfPrintScenarioTable(scenario);
    });
  });
}

/** @param {ScenarioId} scenario */
export function perfMarkInteractive(scenario) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  const t = nowMs();
  if (scenario === "cold-start") {
    perfTimeline("student-home-interactive", t);
    perfApiMark("student-home-interactive");
  } else if (scenario === "educational-games") {
    perfTimeline("educational-games-interactive", t);
    perfApiMark("educational-games-interactive");
  } else if (scenario === "learning") {
    perfTimeline("learning-interactive", t);
    perfApiMark("learning-interactive");
  } else if (scenario === "surprise") {
    perfTimeline("surprise-modal-visible", t);
    perfApiMark("surprise-modal-visible");
  }
}

/** @param {ScenarioId} scenario */
export function perfPrintScenarioTable(scenario) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  if (printedScenarios.has(scenario)) return;
  printedScenarios.add(scenario);

  const origin = timeline.origin ?? originMs ?? 0;

  /** @param {string} step @param {string} key */
  const row = (step, key) => {
    const t = timeline[key];
    if (t == null) {
      return { step, durationMs: MISSING, fromOriginMs: MISSING };
    }
    const delta = Math.round(t - origin);
    return { step, durationMs: String(delta), fromOriginMs: String(delta) };
  };

  const baseRows = [
    row("navigation / click start", "click"),
    row("routeChangeStart", "routeChangeStart"),
    row("StudentAccessGate mount", "gate-mount"),
    row("shell visible", "shell-visible"),
    row("hydration complete", "hydration-complete"),
    row("routeChangeComplete", "routeChangeComplete"),
  ];

  const scenarioRows =
    scenario === "cold-start"
      ? [
          row("student cold start", "origin"),
          row("student shell visible", "shell-visible"),
          row("student home interactive", "student-home-interactive"),
        ]
      : scenario === "educational-games"
        ? [
            row("educational games click", "click"),
            row("educational games mounted", "educational-games-mounted"),
            row("educational games interactive", "educational-games-interactive"),
          ]
        : scenario === "learning"
          ? [
              row("learning click", "click"),
              row("learning mounted", "learning-mounted"),
              row("learning interactive", "learning-interactive"),
            ]
          : scenario === "surprise"
            ? [
                row("surprise click", "click"),
                row("surprise modal visible", "surprise-modal-visible"),
                row("surprise result", "surprise-result"),
              ]
            : [];

  const apiRows = Object.entries(apiTimings).map(([label, info]) => ({
    step: `API ${label}`,
    durationMs: info.ms != null ? String(Math.round(info.ms)) : MISSING,
    fromOriginMs: info.end != null ? String(Math.round(info.end)) : MISSING,
  }));

  // eslint-disable-next-line no-console
  console.info(`[student-perf] timeline - ${scenario}`, [...scenarioRows, ...baseRows, ...apiRows]);
}

/** Call once from _app after hydration */
export function perfMarkHydrationComplete() {
  if (!isStudentPerfInstrumentationEnabled()) return;
  perfTimeline("hydration-complete", nowMs());
  perfApiMark("student-hydration-complete");
  if (typeof window !== "undefined" && !timeline["js-download-start"]) {
    perfTimeline("js-download-start", 0);
    const nav =
      typeof performance !== "undefined" && performance.getEntriesByType
        ? performance.getEntriesByType("navigation")[0]
        : null;
    if (nav) {
      perfTimeline("html-ttfb", nav.responseStart);
      perfTimeline("js-download-end", nav.domContentLoadedEventEnd);
    }
  }
}

/** @param {ScenarioId} scenario @param {string} [clickKey] */
export function perfMarkClick(scenario, clickKey = "click") {
  if (!isStudentPerfInstrumentationEnabled()) return;
  perfBeginScenario(scenario);
  perfTimeline(clickKey, nowMs());
  if (scenario === "surprise") perfApiMark("surprise-click");
}

export function perfMarkShellVisible() {
  if (!isStudentPerfInstrumentationEnabled()) return;
  perfTimeline("shell-visible", nowMs());
  perfApiMark("student-shell-visible");
}

export function perfMarkGateMount() {
  if (!isStudentPerfInstrumentationEnabled()) return;
  perfTimeline("gate-mount", nowMs());
}

export function resetStudentRuntimePerfForTests() {
  activeScenario = null;
  Object.keys(timeline).forEach((k) => delete timeline[k]);
  Object.keys(apiTimings).forEach((k) => delete apiTimings[k]);
  printedScenarios.clear();
  originMs = 0;
  fetchPatched = false;
  routeHooksInstalled = false;
}
