/** Parent report UI — always exit to the parent dashboard (never browser history). */
export const PARENT_DASHBOARD_ROUTE = "/parent/dashboard";

export function navigateToParentDashboard(router) {
  router.replace(PARENT_DASHBOARD_ROUTE);
}
