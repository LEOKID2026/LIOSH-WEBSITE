export const DEMO_SESSION_STORAGE_KEY = "leokids_demo_session";
export const DEMO_SESSION_VERSION = 1;
export const PLAY_LIMIT_MS = 30 * 60 * 1000;

/** @typedef {{ v: number, startedAt: string, gradeLevel: string }} DemoSession */

/** @returns {DemoSession | null} */
export function readDemoSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== DEMO_SESSION_VERSION) return null;
    if (typeof parsed.startedAt !== "string" || !parsed.startedAt) return null;
    if (typeof parsed.gradeLevel !== "string" || !parsed.gradeLevel.trim()) return null;
    return {
      v: DEMO_SESSION_VERSION,
      startedAt: parsed.startedAt,
      gradeLevel: parsed.gradeLevel.trim().toLowerCase(),
    };
  } catch {
    return null;
  }
}

/** @param {DemoSession} session */
export function writeDemoSession(session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    DEMO_SESSION_STORAGE_KEY,
    JSON.stringify({
      v: DEMO_SESSION_VERSION,
      startedAt: session.startedAt,
      gradeLevel: session.gradeLevel,
    }),
  );
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
}

export function hasDemoSession() {
  return readDemoSession() != null;
}

export function isDemoMode() {
  return hasDemoSession();
}

/** @param {DemoSession | null | undefined} session */
export function isPlayExpired(session) {
  const s = session || readDemoSession();
  if (!s?.startedAt) return false;
  const startedMs = new Date(s.startedAt).getTime();
  if (!Number.isFinite(startedMs)) return false;
  return Date.now() - startedMs >= PLAY_LIMIT_MS;
}

/** @param {string} gradeLevel */
export function createDemoSession(gradeLevel) {
  const session = {
    v: DEMO_SESSION_VERSION,
    startedAt: new Date().toISOString(),
    gradeLevel: String(gradeLevel || "g3").trim().toLowerCase(),
  };
  writeDemoSession(session);
  return session;
}

/** @param {string} gradeLevel */
export function updateDemoGrade(gradeLevel) {
  const existing = readDemoSession();
  if (!existing) return null;
  const next = {
    ...existing,
    gradeLevel: String(gradeLevel || existing.gradeLevel).trim().toLowerCase(),
  };
  writeDemoSession(next);
  return next;
}

export function demoPlayRemainingMs() {
  const s = readDemoSession();
  if (!s?.startedAt) return 0;
  const startedMs = new Date(s.startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, PLAY_LIMIT_MS - (Date.now() - startedMs));
}

/**
 * Hide floating demo CTA on private / gated areas only.
 * @param {string} pathname
 */
export function isHomeDemoButtonExcluded(pathname) {
  const p = pathname || "";
  if (p.startsWith("/demo")) return true;
  if (p.startsWith("/admin")) return true;
  if (p.startsWith("/school")) return true;
  if (p.startsWith("/guardian")) return true;
  if (p.startsWith("/student")) return true;
  if (p.startsWith("/parent/") && p !== "/parent/login" && p !== "/parent/install-app") return true;
  if (p.startsWith("/teacher/") && p !== "/teacher/login" && p !== "/teacher/install-app") return true;
  if (p === "/learning" || p.startsWith("/learning/")) return true;
  if (p === "/games" || p === "/game") return true;
  if (p.startsWith("/offline")) return true;
  if (p.startsWith("/gallery")) return true;
  if (p.startsWith("/dev")) return true;
  return false;
}

/** Layout HUD logo / בית — demo-only navigation target. */
export const DEMO_HUD_STUDENT_HOME_HREF = "/student/home";

/** @param {boolean} demoMode @param {string} href */
export function shouldDemoHudHomeNavigateToPublic(demoMode, href) {
  return demoMode && href === DEMO_HUD_STUDENT_HOME_HREF;
}

/** Display-only student — intentionally no `id`. */
export function buildDemoDisplayStudent(session = readDemoSession()) {
  const grade = session?.gradeLevel || "g3";
  return {
    grade_level: grade,
    full_name: "מצב הדגמה",
    displayNameHe: "מצב הדגמה",
    greetingHe: "ברוכים הבאים למצב הדגמה",
    account_kind: "demo",
    coin_balance: 150,
    is_active: true,
  };
}
