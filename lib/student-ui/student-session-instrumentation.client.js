/**
 * Development-only instrumentation for student portal load performance.
 * Enable with localStorage.setItem("leokids_dev_student_perf", "1")
 */

const FLAG_KEY = "leokids_dev_student_perf";

/** @type {Record<string, number>} */
const marks = {};
/** @type {Record<string, number>} */
const counters = {};

export function isStudentPerfInstrumentationEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** @param {string} name */
export function perfMark(name) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  const t = typeof performance !== "undefined" ? performance.now() : Date.now();
  marks[name] = t;
  try {
    performance.mark(name);
  } catch {
    /* duplicate mark */
  }
}

/** @param {string} name @param {number} [delta] */
export function perfCount(name, delta = 1) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  counters[name] = (counters[name] || 0) + delta;
}

/** @param {string} label @param {string} startMark @param {string} [endMark] */
export function perfMeasure(label, startMark, endMark) {
  if (!isStudentPerfInstrumentationEnabled()) return;
  const start = marks[startMark];
  const end = endMark ? marks[endMark] : (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (start == null || end == null) return;
  // eslint-disable-next-line no-console
  console.info(`[student-perf] ${label}: ${Math.round(end - start)}ms`);
}

/** @param {string} component */
export function perfMount(component) {
  perfCount(`mount:${component}`);
  if (isStudentPerfInstrumentationEnabled()) {
    // eslint-disable-next-line no-console
    console.info(`[student-perf] mount ${component} (#${counters[`mount:${component}`]})`);
  }
}

export function perfDumpSummary() {
  if (!isStudentPerfInstrumentationEnabled()) return;
  // eslint-disable-next-line no-console
  console.info("[student-perf] counters", { ...counters, marks: { ...marks } });
}
