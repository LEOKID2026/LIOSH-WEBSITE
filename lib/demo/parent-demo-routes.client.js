const PARENT_DEMO_ACCESSIBLE = Object.freeze([
  "/parent/dashboard",
  "/parent/parent-report",
  "/parent/parent-report-detailed",
  "/parent/worksheets",
  "/parent/worksheets/preview",
  "/parent/worksheets/preview/answers",
  "/parent/install-app",
]);

/**
 * @param {string} pathname
 */
export function isParentDemoAccessibleRoute(pathname) {
  const p = pathname || "";
  if (PARENT_DEMO_ACCESSIBLE.includes(p)) return true;
  if (p.startsWith("/parent/worksheets/preview")) return true;
  return false;
}

/**
 * @param {string} pathname
 */
export function isParentDemoGateRoute(pathname) {
  const p = pathname || "";
  if (!p.startsWith("/parent")) return false;
  if (p === "/parent/login") return false;
  if (p.startsWith("/parent/auth/")) return false;
  if (p === "/parent/child-report") return false;
  if (p.startsWith("/parent/guardian")) return false;
  if (p === "/parent/school-inbox") return false;
  return true;
}

export { PARENT_DEMO_ACCESSIBLE };
