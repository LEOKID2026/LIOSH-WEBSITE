/** @typedef {{ id: string, slug: string, full_name: string, grade_level: string, profileKey: string, coin_balance: number, is_active: boolean, account_kind: string }} DemoParentChild */

/** @type {DemoParentChild[]} */
export const DEMO_PARENT_CHILDREN = Object.freeze([
  {
    id: "demo-parent-child-noam-g2",
    slug: "noam-g2",
    full_name: "נועם",
    grade_level: "grade_2",
    profileKey: "young_balanced",
    coin_balance: 85,
    is_active: true,
    account_kind: "demo",
  },
  {
    id: "demo-parent-child-maya-g4",
    slug: "maya-g4",
    full_name: "מאיה",
    grade_level: "grade_4",
    profileKey: "strong_stem",
    coin_balance: 120,
    is_active: true,
    account_kind: "demo",
  },
  {
    id: "demo-parent-child-ari-g6",
    slug: "ari-g6",
    full_name: "ארי",
    grade_level: "grade_6",
    profileKey: "needs_writing",
    coin_balance: 200,
    is_active: true,
    account_kind: "demo",
  },
]);

/**
 * @param {string} childId
 * @returns {DemoParentChild | null}
 */
export function getDemoParentChildById(childId) {
  const id = String(childId || "").trim();
  return DEMO_PARENT_CHILDREN.find((c) => c.id === id) || null;
}

/**
 * @param {string} childId
 */
export function isDemoParentChildId(childId) {
  return getDemoParentChildById(childId) != null;
}

/**
 * List-students API shape (subset).
 */
export function buildDemoParentListStudentsResponse() {
  return DEMO_PARENT_CHILDREN.map((c) => ({
    id: c.id,
    full_name: c.full_name,
    grade_level: c.grade_level,
    is_active: c.is_active,
    account_kind: c.account_kind,
    created_at: "2026-03-25T08:00:00.000Z",
    student_coin_balances: {
      balance: c.coin_balance,
      lifetime_earned: c.coin_balance + 40,
      lifetime_spent: 40,
    },
    login_username: null,
    has_active_access_code: false,
  }));
}
