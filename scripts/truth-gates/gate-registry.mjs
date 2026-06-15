/**
 * Truth Gate registry — canonical names and metadata (Phase 5).
 */

export const TRUTH_GATES = Object.freeze({
  DB_PASS: {
    id: "DB_PASS",
    layer: "database",
    launchRequired: true,
    description: "Live Supabase rows aggregate to expected report-data shape.",
    weakWithout: "LEARNING_SUPABASE_SERVICE_ROLE_KEY + seeded student data",
  },
  API_PASS: {
    id: "API_PASS",
    layer: "api",
    launchRequired: true,
    description: "Authenticated report-data HTTP returns server body; failure does not localStorage-fallback.",
  },
  UI_PASS: {
    id: "UI_PASS",
    layer: "ui",
    launchRequired: true,
    description: "Parent report UI renders from live API for same student/range.",
    weakWithout: "dev server + parent E2E credentials",
  },
  PDF_PASS: {
    id: "PDF_PASS",
    layer: "pdf",
    launchRequired: true,
    description: "Real PDF bytes generated; text parity with API snapshot (no print fallback).",
  },
  E2E_TRUTH_PASS: {
    id: "E2E_TRUTH_PASS",
    layer: "e2e",
    launchRequired: true,
    description: "Single chain: DB verify → live API → UI text → PDF text for one student/range.",
  },
  PARENT_ACTIVITY_PASS: {
    id: "PARENT_ACTIVITY_PASS",
    layer: "live-e2e",
    launchRequired: true,
    description: "Live parent create → student submit → report-data/UI/PDF; no separate parent activity label.",
  },
  PARENT_ACTIVITY_CONTRACT_PASS: {
    id: "PARENT_ACTIVITY_CONTRACT_PASS",
    layer: "contract",
    launchRequired: false,
    description: "Parent activity aggregate/no-label unit and source contracts; not live product truth.",
  },
  REWARD_PASS: {
    id: "REWARD_PASS",
    layer: "live-reward",
    launchRequired: true,
    description: "Live parent activity completion updates reward/progress/minutes once; no double reward.",
  },
  REWARD_CONTRACT_PASS: {
    id: "REWARD_CONTRACT_PASS",
    layer: "contract",
    launchRequired: false,
    description: "Time/coin fairness rules + dashboard source-of-truth contracts; not live coin persistence.",
  },
  NO_LOCALSTORAGE_REPORT_PASS: {
    id: "NO_LOCALSTORAGE_REPORT_PASS",
    layer: "source-guard",
    launchRequired: true,
    description: "Official parent-report routes cannot build from mleo_* localStorage.",
  },
  DASHBOARD_TRUTH_PASS: {
    id: "DASHBOARD_TRUTH_PASS",
    layer: "live-dashboard",
    launchRequired: true,
    description: "Live student dashboard UI matches server home-profile after parent activity and ignores localStorage poison.",
  },
  DASHBOARD_TRUTH_CONTRACT_PASS: {
    id: "DASHBOARD_TRUTH_CONTRACT_PASS",
    layer: "contract",
    launchRequired: false,
    description: "Student dashboard distinguishes missing vs 0; server-derived minutes/coins contracts.",
  },
  EVIDENCE_THRESHOLD_PASS: {
    id: "EVIDENCE_THRESHOLD_PASS",
    layer: "contract",
    launchRequired: true,
    description: "Zero/low/strong evidence wording policy across report surfaces.",
  },
  PRODUCTION_GUARD_PASS: {
    id: "PRODUCTION_GUARD_PASS",
    layer: "source-and-script-guard",
    launchRequired: true,
    description: "Product pages guard against localStorage report truth; DB-writing scripts block unsafe production writes.",
  },
  /** Not a launch gate — documents mocked Playwright UI load. */
  MOCK_UI_PASS: {
    id: "MOCK_UI_PASS",
    layer: "ui-mock",
    launchRequired: false,
    description: "Playwright UI shell with mocked report-data API (NOT product truth).",
  },
});

/** @type {Record<string, string>} */
export const GATE_SCRIPT_MAP = {
  DB_PASS: "scripts/truth-gates/gates/db-pass.mjs",
  API_PASS: "scripts/truth-gates/gates/api-pass.mjs",
  UI_PASS: "scripts/truth-gates/gates/ui-pass.mjs",
  PDF_PASS: "scripts/truth-gates/gates/pdf-pass.mjs",
  E2E_TRUTH_PASS: "scripts/truth-gates/gates/e2e-truth-pass.mjs",
  PARENT_ACTIVITY_PASS: "scripts/truth-gates/gates/parent-activity-pass.mjs",
  PARENT_ACTIVITY_CONTRACT_PASS: "scripts/truth-gates/gates/parent-activity-contract-pass.mjs",
  REWARD_PASS: "scripts/truth-gates/gates/reward-pass.mjs",
  REWARD_CONTRACT_PASS: "scripts/truth-gates/gates/reward-contract-pass.mjs",
  NO_LOCALSTORAGE_REPORT_PASS: "scripts/truth-gates/gates/no-localstorage-report-pass.mjs",
  DASHBOARD_TRUTH_PASS: "scripts/truth-gates/gates/dashboard-truth-pass.mjs",
  DASHBOARD_TRUTH_CONTRACT_PASS: "scripts/truth-gates/gates/dashboard-truth-contract-pass.mjs",
  EVIDENCE_THRESHOLD_PASS: "scripts/truth-gates/gates/evidence-threshold-pass.mjs",
  PRODUCTION_GUARD_PASS: "scripts/truth-gates/gates/production-guard-pass.mjs",
  MOCK_UI_PASS: "scripts/truth-gates/gates/mock-ui-pass.mjs",
};

export const LAUNCH_REQUIRED_GATES = Object.values(TRUTH_GATES)
  .filter((g) => g.launchRequired)
  .map((g) => g.id);

/** Misleading legacy names → canonical truth label */
export const LEGACY_PASS_RENAMES = Object.freeze({
  "test:parent-report-real-ui-load": "MOCK_UI_PASS (API mocked via Playwright route)",
  "audit:parent-report-release-gate": "ARTIFACT_VERIFY (reads pre-generated JSON, not rerun)",
  "qa:launch:parent-report-truth": "ARTIFACT_VERIFY (virtual-student snapshots only)",
  "qa:parent-pdf-export": "PDF_QA_FIXTURE (localStorage snapshot, not PDF_PASS)",
  "test:parent-report-real-output-signoff": "FIXTURE_VERIFY (fixture-based signoff)",
});
