/**
 * Retired action-authority endpoint.
 *
 * Student learning actions are served only by /api/student/action-decisions.
 * The old planner UI is now a client-side, one-way compatibility mirror of
 * ActionDecisionContractV2 and must never compute a recommendation here.
 */
export default function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  return res.status(410).json({
    ok: false,
    reason: "replaced_by_action_decision_contract_v2",
    authoritativeEndpoint: "/api/student/action-decisions",
  });
}
